import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../store/audit';
import { RiskSubscription, RiskSubscriptionCreate, SubscriptionDashboard } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const SEV_BG: Record<string, string> = {
  critical: '#ffebee', high: '#fff3e0', medium: '#fff8e1', low: '#f1f8e9', info: '#e3f2fd'
};

const TREND_ICON: Record<string, string> = {
  increasing: '📈', decreasing: '📉', stable: '➡️'
};

const TREND_LABEL: Record<string, string> = {
  increasing: '上升趋势', decreasing: '下降趋势', stable: '保持稳定'
};

const PRESET_PATTERNS = [
  { name: '重入攻击', pattern: 'reentrancy', severity: 'critical' as const, description: '关注所有重入攻击类漏洞' },
  { name: '整数溢出', pattern: 'overflow', severity: 'critical' as const, description: '关注整数溢出/下溢漏洞' },
  { name: '访问控制', pattern: 'access control', severity: 'high' as const, description: '关注权限控制和认证问题' },
  { name: 'tx.origin', pattern: 'tx.origin', severity: 'high' as const, description: '关注tx.origin使用不当' },
  { name: 'delegatecall', pattern: 'delegatecall', severity: 'critical' as const, description: '关注不安全的delegatecall调用' },
  { name: 'selfdestruct', pattern: 'selfdestruct', severity: 'high' as const, description: '关注selfdestruct使用' },
  { name: '未检查返回值', pattern: 'unchecked', severity: 'high' as const, description: '关注外部调用返回值未检查' },
  { name: '时间戳依赖', pattern: 'timestamp', severity: 'medium' as const, description: '关注block.timestamp依赖' },
];

export const RuleSubscription: React.FC = () => {
  const {
    showRuleSubscription, setShowRuleSubscription,
    riskSubscriptions, subscriptionDashboards,
    fetchSubscriptions, fetchSubscriptionDashboards,
    createSubscription, updateSubscription, deleteSubscription,
    toggleSubscriptionEnabled
  } = useAuditStore();

  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<RiskSubscription | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RiskSubscriptionCreate>({
    name: '', risk_pattern: '', severity: 'high', description: '', enabled: true, notify_on_change: true
  });
  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('dashboard');

  useEffect(() => {
    if (showRuleSubscription) {
      fetchSubscriptions();
      fetchSubscriptionDashboards();
    }
  }, [showRuleSubscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSub) {
        await updateSubscription(editingSub.id, formData);
      } else {
        await createSubscription(formData);
      }
      resetForm();
      fetchSubscriptionDashboards();
    } catch (e) {
      console.error('Failed to save subscription:', e);
    }
  };

  const handleEdit = (sub: RiskSubscription) => {
    setEditingSub(sub);
    setFormData({
      name: sub.name,
      risk_pattern: sub.risk_pattern,
      severity: sub.severity,
      description: sub.description,
      enabled: sub.enabled,
      notify_on_change: sub.notify_on_change
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此订阅吗？')) return;
    await deleteSubscription(id);
    if (selectedSubId === id) setSelectedSubId(null);
    fetchSubscriptionDashboards();
  };

  const handlePresetSelect = (preset: typeof PRESET_PATTERNS[0]) => {
    setFormData({
      ...formData,
      name: preset.name,
      risk_pattern: preset.pattern,
      severity: preset.severity,
      description: preset.description
    });
  };

  const resetForm = () => {
    setFormData({ name: '', risk_pattern: '', severity: 'high', description: '', enabled: true, notify_on_change: true });
    setEditingSub(null);
    setShowForm(false);
  };

  const renderMiniTrend = (trend: SubscriptionDashboard['trend']) => {
    if (trend.length < 2) return <span style={{ fontSize: '11px', color: '#888' }}>数据不足</span>;
    const maxCount = Math.max(...trend.map(t => t.match_count), 1);
    const barWidth = Math.max(4, Math.floor(120 / trend.length));
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px' }}>
        {trend.map((t, i) => (
          <div key={i} title={`${t.date}: ${t.match_count}次命中`} style={{
            width: `${barWidth}px`,
            height: `${Math.max(2, (t.match_count / maxCount) * 32)}px`,
            background: t.match_count > 0
              ? `rgba(229, 57, 53, ${0.3 + (t.match_count / maxCount) * 0.7})`
              : '#e0e0e0',
            borderRadius: '1px',
            transition: 'height 0.2s ease'
          }} />
        ))}
      </div>
    );
  };

  if (!showRuleSubscription) return null;

  const selectedDashboard = subscriptionDashboards.find(d => d.subscription.id === selectedSubId);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={() => setShowRuleSubscription(false)}>
      <div style={{
        background: '#1e1e1e', borderRadius: '8px', width: '900px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid #333'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #333',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#252526'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#e0e0e0' }}>🔔 审计规则订阅</h3>
            <div style={{ display: 'flex', gap: '2px', background: '#1e1e1e', borderRadius: '4px', padding: '2px' }}>
              <button onClick={() => setActiveTab('dashboard')} style={{
                padding: '4px 12px', border: 'none', borderRadius: '3px', fontSize: '12px',
                cursor: 'pointer',
                background: activeTab === 'dashboard' ? '#e53935' : 'transparent',
                color: activeTab === 'dashboard' ? '#fff' : '#aaa'
              }}>监控看板</button>
              <button onClick={() => setActiveTab('list')} style={{
                padding: '4px 12px', border: 'none', borderRadius: '3px', fontSize: '12px',
                cursor: 'pointer',
                background: activeTab === 'list' ? '#e53935' : 'transparent',
                color: activeTab === 'list' ? '#fff' : '#aaa'
              }}>订阅管理 ({riskSubscriptions.length})</button>
            </div>
          </div>
          <button onClick={() => setShowRuleSubscription(false)} style={{
            border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#888'
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
          {activeTab === 'dashboard' && (
            <div>
              {subscriptionDashboards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
                  <div style={{ fontSize: '15px', marginBottom: '8px' }}>暂无启用的规则订阅</div>
                  <div style={{ fontSize: '13px', marginBottom: '20px', color: '#555' }}>
                    订阅特定风险模式后，可在此快速查看最新命中合约与变化趋势
                  </div>
                  <button onClick={() => { setActiveTab('list'); setShowForm(true); }} style={{
                    padding: '8px 20px', border: 'none', borderRadius: '4px',
                    background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 500
                  }}>+ 创建订阅</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {subscriptionDashboards.map(d => (
                      <div key={d.subscription.id} onClick={() => setSelectedSubId(d.subscription.id)} style={{
                        padding: '12px', borderRadius: '6px', cursor: 'pointer',
                        border: `1px solid ${selectedSubId === d.subscription.id ? '#e53935' : '#333'}`,
                        background: selectedSubId === d.subscription.id ? '#2a1a1a' : '#252526',
                        transition: 'all 0.15s ease'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#e0e0e0' }}>{d.subscription.name}</span>
                          <span style={{
                            fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                            color: '#fff', background: SEV_COLORS[d.subscription.severity]
                          }}>{d.subscription.severity}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>
                          匹配规则: <code style={{ background: '#1e1e1e', padding: '1px 4px', borderRadius: '2px', color: '#d4d4d4' }}>{d.subscription.risk_pattern}</code>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '18px', fontWeight: 700, color: d.total_matches > 0 ? '#e53935' : '#4caf50' }}>
                            {d.total_matches}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '12px' }}>{TREND_ICON[d.trend_direction]}</span>
                            <span style={{ fontSize: '11px', color: '#aaa' }}>{TREND_LABEL[d.trend_direction]}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: '6px' }}>{renderMiniTrend(d.trend)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {selectedDashboard ? (
                      <div>
                        <div style={{
                          padding: '12px 16px', background: '#252526', borderRadius: '6px 6px 0 0',
                          border: '1px solid #333', borderBottom: 'none',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: 600, color: '#e0e0e0' }}>
                              {selectedDashboard.subscription.name}
                            </span>
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>
                              匹配 {selectedDashboard.total_matches} 个漏洞
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px' }}>{TREND_ICON[selectedDashboard.trend_direction]}</span>
                            <span style={{
                              fontSize: '12px', fontWeight: 500,
                              color: selectedDashboard.trend_direction === 'increasing' ? '#e53935' :
                                selectedDashboard.trend_direction === 'decreasing' ? '#4caf50' : '#888'
                            }}>
                              {TREND_LABEL[selectedDashboard.trend_direction]}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          background: '#252526', borderRadius: '0 0 6px 6px',
                          border: '1px solid #333', borderTop: 'none'
                        }}>
                          {selectedDashboard.trend.length > 0 && (
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #333' }}>
                              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>变化趋势</div>
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' }}>
                                {selectedDashboard.trend.map((t, i) => {
                                  const maxCount = Math.max(...selectedDashboard.trend.map(x => x.match_count), 1);
                                  return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                      <div title={`${t.date}: ${t.match_count}次命中, 平均分${t.avg_score}`} style={{
                                        width: '100%', maxWidth: '30px',
                                        height: `${Math.max(3, (t.match_count / maxCount) * 50)}px`,
                                        background: t.match_count > 0
                                          ? `rgba(229, 57, 53, ${0.3 + (t.match_count / maxCount) * 0.7})`
                                          : '#444',
                                        borderRadius: '2px 2px 0 0',
                                        transition: 'height 0.2s ease'
                                      }} />
                                      {selectedDashboard.trend.length <= 10 && (
                                        <span style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{t.date.slice(5)}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div style={{ padding: '8px 16px 16px' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                              最新命中合约
                            </div>
                            {selectedDashboard.matches.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '24px', color: '#555', fontSize: '13px' }}>
                                暂无命中记录
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {selectedDashboard.matches.map((m, i) => (
                                  <div key={i} style={{
                                    padding: '10px 12px', borderRadius: '4px',
                                    background: '#1e1e1e', border: '1px solid #333'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#e0e0e0' }}>
                                          {m.contract_name}
                                        </span>
                                        <span style={{
                                          fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                                          color: '#fff', background: SEV_COLORS[m.severity]
                                        }}>{m.severity}</span>
                                      </div>
                                      <span style={{ fontSize: '11px', color: '#666' }}>
                                        安全分: <span style={{
                                          color: m.score >= 80 ? '#4caf50' : m.score >= 50 ? '#ff9800' : '#e53935',
                                          fontWeight: 600
                                        }}>{m.score}</span>
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#bbb', marginBottom: '2px' }}>
                                      {m.vulnerability_name} <span style={{ color: '#666' }}>Line {m.line}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#888' }}>{m.description}</div>
                                    <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>
                                      {m.audited_at}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '300px', color: '#555', fontSize: '13px',
                        border: '1px solid #333', borderRadius: '6px', background: '#252526'
                      }}>
                        ← 选择左侧订阅查看详情
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'list' && (
            <div>
              {!showForm ? (
                <div>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#888' }}>
                      共 {riskSubscriptions.length} 条订阅规则
                    </span>
                    <button onClick={() => setShowForm(true)} style={{
                      padding: '6px 16px', border: 'none', borderRadius: '4px',
                      background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 500, fontSize: '13px'
                    }}>+ 新建订阅</button>
                  </div>
                  {riskSubscriptions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#555' }}>
                      暂无订阅规则，点击上方按钮添加
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {riskSubscriptions.map(sub => {
                        const dash = subscriptionDashboards.find(d => d.subscription.id === sub.id);
                        return (
                          <div key={sub.id} style={{
                            padding: '14px', borderRadius: '6px',
                            border: '1px solid #333', background: sub.enabled ? '#252526' : '#1a1a1a',
                            opacity: sub.enabled ? 1 : 0.5
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: '#e0e0e0' }}>{sub.name}</span>
                                <span style={{
                                  fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                                  color: '#fff', background: SEV_COLORS[sub.severity]
                                }}>{sub.severity}</span>
                                {!sub.enabled && (
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: '#444', color: '#888' }}>已停用</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => toggleSubscriptionEnabled(sub.id)} style={{
                                  padding: '4px 10px', border: '1px solid #555', borderRadius: '4px',
                                  background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '11px'
                                }}>{sub.enabled ? '停用' : '启用'}</button>
                                <button onClick={() => handleEdit(sub)} style={{
                                  padding: '4px 10px', border: '1px solid #555', borderRadius: '4px',
                                  background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '11px'
                                }}>编辑</button>
                                <button onClick={() => handleDelete(sub.id)} style={{
                                  padding: '4px 10px', border: '1px solid #5c3030', borderRadius: '4px',
                                  background: '#2a1a1a', color: '#e53935', cursor: 'pointer', fontSize: '11px'
                                }}>删除</button>
                              </div>
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                              匹配规则: <code style={{ background: '#1e1e1e', padding: '1px 4px', borderRadius: '2px', color: '#d4d4d4' }}>{sub.risk_pattern}</code>
                            </div>
                            {sub.description && (
                              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>{sub.description}</div>
                            )}
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              {dash && (
                                <>
                                  <span style={{ fontSize: '12px', color: '#aaa' }}>
                                    命中 <span style={{ color: dash.total_matches > 0 ? '#e53935' : '#4caf50', fontWeight: 600 }}>{dash.total_matches}</span> 个漏洞
                                  </span>
                                  <span style={{ fontSize: '12px' }}>{TREND_ICON[dash.trend_direction]} {TREND_LABEL[dash.trend_direction]}</span>
                                </>
                              )}
                              <span style={{ fontSize: '11px', color: '#555' }}>创建于 {sub.created_at.slice(0, 10)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '15px', color: '#e0e0e0' }}>
                    {editingSub ? '编辑订阅' : '新建订阅'}
                  </h4>
                  {!editingSub && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>快速选择预设:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {PRESET_PATTERNS.map(preset => (
                          <button key={preset.pattern} type="button" onClick={() => handlePresetSelect(preset)} style={{
                            padding: '4px 10px', borderRadius: '4px',
                            border: formData.risk_pattern === preset.pattern ? `1px solid ${SEV_COLORS[preset.severity]}` : '1px solid #555',
                            background: formData.risk_pattern === preset.pattern ? SEV_BG[preset.severity] : 'transparent',
                            color: formData.risk_pattern === preset.pattern ? '#e0e0e0' : '#aaa',
                            cursor: 'pointer', fontSize: '11px',
                            transition: 'all 0.15s ease'
                          }}>
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#aaa' }}>订阅名称</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如：重入攻击监控" required style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #555',
                        borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box',
                        background: '#1e1e1e', color: '#d4d4d4', outline: 'none'
                      }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#aaa' }}>风险匹配关键词</label>
                    <input type="text" value={formData.risk_pattern} onChange={(e) => setFormData({ ...formData, risk_pattern: e.target.value })}
                      placeholder="例如：reentrancy、overflow" required style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #555',
                        borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace', boxSizing: 'border-box',
                        background: '#1e1e1e', color: '#d4d4d4', outline: 'none'
                      }} />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#aaa' }}>关注级别</label>
                    <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                      style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #555',
                        borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box',
                        background: '#1e1e1e', color: '#d4d4d4', outline: 'none'
                      }}>
                      <option value="critical">critical - 严重</option>
                      <option value="high">high - 高危</option>
                      <option value="medium">medium - 中危</option>
                      <option value="low">low - 低危</option>
                      <option value="info">info - 信息</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '4px', color: '#aaa' }}>描述</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="描述此订阅的关注重点" rows={2} style={{
                        width: '100%', padding: '8px 12px', border: '1px solid #555',
                        borderRadius: '4px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box',
                        background: '#1e1e1e', color: '#d4d4d4', outline: 'none'
                      }} />
                  </div>
                  <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#bbb' }}>
                      <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} />
                      启用此订阅
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', color: '#bbb' }}>
                      <input type="checkbox" checked={formData.notify_on_change} onChange={(e) => setFormData({ ...formData, notify_on_change: e.target.checked })} />
                      变化时通知
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={resetForm} style={{
                      flex: 1, padding: '10px', border: '1px solid #555',
                      borderRadius: '4px', background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '13px'
                    }}>取消</button>
                    <button type="submit" style={{
                      flex: 1, padding: '10px', border: 'none',
                      borderRadius: '4px', background: '#e53935', color: '#fff',
                      cursor: 'pointer', fontSize: '13px', fontWeight: 500
                    }}>{editingSub ? '保存修改' : '创建订阅'}</button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
