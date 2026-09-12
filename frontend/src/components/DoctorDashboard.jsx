import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope,
  ShieldCheck,
  ShieldAlert,
  Search,
  UserPlus,
  Copy,
  Check,
  UploadCloud,
  FileText,
  Activity,
  Pill,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Layers,
  Sparkles,
  UserCheck,
  Building,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  analyzeImage,
  fetchSamples,
  fetchPatientRecords,
  addTreatmentRecord,
  addMedicationRecord,
  addOutcomeRecord,
  apiAuthorizeProviderAdmin
} from '../api';
import DicomViewer from './DicomViewer';
import ReportModal from './ReportModal';

const RECENT_PATIENTS = [
  { id: 'PATIENT_FULL_CARE_TIMELINE_04', name: 'James Doe (Verified CXR Case)', lastVisit: 'Today' },
  { id: 'PATIENT_CONSENT_LIFECYCLE_02', name: 'Maria Santos (Pediatric Case)', lastVisit: 'Yesterday' },
  { id: '0x3a9b47c8d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5', name: 'Anonymous Pseudonymous Case', lastVisit: '3 days ago' }
];

export default function DoctorDashboard() {
  const { user, is_verified, refreshUser, token } = useAuth();

  // Active Patient Management
  const [selectedPatientId, setSelectedPatientId] = useState('PATIENT_FULL_CARE_TIMELINE_04');
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // PACS & Analysis states
  const [samplesList, setSamplesList] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Clinical Data Entry Tab states
  const [entryType, setEntryType] = useState('treatment'); // 'treatment' | 'medication' | 'outcome'
  const [treatmentDesc, setTreatmentDesc] = useState('Broad-Spectrum Ceftriaxone 1g IV daily + Supplemental O2');
  const [medicineName, setMedicineName] = useState('Azithromycin');
  const [dosage, setDosage] = useState('500mg PO daily');
  const [duration, setDuration] = useState('5 days');
  const [outcomeDesc, setOutcomeDesc] = useState('Afebrile, bilateral crackles resolving, O2 saturation 97%.');
  const [timeToResponse, setTimeToResponse] = useState('48 hours');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entrySuccess, setEntrySuccess] = useState(null);
  const [entryError, setEntryError] = useState(null);

  // Refresh & Admin Fast-Track state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdminAuthorizing, setIsAdminAuthorizing] = useState(false);
  const [timelineData, setTimelineData] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchSamples()
      .then((data) => setSamplesList(data))
      .catch((err) => console.error('Failed to load samples:', err));
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      loadPatientTimeline(selectedPatientId);
    }
  }, [selectedPatientId]);

  const loadPatientTimeline = async (pid) => {
    try {
      const data = await fetchPatientRecords(pid, user?.wallet_address);
      setTimelineData(data);
    } catch (err) {
      // If access is unauthorized or no records, clear gracefully
      setTimelineData(null);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await refreshUser();
    setIsRefreshing(false);
  };

  const handleFastTrackAdminApproval = async () => {
    if (!user) return;
    setIsAdminAuthorizing(true);
    try {
      // In local dev / demo mode, auto-authorize this doctor account
      await apiAuthorizeProviderAdmin({
        doctor_id: user.id,
        doctor_email: user.email,
        provider_address: user.wallet_address,
        provider_name: `Dr. ${user.full_name} (${user.hospital_affiliation || 'Verified MD'})`
      });
      await refreshUser();
      alert('Success! Doctor account has been approved and registered on-chain via PatientRecords.sol.');
    } catch (err) {
      alert('Admin Authorization: ' + err.message);
    } finally {
      setIsAdminAuthorizing(false);
    }
  };

  const handleSearchPatient = (e) => {
    e.preventDefault();
    if (!patientSearchInput.trim()) return;
    setSelectedPatientId(patientSearchInput.trim());
  };

  const handleGeneratePatientInvite = () => {
    const inviteCode = 'PNEUMO-REG-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const inviteUrl = `${window.location.origin}/#patient-signup?invite=${inviteCode}&doctor_ref=${encodeURIComponent(user?.full_name || 'Physician')}`;
    setGeneratedInvite({
      code: inviteCode,
      url: inviteUrl,
      generatedAt: new Date().toLocaleTimeString()
    });
    setCopiedInvite(false);
  };

  const handleCopyInvite = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleSelectSampleCase = async (sampleId) => {
    setSelectedSample(sampleId);
    setUploadedFileName(null);
    setIsAnalyzing(true);
    setEntrySuccess(null);
    setEntryError(null);
    try {
      const data = await analyzeImage(sampleId, { patientId: selectedPatientId });
      setAnalysisResult(data);
      setSelectedFinding(data.primary_finding !== 'No Finding' ? data.primary_finding : null);
    } catch (e) {
      alert('Analysis error: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUploadFile = async (file) => {
    setSelectedSample(null);
    setUploadedFileName(file.name);
    setIsAnalyzing(true);
    setEntrySuccess(null);
    setEntryError(null);
    try {
      const data = await analyzeImage(file, { patientId: selectedPatientId });
      setAnalysisResult(data);
      setSelectedFinding(data.primary_finding !== 'No Finding' ? data.primary_finding : null);
    } catch (e) {
      alert('Upload analysis error: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateCareEntry = async (e) => {
    e.preventDefault();
    if (!is_verified) {
      alert('Action blocked: Your physician account is pending administrative verification.');
      return;
    }
    if (!selectedPatientId) {
      alert('Please select or search for a patient first.');
      return;
    }

    setIsSubmitting(true);
    setEntrySuccess(null);
    setEntryError(null);

    try {
      const diagRef = analysisResult?.case_id || 'DIAG-MANUAL-' + Date.now().toString().slice(-6);

      if (entryType === 'treatment') {
        const res = await addTreatmentRecord(selectedPatientId, {
          treatment_description: treatmentDesc,
          diagnosis_ref: diagRef,
          dosage_regimen: 'Clinical Standard',
          urgency_level: 'STANDARD'
        });
        setEntrySuccess(`Treatment record committed on-chain (Tx: ${res.tx_hash.slice(0, 14)}...)`);
      } else if (entryType === 'medication') {
        const res = await addMedicationRecord(selectedPatientId, {
          medicine_name: medicineName,
          dosage: dosage,
          duration: duration,
          diagnosis_ref: diagRef,
          treatment_ref: 'TREAT-INITIAL',
          route: 'ORAL',
          special_instructions: 'Take with food and hydration'
        });
        setEntrySuccess(`Medication record committed on-chain (Tx: ${res.tx_hash.slice(0, 14)}...)`);
      } else if (entryType === 'outcome') {
        const res = await addOutcomeRecord(selectedPatientId, {
          outcome_description: outcomeDesc,
          time_to_response: timeToResponse,
          treatment_ref: 'TREAT-INITIAL',
          medication_ref: 'MED-PRIMARY',
          clinical_status: 'RESOLVED',
          adverse_reaction: false
        });
        setEntrySuccess(`Outcome evaluation committed on-chain (Tx: ${res.tx_hash.slice(0, 14)}...)`);
      }

      // Reload patient timeline
      loadPatientTimeline(selectedPatientId);
    } catch (err) {
      setEntryError(err.message || 'Failed to commit care record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', backgroundColor: 'var(--bg-app)' }}>
      {/* 1. Physician Header & Status Card */}
      <div style={{
        background: 'var(--bg-sidebar)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="logo-icon" style={{ width: '42px', height: '42px', borderRadius: '8px' }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Dr. {user?.full_name || 'Physician Workstation'}
              </span>
              {is_verified ? (
                <span className="ground-truth-badge normal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={12} /> Authorized On-Chain Provider
                </span>
              ) : (
                <span className="ground-truth-badge abnormal" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={12} /> Pending Admin Approval
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
              <span><strong>Hospital:</strong> {user?.hospital_affiliation || 'PneumoVision Diagnostic Network'}</span>
              <span><strong>License:</strong> {user?.medical_license || 'MD-UNVERIFIED'}</span>
              <span><strong>Wallet:</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>{user?.wallet_address ? `${user.wallet_address.slice(0, 8)}...${user.wallet_address.slice(-6)}` : 'Not linked'}</code></span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="tool-btn"
            onClick={handleRefreshStatus}
            disabled={isRefreshing}
            title="Check verification status on server"
          >
            <RefreshCw size={14} className={isRefreshing ? 'status-dot' : ''} />
            <span>{isRefreshing ? 'Checking...' : 'Check Verification'}</span>
          </button>

          {!is_verified && (
            <button
              className="pacs-btn-primary"
              onClick={handleFastTrackAdminApproval}
              disabled={isAdminAuthorizing}
              style={{ padding: '6px 12px', fontSize: '0.74rem' }}
              title="Execute on-chain authorizeProvider via smart contract owner account"
            >
              <Sparkles size={14} />
              <span>{isAdminAuthorizing ? 'Authorizing...' : 'Fast-Track Demo Verification'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Pending Approval Alert Banner (If not verified) */}
      {!is_verified && (
        <div style={{
          background: 'var(--amber-bg)',
          border: '1px solid var(--amber-warning)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <ShieldAlert size={22} color="var(--amber-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--amber-warning)' }}>
              Physician Credentials Pending Administrative Approval
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
              Your account has been registered, but your Ethereum wallet address (<code>{user?.wallet_address}</code>) has not yet received an on-chain <code>authorizeProvider</code> transaction from the hospital administrator.
              <strong> Diagnostic view and radiograph inspection are available, but medical data-entry actions (Treatment, Medication, Outcome) remain locked until authorization is granted.</strong>
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Two-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '16px' }}>
        
        {/* Left Column: Patient Selector & Onboarding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Find Patient Search Box */}
          <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
            <div className="panel-header-title">
              <span>Find Patient Record</span>
              <Search size={14} color="var(--cyan-primary)" />
            </div>

            <form onSubmit={handleSearchPatient} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                placeholder="Enter Patient ID (e.g. PATIENT_... or 0x...)"
                value={patientSearchInput}
                onChange={(e) => setPatientSearchInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--text-primary)',
                  fontSize: '0.74rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <button type="submit" className="pacs-btn-primary" style={{ padding: '7px 12px' }}>
                Load
              </button>
            </form>

            {/* Active Selected Patient Pill */}
            <div style={{
              marginTop: '12px',
              padding: '10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-active)',
              borderRadius: 'var(--radius-xs)'
            }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Active Target Patient
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--cyan-primary)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                {selectedPatientId}
              </div>
            </div>

            {/* Recent Patients List */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Recent Clinical Cases:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {RECENT_PATIENTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setSelectedPatientId(p.id); setPatientSearchInput(''); }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 8px',
                      background: selectedPatientId === p.id ? 'var(--cyan-glow)' : 'transparent',
                      border: selectedPatientId === p.id ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      color: selectedPatientId === p.id ? 'var(--cyan-primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '0.72rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.id.slice(0, 18)}...</div>
                    </div>
                    <ChevronRight size={12} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Register New Patient Invitation Card */}
          <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
            <div className="panel-header-title">
              <span>Invite New Patient</span>
              <UserPlus size={14} color="var(--emerald-success)" />
            </div>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              borderLeft: '3px solid var(--emerald-success)',
              padding: '8px 10px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '0.7rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.35',
              marginBottom: '10px'
            }}>
              <strong>Security Protocol:</strong> A physician should never create a patient's password on their behalf. Generate a secure onboarding invitation so the patient sets up their own decentralized credentials.
            </div>

            <button
              type="button"
              className="pacs-btn-primary"
              onClick={handleGeneratePatientInvite}
              style={{ width: '100%', padding: '8px', fontSize: '0.75rem', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
            >
              <UserPlus size={14} /> Generate Patient Onboarding Invite
            </button>

            {generatedInvite && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: 'var(--bg-app)',
                border: '1px dashed var(--emerald-success)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--emerald-success)' }}>
                    Invitation Code: {generatedInvite.code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyInvite}
                    className="pacs-tool-btn"
                    style={{ padding: '3px 6px', fontSize: '0.65rem' }}
                  >
                    {copiedInvite ? <Check size={11} color="var(--emerald-success)" /> : <Copy size={11} />}
                    {copiedInvite ? 'Copied' : 'Copy Link'}
                  </button>
                </div>
                <div style={{
                  fontSize: '0.68rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-all',
                  background: 'var(--bg-card)',
                  padding: '4px 6px',
                  borderRadius: '3px'
                }}>
                  {generatedInvite.url}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Radiograph Analysis & Clinical Care Entry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Diagnostic Ingestion Box */}
          <div style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
            <div className="panel-header-title">
              <span>Patient Radiograph & Deep Learning Screening</span>
              <Layers size={14} color="var(--cyan-primary)" />
            </div>

            {/* Ingestion Dropzone & Curated Samples */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div
                className="mini-dropzone"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  borderColor: uploadedFileName ? 'var(--cyan-primary)' : undefined,
                  background: uploadedFileName ? 'rgba(6, 182, 212, 0.08)' : undefined
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".dcm,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadFile(e.target.files[0]);
                    }
                  }}
                />
                <UploadCloud size={20} color="var(--cyan-primary)" />
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {uploadedFileName ? `File: ${uploadedFileName}` : 'Upload Patient CXR / DICOM'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                  Screen for pneumonia, infiltration, atelectasis
                </div>
              </div>

              {/* Sample Quick Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>Curated Benchmark Radiographs:</div>
                {samplesList.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSampleCase(s.id)}
                    style={{
                      padding: '4px 8px',
                      background: selectedSample === s.id && !uploadedFileName ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-card)',
                      border: selectedSample === s.id && !uploadedFileName ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-primary)',
                      fontSize: '0.7rem',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    {s.patient_name} ({s.ground_truth})
                  </button>
                ))}
              </div>
            </div>

            {/* Radiograph Viewport & Findings */}
            {analysisResult && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '12px', marginTop: '12px' }}>
                <div style={{ height: '320px', position: 'relative' }}>
                  <DicomViewer
                    analysisResult={analysisResult}
                    selectedFinding={selectedFinding}
                    setSelectedFinding={setSelectedFinding}
                    isAnalyzing={isAnalyzing}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    background: analysisResult.primary_finding === 'No Finding' ? 'var(--emerald-bg)' : 'var(--crimson-bg)',
                    border: `1px solid ${analysisResult.primary_finding === 'No Finding' ? 'var(--emerald-success)' : 'var(--crimson-alert)'}`,
                    padding: '10px',
                    borderRadius: 'var(--radius-xs)'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: analysisResult.primary_finding === 'No Finding' ? 'var(--emerald-success)' : '#f87171' }}>
                      {analysisResult.primary_finding.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Confidence: {((analysisResult.confidences?.[analysisResult.primary_finding] || 0) * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ flex: 1, background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-xs)', fontSize: '0.72rem', overflowY: 'auto' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Model Findings:</div>
                    {analysisResult.predictions?.map((p) => (
                      <div key={p.finding} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span>{p.finding}:</span>
                        <strong style={{ color: p.detected ? 'var(--crimson-alert)' : 'var(--emerald-success)' }}>
                          {(p.probability * 100).toFixed(1)}%
                        </strong>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="pacs-btn-secondary"
                    onClick={() => setShowReportModal(true)}
                    style={{ width: '100%', padding: '6px' }}
                  >
                    <FileText size={13} /> View Radiologist Report
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clinical Care Entry Forms (Treatment / Medication / Outcome) */}
          <div style={{
            background: 'var(--bg-sidebar)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '16px',
            position: 'relative'
          }}>
            <div className="panel-header-title">
              <span>On-Chain Clinical Care Management</span>
              <Activity size={14} color="var(--cyan-primary)" />
            </div>

            {/* Blocked overlay if unverified */}
            {!is_verified && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(12, 18, 30, 0.85)',
                backdropFilter: 'blur(3px)',
                zIndex: 20,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '20px',
                textAlign: 'center'
              }}>
                <Lock size={28} color="var(--amber-warning)" />
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--amber-warning)' }}>
                  Data Entry Locked: Physician Verification Required
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                  Only authorized physicians registered on-chain in <code>PatientRecords.sol</code> can sign and write treatment, medication, and outcome records.
                </div>
                <button
                  type="button"
                  className="pacs-btn-primary"
                  onClick={handleFastTrackAdminApproval}
                  style={{ marginTop: '6px', fontSize: '0.74rem', padding: '6px 14px' }}
                >
                  <Sparkles size={14} /> Authorize Account (Demo Fast-Track)
                </button>
              </div>
            )}

            {/* Care Entry Form Tabs */}
            <div className="intelligence-mode-toggle" style={{ margin: '0 0 14px 0' }}>
              <button
                type="button"
                className={`mode-toggle-btn ${entryType === 'treatment' ? 'active' : ''}`}
                onClick={() => setEntryType('treatment')}
              >
                <Activity size={13} /> Treatment Plan
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${entryType === 'medication' ? 'active' : ''}`}
                onClick={() => setEntryType('medication')}
              >
                <Pill size={13} /> Medication Order
              </button>
              <button
                type="button"
                className={`mode-toggle-btn ${entryType === 'outcome' ? 'active' : ''}`}
                onClick={() => setEntryType('outcome')}
              >
                <CheckCircle2 size={13} /> Clinical Outcome
              </button>
            </div>

            {entrySuccess && (
              <div style={{ background: 'var(--emerald-bg)', border: '1px solid var(--emerald-success)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', fontSize: '0.74rem', color: 'var(--emerald-success)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> {entrySuccess}
              </div>
            )}

            {entryError && (
              <div style={{ background: 'var(--crimson-bg)', border: '1px solid var(--crimson-alert)', padding: '8px 12px', borderRadius: 'var(--radius-xs)', fontSize: '0.74rem', color: '#f87171', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} /> {entryError}
              </div>
            )}

            <form onSubmit={handleCreateCareEntry} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {entryType === 'treatment' && (
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Treatment Description & Clinical Protocol:
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={treatmentDesc}
                    onChange={(e) => setTreatmentDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-primary)',
                      fontSize: '0.78rem'
                    }}
                  />
                </div>
              )}

              {entryType === 'medication' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Pharmaceutical / Compound Name:
                    </label>
                    <input
                      type="text"
                      required
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Dosage:
                    </label>
                    <input
                      type="text"
                      required
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Duration:
                    </label>
                    <input
                      type="text"
                      required
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>
              )}

              {entryType === 'outcome' && (
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Clinical Response & Patient Progress:
                    </label>
                    <input
                      type="text"
                      required
                      value={outcomeDesc}
                      onChange={(e) => setOutcomeDesc(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Response Time:
                    </label>
                    <input
                      type="text"
                      required
                      value={timeToResponse}
                      onChange={(e) => setTimeToResponse(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: 'var(--bg-app)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !is_verified}
                className="pacs-btn-primary"
                style={{ padding: '9px', fontSize: '0.76rem', marginTop: '4px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="status-dot" /> Signing & Committing to Blockchain...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Commit {entryType.toUpperCase()} Record for Patient
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

      {showReportModal && analysisResult && (
        <ReportModal
          analysisResult={analysisResult}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
