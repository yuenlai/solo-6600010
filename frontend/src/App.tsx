import React from 'react';
import { CodeInput } from './components/CodeInput';
import { AuditReport } from './components/AuditReport';
import { BatchCodeInput } from './components/BatchCodeInput';
import { BatchAuditReport } from './components/BatchAuditReport';
import { CustomRuleManager } from './components/CustomRuleManager';
import { AuditHistory } from './components/AuditHistory';
import { ContractTemplateLibrary } from './components/ContractTemplateLibrary';
import { AuditTaskList } from './components/AuditTaskList';
import { ProjectDashboard } from './components/ProjectDashboard';
import { RemediationPlan } from './components/RemediationPlan';
import { useAuditStore } from './store/audit';

const App: React.FC = () => {
  const { mode, setMode, setShowRuleManager, customRules, setShowHistory, setShowTemplateLibrary, setShowTaskList, auditTaskLists, setShowDashboard, setShowRemediationPlan, remediationPlans } = useAuditStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', background: '#2d2d2d', borderBottom: '1px solid #444', gap: '16px' }}>
        <span style={{ color: '#fff', fontWeight: 600 }}>智能合约审计工具</span>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '20px' }}>
          <button onClick={() => setMode('single')} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, background: mode === 'single' ? '#e53935' : 'transparent', color: mode === 'single' ? '#fff' : '#ccc' }}>单合约审计</button>
          <button onClick={() => setMode('batch')} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, background: mode === 'batch' ? '#e53935' : 'transparent', color: mode === 'batch' ? '#fff' : '#ccc' }}>批量对比审计</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowTemplateLibrary(true)} style={{
            padding: '6px 16px', border: '1px solid #666', borderRadius: '4px',
            cursor: 'pointer', fontWeight: 500, background: 'transparent', color: '#ccc'
          }}>
            📚 高危模板库
          </button>
          <button onClick={() => setShowHistory(true)} style={{
            padding: '6px 16px', border: '1px solid #666', borderRadius: '4px',
            cursor: 'pointer', fontWeight: 500, background: 'transparent', color: '#ccc'
          }}>
            审计历史
          </button>
          <button onClick={() => setShowTaskList(true)} style={{
            padding: '6px 16px', border: '1px solid #666', borderRadius: '4px',
            cursor: 'pointer', fontWeight: 500, background: 'transparent', color: '#ccc'
          }}>
            📋 任务清单 {auditTaskLists.length > 0 && `(${auditTaskLists.length})`}
          </button>
          <button onClick={() => setShowRemediationPlan(true)} style={{
            padding: '6px 16px', border: '1px solid #666', borderRadius: '4px',
            cursor: 'pointer', fontWeight: 500, background: 'transparent', color: '#ccc'
          }}>
            🔧 整改计划 {remediationPlans.length > 0 && `(${remediationPlans.length})`}
          </button>
          <button onClick={() => setShowRuleManager(true)} style={{
            padding: '6px 16px', border: '1px solid #666', borderRadius: '4px',
            cursor: 'pointer', fontWeight: 500, background: 'transparent', color: '#ccc'
          }}>
            自定义规则 {customRules.length > 0 && `(${customRules.length})`}
          </button>
          <button onClick={() => setShowDashboard(true)} style={{
            padding: '6px 16px', border: '1px solid #666', borderRadius: '4px',
            cursor: 'pointer', fontWeight: 500, background: 'transparent', color: '#ccc'
          }}>
            📊 项目看板
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {mode === 'single' ? (<><CodeInput /><AuditReport /></>) : (<><BatchCodeInput /><BatchAuditReport /></>)}
      </div>
      <CustomRuleManager />
      <AuditHistory />
      <ContractTemplateLibrary />
      <AuditTaskList />
      <ProjectDashboard />
      <RemediationPlan />
    </div>
  );
};
export default App;
