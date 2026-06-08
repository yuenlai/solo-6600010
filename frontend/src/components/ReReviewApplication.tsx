import React, { useEffect, useState } from 'react';
import { useAuditStore } from '../store/audit';
import { VulnDiffItem, ReReviewResult, RemediationPlan } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const CHANGE_COLORS: Record<string, string> = {
  resolved: '#4caf50',
  added: '#e53935',
  persistent: '#ff9800',
};

const CHANGE_LABELS: Record<string, string> = {
  resolved: '已修复',
  added: '新增',
  persistent: '未修复',
};

const SEV_LABELS: Record<string, string> = {
  critical: '严重',
  high: '高',
  medium: '中',
  low: '低',
  info: '信息',
};

export const ReReviewApplication: React.FC = () => {
  const {
    showReReview,
    setShowReReview,
    remediationPlans,
    reReviewResults,
    selectedReReviewResult,
    setSelectedReReviewResult,
    isSubmittingReReview,
    submitReReview,
    fetchReReviewResults,
    sourceCode,
  } = useAuditStore();

  const [viewMode, setViewMode] = useState<'submit' | 'history' | 'detail'>('submit');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [reReviewSourceCode, setReReviewSourceCode] = useState('');
  const [remediationSummary, setRemediationSummary] = useState('');

  useEffect(() => {
    if (showReReview) {
      fetchReReviewResults();
      if (remediationPlans.length > 0 && !selectedPlanId) {
        setSelectedPlanId(remediationPlans[0].id);
      }
    }
  }, [showReReview]);

  useEffect(() => {
    if (selectedPlanId) {
      const plan = remediationPlans.find(p => p.id === selectedPlanId);
      if (plan) {
        const resolvedItems = plan.items.filter(i => i.status === 'resolved' || i.status === 'recheck_passed');
        if (resolvedItems.length > 0) {
          setRemediationSummary(resolvedItems.map(i => `${i.vulnerability_name}: ${i.notes || '已修复'}`).join('\n'));
        }
      }
    }
  }, [selectedPlanId]);

  useEffect(() => {
    if (selectedReReviewResult) {
      setViewMode('detail');
    }
  }, [selectedReReviewResult]);

  if (!showReReview) return null;

  const handleSubmit = async () => {
    if (!selectedPlanId || !reReviewSourceCode.trim()) return;
    try {
      await submitReReview({
        plan_id: selectedPlanId,
        source_code: reReviewSourceCode,
        remediation_summary: remediationSummary || undefined,
      });
      setViewMode('detail');
    } catch (e) {
      console.error('Failed to submit re-review:', e);
    }
  };

  const renderSubmitForm = () => {
    const resolvedPlans = remediationPlans.filter(p =>
      p.items.some(i => i.status === 'resolved' || i.status === 'recheck_passed' || i.status === 'recheck_pending')
    );

    return (
      <div style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>📝 提交复审申请</h3>

        {resolvedPlans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>暂无可复审的整改计划</div>
            <div style={{ fontSize: '12px', color: '#aaa' }}>请先在整改计划中标记部分漏洞为"已修复"或"复查通过"</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#555' }}>选择整改计划</label>
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px', background: '#fff' }}
              >
                {resolvedPlans.map(p => {
                  const resolved = p.items.filter(i => i.status === 'resolved' || i.status === 'recheck_passed').length;
                  return (
                    <option key={p.id} value={p.id}>{p.plan_name}（已修复 {resolved}/{p.items.length}）</option>
                  );
                })}
              </select>
            </div>

            {selectedPlanId && (() => {
              const plan = remediationPlans.find(p => p.id === selectedPlanId);
              if (!plan) return null;
              const resolvedItems = plan.items.filter(i => i.status === 'resolved' || i.status === 'recheck_passed');
              return (
                <div style={{ padding: '12px', background: '#e8f5e9', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#2e7d32', marginBottom: '8px' }}>✅ 已修复的漏洞</div>
                  {resolvedItems.map(item => (
                    <div key={item.id} style={{ fontSize: '12px', color: '#555', marginBottom: '4px', paddingLeft: '12px' }}>
                      · <span style={{ color: SEV_COLORS[item.severity] }}>[{item.severity.toUpperCase()}]</span> {item.vulnerability_name}（第{item.line_number}行）
                    </div>
                  ))}
                </div>
              );
            })()}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#555' }}>整改后的合约代码</label>
              <textarea
                value={reReviewSourceCode}
                onChange={e => setReReviewSourceCode(e.target.value)}
                placeholder="粘贴整改后的合约源代码..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                  resize: 'vertical',
                  background: '#1e1e1e',
                  color: '#d4d4d4',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#555' }}>整改说明（可选）</label>
              <textarea
                value={remediationSummary}
                onChange={e => setRemediationSummary(e.target.value)}
                placeholder="描述您做了哪些整改修改..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmittingReReview || !reReviewSourceCode.trim() || !selectedPlanId}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                background: isSubmittingReReview || !reReviewSourceCode.trim() ? '#ccc' : '#4caf50',
                color: '#fff',
                cursor: isSubmittingReReview || !reReviewSourceCode.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                opacity: isSubmittingReReview ? 0.7 : 1,
              }}
            >
              {isSubmittingReReview ? '🔄 提交复审中...' : '📤 提交复审申请'}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderDiffSection = (title: string, items: VulnDiffItem[], icon: string, emptyText: string) => {
    if (items.length === 0) {
      return (
        <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', color: '#888' }}>{icon} {title}：{emptyText}</div>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: CHANGE_COLORS[items[0]?.change_type] || '#333' }}>
          {icon} {title}（{items.length}项）
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item, idx) => (
            <div key={idx} style={{
              padding: '10px 14px',
              background: '#fff',
              borderRadius: '6px',
              borderLeft: `4px solid ${CHANGE_COLORS[item.change_type] || '#ccc'}`,
              border: '1px solid #e0e0e0',
              borderLeftWidth: '4px',
              borderLeftColor: CHANGE_COLORS[item.change_type] || '#ccc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 500,
                  background: CHANGE_COLORS[item.change_type] + '20',
                  color: CHANGE_COLORS[item.change_type],
                }}>
                  {CHANGE_LABELS[item.change_type]}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: 500,
                  background: SEV_COLORS[item.severity] + '20',
                  color: SEV_COLORS[item.severity],
                }}>
                  {item.severity.toUpperCase()}
                </span>
                {item.old_severity && item.old_severity !== item.severity && (
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    严重性变更: {SEV_LABELS[item.old_severity]} → {SEV_LABELS[item.severity]}
                  </span>
                )}
                {item.line != null && (
                  <span style={{ fontSize: '11px', color: '#888' }}>第{item.line}行</span>
                )}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '2px' }}>{item.vulnerability_name}</div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: item.recommendation ? '4px' : 0 }}>{item.description}</div>
              {item.recommendation && (
                <div style={{ fontSize: '12px', color: '#2e7d32' }}>💡 {item.recommendation}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedReReviewResult) return null;
    const r = selectedReReviewResult;

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { setViewMode('history'); setSelectedReReviewResult(null); }} style={{
              padding: '4px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
            }}>
              ← 返回
            </button>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>📋 复审结果差异摘要</h3>
          </div>
          <button onClick={() => setShowReReview(false)} style={{
            padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            关闭
          </button>
        </div>

        <div style={{
          padding: '16px',
          background: r.recheck_passed ? '#e8f5e9' : '#fff3e0',
          borderRadius: '8px',
          border: `1px solid ${r.recheck_passed ? '#c8e6c9' : '#ffe0b2'}`,
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>{r.recheck_passed ? '✅' : '⚠️'}</span>
            <span style={{ fontSize: '16px', fontWeight: 600, color: r.recheck_passed ? '#2e7d32' : '#e65100' }}>
              {r.recheck_passed ? '复审通过' : '复审未通过'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.6 }}>{r.overall_assessment}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>整改前评分</div>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: r.old_score >= 80 ? '#2e7d32' : r.old_score >= 50 ? '#e65100' : '#b71c1c'
            }}>{r.old_score}</div>
          </div>
          <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>整改后评分</div>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: r.new_score >= 80 ? '#2e7d32' : r.new_score >= 50 ? '#e65100' : '#b71c1c'
            }}>{r.new_score}</div>
          </div>
        </div>

        <div style={{
          padding: '12px',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}>
          <span style={{ fontSize: '13px', color: '#666' }}>
            评分变化: <span style={{ fontWeight: 600, color: r.score_change >= 0 ? '#2e7d32' : '#e53935' }}>
              {r.score_change >= 0 ? '+' : ''}{r.score_change.toFixed(1)} ({r.score_change_percent >= 0 ? '+' : ''}{r.score_change_percent}%)
            </span>
          </span>
          <span style={{ color: '#ddd' }}>|</span>
          <span style={{ fontSize: '13px', color: '#666' }}>
            漏洞变化: <span style={{ fontWeight: 600, color: r.new_vulnerability_count <= r.old_vulnerability_count ? '#2e7d32' : '#e53935' }}>
              {r.old_vulnerability_count} → {r.new_vulnerability_count}
            </span>
          </span>
          <span style={{ color: '#ddd' }}>|</span>
          <span style={{ fontSize: '13px', color: '#666' }}>
            风险等级: <span style={{ fontWeight: 600 }}>{r.risk_level_change}</span>
          </span>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>📊 严重性分布对比</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {['critical', 'high', 'medium', 'low', 'info'].map(sev => {
              const diff = r.severity_diff[sev];
              if (!diff) return null;
              return (
                <div key={sev} style={{
                  padding: '8px',
                  background: '#fff',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '11px', color: SEV_COLORS[sev], fontWeight: 500, marginBottom: '4px' }}>
                    {SEV_LABELS[sev]}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#333' }}>
                    {diff.old} → {diff.new}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: diff.change < 0 ? '#2e7d32' : diff.change > 0 ? '#e53935' : '#888',
                  }}>
                    {diff.change > 0 ? `+${diff.change}` : diff.change}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {renderDiffSection('已修复的漏洞', r.resolved_vulnerabilities, '✅', '无')}
        {renderDiffSection('新增的漏洞', r.new_vulnerabilities, '🆕', '无')}
        {renderDiffSection('仍存在的漏洞', r.persistent_vulnerabilities, '⚠️', '无')}

        {r.remediation_summary && (
          <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '6px', marginTop: '12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#555' }}>📝 整改说明</div>
            <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'pre-wrap' }}>{r.remediation_summary}</div>
          </div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setViewMode('submit')} style={{
            padding: '4px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            ← 返回
          </button>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>📋 复审历史</h3>
        </div>
        <button onClick={() => setShowReReview(false)} style={{
          padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
        }}>
          关闭
        </button>
      </div>

      {reReviewResults.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          暂无复审记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reReviewResults.map(r => (
            <div key={r.id} style={{
              padding: '14px',
              background: '#fff',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              cursor: 'pointer',
            }} onClick={() => setSelectedReReviewResult(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{r.recheck_passed ? '✅' : '⚠️'}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{r.contract_name}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 500,
                    background: r.recheck_passed ? '#e8f5e9' : '#fff3e0',
                    color: r.recheck_passed ? '#2e7d32' : '#e65100',
                  }}>
                    {r.recheck_passed ? '复审通过' : '复审未通过'}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
                <span>评分: {r.old_score} → <span style={{ fontWeight: 600, color: r.score_change >= 0 ? '#2e7d32' : '#e53935' }}>{r.new_score}</span></span>
                <span>漏洞: {r.old_vulnerability_count} → {r.new_vulnerability_count}</span>
                <span>✅ 已修复 {r.resolved_vulnerabilities.length}</span>
                {r.new_vulnerabilities.length > 0 && <span style={{ color: '#e53935' }}>🆕 新增 {r.new_vulnerabilities.length}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: '900px', maxWidth: '90vw', maxHeight: '85vh',
        background: '#f5f5f5',
        borderRadius: '8px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 20px',
          borderBottom: '1px solid #e0e0e0',
          background: '#fff',
        }}>
          <button
            onClick={() => setViewMode('submit')}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: '4px',
              cursor: 'pointer', fontWeight: 500,
              background: viewMode === 'submit' ? '#4caf50' : 'transparent',
              color: viewMode === 'submit' ? '#fff' : '#666',
            }}
          >
            📝 提交复审
          </button>
          <button
            onClick={() => setViewMode('history')}
            style={{
              padding: '6px 16px', border: 'none', borderRadius: '4px',
              cursor: 'pointer', fontWeight: 500,
              background: viewMode === 'history' ? '#4caf50' : 'transparent',
              color: viewMode === 'history' ? '#fff' : '#666',
            }}
          >
            📋 复审历史 {reReviewResults.length > 0 ? `(${reReviewResults.length})` : ''}
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowReReview(false)} style={{
            padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            关闭
          </button>
        </div>

        {viewMode === 'submit' && renderSubmitForm()}
        {viewMode === 'history' && renderHistory()}
        {viewMode === 'detail' && renderDetail()}
      </div>
    </div>
  );
};
