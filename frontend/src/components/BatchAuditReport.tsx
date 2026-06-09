import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../store/audit';
import { AuditResult, CommonIssue, Vulnerability, FalsePositiveFeedback } from '../types';
import { ScoreInterpretation } from './ScoreInterpretation';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#ff9800', accepted: '#4caf50', rejected: '#f44336'
};

const STATUS_LABELS: Record<string, string> = {
  pending: '待审核', accepted: '已确认误报', rejected: '审核驳回'
};

export const BatchAuditReport: React.FC = () => {
  const { batchResult, submitFalsePositiveFeedback, falsePositiveFeedbacks, fetchFalsePositiveFeedbacks, createRemediationPlan, setShowRemediationPlan, setSelectedRemediationPlan, exportAuditReport, isExportingReport, runFamilyAnalysis, isAnalyzingFamily, runRiskClustering, isClusteringRisks } = useAuditStore();
  const [view, setView] = useState<'ranking' | 'common'>('ranking');
  const [selectedContract, setSelectedContract] = useState<AuditResult | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSingleExportMenu, setShowSingleExportMenu] = useState(false);

  useEffect(() => {
    if (selectedContract) {
      fetchFalsePositiveFeedbacks(selectedContract.id);
    }
  }, [selectedContract]);

  const getFeedbackForVuln = (vulnId: string): FalsePositiveFeedback | undefined => {
    return falsePositiveFeedbacks.find(f => f.vulnerability_id === vulnId);
  };

  const handleSubmitFeedback = async (vuln: Vulnerability) => {
    if (!selectedContract || !feedbackReason.trim()) return;
    await submitFalsePositiveFeedback({
      audit_id: selectedContract.id,
      vulnerability_id: vuln.id,
      vulnerability_name: vuln.name,
      contract_name: selectedContract.contract_name,
      reason: feedbackReason.trim(),
    });
    setFeedbackReason('');
    setShowFeedbackForm(null);
  };

  const handleGenerateRemediationPlan = async () => {
    if (!batchResult) return;
    setGeneratingPlan(true);
    try {
      const contractNames = batchResult.results.map(r => r.contract_name);
      const plan = await createRemediationPlan({
        batch_audit_id: batchResult.id,
        plan_name: `整改计划 - ${contractNames.join(', ')}`,
      });
      setSelectedRemediationPlan(plan);
      setShowRemediationPlan(true);
    } catch (e) {
      console.error('Failed to generate remediation plan:', e);
    } finally {
      setGeneratingPlan(false);
    }
  };

  if (!batchResult) return <div style={{ width: '500px', padding: '20px', color: '#999' }}>提交批量审计以查看对比结果</div>;

  const handleGenerateSingleRemediationPlan = async () => {
    if (!selectedContract) return;
    setGeneratingPlan(true);
    try {
      const plan = await createRemediationPlan({
        audit_id: selectedContract.id,
        plan_name: `整改计划 - ${selectedContract.contract_name}`,
      });
      setSelectedRemediationPlan(plan);
      setShowRemediationPlan(true);
    } catch (e) {
      console.error('Failed to generate remediation plan:', e);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleExportBatch = async (format: 'markdown' | 'json') => {
    if (!batchResult) return;
    setShowExportMenu(false);
    await exportAuditReport({
      batch_audit_id: batchResult.id,
      format,
      include_remediation: true
    });
  };

  const handleExportSingle = async (format: 'markdown' | 'json') => {
    if (!selectedContract) return;
    setShowSingleExportMenu(false);
    await exportAuditReport({
      audit_id: selectedContract.id,
      format,
      include_remediation: true
    });
  };

  if (selectedContract) {
    return (
      <div style={{ width: '500px', padding: '20px', overflow: 'auto', borderLeft: '1px solid #e0e0e0' }}>
        <button onClick={() => setSelectedContract(null)} style={{ marginBottom: '12px', padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>← 返回列表</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: selectedContract.score >= 80 ? '#e8f5e9' : selectedContract.score >= 50 ? '#fff3e0' : '#ffebee',
            fontSize: '24px', fontWeight: 'bold', color: selectedContract.score >= 80 ? '#2e7d32' : selectedContract.score >= 50 ? '#e65100' : '#b71c1c' }}>
            {selectedContract.score}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{selectedContract.contract_name}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{selectedContract.vulnerabilities.length} 个问题 · {selectedContract.total_lines} 行</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={handleGenerateSingleRemediationPlan}
            disabled={generatingPlan}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#4caf50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: generatingPlan ? 0.6 : 1
            }}
          >
            {generatingPlan ? '生成中...' : '📋 整改计划'}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowSingleExportMenu(!showSingleExportMenu)}
              disabled={isExportingReport}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#1976d2',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: isExportingReport ? 0.6 : 1
              }}
            >
              {isExportingReport ? '导出中...' : '📄 导出'}
            </button>
            {showSingleExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: '140px'
              }}>
                <button
                  onClick={() => handleExportSingle('markdown')}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📝 Markdown 格式
                </button>
                <button
                  onClick={() => handleExportSingle('json')}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📊 JSON 格式
                </button>
              </div>
            )}
          </div>
        </div>
        {selectedContract.score_interpretation && (
          <ScoreInterpretation interpretation={selectedContract.score_interpretation} />
        )}
        {selectedContract.vulnerabilities.map((v: Vulnerability) => {
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
                <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#888' }}>位置</span>
                第 {v.line} 行
              </div>
              <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px', lineHeight: 1.5 }}>
                <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#e53935' }}>命中原因</span>
                {v.description}
              </div>
              <div style={{ fontSize: '12px', color: '#2e7d32', lineHeight: 1.5, marginBottom: '8px' }}>
                <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#388e3c' }}>修复建议</span>
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
  }

  return (
    <div style={{ width: '500px', padding: '20px', overflow: 'auto', borderLeft: '1px solid #e0e0e0' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button onClick={() => setView('ranking')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: view === 'ranking' ? '#e53935' : '#f0f0f0', color: view === 'ranking' ? '#fff' : '#333' }}>风险排行</button>
        <button onClick={() => setView('common')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: view === 'common' ? '#e53935' : '#f0f0f0', color: view === 'common' ? '#fff' : '#333' }}>共性问题</button>
      </div>

      <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '12px' }}>
          <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e53935' }}>{batchResult.total_contracts}</div><div style={{ fontSize: '12px', color: '#666' }}>合约数量</div></div>
          <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>{batchResult.total_vulnerabilities}</div><div style={{ fontSize: '12px', color: '#666' }}>问题总数</div></div>
          <div><div style={{ fontSize: '24px', fontWeight: 'bold', color: batchResult.average_score >= 80 ? '#2e7d32' : batchResult.average_score >= 50 ? '#e65100' : '#b71c1c' }}>{batchResult.average_score}</div><div style={{ fontSize: '12px', color: '#666' }}>平均分</div></div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={runFamilyAnalysis}
            disabled={isAnalyzingFamily}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#9c27b0',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isAnalyzingFamily ? 0.6 : 1
            }}
          >
            {isAnalyzingFamily ? '分析中...' : '🧬 家族分析'}
          </button>
          <button
            onClick={runRiskClustering}
            disabled={isClusteringRisks}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#e65100',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: isClusteringRisks ? 0.6 : 1
            }}
          >
            {isClusteringRisks ? '聚类中...' : '🎯 风险聚类'}
          </button>
          <button
            onClick={handleGenerateRemediationPlan}
            disabled={generatingPlan}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              background: '#4caf50',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              opacity: generatingPlan ? 0.6 : 1
            }}
          >
            {generatingPlan ? '生成中...' : '📋 整改计划'}
          </button>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={isExportingReport}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: '6px',
                background: '#1976d2',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: isExportingReport ? 0.6 : 1
              }}
            >
              {isExportingReport ? '导出中...' : '📄 导出报告'}
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 100,
                minWidth: '140px'
              }}>
                <button
                  onClick={() => handleExportBatch('markdown')}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📝 Markdown 格式
                </button>
                <button
                  onClick={() => handleExportBatch('json')}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '13px',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  📊 JSON 格式
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {batchResult.score_interpretation && (
        <ScoreInterpretation interpretation={batchResult.score_interpretation} isBatch={true} />
      )}

      {view === 'ranking' && (
        <div>
          <h4 style={{ margin: '8px 0 12px', color: '#333' }}>风险从高到低</h4>
          {batchResult.risk_ranking.map((r: AuditResult, i: number) => (
            <div key={r.id} onClick={() => setSelectedContract(r)} style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px', background: '#fafafa', cursor: 'pointer', border: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < 3 ? '#ffebee' : '#f0f0f0', color: i < 3 ? '#b71c1c' : '#666', fontWeight: 'bold', fontSize: '14px' }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{r.contract_name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>{r.vulnerabilities.length} 个问题</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: r.score >= 80 ? '#e8f5e9' : r.score >= 50 ? '#fff3e0' : '#ffebee',
                fontSize: '16px', fontWeight: 'bold', color: r.score >= 80 ? '#2e7d32' : r.score >= 50 ? '#e65100' : '#b71c1c' }}>{r.score}</div>
            </div>
          ))}
        </div>
      )}

      {view === 'common' && (
        <div>
          <h4 style={{ margin: '8px 0 12px', color: '#333' }}>共性问题汇总</h4>
          {batchResult.common_issues.length === 0 && <div style={{ color: '#999', fontSize: '13px' }}>未发现共性问题</div>}
          {batchResult.common_issues.map((issue: CommonIssue) => (
            <div key={issue.name} style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px',
              borderLeft: `4px solid ${SEV_COLORS[issue.severity] || '#ccc'}`, background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{issue.name}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[issue.severity] }}>{issue.severity}</span>
                  <span style={{ fontSize: '11px', color: '#666', background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px' }}>{issue.count} 次出现</span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px', lineHeight: 1.5 }}>
                <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#e53935' }}>问题描述</span>
                {issue.description}
              </div>
              <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '8px', lineHeight: 1.5 }}>
                <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#388e3c' }}>修复建议</span>
                {issue.recommendation}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#888', marginRight: '4px' }}>影响合约：</span>
                {issue.affected_contracts.map(c => (
                  <span key={c} style={{ fontSize: '10px', padding: '2px 6px', background: '#e3f2fd', color: '#1565c0', borderRadius: '4px' }}>{c}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
