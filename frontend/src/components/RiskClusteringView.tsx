import React, { useState } from 'react';
import { useAuditStore } from '../store/audit';
import { RiskCluster, RiskClusterVulnRef } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const PRIORITY_COLORS: Record<string, string> = {
  'P0': '#b71c1c', 'P1': '#e53935', 'P2': '#ff9800', 'P3': '#666'
};

const CATEGORY_ICONS: Record<string, string> = {
  fund_safety: '💰',
  access_control: '🔐',
  external_call: '📡',
  logic_security: '🧠',
  code_quality: '🔍',
  other: '⚠️',
};

const getPriorityBadge = (fixPriority: string) => {
  const match = fixPriority.match(/^(P\d)/);
  return match ? match[1] : 'P2';
};

const SeverityBar: React.FC<{ vulns: RiskClusterVulnRef[] }> = ({ vulns }) => {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  vulns.forEach(v => { counts[v.severity] = (counts[v.severity] || 0) + 1; });
  const total = vulns.length || 1;
  return (
    <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', background: '#333', marginBottom: '8px' }}>
      {['critical', 'high', 'medium', 'low', 'info'].map(sev => (
        counts[sev] > 0 ? (
          <div key={sev} style={{ width: `${(counts[sev] / total) * 100}%`, background: SEV_COLORS[sev], minWidth: '2px' }} />
        ) : null
      ))}
    </div>
  );
};

const ClusterCard: React.FC<{ cluster: RiskCluster; isExpanded: boolean; onToggle: () => void }> = ({ cluster, isExpanded, onToggle }) => {
  const priorityBadge = getPriorityBadge(cluster.fix_priority);
  const icon = CATEGORY_ICONS[cluster.category] || '⚠️';

  return (
    <div style={{ marginBottom: '10px', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ padding: '12px 16px', background: '#252526', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: '#d4d4d4', fontWeight: 600, fontSize: '14px' }}>{cluster.category_label}</span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[cluster.highest_severity] }}>
              {cluster.highest_severity}
            </span>
            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', color: '#fff', background: PRIORITY_COLORS[priorityBadge] || '#666', fontWeight: 600 }}>
              {priorityBadge}
            </span>
            <span style={{ fontSize: '11px', color: '#888', background: '#333', padding: '2px 8px', borderRadius: '10px' }}>
              {cluster.vulnerability_count} 个漏洞
            </span>
          </div>
          <SeverityBar vulns={cluster.vulnerabilities} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {cluster.affected_contracts.slice(0, 3).map(c => (
            <span key={c} style={{ fontSize: '10px', padding: '2px 6px', background: '#e3f2fd22', color: '#64b5f6', borderRadius: '4px', border: '1px solid #64b5f644' }}>{c}</span>
          ))}
          {cluster.affected_contracts.length > 3 && (
            <span style={{ fontSize: '10px', color: '#888' }}>+{cluster.affected_contracts.length - 3}</span>
          )}
        </div>
        <span style={{ color: '#888', fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div style={{ padding: '12px 16px', background: '#1e1e1e' }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#ff9800', marginBottom: '6px', fontWeight: 600 }}>影响面</div>
            <div style={{ fontSize: '12px', color: '#ccc', lineHeight: 1.6 }}>{cluster.impact_scope}</div>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontWeight: 500 }}>修复优先级</div>
              <div style={{ fontSize: '13px', color: PRIORITY_COLORS[priorityBadge], fontWeight: 600 }}>{cluster.fix_priority}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px', fontWeight: 500 }}>预估工作量</div>
              <div style={{ fontSize: '13px', color: '#d4d4d4' }}>{cluster.fix_effort}</div>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#4caf50', marginBottom: '6px', fontWeight: 600 }}>整体修复建议</div>
            <div style={{ fontSize: '12px', color: '#ccc', lineHeight: 1.6, padding: '8px', background: '#1a2e1a', borderRadius: '4px', borderLeft: '3px solid #4caf50' }}>
              {cluster.unified_recommendation}
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 500 }}>涉及合约</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {cluster.affected_contracts.map(c => (
                <span key={c} style={{ fontSize: '11px', padding: '3px 8px', background: '#e3f2fd22', color: '#64b5f6', borderRadius: '4px', border: '1px solid #64b5f644' }}>{c}</span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 500 }}>漏洞明细</div>
            {cluster.vulnerabilities.map((v, idx) => (
              <div key={`${v.vulnerability_name}-${v.contract_name}-${v.line}-${idx}`} style={{ padding: '8px 10px', marginBottom: '6px', borderRadius: '4px', background: '#252526', borderLeft: `3px solid ${SEV_COLORS[v.severity]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#d4d4d4' }}>{v.vulnerability_name}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[v.severity] }}>{v.severity}</span>
                    <span style={{ fontSize: '10px', color: '#888' }}>{v.contract_name} :{v.line}</span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#999', lineHeight: 1.5 }}>{v.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const RiskClusteringView: React.FC = () => {
  const { riskClusteringResult, showRiskClustering, setShowRiskClustering, isClusteringRisks } = useAuditStore();
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clusters' | 'strategy'>('clusters');

  if (!showRiskClustering) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
    alignItems: 'center', justifyContent: 'center'
  };

  const panelStyle: React.CSSProperties = {
    background: '#1e1e1e', borderRadius: '12px', width: '780px', maxHeight: '85vh',
    overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid #333'
  };

  return (
    <div style={overlayStyle} onClick={() => setShowRiskClustering(false)}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333', position: 'sticky', top: 0, background: '#1e1e1e', zIndex: 1 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>🎯 风险聚类视图</span>
          <button onClick={() => setShowRiskClustering(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {isClusteringRisks && !riskClusteringResult && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
            <div>正在进行风险聚类分析...</div>
          </div>
        )}

        {!isClusteringRisks && !riskClusteringResult && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
            <div>暂无分析结果，请先运行风险聚类</div>
          </div>
        )}

        {riskClusteringResult && (
          <>
            <div style={{ padding: '16px 20px', background: '#252526', borderBottom: '1px solid #333' }}>
              <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, marginBottom: '12px' }}>
                {riskClusteringResult.clustering_summary}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e53935' }}>{riskClusteringResult.total_vulnerabilities}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>漏洞总数</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2196f3' }}>{riskClusteringResult.total_clusters}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>风险类别</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#b71c1c' }}>{riskClusteringResult.critical_clusters}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>严重类别</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff9800' }}>{riskClusteringResult.high_clusters}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>高危类别</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setActiveTab('clusters')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'clusters' ? '#e53935' : '#333', color: activeTab === 'clusters' ? '#fff' : '#aaa' }}>🎯 风险归组</button>
              <button onClick={() => setActiveTab('strategy')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'strategy' ? '#e53935' : '#333', color: activeTab === 'strategy' ? '#fff' : '#aaa' }}>📋 修复策略</button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {activeTab === 'clusters' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px', padding: '8px', background: '#e3f2fd11', borderRadius: '4px', border: '1px solid #2196f322' }}>
                    按影响面将同类漏洞归组，每组给出整体修复优先级和统一修复建议，帮助集中处理同类别风险。
                  </div>
                  {riskClusteringResult.clusters.length === 0 && (
                    <div style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px' }}>未发现风险聚类</div>
                  )}
                  {riskClusteringResult.clusters.map(cluster => (
                    <ClusterCard
                      key={cluster.cluster_id}
                      cluster={cluster}
                      isExpanded={expandedCluster === cluster.cluster_id}
                      onToggle={() => setExpandedCluster(expandedCluster === cluster.cluster_id ? null : cluster.cluster_id)}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'strategy' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#4caf50', marginBottom: '12px', padding: '8px', background: '#1b5e2011', borderRadius: '4px', border: '1px solid #4caf5022' }}>
                    基于风险聚类结果，按优先级从高到低给出整体修复策略建议。
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#d4d4d4', marginBottom: '10px' }}>整体修复策略</div>
                    {riskClusteringResult.overall_fix_strategy.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '8px', padding: '10px', background: '#252526', borderRadius: '6px' }}>
                        <div style={{
                          width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: idx < 2 ? '#b71c1c' : idx < 4 ? '#ff9800' : '#333',
                          color: '#fff', fontSize: '12px', fontWeight: 'bold', flexShrink: 0,
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.5, paddingTop: '2px' }}>{step}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#d4d4d4', marginBottom: '10px' }}>各类别修复优先级总览</div>
                    {riskClusteringResult.clusters.map(cluster => {
                      const priorityBadge = getPriorityBadge(cluster.fix_priority);
                      const icon = CATEGORY_ICONS[cluster.category] || '⚠️';
                      return (
                        <div key={cluster.cluster_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '6px', background: '#252526', borderRadius: '6px' }}>
                          <span style={{ fontSize: '16px' }}>{icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#d4d4d4' }}>{cluster.category_label}</span>
                            <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>{cluster.vulnerability_count} 个漏洞 · {cluster.affected_contracts.length} 份合约</span>
                          </div>
                          <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '4px', color: '#fff', background: PRIORITY_COLORS[priorityBadge], fontWeight: 600 }}>{cluster.fix_priority}</span>
                          <span style={{ fontSize: '11px', color: '#888' }}>{cluster.fix_effort}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
