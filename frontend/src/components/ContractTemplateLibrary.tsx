import React, { useState, useEffect } from 'react';
import { useAuditStore } from '../store/audit';
import { ContractTemplate } from '../types';
import axios from 'axios';

const severityColors: Record<string, string> = {
  critical: '#ff4d4f',
  high: '#ff7a45',
  medium: '#faad14',
};

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '中级',
  advanced: '高级',
};

const difficultyColors: Record<string, string> = {
  beginner: '#52c41a',
  intermediate: '#faad14',
  advanced: '#ff4d4f',
};

export const ContractTemplateLibrary: React.FC = () => {
  const { 
    showTemplateLibrary, 
    setShowTemplateLibrary, 
    contractTemplates, 
    setContractTemplates,
    setSourceCode,
    mode,
    updateBatchContract,
    batchContracts,
    setResult,
    setBatchResult,
  } = useAuditStore();
  
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyTarget, setApplyTarget] = useState<string>('');

  useEffect(() => {
    if (showTemplateLibrary && contractTemplates.length === 0) {
      loadTemplates();
    }
  }, [showTemplateLibrary]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/audit/templates');
      setContractTemplates(data);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
    setLoading(false);
  };

  const categories = ['all', ...Array.from(new Set(contractTemplates.map(t => t.category)))];
  const severities = ['all', 'critical', 'high', 'medium'];

  const filteredTemplates = contractTemplates.filter(t => {
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    if (filterSeverity !== 'all' && t.severity !== filterSeverity) return false;
    if (filterDifficulty !== 'all' && t.difficulty !== filterDifficulty) return false;
    return true;
  });

  const applyTemplate = async (template: ContractTemplate) => {
    setApplying(true);
    try {
      if (mode === 'single') {
        setSourceCode(template.source_code);
        setResult(null);
      } else {
        if (applyTarget && applyTarget !== 'new') {
          updateBatchContract(applyTarget, 'source_code', template.source_code);
          updateBatchContract(applyTarget, 'name', template.name);
        } else {
          const { addBatchContract } = useAuditStore.getState();
          addBatchContract();
          const state = useAuditStore.getState();
          const last = state.batchContracts[state.batchContracts.length - 1];
          updateBatchContract(last.id, 'source_code', template.source_code);
          updateBatchContract(last.id, 'name', template.name);
        }
        setBatchResult(null);
      }
      setShowTemplateLibrary(false);
      setSelectedTemplate(null);
    } catch (e) {
      console.error('Failed to apply template:', e);
    }
    setApplying(false);
  };

  if (!showTemplateLibrary) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#1e1e1e', borderRadius: '8px', width: '100%',
        maxWidth: '1100px', maxHeight: '85vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #333'
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>高危合约模板库</h2>
            <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>
              选择典型漏洞样例进行审计演练与结果学习
            </p>
          </div>
          <button 
            onClick={() => { setShowTemplateLibrary(false); setSelectedTemplate(null); }}
            style={{
              background: 'transparent', border: 'none', color: '#888',
              cursor: 'pointer', fontSize: '20px', padding: '4px'
            }}
          >×</button>
        </div>

        <div style={{
          display: 'flex', gap: '12px', padding: '12px 20px',
          borderBottom: '1px solid #333', flexWrap: 'wrap', alignItems: 'center'
        }}>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
              background: '#2d2d2d', color: '#ccc', fontSize: '13px'
            }}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? '全部分类' : c}</option>
            ))}
          </select>

          <select 
            value={filterSeverity} 
            onChange={e => setFilterSeverity(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
              background: '#2d2d2d', color: '#ccc', fontSize: '13px'
            }}
          >
            {severities.map(s => (
              <option key={s} value={s}>{s === 'all' ? '全部严重度' : s === 'critical' ? '严重' : s === 'high' ? '高危' : '中危'}</option>
            ))}
          </select>

          <select 
            value={filterDifficulty} 
            onChange={e => setFilterDifficulty(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
              background: '#2d2d2d', color: '#ccc', fontSize: '13px'
            }}
          >
            <option value="all">全部难度</option>
            <option value="beginner">入门</option>
            <option value="intermediate">中级</option>
            <option value="advanced">高级</option>
          </select>

          {mode === 'batch' && (
            <select 
              value={applyTarget} 
              onChange={e => setApplyTarget(e.target.value)}
              style={{
                padding: '6px 12px', borderRadius: '4px', border: '1px solid #555',
                background: '#2d2d2d', color: '#ccc', fontSize: '13px', marginLeft: 'auto'
              }}
            >
              <option value="new">新建合约标签页</option>
              {batchContracts.map(c => (
                <option key={c.id} value={c.id}>应用到: {c.name}</option>
              ))}
            </select>
          )}

          <span style={{ color: '#888', fontSize: '13px', marginLeft: mode === 'batch' ? 0 : 'auto' }}>
            共 {filteredTemplates.length} 个模板
          </span>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{
            width: selectedTemplate ? '320px' : '100%', borderRight: selectedTemplate ? '1px solid #333' : 'none',
            overflowY: 'auto', padding: '12px'
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>加载中...</div>
            ) : filteredTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>暂无匹配的模板</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTemplates.map(template => (
                  <div 
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    style={{
                      padding: '12px', borderRadius: '6px', cursor: 'pointer',
                      background: selectedTemplate?.id === template.id ? '#2d2d2d' : '#252526',
                      border: selectedTemplate?.id === template.id ? '1px solid #e53935' : '1px solid #333',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{
                        color: severityColors[template.severity],
                        fontSize: '11px', fontWeight: 600,
                        padding: '2px 6px', borderRadius: '3px',
                        background: severityColors[template.severity] + '20'
                      }}>
                        {template.severity === 'critical' ? '严重' : template.severity === 'high' ? '高危' : '中危'}
                      </span>
                      <span style={{
                        color: difficultyColors[template.difficulty],
                        fontSize: '11px', fontWeight: 500,
                        padding: '2px 6px', borderRadius: '3px',
                        background: difficultyColors[template.difficulty] + '20'
                      }}>
                        {difficultyLabels[template.difficulty]}
                      </span>
                      <span style={{ marginLeft: 'auto', color: '#888', fontSize: '11px' }}>
                        {template.category}
                      </span>
                    </div>
                    <div style={{ color: '#fff', fontWeight: 500, fontSize: '14px', marginBottom: '4px' }}>
                      {template.name}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', lineHeight: 1.5 }}>
                      {template.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedTemplate && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{
                  color: severityColors[selectedTemplate.severity],
                  fontSize: '12px', fontWeight: 600,
                  padding: '4px 10px', borderRadius: '4px',
                  background: severityColors[selectedTemplate.severity] + '20'
                }}>
                  {selectedTemplate.severity === 'critical' ? '严重' : selectedTemplate.severity === 'high' ? '高危' : '中危'}
                </span>
                <span style={{
                  color: difficultyColors[selectedTemplate.difficulty],
                  fontSize: '12px', fontWeight: 500,
                  padding: '4px 10px', borderRadius: '4px',
                  background: difficultyColors[selectedTemplate.difficulty] + '20'
                }}>
                  {difficultyLabels[selectedTemplate.difficulty]}
                </span>
              </div>

              <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '18px' }}>
                {selectedTemplate.name}
              </h3>
              <p style={{ color: '#bbb', fontSize: '14px', marginBottom: '20px', lineHeight: 1.6 }}>
                {selectedTemplate.description}
              </p>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  🎯 漏洞类型
                </h4>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedTemplate.vulnerability_types.map((v, i) => (
                    <span key={i} style={{
                      padding: '4px 10px', borderRadius: '4px',
                      background: '#2d2d2d', color: '#ccc', fontSize: '12px'
                    }}>{v}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  ⚠️ 预期漏洞点
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#ffb8b8', fontSize: '13px', lineHeight: 1.8 }}>
                  {selectedTemplate.expected_vulnerabilities.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  📚 学习要点
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#b8e0b8', fontSize: '13px', lineHeight: 1.8 }}>
                  {selectedTemplate.learning_points.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  🌐 真实案例
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#ccc', fontSize: '13px', lineHeight: 1.8 }}>
                  {selectedTemplate.real_world_examples.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>
                  📝 合约代码预览
                </h4>
                <pre style={{
                  background: '#1a1a1a', padding: '12px', borderRadius: '6px',
                  overflow: 'auto', maxHeight: '200px', fontSize: '11px',
                  color: '#d4d4d4', lineHeight: 1.5, fontFamily: 'monospace',
                  margin: 0
                }}>{selectedTemplate.source_code}</pre>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => applyTemplate(selectedTemplate)}
                  disabled={applying}
                  style={{
                    padding: '10px 24px', borderRadius: '4px', border: 'none',
                    background: '#e53935', color: '#fff', cursor: 'pointer',
                    fontWeight: 600, fontSize: '14px',
                    opacity: applying ? 0.6 : 1
                  }}
                >
                  {applying ? '应用中...' : '应用此模板'}
                </button>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{
                    padding: '10px 24px', borderRadius: '4px',
                    border: '1px solid #555', background: 'transparent',
                    color: '#ccc', cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  返回列表
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
