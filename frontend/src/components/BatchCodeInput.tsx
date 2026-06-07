import React, { useState } from 'react';
import { useAuditStore } from '../store/audit';
import axios from 'axios';

export const BatchCodeInput: React.FC = () => {
  const { batchContracts, addBatchContract, removeBatchContract, updateBatchContract, setBatchResult, setAnalyzing, isAnalyzing, setShowTemplateLibrary } = useAuditStore();
  const [activeTab, setActiveTab] = useState<string>(batchContracts[0]?.id || '');

  const runBatchAudit = async () => {
    const valid = batchContracts.filter(c => c.source_code.trim());
    if (valid.length < 2) return;
    setAnalyzing(true);
    try {
      const { data } = await axios.post('/api/audit/batch', {
        contracts: valid.map(c => ({ source_code: c.source_code, contract_name: c.name || 'Contract' }))
      });
      setBatchResult(data);
    } catch { setBatchResult(null); }
    setAnalyzing(false);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#1e1e1e', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#aaa', fontSize: '13px' }}>批量审计 ({batchContracts.length}份合约)</span>
        <button onClick={addBatchContract} style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '12px' }}>+ 添加合约</button>
        <button onClick={() => setShowTemplateLibrary(true)} style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '12px' }}>📚 模板库</button>
        <button onClick={runBatchAudit} disabled={isAnalyzing || batchContracts.filter(c => c.source_code.trim()).length < 2} style={{ padding: '6px 20px', borderRadius: '4px', border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 600, marginLeft: 'auto', opacity: (isAnalyzing || batchContracts.filter(c => c.source_code.trim()).length < 2) ? 0.5 : 1 }}>
          {isAnalyzing ? '分析中...' : '开始批量审计'}
        </button>
      </div>
      <div style={{ display: 'flex', background: '#252526', borderBottom: '1px solid #333', overflowX: 'auto' }}>
        {batchContracts.map((c, i) => (
          <div key={c.id} onClick={() => setActiveTab(c.id)} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderRight: '1px solid #333', background: activeTab === c.id ? '#1e1e1e' : 'transparent', minWidth: '120px' }}>
            <input value={c.name} onChange={e => updateBatchContract(c.id, 'name', e.target.value)} onClick={e => e.stopPropagation()} style={{ background: 'transparent', border: 'none', color: '#d4d4d4', fontSize: '12px', outline: 'none', flex: 1, minWidth: 0 }} />
            {batchContracts.length > 1 && (
              <button onClick={e => { e.stopPropagation(); removeBatchContract(c.id); if (activeTab === c.id) setActiveTab(batchContracts[0]?.id || ''); }} style={{ marginLeft: '8px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '14px' }}>×</button>
            )}
          </div>
        ))}
      </div>
      {batchContracts.map(c => (
        activeTab === c.id && (
          <textarea key={c.id} value={c.source_code} onChange={e => updateBatchContract(c.id, 'source_code', e.target.value)} placeholder="粘贴合约代码..."
            style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px', padding: '16px', border: 'none', resize: 'none', background: '#1e1e1e', color: '#d4d4d4', outline: 'none', lineHeight: 1.5, minHeight: 0 }} />
        )
      ))}
    </div>
  );
};
