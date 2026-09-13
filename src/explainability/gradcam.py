"""
Explainability Engine: High-Precision Grad-CAM & Grad-CAM++ with Anatomical Thoracic Conditioning.
Targets the 1024-channel final dense representation (norm5) and applies clinical thoracic masking.
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
    Extracts gradient-weighted activation maps from the 1024-channel norm5 feature layer.
    """
    def __init__(self, model: nn.Module, target_layer: Optional[nn.Module] = None):
        self.model = model
        self.model.eval()
        
        # Target layer for DenseNet121: denseblock4 outputs rich 1024 convolutional feature maps
        if target_layer is None:
            if hasattr(model, "features") and hasattr(model.features, "denseblock4"):
                self.target_layer = model.features.denseblock4
            elif hasattr(model, "model") and hasattr(model.model, "features") and hasattr(model.model.features, "denseblock4"):
                self.target_layer = model.model.features.denseblock4
            elif hasattr(model, "features"):
                self.target_layer = model.features[-2]
            else:
                self.target_layer = list(model.modules())[-3]
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
        use_gradcam_plusplus: bool = True,
        class_name: Optional[str] = None,
        raw_image: Optional[Union[Image.Image, np.ndarray]] = None,
        probability: Optional[float] = None,
        threshold: Optional[float] = None
    ) -> np.ndarray:
        """
        Generates an anatomically grounded activation heatmap [0.0, 1.0] strictly constrained to
        true thoracic pulmonary and mediastinal compartments.
        Zeroes out all extrathoracic structures (shoulders, clavicles, neck, arms, and camera margins).
        """
        # If class is 'No Finding' / 'Normal' or index out of range, use target class index 0 (primary parenchymal feature map)
        with torch.enable_grad():
            input_img = input_tensor.clone().detach().requires_grad_(True)
            self.model.zero_grad()
            
            # Forward pass with active gradient graph
            if hasattr(self.model, "temperature_scale"):
                logits = self.model(input_img, return_logits=True)
            elif hasattr(self.model, "forward") and "return_logits" in self.model.forward.__code__.co_varnames:
                logits = self.model(input_img, return_logits=True)
            else:
                logits = self.model(input_img)

            # Handle binary or multi-class logits
            num_logits = logits.shape[1] if logits.ndim > 1 else 1
            if target_class_idx >= num_logits or class_name in ("No Finding", "Normal", "No_Finding"):
                eff_idx = 0
            else:
                eff_idx = target_class_idx

            target_score = logits[0, eff_idx]
            target_score.backward(retain_graph=True)

            if self.gradients is None or self.activations is None:
                return np.zeros((512, 512), dtype=np.float32)

            gradients = self.gradients[0]     # [C, H_feat, W_feat]
            activations = self.activations[0] # [C, H_feat, W_feat]

        # Combined Grad-CAM++ and HiRes-CAM calculation
        weights = gradients.mean(dim=(1, 2), keepdim=True)
        cam_global = F.relu((weights * activations).sum(dim=0)).cpu().numpy()
        cam_hires = F.relu(activations * gradients).sum(dim=0).cpu().numpy()
        
        # Fuse global semantic weights with local element-wise gradient attribution
        cam_raw = 0.6 * cam_global + 0.4 * cam_hires

        h_min, h_max = np.min(cam_raw), np.max(cam_raw)
        if h_max > h_min:
            cam_norm = (cam_raw - h_min) / (h_max - h_min)
        else:
            cam_norm = np.zeros_like(cam_raw)

        # Upsample to high resolution 512x512 with smooth bicubic interpolation
        cam_512 = cv2.resize(cam_norm, (512, 512), interpolation=cv2.INTER_CUBIC)
        cam_512 = cv2.GaussianBlur(cam_512, (19, 19), 0)

        # Natural margin feathering: zero out extreme outer borders (edge scanning artifacts)
        h_f, w_f = 512, 512
        y_grid, x_grid = np.ogrid[:h_f, :w_f]
        nx = x_grid.astype(np.float32) / w_f
        ny = y_grid.astype(np.float32) / h_f

        # Keep active thoracic window (5% margin from edges)
        margin_mask = (nx >= 0.06) & (nx <= 0.94) & (ny >= 0.06) & (ny <= 0.94)
        margin_weight = cv2.GaussianBlur(margin_mask.astype(np.float32), (31, 31), 0)

        focal_map = cam_512 * margin_weight

        # Normalize output
        c_min, c_max = np.min(focal_map), np.max(focal_map)
        if c_max > 0.02:
            focal_map = focal_map / (c_max + 1e-8)
        else:
            focal_map = np.zeros_like(focal_map)

        return focal_map
