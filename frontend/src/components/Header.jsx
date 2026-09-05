import React from 'react';
import { Activity, ShieldAlert, Cpu, Moon, Sun, Layers, GitCompare, Info } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, healthData, theme, setTheme, onOpenAudit }) {
  return (
    <>
      {/* Persistent Non-Diagnostic Disclaimer */}
      <div className="disclaimer-banner">
        <ShieldAlert size={15} />
        <span>
          RESEARCH DECISION-SUPPORT PROTOTYPE — NOT CLEARED FOR MEDICAL DIAGNOSIS. RADIOLOGIST CONFIRMATION REQUIRED.
        </span>
      </div>

      <header className="clinical-header">
        <div className="brand-section">
          <div className="logo-icon">
            <Activity size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-title">PneumoVision</span>
              <span className="brand-badge">Multi-Label CXR v1.0</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Explainable Deep Learning Abnormality Screening
            </p>
          </div>
        </div>

        {/* Center Tab Navigation */}
        <div className="nav-tab-group">
          <button
            className={`nav-tab-btn ${activeTab === 'single' ? 'active' : ''}`}
            onClick={() => setActiveTab('single')}
          >
            <Layers size={14} /> Single Study
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'longitudinal' ? 'active' : ''}`}
            onClick={() => setActiveTab('longitudinal')}
          >
            <GitCompare size={14} /> Longitudinal Study
          </button>
        </div>

        {/* Right Status & Controls */}
        <div className="header-actions">
          <div className="header-status-pill">
            <span className="status-dot" />
            <span>DenseNet121 ({healthData?.device?.toUpperCase() || 'CPU'})</span>
          </div>

          <button
            className="tool-btn"
            onClick={onOpenAudit}
            title="Model Lineage & Governance"
          >
            <Info size={14} />
            <span>Audit</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Clinical Theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>
    </>
  );
}
