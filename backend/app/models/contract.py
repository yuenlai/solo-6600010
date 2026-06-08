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

    class ScoreBreakdown(BaseModel):
        severity: Severity
        count: int
        penalty_per_item: int
        total_penalty: int

    class ScoreInterpretation(BaseModel):
        score: float
        max_possible_score: int
        total_deduction: int
        breakdown: list[ScoreBreakdown]
        risk_weight_summary: str
        overall_conclusion: str
        recommendations: list[str]

    class AuditResult(BaseModel):
        id: str; contract_name: str; vulnerabilities: list
        score: float; total_lines: int; audited_at: str
        score_interpretation: ScoreInterpretation | None = None

    class BatchAuditRequest(BaseModel):
        contracts: list[AuditRequest]

    class CommonIssue(BaseModel):
        name: str; severity: Severity; count: int
        description: str; recommendation: str
        affected_contracts: list[str]

    class BatchScoreInterpretation(BaseModel):
        average_score: float
        total_contracts: int
        total_deduction: float
        breakdown: list[ScoreBreakdown]
        risk_distribution: dict[str, int]
        overall_conclusion: str
        key_findings: list[str]
        recommendations: list[str]

    class BatchAuditResult(BaseModel):
        id: str; results: list[AuditResult]
        risk_ranking: list[AuditResult]
        common_issues: list[CommonIssue]
        total_contracts: int
        total_vulnerabilities: int
        average_score: float
        audited_at: str
        score_interpretation: BatchScoreInterpretation | None = None

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

    class ReportIssue(BaseModel):
        id: str
        name: str
        severity: Severity
        contract_name: str
        line_number: int
        description: str
        recommendation: str
        affected_contracts: list[str] | None = None
        occurrence_count: int | None = None

    class ReportConclusion(BaseModel):
        overall_score: float
        risk_level: str
        summary: str
        key_findings: list[str]
        total_contracts: int
        total_vulnerabilities: int
        risk_distribution: dict[str, int]

    class ReportRemediationItem(BaseModel):
        priority: str
        vulnerability_name: str
        contract_name: str
        severity: Severity
        recommendation: str
        estimated_effort: str

    class ReportRemediationSummary(BaseModel):
        total_items: int
        critical_count: int
        high_count: int
        medium_count: int
        low_count: int
        priority_items: list[ReportRemediationItem]
        next_steps: list[str]

    class AuditReport(BaseModel):
        id: str
        report_type: str
        title: str
        generated_at: str
        conclusion: ReportConclusion
        issues: list[ReportIssue]
        remediation_summary: ReportRemediationSummary

    class AuditReportExportRequest(BaseModel):
        audit_id: str | None = None
        batch_audit_id: str | None = None
        format: str = "markdown"
        include_remediation: bool = True

    class ContractSimilarity(BaseModel):
        contract_name: str
        similarity: float
        shared_patterns: list[str]

    class FamilyDuplicateRisk(BaseModel):
        vulnerability_name: str
        severity: Severity
        affected_contracts: list[str]
        description: str
        recommendation: str
        occurrence_count: int
        risk_amplification: str

    class FamilyDifferentialRisk(BaseModel):
        vulnerability_name: str
        severity: Severity
        contract_name: str
        description: str
        recommendation: str
        line: int
        missing_in: list[str]

    class ContractFamily(BaseModel):
        family_id: str
        family_name: str
        members: list[str]
        similarity_matrix: dict[str, list[ContractSimilarity]]
        avg_similarity: float
        shared_vulnerability_patterns: list[str]

    class ContractFamilyAnalysisResult(BaseModel):
        id: str
        families: list[ContractFamily]
        duplicate_risks: list[FamilyDuplicateRisk]
        differential_risks: list[FamilyDifferentialRisk]
        total_contracts: int
        total_families: int
        cross_family_risks: int
        analysis_summary: str
        analyzed_at: str

    class MigrationVulnChange(BaseModel):
        vulnerability_name: str
        severity: Severity
        change_type: str
        description: str
        recommendation: str
        line: int | None = None

    class MigrationRiskItem(BaseModel):
        risk_type: str
        severity: Severity
        description: str
        impact: str
        recommendation: str

    class MigrationBenefitItem(BaseModel):
        benefit_type: str
        description: str
        impact: str

    class VersionMigrationAssessmentRequest(BaseModel):
        old_source_code: str
        new_source_code: str
        contract_name: str = "Contract"

    class VersionMigrationAssessmentResult(BaseModel):
        id: str
        contract_name: str
        old_score: float
        new_score: float
        score_change: float
        old_vulnerability_count: int
        new_vulnerability_count: int
        vulnerability_change: int
        resolved_vulnerabilities: list[MigrationVulnChange]
        new_vulnerabilities: list[MigrationVulnChange]
        persistent_vulnerabilities: list[MigrationVulnChange]
        risks: list[MigrationRiskItem]
        benefits: list[MigrationBenefitItem]
        overall_recommendation: str
        risk_level: str
        migration_score: float
        code_diff_summary: str
        assessed_at: str

    class RiskSubscription(BaseModel):
        id: str
        name: str
        risk_pattern: str
        severity: Severity
        description: str
        enabled: bool = True
        notify_on_change: bool = True
        created_at: str
        updated_at: str

    class RiskSubscriptionCreate(BaseModel):
        name: str
        risk_pattern: str
        severity: Severity = Severity.high
        description: str = ""
        enabled: bool = True
        notify_on_change: bool = True

    class SubscriptionMatch(BaseModel):
        contract_name: str
        vulnerability_name: str
        severity: Severity
        line: int
        description: str
        audited_at: str
        score: float

    class SubscriptionTrendDataPoint(BaseModel):
        date: str
        match_count: int
        total_audited: int
        avg_score: float

    class SubscriptionDashboard(BaseModel):
        subscription: RiskSubscription
        matches: list[SubscriptionMatch]
        total_matches: int
        trend: list[SubscriptionTrendDataPoint]
        trend_direction: str
        latest_match_at: str | None = None

    class ReReviewStatus(str, Enum):
        pending = "pending"
        approved = "approved"
        rejected = "rejected"

    class VulnDiffItem(BaseModel):
        vulnerability_name: str
        severity: Severity
        line: int | None = None
        description: str
        change_type: str
        old_severity: Severity | None = None
        recommendation: str | None = None

    class ReReviewRequest(BaseModel):
        plan_id: str
        source_code: str
        remediation_summary: str | None = None

    class ReReviewResult(BaseModel):
        id: str
        plan_id: str
        contract_name: str
        old_audit_id: str
        new_audit_id: str
        old_score: float
        new_score: float
        score_change: float
        score_change_percent: float
        old_vulnerability_count: int
        new_vulnerability_count: int
        resolved_vulnerabilities: list[VulnDiffItem]
        new_vulnerabilities: list[VulnDiffItem]
        persistent_vulnerabilities: list[VulnDiffItem]
        severity_diff: dict[str, dict[str, int]]
        overall_assessment: str
        risk_level_change: str
        recheck_passed: bool
        remediation_summary: str | None = None
        created_at: str

else:
    class Vulnerability:
        pass
    class AuditRequest:
        pass
    class ScoreBreakdown:
        pass
    class ScoreInterpretation:
        pass
    class AuditResult:
        pass
    class BatchAuditRequest:
        pass
    class CommonIssue:
        pass
    class BatchScoreInterpretation:
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
    class RemediationStatus(str, Enum):
        open = "open"
        in_progress = "in_progress"
        resolved = "resolved"
        recheck_pending = "recheck_pending"
        recheck_passed = "recheck_passed"
        recheck_failed = "recheck_failed"
        ignored = "ignored"
    class RemediationItem:
        pass
    class RemediationPlan:
        pass
    class RemediationPlanCreate:
        pass
    class RemediationItemUpdate:
        pass
    class ReportIssue:
        pass
    class ReportConclusion:
        pass
    class ReportRemediationItem:
        pass
    class ReportRemediationSummary:
        pass
    class AuditReport:
        pass
    class AuditReportExportRequest:
        pass
    class ContractSimilarity:
        pass
    class FamilyDuplicateRisk:
        pass
    class FamilyDifferentialRisk:
        pass
    class ContractFamily:
        pass
    class ContractFamilyAnalysisResult:
        pass
    class MigrationVulnChange:
        pass
    class MigrationRiskItem:
        pass
    class MigrationBenefitItem:
        pass
    class VersionMigrationAssessmentRequest:
        pass
    class VersionMigrationAssessmentResult:
        pass
    class RiskSubscription:
        pass
    class RiskSubscriptionCreate:
        pass
    class SubscriptionMatch:
        pass
    class SubscriptionTrendDataPoint:
        pass
    class SubscriptionDashboard:
        pass
    class ReReviewStatus(str, Enum):
        pending = "pending"
        approved = "approved"
        rejected = "rejected"
    class VulnDiffItem:
        pass
    class ReReviewRequest:
        pass
    class ReReviewResult:
        pass
