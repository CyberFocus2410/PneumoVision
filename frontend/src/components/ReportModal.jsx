import React, { useState, useEffect } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--cyan-primary)" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Structured Clinical Radiology Draft Report
            </span>
          </div>
          <button className="tool-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isGenerating ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Loader2 size={32} className="status-dot" style={{ margin: '0 auto 12px' }} />
              <p>Compiling structured radiological impression and formatting ReportLab PDF...</p>
            </div>
          ) : reportData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Disclaimer */}
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', borderRadius: 'var(--radius-sm)', padding: '10px', color: '#991b1b', fontSize: '0.75rem', fontWeight: 600 }}>
                {reportData.structured_report.disclaimer}
              </div>

              {/* Report Header Metadata */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <div><b>REPORT ID:</b> {reportData.structured_report.report_id}</div>
                <div><b>STUDY DATE:</b> {reportData.structured_report.study_datetime}</div>
                <div><b>MODEL:</b> {reportData.structured_report.model_version}</div>
                <div><b>QUALITY:</b> {reportData.structured_report.quality_assessment}</div>
              </div>

              {/* Structured Findings Text */}
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>TECHNIQUE</span>
                  <p style={{ marginTop: '2px' }}>{reportData.structured_report.technique}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>FINDINGS BY COMPARTMENT</span>
                  <p style={{ marginTop: '4px', whiteSpace: 'pre-line' }}>{reportData.structured_report.findings}</p>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cyan-primary)' }}>IMPRESSION</span>
                  <p style={{ marginTop: '4px', whiteSpace: 'pre-line', fontWeight: 600 }}>{reportData.structured_report.impression}</p>
                </div>
              </div>

              {/* Clinician Addendum Notes */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Reviewing Radiologist Addendum Notes:
                </label>
                <textarea
                  rows={3}
                  value={clinicianNotes}
                  onChange={(e) => setClinicianNotes(e.target.value)}
                  placeholder="Enter optional clinical notes or radiologist signature to include in PDF..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    fontFamily: 'inherit',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={fetchReport} disabled={isGenerating}>
            Update Report
          </button>
          {reportData?.pdf_download_url && (
            <a
              href={reportData.pdf_download_url}
              download
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ textDecoration: 'none' }}
            >
              <Download size={16} /> Download Signed PDF
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
