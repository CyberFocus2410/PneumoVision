"""
Integration tests for Blockchain Patient Records & Consent-Gated Access Control.
Verifies:
1. /analyze generates/accepts patientId and commits verifiable on-chain diagnosis record.
2. Unauthorized reader rejected with 403 Forbidden.
3. Access granted enables record reading.
4. Access revoked blocks reader.
5. Tamper detection: altered off-chain payload generates cryptographic mismatch alert.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.blockchain.client import get_blockchain_client
from backend.blockchain.store import (
    load_offchain_record,
    save_offchain_record,
    compute_content_hash,
    verify_record_integrity
)

client = TestClient(app)


def test_analyze_creates_onchain_record():
    """Verifies that /analyze outputs patient_id, tx_hash, and verifiable on-chain record."""
    patient_id = "PATIENT_E2E_TEST_99"
    response = client.post(
        "/v1/analyze",
        data={"sample_id": "sample_pneumonia", "patient_id": patient_id}
    )
    assert response.status_code == 200
    data = response.json()

    assert "patient_id" in data
    assert data["patient_id"] == patient_id
    assert "blockchain_tx_hash" in data
    assert data["blockchain_tx_hash"] is not None
    assert "content_hash" in data
    assert "off_chain_ref" in data
    assert data.get("blockchain_status") == "COMMITTED"

    # Verify off-chain storage
    offchain_data = load_offchain_record(data["off_chain_ref"])
    assert offchain_data is not None
    assert offchain_data["case_id"] == data["case_id"]
    assert offchain_data["primary_finding"] == data["primary_finding"]

    # Verify cryptographic integrity
    audit = verify_record_integrity(data["content_hash"], data["off_chain_ref"])
    assert audit["is_valid"] is True
    assert audit["tamper_detected"] is False


def test_unauthorized_reader_rejected():
    """Verifies that an ungranted hospital/doctor address is rejected with 403 Forbidden."""
    bc_client = get_blockchain_client()
    patient_id = "PATIENT_CONSENT_TEST_01"

    # 1. Add a record for patient
    res = client.post(
        "/v1/analyze",
        data={"sample_id": "sample_normal", "patient_id": patient_id}
    )
    assert res.status_code == 200

    # 2. Attempt to read with unauthorized third-party address
    unauthorized_address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    read_res = client.get(f"/v1/records/{patient_id}?caller_address={unauthorized_address}")
    
    assert read_res.status_code == 403
    assert "Access Denied" in read_res.json()["detail"]


def test_consent_grant_and_revoke_workflow():
    """Verifies granting and revoking access dynamically updates read permissions."""
    bc_client = get_blockchain_client()
    patient_id = "PATIENT_CONSENT_LIFECYCLE_02"
    hospital_address = bc_client.accounts[4] if len(bc_client.accounts) > 4 else "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"

    # 1. Analyze case

    client.post(
        "/v1/analyze",
        data={"sample_id": "sample_pneumonia", "patient_id": patient_id}
    )

    # 2. Initial read as hospital -> 403
    res_before = client.get(f"/v1/records/{patient_id}?caller_address={hospital_address}")
    assert res_before.status_code == 403

    # 3. Patient grants consent
    grant_res = client.post(
        "/v1/consent/grant",
        json={"patient_id": patient_id, "provider_address": hospital_address}
    )
    assert grant_res.status_code == 200
    assert grant_res.json()["status"] == "success"

    # 4. Hospital reads records -> 200
    res_after_grant = client.get(f"/v1/records/{patient_id}?caller_address={hospital_address}")
    assert res_after_grant.status_code == 200
    data = res_after_grant.json()
    assert data["total_records"] >= 1
    assert data["tamper_detected"] is False

    # 5. Patient revokes consent
    revoke_res = client.post(
        "/v1/consent/revoke",
        json={"patient_id": patient_id, "provider_address": hospital_address}
    )
    assert revoke_res.status_code == 200

    # 6. Hospital reads records again -> 403
    res_after_revoke = client.get(f"/v1/records/{patient_id}?caller_address={hospital_address}")
    assert res_after_revoke.status_code == 403


def test_tamper_detection_on_hash_mismatch():
    """Verifies that modifying off-chain record data produces an explicit tamper alert."""
    patient_id = "PATIENT_TAMPER_TEST_03"
    
    # 1. Analyze and commit on-chain
    res = client.post(
        "/v1/analyze",
        data={"sample_id": "sample_pneumonia", "patient_id": patient_id}
    )
    assert res.status_code == 200
    data = res.json()
    ref = data["off_chain_ref"]

    # 2. Tamper with off-chain payload in DB (simulating malicious database modification)
    offchain_data = load_offchain_record(ref)
    assert offchain_data is not None
    offchain_data["primary_finding"] = "MALICIOUSLY_ALTERED_FINDING"
    offchain_data["tampered"] = True
    save_offchain_record(ref, offchain_data)

    # 3. Read records via API as patient
    read_res = client.get(f"/v1/records/{patient_id}")
    assert read_res.status_code == 200
    read_data = read_res.json()

    assert read_data["tamper_detected"] is True
    assert read_data["tamper_warnings"] is not None
    assert len(read_data["tamper_warnings"]) >= 1
    assert "Tamper detected" in read_data["tamper_warnings"][0]

    record = read_data["records"][0]
    assert record["integrity_valid"] is False
    assert record["tamper_detected"] is True
    assert record["tamper_warning"] is not None
