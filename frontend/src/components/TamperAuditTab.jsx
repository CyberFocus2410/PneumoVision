import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  FileX2,
  CheckCircle2,
  XCircle,
  Download,
  RefreshCw,
  ArrowLeft,
  Lock,
  Database,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Card, StatusPill, MonoHash, Badge } from './common';

export default function TamperAuditTab({ onNavigateSafe }) {
  const [isTampered, setIsTampered] = useState(true);
  const [isReverifying, setIsReverifying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Clinical record scenario data
  const samplePatient = 'PX-884920';
  const expectedHash = '0xa8f2b74041d5b12a8190c1f54a8b792e3d9943015f69a19c63bb49871a39f902';
  const corruptedHash = '0x3c99f11200ba71e8992a0141f11cb792e3d9943015f69a19c63bb49871a00000';

  const validPayload = {
    record_id: 'REC-PNEUMO-09411',
    patient_ref: 'PX-884920',
    medication_prescribed: 'Amoxicillin-Clavulanate 875mg',
    frequency: 'BID x 7 days',
    icd_10_cm: 'J18.9',
    ai_assisted_flag: true,
    confidence_score: 0.784
  };

  const tamperedPayload = {
    record_id: 'REC-PNEUMO-09411',
    patient_ref: 'PX-884920',
    medication_prescribed: 'Ciprofloxacin 500mg',
    frequency: 'BID x 7 days',
    icd_10_cm: 'J18.9',
    ai_assisted_flag: true,
    confidence_score: 0.784
  };

  const handleDownloadAudit = () => {
    const auditReport = {
      audit_event: 'DATA_INTEGRITY_VERIFICATION',
      timestamp: new Date().toISOString(),
      patient_pseudonym: samplePatient,
      smart_contract: 'PatientRecords.sol (MST Testnet)',
      expected_onchain_hash: expectedHash,
      computed_offchain_hash: isTampered ? corruptedHash : expectedHash,
      verification_status: isTampered ? 'HASH_MISMATCH_DETECTED' : 'CRYPTOGRAPHIC_MATCH_CONFIRMED',
      incident_id: isTampered ? 'EHR-SEC-TAMPER-09411' : null,
      discrepancy: isTampered ? {
        field: 'medication_prescribed',
        expected: validPayload.medication_prescribed,
        observed: tamperedPayload.medication_prescribed,
        warning: 'Unauthorized medication substitution detected'
      } : null
    };

    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tamper-audit-${samplePatient}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const handleReverify = () => {
    setIsReverifying(true);
    setTimeout(() => {
      setIsReverifying(false);
    }, 1200);
  };

  return (
    <div className="w-full bg-surface-base min-h-screen p-space-md lg:p-space-lg flex flex-col gap-space-lg font-sans">
      {/* Top Interactive Simulation Toolbar for Reviewers */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm bg-surface-card p-space-sm px-space-md rounded-lg border border-border-grid shadow-sm">
        <div className="flex items-center gap-space-sm">
          <Badge variant="primary" size="md">INTEGRITY SIMULATOR</Badge>
          <span className="text-body-sm text-text-secondary">
            Toggle scenario to demonstrate live blockchain tamper-detection vs. verified state:
          </span>
        </div>
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            onClick={() => setIsTampered(true)}
            className={`px-space-md py-1 rounded text-headline-sm text-xs font-semibold transition-colors ${
              isTampered
                ? 'bg-alert-tamper text-on-primary shadow-sm'
                : 'bg-surface-nested text-text-secondary hover:bg-border-grid'
            }`}
          >
            Simulate Tampered Record
          </button>
          <button
            type="button"
            onClick={() => setIsTampered(false)}
            className={`px-space-md py-1 rounded text-headline-sm text-xs font-semibold transition-colors ${
              !isTampered
                ? 'bg-status-verified text-on-primary shadow-sm'
                : 'bg-surface-nested text-text-secondary hover:bg-border-grid'
            }`}
          >
            Simulate Verified Match
          </button>
        </div>
      </div>

      {/* Main Alert Banner */}
      {isTampered ? (
        <Card variant="tamper" padding="lg" rounded="lg">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-space-md">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-alert-tamper text-on-primary flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h1 className="font-headline-lg text-headline-lg text-alert-tamper tracking-tight">
                    CRITICAL DATA INTEGRITY ALERT: HASH MISMATCH DETECTED
                  </h1>
                  <StatusPill status="tamper" label="INTEGRITY BREACH" size="sm" pulse />
                </div>
                <p className="font-body-md text-body-md text-text-primary max-w-4xl leading-relaxed">
                  Off-chain record payload retrieved from database storage does not match the immutable cryptographic anchor recorded on the blockchain ledger (Block #1849188). Content has been altered or corrupted post-registration. Clinical review is suspended until data provenance is restored.
                </p>
                <div className="flex items-center gap-space-md mt-1 text-text-secondary font-label-sm text-label-sm flex-wrap">
                  <span className="flex items-center gap-1 font-mono">
                    <span className="text-alert-tamper font-semibold">Incident ID:</span> EHR-SEC-TAMPER-09411
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Patient:</span>
                    <MonoHash hash={samplePatient} copyable={false} size="sm" />
                  </span>
                  <span className="flex items-center gap-1 text-status-revoked font-semibold">
                    State: MUTATED OFF-CHAIN
                  </span>
                </div>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-space-xs self-stretch lg:self-auto">
              <Badge variant="tamper" size="md">SHA-256 MISMATCH</Badge>
              <span className="font-label-sm text-label-sm text-text-muted">Network: MST Testnet</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="verified" padding="lg" rounded="lg">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-space-md">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-status-verified text-on-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h1 className="font-headline-lg text-headline-lg text-status-verified tracking-tight">
                    CRYPTOGRAPHIC INTEGRITY CONFIRMED: 100% MATCH
                  </h1>
                  <StatusPill status="verified" label="BITWISE MATCH" size="sm" />
                </div>
                <p className="font-body-md text-body-md text-text-primary max-w-4xl leading-relaxed">
                  Off-chain record content exactly matches the on-chain cryptographic anchor on the blockchain ledger (Block #1849188). Zero alterations or mutations detected.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <Badge variant="verified" size="md">VERIFIED AUTHENTIC</Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Comparative Hash Discrepancy Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
        {/* Left Column: On-Chain Ledger State */}
        <Card variant="default" padding="lg" rounded="lg" className="flex flex-col justify-between">
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70">
              <div className="flex items-center gap-space-xs text-status-verified font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <h2 className="font-headline-md text-headline-md text-text-primary">
                  On-Chain Ledger State (Source of Truth)
                </h2>
              </div>
              <Badge variant="verified" size="sm">IMMUTABLE ANCHOR</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm bg-surface-nested p-space-sm rounded">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Block Reference</span>
                <span className="font-code-hash text-code-hash text-text-primary font-semibold">Block #1849188</span>
                <span className="font-label-sm text-label-sm text-text-secondary">Nov 18, 2023 16:45 UTC</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Smart Contract</span>
                <span className="font-code-hash text-code-hash text-secondary font-semibold">PatientRecords.sol</span>
                <MonoHash hash="0x5FbDB2315678afecb367f032d93F642f64180aa3" truncate size="sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Attending Clinician</span>
                <span className="font-body-sm text-body-sm text-text-primary font-medium">Dr. Vivan (MST Medical Officer)</span>
                <MonoHash hash="0xb3C09303335393D511F9eE1C7Bf4f1154904142b" truncate size="sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Network Node</span>
                <span className="font-code-hash text-code-hash text-text-primary font-semibold">MST Testnet</span>
                <span className="font-label-sm text-label-sm text-status-verified font-medium">Status: Synced</span>
              </div>
            </div>

            {/* Expected Hash Display */}
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                Expected Content Hash (bytes32 canonical anchor)
              </span>
              <div className="bg-dicom-surface p-space-sm rounded">
                <MonoHash hash={expectedHash} truncate={false} theme="verified" className="w-full justify-between" />
              </div>
            </div>

            {/* Mined Record Payload Segment */}
            <div className="flex flex-col gap-space-xs">
              <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                Original Payload Registered On-Chain
              </span>
              <pre className="bg-surface-nested p-space-sm rounded font-code-hash text-code-hash text-text-primary overflow-x-auto text-[11px] leading-relaxed select-all">
                {JSON.stringify(validPayload, null, 2)}
              </pre>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm border-t border-border-grid flex items-center justify-between text-text-muted font-label-sm text-label-sm">
            <span>State Anchor: Confirmed</span>
            <span className="text-status-verified font-medium">Hash bitwise verification: Ready</span>
          </div>
        </Card>

        {/* Right Column: Off-Chain Retrieved Record */}
        <Card
          variant={isTampered ? 'tamper' : 'default'}
          padding="lg"
          rounded="lg"
          className="flex flex-col justify-between relative overflow-hidden"
        >
          {isTampered && <div className="absolute top-0 right-0 left-0 h-1 bg-alert-tamper" />}

          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70">
              <div className="flex items-center gap-space-xs">
                {isTampered ? (
                  <AlertTriangle className="w-5 h-5 text-alert-tamper" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-status-verified" />
                )}
                <h2 className={`font-headline-md text-headline-md ${isTampered ? 'text-alert-tamper' : 'text-text-primary'}`}>
                  Off-Chain Database State (Current Retrieval)
                </h2>
              </div>
              <Badge variant={isTampered ? 'tamper' : 'verified'} size="sm">
                {isTampered ? 'MODIFIED' : 'AUTHENTIC'}
              </Badge>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-space-sm p-space-sm rounded ${
              isTampered ? 'bg-alert-tamper-bg/60' : 'bg-surface-nested'
            }`}>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Retrieved Timestamp</span>
                <span className="font-code-hash text-code-hash text-text-primary font-semibold">Just now</span>
                <span className={`font-label-sm text-label-sm ${isTampered ? 'text-alert-tamper font-semibold' : 'text-status-verified'}`}>
                  {isTampered ? 'Out-of-band edit detected' : 'Synchronized with chain'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Database Storage</span>
                <span className="font-code-hash text-code-hash text-text-primary font-semibold">Clinical Records DB</span>
                <span className="font-label-sm text-label-sm text-text-secondary">Off-chain secure store</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Discrepancy Status</span>
                <span className={`font-code-hash text-code-hash font-semibold ${isTampered ? 'text-alert-tamper' : 'text-status-verified'}`}>
                  {isTampered ? 'SHA-256 HASH MISMATCH' : 'SHA-256 EXACT MATCH'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">Field Modification</span>
                <span className={`font-label-sm text-label-sm font-semibold ${isTampered ? 'text-alert-tamper' : 'text-status-verified'}`}>
                  {isTampered ? 'medication_prescribed substituted' : '0 fields modified'}
                </span>
              </div>
            </div>

            {/* Computed Hash Display */}
            <div className="flex flex-col gap-space-xs">
              <span className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${
                isTampered ? 'text-alert-tamper' : 'text-text-secondary'
              }`}>
                Computed SHA-256 Digest of Retrieved Payload
              </span>
              <div className="bg-dicom-surface p-space-sm rounded">
                <MonoHash
                  hash={isTampered ? corruptedHash : expectedHash}
                  truncate={false}
                  theme={isTampered ? 'tamper' : 'verified'}
                  className="w-full justify-between"
                />
              </div>
            </div>

            {/* Retrieved Payload Detail */}
            <div className="flex flex-col gap-space-xs">
              <span className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${
                isTampered ? 'text-alert-tamper' : 'text-text-secondary'
              }`}>
                Retrieved Payload ({isTampered ? 'Altered Record' : 'Clean Record'})
              </span>
              <pre className={`p-space-sm rounded font-code-hash text-code-hash overflow-x-auto text-[11px] leading-relaxed select-all ${
                isTampered ? 'bg-alert-tamper-bg text-alert-tamper border border-alert-tamper-border' : 'bg-surface-nested text-text-primary'
              }`}>
                {JSON.stringify(isTampered ? tamperedPayload : validPayload, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mt-space-md pt-space-sm border-t border-border-grid flex items-center justify-between text-text-muted font-label-sm text-label-sm">
            <span className={isTampered ? 'text-alert-tamper font-medium' : 'text-status-verified font-medium'}>
              {isTampered ? 'Tamper Detected: Yes' : 'Tamper Detected: No'}
            </span>
            <span className="font-semibold">
              {isTampered ? 'Status: QUARANTINED' : 'Status: READY FOR CLINIC'}
            </span>
          </div>
        </Card>
      </div>

      {/* Forensic Visual Field Diff Visualizer */}
      {isTampered && (
        <Card variant="default" padding="md" rounded="lg">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70 mb-space-sm">
            <h3 className="font-headline-sm text-headline-sm text-text-primary">
              Field-Level Clinical Diff Analyzer
            </h3>
            <Badge variant="tamper" size="sm">CRITICAL PHARMACEUTICAL MISMATCH</Badge>
          </div>
          <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs font-code-hash text-code-hash text-[11px]">
            <div className="flex flex-col sm:flex-row sm:items-center text-status-verified gap-2">
              <span className="w-24 shrink-0 uppercase text-text-muted text-[10px] font-semibold">On-Chain Registered:</span>
              <span className="px-2 py-1 bg-status-verified-bg border border-status-verified-border rounded font-semibold break-all">
                medication_prescribed: "Amoxicillin-Clavulanate 875mg"
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center text-alert-tamper gap-2">
              <span className="w-24 shrink-0 uppercase text-text-muted text-[10px] font-semibold">Retrieved From DB:</span>
              <span className="px-2 py-1 bg-alert-tamper-bg border border-alert-tamper-border rounded font-semibold break-all">
                medication_prescribed: "Ciprofloxacin 500mg"
              </span>
            </div>
          </div>
          <p className="font-body-sm text-body-sm text-alert-tamper font-medium mt-space-sm flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Clinical Safety Warning: Medication changed from broad-spectrum penicillin to fluoroquinolone without clinician attestation.
          </p>
        </Card>
      )}

      {/* Step-by-Step Cryptographic Verification Pipeline */}
      <Card variant="default" padding="lg" rounded="lg">
        <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70 mb-space-md">
          <div className="flex items-center gap-space-xs">
            <Layers className="w-5 h-5 text-secondary" />
            <h3 className="font-headline-md text-headline-md text-text-primary">
              Step-by-Step Cryptographic Verification Pipeline
            </h3>
          </div>
          <span className="font-label-sm text-label-sm text-text-muted">MST Testnet Integrity Check</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-space-sm">
          {/* Step 1 */}
          <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid/50">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted">STEP 01</span>
              <Badge variant="verified" size="sm">SUCCESS</Badge>
            </div>
            <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
              Fetch On-Chain Hash
            </span>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Queried <code className="font-code-hash text-[11px]">PatientRecords.records()</code> on MST Testnet.
            </p>
            <span className="font-label-sm text-label-sm text-text-muted mt-auto">Block #1849188</span>
          </div>

          {/* Step 2 */}
          <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid/50">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted">STEP 02</span>
              <Badge variant="verified" size="sm">SUCCESS</Badge>
            </div>
            <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
              Retrieve Off-Chain Record
            </span>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Fetched patient record payload from backend clinical database.
            </p>
            <span className="font-label-sm text-label-sm text-text-muted mt-auto">Status: 200 OK</span>
          </div>

          {/* Step 3 */}
          <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid/50">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-text-muted">STEP 03</span>
              <Badge variant="verified" size="sm">SUCCESS</Badge>
            </div>
            <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
              Compute Deterministic Hash
            </span>
            <p className="font-body-sm text-body-sm text-text-secondary">
              Calculated <code className="font-code-hash text-[11px]">SHA-256(payload)</code>.
            </p>
            <span className="font-label-sm text-label-sm text-text-muted mt-auto">SHA-256 Standard</span>
          </div>

          {/* Step 4: Comparison */}
          <div className={`p-space-sm rounded flex flex-col gap-space-xs border ${
            isTampered ? 'bg-alert-tamper-bg border-alert-tamper-border' : 'bg-status-verified-bg border-status-verified-border'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`font-label-sm text-label-sm font-semibold ${isTampered ? 'text-alert-tamper' : 'text-status-verified'}`}>
                STEP 04
              </span>
              <Badge variant={isTampered ? 'tamper' : 'verified'} size="sm">
                {isTampered ? 'FAILED' : 'VERIFIED'}
              </Badge>
            </div>
            <span className={`font-headline-sm text-headline-sm text-[13px] ${isTampered ? 'text-alert-tamper' : 'text-status-verified'}`}>
              Compare Hashes
            </span>
            <p className="font-body-sm text-body-sm text-text-primary">
              {isTampered
                ? 'Expected hash != Computed hash. Mismatch detected!'
                : 'Expected hash == Computed hash. 100% bitwise match.'}
            </p>
            <span className={`font-label-sm text-label-sm font-semibold mt-auto ${isTampered ? 'text-alert-tamper' : 'text-status-verified'}`}>
              {isTampered ? 'HashMismatchTriggered' : 'LedgerIntegrityConfirmed'}
            </span>
          </div>
        </div>
      </Card>

      {/* Safety Actions Bar */}
      <Card variant="default" padding="md" rounded="lg" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <Lock className="w-5 h-5 text-secondary shrink-0" />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-text-primary">
              Clinical Safety Policy Active
            </span>
            <span className="font-body-sm text-body-sm text-text-secondary">
              Tampered records cannot be used for clinical orders without resolving the mismatch.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-xs flex-wrap justify-end">
          <button
            type="button"
            onClick={handleDownloadAudit}
            className="h-8 px-space-md bg-surface-card hover:bg-surface-nested border border-border-grid text-text-primary font-headline-sm text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloadSuccess ? 'Downloaded!' : 'Download Audit JSON'}</span>
          </button>

          <button
            type="button"
            onClick={handleReverify}
            disabled={isReverifying}
            className="h-8 px-space-md bg-secondary text-on-primary hover:bg-secondary/90 font-headline-sm text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReverifying ? 'animate-spin' : ''}`} />
            <span>{isReverifying ? 'Re-Verifying RPC...' : 'Re-Verify On-Chain'}</span>
          </button>

          {onNavigateSafe && (
            <button
              type="button"
              onClick={onNavigateSafe}
              className="h-8 px-space-md bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-xs rounded flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Workstation</span>
            </button>
          )}
        </div>
      </Card>

      {/* Collapsible Inspection Details */}
      <div className="bg-surface-nested rounded-lg p-space-sm border border-border-grid">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left flex items-center justify-between font-label-sm text-label-sm text-text-secondary select-none"
        >
          <div className="flex items-center gap-1 font-semibold uppercase tracking-wider">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>View Raw Cryptographic Verification Receipts</span>
          </div>
          <span className="text-text-muted font-mono">Contract: PatientRecords.sol · MST Testnet</span>
        </button>

        {isExpanded && (
          <pre className="mt-space-sm p-space-md bg-dicom-surface rounded font-code-hash text-code-hash text-[11px] text-dicom-text-secondary overflow-x-auto select-all">
            {JSON.stringify({
              network: "MST Testnet",
              chainId: "0x127b (4731)",
              contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
              caller: "0xb3C09303335393D511F9eE1C7Bf4f1154904142b",
              patientPseudonym: samplePatient,
              expectedHashBytes32: expectedHash,
              computedHashBytes32: isTampered ? corruptedHash : expectedHash,
              status: isTampered ? "TAMPER_EVIDENT_MISMATCH" : "VERIFIED_VALID"
            }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
