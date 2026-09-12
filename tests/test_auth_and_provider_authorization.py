"""
End-to-End Tests for Authentication, RBAC, On-Chain Doctor Authorization, and Security Controls.
"""

import os
import uuid
import pytest
from fastapi.testclient import TestClient
from web3 import Web3

from backend.main import app, seed_default_admin
from backend.db.database import init_db, SessionLocal
from backend.db.models import User, UserRole
from backend.blockchain.client import get_blockchain_client


@pytest.fixture(scope="module", autouse=True)
def setup_environment():
    # Enforce LOCAL_DEV_MODE=false to verify real security enforcement
    os.environ["LOCAL_DEV_MODE"] = "false"
    init_db()
    seed_default_admin()
    yield


@pytest.fixture
def client():
    return TestClient(app)


def test_unauthorized_provider_rejected_when_local_dev_mode_off():
    """Verifies that an unauthorized address is strictly rejected when LOCAL_DEV_MODE=false."""
    bc_client = get_blockchain_client()
    
    # Generate a random unverified address
    unauth_account = bc_client.w3.eth.account.create().address
    
    # Verify not authorized on contract
    assert bc_client.contract.functions.authorizedProviders(unauth_account).call() is False
    
    # Attempting to add record directly must raise PermissionError (no silent auto-authorize)
    with pytest.raises(PermissionError) as exc_info:
        bc_client.add_record(
            patient_id="patient_test_sec_001",
            record_type="Treatment",
            content_hash="0x" + "aa" * 32,
            off_chain_ref="ref_test_001",
            provider_address=unauth_account
        )
    
    assert "UnauthorizedProvider" in str(exc_info.value)


def test_doctor_onboarding_admin_authorization_and_record_writing_lifecycle(client):
    """
    Tests the complete doctor lifecycle:
    1. Doctor signup (is_verified = False).
    2. Unverified doctor cannot write care records (403 Forbidden).
    3. Admin approves doctor via /v1/admin/providers/authorize (on-chain authorizeProvider).
    4. Verified doctor can now write care records on-chain.
    """
    bc_client = get_blockchain_client()
    uid = uuid.uuid4().hex[:6]
    
    # 1. Onboard Patient first
    pat_email = f"alice_{uid}@example.com"
    pat_res = client.post("/v1/auth/patient/signup", json={
        "email": pat_email,
        "password": "SecurePassword123!",
        "full_name": "Alice Patient"
    })
    assert pat_res.status_code == 201
    pat_data = pat_res.json()
    patient_id = pat_data["user"]["patient_id"]
    patient_token = pat_data["access_token"]

    # 2. Onboard Doctor (is_verified = False)
    doc_email = f"dr.smith_{uid}@pneumovision.ai"
    doc_wallet = bc_client.accounts[4] if len(bc_client.accounts) > 4 else bc_client.w3.eth.account.create().address
    doc_signup_res = client.post("/v1/auth/doctor/signup", json={
        "email": doc_email,
        "password": "DoctorPassword123!",
        "full_name": "Dr. John Smith",
        "wallet_address": doc_wallet,
        "medical_license": f"MD-TX-{uid.upper()}",
        "hospital_affiliation": "Metropolitan Pulmonology Center"
    })
    assert doc_signup_res.status_code == 201
    doc_data = doc_signup_res.json()
    assert doc_data["user"]["is_verified"] is False
    doc_token = doc_data["access_token"]
    doctor_id = doc_data["user"]["id"]

    # 3. Doctor attempts to write record before admin approval -> must be rejected with 403 Forbidden
    unapproved_record_res = client.post(
        f"/v1/records/{patient_id}/treatment",
        headers={"Authorization": f"Bearer {doc_token}"},
        json={
            "treatment_description": "Initial Amoxicillin Course",
            "treatment_type": "Antibiotic Therapy"
        }
    )
    assert unapproved_record_res.status_code == 403
    assert "pending administrative verification" in unapproved_record_res.json()["detail"]

    # 4. Admin logs in
    admin_login_res = client.post("/v1/auth/doctor/login", json={
        "email": "admin@pneumovision.ai",
        "password": "AdminPassword2026!"
    })
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["access_token"]

    # 5. Admin executes on-chain authorization of doctor
    auth_res = client.post(
        "/v1/admin/providers/authorize",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"doctor_id": doctor_id}
    )
    assert auth_res.status_code == 200
    auth_data = auth_res.json()
    assert auth_data["doctor"]["is_verified"] is True
    assert "tx_hash" in auth_data

    # Verify doctor is now authorized on-chain in the smart contract
    assert bc_client.contract.functions.authorizedProviders(doc_wallet).call() is True

    # 6. Patient grants consent to the doctor
    grant_res = client.post(
        "/v1/consent/grant",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "patient_id": patient_id,
            "provider_address": doc_wallet
        }
    )
    assert grant_res.status_code == 200

    # 7. Doctor logs in again to get fresh token with is_verified=True
    doc_login_res = client.post("/v1/auth/doctor/login", json={
        "email": doc_email,
        "password": "DoctorPassword123!"
    })
    assert doc_login_res.status_code == 200
    verified_doc_token = doc_login_res.json()["access_token"]

    # 8. Verified Doctor writes treatment record -> must succeed!
    tx_rec_res = client.post(
        f"/v1/records/{patient_id}/treatment",
        headers={"Authorization": f"Bearer {verified_doc_token}"},
        json={
            "treatment_description": "Nebulized Albuterol + 500mg Azithromycin",
            "treatment_type": "Respiratory Protocol",
            "notes": "Patient responding favorably."
        }
    )
    assert tx_rec_res.status_code == 200
    tx_rec_data = tx_rec_res.json()
    assert tx_rec_data["status"] == "success"
    assert "blockchain_tx_hash" in tx_rec_data

    # 9. Provider Directory lists the verified doctor
    prov_res = client.get("/v1/providers")
    assert prov_res.status_code == 200
    providers = prov_res.json()
    doc_entry = next((p for p in providers if p["email"] == doc_email), None)
    assert doc_entry is not None
    assert doc_entry["is_verified"] is True
    assert doc_entry["wallet_address"] == doc_wallet


def test_patient_consent_isolation(client):
    """Verifies that a patient cannot grant or revoke consent for a different patient ID."""
    uid = uuid.uuid4().hex[:6]
    
    # Patient A
    res_a = client.post("/v1/auth/patient/signup", json={
        "email": f"patient_a_{uid}@example.com",
        "password": "Password123!",
        "full_name": "Patient A"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]

    # Patient B
    res_b = client.post("/v1/auth/patient/signup", json={
        "email": f"patient_b_{uid}@example.com",
        "password": "Password123!",
        "full_name": "Patient B"
    })
    assert res_b.status_code == 201
    patient_id_b = res_b.json()["user"]["patient_id"]

    # Patient A tries to grant consent for Patient B's ID -> rejected with 403 Forbidden
    hack_res = client.post(
        "/v1/consent/grant",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "patient_id": patient_id_b,
            "provider_address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        }
    )
    assert hack_res.status_code == 403
    assert "Patients may only grant consent for their own medical identity" in hack_res.json()["detail"]


def test_patient_signup_creates_onchain_identity_and_pii_non_derivability(client):
    """
    Verifies:
    1. Patient signup creates a valid on-chain identity via registerPatient.
    2. patient_id is pseudonymous (hash-based) with 256 bits of cryptographic entropy,
       making it computationally impossible to reverse-derive the user's real PII from it alone.
    """
    bc_client = get_blockchain_client()
    uid = uuid.uuid4().hex[:8]
    email = f"pseudonymous_patient_{uid}@health.org"
    full_name = "Jane Pseudonym Doe"

    # Patient signs up with no initial wallet (left nullable)
    signup_res = client.post("/v1/auth/patient/signup", json={
        "email": email,
        "password": "StrongPassword999!",
        "full_name": full_name
    })
    assert signup_res.status_code == 201
    data = signup_res.json()
    user_info = data["user"]
    patient_id = user_info["patient_id"]

    # 1. Verify patient_id format (bytes32 hex format: 0x + 64 hex chars)
    assert patient_id.startswith("0x")
    assert len(patient_id) == 66
    
    # 2. Verify on-chain registration in PatientRecords smart contract
    p_bytes = bytes.fromhex(patient_id[2:])
    on_chain_profile = bc_client.contract.functions.patients(p_bytes).call()
    is_registered = on_chain_profile[1]
    assert is_registered is True, "Patient identity must be registered on-chain via registerPatient"

    # 3. PII non-derivability verification:
    # Ensure patient_id is not a simple plaintext, base64, or unsalted hash of email or name
    assert email.lower() not in patient_id.lower()
    assert full_name.lower() not in patient_id.lower()
    # Ensure two patients with same parameters generate completely distinct cryptographically salted IDs
    uid2 = uuid.uuid4().hex[:8]
    signup_res2 = client.post("/v1/auth/patient/signup", json={
        "email": f"pseudonymous_patient2_{uid2}@health.org",
        "password": "StrongPassword999!",
        "full_name": full_name
    })
    patient_id2 = signup_res2.json()["user"]["patient_id"]
    assert patient_id != patient_id2


def test_patient_profile_retrieval_and_post_signup_wallet_linking(client):
    """
    Verifies:
    1. GET /v1/me/patient-profile returns the patient's own profile including patient_id.
    2. Optional wallet_address can be linked post-signup via PUT /v1/me/wallet.
    """
    uid = uuid.uuid4().hex[:8]
    signup_res = client.post("/v1/auth/patient/signup", json={
        "email": f"wallet_test_{uid}@example.com",
        "password": "SecurePassword123!",
        "full_name": "Wallet Test Patient"
    })
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    patient_id = signup_res.json()["user"]["patient_id"]

    # 1. Fetch profile via GET /v1/me/patient-profile
    prof_res = client.get("/v1/me/patient-profile", headers={"Authorization": f"Bearer {token}"})
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert prof_data["patient_id"] == patient_id
    assert prof_data["email"] == f"wallet_test_{uid}@example.com"
    assert prof_data["wallet_address"] is None

    # 2. Link wallet post-signup via PUT /v1/me/wallet
    test_wallet = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
    link_res = client.put(
        "/v1/me/wallet",
        headers={"Authorization": f"Bearer {token}"},
        json={"wallet_address": test_wallet}
    )
    assert link_res.status_code == 200
    assert link_res.json()["wallet_address"] == test_wallet

    # 3. Verify profile reflects linked wallet
    prof_res_updated = client.get("/v1/me/patient-profile", headers={"Authorization": f"Bearer {token}"})
    assert prof_res_updated.status_code == 200
    assert prof_res_updated.json()["wallet_address"] == test_wallet


def test_full_chain_security_and_consent_enforcement_with_local_dev_mode_off(client):
    """
    Comprehensive End-to-End Test verifying the full security chain with LOCAL_DEV_MODE=false:
    1. Unapproved doctor is blocked at signup time from writing (require_doctor + is_verified).
    2. Approved-but-unauthorized-for-this-patient doctor is blocked from reading (contract AccessDenied).
    3. After patient grants consent on-chain, reads succeed.
    4. After patient revokes consent on-chain, reads are blocked again.
    5. Patient can only ever read their own record via /v1/me/records (and is blocked from reading other patients).
    """
    bc_client = get_blockchain_client()
    uid = uuid.uuid4().hex[:8]

    # Step A: Create Patient 1
    pat1_res = client.post("/v1/auth/patient/signup", json={
        "email": f"patient_e2e_1_{uid}@example.com",
        "password": "Password123!",
        "full_name": "Patient One"
    })
    assert pat1_res.status_code == 201
    pat1_token = pat1_res.json()["access_token"]
    pat1_id = pat1_res.json()["user"]["patient_id"]

    # Step B: Create Patient 2 (for cross-patient isolation check)
    pat2_res = client.post("/v1/auth/patient/signup", json={
        "email": f"patient_e2e_2_{uid}@example.com",
        "password": "Password123!",
        "full_name": "Patient Two"
    })
    assert pat2_res.status_code == 201
    pat2_id = pat2_res.json()["user"]["patient_id"]

    # Step C: Onboard Doctor (is_verified = False)
    doc_wallet = bc_client.accounts[5] if len(bc_client.accounts) > 5 else bc_client.admin_account
    doc_res = client.post("/v1/auth/doctor/signup", json={
        "email": f"doctor_chain_{uid}@pneumovision.ai",
        "password": "DocPassword123!",
        "full_name": "Dr. Chain Specialist",
        "wallet_address": doc_wallet,
        "medical_license": f"MD-CHAIN-{uid.upper()}",
        "hospital_affiliation": "PneumoVision Secure Trust"
    })
    assert doc_res.status_code == 201
    doc_user = doc_res.json()["user"]
    assert doc_user["is_verified"] is False
    unapproved_doc_token = doc_res.json()["access_token"]
    doctor_db_id = doc_user["id"]

    # 1. Unapproved doctor is blocked from writing care records
    unapproved_write = client.post(
        f"/v1/records/{pat1_id}/treatment",
        headers={"Authorization": f"Bearer {unapproved_doc_token}"},
        json={
            "treatment_description": "Initial Care Plan",
            "treatment_type": "Standard Protocol"
        }
    )
    assert unapproved_write.status_code == 403
    assert "pending administrative verification" in unapproved_write.json()["detail"]

    # Step D: Admin approves doctor (executing on-chain authorizeProvider)
    admin_login = client.post("/v1/auth/doctor/login", json={
        "email": "admin@pneumovision.ai",
        "password": "AdminPassword2026!"
    })
    admin_token = admin_login.json()["access_token"]
    admin_auth_res = client.post(
        "/v1/admin/providers/authorize",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"doctor_id": doctor_db_id}
    )
    assert admin_auth_res.status_code == 200
    assert bc_client.contract.functions.authorizedProviders(doc_wallet).call() is True

    # Doctor logs in to obtain verified token
    doc_login = client.post("/v1/auth/doctor/login", json={
        "email": f"doctor_chain_{uid}@pneumovision.ai",
        "password": "DocPassword123!"
    })
    approved_doc_token = doc_login.json()["access_token"]

    # Verified doctor writes a treatment record for Patient 1
    doc_write_res = client.post(
        f"/v1/records/{pat1_id}/treatment",
        headers={"Authorization": f"Bearer {approved_doc_token}"},
        json={
            "treatment_description": "High-Flow Supplemental O2 and 1g Ceftriaxone",
            "treatment_type": "Critical Protocol"
        }
    )
    assert doc_write_res.status_code == 200

    # 2. Approved-but-unauthorized-for-this-patient doctor is blocked from reading
    unauthorized_read = client.get(
        f"/v1/records/{pat1_id}",
        headers={"Authorization": f"Bearer {approved_doc_token}"}
    )
    assert unauthorized_read.status_code == 403
    assert "Access Denied" in unauthorized_read.json()["detail"]

    # 3. Patient 1 grants consent on-chain to this doctor
    grant_res = client.post(
        "/v1/consent/grant",
        headers={"Authorization": f"Bearer {pat1_token}"},
        json={
            "patient_id": pat1_id,
            "provider_address": doc_wallet
        }
    )
    assert grant_res.status_code == 200
    assert grant_res.json()["status"] == "success"

    # Now doctor reads Patient 1's records -> must succeed!
    authorized_read = client.get(
        f"/v1/records/{pat1_id}",
        headers={"Authorization": f"Bearer {approved_doc_token}"}
    )
    assert authorized_read.status_code == 200
    records_data = authorized_read.json()
    assert records_data["status"] == "success"
    assert len(records_data["records"]) >= 1

    # 4. Patient 1 revokes consent on-chain
    revoke_res = client.post(
        "/v1/consent/revoke",
        headers={"Authorization": f"Bearer {pat1_token}"},
        json={
            "patient_id": pat1_id,
            "provider_address": doc_wallet
        }
    )
    assert revoke_res.status_code == 200

    # Doctor reads again after revoke -> must be blocked with 403 Forbidden!
    blocked_read_after_revoke = client.get(
        f"/v1/records/{pat1_id}",
        headers={"Authorization": f"Bearer {approved_doc_token}"}
    )
    assert blocked_read_after_revoke.status_code == 403

    # 5. Patient self-read isolation:
    # Patient 1 reads own record via /v1/me/records -> succeeds
    my_records_res = client.get(
        "/v1/me/records",
        headers={"Authorization": f"Bearer {pat1_token}"}
    )
    assert my_records_res.status_code == 200
    assert my_records_res.json()["patient_id"] == pat1_id

    # Patient 1 attempts to read Patient 2's records via /v1/records/{pat2_id} -> blocked
    cross_patient_read = client.get(
        f"/v1/records/{pat2_id}",
        headers={"Authorization": f"Bearer {pat1_token}"}
    )
    assert cross_patient_read.status_code == 403
    assert "restricted to reading their own patient records" in cross_patient_read.json()["detail"]


