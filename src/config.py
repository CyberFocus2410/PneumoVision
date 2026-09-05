"""
PneumoVision Configuration Module
Global paths, constants, model hyper-parameters, and default threshold configurations.
"""

from pathlib import Path
import os
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

# Target disease classes (5 findings taxonomy)
TARGET_CLASSES = [
    "Pneumonia",
    "Cardiomegaly",
    "Pleural Effusion",
    "Atelectasis",
    "No Finding"
]

# Clinical Default thresholds tuned via validation set PR-F1 optimization
DEFAULT_THRESHOLDS = {
    "Pneumonia": 0.42,
    "Cardiomegaly": 0.40,
    "Pleural Effusion": 0.42,
    "Atelectasis": 0.39,
    "No Finding": 0.41
}

# Image Input Dimensions
IMG_SIZE = (320, 320)
IMAGE_MEAN = [0.485, 0.456, 0.406]
IMAGE_STD = [0.229, 0.224, 0.225]

# Quality assurance bounds
QUALITY_CONFIG = {
    "min_resolution": (256, 256),
    "max_file_size_bytes": 25 * 1024 * 1024, # 25MB
    "min_entropy": 3.0,
    "min_contrast": 15.0,
    "min_variance": 100.0
}

# Model Architecture Specs
MODEL_CONFIG = {
    "model_name": "densenet121",
    "num_classes": len(TARGET_CLASSES),
    "pretrained": True,
    "dropout_rate": 0.3,
    "hidden_dim": 256,
    "version": "densenet121-cxr-v1.0"
}

# Training Hyperparameters
TRAIN_CONFIG = {
    "batch_size": 16,
    "learning_rate": 1e-4,
    "weight_decay": 1e-5,
    "epochs": 15,
    "focal_gamma": 2.0,
    "patience": 5,
    "seed": 42
}

def load_label_map(label_map_path: Path = SRC_DIR / "preprocessing" / "label_map.yaml") -> dict:
    if label_map_path.exists():
        with open(label_map_path, "r") as f:
            return yaml.safe_load(f)
    return {}
