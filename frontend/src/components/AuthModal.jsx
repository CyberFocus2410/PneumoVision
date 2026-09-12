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
  Sparkles,
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
    setEmail('doc@pneumovision.ai');
    setPassword('DocPassword123!');
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="logo-icon" style={{ width: '28px', height: '28px' }}>
              <Shield size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {mode === 'login' ? 'Sign In to PneumoVision' : 'Create Clinical Account'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Zero-Knowledge Medical Cryptography & PACS Authentication
              </div>
            </div>
          </div>
          <button className="tool-btn" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Main Mode Toggle: Sign In vs Register */}
          <div className="intelligence-mode-toggle" style={{ margin: 0 }}>
            <button
              type="button"
              className={`mode-toggle-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              <KeyRound size={13} /> Sign In
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              <User size={13} /> Create Account
            </button>
          </div>

          {/* Role Sub-Toggle: Patient vs Physician */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'var(--bg-card)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => { setRole('DOCTOR'); setError(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: role === 'DOCTOR' ? 'var(--cyan-glow)' : 'transparent',
                color: role === 'DOCTOR' ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                borderBottom: role === 'DOCTOR' ? '2px solid var(--cyan-primary)' : '2px solid transparent'
              }}
            >
              <Stethoscope size={14} /> Physician / Doctor
            </button>

            <button
              type="button"
              onClick={() => { setRole('PATIENT'); setError(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                borderRadius: 'var(--radius-xs)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: role === 'PATIENT' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                color: role === 'PATIENT' ? 'var(--emerald-success)' : 'var(--text-secondary)',
                borderBottom: role === 'PATIENT' ? '2px solid var(--emerald-success)' : '2px solid transparent'
              }}
            >
              <User size={14} /> Patient Portal
            </button>
          </div>

          {/* Notice Banner */}
          {mode === 'signup' && role === 'DOCTOR' && (
            <div style={{
              background: 'var(--amber-bg)',
              border: '1px solid var(--amber-warning)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.72rem',
              color: 'var(--amber-warning)',
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-start'
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Physician Verification Required:</strong> New doctor accounts undergo administrative audit before on-chain authorization in <code>PatientRecords.sol</code>.
              </div>
            </div>
          )}

          {mode === 'signup' && role === 'PATIENT' && (
            <div style={{
              background: 'var(--emerald-bg)',
              border: '1px solid var(--emerald-success)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.72rem',
              color: 'var(--emerald-success)',
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-start'
            }}>
              <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Zero PII On-Chain:</strong> A cryptographically salted pseudonymous <code>patient_id</code> will be generated and registered on-chain. Your name and email are never committed to the blockchain.
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--crimson-bg)',
              border: '1px solid var(--crimson-alert)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.74rem',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'var(--emerald-bg)',
              border: '1px solid var(--emerald-success)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.74rem',
              color: 'var(--emerald-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={15} /> {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {mode === 'signup' && (
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Full Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder={role === 'DOCTOR' ? 'Dr. Sarah Lin, MD' : 'Alex Morgan'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem'
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  required
                  placeholder="physician@hospital.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 32px',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>

            {/* Doctor Signup Additional Fields */}
            {mode === 'signup' && role === 'DOCTOR' && (
              <>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Ethereum Wallet Address (Required for On-Chain Signatures)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Wallet size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      required
                      placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        background: 'var(--bg-app)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 'var(--radius-xs)',
                        color: 'var(--text-primary)',
                        fontSize: '0.76rem',
                        fontFamily: 'var(--font-mono)'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Medical License #
                    </label>
                    <div style={{ position: 'relative' }}>
                      <FileBadge size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        required
                        placeholder="MD-98421-CXR"
                        value={medicalLicense}
                        onChange={(e) => setMedicalLicense(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 32px',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Hospital Affiliation
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Building size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Johns Hopkins"
                        value={hospitalAffiliation}
                        onChange={(e) => setHospitalAffiliation(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px 8px 32px',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Patient Signup Optional Wallet */}
            {mode === 'signup' && role === 'PATIENT' && (
              <div>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Linked Wallet Address (Optional — can be linked later for BridgeKey)
                </label>
                <div style={{ position: 'relative' }}>
                  <Wallet size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="0x... (optional)"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="pacs-btn-primary"
              style={{ width: '100%', marginTop: '6px', padding: '10px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="status-dot" /> Authenticating...
                </>
              ) : mode === 'login' ? (
                <>
                  <KeyRound size={15} /> Sign In as {role === 'DOCTOR' ? 'Physician' : 'Patient'}
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Register {role === 'DOCTOR' ? 'Physician Account' : 'Patient Identity'}
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Fast Reviewer Testing */}
          {mode === 'login' && (
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Fast Reviewer Quick-Fill Logins
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleQuickFillDoctor}
                  className="pacs-tool-btn"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                >
                  <Stethoscope size={12} color="var(--cyan-primary)" /> Doctor (Dr. Sarah)
                </button>
                <button
                  type="button"
                  onClick={handleQuickFillAdmin}
                  className="pacs-tool-btn"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                >
                  <ShieldCheck size={12} color="var(--emerald-success)" /> Admin (Hospital)
                </button>
                <button
                  type="button"
                  onClick={handleQuickFillPatient}
                  className="pacs-tool-btn"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                >
                  <User size={12} color="var(--amber-warning)" /> Demo Patient
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
