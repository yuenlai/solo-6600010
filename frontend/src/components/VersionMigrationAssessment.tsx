import React, { useState } from 'react';
import { useAuditStore } from '../store/audit';
import { MigrationVulnChange, MigrationRiskItem, MigrationBenefitItem } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  resolved: '#4caf50', added: '#e53935', persistent: '#ff9800'
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  resolved: '已修复', added: '新增', persistent: '持续存在'
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  '低风险': '#4caf50', '中风险': '#ff9800', '高风险': '#e53935', '极高风险': '#b71c1c'
};

const VulnChangeCard: React.FC<{ change: MigrationVulnChange }> = ({ change }) => (
  <div style={{
    padding: '10px 12px', marginBottom: '8px', borderRadius: '6px',
    borderLeft: `4px solid ${CHANGE_TYPE_COLORS[change.change_type]}`,
    background: '#252526'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
      <span style={{ fontWeight: 600, fontSize: '13px', color: '#d4d4d4' }}>{change.vulnerability_name}</span>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[change.severity] }}>{change.severity}</span>
        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: CHANGE_TYPE_COLORS[change.change_type] }}>{CHANGE_TYPE_LABELS[change.change_type]}</span>
      </div>
    </div>
    <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.5 }}>
      {change.description}
    </div>
    {change.line && (
      <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>第 {change.line} 行</div>
    )}
  </div>
);

const RiskCard: React.FC<{ risk: MigrationRiskItem }> = ({ risk }) => (
  <div style={{
    padding: '12px', marginBottom: '8px', borderRadius: '8px',
    borderLeft: `4px solid ${SEV_COLORS[risk.severity]}`,
    background: '#2a1a1a'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontWeight: 600, fontSize: '13px', color: '#ef5350' }}>{risk.description}</span>
      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[risk.severity] }}>{risk.severity}</span>
    </div>
    <div style={{ fontSize: '12px', color: '#ff9800', marginBottom: '6px', lineHeight: 1.5 }}>
      <span style={{ color: '#ff9800', fontWeight: 500 }}>影响：</span>{risk.impact}
    </div>
    <div style={{ fontSize: '12px', color: '#4caf50', lineHeight: 1.5 }}>
      <span style={{ color: '#4caf50', fontWeight: 500 }}>建议：</span>{risk.recommendation}
    </div>
  </div>
);

const BenefitCard: React.FC<{ benefit: MigrationBenefitItem }> = ({ benefit }) => (
  <div style={{
    padding: '12px', marginBottom: '8px', borderRadius: '8px',
    borderLeft: '4px solid #4caf50',
    background: '#1a2a1a'
  }}>
    <div style={{ fontWeight: 600, fontSize: '13px', color: '#66bb6a', marginBottom: '6px' }}>{benefit.description}</div>
    <div style={{ fontSize: '12px', color: '#81c784', lineHeight: 1.5 }}>
      <span style={{ color: '#81c784', fontWeight: 500 }}>影响：</span>{benefit.impact}
    </div>
  </div>
);

export const VersionMigrationAssessment: React.FC = () => {
  const { migrationAssessmentResult, showMigrationAssessment, setShowMigrationAssessment, isAssessingMigration } = useAuditStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'vulns' | 'risks' | 'benefits'>('overview');

  if (!showMigrationAssessment) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
    alignItems: 'center', justifyContent: 'center'
  };

  const panelStyle: React.CSSProperties = {
    background: '#1e1e1e', borderRadius: '12px', width: '800px', maxHeight: '85vh',
    overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', border: '1px solid #333'
  };

  return (
    <div style={overlayStyle} onClick={() => setShowMigrationAssessment(false)}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333', position: 'sticky', top: 0, background: '#1e1e1e', zIndex: 1 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>🔄 合约版本迁移评估</span>
          <button onClick={() => setShowMigrationAssessment(false)} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>

        {isAssessingMigration && !migrationAssessmentResult && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
            <div>正在评估版本迁移风险...</div>
          </div>
        )}

        {!isAssessingMigration && !migrationAssessmentResult && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>📊</div>
            <div>暂无评估结果，请先运行迁移评估</div>
          </div>
        )}

        {migrationAssessmentResult && (
          <>
            <div style={{ padding: '16px 20px', background: '#252526', borderBottom: '1px solid #333' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: migrationAssessmentResult.migration_score >= 80 ? '#1b5e2022' : migrationAssessmentResult.migration_score >= 60 ? '#e6510022' : '#b71c1c22',
                  border: `3px solid ${RISK_LEVEL_COLORS[migrationAssessmentResult.risk_level] || '#ff9800'}`
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: RISK_LEVEL_COLORS[migrationAssessmentResult.risk_level] || '#ff9800' }}>{migrationAssessmentResult.migration_score}</div>
                    <div style={{ fontSize: '9px', color: '#888' }}>迁移评分</div>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#d4d4d4', marginBottom: '4px' }}>{migrationAssessmentResult.contract_name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '12px', color: '#fff', background: RISK_LEVEL_COLORS[migrationAssessmentResult.risk_level] || '#ff9800', fontWeight: 600 }}>
                      {migrationAssessmentResult.risk_level}
                    </span>
                    <span style={{ fontSize: '12px', color: '#888' }}>{migrationAssessmentResult.code_diff_summary}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#1e1e1e', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: migrationAssessmentResult.old_score >= 80 ? '#4caf50' : migrationAssessmentResult.old_score >= 50 ? '#ff9800' : '#e53935' }}>{migrationAssessmentResult.old_score}</span>
                    <span style={{ fontSize: '14px', color: '#666' }}>→</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: migrationAssessmentResult.new_score >= 80 ? '#4caf50' : migrationAssessmentResult.new_score >= 50 ? '#ff9800' : '#e53935' }}>{migrationAssessmentResult.new_score}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>安全评分变化</div>
                  <div style={{ fontSize: '12px', color: migrationAssessmentResult.score_change >= 0 ? '#4caf50' : '#e53935', fontWeight: 600 }}>
                    {migrationAssessmentResult.score_change >= 0 ? '+' : ''}{migrationAssessmentResult.score_change}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#1e1e1e', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>{migrationAssessmentResult.old_vulnerability_count}</span>
                    <span style={{ fontSize: '14px', color: '#666' }}>→</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>{migrationAssessmentResult.new_vulnerability_count}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>漏洞数量变化</div>
                  <div style={{ fontSize: '12px', color: migrationAssessmentResult.vulnerability_change <= 0 ? '#4caf50' : '#e53935', fontWeight: 600 }}>
                    {migrationAssessmentResult.vulnerability_change >= 0 ? '+' : ''}{migrationAssessmentResult.vulnerability_change}
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#1e1e1e', borderRadius: '6px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4caf50' }}>{migrationAssessmentResult.resolved_vulnerabilities.length}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>已修复漏洞</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#1e1e1e', borderRadius: '6px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e53935' }}>{migrationAssessmentResult.new_vulnerabilities.length}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>新增漏洞</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: '8px', background: '#1e1e1e', borderRadius: '6px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff9800' }}>{migrationAssessmentResult.persistent_vulnerabilities.length}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>持续漏洞</div>
                </div>
              </div>

              <div style={{ padding: '10px 14px', borderRadius: '6px', background: migrationAssessmentResult.migration_score >= 80 ? '#1b5e2022' : migrationAssessmentResult.migration_score >= 60 ? '#e6510022' : '#b71c1c22', border: `1px solid ${RISK_LEVEL_COLORS[migrationAssessmentResult.risk_level] || '#ff9800'}44` }}>
                <div style={{ fontSize: '12px', color: '#d4d4d4', lineHeight: 1.6 }}>
                  <strong style={{ color: RISK_LEVEL_COLORS[migrationAssessmentResult.risk_level] || '#ff9800' }}>📌 总体建议：</strong>{migrationAssessmentResult.overall_recommendation}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '4px', padding: '8px 20px', borderBottom: '1px solid #333' }}>
              <button onClick={() => setActiveTab('overview')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'overview' ? '#e53935' : '#333', color: activeTab === 'overview' ? '#fff' : '#aaa' }}>📊 总览</button>
              <button onClick={() => setActiveTab('vulns')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'vulns' ? '#e53935' : '#333', color: activeTab === 'vulns' ? '#fff' : '#aaa' }}>🔍 漏洞对比</button>
              <button onClick={() => setActiveTab('risks')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'risks' ? '#e53935' : '#333', color: activeTab === 'risks' ? '#fff' : '#aaa' }}>⚠️ 迁移风险</button>
              <button onClick={() => setActiveTab('benefits')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, background: activeTab === 'benefits' ? '#e53935' : '#333', color: activeTab === 'benefits' ? '#fff' : '#aaa' }}>✅ 迁移收益</button>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {activeTab === 'overview' && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#d4d4d4', marginBottom: '10px' }}>漏洞变化概览</div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {migrationAssessmentResult.resolved_vulnerabilities.length > 0 && (
                        <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1a2a1a', border: '1px solid #4caf5044' }}>
                          <div style={{ fontSize: '12px', color: '#4caf50', fontWeight: 600, marginBottom: '8px' }}>✅ 已修复 ({migrationAssessmentResult.resolved_vulnerabilities.length})</div>
                          {migrationAssessmentResult.resolved_vulnerabilities.map((v, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#81c784', marginBottom: '4px' }}>• {v.vulnerability_name} <span style={{ color: '#888' }}>({v.severity})</span></div>
                          ))}
                        </div>
                      )}
                      {migrationAssessmentResult.new_vulnerabilities.length > 0 && (
                        <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#2a1a1a', border: '1px solid #e5393544' }}>
                          <div style={{ fontSize: '12px', color: '#e53935', fontWeight: 600, marginBottom: '8px' }}>🔴 新增 ({migrationAssessmentResult.new_vulnerabilities.length})</div>
                          {migrationAssessmentResult.new_vulnerabilities.map((v, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#ef5350', marginBottom: '4px' }}>• {v.vulnerability_name} <span style={{ color: '#888' }}>({v.severity})</span></div>
                          ))}
                        </div>
                      )}
                      {migrationAssessmentResult.persistent_vulnerabilities.length > 0 && (
                        <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#2a2415', border: '1px solid #ff980044' }}>
                          <div style={{ fontSize: '12px', color: '#ff9800', fontWeight: 600, marginBottom: '8px' }}>🟡 持续 ({migrationAssessmentResult.persistent_vulnerabilities.length})</div>
                          {migrationAssessmentResult.persistent_vulnerabilities.map((v, i) => (
                            <div key={i} style={{ fontSize: '12px', color: '#ffb74d', marginBottom: '4px' }}>• {v.vulnerability_name} <span style={{ color: '#888' }}>({v.severity})</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#d4d4d4', marginBottom: '10px' }}>风险与收益摘要</div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#2a1a1a', border: '1px solid #e5393544' }}>
                        <div style={{ fontSize: '12px', color: '#e53935', fontWeight: 600, marginBottom: '6px' }}>⚠️ 风险项 ({migrationAssessmentResult.risks.length})</div>
                        {migrationAssessmentResult.risks.length === 0 && (
                          <div style={{ fontSize: '12px', color: '#888' }}>未发现明显风险</div>
                        )}
                        {migrationAssessmentResult.risks.slice(0, 3).map((r, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#ef5350', marginBottom: '4px' }}>• {r.description}</div>
                        ))}
                        {migrationAssessmentResult.risks.length > 3 && (
                          <div style={{ fontSize: '11px', color: '#888' }}>...还有 {migrationAssessmentResult.risks.length - 3} 项风险</div>
                        )}
                      </div>
                      <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1a2a1a', border: '1px solid #4caf5044' }}>
                        <div style={{ fontSize: '12px', color: '#4caf50', fontWeight: 600, marginBottom: '6px' }}>✅ 收益项 ({migrationAssessmentResult.benefits.length})</div>
                        {migrationAssessmentResult.benefits.length === 0 && (
                          <div style={{ fontSize: '12px', color: '#888' }}>未发现明显收益</div>
                        )}
                        {migrationAssessmentResult.benefits.slice(0, 3).map((b, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#81c784', marginBottom: '4px' }}>• {b.description}</div>
                        ))}
                        {migrationAssessmentResult.benefits.length > 3 && (
                          <div style={{ fontSize: '11px', color: '#888' }}>...还有 {migrationAssessmentResult.benefits.length - 3} 项收益</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vulns' && (
                <div>
                  {migrationAssessmentResult.resolved_vulnerabilities.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#4caf50', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✅ 已修复漏洞 ({migrationAssessmentResult.resolved_vulnerabilities.length})
                      </div>
                      {migrationAssessmentResult.resolved_vulnerabilities.map((v, i) => (
                        <VulnChangeCard key={`resolved-${i}`} change={v} />
                      ))}
                    </div>
                  )}

                  {migrationAssessmentResult.new_vulnerabilities.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#e53935', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🔴 新增漏洞 ({migrationAssessmentResult.new_vulnerabilities.length})
                      </div>
                      {migrationAssessmentResult.new_vulnerabilities.map((v, i) => (
                        <VulnChangeCard key={`new-${i}`} change={v} />
                      ))}
                    </div>
                  )}

                  {migrationAssessmentResult.persistent_vulnerabilities.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ff9800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🟡 持续存在漏洞 ({migrationAssessmentResult.persistent_vulnerabilities.length})
                      </div>
                      {migrationAssessmentResult.persistent_vulnerabilities.map((v, i) => (
                        <VulnChangeCard key={`persist-${i}`} change={v} />
                      ))}
                    </div>
                  )}

                  {migrationAssessmentResult.resolved_vulnerabilities.length === 0 && migrationAssessmentResult.new_vulnerabilities.length === 0 && migrationAssessmentResult.persistent_vulnerabilities.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '13px' }}>两个版本的漏洞状况完全相同</div>
                  )}
                </div>
              )}

              {activeTab === 'risks' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#ff9800', marginBottom: '12px', padding: '8px', background: '#fff3e022', borderRadius: '4px', border: '1px solid #ff980044' }}>
                    以下风险项评估了升级后可能引入的安全问题，请在迁移前仔细审查。
                  </div>
                  {migrationAssessmentResult.risks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#4caf50', fontSize: '13px' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                      未发现迁移风险，升级安全性良好
                    </div>
                  )}
                  {migrationAssessmentResult.risks.map((risk, idx) => (
                    <RiskCard key={`risk-${idx}`} risk={risk} />
                  ))}
                </div>
              )}

              {activeTab === 'benefits' && (
                <div>
                  <div style={{ fontSize: '12px', color: '#4caf50', marginBottom: '12px', padding: '8px', background: '#e8f5e922', borderRadius: '4px', border: '1px solid #4caf5044' }}>
                    以下收益项展示了升级后安全性和功能方面的改善。
                  </div>
                  {migrationAssessmentResult.benefits.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#888', fontSize: '13px' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                      未发现明显升级收益
                    </div>
                  )}
                  {migrationAssessmentResult.benefits.map((benefit, idx) => (
                    <BenefitCard key={`benefit-${idx}`} benefit={benefit} />
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
