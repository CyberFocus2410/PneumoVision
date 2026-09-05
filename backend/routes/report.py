"""
Structured Radiology Report & PDF Export Route
"""

from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
from pathlib import Path
from pydantic import BaseModel

from src.reporting.generator import generate_structured_report
from src.reporting.pdf_builder import build_pdf_report
from src.config import REPORTS_DIR

router = APIRouter(prefix="/v1", tags=["Reports"])

class ReportRequest(BaseModel):
    analysis_result: Dict[str, Any]
    clinician_notes: Optional[str] = ""

@router.post("/report")
async def create_report(payload: ReportRequest):
    """
    Generates structured radiology text and builds downloadable PDF.
    """
    try:
        structured = generate_structured_report(
            payload.analysis_result,
            clinician_notes=payload.clinician_notes
        )
        pdf_path = build_pdf_report(payload.analysis_result, structured)

        return {
            "report_id": structured["report_id"],
            "structured_report": structured,
            "pdf_download_url": f"/static/reports/{pdf_path.name}"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Report generation error: {str(e)}")


@router.get("/report/download/{case_id}")
async def download_pdf(case_id: str):
    pdf_path = REPORTS_DIR / f"PneumoVision_Report_{case_id}.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Requested report PDF not found.")
    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        filename=f"PneumoVision_Report_{case_id}.pdf"
    )
