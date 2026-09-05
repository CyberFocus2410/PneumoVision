"""
Visualization and Heatmap Overlay Utilities for Grad-CAM.
Generates fused overlays, colormaps, side-by-side layouts, and IoU metric calculations.
"""

from typing import Tuple, Optional, Dict, List, Union
import numpy as np
import cv2
from PIL import Image

def overlay_heatmap_on_image(
    original_img: Union[Image.Image, np.ndarray],
    heatmap_2d: np.ndarray,
    alpha: float = 0.5,
    colormap: int = cv2.COLORMAP_JET
) -> Image.Image:
    """
    Overlays a 2D normalized heatmap [0, 1] onto the original image.
    
    Args:
        original_img: PIL Image or [H, W, 3] RGB uint8 numpy array
        heatmap_2d: 2D float array [H_feat, W_feat]
        alpha: Heatmap blend opacity (0.0 to 1.0)
        colormap: OpenCV colormap (e.g. cv2.COLORMAP_JET, cv2.COLORMAP_TURBO)
    """
    if isinstance(original_img, Image.Image):
        orig_np = np.array(original_img.convert("RGB"))
    else:
        orig_np = original_img.copy()

    h, w = orig_np.shape[:2]

    # Resize heatmap to match image dimensions with bicubic interpolation
    resized_heatmap = cv2.resize(heatmap_2d, (w, h), interpolation=cv2.INTER_CUBIC)
    resized_heatmap = np.clip(resized_heatmap, 0.0, 1.0)

    # Convert to 8-bit colormap
    heatmap_uint8 = (resized_heatmap * 255.0).astype(np.uint8)
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, colormap)
    colored_heatmap = cv2.cvtColor(colored_heatmap, cv2.COLOR_BGR2RGB)

    # Blend original image and colored heatmap
    blended = cv2.addWeighted(orig_np, 1.0 - alpha, colored_heatmap, alpha, 0)
    return Image.fromarray(blended)


def create_side_by_side_comparison(
    original_img: Union[Image.Image, np.ndarray],
    overlay_img: Union[Image.Image, np.ndarray],
    finding_title: str = "Grad-CAM Activation"
) -> Image.Image:
    """
    Creates a side-by-side comparison image: [Original Radiograph | Grad-CAM++ Overlay].
    """
    if isinstance(original_img, Image.Image):
        orig_np = np.array(original_img.convert("RGB"))
    else:
        orig_np = original_img

    if isinstance(overlay_img, Image.Image):
        over_np = np.array(overlay_img.convert("RGB"))
    else:
        over_np = overlay_img

    h1, w1 = orig_np.shape[:2]
    h2, w2 = over_np.shape[:2]
    
    # Ensure uniform height
    target_h = max(h1, h2)
    if h1 != target_h:
        orig_np = cv2.resize(orig_np, (int(w1 * target_h / h1), target_h))
    if h2 != target_h:
        over_np = cv2.resize(over_np, (int(w2 * target_h / h2), target_h))

    # Add dividing margin
    separator = np.ones((target_h, 8, 3), dtype=np.uint8) * 200
    combined = np.hstack([orig_np, separator, over_np])
    
    return Image.fromarray(combined)


def compute_heatmap_bbox_iou(
    heatmap_2d: np.ndarray,
    ground_truth_bbox: Tuple[int, int, int, int], # (x, y, width, height)
    image_shape: Tuple[int, int],
    activation_threshold: float = 0.50
) -> float:
    """
    Calculates Intersection-over-Union (IoU) between thresholded Grad-CAM activation
    and radiologist ground truth bounding box (as specified in Part C of PRD).
    """
    h_img, w_img = image_shape
    resized_heatmap = cv2.resize(heatmap_2d, (w_img, h_img), interpolation=cv2.INTER_CUBIC)
    
    # Binary mask of high model activation
    activation_mask = (resized_heatmap >= activation_threshold).astype(np.uint8)
    
    # Ground truth bounding box mask
    gx, gy, gw, gh = ground_truth_bbox
    gt_mask = np.zeros((h_img, w_img), dtype=np.uint8)
    gt_mask[gy:gy+gh, gx:gx+gw] = 1

    intersection = np.logical_and(activation_mask, gt_mask).sum()
    union = np.logical_or(activation_mask, gt_mask).sum()

    if union == 0:
        return 0.0
    return float(intersection / union)
