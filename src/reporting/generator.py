"""
Dual-Mode Clinical & Patient-Friendly Radiology Report Generator for PneumoVision.
Generates both plain-language patient summaries (accessible to the general public)
and formal structured radiological impressions for physicians.
"""

from typing import Dict, Any, List
from datetime import datetime

STANDARD_DISCLAIMER = (
    "NOTICE: This is an AI-assisted research and decision-support tool. It does not constitute a "
    "medical diagnosis or formal clinical interpretation. All findings, probabilities, and heatmaps "
    "must be reviewed and confirmed by a qualified radiologist or physician before clinical action."
)

PLAIN_GLOSSARY = {
    "Pneumonia": "An infection that causes the air sacs in one or both lungs to fill with fluid or pus, often causing cough, fever, and breathing difficulty.",
    "Cardiomegaly": "The silhouette of the heart appears enlarged on the X-ray image, which can occur with high blood pressure, valve issues, or heart strain.",
    "Pleural Effusion": "An abnormal buildup of fluid in the space between the outer lung surface and the chest wall.",
    "Atelectasis": "A temporary collapse or partial deflation of a small area of lung tissue, very common after anesthesia, bed rest, or shallow breathing.",
    "Consolidation": "A region of lung tissue that has become firm and dense because air has been replaced by fluid or inflammatory cells.",
    "Grad-CAM": "A visual explanation tool that highlights the specific areas of the X-ray the AI examined to reach its conclusion."
}

def generate_plain_patient_summary(primary_finding: str, predictions: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Translates complex radiological findings into compassionate, crystal-clear plain English.
    """
    positives = [p for p in predictions if p["positive"] and p["label"] != "No Finding"]

    if not positives or primary_finding == "No Finding":
        headline = "Your Chest X-Ray Looks Clear and Normal"
        explanation = (
            "The AI screening system did not detect any significant signs of pneumonia, fluid buildup, "
            "or heart enlargement. Your lungs appear clear and well-expanded."
        )
        what_to_do = [
            "Discuss these reassuring results with your doctor alongside how you are currently feeling.",
            "If you still have cough, shortness of breath, or fever, follow your doctor's guidance for further evaluation."
        ]
        questions_for_doctor = [
            "Does this normal X-ray match my clinical symptoms?",
            "Are there any other tests needed if my symptoms persist?"
        ]
    elif primary_finding == "Pneumonia":
        headline = "Possible Signs of a Lung Infection (Pneumonia)"
        explanation = (
            "The AI model identified an area of increased density (often called 'consolidation') in the lung field. "
            "In plain words, a section of the lung appears to have fluid or inflammation, which is common in bacterial or viral pneumonia."
        )
        what_to_do = [
            "Contact your healthcare provider promptly to confirm if antibiotic or antiviral treatment is needed.",
            "Rest, stay well hydrated, and monitor your temperature and breathing.",
            "Seek immediate medical attention if you experience severe shortness of breath, blue lips, or confusion."
        ]
        questions_for_doctor = [
            "Is antibiotic medication appropriate for this infection?",
            "Should I schedule a follow-up chest X-ray in a few weeks to ensure the lung has fully cleared?"
        ]
    elif primary_finding == "Cardiomegaly":
        headline = "Enlarged Heart Silhouette (Cardiomegaly)"
        explanation = (
            "The shadow of your heart on this X-ray appears broader than normal. This is not a diagnosis of heart failure on its own, "
            "but it suggests your heart may be working harder or carrying extra fluid."
        )
        what_to_do = [
            "Schedule a follow-up visit with your physician or cardiologist.",
            "Monitor your blood pressure and watch for symptoms like swelling in the ankles or shortness of breath when lying flat."
        ]
        questions_for_doctor = [
            "Would an echocardiogram (ultrasound of the heart) be helpful to check my heart muscle function?",
            "Do I need any adjustments to my blood pressure or fluid medications?"
        ]
    elif primary_finding == "Pleural Effusion":
        headline = "Fluid Layer Around the Lung (Pleural Effusion)"
        explanation = (
            "The AI noticed a blunting or smoothing at the base of the lung, indicating a small layer of fluid has gathered around the lung. "
            "This can cause a sharp sensation when taking a deep breath."
        )
        what_to_do = [
            "Share these findings with your doctor to determine what is causing the fluid accumulation.",
            "Avoid intense physical exertion until your physician evaluates the extent of fluid."
        ]
        questions_for_doctor = [
            "What underlying condition is causing the fluid to build up?",
            "Is any treatment or drainage needed, or will medication resolve it?"
        ]
    elif primary_finding == "Atelectasis":
        headline = "Small Deflated Lung Section (Atelectasis)"
        explanation = (
            "The scan shows a small band at the bottom of the lung that is temporarily not fully expanded. "
            "This is very common after surgery, pain, or shallow breathing, and is usually reversible."
        )
        what_to_do = [
            "Practice regular deep breathing exercises (or use an incentive spirometer if provided after surgery).",
            "Stay mobile and take gentle walks as advised by your healthcare team."
        ]
        questions_for_doctor = [
            "Are breathing exercises sufficient to re-expand this area?",
            "When should I expect this to resolve?"
        ]
    else:
        headline = f"Potential Finding Identified: {primary_finding}"
        explanation = f"The AI analysis flagged findings related to {primary_finding} for professional review."
        what_to_do = ["Consult your treating physician for formal correlation."]
        questions_for_doctor = ["How does this finding relate to my symptoms?"]

    # Select relevant glossary terms
    relevant_terms = {}
    for term in [primary_finding, "Grad-CAM", "Consolidation"]:
        if term in PLAIN_GLOSSARY:
            relevant_terms[term] = PLAIN_GLOSSARY[term]

    return {
        "headline": headline,
        "explanation": explanation,
        "what_to_do_next": what_to_do,
        "questions_for_doctor": questions_for_doctor,
        "glossary": relevant_terms
    }


def generate_structured_report(analysis_result: Dict[str, Any], clinician_notes: str = "") -> Dict[str, Any]:
    """
    Constructs a dual-mode report containing both a Patient-Friendly Plain Language Summary
    and a Technical Clinical Radiology Impression.
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

    # 1. Plain English Patient Summary
    patient_summary = generate_plain_patient_summary(primary, predictions)

    # 2. Formal Technical Clinical Findings Section
    view_pos = dicom.get("view_position", "Frontal (PA/AP)")
    technique_text = f"Single frontal chest radiograph ({view_pos}). Exposure/Quality index: {quality}."

    findings_paragraphs = []
    
    # Lungs & Airspace
    pna = next((p for p in predictions if p["label"] == "Pneumonia"), None)
    ate = next((p for p in predictions if p["label"] == "Atelectasis"), None)
    
    lung_obs = []
    if pna and pna["positive"]:
        lung_obs.append(f"Focal airspace consolidation / alveolar opacity compatible with Pneumonia (Model confidence: {pna['probability_percent']}%, {pna['confidence_band']}).")
    if ate and ate["positive"]:
        lung_obs.append(f"Linear plate-like subsegmental opacification in the lung base indicative of Atelectasis (Model confidence: {ate['probability_percent']}%).")
    if not lung_obs:
        lung_obs.append("Lungs appear clear without overt focal consolidation, pneumothorax, or infiltrates.")
    findings_paragraphs.append("LUNGS & AIRSPACE: " + " ".join(lung_obs))

    # Pleura
    eff = next((p for p in predictions if p["label"] == "Pleural Effusion"), None)
    if eff and eff["positive"]:
        findings_paragraphs.append(f"PLEURAL SPACES: Blunting of lateral costophrenic angle with fluid meniscus compatible with Pleural Effusion (Model probability: {eff['probability_percent']}%, {eff['confidence_band']}).")
    else:
        findings_paragraphs.append("PLEURAL SPACES: Costophrenic sulci and cardiophrenic angles are sharp and free of fluid.")

    # Cardiac Silhouette
    cardio = next((p for p in predictions if p["label"] == "Cardiomegaly"), None)
    if cardio and cardio["positive"]:
        findings_paragraphs.append(f"CARDIAC SILHOUETTE: Transverse cardiothoracic ratio enlarged compatible with Cardiomegaly (Model probability: {cardio['probability_percent']}%).")
    else:
        findings_paragraphs.append("CARDIAC SILHOUETTE: Cardiac size and mediastinal contours are within normal physiological limits.")

    # 3. Impression Section
    impression_lines = []
    if positives:
        pos_names = [f"{p['label']} ({p['probability_percent']}%)" for p in positives]
        impression_lines.append(f"1. AI-assisted screening identified positive finding(s): {', '.join(pos_names)}.")
        impression_lines.append(f"2. Primary radiological finding: {primary}.")
    else:
        impression_lines.append("1. No acute cardiopulmonary abnormality detected above tuned decision thresholds.")

    impression_lines.append("3. Grad-CAM++ activation maps generated to confirm spatial focus of deep learning network.")

    return {
        "report_id": f"RPT-{case_id}",
        "case_id": case_id,
        "study_datetime": timestamp_str,
        "model_version": model_ver,
        "technique": technique_text,
        "quality_assessment": quality,
        "patient_friendly_summary": patient_summary,
        "technical_findings": "\n\n".join(findings_paragraphs),
        "findings": "\n\n".join(findings_paragraphs),
        "impression": "\n".join(impression_lines),
        "primary_finding": primary,
        "positive_findings": [p["label"] for p in positives],
        "clinician_notes": clinician_notes or "None provided at ingestion time.",
        "disclaimer": STANDARD_DISCLAIMER
    }
