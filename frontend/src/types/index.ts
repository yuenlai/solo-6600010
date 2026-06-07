export interface Vulnerability {
  id: string; name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  line: number; description: string; recommendation: string;
}
export interface AuditResult {
  id: string; contract_name: string; vulnerabilities: Vulnerability[];
  score: number; total_lines: number; audited_at: string;
}
export interface AuditRequest {
  source_code: string; contract_name: string; solidity_version?: string;
}
export interface CommonIssue {
  name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  count: number; description: string; recommendation: string;
  affected_contracts: string[];
}
export interface BatchAuditResult {
  id: string; results: AuditResult[]; risk_ranking: AuditResult[];
  common_issues: CommonIssue[]; total_contracts: number;
  total_vulnerabilities: number; average_score: number; audited_at: string;
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
