import React, { useState, useEffect } from 'react';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Stethoscope,
  Pill,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  PlusCircle,
  Clock,
  ArrowDown,
  Hash,
  Link2
} from 'lucide-react';
import {
  fetchPatientRecords,
  addTreatmentRecord,
  addMedicationRecord,
  addOutcomeRecord
} from '../api';

const RECORD_ICONS = {
  Diagnosis: <Stethoscope size={18} color="var(--cyan-primary)" />,
  Treatment: <Activity size={18} color="#8b5cf6" />,
  Medication: <Pill size={18} color="#ec4899" />,
  Outcome: <CheckCircle2 size={18} color="var(--emerald-success)" />
};

export default function CareHistoryTab() {
  const [patientId, setPatientId] = useState('PATIENT_FULL_CARE_TIMELINE_04');
  const [callerAddress, setCallerAddress] = useState('');
  const [timelineData, setTimelineData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Quick Action Modal / Drawer state for adding follow-up entries
  const [showAddForm, setShowAddForm] = useState(false);
  const [entryType, setEntryType] = useState('Treatment');
  const [treatmentDesc, setTreatmentDesc] = useState('High-Flow Oxygen & Nebulized Bronchodilator');
  const [medicineName, setMedicineName] = useState('Amoxicillin-Clavulanate');
  const [dosage, setDosage] = useState('875/125mg PO');
  const [duration, setDuration] = useState('10 days');
  const [outcomeDesc, setOutcomeDesc] = useState('Auscultation clear, oxygen saturation 98% on room air.');
  const [timeToResponse, setTimeToResponse] = useState('4 days');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async (pid = patientId, caller = callerAddress) => {
    if (!pid) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPatientRecords(pid, caller || null);
      setTimelineData(data);
    } catch (e) {
      setError(e.message);
      setTimelineData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const existingRecords = timelineData?.records || [];
      const diagRef = existingRecords.find(r => r.record_type === 'Diagnosis')?.off_chain_ref;
      const treatRef = existingRecords.find(r => r.record_type === 'Treatment')?.off_chain_ref;
      const medRef = existingRecords.find(r => r.record_type === 'Medication')?.off_chain_ref;

      if (entryType === 'Treatment') {
        await addTreatmentRecord(patientId, {
          treatment_description: treatmentDesc,
          diagnosis_ref: diagRef,
          treatment_type: 'Clinical Care Protocol'
        });
      } else if (entryType === 'Medication') {
        await addMedicationRecord(patientId, {
          medicine_name: medicineName,
          dosage,
          duration,
          diagnosis_ref: diagRef,
          treatment_ref: treatRef
        });
      } else if (entryType === 'Outcome') {
        await addOutcomeRecord(patientId, {
          outcome_description: outcomeDesc,
          time_to_response: timeToResponse,
          treatment_ref: treatRef,
          medication_ref: medRef,
          patient_status: 'Recovered'
        });
      }

      setShowAddForm(false);
      await loadTimeline(patientId);
    } catch (err) {
      alert('Failed to commit record: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner */}
      <div className="clinical-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
        <div className="card-title-row">
          <span className="card-title" style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={20} color="#8b5cf6" />
            Immutable Care Timeline & Cryptographic Audit Trail
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="action-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={14} /> Append Care Entry
            </button>
            <button
              className="action-btn primary"
              disabled={isLoading}
              onClick={() => loadTimeline()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                backgroundColor: 'var(--cyan-primary)',
                color: '#000',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh History
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Chronological medical progression (Diagnosis → Treatment → Medication → Outcome). Every clinical entry is cryptographically audited on-chain against its off-chain payload digest to immediately expose any database tampering.
        </p>
      </div>

      {/* Query Bar */}
      <div className="clinical-card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr auto', gap: '12px', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Patient Identifier
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. PATIENT_FULL_CARE_TIMELINE_04"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Caller Address (Optional Access Check)
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                marginTop: '4px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)'
              }}
              value={callerAddress}
              onChange={(e) => setCallerAddress(e.target.value)}
              placeholder="Defaults to registered patient owner"
            />
          </div>

          <button
            className="action-btn primary"
            style={{
              height: '38px',
              marginTop: '16px',
              padding: '0 18px',
              backgroundColor: 'var(--cyan-primary)',
              color: '#000',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => loadTimeline()}
          >
            <Search size={15} /> Fetch Records
          </button>
        </div>
      </div>

      {/* Append New Record Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleCreateRecord} className="clinical-card" style={{ border: '1px solid var(--border-active)', backgroundColor: 'var(--bg-card-hover)' }}>
          <div className="card-title-row" style={{ marginBottom: '12px' }}>
            <span className="card-title" style={{ fontSize: '0.9rem' }}>
              <PlusCircle size={16} /> Append Structured Care Record to Timeline
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['Treatment', 'Medication', 'Outcome'].map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setEntryType(t)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-xs)',
                    border: entryType === t ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                    background: entryType === t ? 'var(--cyan-glow)' : 'var(--bg-app)',
                    color: entryType === t ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {entryType === 'Treatment' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Treatment Description</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: '#fff', borderRadius: '4px' }}
                  value={treatmentDesc}
                  onChange={(e) => setTreatmentDesc(e.target.value)}
                />
              </div>
            </div>
          )}

          {entryType === 'Medication' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Medicine Name</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: '#fff', borderRadius: '4px' }}
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dosage</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: '#fff', borderRadius: '4px' }}
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Duration</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: '#fff', borderRadius: '4px' }}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
          )}

          {entryType === 'Outcome' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outcome Assessment</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: '#fff', borderRadius: '4px' }}
                  value={outcomeDesc}
                  onChange={(e) => setOutcomeDesc(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Time to Response</label>
                <input
                  type="text"
                  required
                  style={{ width: '100%', marginTop: '4px', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', color: '#fff', borderRadius: '4px' }}
                  value={timeToResponse}
                  onChange={(e) => setTimeToResponse(e.target.value)}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{ padding: '6px 12px', background: 'none', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: '6px 16px', background: 'var(--emerald-success)', color: '#fff', fontWeight: 600, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              {isSubmitting ? 'Committing On-Chain...' : 'Commit On-Chain'}
            </button>
          </div>
        </form>
      )}

      {/* Error / Unauthorized Access Banner */}
      {error && (
        <div
          className="clinical-card"
          style={{ borderLeft: '4px solid var(--crimson-alert)', backgroundColor: 'var(--crimson-bg)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="var(--crimson-alert)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--crimson-alert)' }}>
              Access Denied / Query Failed
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '4px' }}>
            {error}
          </p>
        </div>
      )}

      {/* Prominent Tamper Warning Alert Banner */}
      {timelineData?.tamper_detected && (
        <div
          className="clinical-card"
          style={{
            borderLeft: '5px solid var(--crimson-alert)',
            backgroundColor: 'rgba(239, 68, 68, 0.16)',
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={24} color="var(--crimson-alert)" />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--crimson-alert)' }}>
                CRITICAL SECURITY ALERT: Tamper Detected in Medical Record History!
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                One or more off-chain clinical report payloads have been altered or corrupted and do not match the on-chain cryptographic digests.
              </div>
            </div>
          </div>
          {timelineData.tamper_warnings && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {timelineData.tamper_warnings.map((w, i) => (
                <div key={i} style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--crimson-alert)', background: 'var(--bg-app)', padding: '6px 10px', borderRadius: '4px' }}>
                  {w}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Status Bar */}
      {timelineData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div className="clinical-card" style={{ padding: '12px 16px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Records</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {timelineData.total_records}
            </div>
          </div>

          <div className="clinical-card" style={{ padding: '12px 16px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Integrity Status</span>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, marginTop: '4px', color: timelineData.tamper_detected ? 'var(--crimson-alert)' : 'var(--emerald-success)' }}>
              {timelineData.tamper_detected ? 'TAMPER FLAGGED' : 'CRYPTOGRAPHICALLY VERIFIED'}
            </div>
          </div>

          <div className="clinical-card" style={{ padding: '12px 16px', gridColumn: 'span 2' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Patient Hash Digest</span>
            <div style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)', marginTop: '4px', wordBreak: 'break-all' }}>
              {timelineData.patient_hash}
            </div>
          </div>
        </div>
      )}

      {/* Chronological Timeline Cards */}
      {timelineData && timelineData.records && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative' }}>
          
          {timelineData.records.length === 0 ? (
            <div className="clinical-card" style={{ textAlign: 'center', padding: '30px' }}>
              <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No on-chain records found for patient "{patientId}".
              </p>
            </div>
          ) : (
            timelineData.records.map((record, index) => {
              const payload = record.clinical_payload || {};
              const isTampered = record.tamper_detected;

              return (
                <div key={record.record_id || index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  
                  {/* Timeline Record Card */}
                  <div
                    className="clinical-card"
                    style={{
                      borderLeft: `4px solid ${
                        isTampered
                          ? 'var(--crimson-alert)'
                          : record.record_type === 'Diagnosis'
                          ? 'var(--cyan-primary)'
                          : record.record_type === 'Treatment'
                          ? '#8b5cf6'
                          : record.record_type === 'Medication'
                          ? '#ec4899'
                          : 'var(--emerald-success)'
                      }`,
                      backgroundColor: isTampered ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-card)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Top Row: Type & Verification Badge */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {RECORD_ICONS[record.record_type] || <FileText size={18} />}
                        <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Stage {index + 1}: {record.record_type}
                        </span>
                        <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          Ref: #{record.off_chain_ref}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: isTampered ? 'var(--crimson-bg)' : 'var(--emerald-bg)',
                            color: isTampered ? 'var(--crimson-alert)' : 'var(--emerald-success)'
                          }}
                        >
                          {isTampered ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                          {isTampered ? 'Tamper Detected' : 'Hash Verified'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {record.timestamp ? new Date(record.timestamp * 1000).toLocaleString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    {/* Specific Payload Details */}
                    <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '10px' }}>
                      
                      {record.record_type === 'Diagnosis' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Primary Finding: {payload.primary_finding || 'Pneumonia Screener'}
                            </span>
                            {payload.confidence && (
                              <span className="brand-badge" style={{ color: 'var(--cyan-primary)' }}>
                                Calibrated Confidence: {(payload.confidence * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {payload.probabilities && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              Multi-label Probabilities: {JSON.stringify(payload.probabilities)}
                            </div>
                          )}
                        </div>
                      )}

                      {record.record_type === 'Treatment' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {payload.treatment_description}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Protocol Type: {payload.treatment_type || 'Standard Care'}
                          </div>
                          {payload.notes && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              "{payload.notes}"
                            </div>
                          )}
                        </div>
                      )}

                      {record.record_type === 'Medication' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ec4899' }}>
                              {payload.medicine_name}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {payload.dosage} • {payload.duration} ({payload.frequency || 'Daily'})
                            </span>
                          </div>
                          {payload.instructions && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Instructions: {payload.instructions}
                            </div>
                          )}
                        </div>
                      )}

                      {record.record_type === 'Outcome' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--emerald-success)' }}>
                              {payload.outcome_description}
                            </span>
                            <span className="brand-badge" style={{ backgroundColor: 'var(--emerald-bg)', color: 'var(--emerald-success)' }}>
                              Time-to-Response: {payload.time_to_response}
                            </span>
                          </div>
                          {payload.patient_status && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Patient Status: {payload.patient_status}
                            </div>
                          )}
                        </div>
                      )}

                    </div>

                    {/* Lineage Linking & Hashes Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {record.linked_diagnosis_ref && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--cyan-primary)' }}>
                            <Link2 size={12} /> Diagnosis: #{record.linked_diagnosis_ref}
                          </span>
                        )}
                        {record.linked_treatment_ref && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8b5cf6' }}>
                            <Link2 size={12} /> Treatment: #{record.linked_treatment_ref}
                          </span>
                        )}
                        {record.linked_medication_ref && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ec4899' }}>
                            <Link2 size={12} /> Medication: #{record.linked_medication_ref}
                          </span>
                        )}
                      </div>

                      <div style={{ fontFamily: 'var(--font-mono)', display: 'flex', gap: '8px' }}>
                        <span>Digest: {record.on_chain_hash.slice(0, 10)}...{record.on_chain_hash.slice(-6)}</span>
                      </div>
                    </div>

                  </div>

                  {/* Connecting Line between timeline nodes */}
                  {index < timelineData.records.length - 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                      <ArrowDown size={16} color="var(--border-medium)" />
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>
      )}

    </div>
  );
}
