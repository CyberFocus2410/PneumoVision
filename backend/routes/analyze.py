"""
Inference & Multi-Label Screening Route
Accepts any image format (DICOM, PNG, JPEG, WEBP, TIFF, BMP) or sample case ID.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
from pathlib import Path
import io

from src.inference.engine import PneumoInferenceEngine
from src.config import SAMPLES_DIR

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
    use_tta: bool = Form(True),
    use_mc_dropout: bool = Form(True)
):
    """
    Accepts an uploaded X-ray (PNG, JPEG, DICOM, WEBP, TIFF) or a sample case ID,
    runs quality assessment, calibrated multi-label classification, and Grad-CAM++ explainability.
    """
    engine = get_engine()

    # Prioritize uploaded file if provided and non-empty
    if file is not None and file.filename:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
        image_input = file_bytes
    elif sample_id and sample_id.strip() not in ["", "null", "undefined"]:
        # Match sample file
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

        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference analysis failed: {str(e)}")
