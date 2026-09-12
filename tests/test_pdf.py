"""
Unit test for PDF Radiology Summary Report Generation.
"""

from pathlib import Path
from src.reporting.generator import generate_structured_report
from src.reporting.pdf_builder import build_pdf_report
from src.config import REPORTS_DIR

def test_pdf_report_generation(tmp_path):
    mock_analysis = {
        "case_id": "TEST_CASE_99",
        "model_version": "densenet121-cxr-v1.0",
        "quality_status": "OPTIMAL",
        "primary_finding": "Pneumonia",
        "predictions": [
            {
                "label": "Pneumonia",
                "probability": 0.88,
                "probability_percent": 88.0,
                "threshold": 0.51,
                "positive": True,
                "confidence_band": "HIGH_CONFIDENCE",
                "uncertainty_std": 0.04
            },
            {
                "label": "No Finding",
                "probability": 0.12,
                "probability_percent": 12.0,
                "threshold": 0.49,
                "positive": False,
                "confidence_band": "HIGH_CONFIDENCE_NEGATIVE",
                "uncertainty_std": 0.04
            }
        ],
        "heatmaps": {}
    }
    
    structured = generate_structured_report(mock_analysis, clinician_notes="Test verified by Dr. Smith.")
    assert "patient_friendly_summary" in structured
    assert "technical_findings" in structured
    assert "impression" in structured
    assert "ai_assessment" in structured
    assert "recommendation" in structured

    # Verify non-definitive language in positive case
    summary = structured["patient_friendly_summary"]
    assert "You have pneumonia" not in summary["ai_assessment"]
    assert "suggestive" in summary["ai_assessment"].lower()
    assert "review" in summary["clinical_recommendation"].lower()
    
    out_pdf = tmp_path / "test_report.pdf"
    res_path = build_pdf_report(mock_analysis, structured, output_pdf_path=out_pdf)
    
    assert res_path.exists()
    assert res_path.stat().st_size > 1000 # Valid PDF with content


def test_negative_hedged_report_generation():
    mock_negative = {
        "case_id": "TEST_CASE_NORMAL",
        "model_version": "densenet121-cxr-v1.0",
        "quality_status": "OPTIMAL",
        "primary_finding": "No Finding",
        "predictions": [
            {
                "label": "Pneumonia",
                "probability": 0.15,
                "probability_percent": 15.0,
                "threshold": 0.51,
                "positive": False,
                "confidence_band": "HIGH_CONFIDENCE_NEGATIVE",
                "uncertainty_std": 0.02
            },
            {
                "label": "No Finding",
                "probability": 0.85,
                "probability_percent": 85.0,
                "threshold": 0.49,
                "positive": True,
                "confidence_band": "HIGH_CONFIDENCE",
                "uncertainty_std": 0.02
            }
        ],
        "heatmaps": {}
    }

    structured = generate_structured_report(mock_negative)
    summary = structured["patient_friendly_summary"]
    
    # Must never claim "You are healthy" or give false confidence
    assert "You are healthy" not in summary["explanation"]
    assert "no acute" in summary["headline"].lower() or "no acute" in summary["ai_assessment"].lower()
    assert "does not" in summary["ai_assessment"].lower() # Hedging notice

