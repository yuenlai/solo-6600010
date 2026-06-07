import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../store/audit';
import { ContractTemplate } from '../types';
import axios from 'axios';

const FALLBACK_TEMPLATES: ContractTemplate[] = [
  {
    id: "reentrancy-basic",
    name: "重入攻击基础版",
    category: "重入攻击",
    severity: "critical",
    difficulty: "beginner",
    description: "经典的DAO式重入漏洞，外部调用后才更新状态，导致攻击者可以重复提取资金。",
    vulnerability_types: ["Reentrancy"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第15行：使用 call{value:} 发送ETH后才更新状态，存在重入风险"
    ],
    learning_points: [
      "理解 Checks-Effects-Interactions 模式的重要性",
      "学习使用 ReentrancyGuard 防止重入",
      "了解 pull 支付模式优于 push 支付"
    ],
    real_world_examples: [
      "The DAO 攻击 (2016) - 导致以太坊分叉",
      "Uniswap V1 重入漏洞"
    ]
  },
  {
    id: "reentrancy-cross-function",
    name: "跨函数重入攻击",
    category: "重入攻击",
    severity: "critical",
    difficulty: "intermediate",
    description: "利用不同函数之间的共享状态，通过一个函数的外部调用影响另一个函数的执行。",
    vulnerability_types: ["Reentrancy", "Cross-Function"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第15行：withdraw函数中先转账后减余额，存在重入风险",
      "攻击者可在receive/fallback中调用transfer或mint"
    ],
    learning_points: [
      "跨函数重入的原理和检测方法",
      "使用互斥锁保护所有状态变更函数",
      "状态变更必须在外部调用之前完成"
    ],
    real_world_examples: [
      "Lendf.Me 攻击 (2020)",
      "BurgerSwap 重入攻击"
    ]
  },
  {
    id: "integer-overflow-classic",
    name: "整数溢出经典版",
    category: "整数漏洞",
    severity: "critical",
    difficulty: "beginner",
    description: "Solidity 0.8之前的整数溢出漏洞，可用于绕过余额检查。",
    vulnerability_types: ["Integer Overflow"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第20行：amount * recipients.length 可能溢出，导致total值很小",
      "绕过余额检查后可以给任意地址转账"
    ],
    learning_points: [
      "整数溢出/下溢的原理",
      "SafeMath 库的使用方法",
      "Solidity 0.8+ 的默认溢出检查"
    ],
    real_world_examples: [
      "BeautyChain 溢出攻击 (2018)",
      "BEC 代币溢出漏洞"
    ]
  },
  {
    id: "access-control-txorigin",
    name: "tx.origin 权限绕过",
    category: "访问控制",
    severity: "high",
    difficulty: "beginner",
    description: "使用 tx.origin 进行身份验证，容易受到钓鱼攻击。",
    vulnerability_types: ["Access Control", "tx.origin"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第12行：使用 tx.origin 进行权限验证",
      "攻击者可以通过钓鱼合约诱导owner调用，从而执行攻击"
    ],
    learning_points: [
      "tx.origin 与 msg.sender 的区别",
      "为什么永远不应该用 tx.origin 做身份验证",
      "钓鱼攻击的常见手法"
    ],
    real_world_examples: [
      "多处 DeFi 协议钓鱼攻击",
      "Thorchain 漏洞相关"
    ]
  },
  {
    id: "front-running-timestamp",
    name: "区块时间戳依赖",
    category: "前置交易/MEV",
    severity: "medium",
    difficulty: "intermediate",
    description: "使用 block.timestamp 作为随机数或关键逻辑，矿工可以操纵结果。",
    vulnerability_types: ["Block Timestamp", "Front-Running"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第30行：使用 block.timestamp 作为随机源",
      "矿工可以选择何时打包交易来影响随机结果"
    ],
    learning_points: [
      "为什么 block.timestamp 不安全",
      "安全的随机数生成方案 (Chainlink VRF 等)",
      "Commit-Reveal 方案的实现"
    ],
    real_world_examples: [
      "多处博彩类合约被攻击",
      "Meebits NFT 发行漏洞"
    ]
  },
  {
    id: "unchecked-send",
    name: "未检查的外部调用返回值",
    category: "外部调用",
    severity: "high",
    difficulty: "beginner",
    description: "使用 send() 或 transfer() 但不检查返回值，或使用 call() 不检查 success。",
    vulnerability_types: ["Unchecked Return", "External Call"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第29行：使用 send() 但未检查返回值",
      "如果接收方是合约且gas不足或回退，资金会永久锁定"
    ],
    learning_points: [
      "send/transfer/call 的区别和各自的gas限制",
      "正确处理外部调用失败的方式",
      "Pull 模式 vs Push 模式"
    ],
    real_world_examples: [
      "King of the Ether 事件",
      "多处拍卖合约资金锁定问题"
    ]
  },
  {
    id: "selfdestruct-vulnerable",
    name: "强制销毁合约",
    category: "合约安全",
    severity: "high",
    difficulty: "intermediate",
    description: "不安全的 selfdestruct 使用，或合约依赖余额进行关键逻辑计算。",
    vulnerability_types: ["Selfdestruct", "Forced Ether"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第25行：使用 address(this).balance 检查奖池",
      "攻击者可以通过 selfdestruct 强制注入ETH，在未达到条件时领取奖励",
      "第32行：selfdestruct 会永久销毁合约，无反悔机制"
    ],
    learning_points: [
      "selfdestruct 的强制转账特性",
      "为什么不应该依赖 address(this).balance",
      "使用内部记账变量而非实际余额"
    ],
    real_world_examples: [
      "Parity 多签钱包自毁事件 (2017)",
      "多处游戏合约被强制注入ETH"
    ]
  },
  {
    id: "delegatecall-insecure",
    name: "不安全的 delegatecall",
    category: "代理/升级",
    severity: "critical",
    difficulty: "advanced",
    description: "使用 delegatecall 调用不可信地址，可能导致存储被覆盖或权限被盗。",
    vulnerability_types: ["Delegatecall", "Proxy"],
    source_code: `// SPDX-License-Identifier: MIT
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
}`,
    expected_vulnerabilities: [
      "第19行：delegatecall 使用外部传入的 implementation",
      "如果 implementation 被恶意替换，攻击者可以覆盖存储中的 owner 变量",
      "存储布局必须严格匹配，否则会导致意外覆盖"
    ],
    learning_points: [
      "delegatecall 的工作原理和存储共享机制",
      "代理合约的安全实现模式",
      "透明代理和 UUPS 模式的区别"
    ],
    real_world_examples: [
      "Parity Wallet Library 被黑 (2017)",
      "多处代理合约实现漏洞"
    ]
  }
];

const severityColors: Record<string, string> = {
  critical: '#ff4d4f',
  high: '#ff7a45',
  medium: '#faad14',
};

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
};

const difficultyColors: Record<string, string> = {
  beginner: '#52c41a',
  intermediate: '#faad14',
  advanced: '#ff4d4f',
};

export const ContractTemplateLibrary: React.FC = () => {
  const { 
    showTemplateLibrary, 
    setShowTemplateLibrary, 
    contractTemplates, 
    setContractTemplates,
    setSourceCode,
    mode,
    updateBatchContract,
    batchContracts,
    setResult,
    setBatchResult,
  } = useAuditStore();
  
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyTarget, setApplyTarget] = useState<string>('');

  useEffect(() => {
    if (showTemplateLibrary && contractTemplates.length === 0) {
      loadTemplates();
    }
  }, [showTemplateLibrary]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/audit/templates');
      setContractTemplates(data);
    } catch (e) {
      console.warn('Failed to load templates from API, using fallback data:', e);
      setContractTemplates(FALLBACK_TEMPLATES);
    }
    setLoading(false);
  };

  const categories = ['all', ...Array.from(new Set(contractTemplates.map(t => t.category)))];
  const severities = ['all', 'critical', 'high', 'medium'];

  const filteredTemplates = contractTemplates.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && t.severity !== filterSeverity) return false;
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
    return true;
  });

  const applyTemplate = (template: ContractTemplate) => {
    setApplying(true);
    if (mode === 'single') {
      setSourceCode(template.source_code);
      setResult(null);
    } else {
      if (applyTarget && applyTarget !== 'new') {
        updateBatchContract(applyTarget, 'source_code', template.source_code);
        updateBatchContract(applyTarget, 'name', template.name);
      } else {
        const { addBatchContract } = useAuditStore.getState();
        addBatchContract();
        const state = useAuditStore.getState();
        const last = state.batchContracts[state.batchContracts.length - 1];
        updateBatchContract(last.id, 'source_code', template.source_code);
        updateBatchContract(last.id, 'name', template.name);
      }
      setBatchResult(null);
    }
    setShowTemplateLibrary(false);
    setSelectedTemplate(null);
    setApplying(false);
  };

  if (!showTemplateLibrary) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#1e1e1e', borderRadius: '8px', width: '100%',
        maxWidth: '1100px', maxHeight: '85vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #333'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>高危合约模板库</h2>
            <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>
              选择典型漏洞样例进行审计演练与结果学习
            </p>
          </div>
          <button 
            onClick={() => { setShowTemplateLibrary(false); setSelectedTemplate(null); }}
            style={{
              background: 'transparent', border: 'none', color: '#888',
              cursor: 'pointer', fontSize: '20px', padding: '4px'
            }}
          >×</button>
        </div>

        <div style={{
          display: 'flex', gap: '12px', padding: '12px 20px',
          borderBottom: '1px solid #333', flexWrap: 'wrap', alignItems: 'center'
        }}>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
              background: '#2d2d2d', color: '#ccc', fontSize: '13px'
            }}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? '全部分类' : c}</option>
            ))}
          </select>

          <select 
            value={filterSeverity} 
            onChange={e => setFilterSeverity(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
              background: '#2d2d2d', color: '#ccc', fontSize: '13px'
            }}
          >
            {severities.map(s => (
              <option key={s} value={s}>{s === 'all' ? '全部严重度' : s === 'critical' ? '严重' : s === 'high' ? '高危' : '中危'}</option>
            ))}
          </select>

          <select 
            value={filterDifficulty} 
            onChange={e => setFilterDifficulty(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
              background: '#2d2d2d', color: '#ccc', fontSize: '13px'
            }}
          >
            <option value="all">全部难度</option>
            <option value="beginner">入门</option>
            <option value="intermediate">中级</option>
            <option value="advanced">高级</option>
          </select>

          {mode === 'batch' && (
            <select 
              value={applyTarget} 
              onChange={e => setApplyTarget(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
                background: '#2d2d2d', color: '#ccc', fontSize: '13px', marginLeft: 'auto'
              }}
            >
              <option value="new">新建合约标签页</option>
              {batchContracts.map(c => (
                <option key={c.id} value={c.id}>应用到: {c.name}</option>
              ))}
            </select>
          )}

          <span style={{ color: '#888', fontSize: '13px', marginLeft: mode === 'batch' ? 0 : 'auto' }}>
            共 {filteredTemplates.length} 个模板
          </span>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{
            width: selectedTemplate ? '320px' : '100%', borderRight: selectedTemplate ? '1px solid #333' : 'none',
            overflowY: 'auto', padding: '12px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>加载中...</div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>暂无匹配的模板</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTemplates.map(template => (
                  <div 
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    style={{
                      padding: '12px', borderRadius: '6px', cursor: 'pointer',
                      background: selectedTemplate?.id === template.id ? '#2d2d2d' : '#252526',
                      border: selectedTemplate?.id === template.id ? '1px solid #e53935' : '1px solid #333',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        color: severityColors[template.severity],
                        fontSize: '11px', fontWeight: 600,
                        padding: '2px 6px', borderRadius: '3px',
                        background: severityColors[template.severity] + '20'
                      }}>
                        {template.severity === 'critical' ? '严重' : template.severity === 'high' ? '高危' : '中危'}
                      </span>
                      <span style={{
                        color: difficultyColors[template.difficulty],
                        fontSize: '11px', fontWeight: 500,
                        padding: '2px 6px', borderRadius: '3px',
                        background: difficultyColors[template.difficulty] + '20'
                      }}>
                        {difficultyLabels[template.difficulty]}
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#888', fontSize: '11px' }}>
                        {template.category}
                      </span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>
                      {template.name}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', lineHeight: 1.5 }}>
                      {template.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTemplate && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  color: severityColors[selectedTemplate.severity],
                  fontSize: '12px', fontWeight: 600,
                  padding: '4px 10px', borderRadius: '4px',
                  background: severityColors[selectedTemplate.severity] + '20'
                }}>
                  {selectedTemplate.severity === 'critical' ? '严重' : selectedTemplate.severity === 'high' ? '高危' : '中危'}
                </span>
                <span style={{
                  color: difficultyColors[selectedTemplate.difficulty],
                  fontSize: '12px', fontWeight: 500,
                  padding: '4px 10px', borderRadius: '4px',
                  background: difficultyColors[selectedTemplate.difficulty] + '20'
                }}>
                  {difficultyLabels[selectedTemplate.difficulty]}
                </span>
              </div>

              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}>
                {selectedTemplate.name}
              </h3>
              <p style={{ color: '#bbb', fontSize: '14px', marginBottom: '20px', lineHeight: 1.6 }}>
                {selectedTemplate.description}
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  🎯 漏洞类型
                </h4>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedTemplate.vulnerability_types.map((v, i) => (
                    <span key={i} style={{
                      padding: '4px 10px', borderRadius: '4px',
                      background: '#2d2d2d', color: '#ccc', fontSize: '12px'
                    }}>{v}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  ⚠️ 预期漏洞点
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#ffb8b8', fontSize: '13px', lineHeight: 1.8 }}>
                  {selectedTemplate.expected_vulnerabilities.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  📚 学习要点
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#b8e0b8', fontSize: '13px', lineHeight: 1.8 }}>
                  {selectedTemplate.learning_points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  🌐 真实案例
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#ccc', fontSize: '13px', lineHeight: 1.8 }}>
                  {selectedTemplate.real_world_examples.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  📝 合约代码预览
                </h4>
                <pre style={{
                  background: '#1a1a1a', padding: '12px', borderRadius: '6px',
                  overflow: 'auto', maxHeight: '200px', fontSize: '11px',
                  color: '#d4d4d4', lineHeight: 1.5, fontFamily: 'monospace',
                  margin: 0
                }}>{selectedTemplate.source_code}</pre>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => applyTemplate(selectedTemplate)}
                  disabled={applying}
                  style={{
                    padding: '10px 24px', borderRadius: '4px', border: 'none',
                    background: '#e53935', color: '#fff', cursor: 'pointer',
                    fontWeight: 600, fontSize: '14px',
                    opacity: applying ? 0.6 : 1
                  }}
                >
                  {applying ? '应用中...' : '应用此模板'}
                </button>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{
                    padding: '10px 24px', borderRadius: '4px',
                    border: '1px solid #555', background: 'transparent',
                    color: '#ccc', cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  返回列表
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
