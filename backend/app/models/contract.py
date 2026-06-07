try:
    from pydantic import BaseModel
    _HAS_PYDANTIC = True
except ImportError:
    _HAS_PYDANTIC = False
    BaseModel = object

from enum import Enum

class Severity(str, Enum):
    critical = "critical"; high = "high"; medium = "medium"; low = "low"; info = "info"

if _HAS_PYDANTIC:
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

    class FalsePositiveFeedbackStatus(str, Enum):
        pending = "pending"
        accepted = "accepted"
        rejected = "rejected"

    class FalsePositiveFeedback(BaseModel):
        id: str
        audit_id: str
        vulnerability_id: str
        vulnerability_name: str
        contract_name: str
        reason: str
        status: FalsePositiveFeedbackStatus
        feedback_note: str | None = None
        created_at: str
        reviewed_at: str | None = None

    class FalsePositiveFeedbackCreate(BaseModel):
        audit_id: str
        vulnerability_id: str
        vulnerability_name: str
        contract_name: str
        reason: str
else:
    class Vulnerability:
        pass
    class AuditRequest:
        pass
    class AuditResult:
        pass
    class BatchAuditRequest:
        pass
    class CommonIssue:
        pass
    class BatchAuditResult:
        pass
    class CustomRule:
        pass
    class CustomRuleCreate:
        pass
    class AuditHistoryRecord:
        pass
    class ContractHistorySummary:
        pass
    class FalsePositiveFeedbackStatus(str, Enum):
        pending = "pending"
        accepted = "accepted"
        rejected = "rejected"
    class FalsePositiveFeedback:
        pass
    class FalsePositiveFeedbackCreate:
        pass
