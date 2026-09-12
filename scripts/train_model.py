"""
Training & Calibration Pipeline Script for PneumoVision.
Supports:
1. Multi-label NIH Synthetic Cohort (5 findings).
2. Binary Pneumonia vs Normal Kaggle Cohort (single sigmoid output, held-out test split, patient-stratified train/val split).
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader

# Ensure root workspace is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent if Path(__file__).resolve().parent.name == "scripts" else Path(__file__).resolve().parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

# Also ensure current working directory is in sys.path (for Kaggle /kaggle/working/)
if str(Path.cwd()) not in sys.path:
    sys.path.insert(0, str(Path.cwd()))

from src.config import (
    CHECKPOINTS_DIR,
    DATA_DIR,
    TARGET_CLASSES,
    TRAIN_CONFIG,
)
from src.models.densenet import PneumoDenseNet
from src.preprocessing.pneumonia_binary_loader import load_pneumonia_binary_dataset
from src.training.dataset import (
    ChestXrayDataset,
    patient_stratified_split,
    pneumonia_binary_patient_split,
)
from src.training.trainer import PneumoTrainer
from scripts.create_sample_data import create_all_samples, generate_base_chest_xray


def check_cuda_preflight(require_gpu: bool = True) -> bool:
    """
    Mandatory pre-flight check to verify CUDA GPU availability.
    Prints GPU device telemetry and exits loudly if no GPU is detected when required.
    """
    cuda_available = torch.cuda.is_available()
    device_count = torch.cuda.device_count() if cuda_available else 0
    device_name = torch.cuda.get_device_name(0) if cuda_available else "None"

    print("=" * 65)
    print("  PRE-FLIGHT GPU VERIFICATION")
    print("=" * 65)
    print(f"[*] torch.cuda.is_available(): {cuda_available}")
    print(f"[*] CUDA Device Count:         {device_count}")
    print(f"[*] Primary GPU Device Name:   {device_name}")
    print("=" * 65)

    if not cuda_available:
        if require_gpu:
            err_msg = (
                "\n" + "!" * 65 + "\n"
                "[FATAL PRE-FLIGHT ERROR] No CUDA GPU detected (torch.cuda.is_available() == False)!\n"
                "Execution aborted immediately to prevent burning hours on CPU.\n"
                "Ensure GPU accelerator is enabled (e.g. Kaggle kernel metadata enable_gpu=true/NvidiaTeslaT4)\n"
                "or pass --allow-cpu if you explicitly intend to run on CPU.\n"
                + "!" * 65 + "\n"
            )
            print(err_msg, file=sys.stderr, flush=True)
            sys.exit(1)
        else:
            print("[WARNING] Proceeding in CPU mode (--allow-cpu specified).")
    return cuda_available


def create_synthetic_nih_cohort(num_patients: int = 120, images_per_patient: int = 3) -> Tuple[pd.DataFrame, Path]:
    """
    Generates a realistic synthetic training cohort mirroring NIH ChestX-ray14
    with authentic multi-label co-occurrences and patient IDs.
    """
    cohort_dir = DATA_DIR / "raw_cohort"
    cohort_dir.mkdir(parents=True, exist_ok=True)

    records = []
    rng = np.random.RandomState(42)

    for p_idx in range(1, num_patients + 1):
        patient_id = f"PATIENT_{p_idx:04d}"
        
        has_pna = rng.rand() < 0.22
        has_cardio = rng.rand() < 0.20
        has_eff = rng.rand() < 0.25
        has_ate = rng.rand() < 0.24
        has_normal = not (has_pna or has_cardio or has_eff or has_ate)

        num_imgs = rng.randint(1, images_per_patient + 1)
        for img_i in range(num_imgs):
            img_id = f"{patient_id}_img_{img_i+1}.png"
            img_path = cohort_dir / img_id

            base = generate_base_chest_xray().astype(np.float32)
            y, x = np.ogrid[:512, :512]

            if has_pna:
                consolidation = np.exp(-(((x - 340)**2 + (y - 300)**2) / (2 * 35**2))) * 80.0
                base += consolidation
            if has_cardio:
                heart_large = ((x - 220) / 130)**2 + ((y - 310) / 110)**2
                base[heart_large <= 1.0] += 70.0
            if has_eff:
                meniscus = (x < 210) & (y > 340) & ((y - 340) > 0.6 * (210 - x))
                base[meniscus] += 90.0
            if has_ate:
                band = np.exp(-((y - 330 + 0.15*(x - 340))**2) / 18.0) * (x > 280) * (x < 420) * 80.0
                base += band

            final_img = np.clip(base, 0, 255).astype(np.uint8)
            Image.fromarray(final_img).save(img_path)

            records.append({
                "patient_id": patient_id,
                "image_id": img_id,
                "Pneumonia": 1 if has_pna else 0,
                "Cardiomegaly": 1 if has_cardio else 0,
                "Pleural Effusion": 1 if has_eff else 0,
                "Atelectasis": 1 if has_ate else 0,
                "No Finding": 1 if has_normal else 0
            })

    df = pd.DataFrame(records)
    csv_path = DATA_DIR / "synthetic_nih_cohort.csv"
    df.to_csv(csv_path, index=False)
    print(f"Generated cohort with {len(df)} radiographs across {num_patients} patients.")
    return df, cohort_dir


def find_kaggle_dataset_path() -> Optional[Path]:
    """Auto-detects mounted Kaggle dataset path."""
    candidates = [
        Path("/kaggle/input/chest-xray-pneumonia/chest_xray"),
        Path("/kaggle/input/chest-xray-pneumonia"),
        Path("/kaggle/input/chest-xray-images-pneumonia/chest_xray"),
        Path("/kaggle/input/chest-xray-images-pneumonia"),
        Path("data/raw/chest_xray"),
        Path("tests/fixtures/chest_xray"),
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def run_training(
    data_source: str = "pneumonia_binary" if Path("/kaggle").exists() else "synthetic_nih",
    data_root: Optional[Path] = None,
    csv_path: Optional[Path] = None,
    epochs: int = 8,
    batch_size: int = 16,
    lr: float = 1e-4,
    loss_type: str = "focal",
    focal_gamma: float = 2.0,
    save_freq: int = 1,
    resume_from: Optional[Path] = None,
    device_name: str = "auto",
    checkpoint_dir: Optional[Path] = None,
    unfreeze_blocks: int = 2,
    seed: int = 42
):
    print("=" * 65)
    print(f"  PNEUMOVISION TRAINING PIPELINE [Source: {data_source.upper()}]")
    print("=" * 65)

    if checkpoint_dir:
        chk_dir = Path(checkpoint_dir)
    elif Path("/kaggle/working").exists():
        chk_dir = Path("/kaggle/working/models/checkpoints")
    else:
        chk_dir = CHECKPOINTS_DIR
    chk_dir.mkdir(parents=True, exist_ok=True)

    # 1. Device configuration
    if device_name == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(device_name)
    print(f"[*] Compute device: {device}")
    if torch.cuda.is_available():
        print(f"[*] GPU Name: {torch.cuda.get_device_name(0)}")

    # 2. Dataset Preparation
    if data_source == "pneumonia_binary":
        target_classes = ["Pneumonia"]
        if csv_path and Path(csv_path).is_file():
            print(f"[*] Loading metadata CSV from: {csv_path}")
            df = pd.read_csv(csv_path)
        else:
            resolved_root = data_root if (data_root and Path(data_root).exists()) else find_kaggle_dataset_path()
            if not resolved_root or not Path(resolved_root).exists():
                raise FileNotFoundError(f"Could not locate dataset path. Passed: {data_root}")
            print(f"[*] Scanning dataset from: {resolved_root}")
            df = load_pneumonia_binary_dataset(resolved_root)

        # Patient-stratified split for Pneumonia binary
        train_df, val_df, test_df = pneumonia_binary_patient_split(df, train_ratio=0.85, seed=seed)
        image_dir = None  # ChestXrayDataset resolves directly from 'image_path' column
    else:
        target_classes = TARGET_CLASSES
        create_all_samples()
        df, image_dir = create_synthetic_nih_cohort(num_patients=80, images_per_patient=2)
        train_df, val_df, test_df = patient_stratified_split(
            df,
            patient_col="patient_id",
            target_classes=target_classes,
            train_ratio=0.70,
            val_ratio=0.15,
            test_ratio=0.15,
            seed=seed
        )

    print(f"[*] Split sizes -> Train: {len(train_df)} | Val: {len(val_df)} | Held-out Test: {len(test_df)}")

    # 3. Create PyTorch DataLoaders
    train_dataset = ChestXrayDataset(train_df, image_dir=image_dir, target_classes=target_classes, is_training=True)
    val_dataset = ChestXrayDataset(val_df, image_dir=image_dir, target_classes=target_classes, is_training=False)
    test_dataset = ChestXrayDataset(test_df, image_dir=image_dir, target_classes=target_classes, is_training=False)

    num_workers = 2 if os.name != "nt" else 0
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    # 4. Initialize Model (num_classes=1 for binary pneumonia, num_classes=5 for multi-label)
    model = PneumoDenseNet(num_classes=len(target_classes), pretrained=True)
    model.freeze_early_layers(unfreeze_last_blocks=unfreeze_blocks)

    # 5. Trainer Initialization
    use_focal = (loss_type.lower() == "focal")
    trainer = PneumoTrainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        target_classes=target_classes,
        lr=lr,
        focal_gamma=focal_gamma,
        use_focal_loss=use_focal,
        checkpoint_dir=chk_dir,
        device=device
    )

    print(f"\n[*] Starting DenseNet-121 Training ({'Binary Focal Loss' if use_focal else 'Binary Cross-Entropy'})...")
    trainer.fit(
        epochs=epochs,
        patience=TRAIN_CONFIG["patience"],
        save_freq=save_freq,
        resume_from=resume_from
    )

    # 6. Evaluation on Held-Out Test Set (Never seen during train/val)
    if len(test_loader) > 0:
        print("\n" + "=" * 65)
        print("  FINAL EVALUATION ON HELD-OUT TEST SET")
        print("=" * 65)
        test_loss, test_probs, test_targets, test_metrics = trainer.evaluate(test_loader)
        for k, v in test_metrics.items():
            print(f"  - {k}: {v}")
        print("=" * 65)

    print(f"\n[OK] Training completed! Checkpoints saved in: {chk_dir}")
    return trainer


def parse_args():
    is_kaggle = Path("/kaggle").exists()
    parser = argparse.ArgumentParser(
        description="PneumoVision Model Training & Calibration Pipeline",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--data-source",
        choices=["synthetic_nih", "pneumonia_binary"],
        default="pneumonia_binary" if is_kaggle else "synthetic_nih",
        help="Dataset format: 'synthetic_nih' (5 findings multi-label) or 'pneumonia_binary' (Kaggle Pneumonia vs Normal).",
    )
    parser.add_argument(
        "--data-root",
        type=Path,
        default=None,
        help="Path to chest_xray directory when using --data-source pneumonia_binary.",
    )
    parser.add_argument(
        "--csv-path",
        type=Path,
        default=None,
        help="Optional path to pre-built metadata CSV for pneumonia_binary.",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=8 if is_kaggle else 5,
        help="Total training epochs.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=16 if is_kaggle else 8,
        help="Batch size for training and validation loaders.",
    )
    parser.add_argument(
        "--lr",
        type=float,
        default=1e-4,
        help="AdamW learning rate.",
    )
    parser.add_argument(
        "--loss",
        choices=["focal", "bce"],
        default="focal",
        help="Loss function: 'focal' (Binary Focal Loss) or 'bce' (Binary Cross Entropy).",
    )
    parser.add_argument(
        "--focal-gamma",
        type=float,
        default=2.0,
        help="Gamma focusing parameter for Focal Loss.",
    )
    parser.add_argument(
        "--save-freq",
        type=int,
        default=1,
        help="Save periodic checkpoint every N epochs.",
    )
    parser.add_argument(
        "--resume-from",
        type=Path,
        default=None,
        help="Path to checkpoint .pt file to resume training from.",
    )
    parser.add_argument(
        "--device",
        choices=["auto", "cuda", "cpu"],
        default="auto",
        help="Compute device to use.",
    )
    parser.add_argument(
        "--checkpoint-dir",
        type=Path,
        default=Path("/kaggle/working/models/checkpoints") if is_kaggle else CHECKPOINTS_DIR,
        help="Directory to save model checkpoints.",
    )
    parser.add_argument(
        "--unfreeze-blocks",
        type=int,
        default=2,
        help="Number of DenseNet-121 blocks to fine-tune.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility.",
    )
    parser.add_argument(
        "--allow-cpu",
        action="store_true",
        default=False,
        help="Allow training on CPU (bypasses strict CUDA GPU pre-flight failure).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    check_cuda_preflight(require_gpu=not args.allow_cpu)
    run_training(
        data_source=args.data_source,
        data_root=args.data_root,
        csv_path=args.csv_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        loss_type=args.loss,
        focal_gamma=args.focal_gamma,
        save_freq=args.save_freq,
        resume_from=args.resume_from,
        device_name=args.device,
        checkpoint_dir=args.checkpoint_dir,
        unfreeze_blocks=args.unfreeze_blocks,
        seed=args.seed
    )
