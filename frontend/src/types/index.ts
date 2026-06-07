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
