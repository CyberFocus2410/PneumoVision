"""
Explainability Engine: Grad-CAM and Grad-CAM++ Implementations for Multi-Label CNNs.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import cv2
from PIL import Image

class PneumoGradCAM:
    """
    Grad-CAM & Grad-CAM++ implementation for DenseNet-121 and convolutional architectures.
    Extracts gradient-weighted activation maps for arbitrary disease target classes.
    """
    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()
        
        # Default target layer for DenseNet121: final dense block convolution
        if target_layer is None:
            if hasattr(model, "features"):
                self.target_layer = model.features.denseblock4.denselayer16.conv2
            elif hasattr(model, "model") and hasattr(model.model, "features"):
                self.target_layer = model.model.features.denseblock4.denselayer16.conv2
            else:
                raise ValueError("Could not automatically locate target convolutional layer.")
        else:
            self.target_layer = target_layer

        self.activations: Optional[torch.Tensor] = None
        self.gradients: Optional[torch.Tensor] = None
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.detach()

        def backward_hook(module, grad_in, grad_out):
            self.gradients = grad_out[0].detach()

        self.target_layer.register_forward_hook(forward_hook)
        self.target_layer.register_full_backward_hook(backward_hook)

    def generate_heatmap(
        self,
        input_tensor: torch.Tensor,
        target_class_idx: int,
        use_gradcam_plusplus: bool = True
    ) -> np.ndarray:
        """
        Generates 2D normalized activation heatmap [0.0, 1.0] for the specified class index.
        
        Args:
            input_tensor: [1, 3, H, W] preprocessed PyTorch image tensor
            target_class_idx: integer index of the target disease finding
            use_gradcam_plusplus: whether to use Grad-CAM++ (higher spatial detail) or vanilla Grad-CAM
        """
        self.model.zero_grad()
        
        # Forward pass (get raw logits)
        if hasattr(self.model, "temperature_scale"):
            logits = self.model(input_tensor, return_logits=True)
        else:
            logits = self.model(input_tensor)
            
        target_score = logits[0, target_class_idx]
        target_score.backward(retain_graph=True)

        gradients = self.gradients[0]     # [C, H_feat, W_feat]
        activations = self.activations[0] # [C, H_feat, W_feat]

        if use_gradcam_plusplus:
            # Grad-CAM++ second and third order gradient weighting
            grad_2 = gradients.pow(2)
            grad_3 = gradients.pow(3)
            sum_activations = torch.sum(activations, dim=(1, 2), keepdim=True)
            
            # Avoid division by zero
            eps = 1e-8
            alpha = grad_2 / (2 * grad_2 + sum_activations * grad_3 + eps)
            alpha = torch.where(grad_2 != 0, alpha, torch.zeros_like(alpha))
            
            positive_grads = F.relu(gradients)
            weights = torch.sum(alpha * positive_grads, dim=(1, 2))
        else:
            # Standard Grad-CAM: Global Average Pooling of gradients
            weights = torch.mean(gradients, dim=(1, 2))

        # Weighted combination of forward activation maps
        cam = torch.zeros(activations.shape[1:], dtype=torch.float32, device=activations.device)
        for i, w in enumerate(weights):
            cam += w * activations[i]

        # Pass through ReLU to keep only positive influence
        cam = F.relu(cam)
        cam_np = cam.cpu().numpy()

        # Min-max normalization
        cam_min, cam_max = np.min(cam_np), np.max(cam_np)
        if cam_max > cam_min:
            cam_np = (cam_np - cam_min) / (cam_max - cam_min)
        else:
            cam_np = np.zeros_like(cam_np)

        return cam_np
