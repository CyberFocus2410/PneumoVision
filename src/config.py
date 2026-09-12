"""
PneumoVision Configuration Module
Centralized label taxonomy, global paths, constants, model hyper-parameters, and default threshold configurations.
"""

from pathlib import Path
import os
from typing import Dict, List, Optional
import yaml

# Base project paths
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
CHECKPOINTS_DIR = MODELS_DIR / "checkpoints"
STATIC_DIR = BASE_DIR / "backend" / "static"
HEATMAPS_DIR = STATIC_DIR / "heatmaps"
REPORTS_DIR = STATIC_DIR / "reports"
SAMPLES_DIR = DATA_DIR / "samples"

# Ensure runtime directories exist
for p in [DATA_DIR, CHECKPOINTS_DIR, STATIC_DIR, HEATMAPS_DIR, REPORTS_DIR, SAMPLES_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# -----------------------------------------------------------------------------
# Centralized Label Taxonomies & Operating Thresholds
# -----------------------------------------------------------------------------
LABEL_MODE = os.environ.get("PNEUMOVISION_LABEL_MODE", "binary").lower()

# 1. Binary Taxonomy (Kaggle Pneumonia Screener)
BINARY_TARGET_CLASSES: List[str] = [
    "Pneumonia",
    "No Finding",
]
BINARY_MODEL_OUTPUT_CLASSES: List[str] = [
    "Pneumonia",
]
BINARY_DEFAULT_THRESHOLDS: Dict[str, float] = {
    "Pneumonia": 0.51,
    "No Finding": 0.49,
}

# 2. Multi-Label Taxonomy (NIH ChestX-ray14 5 findings)
MULTILABEL_TARGET_CLASSES: List[str] = [
    "Pneumonia",
    "Cardiomegaly",
    "Pleural Effusion",
    "Atelectasis",
    "No Finding",
]
MULTILABEL_MODEL_OUTPUT_CLASSES: List[str] = MULTILABEL_TARGET_CLASSES
MULTILABEL_DEFAULT_THRESHOLDS: Dict[str, float] = {
    "Pneumonia": 0.42,
    "Cardiomegaly": 0.40,
    "Pleural Effusion": 0.42,
    "Atelectasis": 0.39,
    "No Finding": 0.41,
}


def get_target_classes(mode: Optional[str] = None) -> List[str]:
    """Returns the target finding classes for the active or requested label mode."""
    active_mode = (mode or LABEL_MODE).lower()
    if active_mode == "multilabel":
        return list(MULTILABEL_TARGET_CLASSES)
    return list(BINARY_TARGET_CLASSES)


def get_model_output_classes(mode: Optional[str] = None) -> List[str]:
    """Returns the direct model sigmoid output classes (1 for binary, 5 for multilabel)."""
    active_mode = (mode or LABEL_MODE).lower()
    if active_mode == "multilabel":
        return list(MULTILABEL_MODEL_OUTPUT_CLASSES)
    return list(BINARY_MODEL_OUTPUT_CLASSES)


def get_default_thresholds(mode: Optional[str] = None) -> Dict[str, float]:
    """Returns the tuned decision thresholds for the active or requested label mode."""
    active_mode = (mode or LABEL_MODE).lower()
    if active_mode == "multilabel":
        return dict(MULTILABEL_DEFAULT_THRESHOLDS)
    return dict(BINARY_DEFAULT_THRESHOLDS)


# Active default exports
TARGET_CLASSES = get_target_classes()
MODEL_OUTPUT_CLASSES = get_model_output_classes()
DEFAULT_THRESHOLDS = get_default_thresholds()

# Image Input Dimensions
IMG_SIZE = (320, 320)
IMAGE_MEAN = [0.485, 0.456, 0.406]
IMAGE_STD = [0.229, 0.224, 0.225]

# Quality assurance bounds
QUALITY_CONFIG = {
    "min_resolution": (256, 256),
    "max_file_size_bytes": 25 * 1024 * 1024,  # 25MB
    "min_entropy": 3.0,
    "min_contrast": 15.0,
    "min_variance": 100.0,
}

# Model Architecture Specs
MODEL_CONFIG = {
    "model_name": "densenet121",
    "num_classes": len(MODEL_OUTPUT_CLASSES),
    "pretrained": True,
    "dropout_rate": 0.3,
    "hidden_dim": 256,
    "version": "densenet121-cxr-v1.0",
}

# Training Hyperparameters
TRAIN_CONFIG = {
    "batch_size": 16,
    "learning_rate": 1e-4,
    "weight_decay": 1e-5,
    "epochs": 15,
    "focal_gamma": 2.0,
    "patience": 5,
    "seed": 42,
}


def load_label_map(label_map_path: Path = SRC_DIR / "preprocessing" / "label_map.yaml") -> dict:
    if label_map_path.exists():
        with open(label_map_path, "r") as f:
            return yaml.safe_load(f)
    return {}
