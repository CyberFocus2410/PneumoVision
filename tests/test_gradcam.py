"""
Unit tests for Grad-CAM, Grad-CAM++, Heatmap Blending, and IoU Calculation.
"""

import pytest
import numpy as np
import torch
from PIL import Image

from src.models.densenet import PneumoDenseNet
from src.explainability.gradcam import PneumoGradCAM
from src.explainability.visualizer import (
    overlay_heatmap_on_image, create_side_by_side_comparison, compute_heatmap_bbox_iou
)

def test_gradcam_generation():
    model = PneumoDenseNet(num_classes=5, pretrained=False)
    gradcam = PneumoGradCAM(model)
    
    input_tensor = torch.randn(1, 3, 320, 320, requires_grad=True)
    cam_2d = gradcam.generate_heatmap(input_tensor, target_class_idx=0, use_gradcam_plusplus=True)
    
    assert cam_2d.ndim == 2
    assert (cam_2d >= 0.0).all() and (cam_2d <= 1.0).all()

def test_visualizer_overlay():
    orig = Image.new("RGB", (320, 320), color=(100, 100, 100))
    heatmap = np.random.rand(10, 10).astype(np.float32)
    
    overlay = overlay_heatmap_on_image(orig, heatmap, alpha=0.5)
    assert isinstance(overlay, Image.Image)
    assert overlay.size == (320, 320)
    
    side_by_side = create_side_by_side_comparison(orig, overlay)
    assert isinstance(side_by_side, Image.Image)
    assert side_by_side.size[0] > 320

def test_compute_heatmap_bbox_iou():
    heatmap = np.zeros((100, 100), dtype=np.float32)
    # Set high activation in region (20, 20) to (60, 60)
    heatmap[20:60, 20:60] = 0.9
    
    # Matching bounding box (x=20, y=20, w=40, h=40)
    bbox = (20, 20, 40, 40)
    iou = compute_heatmap_bbox_iou(heatmap, bbox, image_shape=(100, 100), activation_threshold=0.5)
    assert iou > 0.80
