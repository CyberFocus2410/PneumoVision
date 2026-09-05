"""
Enhanced Explainability Visualizer for PneumoVision
Produces crisp, threshold-gated Grad-CAM++ overlays, anatomical bounding boxes,
contour outlines, hotspot center-of-mass detection, and anatomical quadrant localization.
"""

from typing import Tuple, Optional, Dict, List, Union, Any
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

def get_anatomical_quadrant(center_x_norm: float, center_y_norm: float) -> str:
    """
    Maps normalized coordinates (0.0 to 1.0) to standard clinical thoracic landmarks.
    Note: In frontal chest radiographs, image Left is Patient Right!
    """
    # Patient laterality: x < 0.5 is Patient Right hemithorax, x >= 0.5 is Patient Left
    is_patient_right = center_x_norm < 0.5
    side_str = "Right" if is_patient_right else "Left"

    if center_y_norm < 0.35:
        level_str = "Upper Lobe / Apical Region"
    elif center_y_norm < 0.65:
        if 0.35 <= center_x_norm <= 0.65:
            return "Perihilar / Cardiac Mediastinal Silhouette"
        level_str = "Mid-Lung Zone"
    elif center_y_norm < 0.85:
        if 0.35 <= center_x_norm <= 0.60:
            return "Cardiac Apex / Paracardiac Region"
        level_str = "Lower Lobe / Basilar Airspace"
    else:
        level_str = "Costophrenic Sulcus / Diaphragmatic Margin"

    return f"{side_str} {level_str}"


def overlay_heatmap_on_image(
    original_img: Union[Image.Image, np.ndarray],
    heatmap_2d: np.ndarray,
    alpha: float = 0.50,
    colormap: int = cv2.COLORMAP_TURBO,
    threshold: float = 0.20,
    draw_contours: bool = True,
    draw_box: bool = True
) -> Image.Image:
    """
    Overlays a crisp, threshold-gated Grad-CAM++ heatmap onto the radiograph.
    Low activations below threshold are left transparent to keep normal lung tissue clear.
    Draws highlighted boundary contours around the focal region of model attention.
    """
    if isinstance(original_img, Image.Image):
        orig_np = np.array(original_img.convert("RGB"))
    else:
        orig_np = original_img.copy()

    h, w = orig_np.shape[:2]

    # 1. Resize heatmap to image dimensions with high-order interpolation
    resized = cv2.resize(heatmap_2d, (w, h), interpolation=cv2.INTER_CUBIC)
    resized = np.clip(resized, 0.0, 1.0)

    # 2. Threshold gating: zero out background noise so anatomy is clean
    gated = np.copy(resized)
    gated[gated < threshold] = 0.0

    # Rescale gated values to [0, 1]
    if np.max(gated) > 0:
        gated = (gated - np.min(gated[gated > 0])) / (np.max(gated) - np.min(gated[gated > 0]) + 1e-8)
        gated = np.clip(gated, 0.0, 1.0)

    # 3. Apply Colormap
    heatmap_uint8 = (gated * 255.0).astype(np.uint8)
    colored_cam = cv2.applyColorMap(heatmap_uint8, colormap)
    colored_cam = cv2.cvtColor(colored_cam, cv2.COLOR_BGR2RGB)

    # 4. Alpha blend only for pixels above threshold
    mask_3d = np.repeat((gated > 0.05)[:, :, np.newaxis], 3, axis=2)
    blended = np.copy(orig_np)
    
    # Smooth alpha weighting proportional to activation intensity
    pixel_alpha = (gated[:, :, np.newaxis] * alpha)
    blended_hotspots = (orig_np * (1.0 - pixel_alpha) + colored_cam * pixel_alpha).astype(np.uint8)
    blended[mask_3d] = blended_hotspots[mask_3d]

    # 5. Draw smooth contours around high-activation focal zones (>= 0.40)
    if draw_contours:
        high_mask = (resized >= 0.45).astype(np.uint8) * 255
        contours, _ = cv2.findContours(high_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(blended, contours, -1, (255, 220, 0), 2, cv2.LINE_AA)

    # 6. Draw Peak Attention Box if strong focal activation exists
    if draw_box:
        high_mask = (resized >= 0.50).astype(np.uint8) * 255
        contours, _ = cv2.findContours(high_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            largest_c = max(contours, key=cv2.contourArea)
            if cv2.contourArea(largest_c) > 100:
                bx, by, bw, bh = cv2.boundingRect(largest_c)
                cv2.rectangle(blended, (bx, by), (bx + bw, by + bh), (6, 182, 212), 2, cv2.LINE_AA)
                # Small corner crosshair
                cx, cy = bx + bw // 2, by + bh // 2
                cv2.drawMarker(blended, (cx, cy), (6, 182, 212), markerType=cv2.MARKER_CROSS, markerSize=14, thickness=2)

    return Image.fromarray(blended)


def extract_heatmap_localization_data(
    heatmap_2d: np.ndarray,
    image_shape: Tuple[int, int] = (512, 512)
) -> Dict[str, Any]:
    """
    Extracts quantitative localization coordinates, peak intensity, and anatomical description.
    """
    h_img, w_img = image_shape
    resized = cv2.resize(heatmap_2d, (w_img, h_img), interpolation=cv2.INTER_CUBIC)
    resized = np.clip(resized, 0.0, 1.0)

    # Find peak location
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(resized)
    peak_x, peak_y = max_loc

    # Normalized center coordinates
    norm_x = peak_x / float(w_img)
    norm_y = peak_y / float(h_img)

    anatomical_site = get_anatomical_quadrant(norm_x, norm_y)

    # Focal area coverage (% of lung field covered by >= 0.4 activation)
    focal_coverage_pct = float(np.sum(resized >= 0.40)) / float(h_img * w_img) * 100.0

    return {
        "peak_intensity": round(float(max_val), 3),
        "peak_location": {"x": int(peak_x), "y": int(peak_y)},
        "peak_norm": {"x": round(norm_x, 3), "y": round(norm_y, 3)},
        "anatomical_site": anatomical_site,
        "focal_coverage_percent": round(focal_coverage_pct, 1)
    }


def create_side_by_side_comparison(
    original_img: Union[Image.Image, np.ndarray],
    overlay_img: Union[Image.Image, np.ndarray],
    finding_title: str = "Grad-CAM Activation"
) -> Image.Image:
    """Creates a side-by-side comparison image: [Original Radiograph | Grad-CAM++ Overlay]."""
    if isinstance(original_img, Image.Image):
        orig_np = np.array(original_img.convert("RGB"))
    else:
        orig_np = original_img.copy()

    if isinstance(overlay_img, Image.Image):
        over_np = np.array(overlay_img.convert("RGB"))
    else:
        over_np = overlay_img.copy()

    h1, w1 = orig_np.shape[:2]
    h2, w2 = over_np.shape[:2]

    target_h = max(h1, h2)
    if h1 != target_h:
        orig_np = cv2.resize(orig_np, (int(w1 * target_h / h1), target_h))
    if h2 != target_h:
        over_np = cv2.resize(over_np, (int(w2 * target_h / h2), target_h))

    # Add dividing margin
    separator = np.ones((target_h, 8, 3), dtype=np.uint8) * 180
    combined = np.hstack([orig_np, separator, over_np])

    return Image.fromarray(combined)


def compute_heatmap_bbox_iou(
    heatmap_2d: np.ndarray,
    ground_truth_bbox: Tuple[int, int, int, int],
    image_shape: Tuple[int, int],
    activation_threshold: float = 0.50
) -> float:
    """Calculates IoU against radiologist ground truth bounding box."""
    h_img, w_img = image_shape
    resized = cv2.resize(heatmap_2d, (w_img, h_img), interpolation=cv2.INTER_CUBIC)
    activation_mask = (resized >= activation_threshold).astype(np.uint8)

    gx, gy, gw, gh = ground_truth_bbox
    gt_mask = np.zeros((h_img, w_img), dtype=np.uint8)
    gt_mask[gy:gy+gh, gx:gx+gw] = 1

    intersection = np.logical_and(activation_mask, gt_mask).sum()
    union = np.logical_or(activation_mask, gt_mask).sum()

    if union == 0:
        return 0.0
    return float(intersection / union)
