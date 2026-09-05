import React, { useState } from 'react';
import {
  FileCheck2, AlertTriangle, CheckCircle2, FileText, Sparkles,
  ThumbsUp, ThumbsDown, MessageSquare
} from 'lucide-react';
import { submitClinicianFeedback } from '../api';

export default function FindingsPanel({
  analysisResult,
  selectedFinding,
  setSelectedFinding,
  onOpenReport
}) {
  const [feedbackSent, setFeedbackSent] = useState({});
  const predictions = analysisResult?.predictions || [];
  const primaryFinding = analysisResult?.primary_finding || 'No Finding';
  const isNormal = primaryFinding === 'No Finding';

  const handleFeedback = async (findingName, agreement) => {
    try {
      await submitClinicianFeedback({
        caseId: analysisResult.case_id,
        finding: findingName,
        agreement: agreement
      });
      setFeedbackSent((prev) => ({ ...prev, [findingName]: agreement ? 'agreed' : 'disagreed' }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="clinical-card">
      <div className="card-title-row">
        <span className="card-title">
          <FileCheck2 size={16} /> Multi-Label Findings
        </span>
        {analysisResult?.case_id && (
          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            CASE #{analysisResult.case_id}
          </span>
        )}
      </div>

      {/* Primary Finding Banner */}
      <div className={`primary-finding-banner ${isNormal ? 'normal' : 'abnormal'}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isNormal ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>
              {isNormal ? 'NO ACUTE ABNORMALITY' : `PRIMARY: ${primaryFinding.toUpperCase()}`}
            </div>
            <div style={{ fontSize: '0.68rem', opacity: 0.9 }}>
              {isNormal ? 'All findings within normal limits' : 'Highest-confidence pathological marker'}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Label Probability Gauges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {predictions.map((p) => {
          const isSelected = selectedFinding === p.label;
          const isPos = p.positive && p.label !== 'No Finding';
          const fillPercent = Math.min(100, Math.max(0, p.probability_percent));
          const thresholdPercent = p.threshold * 100;
          const statusColor = isPos ? 'var(--crimson-alert)' : (p.label === 'No Finding' && p.positive ? 'var(--emerald-success)' : 'var(--cyan-primary)');

          return (
            <div
              key={p.label}
              className={`finding-meter-card ${p.positive ? 'positive' : ''}`}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--cyan-primary)' : undefined,
                boxShadow: isSelected ? '0 0 10px rgba(6, 182, 212, 0.2)' : undefined
              }}
              onClick={() => setSelectedFinding(p.label)}
            >
              <div className="meter-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="meter-name">{p.label}</span>
                  {p.positive && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '3px',
                      background: p.label === 'No Finding' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: p.label === 'No Finding' ? 'var(--emerald-success)' : 'var(--crimson-alert)'
                    }}>
                      {p.label === 'No Finding' ? 'NORMAL' : 'DETECTED'}
                    </span>
                  )}
                </div>
                <div className="meter-percentage" style={{ color: statusColor }}>
                  {p.probability_percent}%
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                    (±{(p.uncertainty_std * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar & Threshold Pin */}
              <div className="meter-bar-track">
                <div
                  className="meter-bar-fill"
                  style={{
                    width: `${fillPercent}%`,
                    background: isPos
                      ? 'linear-gradient(90deg, #f87171, #ef4444)'
                      : (p.label === 'No Finding' && p.positive ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #38bdf8, #06b6d4)')
                  }}
                />
                <div
                  className="meter-threshold-marker"
                  style={{ left: `${thresholdPercent}%` }}
                  title={`Operating Threshold: ${thresholdPercent}%`}
                />
              </div>

              <div className="meter-footer-info">
                <span>Threshold: {thresholdPercent}%</span>
                <span>{p.confidence_band.replace('_', ' ').toLowerCase()}</span>
                {/* Clinician HITL review button */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className="tool-btn"
                    style={{ padding: '2px 4px', fontSize: '0.65rem' }}
                    onClick={(e) => { e.stopPropagation(); handleFeedback(p.label, true); }}
                    title="Agree with Model"
                  >
                    <ThumbsUp size={10} color={feedbackSent[p.label] === 'agreed' ? 'var(--emerald-success)' : undefined} />
                  </button>
                  <button
                    className="tool-btn"
                    style={{ padding: '2px 4px', fontSize: '0.65rem' }}
                    onClick={(e) => { e.stopPropagation(); handleFeedback(p.label, false); }}
                    title="Disagree with Model"
                  >
                    <ThumbsDown size={10} color={feedbackSent[p.label] === 'disagreed' ? 'var(--crimson-alert)' : undefined} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Generation Action */}
      <button className="btn-primary" style={{ marginTop: 'auto' }} onClick={onOpenReport}>
        <FileText size={16} /> Generate Radiology Report
      </button>
    </div>
  );
}
