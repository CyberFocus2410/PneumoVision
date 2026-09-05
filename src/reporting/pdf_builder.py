"""
Hospital-Grade PDF Radiology Report Generator using ReportLab.
Renders Dual-Mode reports: Plain-Language Patient Summary + Formal Radiological Impression.
"""

from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from src.config import REPORTS_DIR

def build_pdf_report(
    analysis_result: Dict[str, Any],
    structured_report: Dict[str, Any],
    output_pdf_path: Optional[Path] = None
) -> Path:
    """
    Generates a structured medical PDF summary report with both Patient Summary and Clinician Findings.
    """
    case_id = analysis_result.get("case_id", "UNKNOWN")
    if output_pdf_path is None:
        output_pdf_path = REPORTS_DIR / f"PneumoVision_Report_{case_id}.pdf"

    doc = SimpleDocTemplate(
        str(output_pdf_path),
        pagesize=letter,
        leftMargin=32,
        rightMargin=32,
        topMargin=30,
        bottomMargin=30
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#0f2b48")
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#556980")
    )
    patient_heading = ParagraphStyle(
        "PatientHdr",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#0369a1"),
        spaceBefore=6,
        spaceAfter=3
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=13,
        textColor=colors.HexColor("#0f2b48"),
        spaceBefore=6,
        spaceAfter=3
    )
    body_style = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b")
    )
    disclaimer_style = ParagraphStyle(
        "DisclaimerStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#991b1b")
    )

    story = []

    # 1. Header Banner
    header_table_data = [
        [
            Paragraph("<b>PNEUMOVISION</b> &mdash; AI Radiograph Screening", title_style),
            Paragraph(f"<b>CASE ID:</b> {case_id}<br/><b>STUDY DATE:</b> {structured_report.get('study_datetime', '')}<br/><b>MODEL:</b> {analysis_result.get('model_version', '')}", subtitle_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[310, 238])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4)
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f2b48"), spaceBefore=2, spaceAfter=6))

    # 2. Disclaimer Alert Box
    disclaimer_box_data = [[
        Paragraph(f"<b>NON-DIAGNOSTIC NOTICE:</b> {structured_report.get('disclaimer')}", disclaimer_style)
    ]]
    disclaimer_box = Table(disclaimer_box_data, colWidths=[548])
    disclaimer_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fef2f2")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#f87171")),
        ('PADDING', (0, 0), (-1, -1), 5)
    ]))
    story.append(disclaimer_box)
    story.append(Spacer(1, 6))

    # 3. Patient-Friendly Summary (Plain English)
    ps = structured_report.get("patient_friendly_summary") or {}
    if ps:
        story.append(Paragraph("1. PLAIN-LANGUAGE PATIENT SUMMARY (FOR PATIENT & FAMILY)", patient_heading))
        
        headline = ps.get("headline", "Summary")
        explanation = ps.get("explanation", "")
        what_to_do = "<br/>&bull; ".join(ps.get("what_to_do_next", []))
        questions = "<br/>&bull; ".join(ps.get("questions_for_doctor", []))

        patient_text = f"<b>Overview:</b> {headline}<br/>" \
                       f"<b>What this means:</b> {explanation}<br/><br/>" \
                       f"<b>Recommended Next Steps:</b><br/>&bull; {what_to_do}<br/><br/>" \
                       f"<b>Questions to Ask Your Doctor:</b><br/>&bull; {questions}"

        patient_table = Table([[Paragraph(patient_text, body_style)]], colWidths=[548])
        patient_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0f9ff")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#7dd3fc")),
            ('PADDING', (0, 0), (-1, -1), 6)
        ]))
        story.append(patient_table)
        story.append(Spacer(1, 6))

    # 4. Quantitative Findings Table
    story.append(Paragraph("2. QUANTITATIVE PATHOLOGY SCREENING RESULTS", section_heading))
    
    table_rows = [
        ["Finding Class", "Calibrated Probability", "Operating Cutoff", "Screening Flag", "Confidence Band"]
    ]

    for p in analysis_result.get("predictions", []):
        is_pos = p.get("positive", False)
        status_text = "POSITIVE" if is_pos and p["label"] != "No Finding" else ("NORMAL" if p["label"] == "No Finding" and is_pos else "NEGATIVE")
        status_color = "#dc2626" if status_text == "POSITIVE" else ("#16a34a" if status_text == "NORMAL" else "#4b5563")
        
        prob_pct = f"{p.get('probability_percent', 0.0)}%"
        th_pct = f"{int(p.get('threshold', 0.5) * 100)}%"

        table_rows.append([
            p.get("label"),
            prob_pct,
            th_pct,
            f"<font color='{status_color}'><b>{status_text}</b></font>",
            p.get("confidence_band", "").replace("_", " ").title()
        ])

    styled_table_rows = []
    for row_idx, row in enumerate(table_rows):
        styled_row = []
        for col in row:
            if row_idx == 0:
                styled_row.append(Paragraph(f"<b>{col}</b>", ParagraphStyle('Hdr', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f2b48'))))
            else:
                styled_row.append(Paragraph(str(col), body_style))
        styled_table_rows.append(styled_row)

    findings_table = Table(styled_table_rows, colWidths=[124, 106, 106, 96, 116])
    findings_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 3.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
    ]))
    story.append(findings_table)
    story.append(Spacer(1, 6))

    # 5. Formal Technical Assessment
    story.append(Paragraph("3. DETAILED RADIOLOGICAL ASSESSMENT (FOR HEALTHCARE PROVIDERS)", section_heading))
    
    findings_text = structured_report.get("technical_findings", "").replace("\n\n", "<br/><br/>")
    impression_text = structured_report.get("impression", "").replace("\n", "<br/>")

    text_content = f"<b>TECHNIQUE & QUALITY:</b> {structured_report.get('technique', '')}<br/><br/>" \
                   f"<b>ANATOMICAL FINDINGS:</b><br/>{findings_text}<br/><br/>" \
                   f"<b>IMPRESSION:</b><br/>{impression_text}"

    text_table = Table([[Paragraph(text_content, body_style)]], colWidths=[548])
    text_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 6)
    ]))
    story.append(text_table)
    story.append(Spacer(1, 6))

    # 6. Visual Explainability (Grad-CAM Thumbnails)
    heatmaps = analysis_result.get("heatmaps", {})
    if heatmaps:
        story.append(Paragraph("4. VISUAL EXPLAINABILITY (GRAD-CAM++ HEATMAPS)", section_heading))
        img_cells = []
        
        for cls_name, paths in list(heatmaps.items())[:2]:
            side_path = paths.get("side_path")
            overlay_path = paths.get("overlay_path")
            target_img_path = side_path if side_path and Path(side_path).exists() else overlay_path
            loc_site = paths.get("localization", {}).get("anatomical_site", "Thoracic Field")

            if target_img_path and Path(target_img_path).exists():
                try:
                    img_elem = RLImage(str(target_img_path), width=264, height=128)
                    caption = Paragraph(f"<b>{cls_name} &bull; Attention Focus: {loc_site}</b>", ParagraphStyle('Cap', parent=body_style, fontSize=7.5, alignment=1))
                    img_cells.append([img_elem, caption])
                except Exception:
                    pass

        if img_cells:
            cam_table_data = [[c[0] for c in img_cells], [c[1] for c in img_cells]]
            cam_table = Table(cam_table_data, colWidths=[274] * len(img_cells))
            cam_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 2)
            ]))
            story.append(cam_table)

    # Build PDF document
    doc.build(story)
    return output_pdf_path
