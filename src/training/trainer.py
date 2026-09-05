"""
Comprehensive Model Trainer for PneumoVision
Handles multi-label optimization, Macro-AUROC tracking, Early Stopping,
Temperature Calibration, and Checkpoint Packaging.
"""

from typing import Dict, List, Optional, Tuple
from pathlib import Path
import json
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from sklearn.metrics import roc_auc_score, average_precision_score

from src.models.densenet import PneumoDenseNet
from src.models.calibration import ModelWithTemperature, evaluate_multilabel_calibration
from src.training.losses import WeightedBCEWithLogitsLoss, MultiLabelFocalLoss
from src.training.threshold_tuner import optimize_decision_thresholds
from src.config import TARGET_CLASSES, TRAIN_CONFIG, CHECKPOINTS_DIR

class PneumoTrainer:
    def __init__(
        self,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        target_classes: List[str] = TARGET_CLASSES,
        lr: float = TRAIN_CONFIG["learning_rate"],
        weight_decay: float = TRAIN_CONFIG["weight_decay"],
        focal_gamma: float = TRAIN_CONFIG["focal_gamma"],
        use_focal_loss: bool = True,
        pos_weight: Optional[torch.Tensor] = None,
        device: Optional[torch.device] = None
    ):
        self.device = device or (torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu"))
        self.model = model.to(self.device)
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.target_classes = target_classes
        
        # Loss function selection
        if use_focal_loss:
            self.criterion = MultiLabelFocalLoss(gamma=focal_gamma)
        else:
            self.criterion = WeightedBCEWithLogitsLoss(pos_weight=pos_weight.to(self.device) if pos_weight is not None else None)

        # AdamW Optimizer with weight decay
        self.optimizer = optim.AdamW(
            filter(lambda p: p.requires_grad, self.model.parameters()),
            lr=lr,
            weight_decay=weight_decay
        )

        self.history: Dict[str, List[float]] = {
            "train_loss": [], "val_loss": [], "val_macro_auroc": [], "val_macro_auprc": []
        }
        self.best_macro_auroc = 0.0
        self.best_checkpoint_path = CHECKPOINTS_DIR / "best_model.pt"

    def train_epoch(self) -> float:
        self.model.train()
        running_loss = 0.0
        total_batches = len(self.train_loader)

        for images, targets in self.train_loader:
            images = images.to(self.device)
            targets = targets.to(self.device)

            self.optimizer.zero_grad()
            logits = self.model(images, return_logits=True)
            loss = self.criterion(logits, targets)
            loss.backward()
            
            # Gradient clipping for numerical stability
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            running_loss += loss.item()

        return running_loss / max(1, total_batches)

    def evaluate(self, loader: DataLoader) -> Tuple[float, np.ndarray, np.ndarray, Dict[str, float]]:
        self.model.eval()
        running_loss = 0.0
        all_probs = []
        all_targets = []

        with torch.no_grad():
            for images, targets in loader:
                images = images.to(self.device)
                targets = targets.to(self.device)

                logits = self.model(images, return_logits=True)
                loss = self.criterion(logits, targets)
                running_loss += loss.item()

                probs = torch.sigmoid(logits)
                all_probs.append(probs.cpu().numpy())
                all_targets.append(targets.cpu().numpy())

        val_loss = running_loss / max(1, len(loader))
        probs_array = np.vstack(all_probs)
        targets_array = np.vstack(all_targets)

        # Compute per-class AUROC and AUPRC
        metrics = {}
        auroc_list = []
        auprc_list = []

        for i, cls_name in enumerate(self.target_classes):
            # Safe AUROC computation even if single class in batch
            try:
                if len(np.unique(targets_array[:, i])) > 1:
                    auroc = float(roc_auc_score(targets_array[:, i], probs_array[:, i]))
                    auprc = float(average_precision_score(targets_array[:, i], probs_array[:, i]))
                else:
                    auroc = 0.5
                    auprc = 0.0
            except Exception:
                auroc = 0.5
                auprc = 0.0

            metrics[f"auroc_{cls_name}"] = round(auroc, 4)
            metrics[f"auprc_{cls_name}"] = round(auprc, 4)
            auroc_list.append(auroc)
            auprc_list.append(auprc)

        metrics["macro_auroc"] = round(float(np.mean(auroc_list)), 4)
        metrics["macro_auprc"] = round(float(np.mean(auprc_list)), 4)

        return val_loss, probs_array, targets_array, metrics

    def fit(self, epochs: int = TRAIN_CONFIG["epochs"], patience: int = TRAIN_CONFIG["patience"]):
        scheduler = optim.lr_scheduler.CosineAnnealingLR(self.optimizer, T_max=epochs, eta_min=1e-6)
        no_improve_epochs = 0

        for epoch in range(1, epochs + 1):
            t0 = time.time()
            train_loss = self.train_epoch()
            val_loss, val_probs, val_targets, metrics = self.evaluate(self.val_loader)
            scheduler.step()

            macro_auroc = metrics["macro_auroc"]
            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)
            self.history["val_macro_auroc"].append(macro_auroc)
            self.history["val_macro_auprc"].append(metrics["macro_auprc"])

            elapsed = time.time() - t0
            print(f"Epoch [{epoch:02d}/{epochs:02d}] ({elapsed:.1f}s) | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Macro AUROC: {macro_auroc:.4f}")

            # Checkpoint on best validation macro-AUROC
            if macro_auroc > self.best_macro_auroc:
                self.best_macro_auroc = macro_auroc
                no_improve_epochs = 0
                self.save_checkpoint(metrics, val_probs, val_targets)
            else:
                no_improve_epochs += 1
                if no_improve_epochs >= patience:
                    print(f"Early stopping triggered at epoch {epoch} (no improvement for {patience} epochs).")
                    break

        # Run Post-Training Calibration and Threshold Sweep
        print("\n=== Post-Training Temperature Scaling & Calibration ===")
        calibrated_model = ModelWithTemperature(self.model)
        learned_temp = calibrated_model.fit_temperature(self.val_loader, device=self.device)
        print(f"Learned Temperature Scalar: T = {learned_temp:.4f}")

        # Re-evaluate with calibrated model
        _, cal_probs, cal_targets, cal_metrics = self.evaluate(self.val_loader)
        ece_results = evaluate_multilabel_calibration(cal_probs, cal_targets, self.target_classes)
        print(f"Post-calibration Macro ECE: {ece_results['macro_ece']:.4f}")

        # Optimize Thresholds
        tuned_thresholds = optimize_decision_thresholds(cal_probs, cal_targets, self.target_classes)
        print("Tuned Decision Thresholds:", tuned_thresholds)

        # Finalize and update checkpoint with calibration & thresholds
        self.save_checkpoint(
            metrics=cal_metrics,
            val_probs=cal_probs,
            val_targets=cal_targets,
            temperature=learned_temp,
            tuned_thresholds=tuned_thresholds,
            ece_results=ece_results
        )

    def save_checkpoint(
        self,
        metrics: Dict[str, float],
        val_probs: np.ndarray,
        val_targets: np.ndarray,
        temperature: float = 1.0,
        tuned_thresholds: Optional[Dict] = None,
        ece_results: Optional[Dict] = None
    ):
        checkpoint = {
            "model_state_dict": self.model.state_dict(),
            "target_classes": self.target_classes,
            "metrics": metrics,
            "temperature": temperature,
            "thresholds": tuned_thresholds or {},
            "ece_results": ece_results or {},
            "macro_auroc": metrics.get("macro_auroc", 0.0)
        }
        torch.save(checkpoint, self.best_checkpoint_path)
        
        # Save JSON metadata for lightweight API access
        meta_path = CHECKPOINTS_DIR / "model_metadata.json"
        with open(meta_path, "w") as f:
            json.dump({
                "model_name": "PneumoDenseNet121",
                "target_classes": self.target_classes,
                "metrics": metrics,
                "temperature": temperature,
                "thresholds": tuned_thresholds or {},
                "ece_results": ece_results or {}
            }, f, indent=2)
