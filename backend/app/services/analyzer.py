import re, uuid
from datetime import datetime
from ..models.contract import Vulnerability, Severity, AuditResult

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
