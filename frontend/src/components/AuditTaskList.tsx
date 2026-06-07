import React, { useEffect, useState } from 'react';
import { useAuditStore } from '../store/audit';
import { AuditTaskList as AuditTaskListType, AuditTaskItem, AuditTaskStatus, AuditTaskPriority } from '../types';

const STATUS_COLORS: Record<AuditTaskStatus, string> = {
  pending: '#9e9e9e',
  in_progress: '#2196f3',
  completed: '#4caf50',
  skipped: '#ff9800',
};

const STATUS_LABELS: Record<AuditTaskStatus, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  skipped: '已跳过',
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

export const AuditTaskList: React.FC = () => {
  const {
    showTaskList,
    setShowTaskList,
    auditTaskLists,
    selectedTaskList,
    setSelectedTaskList,
    fetchTaskLists,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    addTaskItem,
    updateTaskItem,
    deleteTaskItem,
  } = useAuditStore();

  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [newListName, setNewListName] = useState('');
  const [newListAddress, setNewListAddress] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<AuditTaskPriority>('medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<AuditTaskStatus>('pending');
  const [editTaskPriority, setEditTaskPriority] = useState<AuditTaskPriority>('medium');
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskNotes, setEditTaskNotes] = useState('');

  useEffect(() => {
    if (showTaskList) {
      fetchTaskLists();
    }
  }, [showTaskList]);

  if (!showTaskList) return null;

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setLoading(true);
    try {
      await createTaskList({
        contract_name: newListName,
        contract_address: newListAddress || undefined,
        description: newListDesc || undefined,
      });
      setNewListName('');
      setNewListAddress('');
      setNewListDesc('');
      setShowNewListForm(false);
    } catch (e) {
      console.error('Failed to create task list:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedTaskList || !newTaskTitle.trim()) return;
    setLoading(true);
    try {
      await addTaskItem(selectedTaskList.id, {
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        priority: newTaskPriority,
        assignee: newTaskAssignee || undefined,
        due_date: newTaskDueDate || undefined,
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      setShowNewTaskForm(false);
    } catch (e) {
      console.error('Failed to add task:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!selectedTaskList) return;
    setLoading(true);
    try {
      await updateTaskItem(selectedTaskList.id, taskId, {
        title: editTaskTitle,
        description: editTaskDesc,
        status: editTaskStatus,
        priority: editTaskPriority,
        assignee: editTaskAssignee || undefined,
        due_date: editTaskDueDate || undefined,
        notes: editTaskNotes || undefined,
      });
      setEditingTaskId(null);
    } catch (e) {
      console.error('Failed to update task:', e);
    } finally {
      setLoading(false);
    }
  };

  const startEditTask = (task: AuditTaskItem) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDesc(task.description || '');
    setEditTaskStatus(task.status);
    setEditTaskPriority(task.priority);
    setEditTaskAssignee(task.assignee || '');
    setEditTaskDueDate(task.due_date || '');
    setEditTaskNotes(task.notes || '');
  };

  const getProgress = (tasks: AuditTaskItem[]) => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
  };

  const renderList = () => (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>审计任务清单</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowNewListForm(true)} style={{
            padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#2196f3',
            color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500
          }}>
            + 新建清单
          </button>
          <button onClick={() => setShowTaskList(false)} style={{
            padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
          }}>
            关闭
          </button>
        </div>
      </div>

      {showNewListForm && (
        <div style={{
          padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px',
          background: '#fff', marginBottom: '16px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '12px' }}>新建审计清单</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="合约名称 *"
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
            <input
              value={newListAddress}
              onChange={e => setNewListAddress(e.target.value)}
              placeholder="合约地址（可选）"
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
            <textarea
              value={newListDesc}
              onChange={e => setNewListDesc(e.target.value)}
              placeholder="描述（可选）"
              rows={2}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowNewListForm(false)} style={{
                padding: '6px 16px', border: '1px solid #ddd', borderRadius: '4px',
                background: 'transparent', cursor: 'pointer', fontSize: '13px'
              }}>
                取消
              </button>
              <button onClick={handleCreateList} disabled={loading || !newListName.trim()} style={{
                padding: '6px 16px', border: 'none', borderRadius: '4px',
                background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '13px',
                opacity: (loading || !newListName.trim()) ? 0.5 : 1
              }}>
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>加载中...</div>
      ) : auditTaskLists.length === 0 ? (
        <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
          暂无审计任务清单，点击上方按钮创建
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {auditTaskLists.map((list: AuditTaskListType) => {
            const progress = getProgress(list.tasks);
            return (
              <div key={list.id} style={{
                padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{list.contract_name}</div>
                    {list.contract_address && (
                      <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace', marginTop: '2px' }}>
                        {list.contract_address}
                      </div>
                    )}
                    {list.description && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{list.description}</div>
                    )}
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '6px' }}>
                      创建于 {new Date(list.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      {list.tasks.length} 项任务 · {progress}% 完成
                    </div>
                    <div style={{ width: '100px', height: '6px', background: '#e0e0e0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${progress}%`, height: '100%',
                        background: progress === 100 ? '#4caf50' : '#2196f3',
                        borderRadius: '3px', transition: 'width 0.3s'
                      }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setSelectedTaskList(list); setViewMode('detail'); }} style={{
                    padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#2196f3',
                    color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500
                  }}>
                    查看详情
                  </button>
                  <button onClick={async () => {
                    if (confirm('确定删除此清单吗？')) {
                      await deleteTaskList(list.id);
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
    if (!selectedTaskList) return null;
    const progress = getProgress(selectedTaskList.tasks);

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => { setViewMode('list'); setSelectedTaskList(null); }} style={{
              padding: '4px 10px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
            }}>
              ← 返回
            </button>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{selectedTaskList.contract_name}</h3>
              {selectedTaskList.contract_address && (
                <div style={{ fontSize: '11px', color: '#888', fontFamily: 'monospace' }}>
                  {selectedTaskList.contract_address}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '13px', color: '#666' }}>
              进度: {progress}% ({selectedTaskList.tasks.filter(t => t.status === 'completed').length}/{selectedTaskList.tasks.length})
            </div>
            <button onClick={() => setShowTaskList(false)} style={{
              padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', background: 'transparent', cursor: 'pointer'
            }}>
              关闭
            </button>
          </div>
        </div>

        {selectedTaskList.description && (
          <div style={{ padding: '12px 16px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>描述</div>
            <div style={{ fontSize: '13px' }}>{selectedTaskList.description}</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>任务列表</div>
          <button onClick={() => setShowNewTaskForm(true)} style={{
            padding: '6px 16px', border: 'none', borderRadius: '4px', background: '#4caf50',
            color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500
          }}>
            + 添加任务
          </button>
        </div>

        {showNewTaskForm && (
          <div style={{
            padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px',
            background: '#fff', marginBottom: '16px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '12px' }}>添加新任务</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="任务标题 *"
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
              />
              <textarea
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="任务描述（可选）"
                rows={2}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as AuditTaskPriority)}
                  style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="low">优先级: 低</option>
                  <option value="medium">优先级: 中</option>
                  <option value="high">优先级: 高</option>
                  <option value="critical">优先级: 紧急</option>
                </select>
                <input
                  value={newTaskAssignee}
                  onChange={e => setNewTaskAssignee(e.target.value)}
                  placeholder="负责人（可选）"
                  style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowNewTaskForm(false)} style={{
                  padding: '6px 16px', border: '1px solid #ddd', borderRadius: '4px',
                  background: 'transparent', cursor: 'pointer', fontSize: '13px'
                }}>
                  取消
                </button>
                <button onClick={handleAddTask} disabled={loading || !newTaskTitle.trim()} style={{
                  padding: '6px 16px', border: 'none', borderRadius: '4px',
                  background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '13px',
                  opacity: (loading || !newTaskTitle.trim()) ? 0.5 : 1
                }}>
                  {loading ? '添加中...' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTaskList.tasks.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
            暂无任务，点击上方按钮添加
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflow: 'auto' }}>
            {selectedTaskList.tasks.map((task: AuditTaskItem) => (
              <div key={task.id} style={{
                padding: '12px 16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fff'
              }}>
                {editingTaskId === task.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      value={editTaskTitle}
                      onChange={e => setEditTaskTitle(e.target.value)}
                      placeholder="任务标题"
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                    />
                    <textarea
                      value={editTaskDesc}
                      onChange={e => setEditTaskDesc(e.target.value)}
                      placeholder="描述"
                      rows={2}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <select
                        value={editTaskStatus}
                        onChange={e => setEditTaskStatus(e.target.value as AuditTaskStatus)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      >
                        <option value="pending">待处理</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                        <option value="skipped">已跳过</option>
                      </select>
                      <select
                        value={editTaskPriority}
                        onChange={e => setEditTaskPriority(e.target.value as AuditTaskPriority)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      >
                        <option value="low">低优先级</option>
                        <option value="medium">中优先级</option>
                        <option value="high">高优先级</option>
                        <option value="critical">紧急</option>
                      </select>
                      <input
                        value={editTaskAssignee}
                        onChange={e => setEditTaskAssignee(e.target.value)}
                        placeholder="负责人"
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="date"
                        value={editTaskDueDate}
                        onChange={e => setEditTaskDueDate(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                      <input
                        value={editTaskNotes}
                        onChange={e => setEditTaskNotes(e.target.value)}
                        placeholder="备注"
                        style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingTaskId(null)} style={{
                        padding: '6px 16px', border: '1px solid #ddd', borderRadius: '4px',
                        background: 'transparent', cursor: 'pointer', fontSize: '13px'
                      }}>
                        取消
                      </button>
                      <button onClick={() => handleUpdateTask(task.id)} disabled={loading || !editTaskTitle.trim()} style={{
                        padding: '6px 16px', border: 'none', borderRadius: '4px',
                        background: '#2196f3', color: '#fff', cursor: 'pointer', fontSize: '13px',
                        opacity: (loading || !editTaskTitle.trim()) ? 0.5 : 1
                      }}>
                        {loading ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            onClick={async () => {
                              const nextStatus: AuditTaskStatus = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'completed' : 'pending';
                              await updateTaskItem(selectedTaskList.id, task.id, { status: nextStatus });
                            }}
                            style={{
                              cursor: 'pointer', width: '18px', height: '18px', borderRadius: '50%',
                              border: `2px solid ${STATUS_COLORS[task.status]}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', color: STATUS_COLORS[task.status],
                              background: task.status === 'completed' ? STATUS_COLORS[task.status] : 'transparent'
                            }}
                          >
                            {task.status === 'completed' && '✓'}
                          </span>
                          <span style={{
                            fontWeight: 500, fontSize: '14px',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                            color: task.status === 'completed' ? '#9e9e9e' : '#333'
                          }}>
                            {task.title}
                          </span>
                        </div>
                        {task.description && (
                          <div style={{ fontSize: '12px', color: '#666', marginLeft: '26px', marginBottom: '6px' }}>
                            {task.description}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginLeft: '26px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                            background: STATUS_COLORS[task.status] + '20',
                            color: STATUS_COLORS[task.status]
                          }}>
                            {STATUS_LABELS[task.status]}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                            background: PRIORITY_COLORS[task.priority] + '20',
                            color: PRIORITY_COLORS[task.priority]
                          }}>
                            {PRIORITY_LABELS[task.priority]}优先级
                          </span>
                          {task.assignee && (
                            <span style={{ fontSize: '11px', color: '#888' }}>
                              👤 {task.assignee}
                            </span>
                          )}
                          {task.due_date && (
                            <span style={{ fontSize: '11px', color: '#888' }}>
                              📅 {task.due_date}
                            </span>
                          )}
                          {task.notes && (
                            <span style={{ fontSize: '11px', color: '#888' }}>
                              📝 {task.notes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => startEditTask(task)} style={{
                          padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px',
                          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#666'
                        }}>
                          编辑
                        </button>
                        <button onClick={async () => {
                          if (confirm('确定删除此任务吗？')) {
                            await deleteTaskItem(selectedTaskList.id, task.id);
                          }
                        }} style={{
                          padding: '4px 8px', border: '1px solid #ffcdd2', borderRadius: '4px',
                          background: 'transparent', cursor: 'pointer', fontSize: '12px', color: '#e53935'
                        }}>
                          删除
                        </button>
                      </div>
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
        width: '800px', maxWidth: '90vw', maxHeight: '85vh',
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
