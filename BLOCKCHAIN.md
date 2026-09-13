# PneumoVision Blockchain Patient Records & Consent Layer

> **⚠️ RESEARCH & DEMONSTRATION PROTOTYPE ONLY**  
> This smart contract and blockchain client are designed exclusively as an **in-process research demonstration** running on a **local Hardhat network**. It is **not** audited, **not** hardened for production, and **not** intended to process real Protected Health Information (PHI) or Personally Identifiable Information (PII).

---

## 1. Architecture Overview

PneumoVision uses a **hybrid off-chain / on-chain architecture**:
- **Medical & Clinical Payloads Remain Off-Chain**: Full radiograph reports, Grad-CAM heatmaps, DICOM metadata, prescription details, and outcome records are stored in the secure local backend database (`data/records_db/`).
- **Cryptographic Hashes & URIs Committed On-Chain**: Only deterministic cryptographic digests (**Keccak-256**) and storage resource identifiers (`offChainRef`) are written to the MST Testnet smart contract (`PatientRecords.sol`).
- **Pseudonymous Patient Identity**: Patients are registered with pseudonymous bytes32 identity hashes (`patientId`), with zero raw PII exposed on-chain.

```
+-----------------------------------------------------------------------------------+
|                               PNEUMOVISION BACKEND                                |
|                                                                                   |
|  [Clinical Analysis / Care Timeline Entry]                                       |
|                    │                                                              |
|                    ▼                                                              |
|        [Canonical JSON Payload]                                                   |
|          │                  │                                                     |
|          ▼                  ▼                                                     |
|  [Local Off-Chain DB]   [Keccak-256 Hash]                                         |
|  (data/records_db/)         │                                                     |
+─────────────────────────────┼─────────────────────────────────────────────────────+
                              ▼
+───────────────────────────────────────────────────────────────────────────────────+
|                           MST TESTNET BLOCKCHAIN NODE                             |
|                                                                                   |
|  PatientRecords.sol (0x136E7f5c373065dE1E09Ec1D6258CF6e01A93Fb6):                 |
|   ├── registerPatient(bytes32 patientId)                                          |
|   ├── authorizeProvider(address provider, string name)                            |
|   ├── grantAccess(bytes32 patientId, address provider)                            |
|   ├── revokeAccess(bytes32 patientId, address provider)                           |
|   ├── addRecord(patientId, recordType, contentHash, offChainRef)                  |
|   └── getRecords(bytes32 patientId) ──► Reverts on Unauthorized Caller (403)      |
+───────────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Smart Contract Functionality (`contracts/PatientRecords.sol`)

1. **Patient Registration & Pseudonymity**:
   - `registerPatient(bytes32 patientId)` maps a pseudonymous identifier to the patient's wallet address.
2. **Consent-Gated Access Control**:
   - `grantAccess(bytes32 patientId, address hospitalOrDoctor)` allows the patient to authorize specific provider addresses.
   - `revokeAccess(bytes32 patientId, address hospitalOrDoctor)` revokes access immediately.
   - `getRecords(bytes32 patientId)` enforces caller access checks on-chain; reverts with custom `AccessDenied` if unauthorized.
3. **Immutability & Care Timeline**:
   - `addRecord(bytes32 patientId, RecordType recordType, bytes32 contentHash, string offChainRef)` records 4 lifecycle stages:
     - `RecordType.Diagnosis` (0)
     - `RecordType.Treatment` (1)
     - `RecordType.Medication` (2)
     - `RecordType.Outcome` (3)
4. **Lineage Linking**:
   - Off-chain payloads maintain explicit parent pointers (`diagnosis_ref`, `treatment_ref`, `medication_ref`) linking treatments to diagnoses and outcomes to treatments/medications.

---

## 3. Tamper Detection & Cryptographic Auditing

When records are retrieved via `/records/{patientId}`:
1. The backend reads the on-chain `contentHash` for each entry.
2. The off-chain JSON document is loaded from disk.
3. The Keccak-256 digest is deterministically recomputed.
4. If any byte in the off-chain payload has been altered or deleted, a **`SECURITY ALERT: Tamper detected!`** warning is returned and flagged in the UI.

---

## 4. Live MST Testnet Deployment
- **Network**: MST Testnet (Chain ID: `91562037`)
- **RPC Endpoint**: `https://testnetrpc.mstblockchain.com`
- **Active Smart Contract**: `0x136E7f5c373065dE1E09Ec1D6258CF6e01A93Fb6`
- **Verified Doctor / Provider Wallet**: `0xb3C09303335393D511F9eE1C7Bf4f1154904142b`
- **Block Explorer**: [https://testnet.mstscan.com](https://testnet.mstscan.com)

---

## 5. Security & Verification Suite

```bash
# 1. Run full authentication, RBAC, and on-chain authorization integration tests
pytest tests/test_auth_and_provider_authorization.py -v

# 2. Run tamper-evident care timeline and access control tests
pytest tests/test_blockchain_records.py -v
```
