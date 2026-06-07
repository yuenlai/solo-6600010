import React from 'react';
import { useAuditStore } from '../store/audit';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

export const AuditReport: React.FC = () => {
  const { result } = useAuditStore();
  if (!result) return <div style={{ width: '400px', padding: '20px', color: '#999' }}>Run an audit to see results</div>;
  return (
    <div style={{ width: '400px', padding: '20px', overflow: 'auto', borderLeft: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: result.score >= 80 ? '#e8f5e9' : result.score >= 50 ? '#fff3e0' : '#ffebee',
          fontSize: '24px', fontWeight: 'bold', color: result.score >= 80 ? '#2e7d32' : result.score >= 50 ? '#e65100' : '#b71c1c' }}>
          {result.score}</div>
        <div><div style={{ fontWeight: 600 }}>{result.contract_name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{result.vulnerabilities.length} issues · {result.total_lines} lines</div></div>
      </div>
      {result.vulnerabilities.map((v: any) => (
        <div key={v.id} style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px',
          borderLeft: `4px solid ${SEV_COLORS[v.severity] || '#ccc'}`, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '13px' }}>{v.name}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff',
              background: SEV_COLORS[v.severity] }}>{v.severity}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
            <span style={{ display: 'inline-block', width: '50px', fontWeight: 500, color: '#888' }}>位置</span>
            第 {v.line} 行
          </div>
          <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px', lineHeight: 1.5 }}>
            <span style={{ display: 'inline-block', width: '50px', fontWeight: 500, color: '#e53935' }}>命中原因</span>
            {v.description}
          </div>
          <div style={{ fontSize: '12px', color: '#2e7d32', lineHeight: 1.5 }}>
            <span style={{ display: 'inline-block', width: '50px', fontWeight: 500, color: '#388e3c' }}>修复建议</span>
            {v.recommendation}
          </div>
        </div>
      ))}
    </div>
  );
};
