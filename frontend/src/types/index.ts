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
