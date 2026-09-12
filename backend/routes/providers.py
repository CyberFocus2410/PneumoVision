"""
Provider Directory & Admin Authorization Routes
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from web3 import Web3

from backend.db.database import get_db
from backend.db.models import User, UserRole
from backend.auth.deps import require_admin
from backend.blockchain.client import get_blockchain_client

router = APIRouter(tags=["Healthcare Providers & Administration"])


class AuthorizeProviderRequest(BaseModel):
    doctor_id: Optional[int] = Field(None, description="Database User ID of the doctor")
    doctor_email: Optional[str] = Field(None, description="Email address of the doctor")
    provider_address: Optional[str] = Field(None, description="Doctor's Ethereum wallet address")
    provider_name: Optional[str] = Field(None, description="Name or affiliation for on-chain identity")


class ProviderItem(BaseModel):
    id: int
    full_name: str
    email: str
    wallet_address: str
    medical_license: Optional[str]
    hospital_affiliation: Optional[str]
    is_verified: bool


@router.post("/v1/admin/providers/authorize", status_code=status.HTTP_200_OK)
async def authorize_provider(
    payload: AuthorizeProviderRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrative endpoint to approve a doctor account and execute on-chain authorizeProvider transaction.
    This is the authorized path to register healthcare providers on-chain.
    """
    # 1. Locate Doctor in DB
    query = db.query(User).filter(User.role == UserRole.DOCTOR.value)
    if payload.doctor_id:
        doctor = query.filter(User.id == payload.doctor_id).first()
    elif payload.doctor_email:
        doctor = query.filter(User.email == payload.doctor_email).first()
    elif payload.provider_address:
        wallet = Web3.to_checksum_address(payload.provider_address)
        doctor = query.filter(User.wallet_address == wallet).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide doctor_id, doctor_email, or provider_address."
        )

    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor account not found."
        )

    # 2. Call on-chain authorizeProvider via Smart Contract Owner account
    client = get_blockchain_client()
    provider_name = payload.provider_name or f"Dr. {doctor.full_name} ({doctor.hospital_affiliation or 'Verified Physician'})"
    
    try:
        tx_hash = client.authorize_provider(
            provider_address=doctor.wallet_address,
            name=provider_name,
            caller=client.admin_account
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"On-chain authorizeProvider transaction failed: {str(e)}"
        )

    # 3. Update DB Verification Status
    doctor.is_verified = True
    db.commit()
    db.refresh(doctor)

    return {
        "status": "success",
        "action": "PROVIDER_AUTHORIZED_ON_CHAIN",
        "doctor": doctor.to_dict(),
        "tx_hash": tx_hash,
        "contract_address": client.contract_address
    }


@router.get("/v1/providers", response_model=List[ProviderItem])
async def list_verified_providers(db: Session = Depends(get_db)):
    """
    Returns directory of verified doctors and hospitals.
    Allows patients and staff to select verified providers without typing raw hex addresses.
    """
    doctors = db.query(User).filter(
        User.role == UserRole.DOCTOR.value,
        User.is_verified == True  # noqa: E712
    ).all()

    return [
        ProviderItem(
            id=doc.id,
            full_name=doc.full_name,
            email=doc.email,
            wallet_address=doc.wallet_address,
            medical_license=doc.medical_license,
            hospital_affiliation=doc.hospital_affiliation,
            is_verified=doc.is_verified
        )
        for doc in doctors
    ]
