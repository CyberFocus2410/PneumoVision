import React, { useState } from 'react';
import { GitCompare, TrendingUp, TrendingDown, Minus, ArrowRight, Play, UploadCloud } from 'lucide-react';
import { compareLongitudinal } from '../api';

const DEMO_PAIRS = [
  {
    title: 'Pneumonia Treatment Follow-up (Resolving)',
    prior: 'sample_pneumonia',
    current: 'sample_normal',
    desc: 'Baseline RLL airspace opacity compared against 14-day post-antibiotic radiograph.'
  },
  {
    title: 'Developing Pleural Effusion (Progression)',
    prior: 'sample_normal',
    current: 'sample_effusion',
    desc: 'Baseline normal radiograph vs new left-sided blunting and meniscus sign.'
  }
];

export default function LongitudinalTab() {
  const [priorId, setPriorId] = useState('sample_pneumonia');
  const [currentId, setCurrentId] = useState('sample_normal');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  const runComparison = async (p = priorId, c = currentId) => {
    setIsComparing(true);
    try {
      const data = await compareLongitudinal(p, c);
      setComparisonResult(data);
    } catch (e) {
      console.error(e);
      alert('Longitudinal comparison failed: ' + e.message);
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="clinical-card">
        <div className="card-title-row">
          <span className="card-title">
            <GitCompare size={18} /> Longitudinal Radiograph Disease Progression Analysis
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Compare baseline (prior study) against follow-up (current study) to quantify trajectory of disease resolution or progression over time.
        </p>

        {/* Demo Study Pair Presets */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
          {DEMO_PAIRS.map((pair, idx) => (
            <div
              key={idx}
              className="sample-item-btn"
              style={{ padding: '12px', cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}
              onClick={() => {
                setPriorId(pair.prior);
                setCurrentId(pair.current);
                runComparison(pair.prior, pair.current);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 700, color: 'var(--cyan-primary)' }}>{pair.title}</span>
                <Play size={14} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pair.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Results Card */}
      {comparisonResult && (
        <div className="clinical-card">
          <div className="card-title-row">
            <span className="card-title">Comparative Progression Trajectory</span>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Prior: {comparisonResult.prior_case_id} ➔ Current: {comparisonResult.current_case_id}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Prior View */}
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                PRIOR STUDY (Baseline) — Primary: {comparisonResult.prior_primary}
              </span>
              {Object.values(comparisonResult.prior_heatmaps)[0]?.overlay_url && (
                <img
                  src={Object.values(comparisonResult.prior_heatmaps)[0].overlay_url}
                  alt="Prior Radiograph"
                  style={{ width: '100%', height: '240px', objectFit: 'contain', background: '#000', borderRadius: '4px' }}
                />
              )}
            </div>

            {/* Current View */}
            <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                CURRENT STUDY (Follow-up) — Primary: {comparisonResult.current_primary}
              </span>
              {Object.values(comparisonResult.current_heatmaps)[0]?.overlay_url && (
                <img
                  src={Object.values(comparisonResult.current_heatmaps)[0].overlay_url}
                  alt="Current Radiograph"
                  style={{ width: '100%', height: '240px', objectFit: 'contain', background: '#000', borderRadius: '4px' }}
                />
              )}
            </div>
          </div>

          {/* Longitudinal Delta Table */}
          <div style={{ marginTop: '16px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-strong)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Finding</th>
                  <th style={{ padding: '8px 12px' }}>Prior Probability</th>
                  <th style={{ padding: '8px 12px' }}>Current Probability</th>
                  <th style={{ padding: '8px 12px' }}>Delta</th>
                  <th style={{ padding: '8px 12px' }}>Clinical Trajectory</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResult.findings_comparison.map((f) => {
                  let trajColor = 'var(--text-secondary)';
                  let icon = <Minus size={14} />;
                  if (f.trajectory.includes('PROGRESSION') || f.trajectory.includes('INCREASE') || f.trajectory.includes('DEVELOPING')) {
                    trajColor = 'var(--crimson-alert)';
                    icon = <TrendingUp size={14} color="var(--crimson-alert)" />;
                  } else if (f.trajectory.includes('RESOLUTION') || f.trajectory.includes('IMPROVEMENT') || f.trajectory.includes('CLEARING')) {
                    trajColor = 'var(--emerald-success)';
                    icon = <TrendingDown size={14} color="var(--emerald-success)" />;
                  }

                  return (
                    <tr key={f.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
                        {f.label}
                      </td>
                      <td style={{ padding: '8px 12px' }}>{(f.prior_probability * 100).toFixed(1)}%</td>
                      <td style={{ padding: '8px 12px' }}>{(f.current_probability * 100).toFixed(1)}%</td>
                      <td style={{ padding: '8px 12px', fontWeight: 700, color: f.delta > 0 ? 'var(--crimson-alert)' : (f.delta < 0 ? 'var(--emerald-success)' : 'inherit') }}>
                        {f.delta > 0 ? `+${f.delta_percent}%` : `${f.delta_percent}%`}
                      </td>
                      <td style={{ padding: '8px 12px', color: trajColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {icon}
                        <span>{f.trajectory.replace(/_/g, ' ')}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
