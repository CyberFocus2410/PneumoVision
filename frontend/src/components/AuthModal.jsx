import React, { useState } from 'react';
import {
  X,
  Stethoscope,
  User,
  ShieldCheck,
  KeyRound,
  Mail,
  Lock,
  Building,
  FileBadge,
  Wallet,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialRole = 'DOCTOR', initialMode = 'login' }) {
  const { loginDoctor, signupDoctor, loginPatient, signupPatient } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [role, setRole] = useState(initialRole); // 'DOCTOR' | 'PATIENT'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [medicalLicense, setMedicalLicense] = useState('');
  const [hospitalAffiliation, setHospitalAffiliation] = useState('PneumoVision Diagnostic Network');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (role === 'DOCTOR') {
          await loginDoctor({ email, password });
        } else {
          await loginPatient({ email, password });
        }
        setSuccessMsg('Successfully signed in.');
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        // Signup
        if (role === 'DOCTOR') {
          if (!walletAddress || !medicalLicense) {
            throw new Error('Wallet address and medical license are required for physician onboarding.');
          }
          await signupDoctor({
            email,
            password,
            full_name: fullName,
            wallet_address: walletAddress,
            medical_license: medicalLicense,
            hospital_affiliation: hospitalAffiliation
          });
          setSuccessMsg('Doctor account created! Verification pending by hospital admin.');
        } else {
          await signupPatient({
            email,
            password,
            full_name: fullName,
            wallet_address: walletAddress || null
          });
          setSuccessMsg('Patient account created with pseudonymous on-chain identity.');
        }
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      setError(err.message || 'Authentication request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillDoctor = () => {
    setRole('DOCTOR');
    setMode('login');
    setEmail('doctor@pneumovision.ai');
    setPassword('DoctorPassword2026!');
  };

  const handleQuickFillAdmin = () => {
    setRole('DOCTOR');
    setMode('login');
    setEmail('admin@pneumovision.ai');
    setPassword('AdminPassword2026!');
  };

  const handleQuickFillPatient = () => {
    setRole('PATIENT');
    setMode('login');
    setEmail('patient@pneumovision.ai');
    setPassword('PatientPassword123!');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {mode === 'login' ? 'Sign In to PneumoVision' : 'Create Clinical Account'}
              </h2>
              <p className="text-xs text-slate-400">
                PACS Authentication &amp; MST Testnet Protocol
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 flex flex-col gap-4">
          {/* Main Mode Toggle: Sign In vs Register */}
          <div className="grid grid-cols-2 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              <KeyRound size={14} /> Sign In
            </button>
            <button
              type="button"
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              <User size={14} /> Create Account
            </button>
          </div>

          {/* Role Sub-Toggle: Physician vs Patient */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800/80">
            <button
              type="button"
              onClick={() => { setRole('DOCTOR'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'DOCTOR'
                  ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Stethoscope size={15} /> Physician / Doctor
            </button>

            <button
              type="button"
              onClick={() => { setRole('PATIENT'); setError(null); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                role === 'PATIENT'
                  ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <User size={15} /> Patient Portal
            </button>
          </div>

          {/* Notices */}
          {mode === 'signup' && role === 'DOCTOR' && (
            <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-lg text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong>Physician Verification Required:</strong> New doctor accounts undergo administrative audit before on-chain authorization.
              </div>
            </div>
          )}

          {mode === 'signup' && role === 'PATIENT' && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-lg text-xs text-emerald-200 flex items-start gap-2">
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <strong>Pseudonymous On-Chain Identity:</strong> A private pseudonymous ID is generated. Personal identifiable information is never stored unencrypted on-chain.
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder={role === 'DOCTOR' ? 'Dr. Sarah Smith, MD' : 'Alex Johnson'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder={role === 'DOCTOR' ? 'physician@hospital.org' : 'patient@example.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {mode === 'signup' && role === 'DOCTOR' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Medical License Number</label>
                  <div className="relative">
                    <FileBadge size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. MD-91562037"
                      value={medicalLicense}
                      onChange={(e) => setMedicalLicense(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Hospital / Clinical Affiliation</label>
                  <div className="relative">
                    <Building size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. MetroHealth Radiology Department"
                      value={hospitalAffiliation}
                      onChange={(e) => setHospitalAffiliation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">MST Testnet Provider Wallet Address</label>
                  <div className="relative">
                    <Wallet size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="0xb3C09303335393D511F9eE1C7Bf4f1154904142b"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'signup' && role === 'PATIENT' && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">MST Testnet Patient Wallet (Optional)</label>
                <div className="relative">
                  <Wallet size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="0x... (Leave empty to auto-generate)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Error and Success alerts */}
            {error && (
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-xs text-red-200 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md mt-2 ${
                role === 'DOCTOR'
                  ? 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <KeyRound size={15} />
                  <span>Sign In as {role === 'DOCTOR' ? 'Physician' : 'Patient'}</span>
                </>
              ) : (
                <>
                  <User size={15} />
                  <span>Create {role === 'DOCTOR' ? 'Physician' : 'Patient'} Account</span>
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Presets for Quick Testing */}
          <div className="pt-3 border-t border-slate-800">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
              Fast Reviewer Quick-Fill Logins
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleQuickFillDoctor}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-cyan-300 rounded-lg transition-colors font-medium"
              >
                Doctor (Dr. Vivan)
              </button>
              <button
                type="button"
                onClick={handleQuickFillAdmin}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-purple-300 rounded-lg transition-colors font-medium"
              >
                Admin (Hospital)
              </button>
              <button
                type="button"
                onClick={handleQuickFillPatient}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[11px] text-emerald-300 rounded-lg transition-colors font-medium"
              >
                Demo Patient
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
