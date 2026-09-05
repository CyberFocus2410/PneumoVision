import React, { useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';

const PRESET_SAMPLES = [
  { id: 'sample_normal', name: 'Normal Study', tag: 'No Finding', color: 'var(--emerald-success)' },
  { id: 'sample_pneumonia', name: 'RLL Infiltrate', tag: 'Pneumonia', color: 'var(--crimson-alert)' },
  { id: 'sample_cardiomegaly', name: 'Enlarged Silhouette', tag: 'Cardiomegaly', color: 'var(--crimson-alert)' },
  { id: 'sample_effusion', name: 'Costophrenic Blunting', tag: 'Pleural Effusion', color: 'var(--crimson-alert)' },
  { id: 'sample_atelectasis', name: 'Basilar Volume Loss', tag: 'Atelectasis', color: 'var(--crimson-alert)' }
];

export default function UploadPanel({
  onSelectSample,
  onUploadFile,
  selectedSample,
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
    <div className="clinical-card">
      <div className="card-title-row">
        <span className="card-title">
          <UploadCloud size={16} /> Radiograph Ingestion
        </span>
      </div>

      {/* Upload Dropzone */}
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".dcm,.png,.jpg,.jpeg"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onUploadFile(e.target.files[0]);
            }
          }}
        />
        <div className="dropzone-icon">
          <UploadCloud size={24} />
        </div>
        <div>
          <p className="dropzone-text">Click or Drag & Drop Chest X-Ray</p>
          <p className="dropzone-subtext">Supports DICOM (.dcm), PNG, JPEG (Max 25MB)</p>
        </div>
      </div>

      {/* Curated Demonstration Cases */}
      <div>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
          Or Select Curated Benchmark Case
        </p>
        <div className="sample-picker-list">
          {PRESET_SAMPLES.map((s) => (
            <button
              key={s.id}
              className={`sample-item-btn ${selectedSample === s.id ? 'selected' : ''}`}
              onClick={() => onSelectSample(s.id)}
              disabled={isAnalyzing}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={14} color="var(--cyan-primary)" />
                <span>{s.name}</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: s.color, fontWeight: 700 }}>
                {s.tag}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quality Assessment & Metadata Card */}
      {qualityMetrics && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACQUISITION QUALITY</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: '4px',
              background: qualityMetrics.is_acceptable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: qualityMetrics.is_acceptable ? 'var(--emerald-success)' : 'var(--crimson-alert)'
            }}>
              {qualityMetrics.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div>Res: {qualityMetrics.resolution}</div>
            <div>Entropy: {qualityMetrics.entropy}</div>
            <div>Sharpness: {qualityMetrics.sharpness_index}</div>
            <div>Contrast: {qualityMetrics.std_contrast}</div>
          </div>
        </div>
      )}

      {/* DICOM Header Inspection (PHI Stripped) */}
      {dicomMetadata && (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
            DICOM METADATA (DE-IDENTIFIED)
          </span>
          <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            <div>Modality: {dicomMetadata.modality}</div>
            <div>View Position: {dicomMetadata.view_position}</div>
            <div>Photometric: {dicomMetadata.photometric_interpretation}</div>
            <div style={{ color: 'var(--emerald-success)' }}>✓ PHI Scrubbed for HIPAA Compliance</div>
          </div>
        </div>
      )}
    </div>
  );
}
