import React, { useEffect, useState } from 'react';
import { useAuditStore } from '../store/audit';
import { RemediationPlan as RemediationPlanType, RemediationItem, RemediationStatus, AuditTaskPriority } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const PRIORITY_COLORS: Record<AuditTaskPriority, string> = {
  low: '#9e9e9e',
  medium: '#ff9800',
  high: '#e53935',
  critical: '#b71c1c',
};

const PRIORITY_LABELS: Record<AuditTaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '紧急',
};

const STATUS_COLORS: Record<RemediationStatus, string> = {
  open: '#9e9e9e',
  in_progress: '#2196f3',
  resolved: '#4caf50',
  recheck_pending: '#ff9800',
  recheck_passed: '#2e7d32',
  recheck_failed: '#f44336',
  ignored: '#9e9e9e',
};

const STATUS_LABELS: Record<RemediationStatus, string> = {
  open: '待处理',
  in_progress: '修复中',
  resolved: '已修复',
  recheck_pending: '待复查',
  recheck_passed: '复查通过',
  recheck_failed: '复查未通过',
  ignored: '已忽略',
};

export const RemediationPlan: React.FC = () => {
  const {
    showRemediationPlan,
    setShowRemediationPlan,
    remediationPlans,
    selectedRemediationPlan,
    setSelectedRemediationPlan,
    fetchRemediationPlans,
    deleteRemediationPlan,
    updateRemediationItem,
  } = useAuditStore();

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<RemediationStatus>('open');
  const [editAssignee, setEditAssignee] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editRecheckNotes, setEditRecheckNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterContract, setFilterContract] = useState<string>('all');

  useEffect(() => {
    if (showRemediationPlan) {
      fetchRemediationPlans();
    }
  }, [showRemediationPlan]);

  if (!showRemediationPlan) return null;

  const startEditItem = (item: RemediationItem) => {
    setEditingItemId(item.id);
    setEditStatus(item.status);
    setEditAssignee(item.assignee || '');
    setEditNotes(item.notes || '');
    setEditDueDate(item.due_date || '');
    setEditRecheckNotes(item.recheck_notes || '');
  };

  const handleUpdateItem = async (item: RemediationItem) => {
    if (!selectedRemediationPlan) return;
    setLoading(true);
    try {
      await updateRemediationItem(selectedRemediationPlan.id, item.id, {
        status: editStatus,
        assignee: editAssignee || undefined,
        notes: editNotes || undefined,
        due_date: editDueDate || undefined,
        recheck_notes: editRecheckNotes || undefined,
      });
      setEditingItemId(null);
    } catch (e) {
      console.error('Failed to update item:', e);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredItems = (items: RemediationItem[]) => {
    return items.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
      if (filterContract !== 'all' && item.contract_name !== filterContract) return false;
      return true;
    });
  };

  const getStats = (items: RemediationItem[]) => {
    const total = items.length;
    const resolved = items.filter(i => i.status === 'resolved' || i.status === 'recheck_passed').length;
    const inProgress = items.filter(i => i.status === 'in_progress').length;
    const critical = items.filter(i => i.severity === 'critical').length;
    return { total, resolved, inProgress, critical };
  };

  const renderList = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>整改计划管理</h3>
        <button onClick={() => setShowRemediationPlan(false)} style={{
          padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
        }}>
          关闭
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : remediationPlans.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          暂无整改计划，在审计报告中点击"生成整改计划"按钮创建
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {remediationPlans.map((plan: RemediationPlanType) => {
            const stats = getStats(plan.items);
            const progress = plan.items.length > 0 ? Math.round((stats.resolved / plan.items.length) * 100) : 0;
            return (
              <div key={plan.id} style={{
                padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{plan.plan_name}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      合约: {plan.contract_names.join(', ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                      创建于 {new Date(plan.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {plan.items.length} 项 · {progress}% 完成
                    </div>
                    <div style={{ width: '120px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progress}%`, height: '100%',
                        background: progress === 100 ? '#4caf50' : '#2196f3',
                        borderRadius: '3px', transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#ffebee', color: '#b71c1c' }}>
                    🔴 严重: {stats.critical}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#e3f2fd', color: '#1565c0' }}>
                    🔵 进行中: {stats.inProgress}
                  </span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#e8f5e9', color: '#2e7d32' }}>
                    🟢 已完成: {stats.resolved}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setSelectedRemediationPlan(plan); setViewMode('detail'); }} style={{
                    padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#2196f3',
                    color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500
                  }}>
                    查看详情
                  </button>
                  <button onClick={async () => {
                    if (confirm('确定删除此整改计划吗？')) {
                      await deleteRemediationPlan(plan.id);
                    }
                  }} style={{
                    padding: '6px 16px', border: '1px solid #e53935', borderRadius: '4px',
                    background: 'transparent', color: '#e53935', cursor: 'pointer', fontSize: '13px'
                  }}>
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!selectedRemediationPlan) return null;
    const filteredItems = getFilteredItems(selectedRemediationPlan.items);
    const stats = getStats(selectedRemediationPlan.items);
    const uniqueContracts = [...new Set(selectedRemediationPlan.items.map(i => i.contract_name))];

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { setViewMode('list'); setSelectedRemediationPlan(null); }} style={{
              padding: '4px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
            }}>
              ← 返回
            </button>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{selectedRemediationPlan.plan_name}</h3>
              <div style={{ fontSize: '12px', color: '#888' }}>
                合约: {selectedRemediationPlan.contract_names.join(', ')}
              </div>
            </div>
          </div>
          <button onClick={() => setShowRemediationPlan(false)} style={{
            padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            关闭
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>总项数</div>
          </div>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b71c1c' }}>{stats.critical}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>严重项</div>
          </div>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>{stats.inProgress}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>进行中</div>
          </div>
          <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>{stats.resolved}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>已完成</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
          >
            <option value="all">全部状态</option>
            <option value="open">待处理</option>
            <option value="in_progress">修复中</option>
            <option value="resolved">已修复</option>
            <option value="recheck_pending">待复查</option>
            <option value="recheck_passed">复查通过</option>
            <option value="recheck_failed">复查未通过</option>
            <option value="ignored">已忽略</option>
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
          >
            <option value="all">全部优先级</option>
            <option value="critical">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
          <select
            value={filterContract}
            onChange={e => setFilterContract(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
          >
            <option value="all">全部合约</option>
            {uniqueContracts.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {filteredItems.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            没有符合条件的整改项
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflow: 'auto' }}>
            {filteredItems.map((item: RemediationItem) => (
              <div key={item.id} style={{
                padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
              }}>
                {editingItemId === item.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <select
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as RemediationStatus)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      >
                        <option value="open">待处理</option>
                        <option value="in_progress">修复中</option>
                        <option value="resolved">已修复</option>
                        <option value="recheck_pending">待复查</option>
                        <option value="recheck_passed">复查通过</option>
                        <option value="recheck_failed">复查未通过</option>
                        <option value="ignored">已忽略</option>
                      </select>
                      <input
                        value={editAssignee}
                        onChange={e => setEditAssignee(e.target.value)}
                        placeholder="负责人"
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={e => setEditDueDate(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      placeholder="备注信息"
                      rows={2}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                    />
                    <textarea
                      value={editRecheckNotes}
                      onChange={e => setEditRecheckNotes(e.target.value)}
                      placeholder="复查备注（可选）"
                      rows={2}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingItemId(null)} style={{
                        padding: '6px 16px', border: '1px solid #ddd', borderRadius: '4px',
                        background: 'transparent', cursor: 'pointer', fontSize: '13px'
                      }}>
                        取消
                      </button>
                      <button onClick={() => handleUpdateItem(item)} disabled={loading} style={{
                        padding: '6px 16px', border: 'none', borderRadius: '4px',
                        background: '#2196f3', color: '#fff', cursor: 'pointer', fontSize: '13px',
                        opacity: loading ? 0.5 : 1
                      }}>
                        {loading ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                            background: SEV_COLORS[item.severity] + '20',
                            color: SEV_COLORS[item.severity]
                          }}>
                            {item.severity.toUpperCase()}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                            background: PRIORITY_COLORS[item.priority] + '20',
                            color: PRIORITY_COLORS[item.priority]
                          }}>
                            {PRIORITY_LABELS[item.priority]}优先级
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                            background: STATUS_COLORS[item.status] + '20',
                            color: STATUS_COLORS[item.status]
                          }}>
                            {STATUS_LABELS[item.status]}
                          </span>
                          <span style={{ fontSize: '11px', color: '#888' }}>
                            📄 {item.contract_name} · 第{item.line_number}行
                          </span>
                        </div>
                        <div style={{ fontWeight: 500, fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                          {item.vulnerability_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                          {item.description}
                        </div>
                        <div style={{ fontSize: '12px', color: '#2e7d32', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 500 }}>修复建议: </span>{item.recommendation}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {item.assignee && (
                            <span style={{ fontSize: '11px', color: '#888' }}>👤 {item.assignee}</span>
                          )}
                          {item.due_date && (
                            <span style={{ fontSize: '11px', color: '#888' }}>📅 {item.due_date}</span>
                          )}
                          {item.notes && (
                            <span style={{ fontSize: '11px', color: '#888' }}>📝 {item.notes}</span>
                          )}
                          {item.recheck_notes && (
                            <span style={{ fontSize: '11px', color: '#888' }}>🔍 复查: {item.recheck_notes}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => startEditItem(item)} style={{
                        padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px',
                        background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#666'
                      }}>
                        编辑
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
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
        width: '900px', maxWidth: '90vw', maxHeight: '85vh',
        background: '#f5f5f5',
        borderRadius: '8px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {viewMode === 'list' && renderList()}
        {viewMode === 'detail' && renderDetail()}
      </div>
    </div>
  );
};
