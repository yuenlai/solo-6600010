import React, { useEffect, useState } from 'react';
import { useAuditStore } from '../store/audit';
import { AuditNote, AuditNoteCreate, AuditNoteRole } from '../types';

const ROLE_CONFIG: Record<AuditNoteRole, { label: string; color: string; bg: string; icon: string }> = {
  developer: { label: '开发', color: '#2196f3', bg: '#e3f2fd', icon: '💻' },
  auditor: { label: '审计', color: '#e53935', bg: '#ffebee', icon: '🔍' },
  owner: { label: '负责人', color: '#ff9800', bg: '#fff3e0', icon: '👤' },
};

export const AuditNotes: React.FC = () => {
  const {
    showAuditNotes,
    setShowAuditNotes,
    auditNotes,
    fetchAuditNotes,
    createAuditNote,
    updateAuditNote,
    deleteAuditNote,
    result,
    batchResult,
  } = useAuditStore();

  const [activeRole, setActiveRole] = useState<AuditNoteRole | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formRole, setFormRole] = useState<AuditNoteRole>('developer');
  const [formAuthor, setFormAuthor] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showAuditNotes) {
      fetchAuditNotes();
    }
  }, [showAuditNotes]);

  if (!showAuditNotes) return null;

  const filteredNotes = activeRole === 'all'
    ? auditNotes
    : auditNotes.filter((n: AuditNote) => n.role === activeRole);

  const groupedByRole: Record<string, AuditNote[]> = {
    developer: auditNotes.filter((n: AuditNote) => n.role === 'developer'),
    auditor: auditNotes.filter((n: AuditNote) => n.role === 'auditor'),
    owner: auditNotes.filter((n: AuditNote) => n.role === 'owner'),
  };

  const resetForm = () => {
    setFormRole('developer');
    setFormAuthor('');
    setFormContent('');
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!formContent.trim() || !formAuthor.trim()) return;
    setSaving(true);
    try {
      const auditId = result?.id || batchResult?.id || '';
      const contractName = result?.contract_name || batchResult?.results?.[0]?.contract_name || '';
      const data: AuditNoteCreate = {
        audit_id: auditId,
        contract_name: contractName,
        role: formRole,
        author: formAuthor,
        content: formContent,
      };
      if (editingId) {
        await updateAuditNote(editingId, data);
      } else {
        await createAuditNote(data);
      }
      resetForm();
    } catch (e) {
      console.error('Failed to save audit note:', e);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (note: AuditNote) => {
    setEditingId(note.id);
    setFormRole(note.role);
    setFormAuthor(note.author);
    setFormContent(note.content);
    setShowForm(true);
  };

  const handleDelete = async (noteId: string) => {
    if (confirm('确定删除此备注吗？')) {
      await deleteAuditNote(noteId);
    }
  };

  const renderNoteCard = (note: AuditNote) => {
    const cfg = ROLE_CONFIG[note.role];
    return (
      <div key={note.id} style={{
        padding: '12px 16px', border: '1px solid #333', borderRadius: '8px',
        background: '#1e1e1e', borderLeft: `3px solid ${cfg.color}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 500,
                background: cfg.bg, color: cfg.color
              }}>
                {cfg.icon} {cfg.label}
              </span>
              <span style={{ fontSize: '12px', color: '#d4d4d4', fontWeight: 500 }}>{note.author}</span>
              <span style={{ fontSize: '11px', color: '#888' }}>
                {note.contract_name && `📄 ${note.contract_name}`}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#d4d4d4', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {note.content}
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
              {new Date(note.created_at).toLocaleString()}
              {note.updated_at !== note.created_at && ` (已编辑)`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button onClick={() => startEdit(note)} style={{
              padding: '2px 8px', border: '1px solid #555', borderRadius: '4px',
              background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '11px'
            }}>编辑</button>
            <button onClick={() => handleDelete(note.id)} style={{
              padding: '2px 8px', border: '1px solid #555', borderRadius: '4px',
              background: 'transparent', color: '#e53935', cursor: 'pointer', fontSize: '11px'
            }}>删除</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        width: '900px', maxWidth: '90vw', maxHeight: '85vh',
        background: '#252526', borderRadius: '8px', overflow: 'auto',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #333' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#d4d4d4' }}>📝 多角色审计备注</h3>
          <button onClick={() => { setShowAuditNotes(false); resetForm(); }} style={{
            padding: '6px 12px', border: '1px solid #555', borderRadius: '4px',
            background: 'transparent', color: '#ccc', cursor: 'pointer'
          }}>关闭</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', borderBottom: '1px solid #333', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>角色筛选：</span>
          <button onClick={() => setActiveRole('all')} style={{
            padding: '4px 12px', borderRadius: '4px', border: '1px solid #555',
            background: activeRole === 'all' ? '#e53935' : 'transparent',
            color: activeRole === 'all' ? '#fff' : '#ccc', cursor: 'pointer', fontSize: '12px'
          }}>全部 ({auditNotes.length})</button>
          {(Object.keys(ROLE_CONFIG) as AuditNoteRole[]).map(role => (
            <button key={role} onClick={() => setActiveRole(role)} style={{
              padding: '4px 12px', borderRadius: '4px', border: `1px solid ${ROLE_CONFIG[role].color}40`,
              background: activeRole === role ? ROLE_CONFIG[role].color : 'transparent',
              color: activeRole === role ? '#fff' : ROLE_CONFIG[role].color,
              cursor: 'pointer', fontSize: '12px'
            }}>
              {ROLE_CONFIG[role].icon} {ROLE_CONFIG[role].label} ({groupedByRole[role].length})
            </button>
          ))}
          <button onClick={() => { resetForm(); setShowForm(true); }} style={{
            marginLeft: 'auto', padding: '4px 14px', borderRadius: '4px', border: 'none',
            background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 500
          }}>+ 新增备注</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #333' }}>
          {(Object.keys(ROLE_CONFIG) as AuditNoteRole[]).map(role => {
            const cfg = ROLE_CONFIG[role];
            const count = groupedByRole[role].length;
            return (
              <div key={role} style={{
                padding: '12px', background: '#1e1e1e', borderRadius: '8px',
                border: `1px solid ${cfg.color}30`, textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: cfg.color }}>{count}</div>
                <div style={{ fontSize: '12px', color: '#888' }}>{cfg.icon} {cfg.label}备注</div>
              </div>
            );
          })}
        </div>

        {showForm && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #333', background: '#1e1e1e' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#d4d4d4', marginBottom: '12px' }}>
              {editingId ? '编辑备注' : '新增备注'}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#888', marginBottom: '4px', display: 'block' }}>角色</label>
                <select value={formRole} onChange={e => setFormRole(e.target.value as AuditNoteRole)} style={{
                  padding: '8px 12px', borderRadius: '4px', border: '1px solid #555',
                  background: '#252526', color: '#d4d4d4', fontSize: '13px', minWidth: '120px'
                }}>
                  {(Object.keys(ROLE_CONFIG) as AuditNoteRole[]).map(role => (
                    <option key={role} value={role}>{ROLE_CONFIG[role].icon} {ROLE_CONFIG[role].label}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px', color: '#888', marginBottom: '4px', display: 'block' }}>署名</label>
                <input value={formAuthor} onChange={e => setFormAuthor(e.target.value)} placeholder="输入您的名字" style={{
                  width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #555',
                  background: '#252526', color: '#d4d4d4', fontSize: '13px', outline: 'none'
                }} />
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11px', color: '#888', marginBottom: '4px', display: 'block' }}>处理意见</label>
              <textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="输入处理意见..." rows={4} style={{
                width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #555',
                background: '#252526', color: '#d4d4d4', fontSize: '13px', outline: 'none', resize: 'vertical', lineHeight: 1.5
              }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={resetForm} style={{
                padding: '6px 16px', borderRadius: '4px', border: '1px solid #555',
                background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: '13px'
              }}>取消</button>
              <button onClick={handleSave} disabled={saving || !formContent.trim() || !formAuthor.trim()} style={{
                padding: '6px 16px', borderRadius: '4px', border: 'none',
                background: '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                opacity: (saving || !formContent.trim() || !formAuthor.trim()) ? 0.5 : 1
              }}>{saving ? '保存中...' : (editingId ? '更新' : '提交')}</button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
          {filteredNotes.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: '40px', fontSize: '14px' }}>
              暂无{activeRole !== 'all' ? ROLE_CONFIG[activeRole as AuditNoteRole].label : ''}备注，点击"新增备注"添加
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredNotes.map((note: AuditNote) => renderNoteCard(note))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
