import re, uuid
from datetime import datetime
from collections import defaultdict
from ..models.contract import Vulnerability, Severity, AuditResult, CommonIssue, BatchAuditResult, AuditRequest

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

def analyze_contract(source_code: str, contract_name: str) -> AuditResult:
    vulns = []
    lines = source_code.split("\n")
    for pi in PATTERNS:
        for i, line in enumerate(lines, 1):
            if re.search(pi["pattern"], line, re.IGNORECASE):
                vulns.append(Vulnerability(id=str(uuid.uuid4())[:8], name=pi["name"],
                    severity=pi["severity"], line=i, description=pi["description"],
                    recommendation=pi["recommendation"], pattern=pi["pattern"]))
    penalty = {"critical": 25, "high": 15, "medium": 8, "low": 3, "info": 1}
    score = max(0, 100 - sum(penalty.get(v.severity.value, 0) for v in vulns))
    return AuditResult(id=str(uuid.uuid4()), contract_name=contract_name,
        vulnerabilities=vulns, score=score, total_lines=len(lines), audited_at=datetime.now().isoformat())

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}

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
    return BatchAuditResult(
        id=str(uuid.uuid4()),
        results=results,
        risk_ranking=risk_ranking,
        common_issues=common_issues,
        total_contracts=len(results),
        total_vulnerabilities=total_vulns,
        average_score=round(avg_score, 2),
        audited_at=datetime.now().isoformat()
    )
