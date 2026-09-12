"""
Blockchain Consent & Medical Records Care Timeline Access Routes.
Provides endpoints for:
- POST /v1/consent/grant : Grant medical access to a doctor/hospital
- POST /v1/consent/revoke : Revoke medical access
- POST /v1/records/{patient_id}/treatment : Commit hash-verified treatment record
- POST /v1/records/{patient_id}/medication : Commit hash-verified medication record
- POST /v1/records/{patient_id}/outcome : Commit hash-verified outcome/reaction record
- GET /v1/records/{patient_id} : Full chronological, hash-verified history across all record types
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body, status
from pydantic import BaseModel, Field

from backend.blockchain.client import get_blockchain_client, to_hex_bytes32
from backend.blockchain.store import (
    verify_record_integrity,
    load_offchain_record,
    save_offchain_record,
    compute_content_hash,
)

router = APIRouter(tags=["Blockchain & Care Timeline"])


class ConsentRequest(BaseModel):
    patient_id: str = Field(..., description="Pseudonymous patient identifier")
    provider_address: str = Field(..., description="Ethereum address of hospital or doctor")
    caller_address: Optional[str] = Field(None, description="Wallet address of the patient (defaults to registered owner)")


class TreatmentRecordRequest(BaseModel):
    treatment_description: str = Field(..., description="Description of treatment or clinical protocol administered")
    diagnosis_ref: Optional[str] = Field(None, description="Linked Diagnosis record reference or case ID")
    treatment_type: Optional[str] = Field("Clinical Protocol", description="Category or modality of treatment")
    provider_address: Optional[str] = Field(None, description="Provider Ethereum address executing the record")
    notes: Optional[str] = Field(None, description="Clinical notes and observations")


class MedicationRecordRequest(BaseModel):
    medicine_name: str = Field(..., description="Name of prescribed medication")
    dosage: str = Field(..., description="Prescribed dosage (e.g. 500mg, 10ml)")
    duration: str = Field(..., description="Duration of medication course (e.g. 7 days, 2 weeks)")
    diagnosis_ref: Optional[str] = Field(None, description="Linked Diagnosis record reference")
    treatment_ref: Optional[str] = Field(None, description="Linked Treatment record reference")
    frequency: Optional[str] = Field("Twice daily", description="Dosing frequency instructions")
    instructions: Optional[str] = Field(None, description="Special administration instructions")
    provider_address: Optional[str] = Field(None, description="Prescribing provider address")


class OutcomeRecordRequest(BaseModel):
    outcome_description: str = Field(..., description="Clinical outcome, recovery status, or adverse reaction description")
    time_to_response: str = Field(..., description="Observed time to clinical response (e.g. 48 hours, 5 days)")
    treatment_ref: Optional[str] = Field(None, description="Linked Treatment record reference")
    medication_ref: Optional[str] = Field(None, description="Linked Medication record reference")
    patient_status: Optional[str] = Field("Recovered", description="Overall patient recovery status")
    notes: Optional[str] = Field(None, description="Follow-up notes or response telemetry")
    provider_address: Optional[str] = Field(None, description="Assessing provider address")


@router.post("/consent/grant")
@router.post("/v1/consent/grant")
async def grant_consent(payload: ConsentRequest):
    """
    Grants record viewing consent to a designated healthcare provider or hospital address.
    Callable only by the patient's registered wallet.
    """
    try:
        client = get_blockchain_client()
        result = client.grant_access(
            patient_id=payload.patient_id,
            hospital_or_doctor=payload.provider_address,
            patient_address=payload.caller_address
        )
        return {
            "status": "success",
            "action": "CONSENT_GRANTED",
            "patient_id": payload.patient_id,
            "provider_address": payload.provider_address,
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"]
        }
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Grant consent failed: {str(e)}")


@router.post("/consent/revoke")
@router.post("/v1/consent/revoke")
async def revoke_consent(payload: ConsentRequest):
    """
    Revokes record viewing consent from a healthcare provider or hospital address.
    Callable only by the patient's registered wallet.
    """
    try:
        client = get_blockchain_client()
        result = client.revoke_access(
            patient_id=payload.patient_id,
            hospital_or_doctor=payload.provider_address,
            patient_address=payload.caller_address
        )
        return {
            "status": "success",
            "action": "CONSENT_REVOKED",
            "patient_id": payload.patient_id,
            "provider_address": payload.provider_address,
            "tx_hash": result["tx_hash"],
            "block_number": result["block_number"]
        }
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Revoke consent failed: {str(e)}")


@router.post("/records/{patient_id}/treatment")
@router.post("/v1/records/{patient_id}/treatment")
async def add_treatment_record(
    patient_id: str,
    payload: TreatmentRecordRequest
):
    """
    Commits a hash-verified Treatment record linked to a prior Diagnosis.
    """
    try:
        client = get_blockchain_client()
        treatment_id = f"treatment_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Structured off-chain payload with lineage linking
        record_payload = {
            "record_type": "Treatment",
            "treatment_id": treatment_id,
            "patient_id": patient_id,
            "treatment_description": payload.treatment_description,
            "treatment_type": payload.treatment_type,
            "diagnosis_ref": payload.diagnosis_ref,
            "notes": payload.notes,
            "timestamp": timestamp,
            "schema_version": "1.0"
        }

        # Store in off-chain database and compute cryptographic digest
        off_chain_ref = save_offchain_record(treatment_id, record_payload)
        content_hash = compute_content_hash(record_payload)

        # Commit on-chain with RecordType.Treatment
        receipt = client.add_record(
            patient_id=patient_id,
            record_type="Treatment",
            content_hash=content_hash,
            off_chain_ref=off_chain_ref,
            provider_address=payload.provider_address
        )

        return {
            "status": "success",
            "record_type": "Treatment",
            "patient_id": patient_id,
            "treatment_id": treatment_id,
            "diagnosis_ref": payload.diagnosis_ref,
            "blockchain_tx_hash": receipt["tx_hash"],
            "blockchain_record_id": receipt["record_id"],
            "content_hash": content_hash,
            "off_chain_ref": off_chain_ref,
            "details": record_payload
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record treatment: {str(e)}"
        )


@router.post("/records/{patient_id}/medication")
@router.post("/v1/records/{patient_id}/medication")
async def add_medication_record(
    patient_id: str,
    payload: MedicationRecordRequest
):
    """
    Commits a hash-verified Medication record linked to Diagnosis and Treatment.
    """
    try:
        client = get_blockchain_client()
        medication_id = f"med_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Structured off-chain payload with lineage linking
        record_payload = {
            "record_type": "Medication",
            "medication_id": medication_id,
            "patient_id": patient_id,
            "medicine_name": payload.medicine_name,
            "dosage": payload.dosage,
            "duration": payload.duration,
            "frequency": payload.frequency,
            "diagnosis_ref": payload.diagnosis_ref,
            "treatment_ref": payload.treatment_ref,
            "instructions": payload.instructions,
            "timestamp": timestamp,
            "schema_version": "1.0"
        }

        # Store in off-chain database and compute cryptographic digest
        off_chain_ref = save_offchain_record(medication_id, record_payload)
        content_hash = compute_content_hash(record_payload)

        # Commit on-chain with RecordType.Medication
        receipt = client.add_record(
            patient_id=patient_id,
            record_type="Medication",
            content_hash=content_hash,
            off_chain_ref=off_chain_ref,
            provider_address=payload.provider_address
        )

        return {
            "status": "success",
            "record_type": "Medication",
            "patient_id": patient_id,
            "medication_id": medication_id,
            "diagnosis_ref": payload.diagnosis_ref,
            "treatment_ref": payload.treatment_ref,
            "blockchain_tx_hash": receipt["tx_hash"],
            "blockchain_record_id": receipt["record_id"],
            "content_hash": content_hash,
            "off_chain_ref": off_chain_ref,
            "details": record_payload
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record medication: {str(e)}"
        )


@router.post("/records/{patient_id}/outcome")
@router.post("/v1/records/{patient_id}/outcome")
async def add_outcome_record(
    patient_id: str,
    payload: OutcomeRecordRequest
):
    """
    Commits a hash-verified Outcome/Reaction record linked to Treatment and Medication.
    """
    try:
        client = get_blockchain_client()
        outcome_id = f"outcome_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Structured off-chain payload with lineage linking
        record_payload = {
            "record_type": "Outcome",
            "outcome_id": outcome_id,
            "patient_id": patient_id,
            "outcome_description": payload.outcome_description,
            "time_to_response": payload.time_to_response,
            "treatment_ref": payload.treatment_ref,
            "medication_ref": payload.medication_ref,
            "patient_status": payload.patient_status,
            "notes": payload.notes,
            "timestamp": timestamp,
            "schema_version": "1.0"
        }

        # Store in off-chain database and compute cryptographic digest
        off_chain_ref = save_offchain_record(outcome_id, record_payload)
        content_hash = compute_content_hash(record_payload)

        # Commit on-chain with RecordType.Outcome
        receipt = client.add_record(
            patient_id=patient_id,
            record_type="Outcome",
            content_hash=content_hash,
            off_chain_ref=off_chain_ref,
            provider_address=payload.provider_address
        )

        return {
            "status": "success",
            "record_type": "Outcome",
            "patient_id": patient_id,
            "outcome_id": outcome_id,
            "treatment_ref": payload.treatment_ref,
            "medication_ref": payload.medication_ref,
            "blockchain_tx_hash": receipt["tx_hash"],
            "blockchain_record_id": receipt["record_id"],
            "content_hash": content_hash,
            "off_chain_ref": off_chain_ref,
            "details": record_payload
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record outcome: {str(e)}"
        )


@router.get("/records/{patient_id}")
@router.get("/v1/records/{patient_id}")
async def get_patient_records(
    patient_id: str,
    caller_address: Optional[str] = Query(None, description="Ethereum address of caller requesting access")
):
    """
    Retrieves full chronological, hash-verified care timeline across all record types
    (Diagnosis -> Treatment -> Medication -> Outcome) with lineage links and tamper warnings.
    Reverts with 403 Forbidden if caller has not been granted consent.
    """
    try:
        client = get_blockchain_client()
        resolved_caller = caller_address or client.default_patient

        # 1. Fetch on-chain record list (reverts on-chain if unauthorized)
        onchain_records = client.get_records(patient_id=patient_id, caller_address=resolved_caller)

        # 2. Verify cryptographic hash of each off-chain record
        verified_records = []
        any_tamper = False
        tamper_warnings = []

        for rec in onchain_records:
            audit = verify_record_integrity(
                on_chain_content_hash=rec["content_hash"],
                offchain_ref=rec["off_chain_ref"]
            )
            
            if audit["tamper_detected"]:
                any_tamper = True
                tamper_warnings.append(audit["tamper_warning"])

            payload = audit.get("payload") or {}
            
            # Extract lineage links from structured payload
            linked_diagnosis = payload.get("diagnosis_ref")
            linked_treatment = payload.get("treatment_ref")
            linked_medication = payload.get("medication_ref")

            verified_records.append({
                "record_id": rec["record_id"],
                "record_type": rec["record_type"],
                "on_chain_hash": rec["content_hash"],
                "off_chain_ref": rec["off_chain_ref"],
                "author_provider": rec["author_provider"],
                "timestamp": rec["timestamp"],
                "integrity_valid": audit["is_valid"],
                "tamper_detected": audit["tamper_detected"],
                "tamper_warning": audit.get("tamper_warning"),
                "linked_diagnosis_ref": linked_diagnosis,
                "linked_treatment_ref": linked_treatment,
                "linked_medication_ref": linked_medication,
                "clinical_payload": payload
            })

        # Sort chronologically by record_id / timestamp
        verified_records.sort(key=lambda r: (r["timestamp"], r["record_id"]))

        return {
            "status": "success",
            "patient_id": patient_id,
            "patient_hash": to_hex_bytes32(patient_id),
            "caller_address": resolved_caller,
            "total_records": len(verified_records),
            "tamper_detected": any_tamper,
            "tamper_warnings": tamper_warnings if any_tamper else None,
            "records": verified_records
        }

    except PermissionError as pe:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access Denied: Caller '{caller_address or 'Default'}' has not been granted consent to access records for patient '{patient_id}'."
        )
    except Exception as e:
        error_msg = str(e)
        if "AccessDenied" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: On-chain smart contract rejected access for caller '{caller_address}'."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve records: {error_msg}"
        )

