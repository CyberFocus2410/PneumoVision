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
        
        # Target layer for DenseNet121: final 1024-channel norm5 layer
        if target_layer is None:
            if hasattr(model, "features") and hasattr(model.features, "norm5"):
                self.target_layer = model.features.norm5
            elif hasattr(model, "model") and hasattr(model.model, "features") and hasattr(model.model.features, "norm5"):
                self.target_layer = model.model.features.norm5
            elif hasattr(model, "features"):
                self.target_layer = model.features[-1]
            else:
                # Fallback to last sub-module
                self.target_layer = list(model.modules())[-2]
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
        raw_image: Optional[Union[Image.Image, np.ndarray]] = None
    ) -> np.ndarray:
        """
        Generates 2D normalized activation heatmap [0.0, 1.0] for the specified class index.
        Applies anatomical thoracic conditioning to eliminate non-anatomical edge/shoulder artifacts.
        """
        self.model.zero_grad()
        
        # Forward pass (get raw logits)
        if hasattr(self.model, "temperature_scale"):
            logits = self.model(input_tensor, return_logits=True)
        else:
            logits = self.model(input_tensor)
            
        target_score = logits[0, target_class_idx]
        target_score.backward(retain_graph=True)

        gradients = self.gradients[0]     # [1024, H_feat, W_feat]
        activations = self.activations[0] # [1024, H_feat, W_feat]

        if use_gradcam_plusplus:
            # Grad-CAM++ higher order gradient weighting
            grad_2 = gradients.pow(2)
            grad_3 = gradients.pow(3)
            sum_activations = torch.sum(activations, dim=(1, 2), keepdim=True)
            
            eps = 1e-8
            alpha = grad_2 / (2 * grad_2 + sum_activations * grad_3 + eps)
            alpha = torch.where(grad_2 != 0, alpha, torch.zeros_like(alpha))
            
            positive_grads = F.relu(gradients)
            weights = torch.sum(alpha * positive_grads, dim=(1, 2))
        else:
            weights = torch.mean(gradients, dim=(1, 2))

        # Weighted combination of 1024 feature maps
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

        # Upsample to high resolution (256x256) for continuous, smooth anatomical spatial modeling
        cam_high_res = cv2.resize(cam_np, (256, 256), interpolation=cv2.INTER_CUBIC)
        cam_high_res = np.clip(cam_high_res, 0.0, 1.0)
        
        # -------------------------------------------------------------
        # Clinical Thoracic Cage Spatial Conditioning:
        # Suppress non-pulmonary perimeter artifacts (neck/shoulder edges/outer air)
        # -------------------------------------------------------------
        h_f, w_f = 256, 256
        y_grid, x_grid = np.ogrid[:h_f, :w_f]
        
        # Elliptical Thoracic Prior (centers attention over the chest cavity)
        cx, cy = w_f * 0.50, h_f * 0.52
        rx, ry = w_f * 0.44, h_f * 0.42
        thoracic_ellipse = np.clip(1.0 - (((x_grid - cx)**2) / (rx**2) + ((y_grid - cy)**2) / (ry**2)), 0.0, 1.0)
        thoracic_mask = 0.20 + 0.80 * (thoracic_ellipse ** 0.6)

        # Suppress upper outer shoulder corners
        shoulder_l = np.clip((w_f * 0.22 - x_grid) / (w_f * 0.22), 0.0, 1.0) * np.clip((h_f * 0.35 - y_grid) / (h_f * 0.35), 0.0, 1.0)
        shoulder_r = np.clip((x_grid - w_f * 0.78) / (w_f * 0.22), 0.0, 1.0) * np.clip((h_f * 0.35 - y_grid) / (h_f * 0.35), 0.0, 1.0)
        neck_top = np.clip((h_f * 0.12 - y_grid) / (h_f * 0.12), 0.0, 1.0)

        thoracic_mask = thoracic_mask * (1.0 - 0.85 * shoulder_l) * (1.0 - 0.85 * shoulder_r) * (1.0 - 0.80 * neck_top)

        # Class-Specific Anatomical Regional Guidance
        if class_name == "Cardiomegaly":
            # Heart is strictly located in the central/lower-mid mediastinum (x ~ 0.32-0.68, y ~ 0.45-0.85)
            heart_prior = np.exp(-(((x_grid - w_f * 0.48)**2) / (2 * (w_f * 0.18)**2) + ((y_grid - h_f * 0.66)**2) / (2 * (h_f * 0.18)**2)))
            cam_high_res = cam_high_res * (0.20 + 0.80 * heart_prior)
        elif class_name == "Pleural Effusion":
            # Fluid accumulates in dependent lower lung zones / costophrenic angles (y > 0.55)
            eff_prior = np.exp(-((y_grid - h_f * 0.78)**2) / (2 * (h_f * 0.20)**2))
            cam_high_res = cam_high_res * (0.25 + 0.75 * eff_prior)
        elif class_name in ["Pneumonia", "Atelectasis"]:
            # Lung parenchymal fields
            lung_prior = (y_grid > h_f * 0.16) & (y_grid < h_f * 0.88)
            cam_high_res = cam_high_res * np.where(lung_prior, 1.0, 0.25)

        # Apply thoracic spatial filter
        cam_filtered = cam_high_res * thoracic_mask

        # If raw_image provided, suppress pure black image borders
        if raw_image is not None:
            try:
                if isinstance(raw_image, Image.Image):
                    gray_img = np.array(raw_image.convert("L"))
                else:
                    gray_img = cv2.cvtColor(raw_image, cv2.COLOR_RGB2GRAY) if raw_image.ndim == 3 else raw_image
                
                gray_resized = cv2.resize(gray_img, (w_f, h_f), interpolation=cv2.INTER_AREA)
                # Soft tissue mask (pixels > 15)
                body_mask = (gray_resized > 18).astype(np.float32)
                body_mask = cv2.GaussianBlur(body_mask, (15, 15), 5.0)
                cam_filtered = cam_filtered * (0.15 + 0.85 * body_mask)
            except Exception:
                pass

        # Final re-normalization
        c_min, c_max = np.min(cam_filtered), np.max(cam_filtered)
        if c_max > c_min:
            cam_filtered = (cam_filtered - c_min) / (c_max - c_min)
        else:
            cam_filtered = np.zeros_like(cam_filtered)

        return cam_filtered
