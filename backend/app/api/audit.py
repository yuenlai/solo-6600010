from fastapi import APIRouter, HTTPException
import uuid
import hashlib
from ..models.contract import (
    AuditRequest, AuditResult, BatchAuditRequest, BatchAuditResult, 
    CustomRule, CustomRuleCreate, AuditHistoryRecord, ContractHistorySummary
)
from ..services.analyzer import analyze_contract, analyze_batch
from ..core.database import audit_results, batch_audit_results, custom_rules, audit_history, contract_version_counter

router = APIRouter(prefix="/audit", tags=["audit"])

def archive_audit_result(result: AuditResult, source_code: str):
    source_hash = hashlib.md5(source_code.encode()).hexdigest()
    contract_name = result.contract_name
    
    if contract_name not in contract_version_counter:
        contract_version_counter[contract_name] = 0
    contract_version_counter[contract_name] += 1
    
    history_record = AuditHistoryRecord(
        id=result.id,
        contract_name=contract_name,
        score=result.score,
        vulnerabilities=result.vulnerabilities,
        audited_at=result.audited_at,
        version=contract_version_counter[contract_name],
        source_code_hash=source_hash
    )
    
    if contract_name not in audit_history:
        audit_history[contract_name] = []
    audit_history[contract_name].append(history_record)

@router.post("")
async def audit_contract(req: AuditRequest) -> AuditResult:
    result = analyze_contract(req.source_code, req.contract_name)
    audit_results[result.id] = result
    archive_audit_result(result, req.source_code)
    return result

@router.post("/batch")
async def audit_batch(req: BatchAuditRequest) -> BatchAuditResult:
    result = analyze_batch(req.contracts)
    batch_audit_results[result.id] = result
    for i, audit_res in enumerate(result.results):
        archive_audit_result(audit_res, req.contracts[i].source_code)
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

@router.get("/history/contracts")
async def list_contract_history() -> list[ContractHistorySummary]:
    summaries = []
    for contract_name, records in audit_history.items():
        if not records:
            continue
        sorted_records = sorted(records, key=lambda r: r.audited_at)
        first = sorted_records[0]
        latest = sorted_records[-1]
        score_diff = latest.score - first.score
        if score_diff > 5:
            trend = "improving"
        elif score_diff < -5:
            trend = "declining"
        else:
            trend = "stable"
        
        summaries.append(ContractHistorySummary(
            contract_name=contract_name,
            audit_count=len(records),
            latest_score=latest.score,
            first_audit_at=first.audited_at,
            latest_audit_at=latest.audited_at,
            score_trend=trend
        ))
    return summaries

@router.get("/history/contract/{contract_name}")
async def get_contract_history(contract_name: str) -> list[AuditHistoryRecord]:
    if contract_name not in audit_history:
        return []
    return sorted(audit_history[contract_name], key=lambda r: r.audited_at, reverse=True)

@router.get("/history/compare/{contract_name}")
async def compare_contract_history(contract_name: str):
    if contract_name not in audit_history or len(audit_history[contract_name]) < 2:
        raise HTTPException(400, "Not enough history to compare")
    
    records = sorted(audit_history[contract_name], key=lambda r: r.audited_at)
    first = records[0]
    latest = records[-1]
    
    return {
        "contract_name": contract_name,
        "first_audit": first,
        "latest_audit": latest,
        "score_change": latest.score - first.score,
        "score_change_percent": round((latest.score - first.score) / first.score * 100, 2) if first.score > 0 else 0,
        "vuln_count_change": len(latest.vulnerabilities) - len(first.vulnerabilities),
        "audit_count": len(records),
        "all_scores": [{"version": r.version, "score": r.score, "audited_at": r.audited_at} for r in records]
    }
