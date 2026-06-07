from fastapi import APIRouter, HTTPException
from ..models.contract import AuditRequest, AuditResult, BatchAuditRequest, BatchAuditResult
from ..services.analyzer import analyze_contract, analyze_batch
from ..core.database import audit_results, batch_audit_results

router = APIRouter(prefix="/audit", tags=["audit"])

@router.post("")
async def audit_contract(req: AuditRequest) -> AuditResult:
    result = analyze_contract(req.source_code, req.contract_name)
    audit_results[result.id] = result
    return result

@router.post("/batch")
async def audit_batch(req: BatchAuditRequest) -> BatchAuditResult:
    result = analyze_batch(req.contracts)
    batch_audit_results[result.id] = result
    return result

@router.get("/batch/{batch_id}")
async def get_batch_result(batch_id: str):
    if batch_id in batch_audit_results: return batch_audit_results[batch_id]
    raise HTTPException(404, "Not found")

@router.get("/{audit_id}")
async def get_result(audit_id: str):
    if audit_id in audit_results: return audit_results[audit_id]
    raise HTTPException(404, "Not found")

@router.get("")
async def list_audits():
    return [{"id": r.id, "contract_name": r.contract_name, "score": r.score,
             "vuln_count": len(r.vulnerabilities)} for r in audit_results.values()]
