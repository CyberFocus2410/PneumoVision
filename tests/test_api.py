"""
Integration tests for PneumoVision FastAPI Endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "target_classes" in data
    assert len(data["target_classes"]) == 5

def test_analyze_sample():
    response = client.post("/v1/analyze", data={"sample_id": "sample_normal"})
    assert response.status_code == 200
    data = response.json()
    assert "case_id" in data
    assert "predictions" in data
    assert "primary_finding" in data
    assert len(data["predictions"]) == 5

def test_compare_samples():
    response = client.post(
        "/v1/compare",
        data={"prior_sample_id": "sample_pneumonia", "current_sample_id": "sample_normal"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "findings_comparison" in data
    assert len(data["findings_comparison"]) == 5

def test_feedback_logging():
    payload = {
        "case_id": "TEST_CASE_01",
        "finding": "Pneumonia",
        "clinician_agreement": True,
        "clinician_notes": "Concur with focal consolidation"
    }
    response = client.post("/v1/feedback", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
