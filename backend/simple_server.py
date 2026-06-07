#!/usr/bin/env python3
import json
import re
import uuid
import hashlib
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

CORS_ORIGINS = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177", "http://localhost:5178", "http://localhost:5179", "http://localhost:5180", "http://localhost:5181", "http://localhost:5182"]

PATTERNS = [
    {"name": "Reentrancy", "severity": "critical", "pattern": r"\.call\{value:",
     "description": "External call with value - potential reentrancy", "recommendation": "Use checks-effects-interactions pattern"},
    {"name": "Unchecked Return", "severity": "high", "pattern": r"\.(send|transfer)\(",
     "description": "Unchecked return from send/transfer", "recommendation": "Use call() with error handling"},
    {"name": "tx.origin Auth", "severity": "high", "pattern": r"tx\.origin",
     "description": "tx.origin for auth - phishing vulnerable", "recommendation": "Use msg.sender instead"},
    {"name": "Block Timestamp", "severity": "medium", "pattern": r"block\.timestamp",
     "description": "block.timestamp in logic - miner manipulable", "recommendation": "Avoid for critical logic"},
    {"name": "Selfdestruct", "severity": "medium", "pattern": r"selfdestruct|suicide",
     "description": "Irreversible selfdestruct", "recommendation": "Use withdrawal pattern"},
    {"name": "Inline Assembly", "severity": "low", "pattern": r"assembly\s*\{",
     "description": "Inline assembly - harder to audit", "recommendation": "Minimize usage"},
]

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

audit_results = {}
batch_audit_results = {}
custom_rules = {}
audit_history = {}
contract_version_counter = {}

def analyze_contract(source_code, contract_name):
    vulns = []
    lines = source_code.split("\n")
    all_patterns = list(PATTERNS)
    for rule in custom_rules.values():
        if rule.get("enabled", True):
            all_patterns.append({
                "name": rule["name"],
                "severity": rule["severity"],
                "pattern": rule["pattern"],
                "description": rule["description"],
                "recommendation": rule["recommendation"],
            })
    for pi in all_patterns:
        for i, line in enumerate(lines, 1):
            try:
                if re.search(pi["pattern"], line, re.IGNORECASE):
                    vulns.append({
                        "id": str(uuid.uuid4())[:8],
                        "name": pi["name"],
                        "severity": pi["severity"],
                        "line": i,
                        "description": pi["description"],
                        "recommendation": pi["recommendation"],
                        "pattern": pi["pattern"]
                    })
            except re.error:
                continue
    penalty = {"critical": 25, "high": 15, "medium": 8, "low": 3, "info": 1}
    score = max(0, 100 - sum(penalty.get(v["severity"], 0) for v in vulns))
    return {
        "id": str(uuid.uuid4()),
        "contract_name": contract_name,
        "vulnerabilities": vulns,
        "score": score,
        "total_lines": len(lines),
        "audited_at": datetime.now().isoformat()
    }

def archive_audit_result(result, source_code):
    source_hash = hashlib.md5(source_code.encode()).hexdigest()
    contract_name = result["contract_name"]
    if contract_name not in contract_version_counter:
        contract_version_counter[contract_name] = 0
    contract_version_counter[contract_name] += 1
    history_record = {
        "id": result["id"],
        "contract_name": contract_name,
        "score": result["score"],
        "vulnerabilities": result["vulnerabilities"],
        "audited_at": result["audited_at"],
        "version": contract_version_counter[contract_name],
        "source_code_hash": source_hash
    }
    if contract_name not in audit_history:
        audit_history[contract_name] = []
    audit_history[contract_name].append(history_record)

class RequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-type", content_type)
        origin = self.headers.get("Origin", "")
        if origin in CORS_ORIGINS or True:
            self.send_header("Access-Control-Allow-Origin", origin if origin else "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers()
        self.wfile.write(b"")

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        params = parse_qs(parsed.query)

        if path == "/api/health":
            self._set_headers()
            self.wfile.write(json.dumps({"status": "ok", "service": "Smart Contract Auditor"}).encode())
            return

        if path.startswith("/api/audit/templates"):
            if path == "/api/audit/templates":
                category = params.get("category", [None])[0]
                severity = params.get("severity", [None])[0]
                result = CONTRACT_TEMPLATES
                if category and category != "all":
                    result = [t for t in result if t["category"] == category]
                if severity and severity != "all":
                    result = [t for t in result if t["severity"] == severity]
                self._set_headers()
                self.wfile.write(json.dumps(result).encode())
                return
            template_id = path.split("/")[-1]
            for t in CONTRACT_TEMPLATES:
                if t["id"] == template_id:
                    self._set_headers()
                    self.wfile.write(json.dumps(t).encode())
                    return
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Template not found"}).encode())
            return

        if path == "/api/audit/rules":
            self._set_headers()
            self.wfile.write(json.dumps(list(custom_rules.values())).encode())
            return

        if path == "/api/audit":
            self._set_headers()
            self.wfile.write(json.dumps([
                {"id": r["id"], "contract_name": r["contract_name"], "score": r["score"],
                 "vuln_count": len(r["vulnerabilities"])}
                for r in audit_results.values()
            ]).encode())
            return

        if path.startswith("/api/audit/"):
            audit_id = path.split("/")[-1]
            if audit_id in audit_results:
                self._set_headers()
                self.wfile.write(json.dumps(audit_results[audit_id]).encode())
                return
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode())
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        if path == "/api/audit":
            result = analyze_contract(data.get("source_code", ""), data.get("contract_name", "Contract"))
            audit_results[result["id"]] = result
            archive_audit_result(result, data.get("source_code", ""))
            self._set_headers()
            self.wfile.write(json.dumps(result).encode())
            return

        if path == "/api/audit/batch":
            contracts = data.get("contracts", [])
            results = [analyze_contract(c.get("source_code", ""), c.get("contract_name", "Contract")) for c in contracts]
            severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
            risk_ranking = sorted(results, key=lambda r: (r["score"], -len([v for v in r["vulnerabilities"] if v["severity"] == "critical"])))
            
            issue_map = {}
            for r in results:
                seen_in_contract = set()
                for v in r["vulnerabilities"]:
                    key = v["name"]
                    if key not in seen_in_contract:
                        if key not in issue_map:
                            issue_map[key] = {"count": 0, "contracts": set(), "description": "", "recommendation": "", "severity": "low"}
                        issue_map[key]["count"] += 1
                        seen_in_contract.add(key)
                    issue_map[key]["contracts"].add(r["contract_name"])
                    issue_map[key]["description"] = v["description"]
                    issue_map[key]["recommendation"] = v["recommendation"]
                    issue_map[key]["severity"] = v["severity"]
            
            common_issues = []
            for name, issue_data in issue_map.items():
                if len(issue_data["contracts"]) >= 2:
                    common_issues.append({
                        "name": name,
                        "severity": issue_data["severity"],
                        "count": issue_data["count"],
                        "description": issue_data["description"],
                        "recommendation": issue_data["recommendation"],
                        "affected_contracts": list(issue_data["contracts"])
                    })
            common_issues.sort(key=lambda x: (severity_order.get(x["severity"], 5), -x["count"]))
            
            total_vulns = sum(len(r["vulnerabilities"]) for r in results)
            avg_score = sum(r["score"] for r in results) / len(results) if results else 0
            
            batch_result = {
                "id": str(uuid.uuid4()),
                "results": results,
                "risk_ranking": risk_ranking,
                "common_issues": common_issues,
                "total_contracts": len(results),
                "total_vulnerabilities": total_vulns,
                "average_score": round(avg_score, 2),
                "audited_at": datetime.now().isoformat()
            }
            batch_audit_results[batch_result["id"]] = batch_result
            for i, audit_res in enumerate(results):
                archive_audit_result(audit_res, contracts[i].get("source_code", ""))
            self._set_headers()
            self.wfile.write(json.dumps(batch_result).encode())
            return

        if path.startswith("/api/audit/templates/") and path.endswith("/apply"):
            template_id = path.split("/")[-2]
            for t in CONTRACT_TEMPLATES:
                if t["id"] == template_id:
                    self._set_headers()
                    self.wfile.write(json.dumps({
                        "source_code": t["source_code"],
                        "contract_name": t["name"]
                    }).encode())
                    return
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Template not found"}).encode())
            return

        if path == "/api/audit/rules":
            rule_id = str(uuid.uuid4())[:8]
            new_rule = {
                "id": rule_id,
                "name": data.get("name", ""),
                "severity": data.get("severity", "low"),
                "pattern": data.get("pattern", ""),
                "description": data.get("description", ""),
                "recommendation": data.get("recommendation", ""),
                "enabled": data.get("enabled", True)
            }
            custom_rules[rule_id] = new_rule
            self._set_headers()
            self.wfile.write(json.dumps(new_rule).encode())
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        try:
            data = json.loads(body) if body else {}
        except:
            data = {}

        if path.startswith("/api/audit/rules/"):
            rule_id = path.split("/")[-1]
            if rule_id not in custom_rules:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Rule not found"}).encode())
                return
            updated_rule = {
                "id": rule_id,
                "name": data.get("name", custom_rules[rule_id]["name"]),
                "severity": data.get("severity", custom_rules[rule_id]["severity"]),
                "pattern": data.get("pattern", custom_rules[rule_id]["pattern"]),
                "description": data.get("description", custom_rules[rule_id]["description"]),
                "recommendation": data.get("recommendation", custom_rules[rule_id]["recommendation"]),
                "enabled": data.get("enabled", custom_rules[rule_id].get("enabled", True))
            }
            custom_rules[rule_id] = updated_rule
            self._set_headers()
            self.wfile.write(json.dumps(updated_rule).encode())
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/audit/rules/"):
            rule_id = path.split("/")[-1]
            if rule_id not in custom_rules:
                self._set_headers(404)
                self.wfile.write(json.dumps({"error": "Rule not found"}).encode())
                return
            del custom_rules[rule_id]
            self._set_headers()
            self.wfile.write(json.dumps({"message": "Rule deleted"}).encode())
            return

        self._set_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8000):
    server_address = ("", port)
    httpd = HTTPServer(server_address, RequestHandler)
    print(f"Starting server on port {port}...")
    print(f"API available at http://localhost:{port}/api")
    print(f"Templates API: http://localhost:{port}/api/audit/templates")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
