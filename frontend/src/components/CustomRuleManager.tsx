import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../store/audit';
import { CustomRule, CustomRuleCreate } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const API_BASE = '/api/audit';

export const CustomRuleManager: React.FC = () => {
  const { customRules, setCustomRules, addCustomRule, updateCustomRule, deleteCustomRule, showRuleManager, setShowRuleManager } = useAuditStore();
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [formData, setFormData] = useState<CustomRuleCreate>({
    name: '', severity: 'medium', pattern: '', description: '', recommendation: '', enabled: true
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/rules`);
      const data = await res.json();
      setCustomRules(data);
    } catch (e) {
      console.error('Failed to fetch rules:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRule) {
        const res = await fetch(`${API_BASE}/rules/${editingRule.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        updateCustomRule(data);
      } else {
        const res = await fetch(`${API_BASE}/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        addCustomRule(data);
      }
      resetForm();
    } catch (e) {
      console.error('Failed to save rule:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条规则吗？')) return;
    try {
      await fetch(`${API_BASE}/rules/${id}`, { method: 'DELETE' });
      deleteCustomRule(id);
    } catch (e) {
      console.error('Failed to delete rule:', e);
    }
  };

  const handleEdit = (rule: CustomRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      severity: rule.severity,
      pattern: rule.pattern,
      description: rule.description,
      recommendation: rule.recommendation,
      enabled: rule.enabled
    });
    setShowForm(true);
  };

  const handleToggleEnabled = async (rule: CustomRule) => {
    try {
      const updated = { ...rule, enabled: !rule.enabled };
      const res = await fetch(`${API_BASE}/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      updateCustomRule(data);
    } catch (e) {
      console.error('Failed to toggle rule:', e);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', severity: 'medium', pattern: '', description: '', recommendation: '', enabled: true });
    setEditingRule(null);
    setShowForm(false);
  };

  if (!showRuleManager) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={() => setShowRuleManager(false)}>
      <div style={{
        background: '#fff', borderRadius: '8px', width: '700px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #eee',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>自定义审计规则</h3>
          <button onClick={() => setShowRuleManager(false)} style={{
            border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#999'
          }}>×</button>
        </div>

        <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
          {!showForm ? (
            <div>
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: '#666' }}>共 {customRules.length} 条自定义规则</span>
                <button onClick={() => setShowForm(true)} style={{
                  padding: '8px 16px', border: 'none', borderRadius: '4px',
                  background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 500
                }}>+ 添加规则</button>
              </div>

              {customRules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  暂无自定义规则，点击上方按钮添加
                </div>
              ) : (
                <div>
                  {customRules.map((rule) => (
                    <div key={rule.id} style={{
                      padding: '12px', marginBottom: '8px', borderRadius: '8px',
                      border: '1px solid #eee', background: rule.enabled ? '#fff' : '#f5f5f5',
                      opacity: rule.enabled ? 1 : 0.6
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>{rule.name}</span>
                          <span style={{
                            fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                            color: '#fff', background: SEV_COLORS[rule.severity]
                          }}>{rule.severity}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleToggleEnabled(rule)} style={{
                            padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px',
                            background: '#fff', cursor: 'pointer', fontSize: '12px'
                          }}>{rule.enabled ? '禁用' : '启用'}</button>
                          <button onClick={() => handleEdit(rule)} style={{
                            padding: '4px 8px', border: '1px solid #ddd', borderRadius: '4px',
                            background: '#fff', cursor: 'pointer', fontSize: '12px'
                          }}>编辑</button>
                          <button onClick={() => handleDelete(rule.id)} style={{
                            padding: '4px 8px', border: '1px solid #ffcdd2', borderRadius: '4px',
                            background: '#ffebee', color: '#c62828', cursor: 'pointer', fontSize: '12px'
                          }}>删除</button>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        <strong>匹配规则：</strong><code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>{rule.pattern}</code>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        <strong>命中原因：</strong>{rule.description}
                      </div>
                      <div style={{ fontSize: '12px', color: '#2e7d32' }}>
                        <strong>修复建议：</strong>{rule.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h4 style={{ margin: '0 0 16px', fontSize: '16px' }}>
                {editingRule ? '编辑规则' : '添加规则'}
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>规则名称</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：危险函数调用" required style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box'
                  }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>严重程度</label>
                <select value={formData.severity} onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                  style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box'
                  }}>
                  <option value="critical">critical - 严重</option>
                  <option value="high">high - 高危</option>
                  <option value="medium">medium - 中危</option>
                  <option value="low">low - 低危</option>
                  <option value="info">info - 信息</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>正则表达式</label>
                <input type="text" value={formData.pattern} onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  placeholder="例如：delegatecall" required style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box'
                  }} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>命中原因</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="描述命中此规则的原因" required rows={2} style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
                  }} />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>修复建议</label>
                <textarea value={formData.recommendation} onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                  placeholder="给出修复此问题的建议" required rows={2} style={{
                    width: '100%', padding: '8px 12px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box'
                  }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} />
                  启用此规则
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={resetForm} style={{
                  flex: 1, padding: '10px', border: '1px solid #ddd',
                  borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '14px'
                }}>取消</button>
                <button type="submit" style={{
                  flex: 1, padding: '10px', border: 'none',
                  borderRadius: '4px', background: '#e53935', color: '#fff',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 500
                }}>{editingRule ? '保存修改' : '添加规则'}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
