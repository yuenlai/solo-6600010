import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../store/audit';
import { Vulnerability, FalsePositiveFeedback } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#ff9800', accepted: '#4caf50', rejected: '#f44336'
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核', accepted: '已确认误报', rejected: '审核驳回'
};

export const AuditReport: React.FC = () => {
  const { result, submitFalsePositiveFeedback, falsePositiveFeedbacks, fetchFalsePositiveFeedbacks, createRemediationPlan, setShowRemediationPlan, setSelectedRemediationPlan } = useAuditStore();
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    if (result) {
      fetchFalsePositiveFeedbacks(result.id);
    }
  }, [result]);

  const getFeedbackForVuln = (vulnId: string): FalsePositiveFeedback | undefined => {
    return falsePositiveFeedbacks.find(f => f.vulnerability_id === vulnId);
  };

  const handleSubmitFeedback = async (vuln: Vulnerability) => {
    if (!result || !feedbackReason.trim()) return;
    await submitFalsePositiveFeedback({
      audit_id: result.id,
      vulnerability_id: vuln.id,
      vulnerability_name: vuln.name,
      contract_name: result.contract_name,
      reason: feedbackReason.trim(),
    });
    setFeedbackReason('');
    setShowFeedbackForm(null);
  };

  const handleGenerateRemediationPlan = async () => {
    if (!result) return;
    setGeneratingPlan(true);
    try {
      const plan = await createRemediationPlan({
        audit_id: result.id,
        plan_name: `整改计划 - ${result.contract_name}`,
      });
      setSelectedRemediationPlan(plan);
      setShowRemediationPlan(true);
    } catch (e) {
      console.error('Failed to generate remediation plan:', e);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (!result) return <div style={{ width: '400px', padding: '20px', color: '#999' }}>Run an audit to see results</div>;

  return (
    <div style={{ width: '400px', padding: '20px', overflow: 'auto', borderLeft: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: result.score >= 80 ? '#e8f5e9' : result.score >= 50 ? '#fff3e0' : '#ffebee',
          fontSize: '24px', fontWeight: 'bold', color: result.score >= 80 ? '#2e7d32' : result.score >= 50 ? '#e65100' : '#b71c1c' }}>
          {result.score}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>{result.contract_name}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>{result.vulnerabilities.length} issues · {result.total_lines} lines</div>
        </div>
      </div>
      <button
        onClick={handleGenerateRemediationPlan}
        disabled={generatingPlan}
        style={{
          width: '100%',
          padding: '10px 16px',
          border: 'none',
          borderRadius: '6px',
          background: '#4caf50',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '16px',
          opacity: generatingPlan ? 0.6 : 1
        }}
      >
        {generatingPlan ? '生成中...' : '📋 生成整改计划'}
      </button>
      {result.vulnerabilities.map((v: Vulnerability) => {
        const feedback = getFeedbackForVuln(v.id);
        return (
          <div key={v.id} style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px',
            borderLeft: `4px solid ${SEV_COLORS[v.severity] || '#ccc'}`, background: '#fafafa', opacity: feedback?.status === 'accepted' ? 0.6 : 1 }}>
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
            <div style={{ fontSize: '12px', color: '#2e7d32', lineHeight: 1.5, marginBottom: '8px' }}>
              <span style={{ display: 'inline-block', width: '50px', fontWeight: 500, color: '#388e3c' }}>修复建议</span>
              {v.recommendation}
            </div>
            
            {feedback && (
              <div style={{ padding: '8px', background: feedback.status === 'accepted' ? '#e8f5e9' : feedback.status === 'rejected' ? '#ffebee' : '#fff3e0', borderRadius: '4px', marginBottom: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[feedback.status] }}></span>
                  <span style={{ fontWeight: 600, color: STATUS_COLORS[feedback.status] }}>{STATUS_LABELS[feedback.status]}</span>
                </div>
                <div style={{ color: '#666', marginBottom: '4px' }}><b>反馈理由：</b>{feedback.reason}</div>
                {feedback.feedback_note && (
                  <div style={{ color: '#666' }}><b>审核意见：</b>{feedback.feedback_note}</div>
                )}
              </div>
            )}

            {!feedback && showFeedbackForm === v.id ? (
              <div style={{ marginTop: '8px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                <textarea
                  value={feedbackReason}
                  onChange={(e) => setFeedbackReason(e.target.value)}
                  placeholder="请说明标记为误报的原因..."
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '12px', resize: 'vertical', minHeight: '60px', marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleSubmitFeedback(v)}
                    disabled={!feedbackReason.trim()}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: '4px', background: '#1976d2', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
                  >提交</button>
                  <button 
                    onClick={() => { setShowFeedbackForm(null); setFeedbackReason(''); }}
                    style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '12px' }}
                  >取消</button>
                </div>
              </div>
            ) : !feedback ? (
              <button 
                onClick={() => setShowFeedbackForm(v.id)}
                style={{ marginTop: '4px', padding: '4px 10px', border: '1px dashed #999', borderRadius: '4px', background: '#fff', color: '#666', cursor: 'pointer', fontSize: '11px' }}
              >标记为误报</button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
