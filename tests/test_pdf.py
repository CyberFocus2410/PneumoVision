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
                "threshold": 0.38,
                "positive": True,
                "confidence_band": "HIGH_CONFIDENCE",
                "uncertainty_std": 0.04
            },
            {
                "label": "Cardiomegaly",
                "probability": 0.12,
                "probability_percent": 12.0,
                "threshold": 0.42,
                "positive": False,
                "confidence_band": "HIGH_CONFIDENCE_NEGATIVE",
                "uncertainty_std": 0.02
            }
        ],
        "heatmaps": {}
    }
    
    structured = generate_structured_report(mock_analysis, clinician_notes="Test verified by Dr. Smith.")
    assert "patient_friendly_summary" in structured
    assert "technical_findings" in structured
    assert "impression" in structured
    
    out_pdf = tmp_path / "test_report.pdf"
    res_path = build_pdf_report(mock_analysis, structured, output_pdf_path=out_pdf)
    
    assert res_path.exists()
    assert res_path.stat().st_size > 1000 # Valid PDF with content
