"""
EfficientNet-B0 Multi-Label Chest Radiograph Classifier (Ensemble & Cross-Check Model)
"""

import torch
import torch.nn as nn
import torchvision.models as models
from src.config import TARGET_CLASSES

class PneumoEfficientNet(nn.Module):
    """
    Secondary architecture for ensemble uncertainty estimation and model agreement checks.
    """
    def __init__(
        self,
        num_classes: int = len(TARGET_CLASSES),
        pretrained: bool = True,
        dropout_rate: float = 0.3,
        hidden_dim: int = 256
    ):
        super().__init__()
        weights = models.EfficientNet_B0_Weights.DEFAULT if pretrained else None
        backbone = models.efficientnet_b0(weights=weights)
        
        self.features = backbone.features
        num_features = backbone.classifier[1].in_features
        
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(num_features, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout_rate),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        feats = self.features(x)
        pooled = nn.functional.adaptive_avg_pool2d(feats, (1, 1))
        flattened = torch.flatten(pooled, 1)
        logits = self.classifier(flattened)
        if return_logits:
            return logits
        return torch.sigmoid(logits)
