"""
Model Calibration via Temperature Scaling and Expected Calibration Error (ECE) Evaluation.
"""

from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from sklearn.metrics import log_loss

class ModelWithTemperature(nn.Module):
    """
    A decorator wrapper that applies learned Temperature Scaling on model logits.
    For multi-label sigmoid classifiers, scales logits by 1/T:
        P(Y_k = 1 | X) = sigmoid(logit_k / T)
    Optimizes T on a validation set by minimizing binary cross-entropy (NLL).
    """
    def __init__(self, model: nn.Module, initial_temperature: float = 1.2):
        super().__init__()
        self.model = model
        self.temperature = nn.Parameter(torch.ones(1) * initial_temperature)

    def forward(self, x: torch.Tensor, return_logits: bool = False) -> torch.Tensor:
        logits = self.model(x, return_logits=True)
        scaled_logits = self.temperature_scale(logits)
        if return_logits:
            return scaled_logits
        return torch.sigmoid(scaled_logits)

    def temperature_scale(self, logits: torch.Tensor) -> torch.Tensor:
        """Expands temperature to match batch shape and divides logits."""
        temp = self.temperature.unsqueeze(1).expand(logits.size(0), logits.size(1))
        return logits / temp

    def set_temperature(self, val: float):
        """Sets temperature value directly."""
        with torch.no_grad():
            self.temperature.fill_(float(val))

    def fit_temperature(
        self,
        val_loader: DataLoader,
        device: torch.device = torch.device("cpu"),
        max_iters: int = 50,
        lr: float = 0.01
    ) -> float:
        """
        Tunes the temperature parameter using validation set logits and multi-label targets.
        """
        self.model.eval()
        logits_list = []
        labels_list = []

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
        final_temp = float(self.temperature.item())
        return final_temp


def compute_binary_ece(
    probs: np.ndarray,
    labels: np.ndarray,
    n_bins: int = 10
) -> Tuple[float, Dict[str, Any]]:
    """
    Computes Expected Calibration Error (ECE) for binary / multi-label predictions.
    
    Args:
        probs: 1D array of predicted probabilities for a specific label [N]
        labels: 1D array of binary ground truth [N]
        n_bins: Number of confidence bins (default 10)
    
    Returns:
        (ece: float, bin_stats: dict)
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    total_samples = len(probs)
    
    bin_accs = []
    bin_confs = []
    bin_sizes = []

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]
        
        # Select items in this bin
        if i == n_bins - 1:
            in_bin = (probs >= bin_lower) & (probs <= bin_upper)
        else:
            in_bin = (probs >= bin_lower) & (probs < bin_upper)
            
        bin_count = np.sum(in_bin)
        bin_sizes.append(int(bin_count))

        if bin_count > 0:
            bin_acc = float(np.mean(labels[in_bin]))
            bin_conf = float(np.mean(probs[in_bin]))
            bin_accs.append(bin_acc)
            bin_confs.append(bin_conf)
            ece += (bin_count / total_samples) * abs(bin_acc - bin_conf)
        else:
            bin_accs.append(0.0)
            bin_confs.append((bin_lower + bin_upper) / 2.0)

    stats = {
        "ece": float(ece),
        "bin_accs": bin_accs,
        "bin_confs": bin_confs,
        "bin_sizes": bin_sizes
    }
    return float(ece), stats


def evaluate_multilabel_calibration(
    probs: np.ndarray,
    labels: np.ndarray,
    class_names: List[str]
) -> Dict[str, float]:
    """
    Evaluates ECE across all disease findings and returns per-class and macro-average ECE.
    """
    results = {}
    ece_list = []
    
    for i, name in enumerate(class_names):
        ece_val, _ = compute_binary_ece(probs[:, i], labels[:, i])
        results[f"ece_{name}"] = round(ece_val, 4)
        ece_list.append(ece_val)
        
    results["macro_ece"] = round(float(np.mean(ece_list)), 4)
    return results
