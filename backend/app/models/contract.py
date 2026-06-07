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

    class AuditTaskStatus(str, Enum):
        pending = "pending"
        in_progress = "in_progress"
        completed = "completed"
        skipped = "skipped"

    class AuditTaskPriority(str, Enum):
        low = "low"
        medium = "medium"
        high = "high"
        critical = "critical"

    class AuditTaskItem(BaseModel):
        id: str
        title: str
        description: str | None = None
        status: AuditTaskStatus
        priority: AuditTaskPriority
        assignee: str | None = None
        due_date: str | None = None
        completed_at: str | None = None
        notes: str | None = None

    class AuditTaskList(BaseModel):
        id: str
        contract_name: str
        contract_address: str | None = None
        description: str | None = None
        tasks: list[AuditTaskItem]
        created_at: str
        updated_at: str

    class AuditTaskListCreate(BaseModel):
        contract_name: str
        contract_address: str | None = None
        description: str | None = None

    class AuditTaskItemCreate(BaseModel):
        title: str
        description: str | None = None
        priority: AuditTaskPriority = AuditTaskPriority.medium
        assignee: str | None = None
        due_date: str | None = None

    class AuditTaskItemUpdate(BaseModel):
        title: str | None = None
        description: str | None = None
        status: AuditTaskStatus | None = None
        priority: AuditTaskPriority | None = None
        assignee: str | None = None
        due_date: str | None = None
        notes: str | None = None

    class RiskDistribution(BaseModel):
        critical: int = 0
        high: int = 0
        medium: int = 0
        low: int = 0
        info: int = 0

    class ProjectContractSummary(BaseModel):
        id: str
        contract_name: str
        score: float
        total_vulnerabilities: int
        risk_distribution: RiskDistribution
        last_audited_at: str
        status: str

    class CriticalIssue(BaseModel):
        id: str
        name: str
        severity: Severity
        contract_name: str
        description: str
        line: int
        first_found_at: str
        status: str

    class RecentActivity(BaseModel):
        id: str
        type: str
        contract_name: str
        description: str
        created_at: str

    class ProjectDashboardData(BaseModel):
        total_contracts: int
        total_vulnerabilities: int
        average_score: float
        risk_distribution: RiskDistribution
        contracts: list[ProjectContractSummary]
        critical_issues: list[CriticalIssue]
        recent_activities: list[RecentActivity]
        last_updated: str

    class RemediationStatus(str, Enum):
        open = "open"
        in_progress = "in_progress"
        resolved = "resolved"
        recheck_pending = "recheck_pending"
        recheck_passed = "recheck_passed"
        recheck_failed = "recheck_failed"
        ignored = "ignored"

    class RemediationItem(BaseModel):
        id: str
        vulnerability_id: str
        vulnerability_name: str
        contract_name: str
        severity: Severity
        priority: AuditTaskPriority
        line_number: int
        description: str
        recommendation: str
        status: RemediationStatus
        assignee: str | None = None
        notes: str | None = None
        due_date: str | None = None
        created_at: str
        updated_at: str
        resolved_at: str | None = None
        recheck_notes: str | None = None
        rechecked_at: str | None = None

    class RemediationPlan(BaseModel):
        id: str
        audit_id: str | None = None
        batch_audit_id: str | None = None
        plan_name: str
        contract_names: list[str]
        items: list[RemediationItem]
        created_at: str
        updated_at: str

    class RemediationPlanCreate(BaseModel):
        audit_id: str | None = None
        batch_audit_id: str | None = None
        plan_name: str | None = None

    class RemediationItemUpdate(BaseModel):
        status: RemediationStatus | None = None
        assignee: str | None = None
        notes: str | None = None
        due_date: str | None = None
        recheck_notes: str | None = None
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
    class AuditTaskStatus(str, Enum):
        pending = "pending"
        in_progress = "in_progress"
        completed = "completed"
        skipped = "skipped"
    class AuditTaskPriority(str, Enum):
        low = "low"
        medium = "medium"
        high = "high"
        critical = "critical"
    class AuditTaskItem:
        pass
    class AuditTaskList:
        pass
    class AuditTaskListCreate:
        pass
    class AuditTaskItemCreate:
        pass
    class AuditTaskItemUpdate:
        pass
    class RiskDistribution:
        pass
    class ProjectContractSummary:
        pass
    class CriticalIssue:
        pass
    class RecentActivity:
        pass
    class ProjectDashboardData:
        pass
