import React, { useState } from 'react';
import { ScoreInterpretation as ScoreInterpretationType, BatchScoreInterpretation, ScoreBreakdown } from '../types';

const SEV_COLORS: Record<string, string> = {
  critical: '#b71c1c', high: '#e53935', medium: '#ff9800', low: '#ffc107', info: '#2196f3'
};

const SEV_LABELS: Record<string, string> = {
  critical: '严重', high: '高危', medium: '中危', low: '低危', info: '信息'
};

const SEV_WEIGHT_DESC: Record<string, string> = {
  critical: '每个漏洞扣25分，可能导致资金损失或合约瘫痪',
  high: '每个漏洞扣15分，存在重大安全隐患',
  medium: '每个漏洞扣8分，可能被利用造成损失',
  low: '每个漏洞扣3分，影响较小但建议修复',
  info: '每个漏洞扣1分，主要为代码规范建议'
};

interface SingleScoreProps {
  interpretation: ScoreInterpretationType;
}

interface BatchScoreProps {
  interpretation: BatchScoreInterpretation;
  isBatch: true;
}

type ScoreInterpretationProps = SingleScoreProps | BatchScoreProps;

export const ScoreInterpretation: React.FC<ScoreInterpretationProps> = (props) => {
  const [expanded, setExpanded] = useState(true);

  const isBatch = 'isBatch' in props && props.isBatch;
  const interpretation = props.interpretation;

  const renderBreakdown = (breakdown: ScoreBreakdown[]) => {
    const maxPenalty = Math.max(...breakdown.map(b => b.total_penalty), 1);
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#333' }}>扣分明细</div>
        {breakdown.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEV_COLORS[item.severity] }}></span>
                {SEV_LABELS[item.severity]} ({item.count}个)
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: SEV_COLORS[item.severity] }}>
                -{item.total_penalty}分
              </span>
            </div>
            <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(item.total_penalty / maxPenalty) * 100}%`,
                  background: SEV_COLORS[item.severity],
                  borderRadius: '3px'
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              每个扣{item.penalty_per_item}分 · {SEV_WEIGHT_DESC[item.severity]}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isBatch) {
    const batchInterp = interpretation as BatchScoreInterpretation;
    return (
      <div style={{ background: '#fafafa', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #eee' }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>📊 安全评分解读</div>
          <span style={{ fontSize: '12px', color: '#888' }}>{expanded ? '收起 ▲' : '展开 ▼'}</span>
        </div>

        {expanded && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '16px', padding: '12px', background: '#fff', borderRadius: '6px' }}>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: batchInterp.average_score >= 80 ? '#2e7d32' : batchInterp.average_score >= 50 ? '#e65100' : '#b71c1c' }}>
                  {batchInterp.average_score}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>平均分</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e53935' }}>{batchInterp.total_contracts}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>合约数</div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ff9800' }}>-{batchInterp.total_deduction}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>平均扣分</div>
              </div>
            </div>

            {batchInterp.breakdown.length > 0 && renderBreakdown(batchInterp.breakdown)}

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#333' }}>风险分布</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, padding: '8px', background: '#e8f5e9', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e7d32' }}>{batchInterp.risk_distribution.safe || 0}</div>
                  <div style={{ fontSize: '11px', color: '#558b2f' }}>安全(≥80)</div>
                </div>
                <div style={{ flex: 1, padding: '8px', background: '#fff3e0', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#e65100' }}>{batchInterp.risk_distribution.warning || 0}</div>
                  <div style={{ fontSize: '11px', color: '#ef6c00' }}>警告(50-79)</div>
                </div>
                <div style={{ flex: 1, padding: '8px', background: '#ffebee', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#b71c1c' }}>{batchInterp.risk_distribution.danger || 0}</div>
                  <div style={{ fontSize: '11px', color: '#c62828' }}>危险(&#60;50)</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px', background: batchInterp.average_score >= 80 ? '#e8f5e9' : batchInterp.average_score >= 50 ? '#fff3e0' : '#ffebee', borderRadius: '6px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: batchInterp.average_score >= 80 ? '#2e7d32' : batchInterp.average_score >= 50 ? '#e65100' : '#b71c1c' }}>
                整体结论
              </div>
              <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#555' }}>{batchInterp.overall_conclusion}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#333' }}>🔍 关键发现</div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {batchInterp.key_findings.map((finding, idx) => (
                  <li key={idx} style={{ fontSize: '12px', color: '#555', marginBottom: '4px', lineHeight: 1.5 }}>{finding}</li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#333' }}>💡 改进建议</div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {batchInterp.recommendations.map((rec, idx) => (
                  <li key={idx} style={{ fontSize: '12px', color: '#555', marginBottom: '4px', lineHeight: 1.5 }}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  const singleInterp = interpretation as ScoreInterpretationType;
  return (
    <div style={{ background: '#fafafa', borderRadius: '8px', padding: '16px', marginBottom: '16px', border: '1px solid #eee' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>📊 安全评分解读</div>
        <span style={{ fontSize: '12px', color: '#888' }}>{expanded ? '收起 ▲' : '展开 ▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '16px', padding: '12px', background: '#fff', borderRadius: '6px' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: singleInterp.score >= 80 ? '#2e7d32' : singleInterp.score >= 50 ? '#e65100' : '#b71c1c' }}>
                {singleInterp.score}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>当前得分</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9e9e9e' }}>{singleInterp.max_possible_score}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>满分</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e53935' }}>-{singleInterp.total_deduction}</div>
              <div style={{ fontSize: '11px', color: '#888' }}>总扣分</div>
            </div>
          </div>

          {singleInterp.breakdown.length > 0 && renderBreakdown(singleInterp.breakdown)}

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#333' }}>⚖️ 风险权重说明</div>
            <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.6 }}>{singleInterp.risk_weight_summary}</div>
          </div>

          <div style={{ padding: '12px', background: singleInterp.score >= 80 ? '#e8f5e9' : singleInterp.score >= 50 ? '#fff3e0' : '#ffebee', borderRadius: '6px', marginBottom: '16px' }}>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', color: singleInterp.score >= 80 ? '#2e7d32' : singleInterp.score >= 50 ? '#e65100' : '#b71c1c' }}>
              整体结论
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#555' }}>{singleInterp.overall_conclusion}</div>
          </div>

          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#333' }}>💡 修复建议</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {singleInterp.recommendations.map((rec, idx) => (
                <li key={idx} style={{ fontSize: '12px', color: '#555', marginBottom: '4px', lineHeight: 1.5 }}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
