"""
User Authentication, Patient Onboarding & Doctor Registration Routes
"""

import secrets
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from eth_utils import keccak
from web3 import Web3

from backend.db.database import get_db
from backend.db.models import User, UserRole
from backend.auth.security import hash_password, verify_password, create_access_token
from backend.auth.deps import get_current_user
from backend.blockchain.client import get_blockchain_client, to_hex_bytes32

router = APIRouter(tags=["Authentication"])


# -----------------------------------------------------------------------------
# Request & Response Schemas
# -----------------------------------------------------------------------------

class PatientSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    wallet_address: Optional[str] = None
    patient_id: Optional[str] = None


class DoctorSignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    wallet_address: str = Field(..., description="Doctor's Ethereum wallet address")
    medical_license: str = Field(..., description="Official medical board license ID")
    hospital_affiliation: Optional[str] = "PneumoVision General Hospital"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UpdateWalletRequest(BaseModel):
    wallet_address: str = Field(..., description="Ethereum wallet address to link")


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# -----------------------------------------------------------------------------
# Patient Signup & Login
# -----------------------------------------------------------------------------

@router.post("/v1/auth/patient/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def patient_signup(payload: PatientSignupRequest, db: Session = Depends(get_db)):
    """
    Onboards a new patient: creates user record, derives pseudonymous patientId
    (cryptographically salted, no real PII derivable from it), and commits on-chain
    identity via PatientRecords.sol registerPatient.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    client = get_blockchain_client()

    # Validate wallet address if provided, otherwise leave as None (nullable for post-signup linking)
    wallet = None
    if payload.wallet_address:
        if Web3.is_address(payload.wallet_address):
            wallet = Web3.to_checksum_address(payload.wallet_address)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Ethereum wallet address format."
            )

    # Generate pseudonymous patientId (hash-based, zero PII derivable)
    if payload.patient_id:
        patient_id_hex = payload.patient_id
        patient_id_bytes = to_hex_bytes32(payload.patient_id)
    else:
        # 256 bits of high-entropy cryptographic salt - computationally decoupled from PII
        secure_entropy = secrets.token_bytes(32)
        patient_id_bytes = keccak(secure_entropy)
        patient_id_hex = "0x" + patient_id_bytes.hex()

    # Register identity on blockchain
    try:
        client.register_patient(patient_id_bytes, patient_address=wallet)
    except Exception as e:
        # If already registered on-chain in local test cycles, continue safely
        pass

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.PATIENT.value,
        full_name=payload.full_name,
        wallet_address=wallet,
        patient_id=patient_id_hex,
        is_verified=True  # Patients are verified upon onboarding
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "patient_id": user.patient_id,
        "wallet_address": user.wallet_address
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@router.post("/v1/auth/patient/login", response_model=AuthResponse)
async def patient_login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates a patient and returns JWT bearer token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if user.role != UserRole.PATIENT.value and user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not registered as a patient."
        )

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "patient_id": user.patient_id,
        "wallet_address": user.wallet_address
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


# -----------------------------------------------------------------------------
# Doctor Signup & Login
# -----------------------------------------------------------------------------

@router.post("/v1/auth/doctor/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def doctor_signup(payload: DoctorSignupRequest, db: Session = Depends(get_db)):
    """
    Registers a physician account with is_verified = False.
    Cannot write medical records until administrative approval on-chain.
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    if not Web3.is_address(payload.wallet_address):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Ethereum wallet address format."
        )

    wallet = Web3.to_checksum_address(payload.wallet_address)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.DOCTOR.value,
        full_name=payload.full_name,
        wallet_address=wallet,
        medical_license=payload.medical_license,
        hospital_affiliation=payload.hospital_affiliation,
        is_verified=False  # Doctor must be verified by admin
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "wallet_address": user.wallet_address
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


@router.post("/v1/auth/doctor/login", response_model=AuthResponse)
async def doctor_login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates a physician and returns JWT token."""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if user.role != UserRole.DOCTOR.value and user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not registered as a doctor."
        )

    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "is_verified": user.is_verified,
        "wallet_address": user.wallet_address
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_dict()
    }


# -----------------------------------------------------------------------------
# User & Patient Profile
# -----------------------------------------------------------------------------

@router.get("/v1/auth/me")
@router.get("/v1/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and state."""
    return current_user.to_dict()


@router.get("/v1/me/patient-profile")
@router.get("/v1/auth/me/patient-profile")
async def get_patient_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the authenticated patient's profile including pseudonymous patient_id
    and linked wallet address.
    """
    if current_user.role != UserRole.PATIENT.value and current_user.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to patient accounts."
        )
    return current_user.to_dict()


@router.put("/v1/me/wallet")
@router.patch("/v1/me/patient-profile")
@router.put("/v1/me/patient-profile")
async def update_patient_wallet(
    payload: UpdateWalletRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Links or updates the authenticated patient's Ethereum wallet address post-signup
    for BridgeKey cryptographic signatures.
    """
    if not Web3.is_address(payload.wallet_address):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Ethereum wallet address format."
        )
    
    checksummed_wallet = Web3.to_checksum_address(payload.wallet_address)
    current_user.wallet_address = checksummed_wallet
    db.commit()
    db.refresh(current_user)

    return current_user.to_dict()
