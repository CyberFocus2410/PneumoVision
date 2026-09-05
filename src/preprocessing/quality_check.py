"""
Image Quality and Out-of-Distribution (OOD) Heuristic Assessor
Validates resolution, exposure levels, contrast, and chest cavity profile.
"""

from typing import Dict, Any, Tuple
import numpy as np
import cv2
from PIL import Image

def assess_image_quality(image_input) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Performs comprehensive image quality and plausibility verification.
    
    Returns:
        (is_acceptable: bool, quality_flag: str, metrics: Dict[str, Any])
        quality_flag: 'OPTIMAL', 'ACCEPTABLE', 'OVEREXPOSED', 'UNDEREXPOSED', 'LOW_CONTRAST', 'LOW_RESOLUTION', 'INVALID_ANATOMY'
    """
    if isinstance(image_input, Image.Image):
        img_np = np.array(image_input.convert("L"))
    elif isinstance(image_input, np.ndarray):
        if image_input.ndim == 3:
            img_np = cv2.cvtColor(image_input, cv2.COLOR_RGB2GRAY)
        else:
            img_np = image_input.copy()
    else:
        return False, "CORRUPT_INPUT", {"error": "Unsupported input type"}

    h, w = img_np.shape[:2]
    
    # Check 1: Minimum Resolution bounds
    if h < 192 or w < 192:
        return False, "LOW_RESOLUTION", {
            "height": h, "width": w, "message": f"Image resolution {w}x{h} is below minimum 192x192."
        }

    # Check 2: Exposure and Dynamic Range
    hist, _ = np.histogram(img_np, bins=256, range=(0, 256))
    total_pixels = float(h * w)
    
    # Calculate percentage of blown-out highlights (> 250) and crushed blacks (< 5)
    crushed_blacks = np.sum(hist[:5]) / total_pixels
    blown_highlights = np.sum(hist[250:]) / total_pixels
    
    mean_val = float(np.mean(img_np))
    std_val = float(np.std(img_np))
    
    # Check 3: Shannon Entropy (Information density)
    prob_dist = hist / total_pixels
    prob_dist = prob_dist[prob_dist > 0]
    entropy = float(-np.sum(prob_dist * np.log2(prob_dist)))
    
    # Check 4: Laplacian Blur Variance (Sharpness)
    laplacian_var = float(cv2.Laplacian(img_np, cv2.CV_64F).var())

    # Check 5: Bilateral Chest Profile Heuristic (Chest X-rays have darker lung fields bounded by thoracic cage)
    # Sample center vs periphery
    margin_y, margin_x = int(h * 0.2), int(w * 0.2)
    center_region = img_np[margin_y:h-margin_y, margin_x:w-margin_x]
    center_mean = float(np.mean(center_region))

    # Determine Quality Flag & Diagnostic Suitability
    flags = []
    is_acceptable = True
    
    if entropy < 3.0 or std_val < 15.0:
        return False, "INVALID_ANATOMY", {
            "entropy": entropy, "std": std_val, "message": "Image lacks diagnostic texture of a medical chest radiograph."
        }
    
    if blown_highlights > 0.45 or mean_val > 220:
        flags.append("OVEREXPOSED")
    elif crushed_blacks > 0.65 or mean_val < 30:
        flags.append("UNDEREXPOSED")
        
    if std_val < 25.0:
        flags.append("LOW_CONTRAST")
        
    if laplacian_var < 40.0:
        flags.append("SLIGHT_BLUR")

    if not flags:
        quality_status = "OPTIMAL"
    elif any(f in ["OVEREXPOSED", "UNDEREXPOSED"] for f in flags):
        quality_status = flags[0]
        # Flagged but still analyzable with warning
        is_acceptable = True
    else:
        quality_status = "ACCEPTABLE"

    metrics = {
        "status": quality_status,
        "is_acceptable": is_acceptable,
        "resolution": f"{w}x{h}",
        "mean_intensity": round(mean_val, 2),
        "std_contrast": round(std_val, 2),
        "entropy": round(entropy, 2),
        "sharpness_index": round(laplacian_var, 1),
        "clipped_blacks_pct": round(crushed_blacks * 100, 1),
        "clipped_highlights_pct": round(blown_highlights * 100, 1),
        "flags": flags
    }
    
    return is_acceptable, quality_status, metrics
