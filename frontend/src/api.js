/**
 * PneumoVision API Client
 */

const API_BASE = '/v1';

export async function fetchSystemHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function analyzeImage(fileOrSampleId, { useTta = true, useMcDropout = true } = {}) {
  const formData = new FormData();
  if (typeof fileOrSampleId === 'string') {
    formData.append('sample_id', fileOrSampleId);
  } else if (fileOrSampleId instanceof File || fileOrSampleId instanceof Blob) {
    formData.append('file', fileOrSampleId);
  }
  formData.append('use_tta', useTta);
  formData.append('use_mc_dropout', useMcDropout);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(errData.detail || 'Analysis failed');
  }
  return res.json();
}

export async function generateReport(analysisResult, clinicianNotes = '') {
  const res = await fetch(`${API_BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysis_result: analysisResult,
      clinician_notes: clinicianNotes
    })
  });

  if (!res.ok) throw new Error('Report generation failed');
  return res.json();
}

export async function compareLongitudinal(prior, current) {
  const formData = new FormData();
  if (typeof prior === 'string') formData.append('prior_sample_id', prior);
  else formData.append('prior_file', prior);

  if (typeof current === 'string') formData.append('current_sample_id', current);
  else formData.append('current_file', current);

  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) throw new Error('Longitudinal comparison failed');
  return res.json();
}

export async function submitClinicianFeedback({ caseId, finding, agreement, notes = '', suggestedCorrection = null }) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      case_id: caseId,
      finding,
      clinician_agreement: agreement,
      clinician_notes: notes,
      suggested_correction: suggestedCorrection
    })
  });
  return res.json();
}
