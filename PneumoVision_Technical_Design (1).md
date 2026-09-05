# PneumoVision — Technical Design Document
### Dataset, Taxonomy, Splits, Architecture, API & Build Plan
**Version:** 1.0 — companion to PneumoVision_PRD_FRD.md

---

## 1. Dataset Decision (verified as of Aug 2026)

| Dataset | Access | Labels | Recommended Role |
|---|---|---|---|
| **NIH ChestX-ray14** | Open download, no credentialing required | 14 labels, **NLP-mined from reports (noisy)** | **Primary training dataset for V1** — easiest to start with, large (~112K images) |
| **CheXpert** | Free, but requires registration + signed **Research Use Agreement** (Stanford AIMI/Redivis), non-commercial only | 14 labels incl. uncertainty (-1/0/1) | **Secondary dataset** — use for cross-dataset generalization test, and its uncertainty labels are valuable for calibration work |
| **MIMIC-CXR** | Requires **PhysioNet credentialing** (CITI ethics training + DUA) | Same label set as CheXpert (shared labeler) | **Optional/stretch** — only pursue once credentialed; good for a second cross-dataset generalization check |

**Recommendation for V1:** Build and train primarily on **NIH ChestX-ray14** (fastest path to a working pipeline, no credentialing delay). Once the pipeline works, register for **CheXpert** and run a cross-dataset generalization experiment (train NIH → test CheXpert, and ideally the reverse) — this is one of the highest-credibility additions from Part C of the PRD/FRD.

⚠️ Re-verify license terms at actual download time — dataset hosting/terms can change, and this check should not be treated as permanent.

## 2. Label Taxonomy (V1 — 5 classes)

| PneumoVision Label | NIH ChestX-ray14 source label | CheXpert source label | Notes |
|---|---|---|---|
| Pneumonia | `Pneumonia` | `Pneumonia` | Direct match |
| Cardiomegaly | `Cardiomegaly` | `Cardiomegaly` | Direct match |
| Pleural Effusion | `Effusion` | `Pleural Effusion` | **Name differs — map explicitly, do not assume equivalence in edge cases** |
| Atelectasis | `Atelectasis` | `Atelectasis` | Direct match |
| No Finding | `No Finding` | `No Finding` | Direct match, but definition of "normal" can vary slightly by labeler — treat as approximate |

Build this mapping as a config file (`src/preprocessing/label_map.yaml`), never hard-code it — this is what lets you add MIMIC-CXR or CheXpert-Plus later without touching training code.

## 3. Train/Val/Test Split Strategy

- **Unit of split = patient ID, not image.** A patient can have multiple X-rays; all of a patient's images must land in exactly one split.
- Use **iterative stratification** (multi-label-aware) via `scikit-multilearn`'s `IterativeStratification`, not plain `train_test_split`, to keep label co-occurrence balanced.
- Recommended ratio: 70% train / 10% val / 20% test.
- Fix a random seed and **document it** — reproducibility is part of the credibility story.
- Save the resulting patient-ID lists to disk (`data/splits/train_ids.csv`, etc.) so re-running the pipeline never silently reshuffles patients between splits.

## 4. Preprocessing Spec

```
Input (JPEG/PNG/DICOM)
  → Decode / extract pixel array (pydicom for DICOM)
  → Convert to single-channel or 3-channel (match backbone's expected input)
  → CLAHE contrast normalization (optional, configurable)
  → Resize to 320×320 (DenseNet121 default) — do NOT crop informative anatomy
  → Normalize using ImageNet mean/std (since using pretrained backbone)
  → [Train only] Augment: rotation ±7°, translation ±5%, brightness/contrast jitter ±10%
    (NO horizontal flip — laterality can matter for some findings)
```

## 5. Model Architecture Spec

```
Input: 320×320×3
  → DenseNet121 backbone (ImageNet-pretrained, unfreeze last 2 dense blocks for fine-tuning)
  → Global Average Pooling
  → Dropout (p=0.3)
  → Dense(256, activation=ReLU)
  → Dropout (p=0.3)
  → Dense(5, activation=Sigmoid)   # one sigmoid per label, independent
```

**Loss function:** Weighted Binary Cross-Entropy (class-balanced weights computed from training-set label frequencies) — or Focal Loss (γ=2) if imbalance remains severe after weighting.

**Optimizer:** AdamW, initial LR 1e-4, cosine decay schedule, early stopping on validation macro-AUROC (patience ~5 epochs).

**Per-label threshold selection:** After training, sweep thresholds on the validation set per label to maximize F1 (or a clinically-motivated recall-weighted metric), rather than using a blanket 0.5 cutoff.

## 6. Evaluation Plan

| Metric | Purpose |
|---|---|
| Per-label AUROC | Primary ranking metric, standard in literature (comparable to published baselines) |
| Per-label AUPRC | More informative than AUROC under class imbalance |
| Expected Calibration Error (ECE) | Confirms probabilities are meaningful, not just well-ranked |
| Macro-averaged F1 (at tuned thresholds) | Operating-point performance |
| Cross-dataset AUROC drop (NIH→CheXpert) | Generalization/robustness signal |
| Grad-CAM IoU vs. NIH bounding-box subset | Quantitative explainability check |

Report all of these in a single `evaluation_report.md` generated automatically at the end of training — this becomes your README's results table.

## 7. API Contracts

### `POST /v1/analyze`
**Request:** multipart/form-data — `file` (image or DICOM)
**Response:**
```json
{
  "case_id": "uuid",
  "model_version": "densenet121-v1.2",
  "quality_flag": "ok",
  "predictions": [
    {"label": "Pneumonia", "probability": 0.87, "positive": true, "confidence_band": "high"},
    {"label": "Cardiomegaly", "probability": 0.24, "positive": false, "confidence_band": "low"},
    {"label": "Pleural Effusion", "probability": 0.11, "positive": false, "confidence_band": "low"},
    {"label": "Atelectasis", "probability": 0.06, "positive": false, "confidence_band": "low"}
  ],
  "primary_finding": "Pneumonia",
  "gradcam_urls": {"Pneumonia": "/static/heatmaps/uuid_pneumonia.png"}
}
```

### `POST /v1/report`
**Request:** `{"case_id": "uuid"}`
**Response:** PDF binary (or JSON with a signed download URL)

### `GET /v1/health`
**Response:** `{"status": "ok", "model_version": "densenet121-v1.2"}`

## 8. Suggested Build Timeline (6 stages, indicative)

| Stage | Focus | Rough effort |
|---|---|---|
| 1 | Dataset download, label mapping config, patient-level split | 2–3 days |
| 2 | Preprocessing pipeline + augmentation, sanity-check visualizations | 2 days |
| 3 | Baseline DenseNet121 training (single split, no tuning) | 3–4 days |
| 4 | Full multi-label training: loss tuning, threshold sweep, calibration | 4–5 days |
| 5 | Grad-CAM integration + bounding-box IoU validation | 2–3 days |
| 6 | FastAPI backend + frontend (Streamlit first, React later) + PDF report | 4–6 days |
| Stretch | Cross-dataset generalization test on CheXpert | 2–3 days |

## 9. Minimal requirements.txt (starting point)

```
torch>=2.2
torchvision>=0.17
pytorch-grad-cam
scikit-learn
scikit-multilearn
pandas
numpy
opencv-python
pillow
pydicom
fastapi
uvicorn
python-multipart
reportlab        # PDF generation
streamlit         # V1 frontend
mlflow            # experiment tracking (or wandb)
```

---

*This document plus PneumoVision_PRD_FRD.md together cover product scope, functional requirements, and the concrete technical decisions needed to start Stage 1.*
