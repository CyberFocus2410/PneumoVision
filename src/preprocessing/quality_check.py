"""
Image Quality and Out-of-Distribution (OOD) Heuristic Assessor for PneumoVision.
Evaluates sharpness, exposure, dynamic range, and resolution advisory metrics.
Permissive design: Never abruptly aborts analysis; provides quality metrics and advisory tags.
"""

from typing import Dict, Any, Tuple
import numpy as np
import cv2
from PIL import Image

def assess_image_quality(image_input) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Performs image quality and acquisition telemetry evaluation.
    Always returns is_acceptable=True for valid decodable image buffers,
    with informative status tags: OPTIMAL, ACCEPTABLE, LOW_CONTRAST, LOW_RESOLUTION, OVEREXPOSED, UNDEREXPOSED.
    """
    if isinstance(image_input, Image.Image):
        img_np = np.array(image_input.convert("L"))
    elif isinstance(image_input, np.ndarray):
        if image_input.ndim == 3:
            img_np = cv2.cvtColor(image_input, cv2.COLOR_RGB2GRAY)
        else:
            img_np = image_input.copy()
    else:
        return False, "CORRUPT_INPUT", {"error": "Unsupported input format"}

    h, w = img_np.shape[:2]
    total_pixels = float(max(1, h * w))

    # 1. Exposure and Dynamic Range
    hist, _ = np.histogram(img_np, bins=256, range=(0, 256))
    crushed_blacks = float(np.sum(hist[:8])) / total_pixels
    blown_highlights = float(np.sum(hist[248:])) / total_pixels
    
    mean_val = float(np.mean(img_np))
    std_val = float(np.std(img_np))

    # 2. Shannon Entropy
    prob_dist = hist / total_pixels
    prob_dist = prob_dist[prob_dist > 0]
    entropy = float(-np.sum(prob_dist * np.log2(prob_dist))) if len(prob_dist) > 0 else 0.0

    # 3. Laplacian Blur Variance
    laplacian_var = float(cv2.Laplacian(img_np, cv2.CV_64F).var())

    flags = []
    if h < 200 or w < 200:
        flags.append("LOW_RESOLUTION")
    if blown_highlights > 0.40:
        flags.append("OVEREXPOSED")
    elif crushed_blacks > 0.65:
        flags.append("UNDEREXPOSED")
    if std_val < 20.0:
        flags.append("LOW_CONTRAST")
    if laplacian_var < 35.0:
        flags.append("SLIGHT_BLUR")

    if not flags:
        quality_status = "OPTIMAL"
    elif any(f in ["OVEREXPOSED", "UNDEREXPOSED"] for f in flags):
        quality_status = flags[0]
    else:
        quality_status = "ACCEPTABLE"

    metrics = {
        "status": quality_status,
        "is_acceptable": True, # Permissive: always allows analysis
        "resolution": f"{w}x{h}",
        "mean_intensity": round(mean_val, 1),
        "std_contrast": round(std_val, 1),
        "entropy": round(entropy, 2),
        "sharpness_index": round(laplacian_var, 1),
        "clipped_blacks_pct": round(crushed_blacks * 100, 1),
        "clipped_highlights_pct": round(blown_highlights * 100, 1),
        "flags": flags
    }

    return True, quality_status, metrics
