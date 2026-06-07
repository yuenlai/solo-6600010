import { create } from 'zustand';
import { AuditResult, BatchAuditResult, ContractInput, CustomRule, CustomRuleCreate } from '../types';

interface AuditState {
  mode: 'single' | 'batch';
  sourceCode: string;
  result: AuditResult | null;
  batchContracts: ContractInput[];
  batchResult: BatchAuditResult | null;
  isAnalyzing: boolean;
  customRules: CustomRule[];
  showRuleManager: boolean;
  setMode: (m: 'single' | 'batch') => void;
  setSourceCode: (code: string) => void;
  setResult: (r: AuditResult | null) => void;
  addBatchContract: () => void;
  removeBatchContract: (id: string) => void;
  updateBatchContract: (id: string, field: keyof ContractInput, value: string) => void;
  setBatchResult: (r: BatchAuditResult | null) => void;
  setAnalyzing: (v: boolean) => void;
  setCustomRules: (rules: CustomRule[]) => void;
  addCustomRule: (rule: CustomRule) => void;
  updateCustomRule: (rule: CustomRule) => void;
  deleteCustomRule: (id: string) => void;
  setShowRuleManager: (show: boolean) => void;
}

const SAMPLE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract VulnerableWallet {
    mapping(address => uint) public balances;
    function withdraw() external {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] = 0;
    }
    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }
    function emergencyWithdraw() external {
        selfdestruct(payable(msg.sender));
    }
    function getTime() external view returns (uint) {
        return block.timestamp;
    }
}`;

const SAMPLE2 = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
contract SimpleAuction {
    address public beneficiary;
    uint public auctionEnd;
    address public highestBidder;
    uint public highestBid;
    function bid() external payable {
        require(block.timestamp < auctionEnd);
        if (highestBid != 0) {
            payable(highestBidder).send(highestBid);
        }
        highestBidder = msg.sender;
        highestBid = msg.value;
    }
}`;

const genId = () => Math.random().toString(36).slice(2, 9);

export const useAuditStore = create<AuditState>((set, get) => ({
  mode: 'single',
  sourceCode: SAMPLE,
  result: null,
  batchContracts: [
    { id: genId(), name: 'Wallet', source_code: SAMPLE },
    { id: genId(), name: 'Auction', source_code: SAMPLE2 },
  ],
  batchResult: null,
  isAnalyzing: false,
  customRules: [],
  showRuleManager: false,
  setMode: (m) => set({ mode: m, result: null, batchResult: null }),
  setSourceCode: (code) => set({ sourceCode: code }),
  setResult: (r) => set({ result: r }),
  addBatchContract: () => set({ batchContracts: [...get().batchContracts, { id: genId(), name: `Contract ${get().batchContracts.length + 1}`, source_code: '' }] }),
  removeBatchContract: (id) => set({ batchContracts: get().batchContracts.filter(c => c.id !== id) }),
  updateBatchContract: (id, field, value) => set({ batchContracts: get().batchContracts.map(c => c.id === id ? { ...c, [field]: value } : c) }),
  setBatchResult: (r) => set({ batchResult: r }),
  setAnalyzing: (v) => set({ isAnalyzing: v }),
  setCustomRules: (rules) => set({ customRules: rules }),
  addCustomRule: (rule) => set({ customRules: [...get().customRules, rule] }),
  updateCustomRule: (rule) => set({ customRules: get().customRules.map(r => r.id === rule.id ? rule : r) }),
  deleteCustomRule: (id) => set({ customRules: get().customRules.filter(r => r.id !== id) }),
  setShowRuleManager: (show) => set({ showRuleManager: show }),
}));
