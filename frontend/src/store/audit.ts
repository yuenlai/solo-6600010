import { create } from 'zustand';
import { 
  AuditResult, BatchAuditResult, ContractInput, CustomRule, CustomRuleCreate,
  ContractHistorySummary, AuditHistoryRecord, ContractCompareResult,
  ContractTemplate, FalsePositiveFeedback, FalsePositiveFeedbackCreate,
  AuditTaskList, AuditTaskListCreate, AuditTaskItem, AuditTaskItemCreate,
  AuditTaskItemUpdate, ProjectDashboardData
} from '../types';

interface AuditState {
  mode: 'single' | 'batch';
  sourceCode: string;
  result: AuditResult | null;
  batchContracts: ContractInput[];
  batchResult: BatchAuditResult | null;
  isAnalyzing: boolean;
  customRules: CustomRule[];
  showRuleManager: boolean;
  showHistory: boolean;
  showTemplateLibrary: boolean;
  historySummaries: ContractHistorySummary[];
  selectedContractHistory: AuditHistoryRecord[];
  selectedCompareResult: ContractCompareResult | null;
  selectedContractName: string | null;
  contractTemplates: ContractTemplate[];
  selectedTemplate: ContractTemplate | null;
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
  setShowHistory: (show: boolean) => void;
  setHistorySummaries: (summaries: ContractHistorySummary[]) => void;
  setSelectedContractHistory: (history: AuditHistoryRecord[]) => void;
  setSelectedCompareResult: (result: ContractCompareResult | null) => void;
  setSelectedContractName: (name: string | null) => void;
  setShowTemplateLibrary: (show: boolean) => void;
  setContractTemplates: (templates: ContractTemplate[]) => void;
  setSelectedTemplate: (template: ContractTemplate | null) => void;
  falsePositiveFeedbacks: FalsePositiveFeedback[];
  setFalsePositiveFeedbacks: (feedbacks: FalsePositiveFeedback[]) => void;
  addFalsePositiveFeedback: (feedback: FalsePositiveFeedback) => void;
  submitFalsePositiveFeedback: (data: FalsePositiveFeedbackCreate) => Promise<FalsePositiveFeedback>;
  fetchFalsePositiveFeedbacks: (auditId?: string) => Promise<void>;
  reviewFalsePositiveFeedback: (feedbackId: string, status: string, feedbackNote?: string) => Promise<FalsePositiveFeedback>;
  showTaskList: boolean;
  setShowTaskList: (show: boolean) => void;
  auditTaskLists: AuditTaskList[];
  selectedTaskList: AuditTaskList | null;
  setAuditTaskLists: (lists: AuditTaskList[]) => void;
  setSelectedTaskList: (list: AuditTaskList | null) => void;
  fetchTaskLists: () => Promise<void>;
  createTaskList: (data: AuditTaskListCreate) => Promise<AuditTaskList>;
  updateTaskList: (listId: string, data: AuditTaskListCreate) => Promise<AuditTaskList>;
  deleteTaskList: (listId: string) => Promise<void>;
  addTaskItem: (listId: string, data: AuditTaskItemCreate) => Promise<AuditTaskItem>;
  updateTaskItem: (listId: string, taskId: string, data: AuditTaskItemUpdate) => Promise<AuditTaskItem>;
  deleteTaskItem: (listId: string, taskId: string) => Promise<void>;
  showDashboard: boolean;
  setShowDashboard: (show: boolean) => void;
  dashboardData: ProjectDashboardData | null;
  setDashboardData: (data: ProjectDashboardData | null) => void;
  fetchDashboardData: () => Promise<void>;
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
  showHistory: false,
  showTemplateLibrary: false,
  historySummaries: [],
  selectedContractHistory: [],
  selectedCompareResult: null,
  selectedContractName: null,
  contractTemplates: [],
  selectedTemplate: null,
  falsePositiveFeedbacks: [],
  showTaskList: false,
  auditTaskLists: [],
  selectedTaskList: null,
  showDashboard: false,
  dashboardData: null,
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
  setShowHistory: (show) => set({ showHistory: show }),
  setHistorySummaries: (summaries) => set({ historySummaries: summaries }),
  setSelectedContractHistory: (history) => set({ selectedContractHistory: history }),
  setSelectedCompareResult: (result) => set({ selectedCompareResult: result }),
  setSelectedContractName: (name) => set({ selectedContractName: name }),
  setShowTemplateLibrary: (show) => set({ showTemplateLibrary: show }),
  setContractTemplates: (templates) => set({ contractTemplates: templates }),
  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setFalsePositiveFeedbacks: (feedbacks) => set({ falsePositiveFeedbacks: feedbacks }),
  addFalsePositiveFeedback: (feedback) => set({ falsePositiveFeedbacks: [feedback, ...get().falsePositiveFeedbacks] }),
  submitFalsePositiveFeedback: async (data) => {
    const res = await fetch('/api/audit/false-positive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const feedback = await res.json();
    get().addFalsePositiveFeedback(feedback);
    return feedback;
  },
  fetchFalsePositiveFeedbacks: async (auditId) => {
    const url = auditId ? `/api/audit/false-positive?audit_id=${auditId}` : '/api/audit/false-positive';
    const res = await fetch(url);
    const feedbacks = await res.json();
    get().setFalsePositiveFeedbacks(feedbacks);
  },
  reviewFalsePositiveFeedback: async (feedbackId: string, status: string, feedbackNote?: string) => {
    const res = await fetch(`/api/audit/false-positive/${feedbackId}/review`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, feedback_note: feedbackNote }),
    });
    const feedback = await res.json();
    get().setFalsePositiveFeedbacks(
      get().falsePositiveFeedbacks.map(f => f.id === feedbackId ? feedback : f)
    );
    return feedback;
  },
  setShowTaskList: (show) => set({ showTaskList: show }),
  setAuditTaskLists: (lists) => set({ auditTaskLists: lists }),
  setSelectedTaskList: (list) => set({ selectedTaskList: list }),
  fetchTaskLists: async () => {
    const res = await fetch('/api/audit/task-lists');
    const lists = await res.json();
    get().setAuditTaskLists(lists);
  },
  createTaskList: async (data) => {
    const res = await fetch('/api/audit/task-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const list = await res.json();
    get().setAuditTaskLists([list, ...get().auditTaskLists]);
    return list;
  },
  updateTaskList: async (listId, data) => {
    const res = await fetch(`/api/audit/task-lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const list = await res.json();
    get().setAuditTaskLists(get().auditTaskLists.map(l => l.id === listId ? list : l));
    if (get().selectedTaskList?.id === listId) {
      get().setSelectedTaskList(list);
    }
    return list;
  },
  deleteTaskList: async (listId) => {
    await fetch(`/api/audit/task-lists/${listId}`, { method: 'DELETE' });
    get().setAuditTaskLists(get().auditTaskLists.filter(l => l.id !== listId));
    if (get().selectedTaskList?.id === listId) {
      get().setSelectedTaskList(null);
    }
  },
  addTaskItem: async (listId, data) => {
    const res = await fetch(`/api/audit/task-lists/${listId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const task = await res.json();
    const list = get().auditTaskLists.find(l => l.id === listId);
    if (list) {
      const updatedList = { ...list, tasks: [...list.tasks, task], updated_at: new Date().toISOString() };
      get().setAuditTaskLists(get().auditTaskLists.map(l => l.id === listId ? updatedList : l));
      if (get().selectedTaskList?.id === listId) {
        get().setSelectedTaskList(updatedList);
      }
    }
    return task;
  },
  updateTaskItem: async (listId, taskId, data) => {
    const res = await fetch(`/api/audit/task-lists/${listId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const task = await res.json();
    const list = get().auditTaskLists.find(l => l.id === listId);
    if (list) {
      const updatedTasks = list.tasks.map(t => t.id === taskId ? task : t);
      const updatedList = { ...list, tasks: updatedTasks, updated_at: new Date().toISOString() };
      get().setAuditTaskLists(get().auditTaskLists.map(l => l.id === listId ? updatedList : l));
      if (get().selectedTaskList?.id === listId) {
        get().setSelectedTaskList(updatedList);
      }
    }
    return task;
  },
  deleteTaskItem: async (listId, taskId) => {
    await fetch(`/api/audit/task-lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
    const list = get().auditTaskLists.find(l => l.id === listId);
    if (list) {
      const updatedTasks = list.tasks.filter(t => t.id !== taskId);
      const updatedList = { ...list, tasks: updatedTasks, updated_at: new Date().toISOString() };
      get().setAuditTaskLists(get().auditTaskLists.map(l => l.id === listId ? updatedList : l));
      if (get().selectedTaskList?.id === listId) {
        get().setSelectedTaskList(updatedList);
      }
    }
  },
  setShowDashboard: (show) => set({ showDashboard: show }),
  setDashboardData: (data) => set({ dashboardData: data }),
  fetchDashboardData: async () => {
    try {
      const res = await fetch('/api/audit/dashboard');
      if (res.ok) {
        const data = await res.json();
        get().setDashboardData(data);
      } else {
        get().setDashboardData(null);
      }
    } catch (e) {
      const mockData: ProjectDashboardData = {
        total_contracts: 5,
        total_vulnerabilities: 23,
        average_score: 72,
        risk_distribution: { critical: 2, high: 5, medium: 8, low: 6, info: 2 },
        contracts: [
          {
            id: genId(),
            contract_name: 'VulnerableWallet',
            score: 45,
            total_vulnerabilities: 8,
            risk_distribution: { critical: 1, high: 3, medium: 2, low: 2, info: 0 },
            last_audited_at: new Date(Date.now() - 3600000).toISOString(),
            status: 'danger'
          },
          {
            id: genId(),
            contract_name: 'SimpleAuction',
            score: 62,
            total_vulnerabilities: 6,
            risk_distribution: { critical: 1, high: 2, medium: 2, low: 1, info: 0 },
            last_audited_at: new Date(Date.now() - 7200000).toISOString(),
            status: 'warning'
          },
          {
            id: genId(),
            contract_name: 'TokenContract',
            score: 85,
            total_vulnerabilities: 3,
            risk_distribution: { critical: 0, high: 0, medium: 2, low: 1, info: 0 },
            last_audited_at: new Date(Date.now() - 86400000).toISOString(),
            status: 'safe'
          },
          {
            id: genId(),
            contract_name: 'StakingPool',
            score: 58,
            total_vulnerabilities: 4,
            risk_distribution: { critical: 0, high: 2, medium: 1, low: 1, info: 0 },
            last_audited_at: new Date(Date.now() - 172800000).toISOString(),
            status: 'warning'
          },
          {
            id: genId(),
            contract_name: 'NFTMarketplace',
            score: 92,
            total_vulnerabilities: 2,
            risk_distribution: { critical: 0, high: 0, medium: 1, low: 0, info: 1 },
            last_audited_at: new Date(Date.now() - 259200000).toISOString(),
            status: 'safe'
          }
        ],
        critical_issues: [
          {
            id: genId(),
            name: '重入攻击漏洞',
            severity: 'critical',
            contract_name: 'VulnerableWallet',
            description: 'withdraw函数在更新余额前执行外部调用，可能导致重入攻击',
            line: 75,
            first_found_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            status: 'open'
          },
          {
            id: genId(),
            name: '未检查send返回值',
            severity: 'high',
            contract_name: 'SimpleAuction',
            description: 'bid函数中使用send但未检查返回值，可能导致转账失败后继续执行',
            line: 100,
            first_found_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            status: 'open'
          },
          {
            id: genId(),
            name: '自毁函数权限不足',
            severity: 'critical',
            contract_name: 'VulnerableWallet',
            description: 'emergencyWithdraw函数缺少权限控制，任何人都可以调用自毁合约',
            line: 82,
            first_found_at: new Date(Date.now() - 86400000 * 3).toISOString(),
            status: 'fixed'
          },
          {
            id: genId(),
            name: '时间戳依赖',
            severity: 'high',
            contract_name: 'SimpleAuction',
            description: '使用block.timestamp进行时间判断，可能被矿工操纵',
            line: 98,
            first_found_at: new Date(Date.now() - 86400000).toISOString(),
            status: 'open'
          }
        ],
        recent_activities: [
          {
            id: genId(),
            type: 'audit',
            contract_name: 'VulnerableWallet',
            description: '完成新一次审计，发现 2 个新漏洞',
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: genId(),
            type: 'fix',
            contract_name: 'VulnerableWallet',
            description: '修复了自毁函数权限问题',
            created_at: new Date(Date.now() - 7200000).toISOString()
          },
          {
            id: genId(),
            type: 'task',
            contract_name: 'SimpleAuction',
            description: '新增修复任务：处理未检查send返回值问题',
            created_at: new Date(Date.now() - 14400000).toISOString()
          },
          {
            id: genId(),
            type: 'feedback',
            contract_name: 'TokenContract',
            description: '提交了 1 个误报反馈，等待审核',
            created_at: new Date(Date.now() - 28800000).toISOString()
          },
          {
            id: genId(),
            type: 'audit',
            contract_name: 'NFTMarketplace',
            description: '完成审计，分数提升至 92 分',
            created_at: new Date(Date.now() - 259200000).toISOString()
          }
        ],
        last_updated: new Date().toISOString()
      };
      get().setDashboardData(mockData);
    }
  },
}));
