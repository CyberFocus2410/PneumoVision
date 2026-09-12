import React, { useState } from 'react';
import { Shield, KeyRound, UserCheck, UserX, CheckCircle, AlertCircle, RefreshCw, Building, Hash } from 'lucide-react';
import { grantConsent, revokeConsent } from '../api';

const DEFAULT_PROVIDERS = [
  { name: 'St. Jude Childrens Research Hospital', address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', role: 'Pediatric Pulmonology' },
  { name: 'Johns Hopkins Imaging Center', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', role: 'Radiology / Diagnostic' },
  { name: 'Mayo Clinic Health System', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', role: 'Inpatient Clinical Care' }
];

export default function AccessControlTab() {
  const [patientId, setPatientId] = useState('PATIENT_FULL_CARE_TIMELINE_04');
  const [providerAddress, setProviderAddress] = useState(DEFAULT_PROVIDERS[0].address);
  const [providerName, setProviderName] = useState(DEFAULT_PROVIDERS[0].name);
  const [activeGrants, setActiveGrants] = useState([
    {
      patientId: 'PATIENT_FULL_CARE_TIMELINE_04',
      providerName: 'St. Jude Childrens Research Hospital',
      providerAddress: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      grantedAt: new Date().toLocaleTimeString(),
      status: 'ACTIVE'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSelectPreset = (p) => {
    setProviderAddress(p.address);
    setProviderName(p.name);
  };

  const handleGrant = async () => {
    if (!patientId || !providerAddress) {
      alert('Please provide both Patient ID and Provider Address.');
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await grantConsent({ patientId, providerAddress });
      setFeedback({
        type: 'success',
        title: 'Consent Granted On-Chain',
        message: `Successfully granted medical record access for Patient "${patientId}" to ${providerName || providerAddress}.`,
        txHash: res.tx_hash,
        blockNumber: res.block_number
      });

      // Update local grants list
      setActiveGrants((prev) => {
        const filtered = prev.filter(g => !(g.patientId === patientId && g.providerAddress.toLowerCase() === providerAddress.toLowerCase()));
        return [
          {
            patientId,
            providerName: providerName || 'Custom Provider Address',
            providerAddress,
            grantedAt: new Date().toLocaleTimeString(),
            status: 'ACTIVE'
          },
          ...filtered
        ];
      });
    } catch (e) {
      setFeedback({
        type: 'error',
        title: 'Grant Failed',
        message: e.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (targetPatientId = patientId, targetProviderAddr = providerAddress, targetProviderName = providerName) => {
    if (!targetPatientId || !targetProviderAddr) {
      alert('Please specify Patient ID and Provider Address to revoke.');
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await revokeConsent({ patientId: targetPatientId, providerAddress: targetProviderAddr });
      setFeedback({
        type: 'success',
        title: 'Consent Revoked On-Chain',
        message: `Successfully revoked medical record view permissions for ${targetProviderName || targetProviderAddr}.`,
        txHash: res.tx_hash,
        blockNumber: res.block_number
      });

      // Update local grants list
      setActiveGrants((prev) =>
        prev.map((g) =>
          g.patientId === targetPatientId && g.providerAddress.toLowerCase() === targetProviderAddr.toLowerCase()
            ? { ...g, status: 'REVOKED' }
            : g
        )
      );
    } catch (e) {
      setFeedback({
        type: 'error',
        title: 'Revoke Failed',
        message: e.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div className="clinical-card" style={{ borderLeft: '4px solid var(--cyan-primary)' }}>
        <div className="card-title-row">
          <span className="card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--cyan-primary)" />
            Patient Digital Identity & Consent Access Control
          </span>
          <span className="brand-badge" style={{ backgroundColor: 'var(--cyan-glow)', color: 'var(--cyan-primary)' }}>
            Smart Contract Gated
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Grant or revoke cryptographic access permissions to hospital nodes and clinical providers. Medical data remains private and off-chain; view authorization is immutably validated on-chain via smart contract.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        
        {/* Grant / Revoke Action Form */}
        <div className="clinical-card">
          <div className="card-title-row" style={{ marginBottom: '16px' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <KeyRound size={16} /> Manage Provider Consent
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pseudonymous Patient ID
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <input
                  type="text"
                  className="search-input"
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. PATIENT_FULL_CARE_TIMELINE_04"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Provider Presets
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {DEFAULT_PROVIDERS.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: providerAddress.toLowerCase() === p.address.toLowerCase() ? 'var(--cyan-glow)' : 'var(--bg-app)',
                      border: providerAddress.toLowerCase() === p.address.toLowerCase() ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.address}</div>
                    </div>
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
                      {p.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Custom Provider Ethereum Address
              </label>
              <input
                type="text"
                className="search-input"
                style={{ width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}
                value={providerAddress}
                onChange={(e) => {
                  setProviderAddress(e.target.value);
                  setProviderName('Custom Address');
                }}
                placeholder="0x..."
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <button
                className="action-btn primary"
                disabled={isLoading}
                onClick={handleGrant}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--emerald-success)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={16} />}
                Grant Consent
              </button>

              <button
                className="action-btn"
                disabled={isLoading}
                onClick={() => handleRevoke()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  backgroundColor: 'var(--crimson-alert)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <UserX size={16} />}
                Revoke Consent
              </button>
            </div>
          </div>
        </div>

        {/* Status Feedback & Active Grants Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Real-time Feedback Card */}
          {feedback && (
            <div
              className="clinical-card"
              style={{
                borderLeft: `4px solid ${feedback.type === 'success' ? 'var(--emerald-success)' : 'var(--crimson-alert)'}`,
                backgroundColor: feedback.type === 'success' ? 'var(--emerald-bg)' : 'var(--crimson-bg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                {feedback.type === 'success' ? (
                  <CheckCircle size={18} color="var(--emerald-success)" />
                ) : (
                  <AlertCircle size={18} color="var(--crimson-alert)" />
                )}
                <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{feedback.title}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{feedback.message}</p>
              {feedback.txHash && (
                <div style={{ marginTop: '8px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  <div>Tx: {feedback.txHash.slice(0, 20)}...{feedback.txHash.slice(-8)}</div>
                  <div>Block #{feedback.blockNumber}</div>
                </div>
              )}
            </div>
          )}

          {/* Active Grants List */}
          <div className="clinical-card" style={{ flex: 1 }}>
            <div className="card-title-row" style={{ marginBottom: '12px' }}>
              <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={16} /> Access Grants Overview
              </span>
              <span className="brand-badge">{activeGrants.filter(g => g.status === 'ACTIVE').length} Active</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeGrants.map((grant, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {grant.providerName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: grant.status === 'ACTIVE' ? 'var(--emerald-bg)' : 'var(--crimson-bg)',
                        color: grant.status === 'ACTIVE' ? 'var(--emerald-success)' : 'var(--crimson-alert)'
                      }}
                    >
                      {grant.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {grant.providerAddress.slice(0, 16)}...{grant.providerAddress.slice(-8)}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                      Patient: {grant.patientId}
                    </span>
                    {grant.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevoke(grant.patientId, grant.providerAddress, grant.providerName)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--crimson-alert)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '2px 4px'
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
