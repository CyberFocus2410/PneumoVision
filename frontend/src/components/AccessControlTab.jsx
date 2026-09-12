import React, { useState } from 'react';

const presetMap = {
  'mass-gen': '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  'st-jude': '0x44a179C9338271aF923e381bE39719F1128399e1',
  'metro-health': '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  'comm-pulm': '0x87a932F268f7602058Ac06e1291bB85244b4f420'
};

export default function AccessControlTab() {
  const [institutionInput, setInstitutionInput] = useState('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
  const [activeDuration, setActiveDuration] = useState('7d');
  const [isSigning, setIsSigning] = useState(false);
  const [toast, setToast] = useState(null);
  const [streamPaused, setStreamPaused] = useState(false);

  const [tableRows, setTableRows] = useState([
    {
      id: 'row-metro-health',
      name: 'Metro Health Radiology Bay 3',
      address: '0x90F7...c2e7',
      scope: 'All CXR + AI Screening Reports',
      timestamp: 'Nov 19, 2023 10:30 UTC',
      expiry: 'Nov 26, 2023 (6 Days Left)',
      status: 'ACTIVE'
    },
    {
      id: 'row-st-mary',
      name: 'St. Mary Pulmonary Referral Clinic',
      address: '0x15d3...f821',
      scope: 'Care Timeline & Outcome History',
      timestamp: 'Nov 15, 2023 14:15 UTC',
      expiry: 'Dec 15, 2023 (25 Days Left)',
      status: 'ACTIVE'
    },
    {
      id: 'row-tri-county',
      name: 'Tri-County Urgent Care',
      address: '0x9965...12a0',
      scope: 'CXR Screening Images Only',
      timestamp: 'Oct 02, 2023 09:00 UTC',
      expiry: 'Revoked by Patient Oct 08, 2023',
      status: 'REVOKED'
    },
    {
      id: 'row-vance',
      name: 'Dr. Vance Diagnostic Imaging',
      address: '0x7099...79C8',
      scope: 'Single Study #84912',
      timestamp: 'Aug 12, 2023 11:20 UTC',
      expiry: 'Expired Aug 13, 2023',
      status: 'EXPIRED'
    }
  ]);

  const [streamFeed, setStreamFeed] = useState([
    { time: '10:30:14 UTC', type: 'AccessGranted', details: '(patient=0x8f4c...b29a, doctor=0x90F7...c2e7, block=1849202)', tx: '0x9f1a...481d', status: 'CONFIRMED' },
    { time: '08:42:01 UTC', type: 'AccessRevoked', details: '(patient=0x8f4c...b29a, doctor=0x9965...12a0, block=1849195)', tx: '0x82b4...310f', status: 'REVOKED' },
    { time: '08:41:59 UTC', type: 'Enclave Check', details: 'Off-chain DB query verified mapping: hasAccess(0x8f4c..., 0x90F7...) == true', tx: 'VERIFIED OK', status: 'OK' },
    { time: '04:12:30 UTC', type: 'Access Attempt Blocked', details: 'Caller 0x7099...79C8 denied - contract revert: ERR_UNAUTHORIZED_HOSPITAL_GRANT', tx: 'HTTP 403 REVERT', status: 'BLOCKED' }
  ]);

  const showToast = (title, msg) => {
    setToast({ title, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePresetSelect = (e) => {
    if (presetMap[e.target.value]) {
      setInstitutionInput(presetMap[e.target.value]);
    }
  };

  const handleSignGrant = () => {
    setIsSigning(true);
    setTimeout(() => {
      setIsSigning(false);
      showToast('Grant Registered on Block #1849205', 'Smart contract state transition confirmed on MST Testnet.');

      const newEntry = {
        id: `row-${Date.now()}`,
        name: 'Authorized Clinical Entity',
        address: `${institutionInput.substring(0, 6)}...${institutionInput.substring(institutionInput.length - 4)}`,
        scope: 'CXR & Diagnostic Encounter Reports',
        timestamp: 'Just Now',
        expiry: `${activeDuration} Left`,
        status: 'ACTIVE'
      };
      setTableRows((prev) => [newEntry, ...prev]);

      if (!streamPaused) {
        setStreamFeed((prev) => [
          {
            time: 'Just Now',
            type: 'AccessGranted',
            details: `(patient=0x8f4c...b29a, doctor=${institutionInput.substring(0, 8)}..., block=1849205)`,
            tx: 'tx: 0x3d2a...881f',
            status: 'CONFIRMED'
          },
          ...prev
        ]);
      }
    }, 1000);
  };

  const handleRevokeRow = (rowId, name) => {
    if (confirm(`Confirm immediate on-chain revocation of all imaging access for: ${name}?`)) {
      setTableRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, status: 'REVOKED', expiry: 'Revoked by Patient Just Now' } : r
        )
      );
      showToast('Revocation Committed', `${name} access reverted by smart contract.`);
    }
  };

  const activeCount = tableRows.filter((r) => r.status === 'ACTIVE').length;
  const revokedCount = tableRows.filter((r) => r.status === 'REVOKED').length;
  const expiredCount = tableRows.filter((r) => r.status === 'EXPIRED').length;

  return (
    <div className="flex flex-col w-full font-sans">
      <div className="w-full px-space-lg py-space-md flex flex-col gap-space-lg max-w-[1720px] mx-auto">
        {/* Top Identity & Cryptographic Protocol Summary */}
        <section className="bg-surface-card rounded-lg shadow-sm p-space-lg flex flex-col gap-space-md border border-border-grid">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-lg bg-surface-nested flex items-center justify-center text-secondary border border-border-grid">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-space-sm flex-wrap">
                  <span className="font-headline-lg text-headline-lg text-text-primary">
                    Smart Contract Access Control
                  </span>
                  <span className="font-label-sm text-label-sm bg-surface-nested text-secondary px-2 py-0.5 rounded uppercase border border-border-grid">
                    PatientRecords.sol v1.0
                  </span>
                  <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-status-verified bg-status-verified-bg px-2 py-0.5 rounded border border-status-verified-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-verified" />
                    ACTIVE PROTOCOL
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-text-secondary mt-0.5">
                  Consent gating: Cross-institutional EHR &amp; DICOM access cryptographically authorized at contract state.
                </p>
              </div>
            </div>

            {/* Network Indicators */}
            <div className="flex items-center gap-space-md">
              <div className="bg-surface-nested px-space-md py-space-xs rounded flex flex-col text-right border border-border-grid">
                <span className="font-label-sm text-label-sm text-text-muted">CHAIN NETWORK</span>
                <span className="font-code-hash text-code-hash text-text-primary font-medium">
                  MST Testnet (Chain ID 4731)
                </span>
              </div>
              <div className="bg-surface-nested px-space-md py-space-xs rounded flex flex-col text-right border border-border-grid">
                <span className="font-label-sm text-label-sm text-text-muted">STATE ATTESTATION</span>
                <span className="font-label-md text-label-md text-status-verified font-medium">
                  Contract Synced #1849204
                </span>
              </div>
            </div>
          </div>

          {/* Identity & Security Boundary Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md pt-space-xs border-t border-border-grid/70 mt-space-sm">
            <div className="bg-surface-nested p-space-md rounded flex flex-col justify-between border border-border-grid">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-label-sm text-text-muted">PATIENT PSEUDONYM</span>
                <span className="font-label-sm text-label-sm text-secondary font-semibold">PX-884920</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-code-hash text-code-hash text-text-primary">0x8f4c21e07b7194f2d3...b29a</span>
                <button
                  className="text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
                  title="Copy Root Key"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('0x8f4c21e07b7194f2d348b29a');
                    showToast('Copied', 'Patient root key copied.');
                  }}
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                </button>
              </div>
            </div>

            <div className="bg-surface-nested p-space-md rounded flex flex-col justify-between border border-border-grid">
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-sm text-label-sm text-text-muted">AUTHORITY CONTRACT</span>
                <span className="font-label-sm text-label-sm text-status-verified font-semibold">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-code-hash text-code-hash text-text-primary">0x5FbDB2315678afecb3...80aa3</span>
                <button
                  className="text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
                  title="Verify on Explorer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </button>
              </div>
            </div>

            <div className="bg-status-caution-bg p-space-md rounded flex items-start gap-space-sm text-status-caution border border-status-caution-border">
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">gavel</span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-status-caution leading-none">
                  Strict Enclave Enforcement
                </span>
                <span className="font-body-sm text-body-sm text-text-secondary mt-1">
                  Hospitals lacking active cryptographic grant encounter{' '}
                  <span className="font-code-hash text-code-hash font-semibold text-alert-tamper">
                    HTTP 403 Forbidden
                  </span>{' '}
                  with contract revert: <span className="font-code-hash text-code-hash">ERR_UNAUTHORIZED_HOSPITAL_GRANT</span>.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Workspace Bento: Grant Interface & Quick Metrics */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
          {/* Action Form: Authorize & Grant Access (xl: 8 cols) */}
          <section className="xl:col-span-8 bg-surface-card rounded-lg shadow-sm p-space-lg flex flex-col gap-space-md border border-border-grid">
            <div className="flex items-center justify-between pb-space-xs border-b border-border-grid/70">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-secondary text-[20px]">vpn_key</span>
                <h2 className="font-headline-md text-headline-md text-text-primary">
                  Grant Access to Hospital / Physician
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-text-muted uppercase">
                MST Contract State Grant
              </span>
            </div>

            <form className="flex flex-col gap-space-md" onSubmit={(e) => { e.preventDefault(); handleSignGrant(); }}>
              {/* Institutional Target Input */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md">
                <div className="md:col-span-7 flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-text-secondary flex items-center justify-between">
                    <span>INSTITUTIONAL ID OR ETHEREUM ADDRESS</span>
                    <span className="text-text-muted font-normal">Hex / ENS / Node Identifier</span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      className="w-full bg-surface-nested text-text-primary font-code-hash text-code-hash px-space-md py-2.5 rounded focus:outline-none focus:bg-surface-card focus:ring-1 focus:ring-secondary transition-all border border-border-grid"
                      placeholder="0x... or HOSP_US_..."
                      type="text"
                      value={institutionInput}
                      onChange={(e) => setInstitutionInput(e.target.value)}
                    />
                    <span className="absolute right-3 material-symbols-outlined text-[16px] text-status-verified">
                      verified
                    </span>
                  </div>
                </div>

                {/* Preset Registry Quick-Select */}
                <div className="md:col-span-5 flex flex-col gap-1">
                  <label className="font-label-md text-label-md text-text-secondary">
                    TRUSTED REGISTRY DIRECTORY
                  </label>
                  <select
                    className="w-full bg-surface-nested text-text-primary font-body-md text-body-md px-space-md py-2.5 rounded focus:outline-none focus:bg-surface-card transition-all cursor-pointer border border-border-grid"
                    onChange={handlePresetSelect}
                  >
                    <option value="custom">-- Choose Pre-Verified Node --</option>
                    <option value="mass-gen">Mass General Brigham (HOSP_US_MASS_GENERAL)</option>
                    <option value="st-jude">St. Jude Children's Hospital (0x44a1...99e1)</option>
                    <option value="metro-health">Metro Health Radiology Group (0x90F7...c2e7)</option>
                    <option value="comm-pulm">Community Pulmonology Associates (0x87a9...f420)</option>
                  </select>
                </div>
              </div>

              {/* Duration Selector */}
              <div className="flex flex-col gap-1 pt-space-xs">
                <label className="font-label-md text-label-md text-text-secondary">
                  ACCESS DURATION (SMART CONTRACT EXPIRY BLOCK)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
                  {[
                    { id: '7d', label: '7 Days', desc: 'Referral Consultation' },
                    { id: '30d', label: '30 Days', desc: 'Ongoing Inpatient' },
                    { id: 'perm', label: 'Permanent', desc: 'Until Patient Revoke' },
                    { id: '24h', label: 'One-Time Read', desc: '24-Hour Ephemeral' }
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setActiveDuration(dur.id)}
                      className={`duration-btn p-space-sm rounded text-left transition-all flex flex-col justify-between h-16 border cursor-pointer ${
                        activeDuration === dur.id
                          ? 'bg-primary text-on-primary border-primary shadow-sm'
                          : 'bg-surface-nested text-text-primary border-border-grid hover:bg-surface-variant/40'
                      }`}
                    >
                      <span className="font-headline-sm text-headline-sm">{dur.label}</span>
                      <span className={`font-label-sm text-label-sm ${activeDuration === dur.id ? 'opacity-80' : 'text-text-muted'}`}>
                        {dur.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Scope Matrix */}
              <div className="flex flex-col gap-space-xs pt-space-xs">
                <span className="font-label-md text-label-md text-text-secondary">
                  SELECT ENCRYPTED DATA SCOPE (OFF-CHAIN ATTESTATION)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-nested cursor-pointer hover:bg-surface-variant/30 transition-colors border border-border-grid">
                    <input defaultChecked className="mt-1 accent-primary rounded w-4 h-4" type="checkbox" />
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-text-primary">
                        Diagnostic Chest Radiographs &amp; Grad-CAM
                      </span>
                      <span className="font-body-sm text-body-sm text-text-muted">
                        Full DICOM series + DenseNet-121 attention vectors.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-nested cursor-pointer hover:bg-surface-variant/30 transition-colors border border-border-grid">
                    <input defaultChecked className="mt-1 accent-primary rounded w-4 h-4" type="checkbox" />
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-text-primary">
                        Clinical Encounter Reports
                      </span>
                      <span className="font-body-sm text-body-sm text-text-muted">
                        Radiologist impressions, structured notes &amp; triage history.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-nested cursor-pointer hover:bg-surface-variant/30 transition-colors border border-border-grid">
                    <input defaultChecked className="mt-1 accent-primary rounded w-4 h-4" type="checkbox" />
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-text-primary">
                        Medication &amp; Treatment History
                      </span>
                      <span className="font-body-sm text-body-sm text-text-muted">
                        Antibiotic therapy schedules, oxygen saturation &amp; labs.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-nested cursor-pointer hover:bg-surface-variant/30 transition-colors opacity-70 border border-border-grid">
                    <input className="mt-1 accent-primary rounded w-4 h-4" type="checkbox" />
                    <div className="flex flex-col">
                      <span className="font-headline-sm text-headline-sm text-text-primary">
                        Full Genomic / Lab History
                      </span>
                      <span className="font-body-sm text-body-sm text-text-muted">
                        Extended sputum sequencing &amp; host risk factors.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Execution Bar */}
              <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-xs border-t border-border-grid mt-space-xs">
                <div className="flex items-center gap-space-md">
                  <div className="flex items-center gap-1 font-label-sm text-label-sm text-status-verified">
                    <span className="material-symbols-outlined text-[14px]">enhanced_encryption</span>
                    <span>On-Chain Structured Attestation</span>
                  </div>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button
                    className="px-space-md py-2 bg-surface-nested text-text-primary hover:bg-border-grid font-headline-sm text-headline-sm rounded transition-colors border border-border-grid cursor-pointer"
                    type="button"
                    onClick={() => setInstitutionInput('')}
                  >
                    Clear
                  </button>
                  <button
                    className="px-space-lg py-2 bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-headline-sm rounded shadow flex items-center gap-space-xs transition-all active:scale-[0.99] cursor-pointer"
                    type="submit"
                    disabled={isSigning}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isSigning ? 'animate-spin' : ''}`}>
                      {isSigning ? 'sync' : 'key'}
                    </span>
                    <span>{isSigning ? 'Authorizing on Chain...' : 'Authorize & Sign Transaction'}</span>
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Security Telemetry & Consent Overview (xl: 4 cols) */}
          <aside className="xl:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-card rounded-lg shadow-sm p-space-lg flex flex-col justify-between flex-1 border border-border-grid">
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-text-muted uppercase tracking-wider">
                    Access Policy Verification
                  </span>
                  <span className="font-label-sm text-label-sm text-secondary bg-surface-nested px-1.5 py-0.5 rounded border border-border-grid">
                    MST Testnet
                  </span>
                </div>
                <h3 className="font-headline-md text-headline-md text-text-primary">Off-Chain Enclave Sync</h3>
                <p className="font-body-sm text-body-sm text-text-secondary">
                  Encrypted patient imaging payloads are hosted off-chain. Decryption keys are derived exclusively through smart contract validation receipts.
                </p>

                {/* Inline SVG Graphic: Cryptographic Access Tree */}
                <div className="w-full bg-surface-nested rounded-lg p-space-md my-space-xs flex items-center justify-center border border-border-grid">
                  <svg className="w-full h-28 text-text-secondary" fill="none" viewBox="0 0 340 110" xmlns="http://www.w3.org/2000/svg">
                    {/* Patient Node */}
                    <rect x="10" y="38" width="70" height="34" rx="4" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.2" />
                    <text x="45" y="54" textAnchor="middle" fill="#0F172A" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600">PATIENT</text>
                    <text x="45" y="65" textAnchor="middle" fill="#64748B" fontFamily="JetBrains Mono" fontSize="7">PX-884920</text>
                    {/* Connector 1 */}
                    <path d="M80 55 H130" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
                    <polygon points="128,52 135,55 128,58" fill="#CBD5E1" />
                    {/* Contract Node */}
                    <rect x="135" y="24" width="80" height="62" rx="4" fill="#006781" fillOpacity="0.1" stroke="#006781" strokeWidth="1.5" />
                    <text x="175" y="44" textAnchor="middle" fill="#006781" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700">SMART CONTRACT</text>
                    <text x="175" y="56" textAnchor="middle" fill="#0F172A" fontFamily="JetBrains Mono" fontSize="8">hasAccess()</text>
                    <text x="175" y="69" textAnchor="middle" fill="#059669" fontFamily="JetBrains Mono" fontSize="7" fontWeight="600">MST Testnet</text>
                    {/* Connector 2 */}
                    <path d="M215 45 H260" stroke="#CBD5E1" strokeWidth="1.5" />
                    <polygon points="258,42 265,45 258,48" fill="#CBD5E1" />
                    <path d="M215 65 H260" stroke="#CBD5E1" strokeWidth="1.5" />
                    <polygon points="258,62 265,65 258,68" fill="#CBD5E1" />
                    {/* Hospital Nodes */}
                    <rect x="265" y="32" width="65" height="26" rx="4" fill="#059669" fillOpacity="0.1" stroke="#059669" strokeWidth="1.2" />
                    <text x="297" y="48" textAnchor="middle" fill="#059669" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600">GRANTED (200)</text>
                    <rect x="265" y="62" width="65" height="26" rx="4" fill="#DC2626" fillOpacity="0.08" stroke="#DC2626" strokeWidth="1.2" />
                    <text x="297" y="78" textAnchor="middle" fill="#DC2626" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600">REVERT (403)</text>
                  </svg>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-space-xs pt-space-sm border-t border-border-grid mt-space-xs">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted">ACTIVE</span>
                  <span className="font-headline-lg text-headline-lg text-status-verified">{activeCount} Nodes</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted">REVOKED</span>
                  <span className="font-headline-lg text-headline-lg text-text-muted">{revokedCount} Node</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-text-muted">EXPIRED</span>
                  <span className="font-headline-lg text-headline-lg text-text-muted">{expiredCount} Node</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-nested p-space-md rounded-lg flex items-start gap-space-sm border border-border-grid">
              <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">shield_lock</span>
              <p className="font-body-sm text-body-sm text-text-secondary">
                Revocation takes effect immediately upon on-chain block inclusion. Any existing in-flight downloads by revoked nodes are rejected.
              </p>
            </div>
          </aside>
        </div>

        {/* Active Access Permissions Table */}
        <section className="bg-surface-card rounded-lg shadow-sm p-space-lg flex flex-col gap-space-md border border-border-grid">
          <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs border-b border-border-grid/70">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px]">table_chart</span>
              <h2 className="font-headline-md text-headline-md text-text-primary">
                Institutional Access Registry &amp; Ledger State
              </h2>
              <span className="font-label-sm text-label-sm bg-surface-nested text-text-muted px-2 py-0.5 rounded border border-border-grid">
                {tableRows.length} TOTAL DELEGATIONS
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-nested text-text-secondary font-headline-sm text-headline-sm uppercase text-[11px] tracking-wider border-b border-border-grid">
                  <th className="py-2.5 px-space-md font-semibold">Hospital / Entity Name</th>
                  <th className="py-2.5 px-space-md font-semibold">Ethereum Address / Node ID</th>
                  <th className="py-2.5 px-space-md font-semibold">Scope Granted</th>
                  <th className="py-2.5 px-space-md font-semibold">Grant Timestamp</th>
                  <th className="py-2.5 px-space-md font-semibold">Expiration / State</th>
                  <th className="py-2.5 px-space-md font-semibold">Status</th>
                  <th className="py-2.5 px-space-md font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-grid font-body-md text-body-md text-text-primary">
                {tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-base transition-colors">
                    <td className="py-3 px-space-md font-medium">
                      <div className="flex items-center gap-space-xs">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            row.status === 'ACTIVE'
                              ? 'bg-status-verified'
                              : row.status === 'REVOKED'
                              ? 'bg-alert-tamper'
                              : 'bg-text-muted'
                          }`}
                        />
                        <span className={row.status === 'REVOKED' ? 'line-through text-text-muted' : ''}>
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-space-md font-code-hash text-code-hash text-text-secondary">
                      <div className="flex items-center gap-1">
                        <span>{row.address}</span>
                        <button
                          className="text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(row.address);
                            showToast('Copied', 'Address copied to clipboard.');
                          }}
                        >
                          <span className="material-symbols-outlined text-[13px]">content_copy</span>
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-space-md">
                      <span className="bg-surface-nested font-label-sm text-label-sm px-2 py-0.5 rounded text-text-primary font-medium border border-border-grid">
                        {row.scope}
                      </span>
                    </td>
                    <td className="py-3 px-space-md font-code-hash text-code-hash text-text-secondary">
                      {row.timestamp}
                    </td>
                    <td
                      className={`py-3 px-space-md font-code-hash text-code-hash font-medium ${
                        row.status === 'ACTIVE'
                          ? 'text-status-verified'
                          : row.status === 'REVOKED'
                          ? 'text-alert-tamper'
                          : 'text-text-muted'
                      }`}
                    >
                      {row.expiry}
                    </td>
                    <td className="py-3 px-space-md">
                      {row.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-status-verified bg-status-verified-bg border border-status-verified-border px-2 py-0.5 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-verified animate-pulse" />
                          ACTIVE
                        </span>
                      ) : row.status === 'REVOKED' ? (
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-alert-tamper bg-alert-tamper-bg border border-alert-tamper-border px-2 py-0.5 rounded">
                          <span className="material-symbols-outlined text-[12px]">block</span>
                          REVOKED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-text-secondary bg-surface-nested px-2 py-0.5 rounded border border-border-grid">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          EXPIRED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-space-md text-right">
                      {row.status === 'ACTIVE' ? (
                        <button
                          className="px-space-md py-1 bg-surface-card border border-alert-tamper-border text-alert-tamper hover:bg-alert-tamper-bg font-headline-sm text-headline-sm rounded transition-colors text-xs cursor-pointer"
                          type="button"
                          onClick={() => handleRevokeRow(row.id, row.name)}
                        >
                          Revoke Access
                        </button>
                      ) : (
                        <button
                          className="px-space-md py-1 bg-surface-card border border-border-strong text-text-primary hover:bg-surface-nested font-headline-sm text-headline-sm rounded transition-colors text-xs cursor-pointer"
                          type="button"
                          onClick={() => {
                            setInstitutionInput(row.address);
                            showToast('Selected', 'Address selected for re-authorization.');
                          }}
                        >
                          Re-authorize
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Real-Time Access Audit Trail Log */}
        <section className="bg-surface-card rounded-lg shadow-sm p-space-lg flex flex-col gap-space-md border border-border-grid">
          <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-border-grid pb-space-sm">
            <div className="flex items-center gap-space-sm">
              <div className="w-2 h-2 rounded-full bg-status-verified animate-ping" />
              <h3 className="font-headline-md text-headline-md text-text-primary">
                Live Smart Contract Event Stream
              </h3>
              <span className="font-code-hash text-code-hash text-text-muted text-xs">
                hasAccess(patient, msg.sender) verification logs
              </span>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm text-text-muted">
              <span>MST Testnet RPC :4731</span>
              <button
                className="hover:text-text-primary flex items-center gap-1 cursor-pointer"
                type="button"
                onClick={() => setStreamPaused(!streamPaused)}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {streamPaused ? 'play_arrow' : 'pause_circle'}
                </span>
                <span>{streamPaused ? 'Resume Stream' : 'Pause Stream'}</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-nested p-space-md rounded font-code-hash text-code-hash text-xs flex flex-col gap-2 overflow-y-auto max-h-48 border border-border-grid">
            {streamFeed.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between py-1 border-b border-border-grid/50 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">{item.time}</span>
                  <span className={item.status === 'REVOKED' || item.status === 'BLOCKED' ? 'text-alert-tamper font-medium' : 'text-status-verified font-medium'}>
                    Event: {item.type}
                  </span>
                  <span className="text-text-secondary">{item.details}</span>
                </div>
                <span className="text-text-muted">{item.tx}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-text-muted font-label-sm text-label-sm">
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>Cryptographic access gating validated on MST Testnet smart contract state.</span>
            </div>
            <span>Consensus Latency: 420ms</span>
          </div>
        </section>
      </div>

      {/* Notification Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-on-primary px-space-md py-space-sm rounded shadow-lg flex items-center gap-space-sm transition-all border border-border-strong animate-in fade-in">
          <span className="material-symbols-outlined text-[20px] text-status-verified">check_circle</span>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm">{toast.title}</span>
            <span className="font-body-sm text-body-sm opacity-80">{toast.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
