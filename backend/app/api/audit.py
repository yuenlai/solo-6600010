try:
    from fastapi import APIRouter, HTTPException
    _HAS_FASTAPI = True
except ImportError:
    _HAS_FASTAPI = False
    APIRouter = None
    HTTPException = Exception

import uuid
import hashlib
from datetime import datetime
from ..models.contract import (
    AuditRequest, AuditResult, BatchAuditRequest, BatchAuditResult, 
    CustomRule, CustomRuleCreate, AuditHistoryRecord, ContractHistorySummary,
    FalsePositiveFeedback, FalsePositiveFeedbackCreate, FalsePositiveFeedbackStatus,
    AuditTaskList, AuditTaskListCreate, AuditTaskItem, AuditTaskItemCreate,
    AuditTaskItemUpdate, AuditTaskStatus, AuditTaskPriority,
    RiskDistribution, ProjectContractSummary, CriticalIssue, RecentActivity,
    ProjectDashboardData, Severity,
    RemediationPlan, RemediationPlanCreate, RemediationItem, RemediationItemUpdate,
    RemediationStatus,
    ReportIssue, ReportConclusion, ReportRemediationItem, ReportRemediationSummary,
    AuditReport, AuditReportExportRequest,
    ContractFamilyAnalysisResult,
    VersionMigrationAssessmentRequest, VersionMigrationAssessmentResult,
    RiskSubscription, RiskSubscriptionCreate, SubscriptionMatch, SubscriptionTrendDataPoint, SubscriptionDashboard
)
try:
    from ..services.analyzer import analyze_contract, analyze_batch, analyze_contract_family, assess_version_migration
except ImportError:
    analyze_contract = None
    analyze_batch = None
    analyze_contract_family = None
    assess_version_migration = None
from ..core.database import audit_results, batch_audit_results, custom_rules, audit_history, contract_version_counter, false_positive_feedbacks, audit_task_lists, remediation_plans, audit_reports, migration_assessments, risk_subscriptions

class DummyRouter:
    def post(self, path):
        def decorator(func):
            return func
        return decorator
    def get(self, path):
        def decorator(func):
            return func
        return decorator
    def put(self, path):
        def decorator(func):
            return func
        return decorator
    def delete(self, path):
        def decorator(func):
            return func
        return decorator

if _HAS_FASTAPI and APIRouter:
    router = APIRouter(prefix="/audit", tags=["audit"])
else:
    router = DummyRouter()

def archive_audit_result(result, source_code):
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

CONTRACT_TEMPLATES = [
    {
        "id": "reentrancy-basic",
        "name": "重入攻击基础版",
        "category": "重入攻击",
        "severity": "critical",
        "difficulty": "beginner",
        "description": "经典的DAO式重入漏洞，外部调用后才更新状态，导致攻击者可以重复提取资金。",
        "vulnerability_types": ["Reentrancy"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableWallet {
    mapping(address => uint) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external {
        uint amount = balances[msg.sender];
        require(amount > 0, "No balance");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] = 0;
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }
}""",
        "expected_vulnerabilities": [
            "第15行：使用 call{value:} 发送ETH后才更新状态，存在重入风险"
        ],
        "learning_points": [
            "理解 Checks-Effects-Interactions 模式的重要性",
            "学习使用 ReentrancyGuard 防止重入",
            "了解 pull 支付模式优于 push 支付"
        ],
        "real_world_examples": [
            "The DAO 攻击 (2016) - 导致以太坊分叉",
            "Uniswap V1 重入漏洞"
        ]
    },
    {
        "id": "reentrancy-cross-function",
        "name": "跨函数重入攻击",
        "category": "重入攻击",
        "severity": "critical",
        "difficulty": "intermediate",
        "description": "利用不同函数之间的共享状态，通过一个函数的外部调用影响另一个函数的执行。",
        "vulnerability_types": ["Reentrancy", "Cross-Function"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CrossFunctionReentrancy {
    mapping(address => uint) public balances;
    mapping(address => bool) public isWhitelisted;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }

    function transfer(address to, uint amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }

    function mint(address to, uint amount) external {
        require(isWhitelisted[msg.sender], "Not whitelisted");
        balances[to] += amount;
    }
}""",
        "expected_vulnerabilities": [
            "第15行：withdraw函数中先转账后减余额，存在重入风险",
            "攻击者可在receive/fallback中调用transfer或mint"
        ],
        "learning_points": [
            "跨函数重入的原理和检测方法",
            "使用互斥锁保护所有状态变更函数",
            "状态变更必须在外部调用之前完成"
        ],
        "real_world_examples": [
            "Lendf.Me 攻击 (2020)",
            "BurgerSwap 重入攻击"
        ]
    },
    {
        "id": "integer-overflow-classic",
        "name": "整数溢出经典版",
        "category": "整数漏洞",
        "severity": "critical",
        "difficulty": "beginner",
        "description": "Solidity 0.8之前的整数溢出漏洞，可用于绕过余额检查。",
        "vulnerability_types": ["Integer Overflow"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

contract TokenOverflow {
    mapping(address => uint) public balances;
    uint public totalSupply;

    function mint(uint amount) external {
        balances[msg.sender] += amount;
        totalSupply += amount;
    }

    function transfer(address to, uint amount) external returns (bool) {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function batchTransfer(address[] calldata recipients, uint amount) external returns (bool) {
        uint total = amount * recipients.length;
        require(balances[msg.sender] >= total, "Insufficient balance");
        
        for (uint i = 0; i < recipients.length; i++) {
            balances[msg.sender] -= amount;
            balances[recipients[i]] += amount;
        }
        return true;
    }

    function getBalance(address account) external view returns (uint) {
        return balances[account];
    }
}""",
        "expected_vulnerabilities": [
            "第20行：amount * recipients.length 可能溢出，导致total值很小",
            "绕过余额检查后可以给任意地址转账"
        ],
        "learning_points": [
            "整数溢出/下溢的原理",
            "SafeMath 库的使用方法",
            "Solidity 0.8+ 的默认溢出检查"
        ],
        "real_world_examples": [
            "BeautyChain 溢出攻击 (2018)",
            "BEC 代币溢出漏洞"
        ]
    },
    {
        "id": "access-control-txorigin",
        "name": "tx.origin 权限绕过",
        "category": "访问控制",
        "severity": "high",
        "difficulty": "beginner",
        "description": "使用 tx.origin 进行身份验证，容易受到钓鱼攻击。",
        "vulnerability_types": ["Access Control", "tx.origin"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TxOriginWallet {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(tx.origin == owner, "Not owner");
        _;
    }

    function transferTo(address payable to, uint amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        to.transfer(amount);
    }

    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    receive() external payable {}

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }
}""",
        "expected_vulnerabilities": [
            "第12行：使用 tx.origin 进行权限验证",
            "攻击者可以通过钓鱼合约诱导owner调用，从而执行攻击"
        ],
        "learning_points": [
            "tx.origin 与 msg.sender 的区别",
            "为什么永远不应该用 tx.origin 做身份验证",
            "钓鱼攻击的常见手法"
        ],
        "real_world_examples": [
            "多处 DeFi 协议钓鱼攻击",
            "Thorchain 漏洞相关"
        ]
    },
    {
        "id": "front-running-timestamp",
        "name": "区块时间戳依赖",
        "category": "前置交易/MEV",
        "severity": "medium",
        "difficulty": "intermediate",
        "description": "使用 block.timestamp 作为随机数或关键逻辑，矿工可以操纵结果。",
        "vulnerability_types": ["Block Timestamp", "Front-Running"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimedLottery {
    address public owner;
    uint public ticketPrice = 0.1 ether;
    uint public lotteryEndTime;
    address[] public participants;
    bool public lotteryActive;

    constructor() {
        owner = msg.sender;
        lotteryEndTime = block.timestamp + 7 days;
        lotteryActive = true;
    }

    function buyTicket() external payable {
        require(msg.value == ticketPrice, "Incorrect price");
        require(block.timestamp < lotteryEndTime, "Lottery ended");
        require(lotteryActive, "Not active");
        participants.push(msg.sender);
    }

    function selectWinner() external {
        require(block.timestamp >= lotteryEndTime, "Not ended yet");
        require(lotteryActive, "Already ended");
        require(participants.length > 0, "No participants");

        uint winnerIndex = block.timestamp % participants.length;
        address winner = participants[winnerIndex];
        
        uint prize = address(this).balance;
        payable(winner).transfer(prize);
        
        lotteryActive = false;
    }

    function getParticipantsCount() external view returns (uint) {
        return participants.length;
    }
}""",
        "expected_vulnerabilities": [
            "第30行：使用 block.timestamp 作为随机源",
            "矿工可以选择何时打包交易来影响随机结果"
        ],
        "learning_points": [
            "为什么 block.timestamp 不安全",
            "安全的随机数生成方案 (Chainlink VRF 等)",
            "Commit-Reveal 方案的实现"
        ],
        "real_world_examples": [
            "多处博彩类合约被攻击",
            "Meebits NFT 发行漏洞"
        ]
    },
    {
        "id": "unchecked-send",
        "name": "未检查的外部调用返回值",
        "category": "外部调用",
        "severity": "high",
        "difficulty": "beginner",
        "description": "使用 send() 或 transfer() 但不检查返回值，或使用 call() 不检查 success。",
        "vulnerability_types": ["Unchecked Return", "External Call"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Auction {
    address public beneficiary;
    uint public highestBid;
    address public highestBidder;
    mapping(address => uint) public pendingReturns;

    constructor(address _beneficiary) {
        beneficiary = _beneficiary;
    }

    function bid() external payable {
        require(msg.value > highestBid, "Bid too low");
        
        if (highestBidder != address(0)) {
            pendingReturns[highestBidder] += highestBid;
        }
        
        highestBid = msg.value;
        highestBidder = msg.sender;
    }

    function withdraw() external {
        uint amount = pendingReturns[msg.sender];
        if (amount > 0) {
            pendingReturns[msg.sender] = 0;
            payable(msg.sender).send(amount);
        }
    }

    function auctionEnd() external {
        require(msg.sender == beneficiary, "Not beneficiary");
        payable(beneficiary).transfer(highestBid);
    }
}""",
        "expected_vulnerabilities": [
            "第29行：使用 send() 但未检查返回值",
            "如果接收方是合约且gas不足或回退，资金会永久锁定"
        ],
        "learning_points": [
            "send/transfer/call 的区别和各自的gas限制",
            "正确处理外部调用失败的方式",
            "Pull 模式 vs Push 模式"
        ],
        "real_world_examples": [
            "King of the Ether 事件",
            "多处拍卖合约资金锁定问题"
        ]
    },
    {
        "id": "selfdestruct-vulnerable",
        "name": "强制销毁合约",
        "category": "合约安全",
        "severity": "high",
        "difficulty": "intermediate",
        "description": "不安全的 selfdestruct 使用，或合约依赖余额进行关键逻辑计算。",
        "vulnerability_types": ["Selfdestruct", "Forced Ether"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VulnerableGame {
    address public owner;
    mapping(address => uint) public playerScores;
    address public currentWinner;

    constructor() {
        owner = msg.sender;
    }

    function play() external payable {
        require(msg.value == 0.1 ether, "Pay to play");
        playerScores[msg.sender] += 1;
        
        if (playerScores[msg.sender] > playerScores[currentWinner]) {
            currentWinner = msg.sender;
        }
    }

    function claimPrize() external {
        require(msg.sender == currentWinner, "Not winner");
        require(address(this).balance >= 1 ether, "Prize pool not ready");
        
        uint prize = address(this).balance / 2;
        payable(msg.sender).transfer(prize);
    }

    function emergencyKill() external {
        require(msg.sender == owner, "Not owner");
        selfdestruct(payable(owner));
    }

    receive() external payable {}
}""",
        "expected_vulnerabilities": [
            "第25行：使用 address(this).balance 检查奖池",
            "攻击者可以通过 selfdestruct 强制注入ETH，在未达到条件时领取奖励",
            "第32行：selfdestruct 会永久销毁合约，无反悔机制"
        ],
        "learning_points": [
            "selfdestruct 的强制转账特性",
            "为什么不应该依赖 address(this).balance",
            "使用内部记账变量而非实际余额"
        ],
        "real_world_examples": [
            "Parity 多签钱包自毁事件 (2017)",
            "多处游戏合约被强制注入ETH"
        ]
    },
    {
        "id": "delegatecall-insecure",
        "name": "不安全的 delegatecall",
        "category": "代理/升级",
        "severity": "critical",
        "difficulty": "advanced",
        "description": "使用 delegatecall 调用不可信地址，可能导致存储被覆盖或权限被盗。",
        "vulnerability_types": ["Delegatecall", "Proxy"],
        "source_code": """// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract InsecureDelegatecall {
    address public implementation;
    address public owner;
    uint public value;

    constructor(address _impl) {
        implementation = _impl;
        owner = msg.sender;
    }

    function setImplementation(address _impl) external {
        require(msg.sender == owner, "Not owner");
        implementation = _impl;
    }

    function execute(bytes calldata data) external payable returns (bytes memory) {
        (bool success, bytes memory result) = implementation.delegatecall(data);
        require(success, "Delegatecall failed");
        return result;
    }

    function withdraw() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }
}

contract MaliciousContract {
    address public implementation;
    address public owner;
    uint public value;

    function attack() external {
        owner = msg.sender;
    }
}""",
        "expected_vulnerabilities": [
            "第19行：delegatecall 使用外部传入的 implementation",
            "如果 implementation 被恶意替换，攻击者可以覆盖存储中的 owner 变量",
            "存储布局必须严格匹配，否则会导致意外覆盖"
        ],
        "learning_points": [
            "delegatecall 的工作原理和存储共享机制",
            "代理合约的安全实现模式",
            "透明代理和 UUPS 模式的区别"
        ],
        "real_world_examples": [
            "Parity Wallet Library 被黑 (2017)",
            "多处代理合约实现漏洞"
        ]
    }
]

@router.get("/templates")
async def list_templates(category: str | None = None, severity: str | None = None):
    result = CONTRACT_TEMPLATES
    if category and category != "all":
        result = [t for t in result if t["category"] == category]
    if severity and severity != "all":
        result = [t for t in result if t["severity"] == severity]
    return result

@router.get("/templates/{template_id}")
async def get_template_by_id(template_id: str):
    for t in CONTRACT_TEMPLATES:
        if t["id"] == template_id:
            return t
    raise HTTPException(404, "Template not found")

@router.post("/templates/{template_id}/apply")
async def apply_template(template_id: str):
    for t in CONTRACT_TEMPLATES:
        if t["id"] == template_id:
            return {
                "source_code": t["source_code"],
                "contract_name": t["name"]
            }
    raise HTTPException(404, "Template not found")

@router.post("/false-positive")
async def create_false_positive_feedback(feedback: FalsePositiveFeedbackCreate) -> FalsePositiveFeedback:
    feedback_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    new_feedback = FalsePositiveFeedback(
        id=feedback_id,
        audit_id=feedback.audit_id,
        vulnerability_id=feedback.vulnerability_id,
        vulnerability_name=feedback.vulnerability_name,
        contract_name=feedback.contract_name,
        reason=feedback.reason,
        status=FalsePositiveFeedbackStatus.pending,
        created_at=now
    )
    false_positive_feedbacks[feedback_id] = new_feedback
    return new_feedback

@router.get("/false-positive")
async def list_false_positive_feedbacks(audit_id: str | None = None, contract_name: str | None = None) -> list[FalsePositiveFeedback]:
    result = list(false_positive_feedbacks.values())
    if audit_id:
        result = [f for f in result if f.audit_id == audit_id]
    if contract_name:
        result = [f for f in result if f.contract_name == contract_name]
    return sorted(result, key=lambda f: f.created_at, reverse=True)

@router.get("/false-positive/{feedback_id}")
async def get_false_positive_feedback(feedback_id: str) -> FalsePositiveFeedback:
    if feedback_id not in false_positive_feedbacks:
        raise HTTPException(404, "Feedback not found")
    return false_positive_feedbacks[feedback_id]

@router.put("/false-positive/{feedback_id}/review")
async def review_false_positive_feedback(
    feedback_id: str, 
    status: FalsePositiveFeedbackStatus, 
    feedback_note: str | None = None
) -> FalsePositiveFeedback:
    if feedback_id not in false_positive_feedbacks:
        raise HTTPException(404, "Feedback not found")
    feedback = false_positive_feedbacks[feedback_id]
    feedback.status = status
    feedback.feedback_note = feedback_note
    feedback.reviewed_at = datetime.now().isoformat()
    false_positive_feedbacks[feedback_id] = feedback
    return feedback

@router.get("/task-lists")
async def list_task_lists() -> list[AuditTaskList]:
    return sorted(audit_task_lists.values(), key=lambda x: x.updated_at, reverse=True)

@router.get("/task-lists/{list_id}")
async def get_task_list(list_id: str) -> AuditTaskList:
    if list_id not in audit_task_lists:
        raise HTTPException(404, "Task list not found")
    return audit_task_lists[list_id]

@router.post("/task-lists")
async def create_task_list(req: AuditTaskListCreate) -> AuditTaskList:
    list_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    task_list = AuditTaskList(
        id=list_id,
        contract_name=req.contract_name,
        contract_address=req.contract_address,
        description=req.description,
        tasks=[],
        created_at=now,
        updated_at=now
    )
    audit_task_lists[list_id] = task_list
    return task_list

@router.put("/task-lists/{list_id}")
async def update_task_list(list_id: str, req: AuditTaskListCreate) -> AuditTaskList:
    if list_id not in audit_task_lists:
        raise HTTPException(404, "Task list not found")
    task_list = audit_task_lists[list_id]
    task_list.contract_name = req.contract_name
    task_list.contract_address = req.contract_address
    task_list.description = req.description
    task_list.updated_at = datetime.now().isoformat()
    audit_task_lists[list_id] = task_list
    return task_list

@router.delete("/task-lists/{list_id}")
async def delete_task_list(list_id: str):
    if list_id not in audit_task_lists:
        raise HTTPException(404, "Task list not found")
    del audit_task_lists[list_id]
    return {"message": "Task list deleted"}

@router.post("/task-lists/{list_id}/tasks")
async def add_task_item(list_id: str, req: AuditTaskItemCreate) -> AuditTaskItem:
    if list_id not in audit_task_lists:
        raise HTTPException(404, "Task list not found")
    task_id = str(uuid.uuid4())[:8]
    task_item = AuditTaskItem(
        id=task_id,
        title=req.title,
        description=req.description,
        status=AuditTaskStatus.pending,
        priority=req.priority,
        assignee=req.assignee,
        due_date=req.due_date
    )
    task_list = audit_task_lists[list_id]
    task_list.tasks.append(task_item)
    task_list.updated_at = datetime.now().isoformat()
    audit_task_lists[list_id] = task_list
    return task_item

@router.put("/task-lists/{list_id}/tasks/{task_id}")
async def update_task_item(list_id: str, task_id: str, req: AuditTaskItemUpdate) -> AuditTaskItem:
    if list_id not in audit_task_lists:
        raise HTTPException(404, "Task list not found")
    task_list = audit_task_lists[list_id]
    task_index = next((i for i, t in enumerate(task_list.tasks) if t.id == task_id), -1)
    if task_index == -1:
        raise HTTPException(404, "Task item not found")
    task = task_list.tasks[task_index]
    if req.title is not None:
        task.title = req.title
    if req.description is not None:
        task.description = req.description
    if req.status is not None:
        task.status = req.status
        if req.status == AuditTaskStatus.completed:
            task.completed_at = datetime.now().isoformat()
        else:
            task.completed_at = None
    if req.priority is not None:
        task.priority = req.priority
    if req.assignee is not None:
        task.assignee = req.assignee
    if req.due_date is not None:
        task.due_date = req.due_date
    if req.notes is not None:
        task.notes = req.notes
    task_list.updated_at = datetime.now().isoformat()
    audit_task_lists[list_id] = task_list
    return task

@router.delete("/task-lists/{list_id}/tasks/{task_id}")
async def delete_task_item(list_id: str, task_id: str):
    if list_id not in audit_task_lists:
        raise HTTPException(404, "Task list not found")
    task_list = audit_task_lists[list_id]
    task_list.tasks = [t for t in task_list.tasks if t.id != task_id]
    task_list.updated_at = datetime.now().isoformat()
    audit_task_lists[list_id] = task_list
    return {"message": "Task item deleted"}

def calculate_risk_distribution(vulnerabilities: list) -> RiskDistribution:
    dist = RiskDistribution()
    for v in vulnerabilities:
        sev = v.severity.value if hasattr(v.severity, 'value') else str(v.severity)
        if sev == 'critical':
            dist.critical += 1
        elif sev == 'high':
            dist.high += 1
        elif sev == 'medium':
            dist.medium += 1
        elif sev == 'low':
            dist.low += 1
        else:
            dist.info += 1
    return dist

def get_contract_status(score: float) -> str:
    if score >= 80:
        return 'safe'
    elif score >= 50:
        return 'warning'
    else:
        return 'danger'

@router.get("/dashboard")
async def get_project_dashboard() -> ProjectDashboardData:
    all_contracts = {}
    
    for result in audit_results.values():
        name = result.contract_name
        if name not in all_contracts:
            all_contracts[name] = {
                'latest_result': result,
                'all_vulnerabilities': {},
                'first_found': {}
            }
        else:
            existing = all_contracts[name]['latest_result']
            if result.audited_at > existing.audited_at:
                all_contracts[name]['latest_result'] = result
    
    for contract_name, records in audit_history.items():
        if records:
            sorted_records = sorted(records, key=lambda r: r.audited_at)
            latest = sorted_records[-1]
            if contract_name not in all_contracts:
                all_contracts[contract_name] = {
                    'latest_result': latest,
                    'all_vulnerabilities': {},
                    'first_found': {}
                }
            else:
                existing = all_contracts[contract_name]['latest_result']
                if latest.audited_at > existing.audited_at:
                    all_contracts[contract_name]['latest_result'] = latest
            
            for record in sorted_records:
                for v in record.vulnerabilities:
                    vid = f"{v.name}_{v.line}"
                    if vid not in all_contracts[contract_name]['all_vulnerabilities']:
                        all_contracts[contract_name]['all_vulnerabilities'][vid] = v
                        all_contracts[contract_name]['first_found'][vid] = record.audited_at
    
    completed_tasks = {}
    for task_list in audit_task_lists.values():
        for task in task_list.tasks:
            if task.status == AuditTaskStatus.completed:
                key = f"{task_list.contract_name}_{task.title}"
                completed_tasks[key] = task
    
    contract_summaries = []
    total_vulns = 0
    total_score = 0
    overall_dist = RiskDistribution()
    
    for contract_name, data in all_contracts.items():
        result = data['latest_result']
        risk_dist = calculate_risk_distribution(result.vulnerabilities)
        status = get_contract_status(result.score)
        
        contract_summaries.append(ProjectContractSummary(
            id=str(uuid.uuid4())[:8],
            contract_name=contract_name,
            score=result.score,
            total_vulnerabilities=len(result.vulnerabilities),
            risk_distribution=risk_dist,
            last_audited_at=result.audited_at,
            status=status
        ))
        
        total_vulns += len(result.vulnerabilities)
        total_score += result.score
        overall_dist.critical += risk_dist.critical
        overall_dist.high += risk_dist.high
        overall_dist.medium += risk_dist.medium
        overall_dist.low += risk_dist.low
        overall_dist.info += risk_dist.info
    
    contract_summaries.sort(key=lambda c: c.score)
    
    critical_issues = []
    for contract_name, data in all_contracts.items():
        result = data['latest_result']
        for v in result.vulnerabilities:
            sev = v.severity.value if hasattr(v.severity, 'value') else str(v.severity)
            if sev in ['critical', 'high']:
                vid = f"{v.name}_{v.line}"
                first_found = data['first_found'].get(vid, result.audited_at)
                
                task_key = f"{contract_name}_{v.name}"
                is_fixed = task_key in completed_tasks
                
                critical_issues.append(CriticalIssue(
                    id=str(uuid.uuid4())[:8],
                    name=v.name,
                    severity=v.severity,
                    contract_name=contract_name,
                    description=v.description,
                    line=v.line,
                    first_found_at=first_found,
                    status='fixed' if is_fixed else 'open'
                ))
    
    critical_issues.sort(key=lambda x: (
        0 if (x.severity.value if hasattr(x.severity, 'value') else str(x.severity)) == 'critical' else 1,
        x.first_found_at
    ))
    
    recent_activities = []
    
    for contract_name, records in audit_history.items():
        for record in sorted(records, key=lambda r: r.audited_at, reverse=True)[:2]:
            recent_activities.append({
                'id': str(uuid.uuid4())[:8],
                'type': 'audit',
                'contract_name': contract_name,
                'description': f'完成审计，发现 {len(record.vulnerabilities)} 个漏洞，安全分 {record.score}',
                'created_at': record.audited_at
            })
    
    for feedback in sorted(false_positive_feedbacks.values(), key=lambda f: f.created_at, reverse=True)[:5]:
        recent_activities.append({
            'id': str(uuid.uuid4())[:8],
            'type': 'feedback',
            'contract_name': feedback.contract_name,
            'description': f'提交误报反馈: {feedback.vulnerability_name} ({feedback.status.value if hasattr(feedback.status, "value") else feedback.status})',
            'created_at': feedback.created_at
        })
    
    for task_list in audit_task_lists.values():
        for task in sorted(task_list.tasks, key=lambda t: t.created_at if hasattr(t, 'created_at') else t.completed_at or '', reverse=True)[:2]:
            desc = f'任务: {task.title}'
            if hasattr(task, 'status') and task.status == AuditTaskStatus.completed:
                desc = f'完成修复任务: {task.title}'
                created = task.completed_at or task_list.updated_at
            else:
                created = task_list.updated_at
            recent_activities.append({
                'id': str(uuid.uuid4())[:8],
                'type': 'task' if hasattr(task, 'status') and task.status != AuditTaskStatus.completed else 'fix',
                'contract_name': task_list.contract_name,
                'description': desc,
                'created_at': created
            })
    
    recent_activities.sort(key=lambda a: a['created_at'], reverse=True)
    recent_activities = recent_activities[:10]
    
    recent_activity_objs = [RecentActivity(**a) for a in recent_activities]
    
    avg_score = round(total_score / len(contract_summaries), 2) if contract_summaries else 0
    
    return ProjectDashboardData(
        total_contracts=len(contract_summaries),
        total_vulnerabilities=total_vulns,
        average_score=avg_score,
        risk_distribution=overall_dist,
        contracts=contract_summaries,
        critical_issues=critical_issues,
        recent_activities=recent_activity_objs,
        last_updated=datetime.now().isoformat()
    )

def severity_to_priority(severity: Severity) -> AuditTaskPriority:
    if severity == Severity.critical:
        return AuditTaskPriority.critical
    elif severity == Severity.high:
        return AuditTaskPriority.high
    elif severity == Severity.medium:
        return AuditTaskPriority.medium
    else:
        return AuditTaskPriority.low

@router.post("/remediation-plans")
async def create_remediation_plan(req: RemediationPlanCreate) -> RemediationPlan:
    plan_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    
    audit_results_list = []
    contract_names = []
    
    if req.audit_id and req.audit_id in audit_results:
        result = audit_results[req.audit_id]
        audit_results_list.append(result)
        contract_names.append(result.contract_name)
    elif req.batch_audit_id and req.batch_audit_id in batch_audit_results:
        batch_result = batch_audit_results[req.batch_audit_id]
        audit_results_list = batch_result.results
        contract_names = [r.contract_name for r in batch_result.results]
    else:
        raise HTTPException(404, "Audit not found")
    
    items = []
    for result in audit_results_list:
        for vuln in result.vulnerabilities:
            sev = vuln.severity.value if hasattr(vuln.severity, 'value') else str(vuln.severity)
            item = RemediationItem(
                id=str(uuid.uuid4())[:8],
                vulnerability_id=vuln.id,
                vulnerability_name=vuln.name,
                contract_name=result.contract_name,
                severity=Severity(sev),
                priority=severity_to_priority(Severity(sev)),
                line_number=vuln.line,
                description=vuln.description,
                recommendation=vuln.recommendation,
                status=RemediationStatus.open,
                created_at=now,
                updated_at=now
            )
            items.append(item)
    
    items.sort(key=lambda x: (
        0 if x.severity == Severity.critical else 1 if x.severity == Severity.high else 2 if x.severity == Severity.medium else 3,
        x.line_number
    ))
    
    plan_name = req.plan_name or f"整改计划 - {', '.join(contract_names)}"
    
    plan = RemediationPlan(
        id=plan_id,
        audit_id=req.audit_id,
        batch_audit_id=req.batch_audit_id,
        plan_name=plan_name,
        contract_names=contract_names,
        items=items,
        created_at=now,
        updated_at=now
    )
    
    remediation_plans[plan_id] = plan
    return plan

@router.get("/remediation-plans")
async def list_remediation_plans() -> list[RemediationPlan]:
    return sorted(remediation_plans.values(), key=lambda x: x.updated_at, reverse=True)

@router.get("/remediation-plans/{plan_id}")
async def get_remediation_plan(plan_id: str) -> RemediationPlan:
    if plan_id not in remediation_plans:
        raise HTTPException(404, "Remediation plan not found")
    return remediation_plans[plan_id]

@router.delete("/remediation-plans/{plan_id}")
async def delete_remediation_plan(plan_id: str):
    if plan_id not in remediation_plans:
        raise HTTPException(404, "Remediation plan not found")
    del remediation_plans[plan_id]
    return {"message": "Remediation plan deleted"}

@router.put("/remediation-plans/{plan_id}/items/{item_id}")
async def update_remediation_item(
    plan_id: str, 
    item_id: str, 
    req: RemediationItemUpdate
) -> RemediationItem:
    if plan_id not in remediation_plans:
        raise HTTPException(404, "Remediation plan not found")
    
    plan = remediation_plans[plan_id]
    item_index = next((i for i, item in enumerate(plan.items) if item.id == item_id), -1)
    if item_index == -1:
        raise HTTPException(404, "Remediation item not found")
    
    item = plan.items[item_index]
    now = datetime.now().isoformat()
    
    if req.status is not None:
        item.status = req.status
        if req.status == RemediationStatus.resolved:
            item.resolved_at = now
        elif req.status in [RemediationStatus.recheck_passed, RemediationStatus.recheck_failed]:
            item.rechecked_at = now
    
    if req.assignee is not None:
        item.assignee = req.assignee
    if req.notes is not None:
        item.notes = req.notes
    if req.due_date is not None:
        item.due_date = req.due_date
    if req.recheck_notes is not None:
        item.recheck_notes = req.recheck_notes
    
    item.updated_at = now
    plan.updated_at = now
    remediation_plans[plan_id] = plan
    
    return item

def get_risk_level(score: float) -> str:
    if score >= 80:
        return "低风险"
    elif score >= 60:
        return "中风险"
    elif score >= 40:
        return "高风险"
    else:
        return "极高风险"

def get_estimated_effort(severity: Severity) -> str:
    if severity == Severity.critical:
        return "高（2-4周）"
    elif severity == Severity.high:
        return "中（1-2周）"
    elif severity == Severity.medium:
        return "低（3-5天）"
    else:
        return "极低（1-2天）"

def generate_report_conclusion(
    score: float, 
    vulnerabilities: list, 
    total_contracts: int = 1,
    batch_interpretation = None
) -> ReportConclusion:
    dist = calculate_risk_distribution(vulnerabilities)
    risk_level = get_risk_level(score)
    
    key_findings = []
    if dist.critical > 0:
        key_findings.append(f"发现 {dist.critical} 个严重级别漏洞，需立即处理")
    if dist.high > 0:
        key_findings.append(f"发现 {dist.high} 个高级别漏洞，建议优先修复")
    if dist.medium > 0:
        key_findings.append(f"发现 {dist.medium} 个中级别漏洞，建议规划修复")
    
    if total_contracts > 1:
        summary = f"本次共审计 {total_contracts} 份合约，平均安全分为 {score} 分，整体风险等级为【{risk_level}】。"
    else:
        summary = f"本次审计的合约安全评分为 {score} 分，风险等级为【{risk_level}】。"
    
    if dist.critical > 0 or dist.high > 0:
        summary += f" 存在 {dist.critical + dist.high} 个高危漏洞，建议尽快制定整改计划。"
    else:
        summary += " 未发现高危漏洞，整体安全性良好。"
    
    if batch_interpretation and hasattr(batch_interpretation, 'overall_conclusion'):
        summary = batch_interpretation.overall_conclusion
        if hasattr(batch_interpretation, 'key_findings'):
            key_findings = batch_interpretation.key_findings + key_findings
    
    risk_dist = {
        'critical': dist.critical,
        'high': dist.high,
        'medium': dist.medium,
        'low': dist.low,
        'info': dist.info
    }
    
    return ReportConclusion(
        overall_score=score,
        risk_level=risk_level,
        summary=summary,
        key_findings=key_findings[:5],
        total_contracts=total_contracts,
        total_vulnerabilities=len(vulnerabilities),
        risk_distribution=risk_dist
    )

def generate_report_issues(
    audit_results_list: list,
    common_issues: list | None = None
) -> list[ReportIssue]:
    issues = []
    
    if common_issues:
        for issue in common_issues:
            sev = issue.severity.value if hasattr(issue.severity, 'value') else str(issue.severity)
            report_issue = ReportIssue(
                id=str(uuid.uuid4())[:8],
                name=issue.name,
                severity=Severity(sev),
                contract_name="多个合约",
                line_number=0,
                description=issue.description,
                recommendation=issue.recommendation,
                affected_contracts=issue.affected_contracts,
                occurrence_count=issue.count
            )
            issues.append(report_issue)
    
    for result in audit_results_list:
        for vuln in result.vulnerabilities:
            sev = vuln.severity.value if hasattr(vuln.severity, 'value') else str(vuln.severity)
            report_issue = ReportIssue(
                id=vuln.id,
                name=vuln.name,
                severity=Severity(sev),
                contract_name=result.contract_name,
                line_number=vuln.line,
                description=vuln.description,
                recommendation=vuln.recommendation,
                affected_contracts=[result.contract_name],
                occurrence_count=1
            )
            issues.append(report_issue)
    
    issues.sort(key=lambda x: (
        0 if x.severity == Severity.critical else 1 if x.severity == Severity.high else 2 if x.severity == Severity.medium else 3,
        x.contract_name
    ))
    
    return issues

def generate_remediation_summary(issues: list[ReportIssue]) -> ReportRemediationSummary:
    critical_count = sum(1 for i in issues if i.severity == Severity.critical)
    high_count = sum(1 for i in issues if i.severity == Severity.high)
    medium_count = sum(1 for i in issues if i.severity == Severity.medium)
    low_count = sum(1 for i in issues if i.severity in [Severity.low, Severity.info])
    
    priority_items = []
    for issue in issues:
        if issue.severity in [Severity.critical, Severity.high]:
            priority = "紧急" if issue.severity == Severity.critical else "高优先级"
            item = ReportRemediationItem(
                priority=priority,
                vulnerability_name=issue.name,
                contract_name=issue.contract_name,
                severity=issue.severity,
                recommendation=issue.recommendation,
                estimated_effort=get_estimated_effort(issue.severity)
            )
            priority_items.append(item)
            if len(priority_items) >= 10:
                break
    
    next_steps = []
    if critical_count > 0:
        next_steps.append("立即组织安全团队评估严重漏洞的影响范围")
        next_steps.append("制定紧急修复方案，优先修复严重级别漏洞")
    if high_count > 0:
        next_steps.append("为高级别漏洞制定详细的整改计划")
    if medium_count > 0:
        next_steps.append("将中级别漏洞纳入下一轮迭代修复计划")
    next_steps.append("修复完成后进行回归测试和二次审计")
    next_steps.append("建立定期安全审计机制，预防类似问题复发")
    
    return ReportRemediationSummary(
        total_items=len(issues),
        critical_count=critical_count,
        high_count=high_count,
        medium_count=medium_count,
        low_count=low_count,
        priority_items=priority_items,
        next_steps=next_steps
    )

def generate_audit_report(
    audit_id: str | None = None,
    batch_audit_id: str | None = None,
    include_remediation: bool = True
) -> AuditReport:
    audit_results_list = []
    common_issues = []
    report_type = "single"
    title = ""
    avg_score = 0
    
    if audit_id and audit_id in audit_results:
        result = audit_results[audit_id]
        audit_results_list = [result]
        report_type = "single"
        title = f"智能合约安全审计报告 - {result.contract_name}"
        avg_score = result.score
    elif batch_audit_id and batch_audit_id in batch_audit_results:
        batch_result = batch_audit_results[batch_audit_id]
        audit_results_list = batch_result.results
        common_issues = batch_result.common_issues
        report_type = "batch"
        contract_names = [r.contract_name for r in batch_result.results]
        if len(contract_names) <= 3:
            title = f"智能合约安全审计报告 - {', '.join(contract_names)}"
        else:
            title = f"智能合约安全审计报告 - {len(contract_names)}份合约批量审计"
        avg_score = batch_result.average_score
    else:
        raise HTTPException(404, "Audit not found")
    
    all_vulnerabilities = []
    for r in audit_results_list:
        all_vulnerabilities.extend(r.vulnerabilities)
    
    batch_interpretation = None
    if batch_audit_id and batch_audit_id in batch_audit_results:
        batch_interpretation = batch_audit_results[batch_audit_id].score_interpretation
    
    conclusion = generate_report_conclusion(
        avg_score, 
        all_vulnerabilities, 
        total_contracts=len(audit_results_list),
        batch_interpretation=batch_interpretation
    )
    
    issues = generate_report_issues(audit_results_list, common_issues)
    
    remediation_summary = generate_remediation_summary(issues) if include_remediation else ReportRemediationSummary(
        total_items=0, critical_count=0, high_count=0, medium_count=0, low_count=0,
        priority_items=[], next_steps=[]
    )
    
    report_id = str(uuid.uuid4())[:8]
    report = AuditReport(
        id=report_id,
        report_type=report_type,
        title=title,
        generated_at=datetime.now().isoformat(),
        conclusion=conclusion,
        issues=issues,
        remediation_summary=remediation_summary
    )
    
    audit_reports[report_id] = report
    return report

def generate_markdown_report(report: AuditReport) -> str:
    md = []
    md.append(f"# {report.title}")
    md.append("")
    md.append(f"**生成时间：** {report.generated_at}")
    md.append(f"**报告类型：** {'批量审计' if report.report_type == 'batch' else '单合约审计'}")
    md.append("")
    
    md.append("## 一、审计结论")
    md.append("")
    md.append(f"**安全评分：** {report.conclusion.overall_score} / 100")
    md.append(f"**风险等级：** {report.conclusion.risk_level}")
    md.append(f"**审计合约数量：** {report.conclusion.total_contracts} 份")
    md.append(f"**发现问题总数：** {report.conclusion.total_vulnerabilities} 个")
    md.append("")
    
    md.append("### 风险分布")
    md.append("")
    md.append("| 严重级别 | 数量 |")
    md.append("|----------|------|")
    for sev, count in report.conclusion.risk_distribution.items():
        md.append(f"| {sev} | {count} |")
    md.append("")
    
    md.append("### 总结")
    md.append("")
    md.append(report.conclusion.summary)
    md.append("")
    
    if report.conclusion.key_findings:
        md.append("### 关键发现")
        md.append("")
        for finding in report.conclusion.key_findings:
            md.append(f"- {finding}")
        md.append("")
    
    md.append("## 二、问题详细列表")
    md.append("")
    
    current_severity = None
    for issue in report.issues:
        sev_label = issue.severity.value if hasattr(issue.severity, 'value') else str(issue.severity)
        sev_upper = sev_label.upper()
        if sev_upper != current_severity:
            current_severity = sev_upper
            md.append(f"### {sev_upper} 级别")
            md.append("")
        
        md.append(f"#### {issue.name}")
        md.append("")
        md.append(f"- **合约：** {issue.contract_name}")
        if issue.line_number > 0:
            md.append(f"- **位置：** 第 {issue.line_number} 行")
        if issue.occurrence_count and issue.occurrence_count > 1:
            md.append(f"- **出现次数：** {issue.occurrence_count} 次")
        if issue.affected_contracts and len(issue.affected_contracts) > 1:
            md.append(f"- **影响合约：** {', '.join(issue.affected_contracts)}")
        md.append("")
        md.append("**问题描述：**")
        md.append(issue.description)
        md.append("")
        md.append("**修复建议：**")
        md.append(issue.recommendation)
        md.append("")
    
    if report.remediation_summary and report.remediation_summary.total_items > 0:
        md.append("## 三、整改摘要")
        md.append("")
        
        md.append("### 整改概览")
        md.append("")
        md.append(f"- **整改项总数：** {report.remediation_summary.total_items}")
        md.append(f"- **严重级别：** {report.remediation_summary.critical_count} 个")
        md.append(f"- **高级别：** {report.remediation_summary.high_count} 个")
        md.append(f"- **中级别：** {report.remediation_summary.medium_count} 个")
        md.append(f"- **低级别：** {report.remediation_summary.low_count} 个")
        md.append("")
        
        if report.remediation_summary.priority_items:
            md.append("### 重点整改项")
            md.append("")
            md.append("| 优先级 | 漏洞名称 | 合约 | 严重级别 | 预计工作量 |")
            md.append("|--------|----------|------|----------|------------|")
            for item in report.remediation_summary.priority_items:
                sev = item.severity.value if hasattr(item.severity, 'value') else str(item.severity)
                md.append(f"| {item.priority} | {item.vulnerability_name} | {item.contract_name} | {sev} | {item.estimated_effort} |")
            md.append("")
            
            md.append("### 整改建议详情")
            md.append("")
            for i, item in enumerate(report.remediation_summary.priority_items, 1):
                md.append(f"**{i}. {item.vulnerability_name}**")
                md.append("")
                md.append(f"- 优先级：{item.priority}")
                md.append(f"- 合约：{item.contract_name}")
                md.append(f"- 预计工作量：{item.estimated_effort}")
                md.append(f"- 建议：{item.recommendation}")
                md.append("")
        
        if report.remediation_summary.next_steps:
            md.append("### 后续步骤")
            md.append("")
            for step in report.remediation_summary.next_steps:
                md.append(f"1. {step}")
            md.append("")
    
    md.append("---")
    md.append("*本报告由智能合约安全审计系统自动生成*")
    
    return "\n".join(md)

@router.post("/report/generate")
async def generate_report(req: AuditReportExportRequest) -> AuditReport:
    return generate_audit_report(
        audit_id=req.audit_id,
        batch_audit_id=req.batch_audit_id,
        include_remediation=req.include_remediation
    )

@router.post("/report/export")
async def export_report(req: AuditReportExportRequest):
    from fastapi.responses import Response
    import io
    
    report = generate_audit_report(
        audit_id=req.audit_id,
        batch_audit_id=req.batch_audit_id,
        include_remediation=req.include_remediation
    )
    
    if req.format == "markdown":
        content = generate_markdown_report(report)
        filename = f"audit_report_{report.id}.md"
        media_type = "text/markdown"
    elif req.format == "json":
        import json
        content = json.dumps(report.model_dump(), ensure_ascii=False, indent=2)
        filename = f"audit_report_{report.id}.json"
        media_type = "application/json"
    else:
        raise HTTPException(400, "Unsupported format. Use 'markdown' or 'json'.")
    
    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

@router.get("/report/{report_id}")
async def get_report(report_id: str) -> AuditReport:
    if report_id not in audit_reports:
        raise HTTPException(404, "Report not found")
    return audit_reports[report_id]

@router.get("/reports")
async def list_reports() -> list[AuditReport]:
    return sorted(audit_reports.values(), key=lambda r: r.generated_at, reverse=True)

@router.post("/family-analysis")
async def family_analysis(req: BatchAuditRequest) -> ContractFamilyAnalysisResult:
    if not analyze_contract_family:
        raise HTTPException(500, "Family analysis not available")
    return analyze_contract_family(req.contracts)

@router.post("/migration-assessment")
async def migration_assessment(req: VersionMigrationAssessmentRequest) -> VersionMigrationAssessmentResult:
    if not assess_version_migration:
        raise HTTPException(500, "Migration assessment not available")
    result = assess_version_migration(req.old_source_code, req.new_source_code, req.contract_name)
    migration_assessments[result.id] = result
    return result

@router.get("/migration-assessment/{assessment_id}")
async def get_migration_assessment(assessment_id: str) -> VersionMigrationAssessmentResult:
    if assessment_id not in migration_assessments:
        raise HTTPException(404, "Migration assessment not found")
    return migration_assessments[assessment_id]

@router.get("/migration-assessments")
async def list_migration_assessments() -> list[VersionMigrationAssessmentResult]:
    return sorted(migration_assessments.values(), key=lambda x: x.assessed_at, reverse=True)

@router.get("/subscriptions")
async def list_subscriptions() -> list[RiskSubscription]:
    return sorted(risk_subscriptions.values(), key=lambda x: x.updated_at, reverse=True)

@router.post("/subscriptions")
async def create_subscription(req: RiskSubscriptionCreate) -> RiskSubscription:
    sub_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    sub = RiskSubscription(
        id=sub_id,
        name=req.name,
        risk_pattern=req.risk_pattern,
        severity=req.severity,
        description=req.description,
        enabled=req.enabled,
        notify_on_change=req.notify_on_change,
        created_at=now,
        updated_at=now
    )
    risk_subscriptions[sub_id] = sub
    return sub

@router.get("/subscriptions/{sub_id}")
async def get_subscription(sub_id: str) -> RiskSubscription:
    if sub_id not in risk_subscriptions:
        raise HTTPException(404, "Subscription not found")
    return risk_subscriptions[sub_id]

@router.put("/subscriptions/{sub_id}")
async def update_subscription(sub_id: str, req: RiskSubscriptionCreate) -> RiskSubscription:
    if sub_id not in risk_subscriptions:
        raise HTTPException(404, "Subscription not found")
    existing = risk_subscriptions[sub_id]
    updated = RiskSubscription(
        id=sub_id,
        name=req.name,
        risk_pattern=req.risk_pattern,
        severity=req.severity,
        description=req.description,
        enabled=req.enabled,
        notify_on_change=req.notify_on_change,
        created_at=existing.created_at,
        updated_at=datetime.now().isoformat()
    )
    risk_subscriptions[sub_id] = updated
    return updated

@router.delete("/subscriptions/{sub_id}")
async def delete_subscription(sub_id: str):
    if sub_id not in risk_subscriptions:
        raise HTTPException(404, "Subscription not found")
    del risk_subscriptions[sub_id]
    return {"message": "Subscription deleted"}

@router.get("/subscriptions/{sub_id}/matches")
async def get_subscription_matches(sub_id: str) -> list[SubscriptionMatch]:
    if sub_id not in risk_subscriptions:
        raise HTTPException(404, "Subscription not found")
    sub = risk_subscriptions[sub_id]
    matches = []
    pattern_lower = sub.risk_pattern.lower()
    for result in audit_results.values():
        for vuln in result.vulnerabilities:
            vuln_name_lower = vuln.name.lower()
            vuln_desc_lower = vuln.description.lower()
            if pattern_lower in vuln_name_lower or pattern_lower in vuln_desc_lower:
                matches.append(SubscriptionMatch(
                    contract_name=result.contract_name,
                    vulnerability_name=vuln.name,
                    severity=vuln.severity,
                    line=vuln.line,
                    description=vuln.description,
                    audited_at=result.audited_at,
                    score=result.score
                ))
    for batch_result in batch_audit_results.values():
        for result in batch_result.results:
            for vuln in result.vulnerabilities:
                vuln_name_lower = vuln.name.lower()
                vuln_desc_lower = vuln.description.lower()
                if pattern_lower in vuln_name_lower or pattern_lower in vuln_desc_lower:
                    existing = any(
                        m.contract_name == result.contract_name and m.vulnerability_name == vuln.name and m.line == vuln.line
                        for m in matches
                    )
                    if not existing:
                        matches.append(SubscriptionMatch(
                            contract_name=result.contract_name,
                            vulnerability_name=vuln.name,
                            severity=vuln.severity,
                            line=vuln.line,
                            description=vuln.description,
                            audited_at=result.audited_at,
                            score=result.score
                        ))
    matches.sort(key=lambda m: m.audited_at, reverse=True)
    return matches

@router.get("/subscriptions/{sub_id}/trend")
async def get_subscription_trend(sub_id: str) -> list[SubscriptionTrendDataPoint]:
    if sub_id not in risk_subscriptions:
        raise HTTPException(404, "Subscription not found")
    sub = risk_subscriptions[sub_id]
    pattern_lower = sub.risk_pattern.lower()
    date_data = {}
    all_records = []
    for contract_name, records in audit_history.items():
        all_records.extend(records)
    for record in all_records:
        match_count = 0
        for vuln in record.vulnerabilities:
            vuln_name_lower = vuln.name.lower()
            vuln_desc_lower = vuln.description.lower()
            if pattern_lower in vuln_name_lower or pattern_lower in vuln_desc_lower:
                match_count += 1
        date_key = record.audited_at[:10]
        if date_key not in date_data:
            date_data[date_key] = {'match_count': 0, 'total_audited': 0, 'total_score': 0.0}
        date_data[date_key]['match_count'] += match_count
        date_data[date_key]['total_audited'] += 1
        date_data[date_key]['total_score'] += record.score
    trend = []
    for date_key in sorted(date_data.keys()):
        data = date_data[date_key]
        avg_score = round(data['total_score'] / data['total_audited'], 2) if data['total_audited'] > 0 else 0
        trend.append(SubscriptionTrendDataPoint(
            date=date_key,
            match_count=data['match_count'],
            total_audited=data['total_audited'],
            avg_score=avg_score
        ))
    return trend

@router.get("/subscriptions/dashboard")
async def get_subscriptions_dashboard() -> list[SubscriptionDashboard]:
    dashboards = []
    for sub in risk_subscriptions.values():
        if not sub.enabled:
            continue
        pattern_lower = sub.risk_pattern.lower()
        matches = []
        for result in audit_results.values():
            for vuln in result.vulnerabilities:
                vuln_name_lower = vuln.name.lower()
                vuln_desc_lower = vuln.description.lower()
                if pattern_lower in vuln_name_lower or pattern_lower in vuln_desc_lower:
                    matches.append(SubscriptionMatch(
                        contract_name=result.contract_name,
                        vulnerability_name=vuln.name,
                        severity=vuln.severity,
                        line=vuln.line,
                        description=vuln.description,
                        audited_at=result.audited_at,
                        score=result.score
                    ))
        for batch_result in batch_audit_results.values():
            for result in batch_result.results:
                for vuln in result.vulnerabilities:
                    vuln_name_lower = vuln.name.lower()
                    vuln_desc_lower = vuln.description.lower()
                    if pattern_lower in vuln_name_lower or pattern_lower in vuln_desc_lower:
                        existing = any(
                            m.contract_name == result.contract_name and m.vulnerability_name == vuln.name and m.line == vuln.line
                            for m in matches
                        )
                        if not existing:
                            matches.append(SubscriptionMatch(
                                contract_name=result.contract_name,
                                vulnerability_name=vuln.name,
                                severity=vuln.severity,
                                line=vuln.line,
                                description=vuln.description,
                                audited_at=result.audited_at,
                                score=result.score
                            ))
        matches.sort(key=lambda m: m.audited_at, reverse=True)
        date_data = {}
        all_records = []
        for contract_name, records in audit_history.items():
            all_records.extend(records)
        for record in all_records:
            match_count = 0
            for vuln in record.vulnerabilities:
                vuln_name_lower = vuln.name.lower()
                vuln_desc_lower = vuln.description.lower()
                if pattern_lower in vuln_name_lower or pattern_lower in vuln_desc_lower:
                    match_count += 1
            date_key = record.audited_at[:10]
            if date_key not in date_data:
                date_data[date_key] = {'match_count': 0, 'total_audited': 0, 'total_score': 0.0}
            date_data[date_key]['match_count'] += match_count
            date_data[date_key]['total_audited'] += 1
            date_data[date_key]['total_score'] += record.score
        trend = []
        for date_key in sorted(date_data.keys()):
            data = date_data[date_key]
            avg_score = round(data['total_score'] / data['total_audited'], 2) if data['total_audited'] > 0 else 0
            trend.append(SubscriptionTrendDataPoint(
                date=date_key,
                match_count=data['match_count'],
                total_audited=data['total_audited'],
                avg_score=avg_score
            ))
        trend_direction = "stable"
        if len(trend) >= 2:
            recent = trend[-1].match_count
            earlier = trend[0].match_count
            if recent > earlier:
                trend_direction = "increasing"
            elif recent < earlier:
                trend_direction = "decreasing"
        latest_match_at = matches[0].audited_at if matches else None
        dashboards.append(SubscriptionDashboard(
            subscription=sub,
            matches=matches[:20],
            total_matches=len(matches),
            trend=trend[-30:] if trend else [],
            trend_direction=trend_direction,
            latest_match_at=latest_match_at
        ))
    dashboards.sort(key=lambda d: d.subscription.updated_at, reverse=True)
    return dashboards
