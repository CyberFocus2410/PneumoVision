"""
Inference & Multi-Label Screening Route with On-Chain Tamper-Evident Record Logging.
Accepts any image format (DICOM, PNG, JPEG, WEBP, TIFF, BMP) or sample case ID,
runs inference, stores off-chain clinical report payload, and commits cryptographic hash on-chain.
"""

from datetime import datetime
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional, Dict, Any
from pathlib import Path
import io

from src.inference.engine import PneumoInferenceEngine
from src.config import SAMPLES_DIR
from backend.blockchain.client import get_blockchain_client
from backend.blockchain.store import compute_content_hash, save_offchain_record

router = APIRouter(prefix="/v1", tags=["Analysis"])

_engine: Optional[PneumoInferenceEngine] = None

def get_engine() -> PneumoInferenceEngine:
    global _engine
    if _engine is None:
        _engine = PneumoInferenceEngine()
    return _engine


@router.post("/analyze")
async def analyze_xray(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None),
    patient_id: Optional[str] = Form(None),
    use_tta: bool = Form(True),
    use_mc_dropout: bool = Form(True)
):
    """
    Accepts an uploaded X-ray or sample ID, executes AI inference, stores full diagnosis detail off-chain,
    and commits a tamper-evident cryptographic hash on-chain via PatientRecords.sol (RecordType.Diagnosis).
    """
    engine = get_engine()

    # Prioritize uploaded file if provided and non-empty
    if file is not None and file.filename:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
        image_input = file_bytes
    elif sample_id and sample_id.strip() not in ["", "null", "undefined"]:
        clean_id = sample_id.strip()
        sample_path = None
        for ext in [".png", ".jpg", ".jpeg", ".dcm"]:
            cand = SAMPLES_DIR / f"{clean_id}{ext}"
            if cand.exists():
                sample_path = cand
                break
        
        if sample_path is None:
            raise HTTPException(status_code=404, detail=f"Sample '{clean_id}' not found.")
        image_input = sample_path
    else:
        raise HTTPException(status_code=400, detail="Please upload a valid chest X-ray file or select a benchmark case.")

    try:
        results = engine.predict(
            image_input,
            use_tta=use_tta,
            use_mc_dropout=use_mc_dropout,
            save_heatmaps=True
        )

        results.pop("original_image", None)
        results.pop("raw_heatmaps", None)

        # 1. Resolve / Generate Pseudonymous Patient ID
        pid = (patient_id or "").strip()
        if not pid or pid.lower() in ("null", "undefined"):
            pid = f"PATIENT_ANON_{results['case_id']}"

        # 2. Package and persist off-chain clinical diagnosis payload
        off_chain_ref = f"diagnoses/{results['case_id']}.json"
        diagnosis_payload: Dict[str, Any] = {
            "case_id": results["case_id"],
            "patient_id": pid,
            "primary_finding": results["primary_finding"],
            "predictions": results["predictions"],
            "quality_status": results["quality_status"],
            "quality_metrics": results["quality_metrics"],
            "dicom_metadata": results.get("dicom_metadata"),
            "model_version": results["model_version"],
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        save_offchain_record(off_chain_ref, diagnosis_payload)
        content_hash = compute_content_hash(diagnosis_payload)

        # 3. Commit on-chain record via Blockchain client
        try:
            bc_client = get_blockchain_client()
            bc_receipt = bc_client.add_record(
                patient_id=pid,
                record_type="Diagnosis",
                content_hash=content_hash,
                off_chain_ref=off_chain_ref
            )
            results["patient_id"] = pid
            results["blockchain_tx_hash"] = bc_receipt.get("tx_hash")
            results["blockchain_record_id"] = bc_receipt.get("record_id")
            results["content_hash"] = content_hash
            results["off_chain_ref"] = off_chain_ref
            results["blockchain_status"] = "COMMITTED"
        except Exception as bc_err:
            print(f"Warning: Blockchain on-chain commit failed: {bc_err}")
            results["patient_id"] = pid
            results["content_hash"] = content_hash
            results["off_chain_ref"] = off_chain_ref
            results["blockchain_status"] = f"ERROR: {str(bc_err)}"

        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference analysis failed: {str(e)}")
