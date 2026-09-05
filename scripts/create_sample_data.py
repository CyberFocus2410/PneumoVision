"""
Comprehensive Demonstration Data & Clinical Case Manifest Generator
Produces realistic chest radiographs and full clinical vignettes for interactive live testing.
"""

import sys
import json
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
    canvas[body_ellipse <= 1.0] = 85.0
    
    # 2. Lung fields (darker air-filled cavities)
    l_lung = ((x - width*0.30) / (width * 0.16))**2 + ((y - height*0.48) / (height * 0.32))**2
    canvas[l_lung <= 1.0] = 22.0
    
    r_lung = ((x - width*0.70) / (width * 0.16))**2 + ((y - height*0.48) / (height * 0.32))**2
    canvas[r_lung <= 1.0] = 22.0

    # 3. Mediastinum & Spine (radiopaque white column)
    spine = ((x - width/2) / (width * 0.08))**2
    canvas += np.exp(-spine * 0.5) * 75.0

    # 4. Cardiac silhouette (left-sided prominence)
    heart = ((x - width*0.44) / (width * 0.14))**2 + ((y - height*0.62) / (height * 0.18))**2
    canvas[heart <= 1.0] += 65.0

    # 5. Diaphragmatic domes & sharp costophrenic angles
    diaphragm_left = np.exp(-((y - height*0.78)**2) / 600.0) * (x < width*0.5) * 80.0
    diaphragm_right = np.exp(-((y - height*0.80)**2) / 600.0) * (x >= width*0.5) * 80.0
    canvas += (diaphragm_left + diaphragm_right)

    # 6. Pulmonary vascular bronchovascular markings
    for v_angle in [-0.4, -0.2, 0.0, 0.2, 0.4]:
        # Branching from hilum
        vx_r = np.exp(-((y - height*0.50 - (x - width*0.68)*v_angle)**2) / 12.0) * (x > width*0.55) * (x < width*0.82) * 18.0
        vx_l = np.exp(-((y - height*0.50 - (x - width*0.32)*(-v_angle))**2) / 12.0) * (x < width*0.45) * (x > width*0.18) * 18.0
        canvas += (vx_r + vx_l)

    # 7. Rib cage shadows (anterior and posterior arcs)
    for r_y in range(int(height*0.22), int(height*0.82), int(height*0.065)):
        rib_arc = np.exp(-((y - r_y - 0.04*(x - width/2)**2/width)**2) / 22.0) * 16.0
        canvas += rib_arc

    # 8. Clavicles
    clav_l = np.exp(-((y - (height*0.24 - 0.08*(x - width*0.35)))**2) / 20.0) * (x < width*0.5) * 40.0
    clav_r = np.exp(-((y - (height*0.24 + 0.08*(x - width*0.65)))**2) / 20.0) * (x >= width*0.5) * 40.0
    canvas += (clav_l + clav_r)

    # Add anatomical texture & smooth
    noise = np.random.normal(0, 3.5, (height, width))
    canvas = np.clip(canvas + noise, 0, 255)
    canvas = cv2.GaussianBlur(canvas, (3, 3), 0.8)
    return canvas.astype(np.uint8)


def create_all_samples():
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    y, x = np.ogrid[:512, :512]

    # 1. Normal Study (CXR-101)
    normal_img = generate_base_chest_xray()
    Image.fromarray(normal_img).save(SAMPLES_DIR / "sample_normal.png")

    # 2. Pneumonia Study (CXR-204: Dense RLL airspace consolidation)
    pna_img = generate_base_chest_xray().astype(np.float32)
    consolidation = np.exp(-(((x - 350)**2 + (y - 310)**2) / (2 * 40**2))) * 95.0
    consolidation += np.exp(-(((x - 380)**2 + (y - 340)**2) / (2 * 25**2))) * 70.0
    pna_img = np.clip(pna_img + consolidation, 0, 255).astype(np.uint8)
    Image.fromarray(pna_img).save(SAMPLES_DIR / "sample_pneumonia.png")

    # 3. Cardiomegaly Study (CXR-319: Marked Cardiothoracic ratio > 0.62)
    cardio_img = generate_base_chest_xray().astype(np.float32)
    heart_large = ((x - 210) / 145)**2 + ((y - 315) / 115)**2
    cardio_img[heart_large <= 1.0] += 85.0
    cardio_img = np.clip(cardio_img, 0, 255).astype(np.uint8)
    Image.fromarray(cardio_img).save(SAMPLES_DIR / "sample_cardiomegaly.png")

    # 4. Pleural Effusion Study (CXR-412: Left costophrenic angle blunting & fluid meniscus)
    eff_img = generate_base_chest_xray().astype(np.float32)
    meniscus = (x < 215) & (y > 330) & ((y - 330) > 0.55 * (215 - x))
    eff_img[meniscus] += 105.0
    eff_img = np.clip(eff_img, 0, 255).astype(np.uint8)
    Image.fromarray(eff_img).save(SAMPLES_DIR / "sample_effusion.png")

    # 5. Atelectasis Study (CXR-523: Right basilar plate-like linear subsegmental atelectasis)
    ate_img = generate_base_chest_xray().astype(np.float32)
    band = np.exp(-((y - 335 + 0.18*(x - 340))**2) / 16.0) * (x > 270) * (x < 430) * 90.0
    ate_img = np.clip(ate_img + band, 0, 255).astype(np.uint8)
    Image.fromarray(ate_img).save(SAMPLES_DIR / "sample_atelectasis.png")

    # 6. Complex Multi-Finding Study (CXR-631: Pneumonia with reactive effusion)
    complex_img = generate_base_chest_xray().astype(np.float32)
    # Right lower consolidation
    complex_img += np.exp(-(((x - 345)**2 + (y - 305)**2) / (2 * 36**2))) * 85.0
    # Left effusion meniscus
    c_meniscus = (x < 205) & (y > 345) & ((y - 345) > 0.6 * (205 - x))
    complex_img[c_meniscus] += 90.0
    complex_img = np.clip(complex_img, 0, 255).astype(np.uint8)
    Image.fromarray(complex_img).save(SAMPLES_DIR / "sample_complex.png")

    # Create Clinical Case Manifest
    manifest = [
        {
            "id": "sample_pneumonia",
            "case_id": "CXR-204",
            "patient_name": "Robert Vance",
            "age": 58,
            "gender": "Male",
            "study_date": "2026-09-02",
            "view": "Frontal PA",
            "indication": "Acute productive cough, high fever (39.1°C), and right-sided pleuritic chest discomfort for 4 days.",
            "ground_truth": "Pneumonia",
            "key_finding": "Right lower lobe focal airspace opacity consistent with lobar bacterial pneumonia.",
            "patient_summary": "The X-ray shows an area of fluid/infection in the lower part of the right lung, typical of bacterial pneumonia.",
            "severity": "High Attention"
        },
        {
            "id": "sample_normal",
            "case_id": "CXR-101",
            "patient_name": "Elena Rostova",
            "age": 34,
            "gender": "Female",
            "study_date": "2026-09-04",
            "view": "Frontal PA",
            "indication": "Routine pre-operative clearance prior to elective orthopedic surgery. No respiratory symptoms.",
            "ground_truth": "No Finding",
            "key_finding": "Clear bilateral lung fields, sharp costophrenic angles, normal cardiothoracic ratio (< 0.50).",
            "patient_summary": "Good news! Your chest X-ray looks completely clear and healthy. No signs of infection or heart enlargement.",
            "severity": "Normal"
        },
        {
            "id": "sample_cardiomegaly",
            "case_id": "CXR-319",
            "patient_name": "Harold Jenkins",
            "age": 67,
            "gender": "Male",
            "study_date": "2026-08-28",
            "view": "Frontal AP",
            "indication": "Progressive exertional dyspnea (shortness of breath on walking) and bilateral lower extremity edema.",
            "ground_truth": "Cardiomegaly",
            "key_finding": "Transverse cardiac diameter enlarged with cardiothoracic ratio of 0.62. Left ventricular prominence.",
            "patient_summary": "The scan indicates that your heart silhouette appears larger than usual, which often happens when the heart works harder under high blood pressure or fluid buildup.",
            "severity": "Moderate Attention"
        },
        {
            "id": "sample_effusion",
            "case_id": "CXR-412",
            "patient_name": "Sophia Morales",
            "age": 49,
            "gender": "Female",
            "study_date": "2026-09-01",
            "view": "Frontal PA",
            "indication": "Sharp left-sided chest pain exacerbated on deep inspiration (pleurisy) and dry cough.",
            "ground_truth": "Pleural Effusion",
            "key_finding": "Blunting of left lateral costophrenic sulcus with diagnostic fluid meniscus sign.",
            "patient_summary": "There is a small collection of fluid around the base of the left lung (called a pleural effusion), which can cause discomfort when taking a deep breath.",
            "severity": "Moderate Attention"
        },
        {
            "id": "sample_atelectasis",
            "case_id": "CXR-523",
            "patient_name": "Arthur Pendelton",
            "age": 62,
            "gender": "Male",
            "study_date": "2026-08-30",
            "view": "Frontal PA",
            "indication": "Post-operative day 2 following upper abdominal surgery with shallow respiratory effort.",
            "ground_truth": "Atelectasis",
            "key_finding": "Linear plate-like opacity in the right lung base representing discoid atelectasis.",
            "patient_summary": "A small section at the bottom of the lung has temporarily deflated slightly, which is very common after surgery and improves with deep breathing exercises.",
            "severity": "Mild Attention"
        },
        {
            "id": "sample_complex",
            "case_id": "CXR-631",
            "patient_name": "Margaret Thorne",
            "age": 73,
            "gender": "Female",
            "study_date": "2026-09-03",
            "view": "Frontal PA",
            "indication": "Persistent cough, chills, severe fatigue, and oxygen saturation 91% on room air.",
            "ground_truth": "Pneumonia + Effusion",
            "key_finding": "Multifocal right lower lobe consolidation with secondary reactive left pleural effusion.",
            "patient_summary": "The scan shows both an area of lung infection and a small amount of surrounding fluid, requiring prompt clinical attention and antibiotic therapy.",
            "severity": "High Attention"
        }
    ]

    with open(SAMPLES_DIR / "sample_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[OK] Generated 6 benchmark demonstration studies and manifest in: {SAMPLES_DIR}")

if __name__ == "__main__":
    create_all_samples()
