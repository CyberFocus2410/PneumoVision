import React from 'react';
import {
  AlertTriangle,
  Layers,
  Shield,
  History,
  ShieldAlert,
  Stethoscope,
  User,
  LogOut,
  KeyRound,
  Sun,
  Moon,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MonoHash, StatusPill, Badge } from './common';

export default function Header({
  activeTab,
  setActiveTab,
  healthData,
  theme,
  setTheme,
  onOpenAudit,
  onOpenAuth
}) {
  const { user, role, is_verified, isAuthenticated, patient_id, wallet_address, logout } = useAuth();

  const currentPatient = patient_id || '0x8f4c21e07b7194f2d348b29a';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-dicom-surface text-dicom-text-primary border-b border-dicom-border select-none">
      {/* Top Clinical & Network Strip */}
      <div className="h-14 w-full px-space-md flex items-center justify-between border-b border-dicom-border">
        {/* Brand & Identity */}
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-sm cursor-pointer" onClick={() => setActiveTab('single')}>
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center border border-dicom-border">
              <span className="font-bold text-secondary text-sm">PV</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-dicom-text-primary font-bold">
                PneumoVision
              </span>
              <span className="text-[10px] text-dicom-text-secondary leading-none">
                Clinical Workstation
              </span>
            </div>
          </div>

          <Badge variant="dark" size="sm">
            MST TESTNET (4731)
          </Badge>

          {/* Active Patient Identifier */}
          <div className="hidden sm:flex items-center gap-space-xs bg-dicom-canvas px-space-sm py-1 rounded border border-dicom-border">
            <span className="font-label-sm text-label-sm text-dicom-text-secondary">PATIENT:</span>
            <MonoHash
              hash={currentPatient}
              truncate
              theme="pacs"
              size="sm"
            />
            <StatusPill status="verified" label="CONSENT ACTIVE" size="sm" />
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="hidden xl:flex items-center h-full gap-space-xs">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`h-full flex items-center gap-1.5 px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'single'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>AI Diagnostic Screening</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`h-full flex items-center gap-1.5 px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'access'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Patient Access & Consents</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`h-full flex items-center gap-1.5 px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'history'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Care History Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tamper')}
            className={`h-full flex items-center gap-1.5 px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'tamper'
                ? 'bg-surface-card text-alert-tamper border-t-2 border-alert-tamper font-headline-sm'
                : 'text-dicom-text-secondary hover:text-alert-tamper hover:bg-dicom-border/40'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Tamper Audit & Integrity</span>
          </button>

          {role === 'DOCTOR' && isAuthenticated && (
            <button
              type="button"
              onClick={() => setActiveTab('doctor')}
              className={`h-full flex items-center gap-1.5 px-space-md font-body-md text-body-md transition-colors ${
                activeTab === 'doctor'
                  ? 'bg-surface-card text-secondary border-t-2 border-secondary font-headline-sm'
                  : 'text-secondary-fixed-dim hover:text-dicom-text-primary hover:bg-dicom-border/40'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Station</span>
            </button>
          )}

          {role === 'PATIENT' && isAuthenticated && (
            <button
              type="button"
              onClick={() => setActiveTab('patient')}
              className={`h-full flex items-center gap-1.5 px-space-md font-body-md text-body-md transition-colors ${
                activeTab === 'patient'
                  ? 'bg-surface-card text-status-verified border-t-2 border-status-verified font-headline-sm'
                  : 'text-status-verified hover:text-dicom-text-primary hover:bg-dicom-border/40'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Patient Portal</span>
            </button>
          )}
        </nav>

        {/* Right Status, User Profile & Actions */}
        <div className="flex items-center gap-space-md">
          <div className="hidden lg:flex items-center gap-space-sm border-r border-dicom-border pr-space-md font-label-sm text-label-sm">
            <div className="flex items-center gap-1 text-dicom-text-secondary">
              <span className="w-2 h-2 rounded-full bg-status-verified animate-pulse" />
              <span>MST Synced</span>
            </div>
            <div className="flex items-center gap-1 text-dicom-text-secondary">
              <span className="font-semibold text-secondary">DenseNet-121</span>
              <span>Ready</span>
            </div>
          </div>

          {/* User Auth Info */}
          {isAuthenticated ? (
            <div className="flex items-center gap-space-sm">
              <div className="text-right hidden sm:block">
                <div className="font-headline-sm text-headline-sm text-dicom-text-primary leading-tight">
                  {user?.full_name ? (role === 'DOCTOR' ? `Dr. ${user.full_name.replace(/^Dr\.\s*/i, '')}` : user.full_name) : user?.email}
                </div>
                <div className="font-label-sm text-label-sm text-dicom-text-secondary">
                  {role === 'DOCTOR' ? (is_verified ? 'Verified Attending' : 'Verification Pending') : 'Patient Profile'}
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-dicom-border">
                {role === 'DOCTOR' ? <Stethoscope className="w-4 h-4 text-secondary" /> : <User className="w-4 h-4 text-dicom-text-primary" />}
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1 text-dicom-text-secondary hover:text-alert-tamper transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('DOCTOR', 'login')}
              className="px-space-md py-1 bg-secondary hover:bg-secondary/90 text-on-primary font-headline-sm text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Theme Toggle & Audit modal */}
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={onOpenAudit}
              title="System Audit & Model Governance"
              className="p-1.5 text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border rounded transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Clinical Theme"
              className="p-1.5 text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border rounded transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Subnav Bar */}
      <div className="xl:hidden flex items-center justify-around h-10 bg-dicom-surface border-b border-dicom-border overflow-x-auto text-xs px-space-sm">
        <button
          type="button"
          onClick={() => setActiveTab('single')}
          className={`px-space-sm py-1 rounded font-medium ${activeTab === 'single' ? 'bg-surface-card text-text-primary' : 'text-dicom-text-secondary'}`}
        >
          Screening
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('access')}
          className={`px-space-sm py-1 rounded font-medium ${activeTab === 'access' ? 'bg-surface-card text-text-primary' : 'text-dicom-text-secondary'}`}
        >
          Consents
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-space-sm py-1 rounded font-medium ${activeTab === 'history' ? 'bg-surface-card text-text-primary' : 'text-dicom-text-secondary'}`}
        >
          Care Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tamper')}
          className={`px-space-sm py-1 rounded font-medium ${activeTab === 'tamper' ? 'bg-alert-tamper text-on-primary' : 'text-dicom-text-secondary'}`}
        >
          Tamper Audit
        </button>
        {role === 'DOCTOR' && isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('doctor')}
            className={`px-space-sm py-1 rounded font-medium ${activeTab === 'doctor' ? 'bg-surface-card text-secondary' : 'text-dicom-text-secondary'}`}
          >
            Doctor
          </button>
        )}
        {role === 'PATIENT' && isAuthenticated && (
          <button
            type="button"
            onClick={() => setActiveTab('patient')}
            className={`px-space-sm py-1 rounded font-medium ${activeTab === 'patient' ? 'bg-surface-card text-status-verified' : 'text-dicom-text-secondary'}`}
          >
            Patient
          </button>
        )}
      </div>

      {/* Regulatory Notice Banner */}
      <div className="h-7 w-full bg-status-caution-bg border-b border-status-caution-border px-space-md flex items-center justify-between text-status-caution">
        <div className="flex items-center gap-space-xs font-label-md text-label-md truncate">
          <AlertTriangle className="w-4 h-4 shrink-0 text-status-caution" />
          <span className="font-headline-sm text-headline-sm uppercase tracking-wider text-status-caution shrink-0">
            Regulatory Notice:
          </span>
          <span className="font-body-sm text-body-sm text-text-secondary truncate">
            Research/educational screening aid only — DenseNet-121 v1.02 binary classifier. Not cleared by FDA/CE for primary diagnostic use. Radiologist or attending physician review strictly required.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-space-xs font-label-sm text-label-sm text-text-secondary shrink-0 pl-2">
          <span>MST Protocol v1.0</span>
        </div>
      </div>
    </header>
  );
}
