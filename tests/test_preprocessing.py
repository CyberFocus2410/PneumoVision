"""
Unit tests for Preprocessing, Quality Assessment, and Patient-Level Stratified Splitting.
"""

import pytest
import numpy as np
import pandas as pd
from PIL import Image
import torch

from src.preprocessing.quality_check import assess_image_quality
from src.preprocessing.transforms import get_inference_transforms, get_training_transforms
from src.training.dataset import patient_stratified_split
from src.config import TARGET_CLASSES

def test_assess_image_quality_valid():
    # Generate mock radiograph
    arr = np.random.randint(50, 200, (320, 320), dtype=np.uint8)
    pil_img = Image.fromarray(arr)
    
    is_acc, status, metrics = assess_image_quality(pil_img)
    assert is_acc is True
    assert status in ["OPTIMAL", "ACCEPTABLE"]
    assert "entropy" in metrics

def test_assess_image_quality_low_resolution():
    arr = np.zeros((100, 100), dtype=np.uint8)
    pil_img = Image.fromarray(arr)
    is_acc, status, metrics = assess_image_quality(pil_img)
    assert is_acc is True
    assert "LOW_RESOLUTION" in metrics["flags"]

def test_transforms_shape():
    t_inf = get_inference_transforms(apply_clahe=True)
    t_train = get_training_transforms(apply_clahe=True)
    
    img = Image.new("RGB", (400, 400), color=(100, 100, 100))
    tensor_inf = t_inf(img)
    tensor_train = t_train(img)
    
    assert tensor_inf.shape == (3, 320, 320)
    assert tensor_train.shape == (3, 320, 320)

def test_patient_stratified_split_no_leakage():
    # Build test dataframe with 20 patients
    records = []
    for p in range(20):
        pid = f"PATIENT_{p:03d}"
        for img_i in range(3):
            records.append({
                "patient_id": pid,
                "image_id": f"{pid}_{img_i}.png",
                "Pneumonia": 1 if p % 2 == 0 else 0,
                "Cardiomegaly": 1 if p % 3 == 0 else 0,
                "Pleural Effusion": 0,
                "Atelectasis": 1 if p % 4 == 0 else 0,
                "No Finding": 0
            })
    df = pd.DataFrame(records)
    
    train_df, val_df, test_df = patient_stratified_split(
        df,
        patient_col="patient_id",
        target_classes=TARGET_CLASSES,
        train_ratio=0.6,
        val_ratio=0.2,
        test_ratio=0.2,
        seed=42
    )
    
    train_patients = set(train_df["patient_id"])
    val_patients = set(val_df["patient_id"])
    test_patients = set(test_df["patient_id"])
    
    assert len(train_patients.intersection(val_patients)) == 0
    assert len(train_patients.intersection(test_patients)) == 0
    assert len(val_patients.intersection(test_patients)) == 0
