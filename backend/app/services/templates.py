from ..models.contract import ContractTemplate, Severity

TEMPLATES = [
    {
        "id": "reentrancy-basic",
        "name": "重入攻击基础版",
        "category": "重入攻击",
        "severity": Severity.critical,
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
        "severity": Severity.critical,
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
        "severity": Severity.critical,
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
        "severity": Severity.high,
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
        "severity": Severity.medium,
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
        "severity": Severity.high,
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
        "severity": Severity.high,
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
        "severity": Severity.critical,
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
];

def get_all_templates() -> list[ContractTemplate]:
    return [ContractTemplate(**t) for t in TEMPLATES]

def get_template(template_id: str) -> ContractTemplate | None:
    for t in TEMPLATES:
        if t["id"] == template_id:
            return ContractTemplate(**t)
    return None

def get_templates_by_category(category: str) -> list[ContractTemplate]:
    return [ContractTemplate(**t) for t in TEMPLATES if t["category"] == category]

def get_templates_by_severity(severity: Severity) -> list[ContractTemplate]:
    return [ContractTemplate(**t) for t in TEMPLATES if t["severity"] == severity]
