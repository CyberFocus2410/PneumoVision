import React, { useRef } from 'react';
import {
  UploadCloud, FileText, User, Calendar, Activity,
  CheckCircle2, AlertCircle, FileCode, Search, Image as ImageIcon, Loader2
} from 'lucide-react';

export default function UploadPanel({
  samples = [],
  selectedSample,
  uploadedFileName,
  onSelectSample,
  onUploadFile,
  isAnalyzing,
  dicomMetadata,
  qualityMetrics
}) {
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="pacs-sidebar-left">
      {/* 1. Custom File Upload Section */}
      <div className="panel-section">
        <div className="panel-header-title">
          <span>Radiograph Ingestion</span>
          {isAnalyzing && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--cyan-primary)', fontSize: '0.68rem' }}>
              <Loader2 size={12} className="status-dot" /> Processing...
            </span>
          )}
        </div>

        <div
          className="mini-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            borderColor: uploadedFileName ? 'var(--cyan-primary)' : undefined,
            background: uploadedFileName ? 'rgba(6, 182, 212, 0.08)' : undefined
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".dcm,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadFile(e.target.files[0]);
              }
            }}
          />
          <UploadCloud size={24} color="var(--cyan-primary)" />
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Upload Any Chest X-Ray / DICOM'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            Drag & drop or browse (DICOM, PNG, JPEG, WEBP)
          </div>
        </div>
      </div>

      {/* 2. Clinical Benchmark Worklist */}
      <div className="panel-section" style={{ flex: 1 }}>
        <div className="panel-header-title">
          <span>Benchmark Patient Cases</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
            {samples.length} Curated Cases
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {samples.map((s) => {
            const isSelected = selectedSample === s.id && !uploadedFileName;
            const isNormal = s.ground_truth === 'No Finding' || s.ground_truth?.includes('Negative') || s.ground_truth?.includes('Normal');
            const isThisCaseAnalyzing = isSelected && isAnalyzing;

            return (
              <div
                key={s.id}
                className={`worklist-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSample(s.id)}
                style={{
                  cursor: isAnalyzing ? 'wait' : 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div className="worklist-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="var(--cyan-primary)" />
                    <span className="patient-name-tag">{s.patient_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isThisCaseAnalyzing && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--cyan-primary)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
                        <Loader2 size={10} className="status-dot" /> Analyzing
                      </span>
                    )}
                    <span className={`ground-truth-badge ${isNormal ? 'normal' : 'abnormal'}`}>
                      {s.ground_truth}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>{s.case_id} &bull; {s.age}y {s.gender[0]}</span>
                  <span>{s.study_date}</span>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                  {s.indication}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Acquisition Quality Telemetry */}
      {qualityMetrics && (
        <div className="panel-section">
          <div className="panel-header-title">
            <span>Image Quality Status</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '3px',
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--emerald-success)',
              fontFamily: 'var(--font-mono)'
            }}>
              {qualityMetrics.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div>Resolution: {qualityMetrics.resolution}</div>
            <div>Entropy: {qualityMetrics.entropy}</div>
            <div>Sharpness: {qualityMetrics.sharpness_index}</div>
            <div>Contrast: {qualityMetrics.std_contrast}</div>
          </div>
        </div>
      )}
    </div>
  );
}
