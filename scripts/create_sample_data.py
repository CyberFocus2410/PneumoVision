"""
Demonstration Data Generator: Builds realistic synthetic chest radiographs and DICOM files
with authentic anatomical structures (rib cage, mediastinum, diaphragms, lung fields, and pathology signatures).
"""

import sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.config import SAMPLES_DIR

def generate_base_chest_xray(width: int = 512, height: int = 512) -> np.ndarray:
    """Generates base thoracic anatomy: thoracic wall, lung fields, mediastinum, clavicles, ribs."""
    canvas = np.zeros((height, width), dtype=np.float32)

    # 1. Soft tissue background
    y, x = np.ogrid[:height, :width]
    body_ellipse = ((x - width/2) / (width * 0.45))**2 + ((y - height/2) / (height * 0.48))**2
    canvas[body_ellipse <= 1.0] = 80.0
    
    # 2. Lung fields (darker air-filled cavities)
    # Left Hemithorax
    l_lung = ((x - width*0.30) / (width * 0.16))**2 + ((y - height*0.48) / (height * 0.32))**2
    canvas[l_lung <= 1.0] = 25.0
    
    # Right Hemithorax
    r_lung = ((x - width*0.70) / (width * 0.16))**2 + ((y - height*0.48) / (height * 0.32))**2
    canvas[r_lung <= 1.0] = 25.0

    # 3. Mediastinum & Spine (radiopaque white column)
    spine = ((x - width/2) / (width * 0.08))**2
    canvas += np.exp(-spine * 0.5) * 70.0

    # 4. Cardiac silhouette (left-sided prominence)
    heart = ((x - width*0.44) / (width * 0.14))**2 + ((y - height*0.62) / (height * 0.18))**2
    canvas[heart <= 1.0] += 60.0

    # 5. Diaphragmatic domes
    diaphragm_left = np.exp(-((y - height*0.78)**2) / 600.0) * (x < width*0.5) * 80.0
    diaphragm_right = np.exp(-((y - height*0.80)**2) / 600.0) * (x >= width*0.5) * 80.0
    canvas += (diaphragm_left + diaphragm_right)

    # 6. Rib cage shadows
    for r_y in range(int(height*0.25), int(height*0.80), int(height*0.07)):
        rib_arc = np.exp(-((y - r_y - 0.04*(x - width/2)**2/width)**2) / 25.0) * 15.0
        canvas += rib_arc

    # 7. Clavicles
    clav_l = np.exp(-((y - (height*0.24 - 0.08*(x - width*0.35)))**2) / 20.0) * (x < width*0.5) * 35.0
    clav_r = np.exp(-((y - (height*0.24 + 0.08*(x - width*0.65)))**2) / 20.0) * (x >= width*0.5) * 35.0
    canvas += (clav_l + clav_r)

    # Add anatomical noise and smooth
    noise = np.random.normal(0, 4.0, (height, width))
    canvas = np.clip(canvas + noise, 0, 255)
    canvas = cv2.GaussianBlur(canvas, (5, 5), 1.2)
    return canvas.astype(np.uint8)


def create_all_samples():
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Normal Study
    normal_img = generate_base_chest_xray()
    Image.fromarray(normal_img).save(SAMPLES_DIR / "sample_normal.png")

    # 2. Pneumonia Study (Right lower lobe focal airspace opacity / consolidation)
    pna_img = generate_base_chest_xray().astype(np.float32)
    y, x = np.ogrid[:512, :512]
    consolidation = np.exp(-(((x - 340)**2 + (y - 300)**2) / (2 * 35**2))) * 90.0
    pna_img = np.clip(pna_img + consolidation, 0, 255).astype(np.uint8)
    Image.fromarray(pna_img).save(SAMPLES_DIR / "sample_pneumonia.png")

    # 3. Cardiomegaly Study (Greatly enlarged cardiac silhouette across midline)
    cardio_img = generate_base_chest_xray().astype(np.float32)
    heart_large = ((x - 220) / 130)**2 + ((y - 310) / 110)**2
    cardio_img[heart_large <= 1.0] += 80.0
    cardio_img = np.clip(cardio_img, 0, 255).astype(np.uint8)
    Image.fromarray(cardio_img).save(SAMPLES_DIR / "sample_cardiomegaly.png")

    # 4. Pleural Effusion Study (Fluid meniscus and complete blunting of left sulcus)
    eff_img = generate_base_chest_xray().astype(np.float32)
    meniscus = (x < 210) & (y > 340) & ((y - 340) > 0.6 * (210 - x))
    eff_img[meniscus] += 95.0
    eff_img = np.clip(eff_img, 0, 255).astype(np.uint8)
    Image.fromarray(eff_img).save(SAMPLES_DIR / "sample_effusion.png")

    # 5. Atelectasis Study (Linear subsegmental volume loss plate in lung base)
    ate_img = generate_base_chest_xray().astype(np.float32)
    band = np.exp(-((y - 330 + 0.15*(x - 340))**2) / 18.0) * (x > 280) * (x < 420) * 85.0
    ate_img = np.clip(ate_img + band, 0, 255).astype(np.uint8)
    Image.fromarray(ate_img).save(SAMPLES_DIR / "sample_atelectasis.png")

    print(f"Created 5 curated demonstration chest X-ray samples in: {SAMPLES_DIR}")

if __name__ == "__main__":
    create_all_samples()
