import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Wallet,
  Activity,
  Stethoscope,
  Pill,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Building,
  History,
  FileText,
  UserX,
  UserCheck,
  Award,
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMyRecords,
  fetchVerifiedProviders,
  grantConsent,
  revokeConsent,
  apiUpdateWallet
} from '../api';

const RECORD_ICONS = {
  Diagnosis: <Stethoscope size={18} color="var(--cyan-primary)" />,
  Treatment: <Activity size={18} color="#8b5cf6" />,
  Medication: <Pill size={18} color="#ec4899" />,
  Outcome: <CheckCircle2 size={18} color="var(--emerald-success)" />
};

export default function PatientDashboard() {
  const { user, patient_id, wallet_address, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'consent' | 'wallet'
  
  // Records state
  const [timelineData, setTimelineData] = useState(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState(null);

  // Consent & Providers state
  const [verifiedProviders, setVerifiedProviders] = useState([]);
  const [selectedProviderAddr, setSelectedProviderAddr] = useState('');
  const [activeGrants, setActiveGrants] = useState([]);
  const [isConsentLoading, setIsConsentLoading] = useState(false);
  const [consentFeedback, setConsentFeedback] = useState(null);

  // Wallet Linking state
  const [newWalletInput, setNewWalletInput] = useState(wallet_address || '');
  const [isUpdatingWallet, setIsUpdatingWallet] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState(null);

  // UI helpers
  const [copiedPatientId, setCopiedPatientId] = useState(false);

  useEffect(() => {
    loadCareHistory();
    loadProviders();
  }, []);

  useEffect(() => {
    if (wallet_address) {
      setNewWalletInput(wallet_address);
    }
  }, [wallet_address]);

  const loadCareHistory = async () => {
    setIsLoadingRecords(true);
    setRecordsError(null);
    try {
      // Calls /v1/records/me using auth token (never accepts a typed patient_id)
      const data = await fetchMyRecords();
      setTimelineData(data);
    } catch (err) {
      setRecordsError(err.message || 'Failed to load medical records');
      setTimelineData(null);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const loadProviders = async () => {
    try {
      const providers = await fetchVerifiedProviders();
      setVerifiedProviders(providers || []);
      if (providers && providers.length > 0) {
        setSelectedProviderAddr(providers[0].wallet_address);
      }
    } catch (err) {
      console.warn('Could not load providers directory:', err.message);
    }
  };

  const handleCopyPatientId = () => {
    if (!patient_id) return;
    navigator.clipboard.writeText(patient_id);
    setCopiedPatientId(true);
    setTimeout(() => setCopiedPatientId(false), 2000);
  };

  const handleGrantConsent = async () => {
    if (!selectedProviderAddr) {
      alert('Please select a verified provider from the directory.');
      return;
    }
    if (!patient_id) {
      alert('No patient identity found on your profile.');
      return;
    }

    setIsConsentLoading(true);
    setConsentFeedback(null);
    try {
      const selectedDoc = verifiedProviders.find(p => p.wallet_address.toLowerCase() === selectedProviderAddr.toLowerCase());
      const docName = selectedDoc ? `Dr. ${selectedDoc.full_name} (${selectedDoc.hospital_affiliation || 'Verified Physician'})` : selectedProviderAddr;

      const res = await grantConsent({
        patientId: patient_id,
        providerAddress: selectedProviderAddr,
        callerAddress: wallet_address || null
      });

      setConsentFeedback({
        type: 'success',
        message: `Successfully granted on-chain access to ${docName}. Tx: ${res.tx_hash.slice(0, 14)}...`
      });

      // Update local grants list
      setActiveGrants((prev) => {
        const filtered = prev.filter(g => g.providerAddress.toLowerCase() !== selectedProviderAddr.toLowerCase());
        return [
          {
            providerName: docName,
            providerAddress: selectedProviderAddr,
            grantedAt: new Date().toLocaleTimeString(),
            status: 'ACTIVE',
            txHash: res.tx_hash
          },
          ...filtered
        ];
      });
    } catch (err) {
      setConsentFeedback({
        type: 'error',
        message: err.message || 'Failed to grant consent on-chain'
      });
    } finally {
      setIsConsentLoading(false);
    }
  };

  const handleRevokeConsent = async (targetProviderAddr, targetProviderName) => {
    if (!patient_id) return;
    setIsConsentLoading(true);
    setConsentFeedback(null);
    try {
      const res = await revokeConsent({
        patientId: patient_id,
        providerAddress: targetProviderAddr,
        callerAddress: wallet_address || null
      });

      setConsentFeedback({
        type: 'success',
        message: `Revoked access permissions for ${targetProviderName || targetProviderAddr}. Tx: ${res.tx_hash.slice(0, 14)}...`
      });

      setActiveGrants((prev) =>
        prev.map((g) =>
          g.providerAddress.toLowerCase() === targetProviderAddr.toLowerCase()
            ? { ...g, status: 'REVOKED' }
            : g
        )
      );
    } catch (err) {
      setConsentFeedback({
        type: 'error',
        message: err.message || 'Failed to revoke consent on-chain'
      });
    } finally {
      setIsConsentLoading(false);
    }
  };

  const handleUpdateWallet = async (e) => {
    e.preventDefault();
    if (!newWalletInput.trim()) return;
    setIsUpdatingWallet(true);
    setWalletFeedback(null);
    try {
      await apiUpdateWallet(newWalletInput.trim());
      await refreshUser();
      setWalletFeedback({
        type: 'success',
        message: 'MST Testnet wallet address linked successfully for BridgeKey cryptographic signatures.'
      });
    } catch (err) {
      setWalletFeedback({
        type: 'error',
        message: err.message || 'Failed to link wallet address'
      });
    } finally {
      setIsUpdatingWallet(false);
    }
  };

  const hasTamper = timelineData?.tamper_detected || timelineData?.records?.some(r => r.tamper_detected);

  return (
    <div style={{ padding: '24px', maxWidth: '1140px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Patient Profile & On-Chain Identity Card */}
      <div style={{
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="logo-icon" style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}>
            <User size={26} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {user?.full_name || 'Patient Portal'}
              </span>
              <span className="ground-truth-badge normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> On-Chain Registered Identity
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Pseudonymous Patient ID:</span>
              <code style={{
                fontSize: '0.74rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--cyan-primary)',
                background: 'var(--bg-app)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-medium)'
              }}>
                {patient_id || '0x...'}
              </code>
              <button
                type="button"
                onClick={handleCopyPatientId}
                className="tool-btn"
                style={{ padding: '3px 6px', fontSize: '0.68rem' }}
                title="Copy Patient ID"
              >
                {copiedPatientId ? <Check size={12} color="var(--emerald-success)" /> : <Copy size={12} />}
                <span>{copiedPatientId ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Info: Linked Wallet */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
            Linked Wallet (BridgeKey Signing)
          </div>
          <div style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)', color: wallet_address ? 'var(--text-primary)' : 'var(--amber-warning)' }}>
            {wallet_address ? `${wallet_address.slice(0, 10)}...${wallet_address.slice(-8)}` : 'No wallet linked yet'}
          </div>
        </div>
      </div>

      {/* 2. Global Hash Verification Tamper Warning Banner (If Tamper Detected) */}
      {hasTamper && (
        <div style={{
          background: 'var(--crimson-bg)',
          border: '2px solid var(--crimson-alert)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px 20px',
          display: 'flex',
          gap: '14px',
          alignItems: 'flex-start',
          animation: 'pulse 2s infinite'
        }}>
          <ShieldAlert size={26} color="var(--crimson-alert)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--crimson-alert)' }}>
              CRITICAL AUDIT ALERT: CRYPTOGRAPHIC HASH MISMATCH DETECTED
            </div>
            <p style={{ fontSize: '0.78rem', color: '#fca5a5', marginTop: '4px', lineHeight: '1.45' }}>
              One or more medical record payloads in off-chain storage have been altered and no longer match the immutable cryptographic hash digest committed on the MST Testnet smart contract (<code>PatientRecords.sol</code>). The affected records below are flagged with a security warning.
            </p>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="intelligence-mode-toggle" style={{ margin: 0 }}>
        <button
          type="button"
          className={`mode-toggle-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={14} /> My Verified Medical Care History
        </button>
        <button
          type="button"
          className={`mode-toggle-btn ${activeTab === 'consent' ? 'active' : ''}`}
          onClick={() => setActiveTab('consent')}
        >
          <Shield size={14} /> Consent & Access Control
        </button>
        <button
          type="button"
          className={`mode-toggle-btn ${activeTab === 'wallet' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallet')}
        >
          <Wallet size={14} /> Linked Wallet & Security
        </button>
      </div>

      {/* =========================================================================
          TAB 1: Verified Care History (Derived server-side strictly from auth token)
          ========================================================================= */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Immutable Care Timeline
              </span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Hash-verified records across Diagnoses, Treatments, Medications, and Clinical Outcomes.
              </p>
            </div>

            <button
              type="button"
              onClick={loadCareHistory}
              disabled={isLoadingRecords}
              className="tool-btn"
            >
              <RefreshCw size={13} className={isLoadingRecords ? 'status-dot' : ''} />
              <span>{isLoadingRecords ? 'Syncing...' : 'Refresh Records'}</span>
            </button>
          </div>

          {recordsError && (
            <div style={{ background: 'var(--crimson-bg)', border: '1px solid var(--crimson-alert)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', fontSize: '0.76rem', color: '#f87171' }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: '6px' }} />
              {recordsError}
            </div>
          )}

          {isLoadingRecords ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <RefreshCw size={24} className="status-dot" style={{ margin: '0 auto 10px auto' }} />
              Verifying cryptographic hash digests against MST Testnet blockchain...
            </div>
          ) : timelineData?.records?.length === 0 ? (
            <div style={{
              background: 'var(--bg-sidebar)',
              border: '1px dashed var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)'
            }}>
              <FileText size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>No Clinical Records Recorded Yet</div>
              <p style={{ fontSize: '0.74rem', marginTop: '4px' }}>
                When your healthcare provider screens your radiographs or prescribes treatments, verified records will appear here automatically.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {timelineData?.records?.map((rec, idx) => {
                const isTampered = rec.tamper_detected || rec.integrity_valid === false;
                const payload = rec.clinical_payload || {};

                return (
                  <div
                    key={rec.record_id || idx}
                    style={{
                      background: 'var(--bg-sidebar)',
                      border: isTampered ? '2px solid var(--crimson-alert)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: isTampered ? '0 0 16px rgba(239, 68, 68, 0.25)' : 'none'
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-medium)'
                        }}>
                          {RECORD_ICONS[rec.record_type] || <FileText size={16} />}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {rec.record_type}: {payload.outcome_description || payload.medicine_name || payload.treatment_description || payload.primary_finding || 'Medical Record'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            Author Provider: <code style={{ fontFamily: 'var(--font-mono)' }}>{rec.author_provider}</code> &bull; {new Date(rec.timestamp * 1000).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Integrity Status Badge */}
                      {isTampered ? (
                        <span className="ground-truth-badge abnormal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                          <AlertTriangle size={13} /> TAMPER DETECTED (HASH MISMATCH)
                        </span>
                      ) : (
                        <span className="ground-truth-badge normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
                          <ShieldCheck size={13} /> Cryptographically Verified
                        </span>
                      )}
                    </div>

                    {/* Visible Warning Box on Hash Failure */}
                    {isTampered && (
                      <div style={{
                        background: 'var(--crimson-bg)',
                        borderLeft: '4px solid var(--crimson-alert)',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '0.74rem',
                        color: '#f87171'
                      }}>
                        <strong>Security Breach Warning:</strong> The off-chain record contents have been altered after on-chain commitment.
                        <div style={{ fontSize: '0.7rem', color: '#fca5a5', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                          On-Chain Hash: {rec.on_chain_hash}
                        </div>
                      </div>
                    )}

                    {/* Record Details Body */}
                    <div style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '12px',
                      fontSize: '0.76rem',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '8px'
                    }}>
                      {rec.record_type === 'Diagnosis' && (
                        <>
                          <div><strong>Primary Detection:</strong> {payload.primary_finding || 'Normal'}</div>
                          <div><strong>Confidence:</strong> {((payload.confidence || 0) * 100).toFixed(1)}%</div>
                          <div><strong>Lineage Ref:</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>{rec.off_chain_ref}</code></div>
                        </>
                      )}

                      {rec.record_type === 'Treatment' && (
                        <>
                          <div style={{ gridColumn: '1 / -1' }}><strong>Protocol:</strong> {payload.treatment_description}</div>
                          <div><strong>Dosage Regimen:</strong> {payload.dosage_regimen || 'Clinical Standard'}</div>
                          <div><strong>Linked Diagnosis:</strong> <code>{rec.linked_diagnosis_ref || 'None'}</code></div>
                        </>
                      )}

                      {rec.record_type === 'Medication' && (
                        <>
                          <div><strong>Medication:</strong> {payload.medicine_name}</div>
                          <div><strong>Dosage:</strong> {payload.dosage}</div>
                          <div><strong>Duration:</strong> {payload.duration}</div>
                          <div><strong>Linked Treatment:</strong> <code>{rec.linked_treatment_ref || 'None'}</code></div>
                        </>
                      )}

                      {rec.record_type === 'Outcome' && (
                        <>
                          <div style={{ gridColumn: '1 / -1' }}><strong>Response:</strong> {payload.outcome_description}</div>
                          <div><strong>Time to Clinical Response:</strong> {payload.time_to_response}</div>
                          <div><strong>Recovery Status:</strong> {payload.patient_status || 'Resolved'}</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: Consent & Access Control (Using verified provider dropdown)
          ========================================================================= */}
      {activeTab === 'consent' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          
          {/* Grant Access Form */}
          <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '18px' }}>
            <div className="panel-header-title">
              <span>Grant Record Consent</span>
              <KeyRound size={14} color="var(--cyan-primary)" />
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
              Select a verified physician or hospital from the network directory to grant permission to inspect your medical records.
            </p>

            {consentFeedback && (
              <div style={{
                background: consentFeedback.type === 'success' ? 'var(--emerald-bg)' : 'var(--crimson-bg)',
                border: `1px solid ${consentFeedback.type === 'success' ? 'var(--emerald-success)' : 'var(--crimson-alert)'}`,
                padding: '10px 12px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '0.74rem',
                color: consentFeedback.type === 'success' ? 'var(--emerald-success)' : '#f87171',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {consentFeedback.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                {consentFeedback.message}
              </div>
            )}

            {/* Provider Dropdown (GET /v1/providers) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                Select Verified Healthcare Provider
              </label>
              
              <select
                value={selectedProviderAddr}
                onChange={(e) => setSelectedProviderAddr(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem'
                }}
              >
                {verifiedProviders.map((p) => (
                  <option key={p.id || p.wallet_address} value={p.wallet_address}>
                    Dr. {p.full_name} — {p.hospital_affiliation || 'Verified MD'} ({p.medical_license || 'License Verified'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Provider Card Details */}
            {selectedProviderAddr && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-active)',
                borderRadius: 'var(--radius-xs)',
                padding: '10px',
                fontSize: '0.72rem',
                marginBottom: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--cyan-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={13} /> Verified On-Chain MST Testnet Address:
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {selectedProviderAddr}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isConsentLoading || !selectedProviderAddr}
              onClick={handleGrantConsent}
              className="pacs-btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.78rem' }}
            >
              {isConsentLoading ? (
                <>
                  <RefreshCw size={14} className="status-dot" /> Authorizing on MST Testnet Smart Contract...
                </>
              ) : (
                <>
                  <UserCheck size={14} /> Grant Consent On-Chain
                </>
              )}
            </button>
          </div>

          {/* Active Grants List with Revoke Action */}
          <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '18px' }}>
            <div className="panel-header-title">
              <span>Active Provider Consents</span>
              <Shield size={14} color="var(--emerald-success)" />
            </div>

            {activeGrants.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                <ShieldCheck size={28} style={{ margin: '0 auto 8px auto', opacity: 0.6 }} />
                No active external provider consents granted. Your medical data is strictly private.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeGrants.map((g, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {g.providerName}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {g.providerAddress.slice(0, 10)}...{g.providerAddress.slice(-8)} &bull; Granted {g.grantedAt}
                      </div>
                    </div>

                    {g.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        onClick={() => handleRevokeConsent(g.providerAddress, g.providerName)}
                        className="tool-btn"
                        style={{ color: 'var(--crimson-alert)', borderColor: 'var(--crimson-alert)', fontSize: '0.7rem', padding: '4px 8px' }}
                      >
                        <UserX size={12} /> Revoke
                      </button>
                    ) : (
                      <span className="ground-truth-badge abnormal" style={{ fontSize: '0.65rem' }}>
                        REVOKED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: Wallet Linking & BridgeKey Security
          ========================================================================= */}
      {activeTab === 'wallet' && (
        <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '20px', maxWidth: '640px' }}>
          <div className="panel-header-title">
            <span>Link MST Testnet Wallet (BridgeKey Cryptographic Signing)</span>
            <Wallet size={14} color="var(--cyan-primary)" />
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.45' }}>
            Linking an MST Testnet wallet address enables decentralized BridgeKey signing, allowing you to sign consent transactions directly from your browser wallet.
          </p>

          {walletFeedback && (
            <div style={{
              background: walletFeedback.type === 'success' ? 'var(--emerald-bg)' : 'var(--crimson-bg)',
              border: `1px solid ${walletFeedback.type === 'success' ? 'var(--emerald-success)' : 'var(--crimson-alert)'}`,
              padding: '10px 12px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.74rem',
              color: walletFeedback.type === 'success' ? 'var(--emerald-success)' : '#f87171',
              marginBottom: '14px'
            }}>
              {walletFeedback.message}
            </div>
          )}

          <form onSubmit={handleUpdateWallet} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                MST Testnet Wallet Address
              </label>
              <input
                type="text"
                required
                placeholder="0xb3C09303335393D511F9eE1C7Bf4f1154904142b"
                value={newWalletInput}
                onChange={(e) => setNewWalletInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingWallet}
              className="pacs-btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: '0.78rem' }}
            >
              {isUpdatingWallet ? 'Updating...' : 'Save & Link Wallet Address'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
