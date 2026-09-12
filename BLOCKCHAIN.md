# PneumoVision Blockchain Patient Records & Consent Layer

> **⚠️ RESEARCH & DEMONSTRATION PROTOTYPE ONLY**  
> This smart contract and blockchain client are designed exclusively as an **in-process research demonstration** running on a **local Hardhat network**. It is **not** audited, **not** hardened for production, and **not** intended to process real Protected Health Information (PHI) or Personally Identifiable Information (PII).

---

## 1. Architecture Overview

PneumoVision uses a **hybrid off-chain / on-chain architecture**:
- **Medical & Clinical Payloads Remain Off-Chain**: Full radiograph reports, Grad-CAM heatmaps, DICOM metadata, prescription details, and outcome records are stored in the secure local backend database (`data/records_db/`).
- **Cryptographic Hashes & URIs Committed On-Chain**: Only deterministic cryptographic digests (**Keccak-256**) and storage resource identifiers (`offChainRef`) are written to the Ethereum smart contract (`PatientRecords.sol`).
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
|                           LOCAL HARDHAT ETHEREUM NODE                             |
|                                                                                   |
|  PatientRecords.sol:                                                              |
|   ├── registerPatient(bytes32 patientId)                                          |
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

## 4. Prototype Scope, Security, and Production Disclaimers

### ⚠️ Demonstration & Educational Environment
- This implementation runs against a local ephemeral Hardhat RPC node (`http://127.0.0.1:8545`).
- It does **not** connect to Ethereum Mainnet or public testnets (e.g., Sepolia).

### 🔑 Identity & Key Management Simplifications
- Wallet addresses and signing keys are derived from local Hardhat test accounts.
- This is a simplified stand-in for real-world cryptographic identity standards (such as Decentralized Identifiers [DIDs], Verifiable Credentials [VCs], HSMs, or WebAuthn/ERC-4337 smart contract accounts).

### 🛡️ Absence of Formal Security Audit
- Neither `PatientRecords.sol` nor `backend/blockchain/client.py` has undergone formal third-party cryptographic, smart-contract, or smart-contract audit.
- Do not use this codebase for handling real financial assets or production healthcare infrastructures.

### ⚖️ Legal, Ethical, and Regulatory Compliance
- Any production deployment involving patient health records requires extensive legal and regulatory review under **HIPAA (Health Insurance Portability and Accountability Act)**, **GDPR (General Data Protection Regulation)**, and jurisdictional health data governance frameworks.
- On-chain storage of personal data, even in pseudonymized or hashed format, may carry GDPR "Right to be Forgotten" (Article 17) compliance considerations that require off-chain cryptographic erasure techniques.

---

## 5. Local Hardhat Quickstart

```bash
# 1. Start local Hardhat node
npx hardhat node

# 2. Deploy PatientRecords contract
npx hardhat run blockchain/scripts/deploy.js --network localhost

# 3. Run blockchain integration test suite
pytest tests/test_blockchain_records.py -v
```
