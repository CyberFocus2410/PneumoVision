"""
Loss Functions for Imbalanced Multi-Label Chest Radiograph Classification.
"""

from typing import Optional
import torch
import torch.nn as nn
import torch.nn.functional as F

class WeightedBCEWithLogitsLoss(nn.Module):
    """
    Class-weighted Binary Cross Entropy loss to counter severe multi-label imbalance.
    pos_weight = (N_neg / N_pos) per finding class.
    """
    def __init__(self, pos_weight: Optional[torch.Tensor] = None):
        super().__init__()
        self.criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        return self.criterion(logits, targets)


class MultiLabelFocalLoss(nn.Module):
    """
    Focal Loss adapted for Multi-label Sigmoid outputs:
    FL(p_t) = -alpha_t * (1 - p_t)^gamma * log(p_t)
    Downweights easy negative examples and focuses learning on hard positive pathological cases.
    """
    def __init__(
        self,
        gamma: float = 2.0,
        alpha: Optional[torch.Tensor] = None,
        reduction: str = "mean"
    ):
        super().__init__()
        self.gamma = gamma
        self.alpha = alpha
        self.reduction = reduction

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        probs = torch.sigmoid(logits)
        # Compute p_t
        p_t = probs * targets + (1 - probs) * (1 - targets)
        bce_loss = F.binary_cross_entropy_with_logits(logits, targets, reduction="none")
        
        # Focal modulating factor
        focal_factor = (1.0 - p_t).pow(self.gamma)
        
        loss = focal_factor * bce_loss
        
        if self.alpha is not None:
            alpha_t = self.alpha * targets + (1 - self.alpha) * (1 - targets)
            loss = alpha_t * loss

        if self.reduction == "mean":
            return loss.mean()
        elif self.reduction == "sum":
            return loss.sum()
        return loss
