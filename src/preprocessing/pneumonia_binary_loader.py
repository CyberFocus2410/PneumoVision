"""
Kaggle Pneumonia Binary Dataset Loader for PneumoVision.

Parses Kaggle's 'Chest X-Ray Images (Pneumonia)' dataset folder structure:
  chest_xray/
    train/
      NORMAL/*.jpeg
      PNEUMONIA/*.jpeg
    test/
      NORMAL/*.jpeg
      PNEUMONIA/*.jpeg
    val/
      NORMAL/*.jpeg
      PNEUMONIA/*.jpeg

Extracts patient IDs from PNEUMONIA filenames using regex pattern (personXXXX).
Falls back to image_id for NORMAL / unmatched filenames and logs bucket count.
"""

import logging
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import pandas as pd

logger = logging.getLogger(__name__)

# Pattern to capture patient identifiers like person1946 from person1946_bacteria_4874.jpeg
PATIENT_ID_PATTERN = re.compile(r"^(person\d+)", re.IGNORECASE)

EXPECTED_COLUMNS = [
    "image_id",
    "patient_id",
    "Pneumonia",
    "No_Finding",
    "source_dataset",
    "image_path",
    "original_split",
]


def resolve_chest_xray_root(data_root: Union[str, Path]) -> Path:
    """
    Locates the directory containing train/test/val splits.
    Handles data_root pointing to chest_xray folder or its parent.
    """
    root = Path(data_root).resolve()
    if not root.exists():
        raise FileNotFoundError(f"Data root path does not exist: {root}")

    # Check if train/test/val are directly under root
    if (root / "train").is_dir() or (root / "test").is_dir():
        return root

    # Check nested chest_xray subdirectory
    if (root / "chest_xray").is_dir():
        nested = root / "chest_xray"
        if (nested / "train").is_dir() or (nested / "test").is_dir():
            return nested

    return root


def extract_patient_id(filename: str) -> Tuple[str, bool]:
    """
    Extracts patient_id from filename.
    Returns (patient_id, is_extracted_from_pattern).
    If matched via personXXXX, returns (personXXXX, True).
    Otherwise returns (filename, False).
    """
    stem = Path(filename).stem
    match = PATIENT_ID_PATTERN.match(stem)
    if match:
        return match.group(1).lower(), True
    return filename, False


def load_pneumonia_binary_dataset(
    data_root: Union[str, Path],
    extensions: Tuple[str, ...] = (".jpeg", ".jpg", ".png"),
) -> pd.DataFrame:
    """
    Walks train/, test/, val/ splits in the Kaggle Pneumonia dataset,
    builds standard metadata DataFrame and logs patient extraction stats.

    Args:
        data_root: Root directory of dataset or parent folder.
        extensions: Allowed image file extensions.

    Returns:
        pd.DataFrame with columns:
          image_id, patient_id, Pneumonia, No_Finding, source_dataset,
          image_path, original_split
    """
    resolved_root = resolve_chest_xray_root(data_root)
    logger.info(f"Scanning dataset from resolved path: {resolved_root}")

    records: List[Dict] = []
    splits = ["train", "test", "val"]
    unreliable_patient_id_count = 0
    reliable_patient_id_count = 0

    for split in splits:
        split_dir = resolved_root / split
        if not split_dir.is_dir():
            logger.warning(f"Split directory not found: {split_dir}")
            continue

        # Look for class subdirectories (case-insensitive)
        for class_dir in split_dir.iterdir():
            if not class_dir.is_dir():
                continue

            class_name = class_dir.name.upper()
            if "PNEUMONIA" in class_name:
                is_pneumonia = 1
                is_no_finding = 0
            elif "NORMAL" in class_name:
                is_pneumonia = 0
                is_no_finding = 1
            else:
                logger.debug(f"Skipping unrecognized subfolder: {class_dir}")
                continue

            # Iterate through image files
            for entry in class_dir.iterdir():
                if entry.is_file() and entry.suffix.lower() in extensions:
                    image_id = entry.name
                    patient_id, is_reliable = extract_patient_id(image_id)

                    if is_reliable:
                        reliable_patient_id_count += 1
                    else:
                        unreliable_patient_id_count += 1

                    records.append({
                        "image_id": image_id,
                        "patient_id": patient_id,
                        "Pneumonia": is_pneumonia,
                        "No_Finding": is_no_finding,
                        "source_dataset": "kaggle_pneumonia_binary",
                        "image_path": str(entry.resolve()),
                        "original_split": split,
                    })

    df = pd.DataFrame(records)
    if df.empty:
        logger.warning(f"No image records found under {resolved_root}")
        return pd.DataFrame(columns=EXPECTED_COLUMNS)

    # Reorder columns explicitly
    df = df[EXPECTED_COLUMNS]

    total_images = len(df)
    unique_patients = df["patient_id"].nunique()

    logger.info(
        f"Pneumonia Binary Dataset loaded: {total_images} images across {unique_patients} unique patient_ids. "
        f"Reliable pattern patient IDs: {reliable_patient_id_count}, "
        f"Fallback (image_id) patient IDs: {unreliable_patient_id_count}."
    )

    return df
