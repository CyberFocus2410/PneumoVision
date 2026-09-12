"""
PneumoVision Clinical & Patient-Friendly Radiology Reporting Module.

Generates structured decision-support reports containing:
- Findings: Generic objective radiographic observations.
- AI Assessment: Suggested pathology pattern(s) (e.g. Pneumonia) without stating a diagnosis as fact.
- Calibrated Confidence: Temperature-calibrated probabilities, operating cutoffs, and uncertainty intervals.
- Recommendation: Clinical / radiologist review recommendation (never definitive medical assertions).

Supports both binary screening mode (Pneumonia vs No Finding) and multi-label mode based on central config.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

from src.config import (
    TARGET_CLASSES,
    DEFAULT_THRESHOLDS,
    LABEL_MODE,
    get_target_classes,
    get_default_thresholds,
)

STANDARD_DISCLAIMER = (
    "NOTICE & REGULATORY DISCLAIMER: PneumoVision is an artificial intelligence-assisted "
    "screening research prototype and clinical decision-support tool. It does NOT provide a definitive medical "
    "diagnosis or replace physician judgment. All model observations, calibrated confidence scores, and Grad-CAM++ "
    "visualizations must be formally reviewed and confirmed by a licensed radiologist or healthcare provider."
)

PLAIN_GLOSSARY = {
    "Pneumonia": "An inflammatory condition or infection causing fluid or cellular buildup in lung air sacs, often associated with cough, fever, or difficulty breathing.",
    "No Finding": "No overt focal consolidation, effusion, or gross radiopaque abnormality detected on the evaluated frontal view above screening thresholds.",
    "Cardiomegaly": "Enlargement of the cardiac silhouette shadow beyond standard cardiothoracic ratio limits.",
    "Pleural Effusion": "Fluid accumulation within the pleural space between the parietal and visceral pleura.",
    "Atelectasis": "Subsegmental volume loss or collapse of pulmonary parenchyma.",
    "Consolidation": "Replacement of normal alveolar air by fluid, exudate, or inflammatory debris producing increased radiographic opacity.",
    "Grad-CAM": "Gradient-weighted Class Activation Mapping highlighting regions contributing to the neural network's visual attention."
}


def generate_plain_patient_summary(
    primary_finding: str,
    predictions: List[Dict[str, Any]],
    target_classes: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Constructs a clear, non-definitive, patient-accessible summary explaining AI screening observations
    without delivering diagnoses as absolute facts.
    """
    target_classes = target_classes or get_target_classes()
    positives = [p for p in predictions if p.get("positive", False) and p["label"] not in ("No Finding", "No_Finding", "Normal")]
    
    primary_pred = next((p for p in predictions if p["label"] == primary_finding), None)
    prob_pct = f"{primary_pred['probability_percent']}%" if primary_pred else "N/A"
    conf_band = primary_pred.get("confidence_band", "MODERATE_CONFIDENCE").replace("_", " ").title() if primary_pred else "Calibrated"

    if not positives or primary_finding in ("No Finding", "No_Finding", "Normal"):
        headline = "No Acute Radiographic Findings Suggested by AI Screener"
        findings_desc = (
            "The visual screening algorithm evaluated the lung fields and thoracic silhouette. "
            "No focal pulmonary airspace opacities, large consolidations, or gross fluid accumulations were detected "
            "above the calibrated screening threshold."
        )
        ai_assessment = (
            "AI Assessment: No acute cardiopulmonary abnormalities suggested on this single radiograph. "
            "Note: This screening assessment does NOT constitute a clean bill of health or guarantee absence of early, "
            "subtle, or non-radiopaque respiratory conditions."
        )
        confidence_text = (
            f"Calibrated Negative Probability: {prob_pct} (Confidence Tier: {conf_band})."
        )
        recommendation_text = (
            "Clinical review recommended. If you are experiencing respiratory symptoms such as cough, fever, chest pain, "
            "or shortness of breath, please consult your physician or healthcare team for formal examination."
        )
        what_to_do = [
            "Share these screening observations with your treating physician for medical context.",
            "Discuss ongoing symptoms (e.g., fever, cough, fatigue) even if this screening radiograph shows no acute findings.",
            "Seek prompt emergency medical care if you experience severe breathlessness, chest tightness, or dizziness."
        ]
        questions_for_doctor = [
            "Do these initial screening observations correlate with my clinical symptoms?",
            "Are further diagnostic tests, auscultation, or lab work indicated?"
        ]
    elif primary_finding == "Pneumonia":
        headline = "Pattern Suggestive of Pulmonary Infiltrate / Pneumonia Flagged for Review"
        findings_desc = (
            "An area of increased radiographic density (pulmonary opacity / possible airspace consolidation) was observed "
            "within the lung field on the radiograph."
        )
        ai_assessment = (
            "AI Assessment: Image patterns are suggestive of Pneumonia (inflammatory consolidation). "
            "This is an automated pattern-recognition observation, NOT a definitive diagnosis. Clinical confirmation is required."
        )
        confidence_text = (
            f"Calibrated Confidence: {prob_pct} (Confidence Tier: {conf_band})."
        )
        recommendation_text = (
            "Clinical / radiologist review strongly recommended. A licensed physician must evaluate this radiograph in conjunction "
            "with patient history, physical examination (lung sounds), and vital signs to determine if targeted therapy (e.g. antibiotics) is warranted."
        )
        what_to_do = [
            "Contact your healthcare provider promptly for formal clinical interpretation and physical exam.",
            "Monitor your vital signs, oxygen saturation, and body temperature closely.",
            "Seek immediate urgent care if you experience severe shortness of breath, confusion, or persistent high fever."
        ]
        questions_for_doctor = [
            "Does the observed lung density correlate with my physical exam and symptoms?",
            "Is prescription antimicrobial medication or supportive respiratory care recommended?",
            "Will a follow-up chest radiograph be required to verify resolution?"
        ]
    else:
        headline = f"Pattern Suggestive of {primary_finding} Flagged for Review"
        findings_desc = (
            f"Radiographic features consistent with possible {primary_finding} were identified on the image."
        )
        ai_assessment = (
            f"AI Assessment: Visual features suggestive of {primary_finding}. "
            "This is a probabilistic model suggestion and not a clinical diagnosis."
        )
        confidence_text = f"Calibrated Confidence: {prob_pct} ({conf_band})."
        recommendation_text = (
            "Clinical / radiologist review recommended to correlate image features with patient examination."
        )
        what_to_do = [
            "Consult your medical provider for formal clinical correlation and next steps.",
            "Follow prescribed physician guidance for management."
        ]
        questions_for_doctor = [
            f"How does this finding of suspected {primary_finding} align with my clinical presentation?",
            "What further diagnostic evaluations or treatment adjustments are recommended?"
        ]

    # Relevant glossary
    relevant_terms = {}
    for term in [primary_finding, "Consolidation", "Grad-CAM", "No Finding"]:
        if term in PLAIN_GLOSSARY:
            relevant_terms[term] = PLAIN_GLOSSARY[term]

    return {
        "headline": headline,
        "findings_description": findings_desc,
        "ai_assessment": ai_assessment,
        "calibrated_confidence": confidence_text,
        "clinical_recommendation": recommendation_text,
        "explanation": f"{findings_desc} {ai_assessment}",
        "what_to_do_next": what_to_do,
        "questions_for_doctor": questions_for_doctor,
        "glossary": relevant_terms,
    }


def generate_structured_report(
    analysis_result: Dict[str, Any],
    clinician_notes: str = ""
) -> Dict[str, Any]:
    """
    Constructs a comprehensive, dual-mode report adhering to non-definitive AI safety standards.
    Outputs structured Findings, AI Assessment, Calibrated Confidence, and Recommendation sections.
    """
    case_id = analysis_result.get("case_id", "UNKNOWN")
    model_ver = analysis_result.get("model_version", "densenet121-cxr-v1.0")
    primary = analysis_result.get("primary_finding", "No Finding")
    predictions = analysis_result.get("predictions", [])
    quality = analysis_result.get("quality_status", "OPTIMAL")
    dicom = analysis_result.get("dicom_metadata") or {}

    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Positive findings excluding 'No Finding'
    positives = [p for p in predictions if p.get("positive", False) and p["label"] not in ("No Finding", "No_Finding", "Normal")]

    # 1. Plain English Patient Summary
    patient_summary = generate_plain_patient_summary(primary, predictions)

    # 2. Formal Technical Clinical Findings Section
    view_pos = dicom.get("view_position", "Frontal (PA/AP)")
    technique_text = f"Single frontal chest radiograph projection ({view_pos}). Acquisition Quality Index: {quality}."

    findings_paragraphs = []

    # Lungs & Airspace
    pna = next((p for p in predictions if p["label"] == "Pneumonia"), None)
    ate = next((p for p in predictions if p["label"] == "Atelectasis"), None)

    lung_obs = []
    if pna and pna.get("positive", False):
        lung_obs.append(
            f"Focal increased density / opacity observed in the pulmonary parenchyma. "
            f"AI pattern suggestive of Pneumonia (Calibrated probability: {pna['probability_percent']}%, "
            f"Cutoff: {int(pna.get('threshold', 0.51)*100)}%, Band: {pna.get('confidence_band', 'MODERATE')})."
        )
    elif pna:
        lung_obs.append(
            f"No overt consolidation or dense infiltrates above decision threshold "
            f"(Pneumonia calibrated probability: {pna['probability_percent']}%, Cutoff: {int(pna.get('threshold', 0.51)*100)}%)."
        )
    else:
        lung_obs.append("Lungs appear expanded without gross focal consolidation or pneumothorax on available projection.")

    if ate and ate.get("positive", False):
        lung_obs.append(
            f"Subsegmental linear plate-like opacification suggestive of Atelectasis "
            f"(Probability: {ate['probability_percent']}%)."
        )

    findings_paragraphs.append("LUNGS & AIRSPACE: " + " ".join(lung_obs))

    # Pleura & Effusion
    eff = next((p for p in predictions if p["label"] == "Pleural Effusion"), None)
    if eff and eff.get("positive", False):
        findings_paragraphs.append(
            f"PLEURAL SPACES: Blunting of costophrenic angle suggestive of Pleural Effusion "
            f"(Probability: {eff['probability_percent']}%, {eff.get('confidence_band', '')})."
        )
    else:
        findings_paragraphs.append(
            "PLEURAL SPACES: Costophrenic and cardiophrenic angles appear preserved without definitive pleural fluid level."
        )

    # Mediastinum & Cardiac Silhouette
    cardio = next((p for p in predictions if p["label"] == "Cardiomegaly"), None)
    if cardio and cardio.get("positive", False):
        findings_paragraphs.append(
            f"CARDIAC SILHOUETTE: Transverse cardiothoracic ratio enlarged, pattern suggestive of Cardiomegaly "
            f"(Probability: {cardio['probability_percent']}%)."
        )
    else:
        findings_paragraphs.append(
            "CARDIAC SILHOUETTE: Cardiac contour and mediastinal width are within normal limits for projection."
        )

    # 3. AI Assessment Section
    if positives:
        suggested_list = [f"{p['label']} (Calibrated prob: {p['probability_percent']}%)" for p in positives]
        ai_assessment_text = (
            f"AI Assessment: Screening patterns suggestive of {', '.join(suggested_list)}. "
            "Probabilistic pattern matching only; not a confirmed clinical diagnosis."
        )
    else:
        ai_assessment_text = (
            "AI Assessment: No acute radiographic findings suggested above calibrated screening thresholds. "
            "Does not rule out early-stage or non-radiopaque pathology."
        )

    # 4. Calibrated Confidence Summary
    conf_lines = []
    for p in predictions:
        status_flag = "SUSPICIOUS / POSITIVE" if p.get("positive") and p["label"] != "No Finding" else ("NORMAL PATTERN" if p["label"] == "No Finding" and p.get("positive") else "BELOW CUTOFF")
        conf_lines.append(
            f"{p['label']}: {p['probability_percent']}% (Cutoff: {int(p.get('threshold', 0.5)*100)}%, "
            f"Confidence: {p.get('confidence_band', '').replace('_', ' ')}, Status: {status_flag})"
        )
    confidence_summary_text = "\n".join(conf_lines)

    # 5. Recommendation Section
    if positives:
        recommendation_text = (
            "RECOMMENDATION: Formal clinical and radiologist review recommended for diagnostic verification, "
            "correlation with physical examination, patient symptoms, and determination of therapeutic intervention."
        )
    else:
        recommendation_text = (
            "RECOMMENDATION: Clinical review recommended. Correlate with clinical presentation. "
            "Re-evaluate or consider targeted diagnostic workup if respiratory symptoms persist."
        )

    # 6. Provider Impression Section
    impression_lines = [
        f"1. {ai_assessment_text}",
        f"2. {recommendation_text}",
        "3. Explainability: Grad-CAM++ neural activation map generated for anatomical localization verification."
    ]

    return {
        "report_id": f"RPT-{case_id}",
        "case_id": case_id,
        "study_datetime": timestamp_str,
        "model_version": model_ver,
        "technique": technique_text,
        "quality_assessment": quality,
        "findings": "\n\n".join(findings_paragraphs),
        "technical_findings": "\n\n".join(findings_paragraphs),
        "ai_assessment": ai_assessment_text,
        "confidence_summary": confidence_summary_text,
        "recommendation": recommendation_text,
        "impression": "\n".join(impression_lines),
        "primary_finding": primary,
        "positive_findings": [p["label"] for p in positives],
        "patient_friendly_summary": patient_summary,
        "clinician_notes": clinician_notes or "None provided at ingestion time.",
        "disclaimer": STANDARD_DISCLAIMER
    }
