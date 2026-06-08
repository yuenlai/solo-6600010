import React, { useState } from 'react';
import { useAuditStore } from '../store/audit';
import { ContractFamily, FamilyDuplicateRisk, FamilyDifferentialRisk, ContractSimilarity } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const SIM_COLORS = (sim: number) => {
  if (sim >= 0.7) return '#4caf50';
  if (sim >= 0.4) return '#ff9800';
  return '#e53935';
};

const FamilyMember: React.FC<{ name: string; index: number }> = ({ name, index }) => (
  <span style={{ fontSize: '12px', padding: '3px 8px', background: index === 0 ? '#e3f2fd' : '#f5f5f5', color: index === 0 ? '#1565c0' : '#555', borderRadius: '12px', border: '1px solid', borderColor: index === 0 ? '#90caf9' : '#e0e0e0' }}>{name}</span>
);

const SimilarityHeatMap: React.FC<{ family: ContractFamily }> = ({ family }) => {
  if (family.members.length < 2) return null;
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>相似度矩阵</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '11px', minWidth: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '4px 8px', borderBottom: '1px solid #333', color: '#888', textAlign: 'left' }}></th>
              {family.members.map(m => (
                <th key={m} style={{ padding: '4px 8px', borderBottom: '1px solid #333', color: '#aaa', fontWeight: 400, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {family.members.map((row, ri) => (
              <tr key={row}>
                <td style={{ padding: '4px 8px', color: '#aaa', fontWeight: 500, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row}</td>
                {family.members.map((col, ci) => {
                  if (ri === ci) return <td key={col} style={{ padding: '4px 8px', textAlign: 'center', color: '#666' }}>-</td>;
                  const simEntry = family.similarity_matrix[row]?.find((s: ContractSimilarity) => s.contract_name === col);
                  const sim = simEntry?.similarity ?? 0;
                  return (
                    <td key={col} style={{ padding: '4px 8px', textAlign: 'center', background: `${SIM_COLORS(sim)}22`, color: SIM_COLORS(sim), fontWeight: 600, borderRadius: '2px' }}>
                      {(sim * 100).toFixed(0)}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DuplicateRiskCard: React.FC<{ risk: FamilyDuplicateRisk }> = ({ risk }) => (
  <div style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px', borderLeft: `4px solid ${SEV_COLORS[risk.severity] || '#ccc'}`, background: '#fafafa' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontWeight: 600, fontSize: '13px', color: '#333' }}>{risk.vulnerability_name}</span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[risk.severity] }}>{risk.severity}</span>
        <span style={{ fontSize: '11px', color: '#d32f2f', background: '#ffebee', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{risk.occurrence_count} 份合约</span>
      </div>
    </div>
    <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px', lineHeight: 1.5 }}>
      <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#e53935' }}>问题描述</span>
      {risk.description}
    </div>
    <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '8px', lineHeight: 1.5 }}>
      <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#388e3c' }}>修复建议</span>
      {risk.recommendation}
    </div>
    <div style={{ padding: '8px', background: '#fff3e0', borderRadius: '4px', marginBottom: '8px', fontSize: '12px', color: '#e65100', lineHeight: 1.5 }}>
      <strong>⚠ 风险放大：</strong>{risk.risk_amplification}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: '#888', marginRight: '4px' }}>受影响合约：</span>
      {risk.affected_contracts.map(c => (
        <span key={c} style={{ fontSize: '10px', padding: '2px 6px', background: '#ffebee', color: '#c62828', borderRadius: '4px' }}>{c}</span>
      ))}
    </div>
  </div>
);

const DifferentialRiskCard: React.FC<{ risk: FamilyDifferentialRisk }> = ({ risk }) => (
  <div style={{ padding: '12px', marginBottom: '8px', borderRadius: '8px', borderLeft: `4px solid ${SEV_COLORS[risk.severity] || '#ccc'}`, background: '#fafafa' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div>
        <span style={{ fontWeight: 600, fontSize: '13px', color: '#333' }}>{risk.vulnerability_name}</span>
        <span style={{ fontSize: '11px', color: '#1565c0', marginLeft: '8px' }}>存在于 {risk.contract_name} 第 {risk.line} 行</span>
      </div>
      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[risk.severity] }}>{risk.severity}</span>
    </div>
    <div style={{ fontSize: '12px', color: '#c62828', marginBottom: '6px', lineHeight: 1.5 }}>
      <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#e53935' }}>问题描述</span>
      {risk.description}
    </div>
    <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '8px', lineHeight: 1.5 }}>
      <span style={{ display: 'inline-block', width: '60px', fontWeight: 500, color: '#388e3c' }}>修复建议</span>
      {risk.recommendation}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
      <span style={{ fontSize: '11px', color: '#888', marginRight: '4px' }}>未出现在：</span>
      {risk.missing_in.map(c => (
        <span key={c} style={{ fontSize: '10px', padding: '2px 6px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '4px' }}>{c}</span>
      ))}
    </div>
  </div>
);

export const ContractFamilyAnalysis: React.FC = () => {
  const { familyAnalysisResult, showFamilyAnalysis, setShowFamilyAnalysis, isAnalyzingFamily } = useAuditStore();
  const [activeTab, setActiveTab] = useState<'families' | 'duplicate' | 'differential'>('families');
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  if (!showFamilyAnalysis) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
    alignItems: 'center', justifyContent: 'center'
  };

  const panelStyle: React.CSSProperties = {
    background: '#1e1e1e', borderRadius: '12px', width: '720px', maxHeight: '85vh',
    overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid #333'
  };

  return (
    <div style={overlayStyle} onClick={() => setShowFamilyAnalysis(false)}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333', position: 'sticky', top: 0, background: '#1e1e1e', zIndex: 1 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>🧬 合约家族分析</span>
          <button onClick={() => setShowFamilyAnalysis(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {isAnalyzingFamily && !familyAnalysisResult && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
            <div>正在分析合约家族关系...</div>
          </div>
        )}

        {!isAnalyzingFamily && !familyAnalysisResult && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
            <div>暂无分析结果，请先运行家族分析</div>
          </div>
        )}

        {familyAnalysisResult && (
          <>
            <div style={{ padding: '16px 20px', background: '#252526', borderBottom: '1px solid #333' }}>
              <div style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6, marginBottom: '12px' }}>
                {familyAnalysisResult.analysis_summary}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#4caf50' }}>{familyAnalysisResult.total_contracts}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>合约总数</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2196f3' }}>{familyAnalysisResult.total_families}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>合约家族</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#e53935' }}>{familyAnalysisResult.duplicate_risks.length}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>重复风险</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ff9800' }}>{familyAnalysisResult.differential_risks.length}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>差异风险</div>
                </div>
                {familyAnalysisResult.cross_family_risks > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#9c27b0' }}>{familyAnalysisResult.cross_family_risks}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>跨家族风险</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setActiveTab('families')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'families' ? '#e53935' : '#333', color: activeTab === 'families' ? '#fff' : '#aaa' }}>🏠 家族总览</button>
              <button onClick={() => setActiveTab('duplicate')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'duplicate' ? '#e53935' : '#333', color: activeTab === 'duplicate' ? '#fff' : '#aaa' }}>🔄 重复风险</button>
              <button onClick={() => setActiveTab('differential')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'differential' ? '#e53935' : '#333', color: activeTab === 'differential' ? '#fff' : '#aaa' }}>⚡ 差异风险</button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {activeTab === 'families' && (
                <div>
                  {familyAnalysisResult.families.map(family => (
                    <div key={family.family_id} style={{ marginBottom: '12px', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
                      <div onClick={() => setExpandedFamily(expandedFamily === family.family_id ? null : family.family_id)} style={{ padding: '12px 16px', background: '#252526', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '14px' }}>{family.members.length >= 2 ? '👨‍👩‍👧‍👦' : '👤'}</span>
                          <span style={{ color: '#d4d4d4', fontWeight: 600, fontSize: '13px' }}>{family.family_name}</span>
                          <span style={{ fontSize: '11px', color: '#888', background: '#333', padding: '2px 8px', borderRadius: '10px' }}>{family.members.length} 份合约</span>
                          {family.avg_similarity > 0 && family.members.length >= 2 && (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', color: SIM_COLORS(family.avg_similarity), background: `${SIM_COLORS(family.avg_similarity)}22` }}>平均相似度 {(family.avg_similarity * 100).toFixed(0)}%</span>
                          )}
                        </div>
                        <span style={{ color: '#888', fontSize: '12px' }}>{expandedFamily === family.family_id ? '▼' : '▶'}</span>
                      </div>
                      {expandedFamily === family.family_id && (
                        <div style={{ padding: '12px 16px', background: '#1e1e1e' }}>
                          <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 500 }}>家族成员</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {family.members.map((m, i) => <FamilyMember key={m} name={m} index={i} />)}
                            </div>
                          </div>
                          {family.shared_vulnerability_patterns.length > 0 && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 500 }}>共有漏洞模式</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {family.shared_vulnerability_patterns.map(p => (
                                  <span key={p} style={{ fontSize: '11px', padding: '3px 8px', background: '#b71c1c22', color: '#ef5350', borderRadius: '4px', border: '1px solid #b71c1c44' }}>{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <SimilarityHeatMap family={family} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'duplicate' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#ff9800', marginBottom: '12px', padding: '8px', background: '#fff3e022', borderRadius: '4px', border: '1px solid #ff980044' }}>
                    重复风险表示同一漏洞在家族内的多份相似合约中重复出现，风险因合约数量增加而放大。
                  </div>
                  {familyAnalysisResult.duplicate_risks.length === 0 && (
                    <div style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px' }}>未发现重复风险</div>
                  )}
                  {familyAnalysisResult.duplicate_risks.map((risk, idx) => (
                    <DuplicateRiskCard key={`${risk.vulnerability_name}-${idx}`} risk={risk} />
                  ))}
                </div>
              )}

              {activeTab === 'differential' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#2196f3', marginBottom: '12px', padding: '8px', background: '#e3f2fd22', borderRadius: '4px', border: '1px solid #2196f344' }}>
                    差异风险表示相似合约中部分合约存在独特漏洞，而其他家族成员不受影响，需重点关注差异原因。
                  </div>
                  {familyAnalysisResult.differential_risks.length === 0 && (
                    <div style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px' }}>未发现差异风险</div>
                  )}
                  {familyAnalysisResult.differential_risks.map((risk, idx) => (
                    <DifferentialRiskCard key={`${risk.vulnerability_name}-${risk.contract_name}-${idx}`} risk={risk} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
