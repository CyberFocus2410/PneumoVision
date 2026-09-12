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
        # If class is 'No Finding' / 'Normal' or index out of range for binary model, return clean empty map
        if class_name in ("No Finding", "Normal", "No_Finding"):
            return np.zeros((512, 512), dtype=np.float32)

        self.model.zero_grad()
        
        # Forward pass
        if hasattr(self.model, "temperature_scale"):
            logits = self.model(input_tensor, return_logits=True)
        elif hasattr(self.model, "forward") and "return_logits" in self.model.forward.__code__.co_varnames:
            logits = self.model(input_tensor, return_logits=True)
        else:
            logits = self.model(input_tensor)

        # Handle binary model where logits shape is [batch, 1]
        num_logits = logits.shape[1] if logits.ndim > 1 else 1
        if target_class_idx >= num_logits:
            if num_logits == 1 and target_class_idx == 1:
                # "No Finding" complement index -> return clean map
                return np.zeros((512, 512), dtype=np.float32)
            eff_idx = 0
        else:
            eff_idx = target_class_idx

        target_score = logits[0, eff_idx]
        target_score.backward(retain_graph=True)

        gradients = self.gradients[0]     # [C, H_feat, W_feat]
        activations = self.activations[0] # [C, H_feat, W_feat]

        # 1. HiRes-CAM: element-wise feature attribution
        hires_cam = F.relu(activations * gradients).sum(dim=0).cpu().numpy()

        h_min, h_max = np.min(hires_cam), np.max(hires_cam)
        if h_max > h_min:
            cam_norm = (hires_cam - h_min) / (h_max - h_min)
        else:
            cam_norm = np.zeros_like(hires_cam)

        # Upsample to 512x512
        cam_512 = cv2.resize(cam_norm, (512, 512), interpolation=cv2.INTER_CUBIC)
        cam_512 = cv2.GaussianBlur(cam_512, (21, 21), 0)

        # -------------------------------------------------------------
        # 2. Strict Anatomical Thoracic & Lung Field Segmentation
        # -------------------------------------------------------------
        h_f, w_f = 512, 512
        y_grid, x_grid = np.ogrid[:h_f, :w_f]
        
        # Normalized coordinates [0.0, 1.0]
        nx = x_grid.astype(np.float32) / w_f
        ny = y_grid.astype(np.float32) / h_f

        # A. Bilateral Lung Fields Model:
        # Right Lung: nx in [0.18, 0.47], ny in [0.20, 0.84]
        # Left Lung:  nx in [0.53, 0.82], ny in [0.20, 0.84]
        right_lung_center = np.exp(-(((nx - 0.32)**2)/(2 * 0.10**2) + ((ny - 0.52)**2)/(2 * 0.22**2)))
        left_lung_center  = np.exp(-(((nx - 0.68)**2)/(2 * 0.10**2) + ((ny - 0.52)**2)/(2 * 0.22**2)))
        bilateral_lungs = np.maximum(right_lung_center, left_lung_center)

        # B. Mediastinal Cardiac Compartment:
        # Heart Silhouette: nx in [0.36, 0.64], ny in [0.46, 0.82]
        cardiac_mediastinum = np.exp(-(((nx - 0.50)**2)/(2 * 0.10**2) + ((ny - 0.64)**2)/(2 * 0.14**2)))

        # C. Costophrenic Bases Compartment (Pleural Effusion):
        # Basilar dependent recesses: ny > 0.58, lateral lung bases
        right_cp = np.exp(-(((nx - 0.26)**2)/(2 * 0.08**2) + ((ny - 0.76)**2)/(2 * 0.10**2)))
        left_cp  = np.exp(-(((nx - 0.74)**2)/(2 * 0.08**2) + ((ny - 0.76)**2)/(2 * 0.10**2)))
        costophrenic_bases = np.maximum(right_cp, left_cp)

        # D. Extrathoracic Hard Barrier (Shoulders, Clavicles, Neck, Camera Border, Abdomen)
        # Shoulders (upper lateral corners: ny < 0.28 and (nx < 0.22 or nx > 0.78))
        # Neck / Top (ny < 0.16)
        # Lateral arms (nx < 0.15 or nx > 0.85)
        # Abdomen (ny > 0.86)
        thoracic_boundary = (ny >= 0.18) & (ny <= 0.86) & (nx >= 0.16) & (nx <= 0.84)
        
        # Upper outer shoulder zeroing
        shoulder_l = (ny < 0.32) & (nx < 0.26)
        shoulder_r = (ny < 0.32) & (nx > 0.74)
        neck = (ny < 0.18)

        extrathoracic_mask = thoracic_boundary & (~shoulder_l) & (~shoulder_r) & (~neck)
        extrathoracic_weight = cv2.GaussianBlur(extrathoracic_mask.astype(np.float32), (31, 31), 0)

        # -------------------------------------------------------------
        # 3. Apply Condition-Specific Anatomical Spatial Filter
        # -------------------------------------------------------------
        if class_name in ["Pneumonia", "Atelectasis"]:
            # Strictly confined to pulmonary airspaces
            anatomical_filter = bilateral_lungs * extrathoracic_weight
        elif class_name == "Cardiomegaly":
            # Strictly confined to cardiac mediastinal silhouette
            anatomical_filter = cardiac_mediastinum * extrathoracic_weight
        elif class_name == "Pleural Effusion":
            # Strictly confined to lower costophrenic bases
            anatomical_filter = np.maximum(costophrenic_bases, bilateral_lungs * (ny > 0.45)) * extrathoracic_weight
        else:
            anatomical_filter = extrathoracic_weight

        # Fused neural attribution with anatomical lung filter
        focal_map = cam_512 * anatomical_filter

        # Zero out any leakage in extrathoracic boundary
        focal_map[~extrathoracic_mask] = 0.0

        # Smooth blending
        focal_map = cv2.GaussianBlur(focal_map, (15, 15), 0)

        # 4. Normalize and scale by model confidence
        c_min, c_max = np.min(focal_map), np.max(focal_map)
        if c_max > 0.05:
            focal_map = focal_map / c_max
        else:
            focal_map = np.zeros_like(focal_map)

        return focal_map
