from fastapi import APIRouter, HTTPException
import uuid
from ..models.contract import AuditRequest, AuditResult, BatchAuditRequest, BatchAuditResult, CustomRule, CustomRuleCreate
from ..services.analyzer import analyze_contract, analyze_batch
from ..core.database import audit_results, batch_audit_results, custom_rules

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

@router.get("/rules")
async def list_custom_rules():
    return list(custom_rules.values())

@router.post("/rules")
async def create_custom_rule(rule: CustomRuleCreate):
    rule_id = str(uuid.uuid4())[:8]
    new_rule = CustomRule(
        id=rule_id,
        name=rule.name,
        severity=rule.severity,
        pattern=rule.pattern,
        description=rule.description,
        recommendation=rule.recommendation,
        enabled=rule.enabled
    )
    custom_rules[rule_id] = new_rule
    return new_rule

@router.put("/rules/{rule_id}")
async def update_custom_rule(rule_id: str, rule: CustomRuleCreate):
    if rule_id not in custom_rules:
        raise HTTPException(404, "Rule not found")
    updated_rule = CustomRule(
        id=rule_id,
        name=rule.name,
        severity=rule.severity,
        pattern=rule.pattern,
        description=rule.description,
        recommendation=rule.recommendation,
        enabled=rule.enabled
    )
    custom_rules[rule_id] = updated_rule
    return updated_rule

@router.delete("/rules/{rule_id}")
async def delete_custom_rule(rule_id: str):
    if rule_id not in custom_rules:
        raise HTTPException(404, "Rule not found")
    del custom_rules[rule_id]
    return {"message": "Rule deleted"}
