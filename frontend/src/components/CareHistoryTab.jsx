import React, { useState } from 'react';

const nodeData = {
  1: {
    block: 'BLOCK #1849203',
    method: 'recordDiagnosis(bytes32,string)',
    computed: 'e3b0c44298fc...b855',
    stored: 'e3b0c44298fc...b855',
    fullHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    json: `{\n  "patient_id": "PX-884920",\n  "event_type": "DIAGNOSIS_SCREENING",\n  "timestamp_utc": 1700390040,\n  "clinician": "Dr. K. Arisawa, MD",\n  "npi": "1942091823",\n  "findings": "Patchy right RLL opacity",\n  "densenet_calibrated_prob": 0.784,\n  "ece_metric": 0.024,\n  "parent_block": null\n}`
  },
  2: {
    block: 'BLOCK #1849205',
    method: 'prescribeMedication(bytes32,bytes32,string)',
    computed: '8f21bc9942a1...5201',
    stored: '8f21bc9942a1...5201',
    fullHash: '8f21bc9942a188f619e9842fbc923a10e7b4510bc44e29918fb5201460193da4',
    json: `{\n  "patient_id": "PX-884920",\n  "event_type": "TREATMENT_PRESCRIPTION",\n  "timestamp_utc": 1700403000,\n  "parent_event_block": 1849203,\n  "clinician": "Dr. S. Chen, MD",\n  "rx_ndc": "0029-6086-12",\n  "drug_name": "Amoxicillin-Clavulanate",\n  "dosage": "875/125 mg PO BID x 7d",\n  "refills": 0\n}`
  },
  3: {
    block: 'BLOCK #1849219',
    method: 'recordOutcome(bytes32,bytes32,uint8)',
    computed: '6d4a1b028ef7...992a',
    stored: '6d4a1b028ef7...992a',
    fullHash: '6d4a1b028ef73941bca94017ea0041bc569302194a8e0f9b349102ca992a11b7',
    json: `{\n  "patient_id": "PX-884920",\n  "event_type": "CLINICAL_RESOLUTION",\n  "timestamp_utc": 1700991000,\n  "parent_event_block": 1849205,\n  "referral_auth_tx": "0x88ea...209b",\n  "specialist": "Dr. E. Vance, MD",\n  "findings": "Significant clearing of right basilar opacity",\n  "clinical_status": "RESOLVED_DEFERVESCENCE",\n  "discharge_clearance": true\n}`
  }
};

export default function CareHistoryTab() {
  const [activeNode, setActiveNode] = useState(1);
  const [copyStatus, setCopyStatus] = useState('Copy Full Hash');
  const [reverifyStatus, setReverifyStatus] = useState('Re-Verify State RPC');
  const [isReverifying, setIsReverifying] = useState(false);

  const currentData = nodeData[activeNode];

  const handleCopyHash = () => {
    navigator.clipboard.writeText(currentData.fullHash).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus('Copy Full Hash'), 1500);
    });
  };

  const handleReverify = () => {
    setIsReverifying(true);
    setReverifyStatus('Querying RPC...');
    setTimeout(() => {
      setIsReverifying(false);
      setReverifyStatus('Verified State Match');
      setTimeout(() => setReverifyStatus('Re-Verify State RPC'), 2000);
    }, 900);
  };

  return (
    <div className="flex flex-col w-full font-sans">
      {/* Top Metagrid & Cryptographic Verification Header */}
      <div className="bg-surface-card p-space-lg shadow-sm border-b border-border-grid">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="font-headline-lg text-headline-lg text-text-primary tracking-tight">
                Care History Ledger
              </span>
              <span className="bg-surface-nested text-text-secondary font-label-md text-label-md px-2 py-0.5 rounded border border-border-grid">
                EPISODE #CAP-2023-11
              </span>
              <span className="bg-status-verified-bg text-status-verified font-label-sm text-label-sm px-2 py-0.5 rounded flex items-center gap-1 font-medium border border-status-verified-border">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                INTEGRITY: 100% (0 MISMATCHES)
              </span>
            </div>
            <div className="font-body-sm text-body-sm text-text-secondary">
              Longitudinal episode:{' '}
              <span className="text-text-primary font-medium">
                Community-Acquired Pneumonia (Nov 2023 - Present)
              </span>{' '}
              • Patient: <span className="font-code-hash text-code-hash text-text-primary">PX-884920</span> (0x8f4c...b29a)
            </div>
          </div>

          {/* Chain Verification Micro-Pills */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="bg-surface-nested px-space-md py-space-xs rounded flex flex-col border border-border-grid">
              <span className="font-label-sm text-label-sm text-text-muted">CHAIN / NETWORK</span>
              <span className="font-code-hash text-code-hash text-text-primary font-medium">MST Testnet (:4731)</span>
            </div>
            <div className="bg-surface-nested px-space-md py-space-xs rounded flex flex-col border border-border-grid">
              <span className="font-label-sm text-label-sm text-text-muted">STATE ROOT</span>
              <span className="font-code-hash text-code-hash text-text-primary font-medium">0x4a9e2d...f781</span>
            </div>
            <div className="bg-surface-nested px-space-md py-space-xs rounded flex flex-col border border-border-grid">
              <span className="font-label-sm text-label-sm text-text-muted">ON-CHAIN COMMITS</span>
              <span className="font-headline-sm text-headline-sm text-text-primary font-medium">3 Validated</span>
            </div>
            <button
              type="button"
              onClick={handleReverify}
              className="h-9 px-space-md bg-primary text-on-primary hover:bg-primary-container font-body-md text-body-md rounded flex items-center gap-space-xs transition-colors shadow-sm cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] ${isReverifying ? 'animate-spin' : ''}`}>
                sync
              </span>
              <span>{reverifyStatus}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workstation Layout: Timeline Stream & Right Inspector Pane */}
      <div className="p-space-lg grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Section: Timeline Nodes (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          <div className="relative flex flex-col">
            {/* Connecting Vertical Slate Rail */}
            <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border-strong -translate-x-1/2 pointer-events-none" />

            {/* Node 1: Diagnosis */}
            <div
              className="relative pl-12 pb-space-xl group cursor-pointer"
              onClick={() => setActiveNode(1)}
            >
              <div className="absolute left-6 top-4 -translate-x-1/2 w-8 h-8 rounded-full bg-surface-card flex items-center justify-center shadow-md cursor-pointer transition-transform group-hover:scale-110 border border-border-grid">
                <span className="material-symbols-outlined text-status-verified text-[18px]">radiology</span>
              </div>
              <div
                className={`rounded p-space-md shadow-sm transition-all border ${
                  activeNode === 1
                    ? 'bg-surface-bright shadow-md border-secondary ring-1 ring-secondary/20'
                    : 'bg-surface-card border-border-grid hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-sm mb-space-sm border-b border-border-grid/60">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded font-medium">
                      EVENT #01
                    </span>
                    <span className="font-headline-md text-headline-md text-text-primary">
                      Primary Diagnostic Screening
                    </span>
                    <span className="bg-status-verified-bg text-status-verified font-label-sm text-label-sm px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-status-verified-border">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      ON-CHAIN ANCHORED
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-text-muted">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Nov 19, 2023 • 10:34 UTC</span>
                  </div>
                </div>

                <div className="bg-surface-nested p-space-sm rounded mb-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm border border-border-grid">
                  <div>
                    <span className="text-text-muted">Issuing Entity: </span>
                    <span className="text-text-primary font-medium">Metro Health Radiology Dept • Bay 3</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Attending: </span>
                    <span className="text-text-primary font-medium">Dr. K. Arisawa, MD (Staff Radiologist)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-md">
                  <div className="md:col-span-2 flex flex-col justify-between">
                    <div className="space-y-space-xs">
                      <span className="font-label-sm text-label-sm text-text-muted uppercase">Structured Findings</span>
                      <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                        Chest Radiography (PA View) demonstrating right lower lobe patchy consolidation consistent with acute alveolar process. Calibrated DenseNet-121 binary screening model computed{' '}
                        <span className="font-label-md text-label-md text-text-primary bg-surface-nested px-1 py-0.5 rounded font-medium border border-border-grid">
                          78.4% Pneumonia Probability
                        </span>{' '}
                        (ECE: 0.024). Radiologist manual inspection confirmed clinical consolidation.
                      </p>
                    </div>
                    <div className="flex items-center gap-space-sm mt-space-sm flex-wrap">
                      <span className="bg-surface-nested font-label-sm text-label-sm text-text-secondary px-2 py-0.5 rounded border border-border-grid">View: CXR PA</span>
                      <span className="bg-surface-nested font-label-sm text-label-sm text-text-secondary px-2 py-0.5 rounded border border-border-grid">Model: DenseNet-121 v1.02</span>
                      <span className="bg-status-caution-bg text-status-caution font-label-sm text-label-sm px-2 py-0.5 rounded border border-status-caution-border">Triage Rank: Urgent</span>
                    </div>
                  </div>

                  <div className="relative bg-dicom-canvas rounded p-1.5 flex flex-col justify-between overflow-hidden border border-dicom-border">
                    <img
                      className="w-full h-28 object-cover rounded opacity-90"
                      alt="CXR with Grad-CAM Activation"
                      src="/static/samples/sample_pneumonia.png"
                    />
                    <div className="flex items-center justify-between font-label-sm text-label-sm text-dicom-text-secondary mt-1 px-1">
                      <span>Grad-CAM Activation</span>
                      <span className="text-secondary font-code-hash">RLL Hotspot</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-nested rounded p-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm font-label-sm text-label-sm border border-border-grid">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="text-text-muted">BLOCK: <strong className="text-text-primary font-code-hash">#1849203</strong></span>
                    <span className="text-text-muted">TX: <span className="text-secondary font-code-hash">0x7a2b...44e1</span></span>
                    <span className="text-text-muted">HASH: <span className="font-code-hash text-audit-hash">e3b0c44298fc...b855</span></span>
                  </div>
                  <button className="text-secondary hover:text-text-primary font-medium flex items-center gap-0.5 self-end sm:self-auto" type="button">
                    <span>View Receipt</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Node 2: Treatment & Medication */}
            <div
              className="relative pl-12 pb-space-xl group cursor-pointer"
              onClick={() => setActiveNode(2)}
            >
              <div className="absolute left-6 top-4 -translate-x-1/2 w-8 h-8 rounded-full bg-surface-card flex items-center justify-center shadow-md cursor-pointer transition-transform group-hover:scale-110 border border-border-grid">
                <span className="material-symbols-outlined text-secondary text-[18px]">medication</span>
              </div>
              <div
                className={`rounded p-space-md shadow-sm transition-all border ${
                  activeNode === 2
                    ? 'bg-surface-bright shadow-md border-secondary ring-1 ring-secondary/20'
                    : 'bg-surface-card border-border-grid hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-sm mb-space-sm border-b border-border-grid/60">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded font-medium">
                      EVENT #02
                    </span>
                    <span className="font-headline-md text-headline-md text-text-primary">
                      Outpatient Antimicrobial Regimen
                    </span>
                    <span className="bg-status-verified-bg text-status-verified font-label-sm text-label-sm px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-status-verified-border">
                      <span className="material-symbols-outlined text-[12px]">link</span>
                      PARENT: EVENT #01
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-text-muted">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Nov 19, 2023 • 14:10 UTC</span>
                  </div>
                </div>

                <div className="bg-surface-nested p-space-sm rounded mb-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm border border-border-grid">
                  <div>
                    <span className="text-text-muted">Issuing Entity: </span>
                    <span className="text-text-primary font-medium">Metro Health Outpatient Clinic 2B</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Prescribing Clinician: </span>
                    <span className="text-text-primary font-medium">Dr. S. Chen, MD (Attending Internist)</span>
                  </div>
                </div>

                <div className="space-y-space-xs mb-space-md">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase">Prescription Directives &amp; Clinical Orders</span>
                  <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                    Initiated oral outpatient therapy: <span className="font-medium text-text-primary">Amoxicillin-Clavulanate 875/125 mg PO BID for 7 days</span>. Supplemental instructions: albuterol nebulization q4h PRN wheezing, strict fluid hydration protocol (&gt;2.5L/day), and scheduled day-7 reassessment. Red-flag advisory communicated: pulse oximetry &lt;92% mandates emergency triage.
                  </p>
                  <div className="mt-space-sm bg-surface-nested rounded p-space-sm font-label-sm text-label-sm flex flex-col gap-1 border border-border-grid">
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>NDC 0029-6086-12 • Amox-Clav 875-125mg</span>
                      <span className="text-text-primary font-medium">Qty: 14 Tabs • Refills: 0</span>
                    </div>
                    <div className="flex items-center justify-between text-text-secondary">
                      <span>Dispense Status: Pharmacist Signed</span>
                      <span className="text-status-verified font-medium">Verified by BayCare Rx</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-nested rounded p-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm font-label-sm text-label-sm border border-border-grid">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="text-text-muted">BLOCK: <strong className="text-text-primary font-code-hash">#1849205</strong></span>
                    <span className="text-text-muted">TX: <span className="text-secondary font-code-hash">0x12dc...98ba</span></span>
                    <span className="text-text-muted">HASH: <span className="font-code-hash text-audit-hash">8f21bc9942a1...5201</span></span>
                  </div>
                  <button className="text-secondary hover:text-text-primary font-medium flex items-center gap-0.5 self-end sm:self-auto" type="button">
                    <span>View State Diff</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Node 3: Clinical Outcome & Resolution */}
            <div
              className="relative pl-12 group cursor-pointer"
              onClick={() => setActiveNode(3)}
            >
              <div className="absolute left-6 top-4 -translate-x-1/2 w-8 h-8 rounded-full bg-surface-card flex items-center justify-center shadow-md cursor-pointer transition-transform group-hover:scale-110 border border-border-grid">
                <span className="material-symbols-outlined text-status-verified text-[18px]">task_alt</span>
              </div>
              <div
                className={`rounded p-space-md shadow-sm transition-all border ${
                  activeNode === 3
                    ? 'bg-surface-bright shadow-md border-secondary ring-1 ring-secondary/20'
                    : 'bg-surface-card border-border-grid hover:shadow-md'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-sm mb-space-sm border-b border-border-grid/60">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="bg-primary text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded font-medium">
                      EVENT #03
                    </span>
                    <span className="font-headline-md text-headline-md text-text-primary">
                      Follow-Up Re-evaluation &amp; Resolution
                    </span>
                    <span className="bg-status-verified-bg text-status-verified font-label-sm text-label-sm px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-status-verified-border">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      OUTCOME CONFIRMED
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-text-muted">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Nov 26, 2023 • 09:30 UTC</span>
                  </div>
                </div>

                <div className="bg-surface-nested p-space-sm rounded mb-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-sm font-body-sm text-body-sm border border-border-grid">
                  <div>
                    <span className="text-text-muted">Issuing Entity: </span>
                    <span className="text-text-primary font-medium">St. Mary Pulmonary Referral Clinic</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Evaluating Specialist: </span>
                    <span className="text-text-primary font-medium">Dr. E. Vance, MD (Pulmonology)</span>
                  </div>
                </div>

                <div className="mb-space-sm inline-flex items-center gap-space-xs bg-surface-nested px-space-sm py-1 rounded text-text-secondary font-label-sm text-label-sm border border-border-grid">
                  <span className="material-symbols-outlined text-[14px] text-secondary">vpn_key</span>
                  <span>Delegated Consent Authorized via Tx: <span className="font-code-hash text-text-primary">0x88ea...209b</span></span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-space-md">
                  <div className="md:col-span-2 space-y-space-xs">
                    <span className="font-label-sm text-label-sm text-text-muted uppercase">Discharge &amp; Resolution Notes</span>
                    <p className="font-body-md text-body-md text-text-secondary leading-relaxed">
                      Day-7 completion assessment. Patient is afebrile (T 36.8°C) with resolution of productive cough and pleuritic discomfort. Auscultation reveals clear vesicular breath sounds throughout bilateral lung bases. Focused thoracic imaging confirms substantial radiographic clearing of right basilar infiltrates. Antimicrobial cycle successfully concluded.
                    </p>
                    <div className="flex items-center gap-space-sm mt-space-sm flex-wrap">
                      <span className="bg-surface-nested font-label-sm text-label-sm text-text-secondary px-2 py-0.5 rounded border border-border-grid">SpO2: 98% (Room Air)</span>
                      <span className="bg-surface-nested font-label-sm text-label-sm text-text-secondary px-2 py-0.5 rounded border border-border-grid">Status: Clinically Cured</span>
                      <span className="bg-status-verified-bg text-status-verified font-label-sm text-label-sm px-2 py-0.5 rounded border border-status-verified-border">Consensus: Closed</span>
                    </div>
                  </div>

                  <div className="relative bg-dicom-canvas rounded p-1.5 flex flex-col justify-between overflow-hidden border border-dicom-border">
                    <img
                      className="w-full h-28 object-cover rounded opacity-90"
                      alt="Control Scan with Cleared Lung Fields"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCesxJDs2HeA-nPlaYS4JSRy-RWw5JJ5oopOPTdzgjf6ZthRSv5ynck6HMk95-kyQRrUJ-gK75z3Bs0mQxjdCDoOUKFYilxvNmwAi89hdr4Jcn2GR8fDuemJqBuS32MWUW40fBKhXNyGwryH8z4vI8-Th6P28i6XagNDWFvKEqnr2l_8qOT1pBOPVsTrJEzv9OpKp7g1dLkUrYSpVVS4XCBu265R8SoJDx0hyUnz1aIn6S8JQCTGepa"
                    />
                    <div className="flex items-center justify-between font-label-sm text-label-sm text-dicom-text-secondary mt-1 px-1">
                      <span>Day-7 Control Scan</span>
                      <span className="text-status-verified font-code-hash">Cleared (96%)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-nested rounded p-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm font-label-sm text-label-sm border border-border-grid">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="text-text-muted">BLOCK: <strong className="text-text-primary font-code-hash">#1849219</strong></span>
                    <span className="text-text-muted">TX: <span className="text-secondary font-code-hash">0x51ef...33c9</span></span>
                    <span className="text-text-muted">HASH: <span className="font-code-hash text-audit-hash">6d4a1b028ef7...992a</span></span>
                  </div>
                  <button className="text-secondary hover:text-text-primary font-medium flex items-center gap-0.5 self-end sm:self-auto" type="button">
                    <span>Proof Cert</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_outward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Cryptographic Proof Inspector Panel (lg:col-span-4 sticky top-[100px]) */}
        <div className="lg:col-span-4 flex flex-col gap-space-md sticky top-[100px]">
          <div className="bg-surface-card rounded p-space-lg shadow-sm border border-border-grid">
            <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-border-grid/70">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-text-primary text-[20px]">enhanced_encryption</span>
                <span className="font-headline-md text-headline-md text-text-primary">Proof Inspector</span>
              </div>
              <span className="bg-surface-nested text-text-primary font-label-sm text-label-sm px-2 py-0.5 rounded font-medium border border-border-grid">
                {currentData.block}
              </span>
            </div>

            <p className="font-body-sm text-body-sm text-text-secondary mb-space-md">
              Inspect off-chain deterministic payload hash match against on-chain smart contract state storage.
            </p>

            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between font-label-sm text-label-sm">
                <span className="text-text-muted uppercase">CANONICAL OFF-CHAIN PAYLOAD</span>
                <span className="text-secondary font-code-hash">SHA-256 Validated</span>
              </div>
              <pre className="bg-surface-nested p-space-sm rounded font-code-hash text-code-hash text-text-primary overflow-x-auto text-[11px] leading-relaxed max-h-56 select-all border border-border-grid">
                {currentData.json}
              </pre>

              {/* Re-Hash Validator Comparator Component */}
              <div className="bg-surface-nested rounded p-space-sm flex flex-col gap-space-xs mt-space-xs border border-border-grid">
                <div className="flex items-center justify-between font-label-sm text-label-sm">
                  <span className="text-text-muted">STATE EQUALITY CHECK</span>
                  <span className="text-status-verified font-medium flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[14px]">check</span>
                    BITWISE 1:1 MATCH
                  </span>
                </div>
                <div className="flex flex-col gap-1 font-label-sm text-label-sm pt-1 border-t border-border-grid/60">
                  <div className="text-text-muted flex justify-between">
                    <span>Computed:</span>
                    <span className="font-code-hash text-audit-hash">{currentData.computed}</span>
                  </div>
                  <div className="text-text-muted flex justify-between">
                    <span>On-Chain:</span>
                    <span className="font-code-hash text-text-primary">{currentData.stored}</span>
                  </div>
                </div>
              </div>

              {/* Contract Function Call Inspection */}
              <div className="flex flex-col gap-space-xs mt-space-sm">
                <span className="font-label-sm text-label-sm text-text-muted uppercase">EVM Execution Metadata</span>
                <div className="bg-surface-nested rounded p-space-sm font-label-sm text-label-sm space-y-1.5 border border-border-grid">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Contract:</span>
                    <span className="font-code-hash text-text-primary">PatientRecords.sol</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Method:</span>
                    <span className="font-code-hash text-secondary">{currentData.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Network:</span>
                    <span className="font-code-hash text-text-primary">MST Testnet (4731)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Receipt Status:</span>
                    <span className="font-code-hash text-status-verified font-medium">0x1 (Success)</span>
                  </div>
                </div>
              </div>

              {/* Full Raw Hash Copy Drawer */}
              <div className="pt-space-sm flex items-center justify-between border-t border-border-grid mt-space-xs">
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="h-8 px-space-sm bg-surface-nested hover:bg-surface-variant text-text-primary font-body-sm text-body-sm rounded flex items-center gap-1 transition-colors border border-border-grid cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>{copyStatus}</span>
                </button>
                <span className="font-body-sm text-body-sm text-secondary font-mono">
                  MST Explorer :4731
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-card rounded p-space-md shadow-sm flex items-start gap-space-sm border border-border-grid">
            <span className="material-symbols-outlined text-secondary text-[22px] shrink-0 mt-0.5">security</span>
            <div className="flex flex-col gap-1">
              <span className="font-headline-sm text-headline-sm text-text-primary">Tamper-Evident Ledger</span>
              <p className="font-body-sm text-body-sm text-text-secondary leading-relaxed">
                All three care entries are cryptographically anchored on MST Testnet. Off-chain record mutations are automatically detected upon retrieval via SHA-256 bitwise mismatch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
