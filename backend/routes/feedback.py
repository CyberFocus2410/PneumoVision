"""
Human-in-the-Loop Clinician Feedback Route
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime
import json
from pathlib import Path
from src.config import BASE_DIR

router = APIRouter(prefix="/v1", tags=["Feedback"])

FEEDBACK_LOG = BASE_DIR / "data" / "feedback_audit_log.jsonl"

class FeedbackRequest(BaseModel):
    case_id: str
    finding: str
    clinician_agreement: bool # True = Agree, False = Disagree
    clinician_notes: Optional[str] = ""
    suggested_correction: Optional[str] = None

@router.post("/feedback")
async def log_clinician_feedback(payload: FeedbackRequest):
    record = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "case_id": payload.case_id,
        "finding": payload.finding,
        "agreement": payload.clinician_agreement,
        "notes": payload.clinician_notes,
        "suggested_correction": payload.suggested_correction
    }

    FEEDBACK_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(FEEDBACK_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

    return {
        "status": "success",
        "message": "Feedback logged into audit stream for active learning and model monitoring."
    }
