import React, { useState } from 'react';

export default function TamperAuditTab({ onNavigateSafe }) {
  const [isRefetching, setIsRefetching] = useState(false);
  const [refetchSuccess, setRefetchSuccess] = useState(false);
  const [ticketFiled, setTicketFiled] = useState(false);

  const handleDownloadJSON = () => {
    const report = {
      incident_id: "EHR-SEC-2023-8921-TAMPER",
      status: "QUARANTINED",
      block_number: 1849188,
      contract: "PatientRecords.sol (MST Testnet)",
      expected_hash: "0xa8f2b74041d5b12a8190c1f54a8b792e3d9943015f69a19c63bb49871a39f902",
      retrieved_hash: "0x3c99f11200ba71e8992a0141f11cb792e3d9943015f69a19c63bb49871a00000",
      timestamp: new Date().toISOString(),
      clinician: "Dr. K. Arisawa, MD",
      patient_ref: "0x8f4c...b29a",
      discrepancy: {
        field_altered: "medication_prescribed",
        original: "Amoxicillin-Clavulanate 875mg",
        corrupted: "Ciprofloxacin 500mg"
      }
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tamper-incident-8921.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefetch = () => {
    setIsRefetching(true);
    setTimeout(() => {
      setIsRefetching(false);
      setRefetchSuccess(true);
      setTimeout(() => setRefetchSuccess(false), 3000);
    }, 1800);
  };

  const handleFileTicket = () => {
    setTicketFiled(true);
  };

  return (
    <div className="flex flex-col w-full font-sans">
      <div className="px-space-md py-space-md flex flex-col gap-space-md">
        {/* Top Alert Banner: Level 3 Clinical Emergency Containment */}
        <div className="bg-alert-tamper-bg rounded-lg p-space-md flex flex-col md:flex-row items-start justify-between gap-space-md border border-alert-tamper-border">
          <div className="flex items-start gap-space-md">
            <div className="w-10 h-10 rounded-lg bg-alert-tamper text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">gpp_maybe</span>
            </div>
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="font-headline-lg text-headline-lg text-alert-tamper tracking-tight">
                  CRITICAL DATA INTEGRITY ALERT: HASH MISMATCH DETECTED
                </span>
                <span className="font-label-sm text-label-sm bg-alert-tamper text-on-primary px-2 py-0.5 rounded tracking-wide">
                  QUARANTINE ENFORCED
                </span>
              </div>
              <p className="font-body-md text-body-md text-text-primary max-w-4xl">
                Record content retrieved from off-chain database storage has been altered, corrupted, or tampered with since canonical on-chain registration on{' '}
                <span className="font-label-md text-label-md text-alert-tamper font-semibold">Block #1849188</span>.
                Cryptographic hash provenance invalidated. Clinical authorization and diagnostic interpretation are strictly suspended.
              </p>
              <div className="flex items-center gap-space-md mt-1 text-text-secondary font-label-sm text-label-sm flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-alert-tamper">shield_locked</span>
                  Incident ID: <strong className="text-text-primary font-mono">EHR-SEC-2023-8921-TAMPER</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">nest_clock_farsight_analog</span>
                  Triage Latency: <strong className="text-text-primary">0.082s to lockdown</strong>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  Ephemeral Patient Session: <strong className="text-text-primary">QUARANTINED</strong>
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-row md:flex-col items-end gap-space-xs shrink-0 self-stretch md:self-auto justify-between md:justify-start">
            <div className="bg-surface-card px-space-sm py-1 rounded shadow-sm flex items-center gap-2 text-status-revoked font-label-md text-label-md border border-alert-tamper-border">
              <span className="w-2 h-2 rounded-full bg-alert-tamper animate-ping" />
              <span>RECORD STATE: MUTATED</span>
            </div>
            <span className="font-label-sm text-label-sm text-text-muted font-mono">Protocol: MST Testnet / SHA-256</span>
          </div>
        </div>

        {/* Comparative Hash Discrepancy Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md">
          {/* Left Column: Source of Truth (Immutable On-Chain) */}
          <div className="bg-surface-card rounded-lg p-space-md flex flex-col justify-between shadow-sm border border-border-grid">
            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-status-verified">verified_user</span>
                  <h2 className="font-headline-md text-headline-md text-text-primary">
                    On-Chain Ledger State (Source of Truth)
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm bg-status-verified-bg text-status-verified px-2 py-0.5 rounded font-semibold border border-status-verified-border">
                  IMMUTABLE ANCHOR
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-surface-nested p-space-sm rounded border border-border-grid">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Block Reference</span>
                  <span className="font-code-hash text-code-hash text-text-primary font-semibold">#1849188 (Confirmed)</span>
                  <span className="font-label-sm text-label-sm text-text-secondary">Nov 18, 2023 16:45:12 UTC</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Smart Contract</span>
                  <span className="font-code-hash text-code-hash text-secondary font-semibold">PatientRecords.sol</span>
                  <span className="font-code-hash text-code-hash text-text-secondary">0x5FbDB2315678...0aa3</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Issuing Clinician</span>
                  <span className="font-body-sm text-body-sm text-text-primary font-medium">Dr. E. Vance, MD (Attending)</span>
                  <span className="font-code-hash text-code-hash text-text-secondary">0x70997970C5...79C8</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Network Node</span>
                  <div className="flex items-center gap-1 text-status-verified font-label-md text-label-md mt-0.5">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>MST Testnet Verified</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-text-muted">Chain ID: 4731</span>
                </div>
              </div>

              {/* Expected Hash Display */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                    Expected Content Hash (bytes32 canonical)
                  </span>
                  <button
                    className="text-text-muted hover:text-text-primary font-label-sm text-label-sm flex items-center gap-0.5 cursor-pointer"
                    onClick={() => navigator.clipboard.writeText('0xa8f2b74041d5b12a8190c1f54a8b792e3d9943015f69a19c63bb49871a39f902')}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[13px]">content_copy</span> Copy Raw
                  </button>
                </div>
                <div className="bg-dicom-surface p-space-sm rounded font-code-hash text-code-hash text-status-verified break-all select-all leading-relaxed border border-dicom-border">
                  0xa8f2b74041d5b12a8190c1f54a8b792e3d9943015f69a19c63bb49871a39f902
                </div>
              </div>

              {/* Original Verified Payload Detail */}
              <div className="flex flex-col gap-space-xs">
                <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider font-semibold">
                  Mined Record Payload (Reconstituted JSON Segment)
                </span>
                <div className="bg-surface-nested p-space-sm rounded text-text-primary font-code-hash text-code-hash overflow-x-auto border border-border-grid">
                  <pre className="m-0 leading-snug">
                    <code>{`{
  "record_id": "REC-PNEUMO-09411",
  "patient_ref": "0x8f4c3982d...b29a",`}
                      <span className="bg-status-verified-bg text-status-verified px-1 font-semibold block">
                        {`  "medication_prescribed": "Amoxicillin-Clavulanate 875mg",`}
                      </span>
{`  "frequency": "BID x 7 days",
  "icd_10_cm": "J18.9",
  "ai_assisted_flag": true,
  "confidence_score": 0.941
}`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-space-md pt-space-sm border-t border-border-grid flex items-center justify-between text-text-muted font-label-sm text-label-sm">
              <span>Ledger State: Synced</span>
              <span className="text-status-verified font-medium">Cryptographic Anchor: Confirmed</span>
            </div>
          </div>

          {/* Right Column: Off-Chain Retrieved (Corrupted/Tampered) */}
          <div className="bg-surface-card rounded-lg p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden border border-alert-tamper-border">
            <div className="absolute top-0 right-0 left-0 h-1 bg-alert-tamper" />

            <div className="flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px] text-alert-tamper">fmd_bad</span>
                  <h2 className="font-headline-md text-headline-md text-alert-tamper">
                    Off-Chain Database State (Current Retrieval)
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm bg-alert-tamper-bg text-alert-tamper px-2 py-0.5 rounded font-semibold animate-pulse border border-alert-tamper-border">
                  INTEGRITY BREACH
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-alert-tamper-bg/40 p-space-sm rounded border border-alert-tamper-border/50">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Retrieved Timestamp</span>
                  <span className="font-code-hash text-code-hash text-text-primary font-semibold">Nov 19, 2023 11:02:14 UTC</span>
                  <span className="font-label-sm text-label-sm text-alert-tamper">Delta: +18h 17m post-mining</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Storage Source</span>
                  <span className="font-code-hash text-code-hash text-text-primary font-semibold">Clinical Records Storage</span>
                  <span className="font-code-hash text-code-hash text-text-secondary">backend-db.internal</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Corrupted Payload Bytes</span>
                  <span className="font-body-sm text-body-sm text-alert-tamper font-medium">8 octets modified at offset 0x4B</span>
                  <span className="font-label-sm text-label-sm text-text-muted">Unauthenticated DB Write</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Hash Discrepancy Status</span>
                  <div className="flex items-center gap-1 text-alert-tamper font-label-md text-label-md mt-0.5 font-bold">
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                    <span>SHA-256 DELTA DETECTED</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-alert-tamper">Bits altered in segment 0-4, 30-31</span>
                </div>
              </div>

              {/* Computed Corrupted Hash Display */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-alert-tamper uppercase tracking-wider font-semibold">
                    Computed SHA-256 Hash of Payload (Payload Digest)
                  </span>
                  <span className="font-label-sm text-label-sm text-alert-tamper font-medium">
                    HASH MATCH TEST: 0% MATCH
                  </span>
                </div>
                <div className="bg-dicom-surface p-space-sm rounded font-code-hash text-code-hash text-alert-tamper break-all select-all leading-relaxed relative border border-dicom-border">
                  <span className="bg-alert-tamper/20 text-alert-tamper underline decoration-wavy">0x3c99f11200</span>
                  ba71e8992a0141f11cb792e3d9943015f69a19c63bb49871a
                  <span className="bg-alert-tamper/20 text-alert-tamper underline decoration-wavy">00000</span>
                </div>
              </div>

              {/* Tampered Record Payload Detail with Diff */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-alert-tamper uppercase tracking-wider font-semibold">
                    Retrieved Payload (Unauthorized Clinical Modification)
                  </span>
                  <span className="font-label-sm text-label-sm bg-alert-tamper text-on-primary px-1 rounded">
                    CRITICAL PHARMA DIFF
                  </span>
                </div>
                <div className="bg-surface-nested p-space-sm rounded text-text-primary font-code-hash text-code-hash overflow-x-auto border border-border-grid">
                  <pre className="m-0 leading-snug">
                    <code>{`{
  "record_id": "REC-PNEUMO-09411",
  "patient_ref": "0x8f4c3982d...b29a",`}
                      <span className="bg-alert-tamper text-on-primary font-bold px-1 rounded block">
                        {`  "medication_prescribed": "Ciprofloxacin 500mg",`}
                      </span>
{`  "frequency": "BID x 7 days",
  "icd_10_cm": "J18.9",
  "ai_assisted_flag": true,
  "confidence_score": 0.941
}`}
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-space-md pt-space-sm flex items-center justify-between text-text-muted font-label-sm text-label-sm bg-alert-tamper-bg/60 -mx-space-md -mb-space-md px-space-md py-space-xs border-t border-alert-tamper-border">
              <span className="text-alert-tamper font-medium flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">warning</span> Tamper Mechanism: Out-of-band DB mutation
              </span>
              <span className="text-alert-tamper font-semibold">Ledger Invalidation: TRUE</span>
            </div>
          </div>
        </div>

        {/* Forensic Visual Byte Diff Visualizer */}
        <div className="bg-surface-card rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm border border-border-grid">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-text-secondary">compare_arrows</span>
              <h3 className="font-headline-sm text-headline-sm text-text-primary">Byte-Level Diff Analyzer</h3>
            </div>
            <span className="font-label-sm text-label-sm text-text-muted font-mono">
              Target Byte Offset: [0x004A:0x006E] · 36 Bytes Substituted
            </span>
          </div>
          <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs font-code-hash text-code-hash text-[11px] border border-border-grid">
            <div className="flex flex-col sm:flex-row sm:items-center text-status-verified gap-2">
              <span className="w-20 shrink-0 uppercase text-text-muted text-[10px] font-semibold">On-Chain:</span>
              <span className="px-1 py-0.5 bg-status-verified-bg rounded font-semibold break-all border border-status-verified-border">
                6d 65 64 69 63 61 74 69 6f 6e 5f 70 72 65 73 63 72 69 62 65 64 3a 20 41 6d 6f 78 69 63 69 6c 6c 69 6e 2d 43 6c 61 76 75 6c 61 6e 61 74 65 20 38 37 35 6d 67
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center text-alert-tamper gap-2">
              <span className="w-20 shrink-0 uppercase text-text-muted text-[10px] font-semibold">Retrieved:</span>
              <span className="px-1 py-0.5 bg-alert-tamper-bg rounded font-semibold break-all border border-alert-tamper-border">
                6d 65 64 69 63 61 74 69 6f 6e 5f 70 72 65 73 63 72 69 62 65 64 3a 20 43 69 70 72 6f 66 6c 6f 78 61 63 69 6e 20 35 30 30 6d 67 00 00 00 00 00 00 00 00 00 00
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between text-text-secondary font-body-sm text-body-sm">
            <span className="flex items-center gap-1 text-alert-tamper font-medium">
              <span className="material-symbols-outlined text-[14px]">report_problem</span>
              Clinical Risk Warning: Prescription alteration from Broad-spectrum Penicillin to Fluoroquinolone without physician signature.
            </span>
            <span className="font-label-sm text-label-sm text-text-muted font-mono">Format: UTF-8 Binary</span>
          </div>
        </div>

        {/* Forensic Audit Log: Verification Pipeline Breakdown */}
        <div className="bg-surface-card rounded-lg p-space-md shadow-sm flex flex-col gap-space-md border border-border-grid">
          <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[18px] text-text-secondary">account_tree</span>
              <h3 className="font-headline-md text-headline-md text-text-primary">
                Step-by-Step Cryptographic Verification Pipeline
              </h3>
            </div>
            <span className="font-label-sm text-label-sm text-text-muted font-mono">MST Testnet Node Pipeline</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-space-sm">
            {/* Step 1 */}
            <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted">STEP 01</span>
                <span className="font-label-sm text-label-sm text-status-verified bg-status-verified-bg px-1 rounded flex items-center gap-0.5 border border-status-verified-border">
                  <span className="material-symbols-outlined text-[11px]">done</span> SUCCESS
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
                Fetch Contract State
              </span>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Invoked <code className="font-code-hash text-code-hash text-[11px]">PatientRecords.records()</code> on MST Testnet.
              </p>
              <span className="font-label-sm text-label-sm text-text-muted mt-auto">Block #1849188</span>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted">STEP 02</span>
                <span className="font-label-sm text-label-sm text-status-verified bg-status-verified-bg px-1 rounded flex items-center gap-0.5 border border-status-verified-border">
                  <span className="material-symbols-outlined text-[11px]">done</span> SUCCESS
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
                Retrieve Record Payload
              </span>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Fetched record data from clinical off-chain database.
              </p>
              <span className="font-label-sm text-label-sm text-text-muted mt-auto">HTTP 200 (14.2 KB)</span>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted">STEP 03</span>
                <span className="font-label-sm text-label-sm text-status-verified bg-status-verified-bg px-1 rounded flex items-center gap-0.5 border border-status-verified-border">
                  <span className="material-symbols-outlined text-[11px]">done</span> SUCCESS
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
                Parse Canonical JSON
              </span>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Normalized and parsed JSON fields deterministically.
              </p>
              <span className="font-label-sm text-label-sm text-text-muted mt-auto">Payload Valid</span>
            </div>

            {/* Step 4 */}
            <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-space-xs border border-border-grid">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-text-muted">STEP 04</span>
                <span className="font-label-sm text-label-sm text-status-verified bg-status-verified-bg px-1 rounded flex items-center gap-0.5 border border-status-verified-border">
                  <span className="material-symbols-outlined text-[11px]">done</span> SUCCESS
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-text-primary text-[13px]">
                Compute SHA-256 Hash
              </span>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Executed <code className="font-code-hash text-code-hash text-[11px]">SHA256(payload)</code>. Yielded digest <code className="font-code-hash text-code-hash text-[11px]">0x3c99...0000</code>.
              </p>
              <span className="font-label-sm text-label-sm text-text-muted mt-auto">SHA-256 Calculated</span>
            </div>

            {/* Step 5: FAILED */}
            <div className="bg-alert-tamper-bg rounded p-space-sm flex flex-col gap-space-xs border border-alert-tamper-border">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-alert-tamper font-semibold">STEP 05</span>
                <span className="font-label-sm text-label-sm text-on-primary bg-alert-tamper px-1 rounded flex items-center gap-0.5 font-semibold">
                  <span className="material-symbols-outlined text-[11px]">close</span> FAILED
                </span>
              </div>
              <span className="font-headline-sm text-headline-sm text-alert-tamper text-[13px]">
                Compare Cryptographic Hash
              </span>
              <p className="font-body-sm text-body-sm text-text-primary">
                Expected <code className="font-code-hash text-code-hash text-[10px]">0xa8f2...f902</code> != Computed <code className="font-code-hash text-code-hash text-[10px]">0x3c99...0000</code>.
              </p>
              <span className="font-label-sm text-label-sm text-alert-tamper font-semibold mt-auto flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">dangerous</span> TamperEvidentMismatch
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Safety Protocol Actions Bar */}
        <div className="bg-surface-card rounded-lg p-space-md shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md border border-border-grid">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-alert-tamper-bg flex items-center justify-center shrink-0 border border-alert-tamper-border">
              <span className="material-symbols-outlined text-[20px] text-alert-tamper">gavel</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-text-primary">
                Mandatory Clinical Safety Protocol Enforced
              </span>
              <span className="font-body-sm text-body-sm text-text-secondary">
                Clinical orders and prescription dispensing are suspended until cryptographic match is re-established.
              </span>
            </div>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-space-xs flex-wrap justify-end">
            <button
              className="h-8 px-space-md bg-surface-card text-text-primary hover:bg-surface-nested font-body-md text-body-md rounded flex items-center gap-1.5 transition-colors border border-border-grid cursor-pointer shadow-sm"
              onClick={handleDownloadJSON}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Download Audit Report (.json)</span>
            </button>

            <button
              className="h-8 px-space-md bg-surface-card text-secondary hover:bg-secondary-fixed/20 font-body-md text-body-md rounded flex items-center gap-1.5 transition-colors border border-border-grid cursor-pointer shadow-sm"
              onClick={handleRefetch}
              disabled={isRefetching}
              type="button"
            >
              <span className={`material-symbols-outlined text-[16px] ${isRefetching ? 'animate-spin' : ''}`}>
                {refetchSuccess ? 'cloud_done' : 'cached'}
              </span>
              <span>
                {isRefetching
                  ? 'Re-syncing with Ledger...'
                  : refetchSuccess
                  ? 'Backup Verified Valid (#1849188)'
                  : 'Re-fetch from Verified Node'}
              </span>
            </button>

            <button
              className={`h-8 px-space-md text-on-primary font-body-md text-body-md rounded flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer ${
                ticketFiled ? 'bg-status-verified' : 'bg-alert-tamper hover:bg-status-revoked'
              }`}
              onClick={handleFileTicket}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {ticketFiled ? 'check' : 'notification_important'}
              </span>
              <span>{ticketFiled ? 'Ticket #SEC-8921 Dispatched' : 'File Incident Ticket #SEC-8921'}</span>
            </button>

            <button
              className="h-8 px-space-md bg-primary text-on-primary hover:bg-primary-container font-body-md text-body-md rounded flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              onClick={() => onNavigateSafe && onNavigateSafe()}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Acknowledge &amp; Exit to Safe View</span>
            </button>
          </div>
        </div>

        {/* Collapsible Raw Forensic Audit Log Drawer / Inspection JSON */}
        <div className="bg-surface-nested rounded-lg p-space-sm border border-border-grid">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center justify-between font-label-sm text-label-sm text-text-secondary select-none">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] group-open:rotate-90 transition-transform">
                  chevron_right
                </span>
                <span className="font-semibold uppercase tracking-wider">
                  Expand Complete Blockchain Attestation &amp; MST RPC Receipts
                </span>
              </div>
              <span className="text-text-muted font-mono">Transaction: 0x7b2f4c919d...4490 (MST Testnet)</span>
            </summary>
            <div className="mt-space-sm pt-space-sm bg-dicom-surface p-space-md rounded font-code-hash text-code-hash text-[11px] text-dicom-text-secondary overflow-x-auto border border-dicom-border">
              <pre className="m-0 leading-relaxed">
                <code className="text-dicom-text-primary">{`{
  "audit_version": "1.0.0",
  "verification_status": "INTEGRITY_COMPROMISED",
  "failure_code": "ERR_HASH_MISMATCH",
  "smart_contract_call": {
    "network_id": 4731,
    "network_name": "MST Testnet Node #04",
    "contract_address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "caller_identity": "0xb3C09303335393D511F9eE1C7Bf4f1154904142b",
    "tx_hash": "0x7b2f4c919d380e21a8112c3f87629b3014c2b9a76d1e438f9024cba449000000",
    "block_number": 1849188,
    "block_timestamp": 1700325912
  },
  "cryptographic_proof": {
    "expected_hash_bytes32": "0xa8f2b74041d5b12a8190c1f54a8b792e3d9943015f69a19c63bb49871a39f902",
    "computed_hash_bytes32": "0x3c99f11200ba71e8992a0141f11cb792e3d9943015f69a19c63bb49871a00000",
    "hash_delta_bytes": [0, 1, 2, 3, 4, 30, 31],
    "diff_classification": "CRITICAL_PHARMACOLOGICAL_MUTATION"
  },
  "triage_actions_taken": [
    "CLINICAL_WORKFLOW_LOCKED",
    "PATIENT_EPHEMERAL_SESSION_QUARANTINED",
    "INCIDENT_DISPATCH_TRIGGERED"
  ]
}`}</code>
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
