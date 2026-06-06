export interface Vulnerability {
  id: string; name: string; severity: "critical"|"high"|"medium"|"low"|"info";
  line: number; description: string; recommendation: string;
}
export interface AuditResult {
  id: string; contract_name: string; vulnerabilities: Vulnerability[];
  score: number; total_lines: number; audited_at: string;
}
