import React from 'react';
import {
  Activity,
  ShieldAlert,
  Moon,
  Sun,
  Layers,
  GitCompare,
  Info,
  Shield,
  History,
  Stethoscope,
  User,
  LogOut,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeTab, setActiveTab, healthData, theme, setTheme, onOpenAudit, onOpenAuth }) {
  const { user, role, is_verified, isAuthenticated, logout } = useAuth();

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
              Explainable Deep Learning Abnormality Screening & On-Chain EHR
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
          
          {role === 'PATIENT' ? (
            <button
              className={`nav-tab-btn ${activeTab === 'patient' ? 'active' : ''}`}
              onClick={() => setActiveTab('patient')}
              style={{
                borderColor: activeTab === 'patient' ? 'var(--emerald-success)' : undefined,
                color: activeTab === 'patient' ? 'var(--emerald-success)' : undefined
              }}
            >
              <User size={14} /> My Health Portal
            </button>
          ) : (
            <button
              className={`nav-tab-btn ${activeTab === 'doctor' ? 'active' : ''}`}
              onClick={() => {
                if (!isAuthenticated) {
                  onOpenAuth('DOCTOR', 'login');
                } else {
                  setActiveTab('doctor');
                }
              }}
              style={{
                borderColor: activeTab === 'doctor' ? 'var(--cyan-primary)' : undefined,
                color: activeTab === 'doctor' ? 'var(--cyan-primary)' : undefined
              }}
            >
              <Stethoscope size={14} /> Doctor Station
            </button>
          )}

          <button
            className={`nav-tab-btn ${activeTab === 'longitudinal' ? 'active' : ''}`}
            onClick={() => setActiveTab('longitudinal')}
          >
            <GitCompare size={14} /> Longitudinal Study
          </button>
          
          <button
            className={`nav-tab-btn ${activeTab === 'access' ? 'active' : ''}`}
            onClick={() => setActiveTab('access')}
          >
            <Shield size={14} /> Access Control
          </button>
          
          <button
            className={`nav-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} /> Care History
          </button>
        </div>

        {/* Right Status & Controls */}
        <div className="header-actions">
          {/* User Status / Login Button */}
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                onClick={() => role === 'DOCTOR' && setActiveTab('doctor')}
                style={{
                  background: 'var(--bg-card)',
                  border: is_verified ? '1px solid var(--emerald-success)' : '1px solid var(--amber-warning)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: role === 'DOCTOR' ? 'pointer' : 'default'
                }}
                title={role === 'DOCTOR' ? (is_verified ? 'Verified Physician' : 'Doctor: Verification Pending') : 'Patient Profile'}
              >
                {role === 'DOCTOR' ? (
                  <Stethoscope size={13} color={is_verified ? 'var(--emerald-success)' : 'var(--amber-warning)'} />
                ) : (
                  <User size={13} color="var(--cyan-primary)" />
                )}
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user?.full_name ? (role === 'DOCTOR' ? `Dr. ${user.full_name.replace(/^Dr\.\s*/i, '')}` : user.full_name) : user?.email}
                </span>
                {role === 'DOCTOR' && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    background: is_verified ? 'var(--emerald-bg)' : 'var(--amber-bg)',
                    color: is_verified ? 'var(--emerald-success)' : 'var(--amber-warning)'
                  }}>
                    {is_verified ? 'VERIFIED' : 'PENDING'}
                  </span>
                )}
              </div>

              <button
                className="tool-btn"
                onClick={logout}
                title="Sign Out"
                style={{ color: 'var(--crimson-alert)', padding: '5px 8px' }}
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              className="pacs-btn-primary"
              onClick={() => onOpenAuth('DOCTOR', 'login')}
              style={{ fontSize: '0.74rem', padding: '5px 12px' }}
            >
              <KeyRound size={13} /> Sign In
            </button>
          )}

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

