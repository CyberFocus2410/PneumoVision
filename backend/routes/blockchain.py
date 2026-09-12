"""
Blockchain Consent & Medical Records Access Routes.
Provides endpoints for:
- POST /v1/consent/grant : Grant medical access to a doctor/hospital
- POST /v1/consent/revoke : Revoke medical access
- GET /v1/records/{patient_id} : Consent-gated record retrieval with cryptographic tamper-evidence verification
"""

from fastapi import APIRouter, HTTPException, Query, Body, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from backend.blockchain.client import get_blockchain_client, to_hex_bytes32
from backend.blockchain.store import verify_record_integrity, load_offchain_record

router = APIRouter(prefix="/v1", tags=["Blockchain & Consent"])


class ConsentRequest(BaseModel):
    patient_id: str = Field(..., description="Pseudonymous patient identifier")
    provider_address: str = Field(..., description="Ethereum address of hospital or doctor")
    caller_address: Optional[str] = Field(None, description="Wallet address of the patient (defaults to registered owner)")


@router.post("/consent/grant")
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


@router.get("/records/{patient_id}")
async def get_patient_records(
    patient_id: str,
    caller_address: Optional[str] = Query(None, description="Ethereum address of the caller requesting access")
):
    """
    Retrieves all on-chain medical records for a patient and verifies cryptographic integrity against off-chain payloads.
    Reverts with 403 Forbidden if the caller has not been granted consent by the patient.
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
                "clinical_payload": audit.get("payload")
            })

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
