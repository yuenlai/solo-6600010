import re, uuid
from datetime import datetime
from collections import defaultdict
from ..models.contract import (
    Vulnerability, Severity, AuditResult, CommonIssue, BatchAuditResult, 
    AuditRequest, ScoreBreakdown, ScoreInterpretation, BatchScoreInterpretation
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
