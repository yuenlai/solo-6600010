import { create } from 'zustand';
import { 
  AuditResult, BatchAuditResult, ContractInput, CustomRule, CustomRuleCreate,
  ContractHistorySummary, AuditHistoryRecord, ContractCompareResult,
  ContractTemplate, FalsePositiveFeedback, FalsePositiveFeedbackCreate,
  AuditTaskList, AuditTaskListCreate, AuditTaskItem, AuditTaskItemCreate,
  AuditTaskItemUpdate, ProjectDashboardData,
  RemediationPlan, RemediationPlanCreate, RemediationItem, RemediationItemUpdate,
  AuditReport, AuditReportExportRequest, ContractFamilyAnalysisResult,
  VersionMigrationAssessmentResult
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
  showRemediationPlan: boolean;
  setShowRemediationPlan: (show: boolean) => void;
  remediationPlans: RemediationPlan[];
  selectedRemediationPlan: RemediationPlan | null;
  setRemediationPlans: (plans: RemediationPlan[]) => void;
  setSelectedRemediationPlan: (plan: RemediationPlan | null) => void;
  fetchRemediationPlans: () => Promise<void>;
  createRemediationPlan: (data: RemediationPlanCreate) => Promise<RemediationPlan>;
  deleteRemediationPlan: (planId: string) => Promise<void>;
  updateRemediationItem: (planId: string, itemId: string, data: RemediationItemUpdate) => Promise<RemediationItem>;
  auditReports: AuditReport[];
  selectedAuditReport: AuditReport | null;
  isExportingReport: boolean;
  setAuditReports: (reports: AuditReport[]) => void;
  setSelectedAuditReport: (report: AuditReport | null) => void;
  setIsExportingReport: (value: boolean) => void;
  generateAuditReport: (data: AuditReportExportRequest) => Promise<AuditReport>;
  exportAuditReport: (data: AuditReportExportRequest) => Promise<void>;
  fetchAuditReports: () => Promise<void>;
  fetchAuditReport: (reportId: string) => Promise<void>;
  familyAnalysisResult: ContractFamilyAnalysisResult | null;
  setFamilyAnalysisResult: (result: ContractFamilyAnalysisResult | null) => void;
  isAnalyzingFamily: boolean;
  setIsAnalyzingFamily: (value: boolean) => void;
  runFamilyAnalysis: () => Promise<void>;
  showFamilyAnalysis: boolean;
  setShowFamilyAnalysis: (show: boolean) => void;
  migrationAssessmentResult: VersionMigrationAssessmentResult | null;
  setMigrationAssessmentResult: (result: VersionMigrationAssessmentResult | null) => void;
  isAssessingMigration: boolean;
  setIsAssessingMigration: (value: boolean) => void;
  showMigrationAssessment: boolean;
  setShowMigrationAssessment: (show: boolean) => void;
  runMigrationAssessment: (oldSourceCode: string, newSourceCode: string, contractName: string) => Promise<void>;
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
  showRemediationPlan: false,
  remediationPlans: [],
  selectedRemediationPlan: null,
  auditReports: [],
  selectedAuditReport: null,
  isExportingReport: false,
  familyAnalysisResult: null,
  isAnalyzingFamily: false,
  showFamilyAnalysis: false,
  migrationAssessmentResult: null,
  isAssessingMigration: false,
  showMigrationAssessment: false,
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
      console.error('Failed to fetch dashboard data:', e);
      get().setDashboardData(null);
    }
  },
  setShowRemediationPlan: (show) => set({ showRemediationPlan: show }),
  setRemediationPlans: (plans) => set({ remediationPlans: plans }),
  setSelectedRemediationPlan: (plan) => set({ selectedRemediationPlan: plan }),
  fetchRemediationPlans: async () => {
    try {
      const res = await fetch('/api/audit/remediation-plans');
      if (res.ok) {
        const plans = await res.json();
        get().setRemediationPlans(plans);
      }
    } catch (e) {
      console.error('Failed to fetch remediation plans:', e);
    }
  },
  createRemediationPlan: async (data) => {
    const res = await fetch('/api/audit/remediation-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const plan = await res.json();
    get().setRemediationPlans([plan, ...get().remediationPlans]);
    return plan;
  },
  deleteRemediationPlan: async (planId) => {
    await fetch(`/api/audit/remediation-plans/${planId}`, { method: 'DELETE' });
    get().setRemediationPlans(get().remediationPlans.filter(p => p.id !== planId));
    if (get().selectedRemediationPlan?.id === planId) {
      get().setSelectedRemediationPlan(null);
    }
  },
  updateRemediationItem: async (planId, itemId, data) => {
    const res = await fetch(`/api/audit/remediation-plans/${planId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const item = await res.json();
    const plan = get().remediationPlans.find(p => p.id === planId);
    if (plan) {
      const updatedItems = plan.items.map(i => i.id === itemId ? item : i);
      const updatedPlan = { ...plan, items: updatedItems, updated_at: new Date().toISOString() };
      get().setRemediationPlans(get().remediationPlans.map(p => p.id === planId ? updatedPlan : p));
      if (get().selectedRemediationPlan?.id === planId) {
        get().setSelectedRemediationPlan(updatedPlan);
      }
    }
    return item;
  },
  setAuditReports: (reports) => set({ auditReports: reports }),
  setSelectedAuditReport: (report) => set({ selectedAuditReport: report }),
  setIsExportingReport: (value) => set({ isExportingReport: value }),
  generateAuditReport: async (data) => {
    const res = await fetch('/api/audit/report/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const report = await res.json();
    get().setSelectedAuditReport(report);
    get().setAuditReports([report, ...get().auditReports]);
    return report;
  },
  exportAuditReport: async (data) => {
    get().setIsExportingReport(true);
    try {
      const res = await fetch('/api/audit/report/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] || 'audit_report.md';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      get().setIsExportingReport(false);
    }
  },
  fetchAuditReports: async () => {
    try {
      const res = await fetch('/api/audit/reports');
      if (res.ok) {
        const reports = await res.json();
        get().setAuditReports(reports);
      }
    } catch (e) {
      console.error('Failed to fetch audit reports:', e);
    }
  },
  fetchAuditReport: async (reportId) => {
    try {
      const res = await fetch(`/api/audit/report/${reportId}`);
      if (res.ok) {
        const report = await res.json();
        get().setSelectedAuditReport(report);
      }
    } catch (e) {
      console.error('Failed to fetch audit report:', e);
    }
  },
  setFamilyAnalysisResult: (result) => set({ familyAnalysisResult: result }),
  setIsAnalyzingFamily: (value) => set({ isAnalyzingFamily: value }),
  runFamilyAnalysis: async () => {
    const { batchContracts } = get();
    const valid = batchContracts.filter(c => c.source_code.trim());
    if (valid.length < 2) return;
    set({ isAnalyzingFamily: true });
    try {
      const res = await fetch('/api/audit/family-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contracts: valid.map(c => ({ source_code: c.source_code, contract_name: c.name || 'Contract' }))
        })
      });
      if (res.ok) {
        const data = await res.json();
        set({ familyAnalysisResult: data, showFamilyAnalysis: true });
      } else {
        set({ familyAnalysisResult: null });
      }
    } catch (e) {
      console.error('Failed to run family analysis:', e);
      set({ familyAnalysisResult: null });
    } finally {
      set({ isAnalyzingFamily: false });
    }
  },
  setShowFamilyAnalysis: (show) => set({ showFamilyAnalysis: show }),
  setMigrationAssessmentResult: (result) => set({ migrationAssessmentResult: result }),
  setIsAssessingMigration: (value) => set({ isAssessingMigration: value }),
  setShowMigrationAssessment: (show) => set({ showMigrationAssessment: show }),
  runMigrationAssessment: async (oldSourceCode, newSourceCode, contractName) => {
    set({ isAssessingMigration: true });
    try {
      const res = await fetch('/api/audit/migration-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_source_code: oldSourceCode,
          new_source_code: newSourceCode,
          contract_name: contractName
        })
      });
      if (res.ok) {
        const data = await res.json();
        set({ migrationAssessmentResult: data, showMigrationAssessment: true });
      } else {
        set({ migrationAssessmentResult: null });
      }
    } catch (e) {
      console.error('Failed to run migration assessment:', e);
      set({ migrationAssessmentResult: null });
    } finally {
      set({ isAssessingMigration: false });
    }
  },
}));
