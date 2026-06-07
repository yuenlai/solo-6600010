from pydantic import BaseModel
from enum import Enum

class Severity(str, Enum):
    critical = "critical"; high = "high"; medium = "medium"; low = "low"; info = "info"

class Vulnerability(BaseModel):
    id: str; name: str; severity: Severity; line: int
    description: str; recommendation: str; pattern: str

class AuditRequest(BaseModel):
    source_code: str; contract_name: str = "Unknown"; solidity_version: str = "0.8.0"

class AuditResult(BaseModel):
    id: str; contract_name: str; vulnerabilities: list
    score: float; total_lines: int; audited_at: str

class BatchAuditRequest(BaseModel):
    contracts: list[AuditRequest]

class CommonIssue(BaseModel):
    name: str; severity: Severity; count: int
    description: str; recommendation: str
    affected_contracts: list[str]

class BatchAuditResult(BaseModel):
    id: str; results: list[AuditResult]
    risk_ranking: list[AuditResult]
    common_issues: list[CommonIssue]
    total_contracts: int
    total_vulnerabilities: int
    average_score: float
    audited_at: str

class CustomRule(BaseModel):
    id: str; name: str; severity: Severity; pattern: str
    description: str; recommendation: str; enabled: bool = True

class CustomRuleCreate(BaseModel):
    name: str; severity: Severity; pattern: str
    description: str; recommendation: str; enabled: bool = True

class AuditHistoryRecord(BaseModel):
    id: str; contract_name: str; score: float
    vulnerabilities: list; audited_at: str; version: int
    source_code_hash: str

class ContractHistorySummary(BaseModel):
    contract_name: str
    audit_count: int
    latest_score: float
    first_audit_at: str
    latest_audit_at: str
    score_trend: str

class ContractTemplate(BaseModel):
    id: str
    name: str
    category: str
    severity: Severity
    difficulty: str
    description: str
    vulnerability_types: list[str]
    source_code: str
    expected_vulnerabilities: list[str]
    learning_points: list[str]
    real_world_examples: list[str]
