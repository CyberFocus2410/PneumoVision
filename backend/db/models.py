"""
SQLAlchemy 2.0 Database Models
"""

from datetime import datetime, timezone
import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from backend.db.database import Base


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default=UserRole.PATIENT.value)
    full_name = Column(String(255), nullable=False)
    wallet_address = Column(String(42), nullable=True, index=True)
    
    # Patient specific
    patient_id = Column(String(66), nullable=True, index=True)  # 0x-prefixed 64-char hex
    
    # Doctor specific
    medical_license = Column(String(100), nullable=True)
    hospital_affiliation = Column(String(255), nullable=True)
    
    # Verification status (Doctors require admin verification before writing records)
    is_verified = Column(Boolean, nullable=False, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name,
            "wallet_address": self.wallet_address,
            "patient_id": self.patient_id,
            "medical_license": self.medical_license,
            "hospital_affiliation": self.hospital_affiliation,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
