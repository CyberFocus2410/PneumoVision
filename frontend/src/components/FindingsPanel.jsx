import React, { useState } from 'react';
import {
  FileCheck2, AlertTriangle, CheckCircle2, FileText, Sparkles,
  ThumbsUp, ThumbsDown, BookOpen, HeartPulse, Stethoscope, HelpCircle
} from 'lucide-react';
import { submitClinicianFeedback } from '../api';

export default function FindingsPanel({
  analysisResult,
  selectedFinding,
  setSelectedFinding,
  onOpenReport
}) {
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' or 'clinician'
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
    <div className="pacs-sidebar-right">
      {/* Primary Finding Banner */}
      <div className="panel-section">
        <div style={{
          background: isNormal ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          borderLeft: `4px solid ${isNormal ? 'var(--emerald-success)' : 'var(--crimson-alert)'}`,
          padding: '10px 12px',
          borderRadius: 'var(--radius-xs)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {isNormal ? <CheckCircle2 size={18} color="var(--emerald-success)" /> : <AlertTriangle size={18} color="var(--crimson-alert)" />}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isNormal ? 'var(--emerald-success)' : '#f87171' }}>
              {isNormal ? 'NO ACUTE ABNORMALITY' : `PRIMARY FINDING: ${primaryFinding.toUpperCase()}`}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {isNormal ? 'All target findings within normal limits' : 'Highest-confidence model detection'}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Mode Intelligence Switcher */}
      <div className="intelligence-mode-toggle">
        <button
          className={`mode-toggle-btn ${activeTab === 'patient' ? 'active' : ''}`}
          onClick={() => setActiveTab('patient')}
        >
          <HeartPulse size={13} /> Plain English (Patient)
        </button>
        <button
          className={`mode-toggle-btn ${activeTab === 'clinician' ? 'active' : ''}`}
          onClick={() => setActiveTab('clinician')}
        >
          <Stethoscope size={13} /> Clinician Analytics
        </button>
      </div>

      {/* Mode 1: Patient-Friendly Explanation */}
      {activeTab === 'patient' && (
        <div className="panel-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="patient-explanation-box">
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>
              What Did the AI See?
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: '1.45' }}>
              {isNormal
                ? 'The AI system scanned your lungs and heart. Everything appears clear and healthy, with no signs of pneumonia or fluid buildup.'
                : `The model identified visual patterns suggestive of ${primaryFinding}. In simple words, there is an area of attention in your chest that your doctor should examine.`
              }
            </p>
          </div>

          <div className="patient-explanation-box" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.25)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--blue-info)' }}>
              Recommended Next Steps
            </span>
            <ul className="patient-action-list">
              <li>&bull; Share this summary with your treating physician for medical confirmation.</li>
              <li>&bull; Discuss how these findings match your current symptoms (cough, fever, fatigue).</li>
              <li>&bull; If you feel severe shortness of breath or dizziness, seek urgent medical care.</li>
            </ul>
          </div>

          <div className="patient-explanation-box" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.25)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--amber-warning)' }}>
              Questions to Ask Your Doctor
            </span>
            <ul className="patient-action-list">
              <li>&bull; "Does this X-ray explain my current symptoms?"</li>
              <li>&bull; "Do I need prescription medication (like antibiotics) or further follow-up?"</li>
            </ul>
          </div>
        </div>
      )}

      {/* Mode 2: Clinician Diagnostic Breakdown */}
      {activeTab === 'clinician' && (
        <div className="panel-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="panel-header-title" style={{ marginBottom: '6px' }}>
            <span>Calibrated Probabilities & Cutoffs</span>
          </div>

          {predictions.map((p) => {
            const isSelected = selectedFinding === p.label;
            const isPos = p.positive && p.label !== 'No Finding';
            const fillPercent = Math.min(100, Math.max(0, p.probability_percent));
            const thresholdPercent = p.threshold * 100;
            const statusColor = isPos ? 'var(--crimson-alert)' : (p.label === 'No Finding' && p.positive ? 'var(--emerald-success)' : 'var(--cyan-primary)');

            return (
              <div
                key={p.label}
                className="worklist-item"
                style={{
                  padding: '8px 10px',
                  borderColor: isSelected ? 'var(--cyan-primary)' : undefined,
                  boxShadow: isSelected ? '0 0 8px rgba(6, 182, 212, 0.2)' : undefined
                }}
                onClick={() => setSelectedFinding(p.label)}
              >
                <div className="worklist-item-header">
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.label}</span>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: statusColor }}>
                    {p.probability_percent}%
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '3px' }}>
                      (±{(p.uncertainty_std * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>

                {/* Progress Bar with Threshold Indicator */}
                <div style={{ height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', position: 'relative', margin: '2px 0' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${fillPercent}%`,
                      borderRadius: '3px',
                      background: isPos
                        ? 'linear-gradient(90deg, #f87171, #ef4444)'
                        : (p.label === 'No Finding' && p.positive ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #38bdf8, #06b6d4)')
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      left: `${thresholdPercent}%`,
                      width: '2px',
                      height: '12px',
                      background: '#ffffff',
                      boxShadow: '0 0 4px #000000'
                    }}
                    title={`Decision Cutoff: ${thresholdPercent}%`}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>Cutoff: {thresholdPercent}%</span>
                  <span>{p.confidence_band.replace(/_/g, ' ').toLowerCase()}</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      className="pacs-tool-btn"
                      style={{ padding: '1px 3px', fontSize: '0.6rem' }}
                      onClick={(e) => { e.stopPropagation(); handleFeedback(p.label, true); }}
                      title="Agree with AI"
                    >
                      <ThumbsUp size={9} color={feedbackSent[p.label] === 'agreed' ? 'var(--emerald-success)' : undefined} />
                    </button>
                    <button
                      className="pacs-tool-btn"
                      style={{ padding: '1px 3px', fontSize: '0.6rem' }}
                      onClick={(e) => { e.stopPropagation(); handleFeedback(p.label, false); }}
                      title="Disagree with AI"
                    >
                      <ThumbsDown size={9} color={feedbackSent[p.label] === 'disagreed' ? 'var(--crimson-alert)' : undefined} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Action Button */}
      <div style={{ padding: '14px 16px', marginTop: 'auto' }}>
        <button className="pacs-btn-primary" style={{ width: '100%' }} onClick={onOpenReport}>
          <FileText size={15} /> Export Dual-Mode PDF Report
        </button>
      </div>
    </div>
  );
}
