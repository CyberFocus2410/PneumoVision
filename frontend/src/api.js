/**
 * PneumoVision API Client
 */

const API_BASE = '/v1';

export async function fetchSystemHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchSamples() {
  const res = await fetch(`${API_BASE}/samples`);
  if (!res.ok) throw new Error('Failed to fetch test sample cases');
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

export async function grantConsent({ patientId, providerAddress, callerAddress = null }) {
  const res = await fetch(`${API_BASE}/consent/grant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: patientId,
      provider_address: providerAddress,
      caller_address: callerAddress
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to grant consent' }));
    throw new Error(err.detail || 'Failed to grant consent');
  }
  return res.json();
}

export async function revokeConsent({ patientId, providerAddress, callerAddress = null }) {
  const res = await fetch(`${API_BASE}/consent/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: patientId,
      provider_address: providerAddress,
      caller_address: callerAddress
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to revoke consent' }));
    throw new Error(err.detail || 'Failed to revoke consent');
  }
  return res.json();
}

export async function fetchPatientRecords(patientId, callerAddress = null) {
  let url = `${API_BASE}/records/${encodeURIComponent(patientId)}`;
  if (callerAddress) {
    url += `?caller_address=${encodeURIComponent(callerAddress)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to retrieve records' }));
    throw new Error(err.detail || 'Failed to retrieve records');
  }
  return res.json();
}

export async function addTreatmentRecord(patientId, payload) {
  const res = await fetch(`${API_BASE}/records/${encodeURIComponent(patientId)}/treatment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add treatment record' }));
    throw new Error(err.detail || 'Failed to add treatment record');
  }
  return res.json();
}

export async function addMedicationRecord(patientId, payload) {
  const res = await fetch(`${API_BASE}/records/${encodeURIComponent(patientId)}/medication`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add medication record' }));
    throw new Error(err.detail || 'Failed to add medication record');
  }
  return res.json();
}

export async function addOutcomeRecord(patientId, payload) {
  const res = await fetch(`${API_BASE}/records/${encodeURIComponent(patientId)}/outcome`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to add outcome record' }));
    throw new Error(err.detail || 'Failed to add outcome record');
  }
  return res.json();
}

