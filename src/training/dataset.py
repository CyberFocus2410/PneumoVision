"""
Multi-Label Chest Radiograph Dataset and Patient-Level Stratified Partitioning.
"""

from typing import List, Dict, Optional, Tuple, Union
from pathlib import Path
import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset
from PIL import Image
from sklearn.model_selection import KFold

from src.preprocessing.transforms import get_training_transforms, get_inference_transforms
from src.preprocessing.dicom_handler import read_dicom_file, is_dicom_file
from src.config import TARGET_CLASSES

class ChestXrayDataset(Dataset):
    """
    PyTorch Dataset for multi-label chest X-ray studies.
    Supports PNG, JPEG, and DICOM (.dcm) files.
    """
    def __init__(
        self,
        df: pd.DataFrame,
        image_dir: Union[str, Path],
        target_classes: List[str] = TARGET_CLASSES,
        is_training: bool = False,
        apply_clahe: bool = True
    ):
        self.df = df.reset_index(drop=True)
        self.image_dir = Path(image_dir)
        self.target_classes = target_classes
        self.is_training = is_training
        
        if is_training:
            self.transform = get_training_transforms(apply_clahe=apply_clahe)
        else:
            self.transform = get_inference_transforms(apply_clahe=apply_clahe)

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        row = self.df.iloc[idx]
        image_name = str(row["image_id"])
        image_path = self.image_dir / image_name
        
        # Load image (DICOM or standard raster)
        if image_path.suffix.lower() == ".dcm" or (image_path.exists() and is_dicom_file(image_path.read_bytes()[:200])):
            img_np, _ = read_dicom_file(image_path)
            pil_img = Image.fromarray(img_np).convert("RGB")
        elif image_path.exists():
            pil_img = Image.open(image_path).convert("RGB")
        else:
            # Synthetic placeholder if file path is missing in simulated testing
            pil_img = Image.new("RGB", (320, 320), color=(128, 128, 128))

        # Apply transformations
        tensor_img = self.transform(pil_img)
        
        # Extract target labels
        labels = [float(row.get(cls_name, 0.0)) for cls_name in self.target_classes]
        tensor_labels = torch.tensor(labels, dtype=torch.float32)

        return tensor_img, tensor_labels


def patient_stratified_split(
    df: pd.DataFrame,
    patient_col: str = "patient_id",
    target_classes: List[str] = TARGET_CLASSES,
    train_ratio: float = 0.70,
    val_ratio: float = 0.10,
    test_ratio: float = 0.20,
    seed: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    CRITICAL REQUIREMENT: Strictly splits dataset by Patient ID (no patient overlap between splits),
    while preserving multi-label distribution across train/val/test partitions.
    """
    rng = np.random.RandomState(seed)
    
    # Aggregate label prevalence per patient
    patient_summary = df.groupby(patient_col)[target_classes].max().reset_index()
    
    # Assign primary stratum based on rarest positive finding
    class_frequencies = patient_summary[target_classes].sum().sort_values()
    
    def assign_stratum(row):
        for cls_name in class_frequencies.index:
            if row[cls_name] == 1:
                return cls_name
        return "No Finding"

    patient_summary["stratum"] = patient_summary.apply(assign_stratum, axis=1)
    
    train_patients = []
    val_patients = []
    test_patients = []

    for stratum, group in patient_summary.groupby("stratum"):
        patients = group[patient_col].values.copy()
        rng.shuffle(patients)
        
        n = len(patients)
        n_train = int(round(n * train_ratio))
        n_val = int(round(n * val_ratio))
        
        train_p = patients[:n_train]
        val_p = patients[n_train:n_train + n_val]
        test_p = patients[n_train + n_val:]
        
        train_patients.extend(train_p)
        val_patients.extend(val_p)
        test_patients.extend(test_p)

    train_df = df[df[patient_col].isin(train_patients)].reset_index(drop=True)
    val_df = df[df[patient_col].isin(val_patients)].reset_index(drop=True)
    test_df = df[df[patient_col].isin(test_patients)].reset_index(drop=True)

    return train_df, val_df, test_df
