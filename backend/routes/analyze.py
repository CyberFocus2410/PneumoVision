"""
Inference & Multi-Label Screening Route
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import shutil
from pathlib import Path

from src.inference.engine import PneumoInferenceEngine
from src.config import SAMPLES_DIR

router = APIRouter(prefix="/v1", tags=["Analysis"])

# Singleton engine instance
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
    use_tta: bool = Form(True),
    use_mc_dropout: bool = Form(True)
):
    """
    Accepts an uploaded X-ray (PNG, JPEG, DICOM) or a preloaded sample ID,
    runs quality assessment, calibrated multi-label classification, and Grad-CAM explainability.
    """
    engine = get_engine()

    if file is not None and file.filename:
        # Read uploaded image bytes
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        image_input = file_bytes
    elif sample_id:
        sample_path = SAMPLES_DIR / f"{sample_id}.png"
        if not sample_path.exists():
            sample_path = SAMPLES_DIR / f"{sample_id}.jpg"
        if not sample_path.exists():
            sample_path = SAMPLES_DIR / f"{sample_id}.dcm"
        if not sample_path.exists():
            raise HTTPException(status_code=404, detail=f"Sample '{sample_id}' not found.")
        image_input = sample_path
    else:
        raise HTTPException(status_code=400, detail="Either 'file' or 'sample_id' must be provided.")

    try:
        results = engine.predict(
            image_input,
            use_tta=use_tta,
            use_mc_dropout=use_mc_dropout,
            save_heatmaps=True
        )

        # Remove non-serializable PIL object from JSON response
        results.pop("original_image", None)
        results.pop("raw_heatmaps", None)

        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference analysis failed: {str(e)}")
