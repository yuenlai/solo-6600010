import React from 'react';
import { useAuditStore } from '../store/audit';
import axios from 'axios';

export const CodeInput: React.FC = () => {
  const { sourceCode, setSourceCode, setResult, setAnalyzing } = useAuditStore();
  const runAudit = async () => {
    setAnalyzing(true);
    try {
      const { data } = await axios.post('/api/audit', { source_code: sourceCode, contract_name: 'Contract' });
      setResult(data);
    } catch { setResult(null); }
    setAnalyzing(false);
  };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: '#1e1e1e' }}>
        <span style={{ color: '#aaa', fontSize: '13px' }}>Solidity</span>
        <button onClick={runAudit} style={{ padding: '6px 20px', borderRadius: '4px', border: 'none',
          background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Audit</button>
      </div>
      <textarea value={sourceCode} onChange={e => setSourceCode(e.target.value)}
        style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px', padding: '16px', border: 'none',
          resize: 'none', background: '#1e1e1e', color: '#d4d4d4', outline: 'none', lineHeight: 1.5 }} />
    </div>
  );
};
