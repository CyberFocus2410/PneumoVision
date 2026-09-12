import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const patientHash = '0x8f4c21e07b7194f2d348b29a';
  const patientDisplay = '0x8f4c...b29a';

  const handleCopyPatient = () => {
    navigator.clipboard.writeText(patientHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-dicom-surface text-dicom-text-primary select-none font-sans border-b border-dicom-border shadow-md">
      {/* Upper Navigation Strip (h-14) */}
      <div className="h-14 w-full px-space-md flex items-center justify-between border-b border-dicom-border">
        {/* Brand Logo & Node / Patient Identifiers */}
        <div className="flex items-center gap-space-md">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setActiveTab('screening')}
          >
            <div className="w-8 h-8 rounded bg-[#070A0F] border border-dicom-border flex items-center justify-center shrink-0 shadow-sm">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="24" height="24" rx="3" fill="#070A0F" />
                <path d="M6 12h12M12 6v12" stroke="#006781" strokeWidth="2" strokeLinecap="square" />
                <path d="M8 15c0 2.5 1.8 4 4 4s4-1.5 4-4v-5H8v5z" stroke="#94A3B8" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2" fill="#8FDFFF" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[17px] tracking-tight text-white whitespace-nowrap leading-none">
                Pneumo<span className="text-[#8FDFFF]">Vision</span>
              </span>
              <span className="px-1.5 py-0.5 bg-[#1E293B] text-[#94A3B8] text-[9px] font-mono font-semibold tracking-wider rounded border border-dicom-border">
                CLINICAL
              </span>
            </div>
          </div>

          <span className="font-label-sm text-label-sm bg-primary-container text-secondary-container border border-dicom-border px-space-xs py-0.5 rounded font-mono font-medium">
            NODE #04-MST_TESTNET
          </span>

          <div className="hidden sm:flex items-center gap-space-xs bg-dicom-canvas px-space-sm py-1 rounded border border-dicom-border">
            <span className="font-label-sm text-label-sm text-dicom-text-secondary">PATIENT:</span>
            <span className="font-code-hash text-code-hash text-dicom-text-primary" title={patientHash}>
              {patientDisplay}
            </span>
            <button
              type="button"
              onClick={handleCopyPatient}
              className="text-dicom-text-secondary hover:text-dicom-text-primary p-0.5 ml-0.5 cursor-pointer"
              title="Copy Patient Address"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-status-verified bg-status-verified-bg/10 border border-status-verified/40 px-1 py-0.5 rounded ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-verified" />
              CONSENT ACTIVE
            </span>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="hidden lg:flex items-center h-full gap-space-xs">
          <button
            type="button"
            onClick={() => setActiveTab('screening')}
            className={`h-full flex items-center px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'screening'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm text-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            AI Diagnostic Screening
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`h-full flex items-center px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'access'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm text-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            Patient Access &amp; Consents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`h-full flex items-center px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'history'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm text-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            Care History Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tamper')}
            className={`h-full flex items-center px-space-md font-body-md text-body-md transition-colors ${
              activeTab === 'tamper'
                ? 'bg-surface-card text-text-primary border-t-2 border-secondary font-headline-sm text-headline-sm'
                : 'text-dicom-text-secondary hover:text-dicom-text-primary hover:bg-dicom-border/40'
            }`}
          >
            Tamper Audit &amp; Integrity
          </button>
        </nav>

        {/* Right Status & Attending Clinician Profile */}
        <div className="flex items-center gap-space-md">
          <div className="hidden xl:flex items-center gap-space-sm border-r border-dicom-border pr-space-md font-label-sm text-label-sm">
            <div className="flex items-center gap-1 text-dicom-text-secondary">
              <span className="w-2 h-2 rounded-full bg-status-verified animate-pulse" />
              <span>:4731 Synced</span>
            </div>
            <div className="flex items-center gap-1 text-dicom-text-secondary">
              <span className="material-symbols-outlined text-[14px] text-secondary">memory</span>
              <span>DenseNet-121 Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="text-right hidden sm:block">
              <div className="font-headline-sm text-headline-sm text-dicom-text-primary leading-none">
                {user?.full_name || 'Dr. Vivan, MD'}
              </div>
              <div className="font-label-sm text-label-sm text-dicom-text-secondary mt-0.5">
                Radiology Dept · Bay 3
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-dicom-border">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1 text-dicom-text-secondary hover:text-alert-tamper transition-colors ml-1"
              >
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('DOCTOR', 'login')}
                className="px-2 py-1 bg-secondary text-on-primary font-headline-sm text-xs rounded hover:bg-secondary/90 transition-colors ml-1"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer Row */}
      <div className="lg:hidden flex items-center justify-around h-9 bg-dicom-surface border-b border-dicom-border text-xs px-space-sm overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('screening')}
          className={`px-space-sm py-1 font-medium ${activeTab === 'screening' ? 'bg-surface-card text-text-primary' : 'text-dicom-text-secondary'}`}
        >
          Screening
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('access')}
          className={`px-space-sm py-1 font-medium ${activeTab === 'access' ? 'bg-surface-card text-text-primary' : 'text-dicom-text-secondary'}`}
        >
          Consents
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-space-sm py-1 font-medium ${activeTab === 'history' ? 'bg-surface-card text-text-primary' : 'text-dicom-text-secondary'}`}
        >
          Care Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tamper')}
          className={`px-space-sm py-1 font-medium ${activeTab === 'tamper' ? 'bg-surface-card text-alert-tamper' : 'text-dicom-text-secondary'}`}
        >
          Tamper Audit
        </button>
      </div>

      {/* Regulatory Notice Banner (h-7) */}
      <div className="h-7 w-full bg-status-caution-bg border-b border-status-caution-border px-space-md flex items-center justify-between text-status-caution">
        <div className="flex items-center gap-space-xs font-label-md text-label-md truncate">
          <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
          <span className="font-headline-sm text-headline-sm uppercase tracking-wider text-status-caution shrink-0">
            Regulatory Notice:
          </span>
          <span className="font-body-sm text-body-sm text-text-secondary truncate">
            Research/educational screening aid only — DenseNet-121 v1.02 binary classifier. Not cleared by FDA/CE for primary diagnostic use. Radiologist or attending physician review strictly required.
          </span>
        </div>
        <div className="hidden md:flex items-center gap-space-xs font-label-sm text-label-sm text-text-secondary shrink-0 pl-2">
          <span className="material-symbols-outlined text-[13px]">verified</span>
          <span>MST Testnet Protocol</span>
        </div>
      </div>
    </header>
  );
}
