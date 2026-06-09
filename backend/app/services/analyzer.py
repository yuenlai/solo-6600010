import re, uuid, hashlib
from datetime import datetime
from collections import defaultdict
from ..models.contract import (
    Vulnerability, Severity, AuditResult, CommonIssue, BatchAuditResult, 
    AuditRequest, ScoreBreakdown, ScoreInterpretation, BatchScoreInterpretation,
    ContractSimilarity, FamilyDuplicateRisk, FamilyDifferentialRisk,
    ContractFamily, ContractFamilyAnalysisResult,
    MigrationVulnChange, MigrationRiskItem, MigrationBenefitItem,
    VersionMigrationAssessmentResult,
    RiskClusterVulnRef, RiskCluster, RiskClusteringResult
)
from ..core.database import custom_rules

PATTERNS = [
    {"name": "Reentrancy", "severity": Severity.critical, "pattern": r"\.call\{value:",
     "description": "External call with value - potential reentrancy", "recommendation": "Use checks-effects-interactions pattern"},
    {"name": "Unchecked Return", "severity": Severity.high, "pattern": r"\.(send|transfer)\(",
     "description": "Unchecked return from send/transfer", "recommendation": "Use call() with error handling"},
    {"name": "tx.origin Auth", "severity": Severity.high, "pattern": r"tx\.origin",
     "description": "tx.origin for auth - phishing vulnerable", "recommendation": "Use msg.sender instead"},
    {"name": "Block Timestamp", "severity": Severity.medium, "pattern": r"block\.timestamp",
     "description": "block.timestamp in logic - miner manipulable", "recommendation": "Avoid for critical logic"},
    {"name": "Selfdestruct", "severity": Severity.medium, "pattern": r"selfdestruct|suicide",
     "description": "Irreversible selfdestruct", "recommendation": "Use withdrawal pattern"},
    {"name": "Inline Assembly", "severity": Severity.low, "pattern": r"assembly\s*\{",
     "description": "Inline assembly - harder to audit", "recommendation": "Minimize usage"},
]

def get_all_patterns():
    patterns = list(PATTERNS)
    for rule in custom_rules.values():
        if rule.enabled:
            patterns.append({
                "name": rule.name,
                "severity": rule.severity,
                "pattern": rule.pattern,
                "description": rule.description,
                "recommendation": rule.recommendation,
            })
    return patterns

PENALTY = {"critical": 25, "high": 15, "medium": 8, "low": 3, "info": 1}

SEVERITY_LABELS = {
    "critical": "严重",
    "high": "高危",
    "medium": "中危",
    "low": "低危",
    "info": "信息"
}

def generate_score_interpretation(vulns: list[Vulnerability], score: float) -> ScoreInterpretation:
    total_deduction = min(100, sum(PENALTY.get(v.severity.value, 0) for v in vulns))
    
    breakdown = []
    severity_counts = defaultdict(int)
    for v in vulns:
        severity_counts[v.severity.value] += 1
    
    for severity in ["critical", "high", "medium", "low", "info"]:
        count = severity_counts[severity]
        if count > 0:
            breakdown.append(ScoreBreakdown(
                severity=Severity(severity),
                count=count,
                penalty_per_item=PENALTY[severity],
                total_penalty=count * PENALTY[severity]
            ))
    
    risk_parts = []
    for sev in ["critical", "high", "medium", "low", "info"]:
        if severity_counts[sev] > 0:
            risk_parts.append(f"{SEVERITY_LABELS[sev]}漏洞 {severity_counts[sev]} 个")
    risk_weight_summary = "、".join(risk_parts) if risk_parts else "未发现安全漏洞"
    
    if score >= 80:
        overall_conclusion = "安全状况良好，合约整体风险较低"
    elif score >= 50:
        overall_conclusion = "存在一定安全风险，建议优先修复高危漏洞"
    else:
        overall_conclusion = "安全风险较高，存在严重安全隐患，需立即修复"
    
    recommendations = []
    if severity_counts["critical"] > 0:
        recommendations.append("立即修复所有严重级别的漏洞，这些漏洞可能导致资金损失")
    if severity_counts["high"] > 0:
        recommendations.append("优先修复高危漏洞，避免被攻击者利用")
    if severity_counts["medium"] > 0:
        recommendations.append("在修复高危漏洞后，处理中危漏洞以提升整体安全性")
    if severity_counts["low"] > 0:
        recommendations.append("低危漏洞可在后续版本中逐步修复")
    if not vulns:
        recommendations.append("合约未发现明显漏洞，但仍建议进行人工审计以确保安全性")
    
    return ScoreInterpretation(
        score=score,
        max_possible_score=100,
        total_deduction=total_deduction,
        breakdown=breakdown,
        risk_weight_summary=risk_weight_summary,
        overall_conclusion=overall_conclusion,
        recommendations=recommendations
    )

def analyze_contract(source_code: str, contract_name: str) -> AuditResult:
    vulns = []
    lines = source_code.split("\n")
    all_patterns = get_all_patterns()
    for pi in all_patterns:
        for i, line in enumerate(lines, 1):
            try:
                if re.search(pi["pattern"], line, re.IGNORECASE):
                    vulns.append(Vulnerability(id=str(uuid.uuid4())[:8], name=pi["name"],
                        severity=pi["severity"], line=i, description=pi["description"],
                        recommendation=pi["recommendation"], pattern=pi["pattern"]))
            except re.error:
                continue
    score = max(0, 100 - sum(PENALTY.get(v.severity.value, 0) for v in vulns))
    score_interpretation = generate_score_interpretation(vulns, score)
    return AuditResult(id=str(uuid.uuid4()), contract_name=contract_name,
        vulnerabilities=vulns, score=score, total_lines=len(lines), 
        audited_at=datetime.now().isoformat(), score_interpretation=score_interpretation)

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

def generate_batch_score_interpretation(results: list[AuditResult], avg_score: float) -> BatchScoreInterpretation:
    all_vulns = []
    for r in results:
        all_vulns.extend(r.vulnerabilities)
    
    total_deduction = sum(100 - r.score for r in results) / len(results) if results else 0
    
    severity_counts = defaultdict(int)
    for v in all_vulns:
        severity_counts[v.severity.value] += 1
    
    breakdown = []
    for severity in ["critical", "high", "medium", "low", "info"]:
        count = severity_counts[severity]
        if count > 0:
            breakdown.append(ScoreBreakdown(
                severity=Severity(severity),
                count=count,
                penalty_per_item=PENALTY[severity],
                total_penalty=count * PENALTY[severity]
            ))
    
    risk_distribution = {
        "safe": sum(1 for r in results if r.score >= 80),
        "warning": sum(1 for r in results if 50 <= r.score < 80),
        "danger": sum(1 for r in results if r.score < 50)
    }
    
    if avg_score >= 80:
        overall_conclusion = "整体安全状况良好，大部分合约风险较低"
    elif avg_score >= 50:
        overall_conclusion = "整体存在一定安全风险，部分合约需要重点关注"
    else:
        overall_conclusion = "整体安全风险较高，存在多个严重安全隐患，需立即整改"
    
    key_findings = []
    if severity_counts["critical"] > 0:
        key_findings.append(f"发现 {severity_counts['critical']} 个严重级别漏洞，涉及资金安全风险")
    if severity_counts["high"] > 0:
        key_findings.append(f"发现 {severity_counts['high']} 个高危漏洞，需要优先修复")
    if risk_distribution["danger"] > 0:
        key_findings.append(f"{risk_distribution['danger']} 个合约安全评分低于50分，风险极高")
    if len(results) >= 2:
        high_risk_contracts = [r.contract_name for r in sorted(results, key=lambda x: x.score)[:3]]
        key_findings.append(f"风险最高的合约：{', '.join(high_risk_contracts)}")
    if not all_vulns:
        key_findings.append("所有合约均未发现明显安全漏洞")
    
    recommendations = []
    if severity_counts["critical"] > 0:
        recommendations.append("优先修复所有严重级别漏洞，确保资金安全")
    if severity_counts["high"] > 0:
        recommendations.append("制定整改计划，按优先级修复高危漏洞")
    if risk_distribution["danger"] > 0:
        recommendations.append("对低分合约进行专项安全审计")
    if len(results) >= 2:
        recommendations.append("建立统一的安全编码规范，避免同类问题重复出现")
    if not recommendations:
        recommendations.append("建议定期进行安全审计，保持合约安全性")
    
    return BatchScoreInterpretation(
        average_score=round(avg_score, 2),
        total_contracts=len(results),
        total_deduction=round(total_deduction, 2),
        breakdown=breakdown,
        risk_distribution=risk_distribution,
        overall_conclusion=overall_conclusion,
        key_findings=key_findings,
        recommendations=recommendations
    )

def analyze_batch(contracts: list[AuditRequest]) -> BatchAuditResult:
    results = [analyze_contract(c.source_code, c.contract_name) for c in contracts]
    risk_ranking = sorted(results, key=lambda r: (r.score, -len([v for v in r.vulnerabilities if v.severity == Severity.critical])))
    issue_map = defaultdict(lambda: {"count": 0, "contracts": set(), "description": "", "recommendation": "", "severity": Severity.low})
    for r in results:
        seen_in_contract = set()
        for v in r.vulnerabilities:
            key = v.name
            if key not in seen_in_contract:
                issue_map[key]["count"] += 1
                seen_in_contract.add(key)
            issue_map[key]["contracts"].add(r.contract_name)
            issue_map[key]["description"] = v.description
            issue_map[key]["recommendation"] = v.recommendation
            issue_map[key]["severity"] = v.severity
    common_issues = [
        CommonIssue(
            name=name,
            severity=data["severity"],
            count=data["count"],
            description=data["description"],
            recommendation=data["recommendation"],
            affected_contracts=list(data["contracts"])
        )
        for name, data in issue_map.items()
        if len(data["contracts"]) >= 2
    ]
    common_issues.sort(key=lambda x: (SEVERITY_ORDER[x.severity.value], -x.count))
    total_vulns = sum(len(r.vulnerabilities) for r in results)
    avg_score = sum(r.score for r in results) / len(results) if results else 0
    score_interpretation = generate_batch_score_interpretation(results, avg_score)
    return BatchAuditResult(
        id=str(uuid.uuid4()),
        results=results,
        risk_ranking=risk_ranking,
        common_issues=common_issues,
        total_contracts=len(results),
        total_vulnerabilities=total_vulns,
        average_score=round(avg_score, 2),
        audited_at=datetime.now().isoformat(),
        score_interpretation=score_interpretation
    )


def _extract_features(source_code: str) -> set[str]:
    features = set()
    func_pattern = r'function\s+(\w+)\s*\('
    for m in re.finditer(func_pattern, source_code):
        features.add(f"func:{m.group(1)}")
    var_pattern = r'(mapping|uint|int|address|bool|string|bytes)\s*(\[\])?\s*(?:public|private|internal)?\s*(\w+)'
    for m in re.finditer(var_pattern, source_code):
        features.add(f"var:{m.group(3)}")
    modifier_pattern = r'modifier\s+(\w+)'
    for m in re.finditer(modifier_pattern, source_code):
        features.add(f"mod:{m.group(1)}")
    event_pattern = r'event\s+(\w+)'
    for m in re.finditer(event_pattern, source_code):
        features.add(f"event:{m.group(1)}")
    contract_pattern = r'contract\s+(\w+)'
    for m in re.finditer(contract_pattern, source_code):
        features.add(f"contract:{m.group(1)}")
    inherit_pattern = r'is\s+(\w+)'
    for m in re.finditer(inherit_pattern, source_code):
        features.add(f"inherit:{m.group(1)}")
    for pi in get_all_patterns():
        if re.search(pi["pattern"], source_code, re.IGNORECASE):
            features.add(f"vuln:{pi['name']}")
    return features


def _jaccard_similarity(set_a: set[str], set_b: set[str]) -> float:
    if not set_a and not set_b:
        return 1.0
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def _compute_similarity_matrix(
    contracts: list[AuditRequest],
) -> tuple[dict[str, set[str]], dict[str, dict[str, tuple[float, set[str]]]]]:
    feature_map = {}
    for c in contracts:
        feature_map[c.contract_name] = _extract_features(c.source_code)
    sim_matrix: dict[str, dict[str, tuple[float, set[str]]]] = {}
    for c1 in contracts:
        sim_matrix[c1.contract_name] = {}
        for c2 in contracts:
            if c1.contract_name == c2.contract_name:
                continue
            shared = feature_map[c1.contract_name] & feature_map[c2.contract_name]
            sim = _jaccard_similarity(feature_map[c1.contract_name], feature_map[c2.contract_name])
            sim_matrix[c1.contract_name][c2.contract_name] = (sim, shared)
    return feature_map, sim_matrix


SIMILARITY_THRESHOLD = 0.25


def _build_families(
    contracts: list[AuditRequest],
    sim_matrix: dict[str, dict[str, tuple[float, set[str]]]],
) -> list[list[str]]:
    contract_names = [c.contract_name for c in contracts]
    visited = set()
    families: list[list[str]] = []
    for name in contract_names:
        if name in visited:
            continue
        family = [name]
        visited.add(name)
        queue = [name]
        while queue:
            current = queue.pop(0)
            for other, (sim, _) in sim_matrix.get(current, {}).items():
                if other not in visited and sim >= SIMILARITY_THRESHOLD:
                    family.append(other)
                    visited.add(other)
                    queue.append(other)
        families.append(family)
    return families


RISK_AMPLIFICATION = {
    "critical": "系统级风险放大：该严重漏洞在多个相似合约中重复出现，可能存在共同的设计缺陷，需全面排查整个合约家族",
    "high": "高风险扩散：高危漏洞在家族内重复出现，攻击面成倍增加，建议统一修复方案",
    "medium": "中风险累积：中危漏洞的重复出现降低了家族整体安全性，建议批量修复",
    "low": "低风险提醒：低危漏洞的重复出现虽不紧急，但仍建议在版本迭代中统一处理",
    "info": "信息提示：该信息类问题在多份合约中重复出现，可考虑统一规范",
}


def analyze_contract_family(contracts: list[AuditRequest]) -> ContractFamilyAnalysisResult:
    if len(contracts) < 2:
        return ContractFamilyAnalysisResult(
            id=str(uuid.uuid4()),
            families=[],
            duplicate_risks=[],
            differential_risks=[],
            total_contracts=len(contracts),
            total_families=0,
            cross_family_risks=0,
            analysis_summary="合约数量不足，至少需要2份合约才能进行家族分析",
            analyzed_at=datetime.now().isoformat()
        )

    feature_map, sim_matrix = _compute_similarity_matrix(contracts)
    families_raw = _build_families(contracts, sim_matrix)

    results = [analyze_contract(c.source_code, c.contract_name) for c in contracts]
    result_map = {r.contract_name: r for r in results}

    families: list[ContractFamily] = []
    for idx, members in enumerate(families_raw):
        family_id = str(uuid.uuid4())[:8]
        if len(members) == 1:
            family_name = f"独立合约 - {members[0]}"
        else:
            family_name = f"合约家族 {idx + 1}"

        similarity_matrix: dict[str, list[ContractSimilarity]] = {}
        total_sim = 0.0
        sim_count = 0
        for m in members:
            similarity_matrix[m] = []
            for other in members:
                if m == other:
                    continue
                sim, shared = sim_matrix.get(m, {}).get(other, (0.0, set()))
                similarity_matrix[m].append(ContractSimilarity(
                    contract_name=other,
                    similarity=round(sim, 4),
                    shared_patterns=sorted(shared)
                ))
                total_sim += sim
                sim_count += 1

        avg_sim = round(total_sim / sim_count, 4) if sim_count > 0 else 1.0

        shared_vuln_patterns = set()
        if len(members) >= 2:
            vuln_sets = []
            for m in members:
                vuln_names = {v.name for v in result_map[m].vulnerabilities}
                vuln_sets.append(vuln_names)
            shared_vuln_patterns = vuln_sets[0]
            for vs in vuln_sets[1:]:
                shared_vuln_patterns &= vs

        families.append(ContractFamily(
            family_id=family_id,
            family_name=family_name,
            members=members,
            similarity_matrix=similarity_matrix,
            avg_similarity=avg_sim,
            shared_vulnerability_patterns=sorted(shared_vuln_patterns)
        ))

    duplicate_risks: list[FamilyDuplicateRisk] = []
    for family in families:
        if len(family.members) < 2:
            continue
        vuln_by_name: dict[str, dict] = {}
        for m in family.members:
            result = result_map[m]
            seen = set()
            for v in result.vulnerabilities:
                if v.name in seen:
                    continue
                seen.add(v.name)
                if v.name not in vuln_by_name:
                    vuln_by_name[v.name] = {
                        "contracts": [],
                        "severity": v.severity,
                        "description": v.description,
                        "recommendation": v.recommendation,
                    }
                vuln_by_name[v.name]["contracts"].append(m)

        for vname, data in vuln_by_name.items():
            if len(data["contracts"]) >= 2:
                sev_str = data["severity"].value if hasattr(data["severity"], 'value') else str(data["severity"])
                duplicate_risks.append(FamilyDuplicateRisk(
                    vulnerability_name=vname,
                    severity=Severity(sev_str),
                    affected_contracts=data["contracts"],
                    description=data["description"],
                    recommendation=data["recommendation"],
                    occurrence_count=len(data["contracts"]),
                    risk_amplification=RISK_AMPLIFICATION.get(sev_str, RISK_AMPLIFICATION["medium"])
                ))

    duplicate_risks.sort(key=lambda x: (SEVERITY_ORDER.get(x.severity.value, 3), -x.occurrence_count))

    differential_risks: list[FamilyDifferentialRisk] = []
    for family in families:
        if len(family.members) < 2:
            continue
        all_vuln_names = set()
        for m in family.members:
            for v in result_map[m].vulnerabilities:
                all_vuln_names.add(v.name)

        for vname in all_vuln_names:
            having: dict[str, Vulnerability] = {}
            not_having: list[str] = []
            for m in family.members:
                found = None
                for v in result_map[m].vulnerabilities:
                    if v.name == vname:
                        found = v
                        break
                if found:
                    having[m] = found
                else:
                    not_having.append(m)

            if having and not_having:
                for contract_name, vuln in having.items():
                    sev_str = vuln.severity.value if hasattr(vuln.severity, 'value') else str(vuln.severity)
                    differential_risks.append(FamilyDifferentialRisk(
                        vulnerability_name=vname,
                        severity=Severity(sev_str),
                        contract_name=contract_name,
                        description=vuln.description,
                        recommendation=vuln.recommendation,
                        line=vuln.line,
                        missing_in=not_having
                    ))

    differential_risks.sort(key=lambda x: (SEVERITY_ORDER.get(x.severity.value, 3), x.contract_name))

    cross_family_vuln_names: set[str] = set()
    if len(families) >= 2:
        family_vulns = []
        for family in families:
            names = set()
            for m in family.members:
                for v in result_map[m].vulnerabilities:
                    names.add(v.name)
            family_vulns.append(names)
        for i in range(len(family_vulns)):
            for j in range(i + 1, len(family_vulns)):
                cross_family_vuln_names |= (family_vulns[i] & family_vulns[j])
    cross_family_risk_count = len(cross_family_vuln_names)

    summary_parts = []
    summary_parts.append(f"对 {len(contracts)} 份合约进行家族分析，识别出 {len(families)} 个合约家族。")
    multi_member = [f for f in families if len(f.members) >= 2]
    if multi_member:
        summary_parts.append(f"其中 {len(multi_member)} 个家族包含2份及以上相似合约。")
    if duplicate_risks:
        crit_dup = sum(1 for d in duplicate_risks if d.severity == Severity.critical)
        high_dup = sum(1 for d in duplicate_risks if d.severity == Severity.high)
        summary_parts.append(f"发现 {len(duplicate_risks)} 个重复风险" + (f"，其中严重 {crit_dup} 个、高危 {high_dup} 个" if crit_dup + high_dup > 0 else "") + "。")
    if differential_risks:
        summary_parts.append(f"发现 {len(differential_risks)} 个差异风险，表示相似合约中部分合约存在独特漏洞。")
    if cross_family_risk_count > 0:
        summary_parts.append(f"发现 {cross_family_risk_count} 个跨家族共有风险，需全局关注。")

    return ContractFamilyAnalysisResult(
        id=str(uuid.uuid4()),
        families=families,
        duplicate_risks=duplicate_risks,
        differential_risks=differential_risks,
        total_contracts=len(contracts),
        total_families=len(families),
        cross_family_risks=cross_family_risk_count,
        analysis_summary="".join(summary_parts),
        analyzed_at=datetime.now().isoformat()
    )


def _compute_code_diff_summary(old_code: str, new_code: str) -> str:
    old_lines = set(l.strip() for l in old_code.splitlines() if l.strip())
    new_lines = set(l.strip() for l in new_code.splitlines() if l.strip())
    added = new_lines - old_lines
    removed = old_lines - new_lines
    parts = []
    if added:
        parts.append(f"新增 {len(added)} 行代码")
    if removed:
        parts.append(f"删除 {len(removed)} 行代码")
    if not parts:
        return "代码无变化"
    return "，".join(parts)


def assess_version_migration(
    old_source_code: str,
    new_source_code: str,
    contract_name: str
) -> VersionMigrationAssessmentResult:
    old_result = analyze_contract(old_source_code, contract_name)
    new_result = analyze_contract(new_source_code, contract_name)

    old_vuln_names = {v.name for v in old_result.vulnerabilities}
    new_vuln_names = {v.name for v in new_result.vulnerabilities}

    resolved_names = old_vuln_names - new_vuln_names
    added_names = new_vuln_names - old_vuln_names
    persistent_names = old_vuln_names & new_vuln_names

    resolved: list[MigrationVulnChange] = []
    for v in old_result.vulnerabilities:
        if v.name in resolved_names:
            resolved.append(MigrationVulnChange(
                vulnerability_name=v.name,
                severity=v.severity,
                change_type="resolved",
                description=v.description,
                recommendation=v.recommendation,
                line=v.line
            ))
    seen_r = set()
    unique_resolved = []
    for r in resolved:
        if r.vulnerability_name not in seen_r:
            seen_r.add(r.vulnerability_name)
            unique_resolved.append(r)
    resolved = unique_resolved

    new_vulns: list[MigrationVulnChange] = []
    for v in new_result.vulnerabilities:
        if v.name in added_names:
            new_vulns.append(MigrationVulnChange(
                vulnerability_name=v.name,
                severity=v.severity,
                change_type="added",
                description=v.description,
                recommendation=v.recommendation,
                line=v.line
            ))
    seen_n = set()
    unique_new = []
    for n in new_vulns:
        if n.vulnerability_name not in seen_n:
            seen_n.add(n.vulnerability_name)
            unique_new.append(n)
    new_vulns = unique_new

    persistent: list[MigrationVulnChange] = []
    for v in old_result.vulnerabilities:
        if v.name in persistent_names:
            persistent.append(MigrationVulnChange(
                vulnerability_name=v.name,
                severity=v.severity,
                change_type="persistent",
                description=v.description,
                recommendation=v.recommendation,
                line=v.line
            ))
    seen_p = set()
    unique_persist = []
    for p in persistent:
        if p.vulnerability_name not in seen_p:
            seen_p.add(p.vulnerability_name)
            unique_persist.append(p)
    persistent = unique_persist

    risks: list[MigrationRiskItem] = []
    for v in new_vulns:
        sev_str = v.severity.value if hasattr(v.severity, 'value') else str(v.severity)
        if sev_str in ['critical', 'high']:
            risks.append(MigrationRiskItem(
                risk_type="new_critical_vulnerability",
                severity=v.severity,
                description=f"升级后引入新的高危漏洞：{v.vulnerability_name}",
                impact="可能导致资金损失或权限被绕过，建议在升级前修复",
                recommendation=v.recommendation
            ))

    crit_persist = [p for p in persistent if p.severity in [Severity.critical, Severity.high]]
    if crit_persist:
        risks.append(MigrationRiskItem(
            risk_type="unresolved_critical",
            severity=Severity.high,
            description=f"升级后仍有 {len(crit_persist)} 个高危漏洞未解决：{', '.join(p.vulnerability_name for p in crit_persist)}",
            impact="这些高危漏洞在升级后依然存在，持续威胁合约安全",
            recommendation="建议在升级中同步修复这些持续存在的高危漏洞"
        ))

    if new_result.score < old_result.score and (new_result.score - old_result.score) < -20:
        risks.append(MigrationRiskItem(
            risk_type="score_degradation",
            severity=Severity.medium,
            description=f"升级后安全评分大幅下降（从 {old_result.score} 降至 {new_result.score}）",
            impact="安全性显著降低，建议重新审视升级变更",
            recommendation="回退升级并重新评估变更内容，确保不会引入新的安全问题"
        ))

    old_funcs = set(re.findall(r'function\s+(\w+)', old_source_code))
    new_funcs = set(re.findall(r'function\s+(\w+)', new_source_code))
    removed_funcs = old_funcs - new_funcs
    if removed_funcs:
        risks.append(MigrationRiskItem(
            risk_type="interface_change",
            severity=Severity.medium,
            description=f"升级后移除了以下函数：{', '.join(removed_funcs)}",
            impact="可能导致依赖这些函数的外部合约或前端调用失败",
            recommendation="确认移除的函数没有外部依赖，或提供兼容接口"
        ))

    benefits: list[MigrationBenefitItem] = []
    for v in resolved:
        sev_str = v.severity.value if hasattr(v.severity, 'value') else str(v.severity)
        if sev_str in ['critical', 'high']:
            benefits.append(MigrationBenefitItem(
                benefit_type="critical_fix",
                description=f"修复了高危漏洞：{v.vulnerability_name}",
                impact="显著提升合约安全性，降低资金风险"
            ))
        else:
            benefits.append(MigrationBenefitItem(
                benefit_type="vulnerability_fix",
                description=f"修复了漏洞：{v.vulnerability_name}",
                impact="提升了合约整体安全性"
            ))

    if new_result.score > old_result.score:
        benefits.append(MigrationBenefitItem(
            benefit_type="score_improvement",
            description=f"安全评分从 {old_result.score} 提升至 {new_result.score}（+{new_result.score - old_result.score}分）",
            impact="整体安全性得到提升"
        ))

    added_funcs = new_funcs - old_funcs
    if added_funcs:
        benefits.append(MigrationBenefitItem(
            benefit_type="new_functionality",
            description=f"新增了函数：{', '.join(added_funcs)}",
            impact="扩展了合约功能，但需确保新函数的安全性"
        ))

    if not persistent:
        benefits.append(MigrationBenefitItem(
            benefit_type="clean_migration",
            description="旧版本的所有漏洞在升级后均已修复",
            impact="升级效果显著，安全性大幅提升"
        ))

    score_change = new_result.score - old_result.score
    vuln_change = len(new_result.vulnerabilities) - len(old_result.vulnerabilities)

    crit_new = sum(1 for v in new_vulns if v.severity in [Severity.critical])
    high_new = sum(1 for v in new_vulns if v.severity in [Severity.high])
    crit_resolved = sum(1 for v in resolved if v.severity in [Severity.critical])
    high_resolved = sum(1 for v in resolved if v.severity in [Severity.high])

    migration_score = 50.0
    migration_score += crit_resolved * 15
    migration_score += high_resolved * 10
    migration_score += len(resolved) * 5
    migration_score -= crit_new * 20
    migration_score -= high_new * 15
    migration_score += score_change * 0.5
    migration_score -= len(risks) * 5
    migration_score = max(0, min(100, migration_score))

    if migration_score >= 80:
        risk_level = "低风险"
        overall_recommendation = "升级收益明显，风险较低，建议执行版本迁移。"
    elif migration_score >= 60:
        risk_level = "中风险"
        overall_recommendation = "升级有一定收益，但存在部分风险，建议修复新增漏洞后再执行迁移。"
    elif migration_score >= 40:
        risk_level = "高风险"
        overall_recommendation = "升级风险较高，引入了新的安全问题，建议谨慎评估后再决定是否迁移。"
    else:
        risk_level = "极高风险"
        overall_recommendation = "升级风险极高，安全性显著下降，强烈建议暂缓迁移并重新审查升级方案。"

    code_diff_summary = _compute_code_diff_summary(old_source_code, new_source_code)

    return VersionMigrationAssessmentResult(
        id=str(uuid.uuid4()),
        contract_name=contract_name,
        old_score=old_result.score,
        new_score=new_result.score,
        score_change=score_change,
        old_vulnerability_count=len(old_result.vulnerabilities),
        new_vulnerability_count=len(new_result.vulnerabilities),
        vulnerability_change=vuln_change,
        resolved_vulnerabilities=resolved,
        new_vulnerabilities=new_vulns,
        persistent_vulnerabilities=persistent,
        risks=risks,
        benefits=benefits,
        overall_recommendation=overall_recommendation,
        risk_level=risk_level,
        migration_score=round(migration_score, 1),
        code_diff_summary=code_diff_summary,
        assessed_at=datetime.now().isoformat()
    )


RISK_CATEGORIES = {
    "fund_safety": {
        "label": "资金安全",
        "patterns": ["Reentrancy", "Unchecked Return", "Integer Overflow", "Selfdestruct"],
        "impact_scope": "可能导致合约资金被盗取、锁定或异常增发，直接影响用户资产安全",
        "fix_priority_map": {
            "critical": "P0 - 立即修复",
            "high": "P0 - 立即修复",
            "medium": "P1 - 本周修复",
            "low": "P2 - 下个版本修复",
        },
    },
    "access_control": {
        "label": "权限控制",
        "patterns": ["tx.origin Auth", "Delegatecall", "Access Control"],
        "impact_scope": "可能导致未授权用户绕过权限检查执行敏感操作，威胁合约治理安全",
        "fix_priority_map": {
            "critical": "P0 - 立即修复",
            "high": "P1 - 本周修复",
            "medium": "P1 - 本周修复",
            "low": "P2 - 下个版本修复",
        },
    },
    "external_call": {
        "label": "外部调用安全",
        "patterns": ["Unchecked Return", "Reentrancy", "External Call"],
        "impact_scope": "外部调用处理不当可能导致交易失败被忽略、重入攻击或资金卡死",
        "fix_priority_map": {
            "critical": "P0 - 立即修复",
            "high": "P0 - 立即修复",
            "medium": "P1 - 本周修复",
            "low": "P2 - 下个版本修复",
        },
    },
    "logic_security": {
        "label": "逻辑安全",
        "patterns": ["Block Timestamp", "Integer Overflow", "Front-Running"],
        "impact_scope": "合约关键业务逻辑可被矿工或攻击者操纵，导致不公平结果",
        "fix_priority_map": {
            "critical": "P0 - 立即修复",
            "high": "P1 - 本周修复",
            "medium": "P2 - 下个版本修复",
            "low": "P3 - 逐步优化",
        },
    },
    "code_quality": {
        "label": "代码质量",
        "patterns": ["Inline Assembly"],
        "impact_scope": "代码可读性和可审计性降低，增加潜在隐患的隐藏风险",
        "fix_priority_map": {
            "critical": "P1 - 本周修复",
            "high": "P2 - 下个版本修复",
            "medium": "P3 - 逐步优化",
            "low": "P3 - 逐步优化",
        },
    },
}


def _match_category(vuln_name: str) -> str | None:
    for cat_key, cat_info in RISK_CATEGORIES.items():
        if vuln_name in cat_info["patterns"]:
            return cat_key
    for cat_key, cat_info in RISK_CATEGORIES.items():
        for pattern_keyword in cat_info["patterns"]:
            if pattern_keyword.lower() in vuln_name.lower():
                return cat_key
    return "other"


FIX_EFFORT_MAP = {
    "critical": "高（需2-4周，含测试与审计）",
    "high": "中高（需1-2周，含测试）",
    "medium": "中（需3-5天）",
    "low": "低（需1-2天）",
    "info": "极低（需数小时）",
}


def cluster_risks(contracts: list[AuditRequest]) -> RiskClusteringResult:
    results = [analyze_contract(c.source_code, c.contract_name) for c in contracts]

    category_buckets: dict[str, list[RiskClusterVulnRef]] = defaultdict(list)
    category_contracts: dict[str, set[str]] = defaultdict(set)
    category_severity: dict[str, str] = {}

    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

    for r in results:
        for v in r.vulnerabilities:
            cat = _match_category(v.name)
            sev_str = v.severity.value if hasattr(v.severity, "value") else str(v.severity)
            ref = RiskClusterVulnRef(
                vulnerability_name=v.name,
                severity=Severity(sev_str),
                contract_name=r.contract_name,
                line=v.line,
                description=v.description,
            )
            category_buckets[cat].append(ref)
            category_contracts[cat].add(r.contract_name)
            if cat not in category_severity or severity_rank.get(sev_str, 4) < severity_rank.get(category_severity[cat], 4):
                category_severity[cat] = sev_str

    clusters: list[RiskCluster] = []
    for cat_key, refs in category_buckets.items():
        cat_info = RISK_CATEGORIES.get(cat_key, None)
        if cat_info:
            label = cat_info["label"]
            impact_scope = cat_info["impact_scope"]
            fix_map = cat_info["fix_priority_map"]
        else:
            label = "其他风险"
            impact_scope = "不属于上述类别的安全风险，仍需关注和处理"
            fix_map = {"critical": "P0", "high": "P1", "medium": "P2", "low": "P3", "info": "P3"}

        highest = category_severity.get(cat_key, "low")
        fix_priority = fix_map.get(highest, "P2")
        fix_effort = FIX_EFFORT_MAP.get(highest, "中（需3-5天）")

        affected = sorted(category_contracts[cat_key])

        sev_counts: dict[str, int] = defaultdict(int)
        for ref in refs:
            s = ref.severity.value if hasattr(ref.severity, "value") else str(ref.severity)
            sev_counts[s] += 1

        rec_parts = []
        if cat_info:
            if sev_counts.get("critical", 0) > 0:
                rec_parts.append(f"【紧急】{label}类存在严重漏洞，须立即暂停相关功能并修复，避免资金损失")
            if sev_counts.get("high", 0) > 0:
                rec_parts.append(f"【高优】{label}类高危漏洞涉及{sev_counts['high']}处，建议统一制定修复方案并在本周内完成")
            if sev_counts.get("medium", 0) > 0:
                rec_parts.append(f"【中优】{label}类中危漏洞共{sev_counts['medium']}处，建议纳入下个迭代周期")
            if sev_counts.get("low", 0) > 0 or sev_counts.get("info", 0) > 0:
                rec_parts.append(f"【低优】{label}类低危问题可在后续版本中统一处理")
        else:
            rec_parts.append(f"其他风险共{len(refs)}处，建议逐项评估并安排修复")

        unified_rec = "；".join(rec_parts) if rec_parts else "暂无修复建议"

        clusters.append(RiskCluster(
            cluster_id=str(uuid.uuid4())[:8],
            category=cat_key,
            category_label=label,
            highest_severity=Severity(highest),
            vulnerability_count=len(refs),
            affected_contracts=affected,
            vulnerabilities=refs,
            impact_scope=impact_scope,
            fix_priority=fix_priority,
            fix_effort=fix_effort,
            unified_recommendation=unified_rec,
        ))

    clusters.sort(key=lambda c: (
        severity_rank.get(c.highest_severity.value if hasattr(c.highest_severity, "value") else str(c.highest_severity), 4),
        -c.vulnerability_count,
    ))

    total_vulns = sum(len(refs) for refs in category_buckets.values())
    crit_clusters = sum(1 for c in clusters if c.highest_severity in [Severity.critical])
    high_clusters = sum(1 for c in clusters if c.highest_severity == Severity.high)

    summary_parts = []
    summary_parts.append(f"对 {len(contracts)} 份合约进行风险聚类分析，共识别出 {len(clusters)} 个风险类别，涉及 {total_vulns} 个漏洞。")
    if crit_clusters > 0:
        summary_parts.append(f"其中 {crit_clusters} 个类别存在严重级别漏洞，需立即处理。")
    if high_clusters > 0:
        summary_parts.append(f"{high_clusters} 个类别存在高危漏洞，建议本周内修复。")
    if len(clusters) == 0:
        summary_parts.append("未发现安全风险，整体安全状况良好。")
    clustering_summary = "".join(summary_parts)

    overall_fix_strategy = []
    if crit_clusters > 0:
        overall_fix_strategy.append("立即组建应急修复团队，优先处理所有严重级别风险类别的漏洞")
        overall_fix_strategy.append("对严重级别风险涉及的合约进行暂停或限制操作，降低攻击面")
    if high_clusters > 0:
        overall_fix_strategy.append("本周内完成所有高危风险类别的漏洞修复与测试")
    if total_vulns > 0:
        overall_fix_strategy.append("制定分阶段修复计划，按 P0 > P1 > P2 > P3 优先级逐步推进")
        overall_fix_strategy.append("修复完成后进行回归测试和二次审计，确保修复有效且未引入新问题")
        overall_fix_strategy.append("建立统一安全编码规范，从源头减少同类风险再次出现")
    if not overall_fix_strategy:
        overall_fix_strategy.append("未发现安全风险，建议保持定期安全审计机制")

    return RiskClusteringResult(
        id=str(uuid.uuid4()),
        clusters=clusters,
        total_vulnerabilities=total_vulns,
        total_clusters=len(clusters),
        critical_clusters=crit_clusters,
        high_clusters=high_clusters,
        clustering_summary=clustering_summary,
        overall_fix_strategy=overall_fix_strategy,
        analyzed_at=datetime.now().isoformat(),
    )
