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
