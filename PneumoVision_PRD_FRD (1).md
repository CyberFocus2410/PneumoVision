# PneumoVision
### An Explainable Multi-Label Deep Learning System for Automated Chest X-Ray Abnormality Screening

**Document type:** Product Requirements Document (PRD) + Functional Requirements Document (FRD)
**Version:** 1.0
**Status:** Draft for build planning

---

## PART A — PRODUCT REQUIREMENTS DOCUMENT (PRD)

## 1. Overview

PneumoVision is an AI-assisted chest X-ray analysis platform that performs multi-label disease classification, generates visual explanations (Grad-CAM), and produces a structured, human-readable summary report. It is positioned as a **research / decision-support prototype**, not a diagnostic medical device.

**One-line pitch:** Upload a chest X-ray, get calibrated multi-disease probability estimates, see exactly where the model is "looking," and export a clinician-style draft report — all with explicit uncertainty and non-diagnostic framing.

## 2. Problem Statement

- Chest X-rays are one of the most common diagnostic imaging studies, but radiologist shortages and reporting turnaround time are real bottlenecks in many healthcare settings.
- Most "AI X-ray classifier" student/portfolio projects stop at a single accuracy number on a multiclass model — they don't reflect how X-ray findings actually co-occur, don't explain *why* the model predicted something, and don't communicate uncertainty or limitations.
- There is a gap between "toy CNN classifier" and "credible, explainable, well-evaluated screening-assistance prototype." PneumoVision targets that gap.

## 3. Goals & Objectives

| Goal | Description |
|---|---|
| G1 | Build a multi-label chest X-ray classifier for 4–5 findings with strong, honestly-reported metrics |
| G2 | Provide visual explainability (Grad-CAM/Grad-CAM++) tied to every prediction |
| G3 | Communicate model uncertainty and known failure modes transparently in the UI |
| G4 | Ship a usable end-to-end web app (upload → analysis → report) |
| G5 | Produce a repository and writeup credible enough for a resume, hackathon, or grad-school application |

### Non-goals (explicitly out of scope for V1)
- Real clinical deployment or use on real patients
- Regulatory clearance (FDA/CE/CDSCO) — explicitly not pursued
- Full 14–20 disease coverage (deferred to later phases)
- Mobile native app (web-responsive only for V1)

## 4. Target Users

| Persona | Need |
|---|---|
| ML/CV learner or student | Wants a well-scoped, technically credible medical-imaging project |
| Hackathon judge / recruiter | Wants to see explainability, evaluation rigor, and honest framing, not just a demo |
| Hobbyist/researcher | Wants a base platform to try new architectures, calibration methods, datasets |
| (Explicitly NOT) Clinicians for real patient use | Out of scope — UI must actively discourage this |

## 5. Success Metrics

**Model quality**
- AUROC ≥ 0.80 per label on held-out test set (competitive with published DenseNet121 CheXpert/NIH baselines)
- Calibration error (ECE) reported and minimized, not just accuracy/AUROC
- No patient-level data leakage between train/val/test (verified, not assumed)

**Product quality**
- End-to-end latency (upload → report) under ~5 seconds on GPU inference
- Grad-CAM generated for every positive prediction above threshold
- Report generation success rate ≥ 99% (no silent failures)

**Project credibility**
- Reproducible pipeline (documented dataset version, splits, seeds)
- Clear "not a diagnostic tool" disclosure surfaced at every output point, not just once in a footer

## 6. Assumptions & Constraints

- Public datasets (NIH ChestX-ray14, CheXpert, MIMIC-CXR) will be used — **availability, license terms, and credentialing requirements must be re-verified at dataset-selection time**, since some (e.g., MIMIC-CXR) require credentialed PhysioNet access and a signed data use agreement.
- Labels in NIH ChestX-ray14 are NLP-mined from radiology reports, not radiologist-verified — this is a known noise source and must be documented as a limitation, not hidden.
- Compute: assume a single consumer/cloud GPU (e.g., T4/3060-class) is available for training; architecture choices should respect this.
- No real patient data, no PHI, no live clinical integration in V1.

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Dataset label noise (NIH) | Model learns incorrect associations | Use CheXpert (has uncertainty labels) or MIMIC-CXR alongside NIH; report per-dataset performance separately |
| Patient-level data leakage (same patient in train & test) | Inflated, misleading metrics | Enforce patient-ID-based splitting, not image-based splitting |
| Class imbalance (most X-rays are Normal or one finding) | Poor recall on rare classes | Focal loss, class-weighted BCE, oversampling minority labels |
| Users misinterpreting output as diagnosis | Real-world harm if misused, reputational risk | Persistent non-diagnostic disclaimers, confidence bands, "for research/education only" gating on every screen |
| Grad-CAM highlighting plausible-but-wrong regions ("Clever Hans" effect / shortcut learning) | Undermines explainability claims | Validate Grad-CAM against known anatomical regions; report failure cases honestly, not just successes |
| Distribution shift (model trained on one hospital's X-ray machines fails on another's) | Poor generalization | Explicitly test cross-dataset generalization (train on one, eval on another) and report the drop |

## 8. High-Level Milestones

1. **Dataset preparation** — selection, licensing check, patient-level split, label harmonization
2. **Preprocessing pipeline** — resizing, normalization, augmentation, DICOM/PNG handling
3. **Baseline model** — DenseNet121 transfer learning, multi-label sigmoid head
4. **Full multi-label training** — loss tuning, imbalance handling, calibration
5. **Explainability layer** — Grad-CAM/Grad-CAM++, sanity checks
6. **Web application & reporting** — FastAPI backend, React/Streamlit frontend, PDF report export

---

## PART B — FUNCTIONAL REQUIREMENTS DOCUMENT (FRD)

## 9. System Architecture Overview

```
┌────────────┐   ┌──────────────┐   ┌───────────────┐   ┌──────────────────┐
│  Frontend  │──▶│   Backend    │──▶│  Inference     │──▶│  Explainability   │
│ (React/    │   │  (FastAPI)   │   │  Service       │   │  (Grad-CAM)       │
│  Streamlit)│◀──│              │◀──│  (PyTorch)     │◀──│                   │
└────────────┘   └──────────────┘   └───────────────┘   └──────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ Report Engine │
                │ (template +   │
                │  optional LLM)│
                └───────────────┘
```

## 10. Functional Modules & Requirements

### FR-1: Image Upload & Ingestion
- FR-1.1: Accept JPEG, PNG, and DICOM (.dcm) chest X-ray files.
- FR-1.2: Validate file type and reject non-image/non-DICOM uploads with a clear error.
- FR-1.3: If DICOM, extract pixel data and relevant metadata (view position, modality) while stripping/ignoring patient-identifying tags for privacy.
- FR-1.4: Enforce max file size (e.g., 20MB) and reasonable resolution bounds.

### FR-2: Image Quality Validation
- FR-2.1: Detect and reject non-chest-X-ray images (basic sanity classifier or heuristic check).
- FR-2.2: Flag likely poor-quality inputs: extreme over/under-exposure, heavy artifacts, wrong orientation, non-PA/AP view where a frontal view is expected.
- FR-2.3: Return a quality score/flag to the frontend rather than silently proceeding on bad input.

### FR-3: Preprocessing
- FR-3.1: Resize to model input resolution (e.g., 224×224 or 320×320 depending on architecture).
- FR-3.2: Normalize pixel intensities (ImageNet stats if using pretrained backbone, or dataset-specific stats).
- FR-3.3: Apply histogram equalization/CLAHE as an optional preprocessing step for contrast normalization across scanners.
- FR-3.4: Training-time augmentation: rotation (±5–10°), slight translation, brightness/contrast jitter. **Do not** apply horizontal flips if laterality (L/R markers) matters for any target label.

### FR-4: Multi-Label Disease Classification
- FR-4.1: Model outputs independent sigmoid probability per label (not softmax) — labels are not mutually exclusive.
- FR-4.2: V1 label set: Pneumonia, Cardiomegaly, Pleural Effusion, Atelectasis, No Finding (Normal).
- FR-4.3: Each label has an independently tunable decision threshold (not a fixed 0.5 default), chosen via validation-set PR curves per class.
- FR-4.4: Return per-label probability, binary flag (above/below threshold), and a model confidence/uncertainty indicator.

### FR-5: Explainability (Grad-CAM)
- FR-5.1: Generate a Grad-CAM (or Grad-CAM++) heatmap for every label whose probability exceeds a display threshold.
- FR-5.2: Overlay heatmap on the original image with adjustable opacity.
- FR-5.3: Support toggling between Original / Heatmap / Side-by-side views.
- FR-5.4: Store heatmaps as part of the case record for later review/audit.

### FR-6: Risk / Finding Summary
- FR-6.1: Rank findings by probability and present a "primary finding" (highest-confidence positive label).
- FR-6.2: Display a calibrated confidence band, not just a raw sigmoid score (e.g., "Moderate confidence: 70–85% range").
- FR-6.3: Explicitly surface low-confidence / borderline cases differently from high-confidence ones (e.g., "Uncertain — recommend clinical correlation").

### FR-7: AI-Generated Report
- FR-7.1: Generate a structured, templated report: Findings, Impression, Confidence notes, Limitations, Disclaimer.
- FR-7.2: Report must include the fixed disclaimer: *"This is an AI-assisted research tool and does not constitute a medical diagnosis. All findings require review by a qualified radiologist."*
- FR-7.3: Support export to PDF.
- FR-7.4: If an LLM is used for report phrasing, it must only rephrase structured model outputs — it must never invent findings not produced by the classifier (no hallucinated clinical claims).

### FR-8: Dashboard / Frontend
- FR-8.1: Upload panel with drag-and-drop.
- FR-8.2: Results panel: bar chart of per-label probabilities, primary finding, quality flag.
- FR-8.3: Image viewer with Original/Grad-CAM toggle.
- FR-8.4: "Generate Report" action producing a downloadable PDF.
- FR-8.5: Persistent, non-dismissible-by-default disclaimer banner.

### FR-9: Backend API
- FR-9.1: `POST /analyze` — accepts image, returns predictions + heatmap references.
- FR-9.2: `POST /report` — accepts case ID, returns generated report (PDF/JSON).
- FR-9.3: `GET /health` — service health check for model/backend status.
- FR-9.4: Versioned API (`/v1/...`) to allow future breaking changes without breaking the frontend.

### FR-10: Model Training Pipeline (Offline, not runtime)
- FR-10.1: Configurable via a single config file (dataset paths, label set, hyperparameters, architecture choice).
- FR-10.2: Patient-level stratified split (train/val/test), reproducible via fixed seed.
- FR-10.3: Logging of metrics (loss, per-class AUROC, PR-AUC) to a tracked experiment log (e.g., MLflow/W&B/local CSV at minimum).
- FR-10.4: Checkpointing and best-model selection based on validation macro-AUROC, not just loss.

### FR-11: Logging, Monitoring & Error Handling
- FR-11.1: All inference requests logged (input hash, model version, output) for reproducibility/audit — no PHI stored.
- FR-11.2: Graceful failure messages for corrupt files, model load failures, timeout scenarios.
- FR-11.3: Model version tag returned with every prediction so results are traceable to a specific trained checkpoint.

## 11. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Inference (classification + Grad-CAM) under ~3–5s per image on GPU |
| Scalability | Backend stateless and horizontally scalable (containerized) |
| Security/Privacy | No PHI persisted; DICOM tags stripped of identifiers on ingestion |
| Reliability | Health-check endpoint; failed inference should not crash the service |
| Maintainability | Config-driven training; modular `src/` structure as already outlined |
| Transparency | Every screen showing a prediction must show the non-diagnostic disclaimer |
| Accessibility | Frontend usable with keyboard nav and screen-reader-friendly labels on charts |

## 12. Data Requirements

- Image data: chest X-rays (frontal, PA/AP), resolution ≥ 512×512 source (downscaled for model input).
- Labels: multi-label binary per finding, harmonized across datasets if more than one is used (label taxonomy must be mapped explicitly, e.g., NIH's "Infiltration" vs CheXpert's overlapping categories are *not* identical and must be reconciled or kept dataset-specific).
- Metadata (where available): patient ID (for split integrity only, never displayed), view position, age/sex (optional auxiliary input, see improvisation section).
- Split: patient-level, stratified by label co-occurrence where feasible (iterative stratification for multi-label data).

## 13. Repository Structure (as proposed, retained)

```
PneumoVision/
├── data/
├── notebooks/
│   ├── 01_eda.ipynb
│   ├── 02_preprocessing.ipynb
│   └── 03_training.ipynb
├── src/
│   ├── preprocessing/
│   ├── models/
│   ├── training/
│   ├── inference/
│   └── explainability/
├── backend/
├── frontend/
├── models/
├── tests/
├── requirements.txt
├── README.md
└── app.py
```

---

## PART C — IMPROVISATION IDEAS (BEYOND THE ORIGINAL PLAN)

These are upgrades that would meaningfully raise the technical and product credibility of PneumoVision beyond the baseline plan. Grouped by area, roughly ordered by impact-to-effort ratio within each group.

### 1. Model Training Improvements

- **Loss function**: Use **weighted BCE or Focal Loss** instead of plain BCE — chest X-ray datasets are heavily imbalanced (most images are Normal or have 1 finding), and plain BCE lets the model coast on majority-class performance.
- **Uncertainty-aware labels**: If you use CheXpert, don't discard the "uncertain" (-1) labels — model them explicitly (either as a separate class, via label smoothing, or using the "U-Ones"/"U-Zeros" strategies from the CheXpert paper) rather than dropping data.
- **Calibration, not just accuracy**: Add **temperature scaling** post-training so that a "70%" really means ~70% empirical likelihood. Report Expected Calibration Error (ECE) alongside AUROC — this is rare in student projects and signals real rigor.
- **Deep ensembles or MC Dropout** for uncertainty estimation: run inference with dropout active (Monte Carlo Dropout) or train 2–3 model seeds, and report prediction variance as an uncertainty signal shown in the UI ("high model disagreement — treat with caution").
- **Test-time augmentation (TTA)**: average predictions over a few augmented versions of the input image at inference time for a small but consistent robustness boost.
- **Self-supervised pretraining**: Instead of only ImageNet-pretrained DenseNet121, consider further pretraining (or using an existing checkpoint) with a medical-imaging self-supervised approach (e.g., SimCLR/MoCo-style contrastive pretraining on unlabeled chest X-rays) before fine-tuning — this consistently improves transfer performance in medical imaging literature.
- **Architecture comparison as a first-class deliverable**: Since you already planned to compare DenseNet121 vs EfficientNet vs ViT, formalize this into a benchmark table (per-class AUROC, params, inference time) — this table itself becomes a strong portfolio artifact.
- **Cross-dataset generalization test**: Train on NIH, evaluate zero-shot on CheXpert (or vice versa). Report the performance drop honestly. This single experiment communicates more ML maturity than almost anything else in the project, because it demonstrates awareness of distribution shift.

### 2. Data Handling Improvements

- **Patient-level, iterative-stratified splitting**: Use a multi-label-aware stratification algorithm (e.g., scikit-multilearn's iterative stratification) rather than a naive random split, to keep label co-occurrence balanced across train/val/test while still splitting by patient ID.
- **Label harmonization layer**: If combining datasets, build an explicit mapping table (finding → dataset-specific label name) rather than assuming label names align 1:1 across NIH/CheXpert/MIMIC.
- **Bounding-box subset for weak localization checks**: NIH ChestX-ray14 includes a small subset of images with radiologist bounding boxes. Use this subset purely for *evaluating* whether Grad-CAM activations overlap with true abnormality regions (IoU-style sanity check) — this directly strengthens your explainability claims with quantitative evidence instead of "looks reasonable."
- **Synthetic augmentation for rare classes**: For underrepresented findings, consider targeted augmentation (not naive oversampling) or lightweight GAN-based augmentation, evaluated carefully to ensure it doesn't introduce artifacts the model then "cheats" on.
- **Metadata-aware bias auditing**: Check model performance broken down by patient age/sex/view-position subgroups (where metadata exists) to catch systematic bias early, and report it — even a "we checked and found X" paragraph is a strong differentiator.

### 3. Analysis / Explainability Improvements

- **Grad-CAM++ or Score-CAM instead of vanilla Grad-CAM**: These produce sharper, more localized heatmaps, especially useful for smaller findings like nodules or subtle effusions.
- **Quantitative explainability validation**: As noted above, use the NIH bounding-box subset to compute a rough localization accuracy metric for your heatmaps — turns "explainability" from a nice visual into a measured capability.
- **Out-of-distribution (OOD) detection**: Add a lightweight check (e.g., based on feature-space distance or a simple autoencoder reconstruction error) to flag inputs that don't look like the training distribution (wrong body part, lateral view when frontal expected, non-medical image) — this closes a real robustness gap.
- **Structured, radiology-lexicon-style reporting**: Instead of free-text-only reports, structure findings using standard radiology reporting conventions (Findings / Impression / Recommendation sections) — makes the output feel closer to real clinical documentation style (while still clearly labeled as AI-assisted, non-diagnostic).

### 4. Product / Idea-Level Improvements

- **Multi-view fusion**: Support both frontal (PA/AP) and lateral views when available, fusing features from both — cardiomegaly and effusion assessment in particular benefit from lateral views in real radiology practice.
- **Longitudinal comparison mode**: Allow uploading two X-rays from the same (synthetic/demo) patient at different times and highlight change in findings over time — a feature real radiology workflows care about a lot, and one almost no student project attempts.
- **Human-in-the-loop feedback loop**: Let a user (simulating a reviewing clinician) mark a prediction as "agree/disagree," log this, and use it later for error analysis or active-learning-style dataset curation — demonstrates MLOps thinking, not just modeling.
- **Model/version audit trail**: Every report includes the exact model version, dataset version, and threshold configuration used — useful both for reproducibility and to demonstrate you understand ML governance basics.
- **"Confidence-gated" UI behavior**: Below a certain confidence/uncertainty threshold, the UI should visually de-emphasize the finding and explicitly say "insufficient model confidence — please disregard automated suggestion," rather than presenting all outputs with equal visual weight.
- **Second-model cross-check**: Run two differently-trained models (e.g., DenseNet121 and EfficientNet) and flag cases where they disagree significantly — disagreement itself is a useful signal for "this case needs human review."

### 5. Deployment / MLOps Improvements

- **Containerize backend + model serving separately** (e.g., model server via TorchServe/Triton, API layer via FastAPI) so the model can be updated/rolled back independently of the API.
- **Model versioning & rollback**: Store models with semantic versions; API should be able to serve a specific version on request (useful for demoing "here's how the model improved from v1 to v2").
- **Basic drift monitoring**: Track the distribution of predicted probabilities over time in a demo log; a shift could signal the kind of input distribution the model is seeing has changed — good to at least stub out even if not fully implemented.
- **CI for the training pipeline**: Even a simple GitHub Actions workflow that runs a quick sanity training run (few epochs, tiny data subset) on push helps demonstrate engineering discipline.

---

## Suggested Prioritization for a Realistic Build

If time/resources are limited, the highest-leverage "beyond baseline" additions, ranked:

1. Patient-level, properly stratified data splitting (correctness, not just a feature)
2. Focal/weighted loss for class imbalance
3. Calibration (temperature scaling) + reporting ECE
4. Grad-CAM++ with bounding-box-based quantitative validation
5. Cross-dataset generalization experiment
6. Confidence-gated UI + uncertainty display
7. Everything else in Part C as stretch goals

---

*Next step: pick the exact dataset(s), finalize the 5-label taxonomy with mapped definitions across datasets, and lock the train/val/test split strategy before writing any training code.*
