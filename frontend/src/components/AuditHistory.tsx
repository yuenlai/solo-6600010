import React, { useEffect, useState } from 'react';
import { useAuditStore } from '../store/audit';
import { ContractHistorySummary, AuditHistoryRecord, ContractCompareResult } from '../types';

const TREND_COLORS: Record<string, string> = {
  improving: '#2e7d32',
  declining: '#b71c1c',
  stable: '#ff9800',
};

const TREND_LABELS: Record<string, string> = {
  improving: '↑ 提升',
  declining: '↓ 下降',
  stable: '— 稳定',
};

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

export const AuditHistory: React.FC = () => {
  const {
    showHistory,
    setShowHistory,
    historySummaries,
    setHistorySummaries,
    selectedContractHistory,
    setSelectedContractHistory,
    selectedCompareResult,
    setSelectedCompareResult,
    selectedContractName,
    setSelectedContractName,
  } = useAuditStore();

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'compare'>('list');

  const fetchHistorySummaries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit/history/contracts');
      const data = await res.json();
      setHistorySummaries(data);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractHistory = async (contractName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/history/contract/${encodeURIComponent(contractName)}`);
      const data = await res.json();
      setSelectedContractHistory(data);
      setSelectedContractName(contractName);
      setViewMode('detail');
    } catch (e) {
      console.error('Failed to fetch contract history:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompareResult = async (contractName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit/history/compare/${encodeURIComponent(contractName)}`);
      const data = await res.json();
      setSelectedCompareResult(data);
      setSelectedContractName(contractName);
      setViewMode('compare');
    } catch (e) {
      console.error('Failed to fetch compare result:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistorySummaries();
    }
  }, [showHistory]);

  if (!showHistory) return null;

  const renderScoreChart = (scores: { version: number; score: number }[]) => {
    const maxScore = 100;
    const chartHeight = 120;
    const chartWidth = 100;
    const barWidth = 30;
    const gap = 10;

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: chartHeight, padding: '16px 0' }}>
        {scores.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: s.score >= 80 ? '#2e7d32' : s.score >= 50 ? '#e65100' : '#b71c1c' }}>
              {s.score}
            </span>
            <div
              style={{
                width: barWidth,
                height: `${(s.score / maxScore) * (chartHeight - 30)}px`,
                background: s.score >= 80 ? '#4caf50' : s.score >= 50 ? '#ff9800' : '#e53935',
                borderRadius: '4px 4px 0 0',
              }}
            />
            <span style={{ fontSize: '9px', color: '#888' }}>v{s.version}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderList = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>审计历史归档</h3>
        <button onClick={() => setShowHistory(false)} style={{
          padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
        }}>
          关闭
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : historySummaries.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
          暂无审计历史记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {historySummaries.map((summary: ContractHistorySummary) => (
          <div key={summary.contract_name} style={{
            padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{summary.contract_name}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                共 {summary.audit_count} 次审计 · 首次: {new Date(summary.first_audit_at).toLocaleString()}
              </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500,
                  background: TREND_COLORS[summary.score_trend] + '20',
                  color: TREND_COLORS[summary.score_trend]
                }}>
                  {TREND_LABELS[summary.score_trend]}
                </div>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: summary.latest_score >= 80 ? '#e8f5e9' : summary.latest_score >= 50 ? '#fff3e0' : '#ffebee',
                  fontSize: '16px', fontWeight: 'bold',
                  color: summary.latest_score >= 80 ? '#2e7d32' : summary.latest_score >= 50 ? '#e65100' : '#b71c1c'
                }}>
                  {summary.latest_score}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => fetchContractHistory(summary.contract_name)} style={{
                padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#2196f3',
                color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500
              }}>
                查看历史
              </button>
              {summary.audit_count >= 2 && (
                <button onClick={() => fetchCompareResult(summary.contract_name)} style={{
                  padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#4caf50',
                  color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500
                }}>
                  分数对比
                </button>
              )}
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );

  const renderDetail = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setViewMode('list')} style={{
            padding: '4px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            ← 返回
          </button>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            {selectedContractName} - 审计历史
          </h3>
        </div>
        <button onClick={() => setShowHistory(false)} style={{
          padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
        }}>
          关闭
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'auto' }}>
          {selectedContractHistory.map((record: AuditHistoryRecord) => (
          <div key={record.id} style={{
            padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: 600 }}>版本 {record.version}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  {new Date(record.audited_at).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {record.vulnerabilities.length} 个漏洞
                </div>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: record.score >= 80 ? '#e8f5e9' : record.score >= 50 ? '#fff3e0' : '#ffebee',
                  fontSize: '16px', fontWeight: 'bold',
                  color: record.score >= 80 ? '#2e7d32' : record.score >= 50 ? '#e65100' : '#b71c1c'
                }}>
                  {record.score}
                </div>
              </div>
            </div>
            {record.vulnerabilities.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {record.vulnerabilities.map((v: any) => (
                <span key={v.id} style={{
                  padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                  background: SEV_COLORS[v.severity] + '20',
                  color: SEV_COLORS[v.severity]
                }}>
                  {v.name}
                </span>
              ))}
              </div>
            )}
          </div>
        ))}
        </div>
      )}
    </div>
  );

  const renderCompare = () => {
    if (!selectedCompareResult) return null;
    const cr = selectedCompareResult;
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setViewMode('list')} style={{
              padding: '4px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
            }}>
              ← 返回
            </button>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              {cr.contract_name} - 分数对比分析
            </h3>
          </div>
          <button onClick={() => setShowHistory(false)} style={{
            padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            关闭
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{
            padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', color: '#888' }}>首次审计 (v{cr.first_audit.version})</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cr.first_audit.score >= 80 ? '#e8f5e9' : cr.first_audit.score >= 50 ? '#fff3e0' : '#ffebee',
                fontSize: '28px', fontWeight: 'bold',
                color: cr.first_audit.score >= 80 ? '#2e7d32' : cr.first_audit.score >= 50 ? '#e65100' : '#b71c1c'
              }}>
                {cr.first_audit.score}
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>漏洞数: {cr.first_audit.vulnerabilities.length}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  {new Date(cr.first_audit.audited_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', color: '#888' }}>最新审计 (v{cr.latest_audit.version})</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: cr.latest_audit.score >= 80 ? '#e8f5e9' : cr.latest_audit.score >= 50 ? '#fff3e0' : '#ffebee',
                fontSize: '28px', fontWeight: 'bold',
                color: cr.latest_audit.score >= 80 ? '#2e7d32' : cr.latest_audit.score >= 50 ? '#e65100' : '#b71c1c'
              }}>
                {cr.latest_audit.score}
              </div>
              <div>
                <div style={{ fontSize: '14px', color: '#666' }}>漏洞数: {cr.latest_audit.vulnerabilities.length}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  {new Date(cr.latest_audit.audited_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff', marginBottom: '20px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '16px' }}>变化统计</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px', fontWeight: 'bold',
                color: cr.score_change >= 0 ? '#2e7d32' : '#b71c1c'
              }}>
                {cr.score_change >= 0 ? '+' : ''}{cr.score_change}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>分数变化</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px', fontWeight: 'bold',
                color: cr.vuln_count_change <= 0 ? '#2e7d32' : '#b71c1c'
              }}>
                {cr.vuln_count_change > 0 ? '+' : ''}{cr.vuln_count_change}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>漏洞数变化</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>
                {cr.audit_count}
              </div>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>审计次数</div>
            </div>
          </div>
        </div>

        <div style={{
          padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>分数趋势图</div>
          {renderScoreChart(cr.all_scores)}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        width: '800px', maxWidth: '90vw', maxHeight: '80vh',
        background: '#f5f5f5',
        borderRadius: '8px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {viewMode === 'list' && renderList()}
        {viewMode === 'detail' && renderDetail()}
        {viewMode === 'compare' && renderCompare()}
      </div>
    </div>
  );
};
