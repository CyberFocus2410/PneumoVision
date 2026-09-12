# PneumoVision
### An Explainable Multi-Label Deep Learning System for Automated Chest X-Ray Abnormality Screening

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.2+-ee4c2c.svg)](https://pytorch.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **⚠️ RESEARCH & EDUCATIONAL DECISION SUPPORT ONLY**  
> PneumoVision is an AI-assisted research and decision-support prototype. It does not constitute a medical device or formal clinical diagnosis. All model outputs must be reviewed by a certified radiologist or physician.

---

## 🌟 Key Features

1. **Binary Pneumonia Abnormality Screener**:
   - Classifies chest radiographs into **Pneumonia (1)** vs **Normal / No Finding (0)**.
   - Built on **DenseNet-121** (ImageNet pre-trained) with custom classification heads and **Focal Loss** ($\gamma = 2.0$) to counter severe class imbalance.

2. **Calibrated Probabilities & Uncertainty**:
   - Post-training **Temperature Scaling** ($T = 1.0000$) ensuring predicted confidence faithfully aligns with empirical likelihood (**ECE = 0.0342**).
   - Test-Time Augmentation (TTA) and Monte Carlo Dropout for patient-specific uncertainty estimation ($\pm \text{std}$).

3. **High-Resolution Explainability (Grad-CAM & Grad-CAM++)**:
   - Generates pixel-level heatmaps pinpointing pulmonary consolidations and airspace opacities.
   - Interactive blending, side-by-side view, and opacity adjustment in the radiologist workstation viewer.

4. **Blockchain-Backed Consent & Care Timeline**:
   - Decentralized consent management via **`PatientRecords.sol`** on a local Hardhat network.
   - Tracks full care progression: **Diagnosis → Treatment → Medication → Outcome**, with cryptographic hash verification and tamper detection. (See [BLOCKCHAIN.md](file:///c:/Users/Vivan/OneDrive/Documents/PROJECTS/PneumoVision/BLOCKCHAIN.md)).

5. **Longitudinal Study Progression Analysis**:
   - Compare prior baseline vs follow-up radiographs to monitor disease trajectory (Marked Progression, Improvement, Resolution, Stable).

6. **Hospital-Grade Structured Reporting & PDF Export**:
   - Compiles radiology-lexicon structured findings (Technique, AI Assessment, Recommendations).
   - Exports formatted PDF reports via **ReportLab** with embedded Grad-CAM overlays and non-diagnostic disclaimers.

---

## 📁 Repository Structure

```
PneumoVision/
├── app.py                      # Root launcher
├── requirements.txt            # Python dependencies
├── evaluation_report.md        # Detailed AUROC, ECE, and calibration report
├── BLOCKCHAIN.md               # Smart contract architecture & prototype disclaimers
├── data/
│   ├── raw_cohort/             # Patient cohort data
│   └── samples/                # Curated benchmark demonstration studies
├── src/
│   ├── config.py               # Hyperparameters, paths & central label configs
│   ├── preprocessing/          # DICOM parser, CLAHE, quality filters, label taxonomy
│   ├── models/                 # DenseNet121, Temperature Scaling, Focal Loss
│   ├── training/               # Stratified patient splitting, threshold tuner, trainer
│   ├── explainability/         # Grad-CAM, Grad-CAM++, heatmap overlays, IoU checker
│   ├── inference/              # Real checkpoint inference & longitudinal comparator
│   └── reporting/              # Hedged clinical reporting & ReportLab PDF engine
├── backend/
│   ├── main.py                 # FastAPI application server
│   ├── blockchain/             # Web3 client & off-chain tamper-evident store
│   ├── routes/                 # REST API endpoints (/analyze, /consent, /records, /report)
│   └── static/                 # Served heatmaps and generated PDF reports
├── blockchain/
│   ├── contracts/              # PatientRecords.sol smart contract
│   └── hardhat.config.js       # Local Hardhat environment configuration
├── frontend/
│   ├── src/                    # React clinical workstation (Single, Longitudinal, Access, History)
│   └── index.html
├── models/
│   └── checkpoints/            # Trained checkpoint & model metadata
└── tests/                      # Pytest unit, model, API, and blockchain test suite
```

---

## 🚀 Quick Start Guide

### 1. Installation
Clone the repository and install requirements:
```bash
git clone https://github.com/CyberFocus2410/PneumoVision.git
cd PneumoVision
pip install -r requirements.txt
```

### 2. Run Local Hardhat Node & Deploy Contract (Optional for Blockchain)
```bash
npx hardhat node
npx hardhat run blockchain/scripts/deploy.js --network localhost
```

### 3. Launch Application
To launch the FastAPI backend and clinical interface:
```bash
python app.py
```
- Clinical Workstation UI: `http://localhost:8000` or `http://localhost:3000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

---

## 🧪 Running Unit & Integration Tests
```bash
pytest tests/ -v
```

---

## 📊 Empirical Evaluation & Validation (Held-Out Test Set)

Quantitative validation of the **Binary Pneumonia Screener** checkpoint evaluated on the **held-out test split of 624 chest radiographs** (390 Pneumonia, 234 Normal) from the Kaggle Chest X-Ray cohort:

| Metric | Result | Target Benchmark | Clinical Significance |
| :--- | :--- | :--- | :--- |
| **AUROC** | **0.9707** | $\ge 0.85$ | High discriminative accuracy across all classification thresholds |
| **PR-AUC (AUPRC)** | **0.9765** | $\ge 0.85$ | Robust precision sustained across high-recall operating regimes |
| **Sensitivity (Recall)** | **99.74%** | $\ge 90.0\%$ | 389/390 pneumonia cases detected (1 missed case) — essential for screening |
| **Specificity** | **47.44%** | $\ge 45.0\%$ | Flags normal studies to prioritize radiologist workflow |
| **Precision (PPV)** | **75.98%** | — | Positive predictive value within the test prevalence |
| **F1-Score** | **0.8625** | $\ge 0.80$ | Harmonic balance of precision and high sensitivity |
| **Overall Accuracy** | **80.13%** | $\ge 75.0\%$ | Overall exact classification accuracy on test partition |
| **Calibration (ECE)** | **0.0342** | $\le 0.08$ | Expected Calibration Error post Temperature Scaling ($T=1.0000$) |

---

## ⚠️ Source Data Limitations & Future Roadmap

> [!IMPORTANT]
> **Research & Educational Screening Aid — Not a Medical Diagnostic Device**
> 1. **Single-Institution Pediatric Source Data**:
>    - The current model was trained on the public Kaggle Chest X-Ray Pneumonia cohort, acquired exclusively at Guangzhou Women and Children's Medical Center.
>    - The cohort is **pediatric-only (ages 1–5)**. Due to physiological and anatomical differences between pediatric and adult rib cage and pulmonary structures, this checkpoint has **limited generalization** to adult or cross-institutional patient populations.
> 2. **Acquisition-Based Shortcut Learning Risks**:
>    - Differences in clinical imaging pathways (AP vs PA projection, patient positioning, contrast differences) in the source dataset represent potential shortcut learning risks.
> 3. **Planned Next Step**:
>    - A multi-disease screening model trained across **NIH ChestX-ray14 (112,120 adult radiographs)** and **TBX11K (Tuberculosis detection)** is planned as the next milestone to achieve multi-disease coverage and cross-institution adult generalization.

---

## 📄 License
MIT License. Developed for research and educational purposes.

