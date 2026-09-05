"""
Structured Clinical Radiology Report Generator for PneumoVision
Produces standardized radiological reporting text based on calibrated model outputs.
"""

from typing import Dict, Any, List
from datetime import datetime

STANDARD_DISCLAIMER = (
    "NOTICE: This is an AI-assisted research and decision-support tool. It does not constitute a "
    "medical diagnosis or formal clinical interpretation. All findings, probabilities, and heatmaps "
    "must be reviewed and confirmed by a qualified radiologist or physician before clinical action."
)

def generate_structured_report(analysis_result: Dict[str, Any], clinician_notes: str = "") -> Dict[str, Any]:
    """
    Constructs a structured radiology report following standard clinical lexicon.
    """
    case_id = analysis_result.get("case_id", "UNKNOWN")
    model_ver = analysis_result.get("model_version", "densenet121-cxr-v1.0")
    primary = analysis_result.get("primary_finding", "No Finding")
    predictions = analysis_result.get("predictions", [])
    quality = analysis_result.get("quality_status", "OPTIMAL")
    dicom = analysis_result.get("dicom_metadata") or {}

    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Group findings
    positives = [p for p in predictions if p["positive"] and p["label"] != "No Finding"]
    negatives = [p for p in predictions if not p["positive"] and p["label"] != "No Finding"]

    # 1. Technique & Quality Section
    view_pos = dicom.get("view_position", "Frontal (PA/AP)")
    technique_text = f"Single frontal chest radiograph ({view_pos}). Exposure/Quality status: {quality}."

    # 2. Findings Section
    findings_paragraphs = []
    
    # Lungs & Airspace
    pna = next((p for p in predictions if p["label"] == "Pneumonia"), None)
    ate = next((p for p in predictions if p["label"] == "Atelectasis"), None)
    
    lung_obs = []
    if pna and pna["positive"]:
        lung_obs.append(f"Focal consolidation / airspace opacity compatible with Pneumonia (Model confidence: {pna['probability_percent']}%, {pna['confidence_band']}).")
    if ate and ate["positive"]:
        lung_obs.append(f"Subsegmental / discoid opacification noted indicative of Atelectasis (Model confidence: {ate['probability_percent']}%).")
    if not lung_obs:
        lung_obs.append("Lungs appear clear without overt focal consolidation or infiltrates.")
    findings_paragraphs.append("LUNGS & AIRSPACE: " + " ".join(lung_obs))

    # Pleura
    eff = next((p for p in predictions if p["label"] == "Pleural Effusion"), None)
    if eff and eff["positive"]:
        findings_paragraphs.append(f"PLEURA: Blunting of costophrenic angle consistent with Pleural Effusion (Model probability: {eff['probability_percent']}%, {eff['confidence_band']}).")
    else:
        findings_paragraphs.append("PLEURA: No pleural effusion or visible pneumothorax.")

    # Cardiothoracic Ratio / Mediastinum
    cardio = next((p for p in predictions if p["label"] == "Cardiomegaly"), None)
    if cardio and cardio["positive"]:
        findings_paragraphs.append(f"CARDIAC SILHOUETTE: Enlarged cardiothoracic silhouette compatible with Cardiomegaly (Model probability: {cardio['probability_percent']}%).")
    else:
        findings_paragraphs.append("CARDIAC SILHOUETTE: Heart size is within normal physiological limits.")

    # 3. Impression Section
    impression_lines = []
    if positives:
        pos_names = [f"{p['label']} ({p['probability_percent']}%)" for p in positives]
        impression_lines.append(f"1. AI-assisted screening identified positive finding(s): {', '.join(pos_names)}.")
        impression_lines.append(f"2. Primary radiological finding: {primary}.")
    else:
        impression_lines.append("1. No acute cardiopulmonary abnormality detected above operational decision thresholds.")

    impression_lines.append("3. Grad-CAM visual heatmaps generated to illustrate anatomical areas of model attention.")

    return {
        "report_id": f"RPT-{case_id}",
        "case_id": case_id,
        "study_datetime": timestamp_str,
        "model_version": model_ver,
        "technique": technique_text,
        "quality_assessment": quality,
        "findings": "\n\n".join(findings_paragraphs),
        "impression": "\n".join(impression_lines),
        "primary_finding": primary,
        "positive_findings": [p["label"] for p in positives],
        "clinician_notes": clinician_notes or "None provided at ingestion time.",
        "disclaimer": STANDARD_DISCLAIMER
    }
