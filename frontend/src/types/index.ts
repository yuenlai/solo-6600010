export interface Vulnerability {
  id: string; name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  line: number; description: string; recommendation: string;
}
export interface ScoreBreakdown {
  severity: "critical" | "high" | "medium" | "low" | "info";
  count: number;
  penalty_per_item: number;
  total_penalty: number;
}

export interface ScoreInterpretation {
  score: number;
  max_possible_score: number;
  total_deduction: number;
  breakdown: ScoreBreakdown[];
  risk_weight_summary: string;
  overall_conclusion: string;
  recommendations: string[];
}

export interface AuditResult {
  id: string; contract_name: string; vulnerabilities: Vulnerability[];
  score: number; total_lines: number; audited_at: string;
  score_interpretation?: ScoreInterpretation;
}
export interface AuditRequest {
  source_code: string; contract_name: string; solidity_version?: string;
}
export interface CommonIssue {
  name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  count: number; description: string; recommendation: string;
  affected_contracts: string[];
}
export interface BatchScoreInterpretation {
  average_score: number;
  total_contracts: number;
  total_deduction: number;
  breakdown: ScoreBreakdown[];
  risk_distribution: Record<string, number>;
  overall_conclusion: string;
  key_findings: string[];
  recommendations: string[];
}

export interface BatchAuditResult {
  id: string; results: AuditResult[]; risk_ranking: AuditResult[];
  common_issues: CommonIssue[]; total_contracts: number;
  total_vulnerabilities: number; average_score: number; audited_at: string;
  score_interpretation?: BatchScoreInterpretation;
}
export interface ContractInput {
  id: string; name: string; source_code: string;
}
export interface CustomRule {
  id: string; name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  pattern: string; description: string; recommendation: string; enabled: boolean;
}
export interface CustomRuleCreate {
  name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  pattern: string; description: string; recommendation: string; enabled?: boolean;
}

export interface AuditHistoryRecord {
  id: string; contract_name: string; score: number;
  vulnerabilities: Vulnerability[]; audited_at: string; version: number;
  source_code_hash: string;
}

export interface ContractHistorySummary {
  contract_name: string; audit_count: number; latest_score: number;
  first_audit_at: string; latest_audit_at: string; score_trend: "improving" | "declining" | "stable";
}

export interface ScoreDataPoint {
  version: number; score: number; audited_at: string;
}

export interface ContractCompareResult {
  contract_name: string;
  first_audit: AuditHistoryRecord;
  latest_audit: AuditHistoryRecord;
  score_change: number;
  score_change_percent: number;
  vuln_count_change: number;
  audit_count: number;
  all_scores: ScoreDataPoint[];
}

export interface ContractTemplate {
  id: string;
  name: string;
  category: string;
  severity: "critical" | "high" | "medium";
  difficulty: "beginner" | "intermediate" | "advanced";
  description: string;
  vulnerability_types: string[];
  source_code: string;
  expected_vulnerabilities: string[];
  learning_points: string[];
  real_world_examples: string[];
}

export type FalsePositiveFeedbackStatus = "pending" | "accepted" | "rejected";

export interface FalsePositiveFeedback {
  id: string;
  audit_id: string;
  vulnerability_id: string;
  vulnerability_name: string;
  contract_name: string;
  reason: string;
  status: FalsePositiveFeedbackStatus;
  feedback_note?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface FalsePositiveFeedbackCreate {
  audit_id: string;
  vulnerability_id: string;
  vulnerability_name: string;
  contract_name: string;
  reason: string;
}

export type AuditTaskStatus = "pending" | "in_progress" | "completed" | "skipped";
export type AuditTaskPriority = "low" | "medium" | "high" | "critical";

export interface AuditTaskItem {
  id: string;
  title: string;
  description?: string;
  status: AuditTaskStatus;
  priority: AuditTaskPriority;
  assignee?: string;
  due_date?: string;
  completed_at?: string;
  notes?: string;
}

export interface AuditTaskList {
  id: string;
  contract_name: string;
  contract_address?: string;
  description?: string;
  tasks: AuditTaskItem[];
  created_at: string;
  updated_at: string;
}

export interface AuditTaskListCreate {
  contract_name: string;
  contract_address?: string;
  description?: string;
}

export interface AuditTaskItemCreate {
  title: string;
  description?: string;
  priority?: AuditTaskPriority;
  assignee?: string;
  due_date?: string;
}

export interface AuditTaskItemUpdate {
  title?: string;
  description?: string;
  status?: AuditTaskStatus;
  priority?: AuditTaskPriority;
  assignee?: string;
  due_date?: string;
  notes?: string;
}

export interface RiskDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ProjectContractSummary {
  id: string;
  contract_name: string;
  score: number;
  total_vulnerabilities: number;
  risk_distribution: RiskDistribution;
  last_audited_at: string;
  status: "safe" | "warning" | "danger";
}

export interface CriticalIssue {
  id: string;
  name: string;
  severity: "critical" | "high";
  contract_name: string;
  description: string;
  line: number;
  first_found_at: string;
  status: "open" | "fixed" | "ignored";
}

export interface RecentActivity {
  id: string;
  type: "audit" | "fix" | "task" | "feedback";
  contract_name: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ProjectDashboardData {
  total_contracts: number;
  total_vulnerabilities: number;
  average_score: number;
  risk_distribution: RiskDistribution;
  contracts: ProjectContractSummary[];
  critical_issues: CriticalIssue[];
  recent_activities: RecentActivity[];
  last_updated: string;
}

export type RemediationStatus = "open" | "in_progress" | "resolved" | "recheck_pending" | "recheck_passed" | "recheck_failed" | "ignored";

export interface RemediationItem {
  id: string;
  vulnerability_id: string;
  vulnerability_name: string;
  contract_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  priority: AuditTaskPriority;
  line_number: number;
  description: string;
  recommendation: string;
  status: RemediationStatus;
  assignee?: string;
  notes?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  recheck_notes?: string;
  rechecked_at?: string;
}

export interface RemediationPlan {
  id: string;
  audit_id?: string;
  batch_audit_id?: string;
  plan_name: string;
  contract_names: string[];
  items: RemediationItem[];
  created_at: string;
  updated_at: string;
}

export interface RemediationPlanCreate {
  audit_id?: string;
  batch_audit_id?: string;
  plan_name?: string;
}

export interface RemediationItemUpdate {
  status?: RemediationStatus;
  assignee?: string;
  notes?: string;
  due_date?: string;
  recheck_notes?: string;
}

export interface ReportIssue {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  contract_name: string;
  line_number: number;
  description: string;
  recommendation: string;
  affected_contracts?: string[];
  occurrence_count?: number;
}

export interface ReportConclusion {
  overall_score: number;
  risk_level: string;
  summary: string;
  key_findings: string[];
  total_contracts: number;
  total_vulnerabilities: number;
  risk_distribution: Record<string, number>;
}

export interface ReportRemediationItem {
  priority: string;
  vulnerability_name: string;
  contract_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  recommendation: string;
  estimated_effort: string;
}

export interface ReportRemediationSummary {
  total_items: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  priority_items: ReportRemediationItem[];
  next_steps: string[];
}

export interface AuditReport {
  id: string;
  report_type: "single" | "batch";
  title: string;
  generated_at: string;
  conclusion: ReportConclusion;
  issues: ReportIssue[];
  remediation_summary: ReportRemediationSummary;
}

export interface AuditReportExportRequest {
  audit_id?: string;
  batch_audit_id?: string;
  format?: "markdown" | "json";
  include_remediation?: boolean;
}

export interface ContractSimilarity {
  contract_name: string;
  similarity: number;
  shared_patterns: string[];
}

export interface FamilyDuplicateRisk {
  vulnerability_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  affected_contracts: string[];
  description: string;
  recommendation: string;
  occurrence_count: number;
  risk_amplification: string;
}

export interface FamilyDifferentialRisk {
  vulnerability_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  contract_name: string;
  description: string;
  recommendation: string;
  line: number;
  missing_in: string[];
}

export interface ContractFamily {
  family_id: string;
  family_name: string;
  members: string[];
  similarity_matrix: Record<string, ContractSimilarity[]>;
  avg_similarity: number;
  shared_vulnerability_patterns: string[];
}

export interface ContractFamilyAnalysisResult {
  id: string;
  families: ContractFamily[];
  duplicate_risks: FamilyDuplicateRisk[];
  differential_risks: FamilyDifferentialRisk[];
  total_contracts: number;
  total_families: number;
  cross_family_risks: number;
  analysis_summary: string;
  analyzed_at: string;
}

export interface MigrationVulnChange {
  vulnerability_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  change_type: "resolved" | "added" | "persistent";
  description: string;
  recommendation: string;
  line?: number;
}

export interface MigrationRiskItem {
  risk_type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  impact: string;
  recommendation: string;
}

export interface MigrationBenefitItem {
  benefit_type: string;
  description: string;
  impact: string;
}

export interface VersionMigrationAssessmentRequest {
  old_source_code: string;
  new_source_code: string;
  contract_name: string;
}

export interface VersionMigrationAssessmentResult {
  id: string;
  contract_name: string;
  old_score: number;
  new_score: number;
  score_change: number;
  old_vulnerability_count: number;
  new_vulnerability_count: number;
  vulnerability_change: number;
  resolved_vulnerabilities: MigrationVulnChange[];
  new_vulnerabilities: MigrationVulnChange[];
  persistent_vulnerabilities: MigrationVulnChange[];
  risks: MigrationRiskItem[];
  benefits: MigrationBenefitItem[];
  overall_recommendation: string;
  risk_level: string;
  migration_score: number;
  code_diff_summary: string;
  assessed_at: string;
}

export interface RiskSubscription {
  id: string;
  name: string;
  risk_pattern: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description: string;
  enabled: boolean;
  notify_on_change: boolean;
  created_at: string;
  updated_at: string;
}

export interface RiskSubscriptionCreate {
  name: string;
  risk_pattern: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  description?: string;
  enabled?: boolean;
  notify_on_change?: boolean;
}

export interface SubscriptionMatch {
  contract_name: string;
  vulnerability_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  line: number;
  description: string;
  audited_at: string;
  score: number;
}

export interface SubscriptionTrendDataPoint {
  date: string;
  match_count: number;
  total_audited: number;
  avg_score: number;
}

export interface SubscriptionDashboard {
  subscription: RiskSubscription;
  matches: SubscriptionMatch[];
  total_matches: number;
  trend: SubscriptionTrendDataPoint[];
  trend_direction: "increasing" | "decreasing" | "stable";
  latest_match_at: string | null;
}

export interface VulnDiffItem {
  vulnerability_name: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  line: number | null;
  description: string;
  change_type: "resolved" | "added" | "persistent";
  old_severity: "critical" | "high" | "medium" | "low" | "info" | null;
  recommendation: string | null;
}

export interface ReReviewRequest {
  plan_id: string;
  source_code: string;
  remediation_summary?: string;
}

export interface ReReviewResult {
  id: string;
  plan_id: string;
  contract_name: string;
  old_audit_id: string;
  new_audit_id: string;
  old_score: number;
  new_score: number;
  score_change: number;
  score_change_percent: number;
  old_vulnerability_count: number;
  new_vulnerability_count: number;
  resolved_vulnerabilities: VulnDiffItem[];
  new_vulnerabilities: VulnDiffItem[];
  persistent_vulnerabilities: VulnDiffItem[];
  severity_diff: Record<string, { old: number; new: number; change: number }>;
  overall_assessment: string;
  risk_level_change: string;
  recheck_passed: boolean;
  remediation_summary: string | null;
  created_at: string;
}

export type AuditNoteRole = "developer" | "auditor" | "owner";

export interface AuditNote {
  id: string;
  audit_id: string;
  contract_name: string;
  role: AuditNoteRole;
  author: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AuditNoteCreate {
  audit_id: string;
  contract_name: string;
  role: AuditNoteRole;
  author: string;
  content: string;
}
