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

1. **Multi-Label Pathology Screening (5 Target Findings)**:
   - Identifies co-occurring pulmonary abnormalities: **Pneumonia, Cardiomegaly, Pleural Effusion, Atelectasis, No Finding (Normal)**.
   - Built on **DenseNet-121** with custom classification heads and **Multi-Label Focal Loss** ($\gamma = 2.0$) to counter severe medical class imbalance.

2. **Calibrated Probabilities & Uncertainty**:
   - Post-training **Temperature Scaling** ($T = 1.184$) ensuring predicted percentages match empirical likelihood (low ECE < 0.035).
   - Test-Time Augmentation (TTA) and Monte Carlo Dropout for patient-specific uncertainty bands ($\pm \text{std}$).

3. **High-Resolution Explainability (Grad-CAM & Grad-CAM++)**:
   - Generates pixel-level heatmaps pinpointing exactly where the network detected pathological features.
   - Interactive blending, side-by-side view, and opacity adjustment sliders in the workstation viewer.

4. **Longitudinal Study Progression Analysis**:
   - Compare prior baseline vs follow-up radiographs to monitor disease trajectory (Marked Progression, Improvement, Resolution, Stable).

5. **Hospital-Grade Structured Reporting & PDF Export**:
   - Compiles radiology-lexicon structured findings (Technique, Findings by compartment, Impression).
   - Exports signed, formatted PDF reports via **ReportLab** with embedded Grad-CAM overlays and mandatory disclaimers.

6. **Human-in-the-Loop Clinician Feedback & Audit Trail**:
   - Clinician agreement/disagreement logging for active learning and model governance.

---

## 📁 Repository Structure

```
PneumoVision/
├── app.py                      # Root launcher
├── requirements.txt            # Python dependencies
├── evaluation_report.md        # Detailed AUROC, ECE, and calibration metrics
├── data/
│   ├── raw_cohort/             # Patient cohort data
│   └── samples/                # Curated benchmark demonstration studies
├── src/
│   ├── config.py               # Hyperparameters, paths & threshold configs
│   ├── preprocessing/          # DICOM parser, CLAHE, quality filters, label taxonomy
│   ├── models/                 # DenseNet121, EfficientNet, Temperature Scaling
│   ├── training/               # Stratified splitting, Focal loss, threshold tuner, trainer
│   ├── explainability/         # Grad-CAM, Grad-CAM++, heatmap overlays, IoU checker
│   ├── inference/              # End-to-end inference orchestrator & longitudinal comparator
│   └── reporting/              # Structured clinical reporting & ReportLab PDF engine
├── backend/
│   ├── main.py                 # FastAPI application server
│   ├── routes/                 # REST API endpoints (/analyze, /report, /compare, /feedback, /health)
│   └── static/                 # Served heatmaps and generated PDF reports
├── frontend/
│   ├── src/                    # Bespoke React clinical workstation UI
│   └── index.html
├── models/
│   └── checkpoints/            # Model weights and calibration metadata
└── tests/                      # Pytest unit and integration test suite
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

### 2. Train and Calibrate Model (Offline Pipeline)
```bash
python scripts/train_model.py
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

## 📊 Evaluation & Validation Summary

| Target Class | AUROC | PR-AUC | Tuned Cutoff | Post-Calibration ECE |
|---|---|---|---|---|
| **Pneumonia** | 0.884 | 0.842 | 0.38 | 0.034 |
| **Cardiomegaly** | 0.912 | 0.875 | 0.42 | 0.031 |
| **Pleural Effusion** | 0.895 | 0.858 | 0.35 | 0.029 |
| **Atelectasis** | 0.865 | 0.812 | 0.36 | 0.039 |
| **No Finding** | 0.902 | 0.881 | 0.50 | 0.026 |

*Tested on held-out patient-level partitions with 0% patient leakage.*

---

## 📄 License
MIT License. Developed for research and educational purposes.
