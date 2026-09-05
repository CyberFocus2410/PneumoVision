import React, { useState, useEffect } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldAlert, Loader2, HeartPulse, Stethoscope } from 'lucide-react';
import { generateReport } from '../api';

export default function ReportModal({ analysisResult, onClose }) {
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchReport = async () => {
    if (!analysisResult) return;
    setIsGenerating(true);
    try {
      const data = await generateReport(analysisResult, clinicianNotes);
      setReportData(data);
    } catch (e) {
      console.error(e);
      alert('Failed to generate report: ' + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [analysisResult]);

  if (!analysisResult) return null;

  const ps = reportData?.structured_report?.patient_friendly_summary;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--cyan-primary)" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Dual-Mode Radiology Summary Report (Patient & Provider)
            </span>
          </div>
          <button className="pacs-tool-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isGenerating ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loader2 size={32} className="status-dot" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Compiling dual-mode patient & clinical summary and rendering ReportLab PDF...
              </p>
            </div>
          ) : reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Disclaimer */}
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: 'var(--radius-xs)', padding: '8px 12px', color: '#991b1b', fontSize: '0.72rem', fontWeight: 600 }}>
                {reportData.structured_report.disclaimer}
              </div>

              {/* SECTION 1: Plain English Patient Summary */}
              {ps && (
                <div style={{ background: 'rgba(6, 182, 212, 0.05)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--cyan-primary)', fontWeight: 800, fontSize: '0.84rem', marginBottom: '6px' }}>
                    <HeartPulse size={16} />
                    <span>1. Plain-Language Summary for Patients & Families</span>
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {ps.headline}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.45', marginBottom: '8px' }}>
                    {ps.explanation}
                  </p>

                  <div style={{ fontSize: '0.75rem', marginTop: '6px' }}>
                    <b>What to do next:</b>
                    <ul style={{ paddingLeft: '16px', marginTop: '2px', color: 'var(--text-secondary)' }}>
                      {ps.what_to_do_next?.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* SECTION 2: Technical Radiology Assessment */}
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)', fontWeight: 800, fontSize: '0.84rem', marginBottom: '8px' }}>
                  <Stethoscope size={16} color="var(--blue-info)" />
                  <span>2. Detailed Radiologic Assessment (Healthcare Providers)</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Technique: {reportData.structured_report.technique}
                </div>
                <div style={{ fontSize: '0.78rem', whiteSpace: 'pre-line', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                  <b>Findings:</b><br />
                  {reportData.structured_report.technical_findings}
                </div>
                <div style={{ fontSize: '0.78rem', whiteSpace: 'pre-line', lineHeight: '1.5', color: 'var(--text-primary)', marginTop: '8px', fontWeight: 600 }}>
                  <b>Impression:</b><br />
                  {reportData.structured_report.impression}
                </div>
              </div>

              {/* Clinician Addendum Notes */}
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Reviewing Clinician Addendum Notes (Included in Signed PDF):
                </label>
                <textarea
                  rows={2}
                  value={clinicianNotes}
                  onChange={(e) => setClinicianNotes(e.target.value)}
                  placeholder="Enter optional clinical notes or radiologist signature to include in PDF..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-xs)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontFamily: 'inherit',
                    fontSize: '0.78rem'
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button className="pacs-btn-secondary" onClick={fetchReport} disabled={isGenerating}>
            Update Notes
          </button>
          {reportData?.pdf_download_url && (
            <a
              href={reportData.pdf_download_url}
              download
              target="_blank"
              rel="noreferrer"
              className="pacs-btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <Download size={15} /> Download Signed PDF Report
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
