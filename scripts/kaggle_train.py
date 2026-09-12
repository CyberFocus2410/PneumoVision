#!/usr/bin/env python
"""
PneumoVision — Standalone Self-Contained Kaggle GPU Training Script.
Bundles all model architectures, data loaders, focal loss, calibration, and training loops
into a single production-ready script for Kaggle kernel execution.
"""

import argparse
import json
import logging
import os
import re
import shutil
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
import pandas as pd
from PIL import Image
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torchvision.models as models
import torchvision.transforms as transforms

# ---------------------------------------------------------------------------
# Configuration & Constants
# ---------------------------------------------------------------------------
TARGET_CLASSES = ["Pneumonia"]
IMG_SIZE = (320, 320)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kaggle_train")


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
                "Ensure GPU accelerator is enabled in Kaggle kernel metadata.\n"
                + "!" * 65 + "\n"
            )
            print(err_msg, file=sys.stderr, flush=True)
            sys.exit(1)
        else:
            print("[WARNING] Proceeding in CPU mode (--allow-cpu specified).")
    return cuda_available


# ---------------------------------------------------------------------------
# Image Transforms & CLAHE Preprocessing
# ---------------------------------------------------------------------------
class CLAHETransform:
    def __init__(self, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8)):
        self.clip_limit = clip_limit
        self.tile_grid_size = tile_grid_size

    def __call__(self, img: Image.Image) -> Image.Image:
        img_np = np.array(img)
        if len(img_np.shape) == 2:
            clahe = cv2.createCLAHE(clipLimit=self.clip_limit, tileGridSize=self.tile_grid_size)
            enhanced = clahe.apply(img_np)
            return Image.fromarray(enhanced).convert("RGB")
        elif len(img_np.shape) == 3:
            lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
            clahe = cv2.createCLAHE(clipLimit=self.clip_limit, tileGridSize=self.tile_grid_size)
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            return Image.fromarray(enhanced)
        return img


def get_training_transforms(img_size: Tuple[int, int] = IMG_SIZE, apply_clahe: bool = True):
    t_list = []
    if apply_clahe:
        t_list.append(CLAHETransform(clip_limit=2.0))
    t_list.extend([
        transforms.Resize(img_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    return transforms.Compose(t_list)


def get_inference_transforms(img_size: Tuple[int, int] = IMG_SIZE, apply_clahe: bool = True):
    t_list = []
    if apply_clahe:
        t_list.append(CLAHETransform(clip_limit=2.0))
    t_list.extend([
        transforms.Resize(img_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
    ])
    return transforms.Compose(t_list)


# ---------------------------------------------------------------------------
# Dataset Loader & Patient Splitting
# ---------------------------------------------------------------------------
PATIENT_ID_PATTERN = re.compile(r"^(person\d+)", re.IGNORECASE)


def extract_patient_id(filename: str) -> Tuple[str, bool]:
    stem = Path(filename).stem
    match = PATIENT_ID_PATTERN.match(stem)
    if match:
        return match.group(1).lower(), True
    return filename, False


def load_pneumonia_binary_dataset(data_root: Union[str, Path]) -> pd.DataFrame:
    root = Path(data_root).resolve()
    if (root / "chest_xray").is_dir():
        root = root / "chest_xray"

    logger.info(f"Scanning dataset from resolved path: {root}")
    records = []
    splits = ["train", "test", "val"]
    unreliable_count = 0
    reliable_count = 0

    for split in splits:
        split_dir = root / split
        if not split_dir.is_dir():
            continue

        for class_dir in split_dir.iterdir():
            if not class_dir.is_dir():
                continue

            class_name = class_dir.name.upper()
            if "PNEUMONIA" in class_name:
                is_pna = 1
                is_normal = 0
            elif "NORMAL" in class_name:
                is_pna = 0
                is_normal = 1
            else:
                continue

            for entry in class_dir.iterdir():
                if entry.is_file() and entry.suffix.lower() in (".jpeg", ".jpg", ".png"):
                    image_id = entry.name
                    pid, is_reliable = extract_patient_id(image_id)
                    if is_reliable:
                        reliable_count += 1
                    else:
                        unreliable_count += 1

                    records.append({
                        "image_id": image_id,
                        "patient_id": pid,
                        "Pneumonia": is_pna,
                        "No_Finding": is_normal,
                        "source_dataset": "kaggle_pneumonia_binary",
                        "image_path": str(entry.resolve()),
                        "original_split": split,
                    })

    df = pd.DataFrame(records)
    logger.info(f"Loaded {len(df)} images across {df['patient_id'].nunique()} patient IDs. Reliable: {reliable_count}, Fallback: {unreliable_count}")
    return df


def pneumonia_binary_patient_split(
    df: pd.DataFrame,
    train_ratio: float = 0.85,
    seed: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    rng = np.random.RandomState(seed)
    test_df = df[df["original_split"] == "test"].reset_index(drop=True)
    train_val_pool = df[df["original_split"].isin(["train", "val"])].reset_index(drop=True)

    is_fallback = (train_val_pool["patient_id"] == train_val_pool["image_id"])
    reliable_df = train_val_pool[~is_fallback].reset_index(drop=True)
    fallback_df = train_val_pool[is_fallback].reset_index(drop=True)

    train_p, val_p = set(), set()
    train_reliable, val_reliable = pd.DataFrame(columns=df.columns), pd.DataFrame(columns=df.columns)

    if not reliable_df.empty:
        patient_summary = reliable_df.groupby("patient_id")["Pneumonia"].max().reset_index()
        patients = patient_summary["patient_id"].values.copy()
        rng.shuffle(patients)

        n_p = len(patients)
        n_train_p = int(round(n_p * train_ratio))
        if n_p >= 2 and n_train_p >= n_p:
            n_train_p = n_p - 1

        train_p = set(patients[:n_train_p])
        val_p = set(patients[n_train_p:])
        train_reliable = reliable_df[reliable_df["patient_id"].isin(train_p)]
        val_reliable = reliable_df[reliable_df["patient_id"].isin(val_p)]

    train_fallback, val_fallback = pd.DataFrame(columns=df.columns), pd.DataFrame(columns=df.columns)
    if not fallback_df.empty:
        fallback_indices = np.arange(len(fallback_df))
        rng.shuffle(fallback_indices)
        n_f = len(fallback_df)
        n_train_f = int(round(n_f * train_ratio))
        if n_f >= 2 and n_train_f >= n_f:
            n_train_f = n_f - 1

        train_fallback = fallback_df.iloc[fallback_indices[:n_train_f]]
        val_fallback = fallback_df.iloc[fallback_indices[n_train_f:]]

    train_df = pd.concat([train_reliable, train_fallback], ignore_index=True)
    val_df = pd.concat([val_reliable, val_fallback], ignore_index=True)

    if val_df.empty and len(train_df) >= 2:
        val_df = train_df.iloc[-1:].reset_index(drop=True)
        train_df = train_df.iloc[:-1].reset_index(drop=True)

    print("=" * 60)
    print("  PATIENT-STRATIFIED SPLIT AUDIT")
    print("=" * 60)
    print(f"[*] Total Raw Rows:       {len(df)}")
    print(f"[*] Held-out Test Rows:   {len(test_df)} (Pneumonia: {(test_df['Pneumonia']==1).sum()}, Normal: {(test_df['No_Finding']==1).sum()})")
    print(f"[*] Final Train Set:      {len(train_df)} images (Pneumonia: {(train_df['Pneumonia']==1).sum()}, Normal: {(train_df['No_Finding']==1).sum()})")
    print(f"[*] Final Val Set:        {len(val_df)} images (Pneumonia: {(val_df['Pneumonia']==1).sum()}, Normal: {(val_df['No_Finding']==1).sum()})")
    print("=" * 60)
    return train_df, val_df, test_df


class ChestXrayDataset(Dataset):
    def __init__(self, df: pd.DataFrame, target_classes: List[str] = TARGET_CLASSES, is_training: bool = False):
        self.df = df.reset_index(drop=True)
        self.target_classes = target_classes
        self.transform = get_training_transforms() if is_training else get_inference_transforms()

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        row = self.df.iloc[idx]
        image_path = Path(str(row["image_path"]))
        if image_path.exists():
            pil_img = Image.open(image_path).convert("RGB")
        else:
            pil_img = Image.new("RGB", IMG_SIZE, color=(128, 128, 128))

        tensor_img = self.transform(pil_img)
        labels = [float(row.get(cls_name, 0.0)) for cls_name in self.target_classes]
        return tensor_img, torch.tensor(labels, dtype=torch.float32)


# ---------------------------------------------------------------------------
# Model Architecture (PneumoDenseNet)
# ---------------------------------------------------------------------------
class PneumoDenseNet(nn.Module):
    def __init__(self, num_classes: int = 1, pretrained: bool = True, dropout_rate: float = 0.3, hidden_dim: int = 256):
        super().__init__()
        self.num_classes = num_classes
        
        backbone = None
        if pretrained:
            try:
                weights = models.DenseNet121_Weights.DEFAULT
                backbone = models.densenet121(weights=weights)
                print("[*] Successfully loaded pretrained ImageNet DenseNet-121 weights.")
            except Exception as e:
                print(f"[!] Pretrained weight download failed or offline ({e}). Using initialized DenseNet-121 weights.")
                backbone = models.densenet121(weights=None)
        else:
            backbone = models.densenet121(weights=None)

        self.features = backbone.features
        num_features = backbone.classifier.in_features

        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(num_features, hidden_dim),
            nn.ReLU(inplace=False),
            nn.Dropout(p=dropout_rate),
            nn.Linear(hidden_dim, num_classes),
        )

    def forward_features(self, x: torch.Tensor) -> torch.Tensor:
        features = self.features(x)
        return F.relu(features, inplace=False)

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        feats = self.forward_features(x)
        pooled = F.adaptive_avg_pool2d(feats, (1, 1))
        flattened = torch.flatten(pooled, 1)
        logits = self.classifier(flattened)
        if return_logits:
            return logits
        return torch.sigmoid(logits)

    def freeze_early_layers(self, unfreeze_last_blocks: int = 2):
        for param in self.features.parameters():
            param.requires_grad = False

        trainable_layers = [f"denseblock{i}" for i in range(5 - unfreeze_last_blocks, 5)]
        trainable_layers.extend([f"transition{i}" for i in range(4 - unfreeze_last_blocks, 4)])
        trainable_layers.append("norm5")

        for name, child in self.features.named_children():
            if any(t in name for t in trainable_layers):
                for param in child.parameters():
                    param.requires_grad = True

        for param in self.classifier.parameters():
            param.requires_grad = True


# ---------------------------------------------------------------------------
# Loss Functions & Calibration
# ---------------------------------------------------------------------------
class MultiLabelFocalLoss(nn.Module):
    def __init__(self, gamma: float = 2.0, alpha: Optional[torch.Tensor] = None):
        super().__init__()
        self.gamma = gamma
        self.alpha = alpha

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        p_t = probs * targets + (1.0 - probs) * (1.0 - targets)
        bce_loss = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")
        focal_factor = (1.0 - p_t).pow(self.gamma)
        loss = focal_factor * bce_loss

        if self.alpha is not None:
            alpha_t = self.alpha * targets + (1.0 - self.alpha) * (1.0 - targets)
            loss = alpha_t * loss

        return loss.mean()


class ModelWithTemperature(nn.Module):
    def __init__(self, model: nn.Module, initial_temperature: float = 1.2):
        super().__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1) * initial_temperature)

    def temperature_scale(self, logits: torch.Tensor) -> torch.Tensor:
        temp = self.temperature.unsqueeze(1).expand(logits.size(0), logits.size(1))
        return logits / temp

    def fit_temperature(self, val_loader: DataLoader, device: torch.device, max_iters: int = 50, lr: float = 0.01) -> float:
        self.model.eval()
        logits_list, labels_list = [], []
        with torch.no_grad():
            for images, targets in val_loader:
                images = images.to(device)
                logits = self.model(images, return_logits=True)
                logits_list.append(logits.cpu())
                labels_list.append(targets.cpu())

        logits = torch.cat(logits_list).to(device)
        labels = torch.cat(labels_list).to(device).float()

        criterion = nn.BCEWithLogitsLoss()
        optimizer = optim.LBFGS([self.temperature], lr=lr, max_iter=max_iters)

        def eval_step():
            optimizer.zero_grad()
            loss = criterion(self.temperature_scale(logits), labels)
            loss.backward()
            return loss

        optimizer.step(eval_step)
        return float(self.temperature.item())


def optimize_decision_thresholds(probs: np.ndarray, labels: np.ndarray, class_names: List[str]) -> Dict:
    threshold_grid = np.linspace(0.10, 0.90, 81)
    optimal_results = {}
    for i, cls_name in enumerate(class_names):
        cls_probs = probs[:, i]
        cls_labels = labels[:, i]
        best_th, best_f1, best_prec, best_rec = 0.5, -1.0, 0.0, 0.0

        for th in threshold_grid:
            preds = (cls_probs >= th).astype(int)
            tp = np.sum((preds == 1) & (cls_labels == 1))
            fp = np.sum((preds == 1) & (cls_labels == 0))
            fn = np.sum((preds == 0) & (cls_labels == 1))
            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

            if f1 > best_f1:
                best_f1, best_th, best_prec, best_rec = f1, th, prec, rec

        optimal_results[cls_name] = {
            "threshold": round(float(best_th), 2),
            "f1": round(float(best_f1), 4),
            "precision": round(float(best_prec), 4),
            "recall": round(float(best_rec), 4),
        }
    return optimal_results


# ---------------------------------------------------------------------------
# Training Orchestrator
# ---------------------------------------------------------------------------
def run_kaggle_training(
    epochs: int = 8,
    batch_size: int = 16,
    lr: float = 1e-4,
    focal_gamma: float = 2.0,
    save_freq: int = 1,
    checkpoint_dir: Path = Path("/kaggle/working/models/checkpoints"),
):
    print("=" * 65)
    print("  PNEUMOVISION KAGGLE GPU TRAINING PIPELINE")
    print("=" * 65)

    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[*] Compute Device: {device}")
    if torch.cuda.is_available():
        print(f"[*] GPU Model: {torch.cuda.get_device_name(0)}")

    # 1. Locate Dataset
    candidates = [
        Path("/kaggle/input/chest-xray-pneumonia/chest_xray"),
        Path("/kaggle/input/chest-xray-pneumonia"),
        Path("/kaggle/input/chest-xray-images-pneumonia/chest_xray"),
        Path("/kaggle/input/chest_xray"),
        Path("data/raw/chest_xray"),
        Path("tests/fixtures/chest_xray"),
    ]
    data_root = None
    for c in candidates:
        if c.exists():
            data_root = c
            break

    # Dynamic fallback scan under /kaggle/input
    if not data_root and Path("/kaggle/input").exists():
        print("[*] Performing dynamic search under /kaggle/input ...")
        for root, dirs, _ in os.walk("/kaggle/input"):
            subdirs = [d.lower() for d in dirs]
            if "train" in subdirs and ("test" in subdirs or "val" in subdirs):
                data_root = Path(root)
                break
            if "chest_xray" in subdirs:
                data_root = Path(root) / "chest_xray"
                break

    if not data_root or not data_root.exists():
        input_contents = list(Path("/kaggle/input").glob("**/*")) if Path("/kaggle/input").exists() else []
        raise FileNotFoundError(f"Could not locate Kaggle chest_xray dataset under /kaggle/input/. Found paths: {input_contents[:10]}")

    print(f"[*] Dataset Root: {data_root}")
    df = load_pneumonia_binary_dataset(data_root)

    # 2. Patient-Stratified Split
    train_df, val_df, test_df = pneumonia_binary_patient_split(df, train_ratio=0.85, seed=42)

    # 3. DataLoaders
    train_dataset = ChestXrayDataset(train_df, is_training=True)
    val_dataset = ChestXrayDataset(val_df, is_training=False)
    test_dataset = ChestXrayDataset(test_df, is_training=False)

    num_workers = 2 if os.name != "nt" else 0
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    # 4. Model & Optimizer
    model = PneumoDenseNet(num_classes=1, pretrained=True).to(device)
    model.freeze_early_layers(unfreeze_last_blocks=2)

    criterion = MultiLabelFocalLoss(gamma=focal_gamma)
    optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

    # 5. Training Loop
    best_val_auroc = 0.0
    history = {"train_loss": [], "val_loss": [], "val_auroc": []}

    print("\n[*] Starting Training Loop on GPU...")
    for epoch in range(1, epochs + 1):
        t0 = time.time()
        model.train()
        train_loss = 0.0

        for images, targets in train_loader:
            images, targets = images.to(device), targets.to(device)
            optimizer.zero_grad()
            logits = model(images, return_logits=True)
            loss = criterion(logits, targets)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            train_loss += loss.item()

        train_loss /= max(1, len(train_loader))
        scheduler.step()

        # Validation
        model.eval()
        val_loss = 0.0
        val_probs, val_targets = [], []
        with torch.no_grad():
            for images, targets in val_loader:
                images, targets = images.to(device), targets.to(device)
                logits = model(images, return_logits=True)
                loss = criterion(logits, targets)
                val_loss += loss.item()
                val_probs.append(torch.sigmoid(logits).cpu().numpy())
                val_targets.append(targets.cpu().numpy())

        val_loss /= max(1, len(val_loader))
        val_probs_arr = np.vstack(val_probs)
        val_targets_arr = np.vstack(val_targets)

        try:
            val_auroc = float(roc_auc_score(val_targets_arr, val_probs_arr))
            val_auprc = float(average_precision_score(val_targets_arr, val_probs_arr))
        except Exception:
            val_auroc, val_auprc = 0.5, 0.0

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["val_auroc"].append(val_auroc)

        elapsed = time.time() - t0
        print(f"Epoch [{epoch:02d}/{epochs:02d}] ({elapsed:.1f}s) | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val AUROC: {val_auroc:.4f} | Val AUPRC: {val_auprc:.4f}")

        # Checkpoint saving
        is_best = val_auroc > best_val_auroc
        if is_best:
            best_val_auroc = val_auroc

        chk_data = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "target_classes": TARGET_CLASSES,
            "macro_auroc": val_auroc,
            "best_macro_auroc": best_val_auroc,
            "history": history,
        }

        # Save latest and periodic
        torch.save(chk_data, checkpoint_dir / "latest_checkpoint.pt")
        if save_freq > 0 and (epoch % save_freq == 0 or epoch == epochs):
            torch.save(chk_data, checkpoint_dir / f"checkpoint_epoch_{epoch:02d}.pt")
        if is_best:
            torch.save(chk_data, checkpoint_dir / "best_model.pt")

    # 6. Post-Training Calibration & Threshold Tuning
    print("\n=== Post-Training Temperature Scaling & Calibration ===")
    cal_model = ModelWithTemperature(model)
    try:
        learned_temp = cal_model.fit_temperature(val_loader, device=device)
        print(f"Learned Temperature: T = {learned_temp:.4f}")
    except Exception as e:
        print(f"Calibration notice: {e}")
        learned_temp = 1.0

    tuned_thresholds = optimize_decision_thresholds(val_probs_arr, val_targets_arr, TARGET_CLASSES)
    print("Tuned Operating Thresholds:", tuned_thresholds)

    # Save final metadata
    with open(checkpoint_dir / "model_metadata.json", "w") as f:
        json.dump({
            "model_name": "PneumoDenseNet121_KaggleGPU",
            "target_classes": TARGET_CLASSES,
            "best_val_auroc": best_val_auroc,
            "temperature": learned_temp,
            "thresholds": tuned_thresholds,
            "epochs": epochs,
            "final_val_loss": val_loss,
        }, f, indent=2)

    # 7. Final Evaluation on Held-Out Test Set
    print("\n" + "=" * 65)
    print("  FINAL EVALUATION ON HELD-OUT TEST SET")
    print("=" * 65)
    test_probs, test_targets = [], []
    model.eval()
    with torch.no_grad():
        for images, targets in test_loader:
            images = images.to(device)
            logits = model(images, return_logits=True)
            test_probs.append(torch.sigmoid(logits).cpu().numpy())
            test_targets.append(targets.numpy())

    test_probs_arr = np.vstack(test_probs)
    test_targets_arr = np.vstack(test_targets)

    try:
        test_auroc = float(roc_auc_score(test_targets_arr, test_probs_arr))
        test_auprc = float(average_precision_score(test_targets_arr, test_probs_arr))
    except Exception:
        test_auroc, test_auprc = 0.5, 0.0

    # Binary accuracy, sensitivity, specificity at tuned threshold
    op_th = tuned_thresholds["Pneumonia"]["threshold"]
    preds = (test_probs_arr[:, 0] >= op_th).astype(int)
    labels = test_targets_arr[:, 0].astype(int)
    tp = np.sum((preds == 1) & (labels == 1))
    fp = np.sum((preds == 1) & (labels == 0))
    tn = np.sum((preds == 0) & (labels == 0))
    fn = np.sum((preds == 0) & (labels == 1))
    sens = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    spec = tn / (tn + fp) if (tn + fp) > 0 else 0.0
    acc = (tp + tn) / len(labels) if len(labels) > 0 else 0.0

    print(f"  - Test AUROC:       {test_auroc:.4f}")
    print(f"  - Test AUPRC:       {test_auprc:.4f}")
    print(f"  - Accuracy:         {acc:.4f}")
    print(f"  - Sensitivity:      {sens:.4f}")
    print(f"  - Specificity:      {spec:.4f}")
    print("=" * 65)

    print(f"\n[OK] Training Complete! Checkpoints and metadata saved in: {checkpoint_dir}")


if __name__ == "__main__":
    check_cuda_preflight(require_gpu=True)
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--focal-gamma", type=float, default=2.0)
    parser.add_argument("--save-freq", type=int, default=1)
    args = parser.parse_args()

    run_kaggle_training(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        focal_gamma=args.focal_gamma,
        save_freq=args.save_freq,
    )
