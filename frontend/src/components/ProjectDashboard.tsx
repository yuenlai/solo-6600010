import React, { useEffect, useState } from 'react';
import { useAuditStore } from '../store/audit';
import { ProjectContractSummary, CriticalIssue, RecentActivity, RiskDistribution } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const SEV_LABELS: Record<string, string> = {
  critical: '严重', high: '高危', medium: '中危', low: '低危', info: '信息'
};

const STATUS_COLORS: Record<string, string> = {
  safe: '#4caf50', warning: '#ff9800', danger: '#f44336'
};

const STATUS_LABELS: Record<string, string> = {
  safe: '安全', warning: '警告', danger: '危险'
};

const ISSUE_STATUS_COLORS: Record<string, string> = {
  open: '#f44336', fixed: '#4caf50', ignored: '#9e9e9e'
};

const ISSUE_STATUS_LABELS: Record<string, string> = {
  open: '待修复', fixed: '已修复', ignored: '已忽略'
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  audit: '#2196f3', fix: '#4caf50', task: '#ff9800', feedback: '#9c27b0'
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  audit: '审计', fix: '修复', task: '任务', feedback: '反馈'
};

export const ProjectDashboard: React.FC = () => {
  const { showDashboard, setShowDashboard, dashboardData, fetchDashboardData } = useAuditStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'issues' | 'activity'>('overview');

  useEffect(() => {
    if (showDashboard && !dashboardData) {
      loadDashboardData();
    }
  }, [showDashboard]);

  const loadDashboardData = async () => {
    setLoading(true);
    await fetchDashboardData();
    setLoading(false);
  };

  if (!showDashboard) return null;

  const renderRiskBarChart = (distribution: RiskDistribution) => {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    const severities = ['critical', 'high', 'medium', 'low', 'info'] as const;

    return (
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
          {severities.map(sev => {
            const count = distribution[sev];
            const width = total > 0 ? (count / total) * 100 : 0;
            return width > 0 ? (
              <div key={sev} style={{ width: `${width}%`, background: SEV_COLORS[sev] }} title={`${SEV_LABELS[sev]}: ${count}`} />
            ) : null;
          })}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {severities.map(sev => (
            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: SEV_COLORS[sev] }} />
              <span style={{ color: '#666' }}>{SEV_LABELS[sev]}: {distribution[sev]}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOverview = () => {
    if (!dashboardData) return null;
    const { total_contracts, total_vulnerabilities, average_score, risk_distribution } = dashboardData;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>合约总数</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#2196f3' }}>{total_contracts}</div>
          </div>
          <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>漏洞总数</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#e53935' }}>{total_vulnerabilities}</div>
          </div>
          <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>平均安全分</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: average_score >= 80 ? '#4caf50' : average_score >= 50 ? '#ff9800' : '#f44336' }}>{average_score}</div>
          </div>
        </div>

        <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <div style={{ fontWeight: 600, marginBottom: '16px', fontSize: '14px' }}>整体风险分布</div>
          {renderRiskBarChart(risk_distribution)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>最高危问题</span>
              <button onClick={() => setActiveTab('issues')} style={{ fontSize: '11px', color: '#2196f3', background: 'none', border: 'none', cursor: 'pointer' }}>查看全部</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dashboardData.critical_issues.slice(0, 3).map((issue: CriticalIssue) => (
                <div key={issue.id} style={{ padding: '10px', background: '#fafafa', borderRadius: '6px', borderLeft: `3px solid ${SEV_COLORS[issue.severity]}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{issue.name}</span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: ISSUE_STATUS_COLORS[issue.status] + '20', color: ISSUE_STATUS_COLORS[issue.status] }}>
                      {ISSUE_STATUS_LABELS[issue.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{issue.contract_name} · 第 {issue.line} 行</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ fontWeight: 600, marginBottom: '12px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>最新动态</span>
              <button onClick={() => setActiveTab('activity')} style={{ fontSize: '11px', color: '#2196f3', background: 'none', border: 'none', cursor: 'pointer' }}>查看全部</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dashboardData.recent_activities.slice(0, 3).map((activity: RecentActivity) => (
                <div key={activity.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ACTIVITY_TYPE_COLORS[activity.type], marginTop: '4px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#333' }}>{activity.description}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      {activity.contract_name} · {new Date(activity.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContracts = () => {
    if (!dashboardData) return null;
    const sortedContracts = [...dashboardData.contracts].sort((a, b) => a.score - b.score);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sortedContracts.map((contract: ProjectContractSummary) => (
          <div key={contract.id} style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: contract.score >= 80 ? '#e8f5e9' : contract.score >= 50 ? '#fff3e0' : '#ffebee',
                  fontSize: '16px', fontWeight: 'bold',
                  color: contract.score >= 80 ? '#2e7d32' : contract.score >= 50 ? '#e65100' : '#b71c1c'
                }}>
                  {contract.score}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{contract.contract_name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    {contract.total_vulnerabilities} 个漏洞 · 最后审计: {new Date(contract.last_audited_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 500,
                background: STATUS_COLORS[contract.status] + '20',
                color: STATUS_COLORS[contract.status]
              }}>
                {STATUS_LABELS[contract.status]}
              </span>
            </div>
            {renderRiskBarChart(contract.risk_distribution)}
          </div>
        ))}
      </div>
    );
  };

  const renderIssues = () => {
    if (!dashboardData) return null;
    const openIssues = dashboardData.critical_issues.filter(i => i.status === 'open');
    const fixedIssues = dashboardData.critical_issues.filter(i => i.status === 'fixed');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#f44336' }}>待修复 ({openIssues.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {openIssues.map((issue: CriticalIssue) => (
              <div key={issue.id} style={{ padding: '14px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', borderLeft: `4px solid ${SEV_COLORS[issue.severity]}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{issue.name}</span>
                    <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[issue.severity] }}>
                      {SEV_LABELS[issue.severity]}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: ISSUE_STATUS_COLORS[issue.status] + '20', color: ISSUE_STATUS_COLORS[issue.status] }}>
                    {ISSUE_STATUS_LABELS[issue.status]}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px', lineHeight: 1.5 }}>{issue.description}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  <span style={{ marginRight: '16px' }}>合约: {issue.contract_name}</span>
                  <span style={{ marginRight: '16px' }}>位置: 第 {issue.line} 行</span>
                  <span>发现时间: {new Date(issue.first_found_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {fixedIssues.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#4caf50' }}>已修复 ({fixedIssues.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fixedIssues.map((issue: CriticalIssue) => (
                <div key={issue.id} style={{ padding: '14px', background: '#f5f5f5', borderRadius: '8px', border: '1px solid #e0e0e0', opacity: 0.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#666' }}>{issue.name}</span>
                      <span style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', color: '#fff', background: SEV_COLORS[issue.severity], opacity: 0.6 }}>
                        {SEV_LABELS[issue.severity]}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: ISSUE_STATUS_COLORS[issue.status] + '20', color: ISSUE_STATUS_COLORS[issue.status] }}>
                      {ISSUE_STATUS_LABELS[issue.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    {issue.contract_name} · 第 {issue.line} 行
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderActivity = () => {
    if (!dashboardData) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: '#e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
        {dashboardData.recent_activities.map((activity: RecentActivity) => (
          <div key={activity.id} style={{ padding: '14px 16px', background: '#fff', display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: ACTIVITY_TYPE_COLORS[activity.type] + '20'
              }}>
                <span style={{ fontSize: '14px' }}>
                  {activity.type === 'audit' && '🔍'}
                  {activity.type === 'fix' && '🔧'}
                  {activity.type === 'task' && '📋'}
                  {activity.type === 'feedback' && '💬'}
                </span>
              </div>
              <div style={{ width: '1px', flex: 1, background: '#e0e0e0', marginTop: '4px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: ACTIVITY_TYPE_COLORS[activity.type] + '20', color: ACTIVITY_TYPE_COLORS[activity.type] }}>
                  {ACTIVITY_TYPE_LABELS[activity.type]}
                </span>
                <span style={{ fontSize: '11px', color: '#888' }}>{activity.contract_name}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#333', marginBottom: '4px' }}>{activity.description}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>{new Date(activity.created_at).toLocaleString()}</div>
            </div>
          </div>
        ))}
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
        width: '1000px', maxWidth: '95vw', maxHeight: '85vh',
        background: '#f5f5f5',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>项目审计看板</h3>
            {dashboardData && (
              <span style={{ fontSize: '11px', color: '#888' }}>更新于 {new Date(dashboardData.last_updated).toLocaleString()}</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={loadDashboardData} disabled={loading} style={{
              padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px',
              background: '#fff', cursor: 'pointer', fontSize: '12px'
            }}>
              {loading ? '刷新中...' : '🔄 刷新'}
            </button>
            <button onClick={() => setShowDashboard(false)} style={{
              padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px',
              background: '#fff', cursor: 'pointer'
            }}>
              关闭
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e0e0e0', padding: '0 12px' }}>
          {[
            { key: 'overview', label: '📈 概览' },
            { key: 'contracts', label: '📄 合约分析' },
            { key: 'issues', label: '⚠️ 高危问题' },
            { key: 'activity', label: '📝 最新进展' }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              color: activeTab === tab.key ? '#e53935' : '#666',
              borderBottom: activeTab === tab.key ? '2px solid #e53935' : '2px solid transparent'
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888' }}>
              加载中...
            </div>
          ) : !dashboardData ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#888', flexDirection: 'column', gap: '12px' }}>
              <span>暂无看板数据</span>
              <button onClick={loadDashboardData} style={{
                padding: '8px 16px', border: 'none', borderRadius: '4px',
                background: '#e53935', color: '#fff', cursor: 'pointer'
              }}>
                加载数据
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'contracts' && renderContracts()}
              {activeTab === 'issues' && renderIssues()}
              {activeTab === 'activity' && renderActivity()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
