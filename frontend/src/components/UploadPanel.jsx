import React, { useRef } from 'react';
import {
  UploadCloud, FileText, User, Calendar, Activity,
  CheckCircle2, AlertCircle, FileCode, Search
} from 'lucide-react';

export default function UploadPanel({
  samples = [],
  selectedSample,
  onSelectSample,
  onUploadFile,
  isAnalyzing,
  dicomMetadata,
  qualityMetrics
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="pacs-sidebar-left">
      {/* Patient Worklist Section */}
      <div className="panel-section">
        <div className="panel-header-title">
          <span>Clinical Case Worklist</span>
          <span style={{ fontSize: '0.68rem', color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)' }}>
            {samples.length} Benchmark Cases
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {samples.map((s) => {
            const isSelected = selectedSample === s.id;
            const isNormal = s.ground_truth === 'No Finding';

            return (
              <div
                key={s.id}
                className={`worklist-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectSample(s.id)}
              >
                <div className="worklist-item-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={13} color="var(--cyan-primary)" />
                    <span className="patient-name-tag">{s.patient_name}</span>
                  </div>
                  <span className={`ground-truth-badge ${isNormal ? 'normal' : 'abnormal'}`}>
                    {s.ground_truth}
                  </span>
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

      {/* Upload Custom DICOM / X-Ray */}
      <div className="panel-section">
        <div className="panel-header-title">
          <span>Custom Radiograph Ingestion</span>
        </div>

        <div
          className="mini-dropzone"
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
          <UploadCloud size={20} color="var(--cyan-primary)" />
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Upload Local DICOM / CXR
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            DICOM (.dcm), PNG, JPEG
          </div>
        </div>
      </div>

      {/* Quality & DICOM Metadata Tags */}
      {qualityMetrics && (
        <div className="panel-section">
          <div className="panel-header-title">
            <span>QA Telemetry & DICOM Header</span>
            <span style={{
              fontSize: '0.65rem',
              color: qualityMetrics.is_acceptable ? 'var(--emerald-success)' : 'var(--crimson-alert)',
              fontFamily: 'var(--font-mono)'
            }}>
              {qualityMetrics.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            <div>Resolution: {qualityMetrics.resolution}</div>
            <div>Entropy: {qualityMetrics.entropy}</div>
            <div>Sharpness: {qualityMetrics.sharpness_index}</div>
            <div>View: {dicomMetadata?.view_position || 'PA'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
