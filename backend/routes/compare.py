"""
Longitudinal Study Comparison Route
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from pathlib import Path

from src.inference.engine import PneumoInferenceEngine
from src.inference.comparator import LongitudinalComparator
from src.config import SAMPLES_DIR

router = APIRouter(prefix="/v1", tags=["Longitudinal"])

_comparator: Optional[LongitudinalComparator] = None

def get_comparator() -> LongitudinalComparator:
    global _comparator
    if _comparator is None:
        engine = PneumoInferenceEngine()
        _comparator = LongitudinalComparator(engine)
    return _comparator


@router.post("/compare")
async def compare_longitudinal_xrays(
    prior_file: Optional[UploadFile] = File(None),
    current_file: Optional[UploadFile] = File(None),
    prior_sample_id: Optional[str] = Form(None),
    current_sample_id: Optional[str] = Form(None)
):
    """
    Compares prior and follow-up studies and returns finding-by-finding trajectory.
    """
    comparator = get_comparator()

    # Resolve Prior Image
    if prior_file is not None and prior_file.filename:
        prior_input = await prior_file.read()
    elif prior_sample_id:
        p_path = SAMPLES_DIR / f"{prior_sample_id}.png"
        if not p_path.exists():
            p_path = SAMPLES_DIR / f"{prior_sample_id}.jpg"
        if not p_path.exists():
            raise HTTPException(status_code=404, detail=f"Prior sample '{prior_sample_id}' not found.")
        prior_input = p_path
    else:
        raise HTTPException(status_code=400, detail="Prior study file or sample_id required.")

    # Resolve Current Image
    if current_file is not None and current_file.filename:
        current_input = await current_file.read()
    elif current_sample_id:
        c_path = SAMPLES_DIR / f"{current_sample_id}.png"
        if not c_path.exists():
            c_path = SAMPLES_DIR / f"{current_sample_id}.jpg"
        if not c_path.exists():
            raise HTTPException(status_code=404, detail=f"Current sample '{current_sample_id}' not found.")
        current_input = c_path
    else:
        raise HTTPException(status_code=400, detail="Current study file or sample_id required.")

    try:
        results = comparator.compare_studies(prior_input, current_input)
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Longitudinal comparison failed: {str(e)}")
