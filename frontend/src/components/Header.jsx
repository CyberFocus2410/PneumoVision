import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, role, isAuthenticated, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const patientHash = '0x8f4c21e07b7194f2d348b29a';
  const patientDisplay = '0x8f4c...b29a';

  const handleCopyPatient = () => {
    navigator.clipboard.writeText(patientHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formattedTime = currentTime.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ' ' + currentTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0B132B] text-slate-100 select-none font-sans border-b border-slate-800 shadow-lg">
      {/* Upper Navigation Strip (h-14) */}
      <div className="h-14 w-full px-4 md:px-6 flex items-center justify-between">
        {/* Brand Logo & Node / Live Timestamp */}
        <div className="flex items-center gap-3 md:gap-4">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            onClick={() => setActiveTab('screening')}
          >
            <div className="w-8 h-8 rounded bg-[#070A0F] border border-slate-700/80 flex items-center justify-center shrink-0 shadow-inner group-hover:border-cyan-500/50 transition-colors">
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
              <span className="px-1.5 py-0.5 bg-[#1E293B] text-cyan-300 text-[9px] font-mono font-semibold tracking-wider rounded border border-slate-700">
                CLINICAL
              </span>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 text-cyan-400 border border-slate-800 rounded font-mono text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>NODE #04-MST_TESTNET</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 bg-slate-900/90 text-slate-300 border border-slate-800 rounded font-mono text-[11px]">
            <span className="material-symbols-outlined text-[13px] text-slate-400">schedule</span>
            <span className="text-cyan-200 font-semibold">{formattedTime}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">PATIENT:</span>
            <span className="font-mono text-slate-200 font-medium" title={patientHash}>
              {patientDisplay}
            </span>
            <button
              type="button"
              onClick={handleCopyPatient}
              className="text-slate-400 hover:text-white p-0.5 ml-0.5 cursor-pointer transition-colors"
              title="Copy Patient Address"
            >
              <span className="material-symbols-outlined text-[13px]">
                {copied ? 'check' : 'content_copy'}
              </span>
            </button>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-1.5 py-0.5 rounded ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              CONSENT ACTIVE
            </span>
          </div>
        </div>

        {/* Center Nav Tabs */}
        <nav className="hidden lg:flex items-center h-full gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('screening')}
            className={`h-full flex items-center px-4 text-[13px] font-medium transition-all ${
              activeTab === 'screening'
                ? 'bg-slate-900 text-cyan-300 border-b-2 border-cyan-400 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            AI Diagnostic Screening
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`h-full flex items-center px-4 text-[13px] font-medium transition-all ${
              activeTab === 'access'
                ? 'bg-slate-900 text-cyan-300 border-b-2 border-cyan-400 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Patient Access &amp; Consents
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`h-full flex items-center px-4 text-[13px] font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-slate-900 text-cyan-300 border-b-2 border-cyan-400 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Care History Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tamper')}
            className={`h-full flex items-center px-4 text-[13px] font-medium transition-all ${
              activeTab === 'tamper'
                ? 'bg-slate-900 text-cyan-300 border-b-2 border-cyan-400 font-semibold shadow-inner'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Tamper Audit &amp; Integrity
          </button>
        </nav>

        {/* Right Status & Attending Clinician Profile */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden 2xl:flex items-center gap-2 border-r border-slate-800 pr-4 text-xs">
            <div className="flex items-center gap-1 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-[11px]">:4731 Synced</span>
            </div>
            <div className="flex items-center gap-1 text-slate-300 ml-2">
              <span className="material-symbols-outlined text-[14px] text-cyan-400">memory</span>
              <span className="font-mono text-[11px]">DenseNet-121 Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-100 leading-none">
                {user?.full_name || 'Dr. Vivan, MD'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Radiology Dept · Bay 3
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-300 shadow-sm">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('DOCTOR', 'login')}
                className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded transition-all shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Nav Drawer Row */}
      <div className="lg:hidden flex items-center justify-around h-9 bg-slate-900/95 border-t border-slate-800 text-xs px-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('screening')}
          className={`px-3 py-1 font-medium rounded transition-colors ${activeTab === 'screening' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
        >
          Screening
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('access')}
          className={`px-3 py-1 font-medium rounded transition-colors ${activeTab === 'access' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
        >
          Consents
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1 font-medium rounded transition-colors ${activeTab === 'history' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
        >
          Care Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tamper')}
          className={`px-3 py-1 font-medium rounded transition-colors ${activeTab === 'tamper' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'text-slate-400'}`}
        >
          Tamper Audit
        </button>
      </div>
    </header>
  );
}
