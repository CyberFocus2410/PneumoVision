"""
Health and System Metadata Routes
"""

from fastapi import APIRouter
import torch
import json
from src.config import TARGET_CLASSES, DEFAULT_THRESHOLDS, MODEL_CONFIG, CHECKPOINTS_DIR

router = APIRouter(prefix="/v1", tags=["Health"])

@router.get("/health")
async def health_check():
    meta_file = CHECKPOINTS_DIR / "model_metadata.json"
    metadata = {}
    if meta_file.exists():
        try:
            with open(meta_file, "r") as f:
                metadata = json.load(f)
        except Exception:
            pass

    return {
        "status": "healthy",
        "service": "PneumoVision AI Screening API",
        "model_version": MODEL_CONFIG["version"],
        "architecture": MODEL_CONFIG["model_name"],
        "cuda_available": torch.cuda.is_available(),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "target_classes": TARGET_CLASSES,
        "default_thresholds": DEFAULT_THRESHOLDS,
        "model_metadata": metadata,
        "non_diagnostic_notice": "For research and educational decision support only."
    }
