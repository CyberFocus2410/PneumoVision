"""
DenseNet-121 Multi-Label Chest Radiograph Classifier
"""

from typing import Optional, List
import torch
import torch.nn as nn
import torchvision.models as models
from src.config import MODEL_OUTPUT_CLASSES, TARGET_CLASSES, MODEL_CONFIG

class PneumoDenseNet(nn.Module):
    """
    Chest X-Ray classifier based on DenseNet-121 architecture.
    Features:
    - Pretrained feature extractor
    - 2-stage MLP classification head with Dropout regularization
    - Supports binary (1 sigmoid output) and multi-label modes
    """
    def __init__(
        self,
        num_classes: int = len(MODEL_OUTPUT_CLASSES),
        pretrained: bool = True,
        dropout_rate: float = 0.3,
        hidden_dim: int = 256
    ):
        super().__init__()
        self.num_classes = num_classes
        
        # Load torchvision DenseNet121 backbone
        weights = models.DenseNet121_Weights.DEFAULT if pretrained else None
        backbone = models.densenet121(weights=weights)
        
        # Extract convolutional features
        self.features = backbone.features
        num_features = backbone.classifier.in_features  # 1024 for DenseNet121
        
        # Global Average Pooling & 2-stage MLP classifier
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout_rate),
            nn.Linear(num_features, hidden_dim),
            nn.ReLU(inplace=False),
            nn.Dropout(p=dropout_rate),
            nn.Linear(hidden_dim, num_classes)
        )
        
    def forward_features(self, x: torch.Tensor) -> torch.Tensor:
        """Returns feature maps from the final dense layer."""
        features = self.features(x)
        out = nn.functional.relu(features, inplace=False)
        return out

    def forward(self, x: torch.Tensor, return_logits: bool = True) -> torch.Tensor:
        """
        Forward pass.
        Args:
            x: [B, 3, H, W] tensor
            return_logits: if True, returns raw logits; if False, returns sigmoid probabilities
        """
        feats = self.forward_features(x)
        pooled = nn.functional.adaptive_avg_pool2d(feats, (1, 1))
        flattened = torch.flatten(pooled, 1)
        logits = self.classifier(flattened)
        
        if return_logits:
            return logits
        return torch.sigmoid(logits)

    def freeze_early_layers(self, unfreeze_last_blocks: int = 2):
        """Freezes initial layers, keeping the specified last dense blocks trainable."""
        for param in self.features.parameters():
            param.requires_grad = False
            
        # Unfreeze denseblock3 & denseblock4 if unfreeze_last_blocks >= 2
        trainable_layers = [f"denseblock{i}" for i in range(5 - unfreeze_last_blocks, 5)]
        trainable_layers.extend([f"transition{i}" for i in range(4 - unfreeze_last_blocks, 4)])
        trainable_layers.append("norm5")
        
        for name, child in self.features.named_children():
            if any(t in name for t in trainable_layers):
                for param in child.parameters():
                    param.requires_grad = True
                    
        # Always train the classification head
        for param in self.classifier.parameters():
            param.requires_grad = True
