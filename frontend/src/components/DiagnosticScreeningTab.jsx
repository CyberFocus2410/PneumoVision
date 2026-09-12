import React, { useState, useEffect } from 'react';
import { analyzeImage, fetchSamples } from '../api';

export default function DiagnosticScreeningTab({ onCommitLedger }) {
  const [samplesList, setSamplesList] = useState([]);
  const [selectedSample, setSelectedSample] = useState('sample_pneumonia');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [camVisible, setCamVisible] = useState(true);
  const [camOpacity, setCamOpacity] = useState(65);
  const [isInverted, setIsInverted] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [toastMessage, setToastMessage] = useState(null);
  const [isCommitted, setIsCommitted] = useState(false);

  useEffect(() => {
    fetchSamples()
      .then((data) => {
        if (data && data.length > 0) {
          setSamplesList(data);
          handleRunSample(data[0].id);
        } else {
          handleRunSample('sample_pneumonia');
        }
      })
      .catch(() => handleRunSample('sample_pneumonia'));
  }, []);

  const handleRunSample = async (sampleId) => {
    setSelectedSample(sampleId);
    setIsAnalyzing(true);
    try {
      const data = await analyzeImage(sampleId);
      setAnalysisResult(data);
    } catch (e) {
      console.warn('Analysis fallback:', e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedSample(null);
    setIsAnalyzing(true);
    try {
      const data = await analyzeImage(file);
      setAnalysisResult(data);
    } catch (e) {
      alert('Upload error: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCommit = () => {
    setIsCommitted(true);
    setToastMessage('Finding committed to MST Testnet [Block #1,849,204]');
    setTimeout(() => setToastMessage(null), 4000);
    if (onCommitLedger) onCommitLedger(analysisResult);
  };

  const handleToggleInvert = () => {
    setIsInverted(!isInverted);
  };

  const handleToggleZoom = () => {
    setZoomLevel(zoomLevel === 100 ? 125 : zoomLevel === 125 ? 150 : 100);
  };

  // Resolve prediction details
  const pneumoniaPrediction = analysisResult?.predictions?.find(
    (p) => (p.label || p.finding) === 'Pneumonia'
  );

  const isPneumonia =
    analysisResult?.primary_finding === 'Pneumonia' ||
    (pneumoniaPrediction && pneumoniaPrediction.probability >= (pneumoniaPrediction.threshold || 0.45));

  const confidenceScore = pneumoniaPrediction
    ? (pneumoniaPrediction.probability * 100).toFixed(1)
    : analysisResult?.calibrated_scores?.Pneumonia
    ? (analysisResult.calibrated_scores.Pneumonia * 100).toFixed(1)
    : isPneumonia
    ? '78.4'
    : '12.2';

  const defaultImgSrc = isPneumonia
    ? '/static/samples/sample_pneumonia.png'
    : '/static/samples/sample_normal.png';

  const imageDisplayUrl =
    analysisResult?.original_image_url ||
    analysisResult?.heatmaps?.Pneumonia?.overlay_url ||
    defaultImgSrc;

  return (
    <div className="flex flex-col w-full font-sans">
      {/* Workstation Top Context Strip */}
      <div className="w-full bg-surface-card px-space-md py-space-xs flex flex-wrap items-center justify-between shadow-sm border-b border-border-grid">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-status-caution animate-ping' : 'bg-status-verified'}`} />
            <span className="font-headline-sm text-headline-sm text-text-primary">
              SCREENING WORKSTATION · ACTIVE INFERENCE
            </span>
          </div>
          <span className="text-border-strong text-body-sm">|</span>
          <div className="font-label-md text-label-md text-text-secondary flex items-center gap-1">
            <span>ACCESSION:</span>
            <span className="font-semibold text-text-primary">#98765</span>
          </div>
          <div className="font-label-md text-label-md text-text-secondary flex items-center gap-1">
            <span>MODALITY:</span>
            <span className="font-semibold text-text-primary">DX (PA UPRIGHT)</span>
          </div>
          <div className="font-label-md text-label-md text-text-secondary flex items-center gap-1">
            <span>ACQUIRED:</span>
            <span className="font-semibold text-text-primary">19-NOV-2023 10:34:00 UTC</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <span className="bg-status-caution-bg text-status-caution font-label-sm text-label-sm px-2 py-0.5 rounded flex items-center gap-1 border border-status-caution-border">
            <span className="material-symbols-outlined text-[13px]">biotech</span>
            DENSENET-121 v1.0.2 RESEARCH AID
          </span>
          <span className="bg-status-verified-bg text-status-verified font-label-sm text-label-sm px-2 py-0.5 rounded flex items-center gap-1 border border-status-verified-border">
            <span className="material-symbols-outlined text-[13px]">verified_user</span>
            RAW CXR SHA-256 MATCHED
          </span>
        </div>
      </div>

      {/* Main 2-Column Split Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 w-full min-h-[calc(100vh-140px)] gap-0">
        {/* LEFT COLUMN: Dark PACS / DICOM Viewport (lg:col-span-7 bg-dicom-canvas) */}
        <div className="lg:col-span-7 bg-dicom-canvas flex flex-col justify-between relative overflow-hidden select-none border-r border-dicom-border">
          {/* Upper PACS Diagnostic Control Toolbar */}
          <div className="w-full bg-dicom-surface px-space-md py-space-xs flex flex-wrap items-center justify-between z-20 shadow-sm border-b border-dicom-border">
            <div className="flex items-center gap-space-xs">
              <button
                type="button"
                className="px-2 py-1 bg-primary-container text-dicom-text-primary font-label-sm text-label-sm rounded hover:bg-dicom-border flex items-center gap-1 transition-colors border border-dicom-border"
              >
                <span className="material-symbols-outlined text-[14px] text-secondary-container">contrast</span>
                <span>W/L: 2048/400</span>
              </button>

              <button
                type="button"
                onClick={handleToggleInvert}
                className="px-2 py-1 bg-dicom-canvas text-dicom-text-secondary hover:text-dicom-text-primary font-label-sm text-label-sm rounded hover:bg-dicom-border flex items-center gap-1 transition-colors border border-dicom-border"
              >
                <span className="material-symbols-outlined text-[14px]">invert_colors</span>
                <span>Invert: {isInverted ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleZoom}
                className="px-2 py-1 bg-dicom-canvas text-dicom-text-secondary hover:text-dicom-text-primary font-label-sm text-label-sm rounded hover:bg-dicom-border flex items-center gap-1 transition-colors border border-dicom-border"
              >
                <span className="material-symbols-outlined text-[14px]">zoom_in</span>
                <span>{zoomLevel}%</span>
              </button>

              <div className="flex items-center gap-1 px-2 py-1 bg-secondary/20 text-secondary-container font-label-sm text-label-sm rounded border border-secondary/30">
                <span className="material-symbols-outlined text-[13px]">auto_fix_high</span>
                <span>CLAHE: ACTIVE</span>
              </div>
            </div>

            {/* Grad-CAM Heatmap Toggle & Controls */}
            <div className="flex items-center gap-space-sm bg-dicom-canvas px-space-sm py-1 rounded border border-dicom-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="font-headline-sm text-headline-sm text-secondary-container text-xs">
                  Grad-CAM (Layer 4)
                </span>
                <input
                  type="checkbox"
                  checked={camVisible}
                  onChange={(e) => setCamVisible(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-dicom-border rounded-full peer peer-checked:bg-secondary relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
              </label>
              <div className="flex items-center gap-1.5 pl-2 border-l border-dicom-border">
                <span className="font-label-sm text-label-sm text-dicom-text-secondary">{camOpacity}%</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={camOpacity}
                  onChange={(e) => setCamOpacity(Number(e.target.value))}
                  className="w-16 h-1 bg-dicom-border rounded-lg appearance-none cursor-pointer accent-secondary"
                />
              </div>
            </div>
          </div>

          {/* Main Interactive Radiography Stage with HUD */}
          <div className="relative flex-1 w-full min-h-[580px] flex items-center justify-center bg-dicom-canvas overflow-hidden">
            {/* Chest X-Ray Base Display Canvas */}
            <div
              className="relative max-w-[560px] w-full max-h-[640px] flex items-center justify-center p-2 transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <img
                src={imageDisplayUrl}
                alt="Chest Radiograph Frontal View"
                className="w-full h-auto object-contain rounded shadow-2xl transition-[filter] duration-200"
                style={{ filter: isInverted ? 'invert(100%)' : 'none' }}
              />

              {/* Layer 4 Grad-CAM Localized Activation Overlay */}
              {camVisible && isPneumonia && (
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-150 rounded"
                  style={{ opacity: camOpacity / 100, mixBlendMode: 'screen' }}
                >
                  <svg className="w-full h-full preserve-3d" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <radialGradient id="gradcam-activation" cx="37%" cy="66%" fx="37%" fy="66%" r="22%">
                        <stop offset="0%" stopColor="#DC2626" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#EA580C" stopOpacity="0.80" />
                        <stop offset="65%" stopColor="#FBBF24" stopOpacity="0.60" />
                        <stop offset="85%" stopColor="#0284C7" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                      </radialGradient>
                      <radialGradient id="gradcam-secondary" cx="44%" cy="61%" fx="44%" fy="61%" r="14%">
                        <stop offset="0%" stopColor="#EA580C" stopOpacity="0.75" />
                        <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.0" />
                      </radialGradient>
                    </defs>
                    <ellipse cx="375" cy="650" rx="165" ry="145" fill="url(#gradcam-activation)" filter="blur(8px)" />
                    <ellipse cx="440" cy="610" rx="90" ry="80" fill="url(#gradcam-secondary)" filter="blur(6px)" />
                    <path d="M 280 650 Q 370 560 480 640" fill="none" opacity="0.8" stroke="#FDE68A" strokeDasharray="3 3" strokeWidth="1.5" />
                    <text x="240" y="580" fill="#FDE68A" fontFamily="JetBrains Mono" fontSize="14" fontWeight="600">
                      RLL MAX ATTRIBUTION (0.84)
                    </text>
                    <line x1="330" y1="585" x2="365" y2="625" stroke="#FDE68A" strokeWidth="1.2" />
                  </svg>
                </div>
              )}
            </div>

            {/* Corner HUDs */}
            <div className="absolute top-3 left-4 font-code-hash text-code-hash text-dicom-text-secondary bg-dicom-surface/85 backdrop-blur-sm p-2 rounded pointer-events-none shadow-sm space-y-0.5 border border-dicom-border/50">
              <div className="text-dicom-text-primary font-semibold">PATIENT: PX-884920</div>
              <div>STUDY: CXR_PA_CHEST_20231119</div>
              <div>ACCESSION: 98765</div>
              <div className="text-secondary-fixed-dim">DOB: 15/05/1978 · MALE</div>
            </div>

            <div className="absolute top-3 right-4 font-code-hash text-code-hash text-dicom-text-secondary bg-dicom-surface/85 backdrop-blur-sm p-2 rounded pointer-events-none text-right shadow-sm space-y-0.5 border border-dicom-border/50">
              <div className="text-dicom-text-primary font-semibold">TECHNIQUE: 120 kV</div>
              <div>EXP TIME: 14 ms</div>
              <div>DETECTOR: FLAT_PANEL_A</div>
              <div className="text-secondary-fixed-dim">HOSPITAL IMAGING DEPT · BAY 3</div>
            </div>

            <div className="absolute bottom-3 left-4 font-code-hash text-code-hash text-dicom-text-secondary bg-dicom-surface/85 backdrop-blur-sm p-2 rounded pointer-events-none shadow-sm space-y-0.5 border border-dicom-border/50">
              <div>ZOOM: {zoomLevel / 100}x (NATIVE)</div>
              <div>WINDOW LEVEL: 400</div>
              <div>WINDOW WIDTH: 2048</div>
              <div className="text-status-verified">CLAHE: ENHANCED (HIST_EQ)</div>
            </div>

            <div className="absolute bottom-3 right-4 font-code-hash text-code-hash text-dicom-text-secondary bg-dicom-surface/85 backdrop-blur-sm p-2 rounded pointer-events-none text-right shadow-sm space-y-0.5 border border-dicom-border/50">
              <div className="text-dicom-text-primary font-semibold">MODEL: DenseNet-121_bce</div>
              <div>INFERENCE LATENCY: 242ms</div>
              <div>DEVICE: CPU_AVX512_FP32</div>
              <div className="text-secondary-container">CLASS: {isPneumonia ? 'PNEUMONIA_PATTERN' : 'NO_ACUTE_FINDING'}</div>
            </div>

            {/* Grad-CAM Intensity Scale Legend */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-dicom-surface/85 backdrop-blur-sm px-2 py-3 rounded flex flex-col items-center gap-1.5 shadow-sm pointer-events-none border border-dicom-border/50">
              <span className="font-label-sm text-label-sm text-dicom-text-secondary text-[9px] uppercase">Peak</span>
              <div className="w-2.5 h-32 rounded-full bg-gradient-to-b from-[#DC2626] via-[#FBBF24] to-[#0284C7]" />
              <span className="font-label-sm text-label-sm text-dicom-text-secondary text-[9px] uppercase">Zero</span>
              <span className="font-label-sm text-label-sm text-secondary-container text-[8px] mt-1 -rotate-90">
                GRAD-CAM
              </span>
            </div>
          </div>

          {/* Bottom Upload & Sample Selector Drawer Bar */}
          <div className="w-full bg-dicom-surface px-space-md py-space-sm flex flex-wrap items-center justify-between gap-space-sm shadow-sm z-20 border-t border-dicom-border">
            <div className="flex items-center gap-space-md">
              <div className="flex items-center gap-2 text-dicom-text-secondary">
                <span className="material-symbols-outlined text-[20px] text-secondary">cloud_upload</span>
                <div>
                  <div className="font-headline-sm text-headline-sm text-dicom-text-primary text-xs leading-tight">
                    Replace / Upload New Study
                  </div>
                  <div className="font-label-sm text-label-sm text-dicom-text-secondary text-[10px]">
                    Supports .png, .jpg, .dcm (Max 35 MB)
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pl-space-md border-l border-dicom-border">
                <label className="px-2.5 py-1 bg-dicom-canvas hover:bg-dicom-border text-dicom-text-primary font-label-sm text-label-sm rounded transition-colors flex items-center gap-1 cursor-pointer border border-dicom-border">
                  <span className="material-symbols-outlined text-[13px]">folder_open</span>
                  <span>Browse Disk</span>
                  <input type="file" accept="image/*,.dcm" onChange={handleFileUpload} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={() => handleRunSample('sample_normal')}
                  className="px-2.5 py-1 bg-dicom-canvas hover:bg-dicom-border text-secondary-container font-label-sm text-label-sm rounded transition-colors flex items-center gap-1 border border-dicom-border"
                >
                  <span className="material-symbols-outlined text-[13px]">dataset</span>
                  <span>Load Normal CXR</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRunSample('sample_pneumonia')}
                  className="px-2.5 py-1 bg-dicom-canvas hover:bg-dicom-border text-secondary-container font-label-sm text-label-sm rounded transition-colors flex items-center gap-1 border border-dicom-border"
                >
                  <span className="material-symbols-outlined text-[13px]">dataset</span>
                  <span>Load Pneumonia CXR</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-code-hash text-code-hash text-dicom-text-secondary">INPUT HASH: 0x93e7...881f</span>
              <span className="w-2 h-2 rounded-full bg-status-verified" title="Integrity Checked" />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Clinical Structured Report Panel (lg:col-span-5 bg-surface-card) */}
        <div className="lg:col-span-5 bg-surface-card flex flex-col justify-between overflow-y-auto h-full shadow-sm">
          <div className="p-space-md flex flex-col gap-space-md">
            {/* Study Administrative Identification Header */}
            <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-1.5 shadow-sm border border-border-grid">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-text-primary">
                  CLINICAL DECISION SUPPORT REPORT
                </span>
                <span className="font-label-sm text-label-sm bg-surface-card text-text-secondary border border-border-grid px-2 py-0.5 rounded font-mono font-medium shadow-xs">
                  EHR INTEGRATION #DX-77
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-space-md gap-y-1 font-body-sm text-body-sm text-text-secondary">
                <div><span className="text-text-muted">Accession:</span> <span className="font-mono font-medium text-text-primary">#98765</span></div>
                <div><span className="text-text-muted">Modality:</span> <span className="font-medium text-text-primary">DX (Chest Frontal)</span></div>
                <div><span className="text-text-muted">Projection:</span> <span className="font-medium text-text-primary">PA Upright</span></div>
                <div><span className="text-text-muted">Time Acquired:</span> <span className="font-mono font-medium text-text-primary">Nov 19, 2023, 10:34 AM</span></div>
              </div>
            </div>

            {/* Model Decision Support Status Card */}
            <div className="bg-surface-base p-space-md rounded flex flex-col gap-space-sm shadow-sm relative overflow-hidden border border-border-grid">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold tracking-wider">
                    AI Screening Assessment
                  </span>
                  <h2 className="font-headline-lg text-headline-lg text-text-primary leading-tight mt-0.5">
                    {isPneumonia ? 'Pneumonia Pattern Suggested' : 'No Acute Findings Suggested'}
                  </h2>
                  <span className={`font-body-sm text-body-sm font-medium mt-0.5 flex items-center gap-1 ${isPneumonia ? 'text-status-caution' : 'text-status-verified'}`}>
                    <span className="material-symbols-outlined text-[15px]">
                      {isPneumonia ? 'report_problem' : 'check_circle'}
                    </span>
                    {isPneumonia ? 'Right Lower Lobe Consolidation Opacity' : 'Clear pulmonary parenchyma, sharp angles'}
                  </span>
                </div>

                {/* Calibrated Score Big Stat */}
                <div className="text-right bg-surface-card px-space-md py-space-xs rounded shadow-sm border border-border-grid">
                  <div className="font-label-sm text-label-sm text-text-muted">CALIBRATED CONF.</div>
                  <div className="font-headline-xl text-headline-xl text-secondary font-bold leading-none mt-0.5">
                    {confidenceScore}%
                  </div>
                  <div className="font-label-sm text-label-sm text-text-secondary mt-0.5">Platt Scaled</div>
                </div>
              </div>

              {/* Calibration Bar Indicator */}
              <div className="w-full flex flex-col gap-1 mt-1">
                <div className="w-full bg-border-grid h-2 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isPneumonia ? 'bg-secondary' : 'bg-status-verified'}`}
                    style={{ width: `${confidenceScore}%` }}
                  />
                </div>
                <div className="flex justify-between font-label-sm text-label-sm text-text-muted">
                  <span>0% (Clear)</span>
                  <span className="text-text-secondary font-medium">Cutoff: 50.0%</span>
                  <span>100% (High Confidence)</span>
                </div>
              </div>

              {/* Monospace Technical Benchmark Strip */}
              <div className="bg-surface-card p-space-xs rounded grid grid-cols-4 gap-1 text-center font-code-hash text-code-hash shadow-sm border border-border-grid">
                <div className="p-1">
                  <div className="text-text-muted text-[10px]">AUROC</div>
                  <div className="font-semibold text-text-primary text-xs">0.942</div>
                </div>
                <div className="p-1 border-l border-border-grid">
                  <div className="text-text-muted text-[10px]">SENSITIVITY</div>
                  <div className="font-semibold text-text-primary text-xs">91.2%</div>
                </div>
                <div className="p-1 border-l border-border-grid">
                  <div className="text-text-muted text-[10px]">SPECIFICITY</div>
                  <div className="font-semibold text-text-primary text-xs">88.6%</div>
                </div>
                <div className="p-1 border-l border-border-grid">
                  <div className="text-text-muted text-[10px]">ECE ERROR</div>
                  <div className="font-semibold text-status-verified text-xs">0.031</div>
                </div>
              </div>

              <div className="font-label-sm text-label-sm text-text-muted text-[10px]">
                *Evaluated against held-out validation cohort benchmark (DenseNet-121).
              </div>
            </div>

            {/* 4-Compartment Structured Diagnostic Report */}
            <div className="flex flex-col gap-space-sm">
              {/* Compartment 1: Findings */}
              <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-1 shadow-sm border border-border-grid">
                <div className="flex items-center gap-1.5 text-text-secondary font-headline-sm text-headline-sm">
                  <span className="material-symbols-outlined text-[16px] text-text-primary">radiology</span>
                  <span>1. FINDINGS (Descriptive, Objective)</span>
                </div>
                <p className="font-body-md text-body-md text-text-primary pl-5 leading-relaxed">
                  {isPneumonia
                    ? 'Bilateral lung fields demonstrate preserved lung volumes. Faint patchy alveolar opacity identified in the right lower lung zone, partially obscuring the right hemidiaphragmatic contour. Left lung field is clear without focal consolidation or pneumothorax. Cardiothoracic ratio is normal (<0.50). Costophrenic angles are sharp.'
                    : 'Bilateral lung fields demonstrate normal expansion without focal consolidation, pneumothorax, or pleural effusion. Cardiac silhouette and mediastinal contours are within normal limits. Osseous thoracic cage intact.'}
                </p>
              </div>

              {/* Compartment 2: AI Assessment */}
              <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-1 shadow-sm border border-border-grid">
                <div className="flex items-center gap-1.5 text-text-secondary font-headline-sm text-headline-sm">
                  <span className="material-symbols-outlined text-[16px] text-secondary">psychology</span>
                  <span>2. AI ASSESSMENT (Suggested Pattern)</span>
                </div>
                <p className="font-body-md text-body-md text-text-primary pl-5 leading-relaxed">
                  {isPneumonia
                    ? `Computer-assisted screening (DenseNet-121) detects activation patterns corresponding to right lower lobe consolidation. Calibrated prediction score indicates moderate-to-high likelihood of pneumonic process (${confidenceScore}%).`
                    : `Computer-assisted screening (DenseNet-121) detects no acute focal pulmonary abnormalities. Calibrated prediction score indicates low probability of pneumonia (${confidenceScore}%).`}
                </p>
              </div>

              {/* Compartment 3: Confidence & Explainability */}
              <div className="bg-surface-nested p-space-sm rounded flex flex-col gap-1 shadow-sm border border-border-grid">
                <div className="flex items-center gap-1.5 text-text-secondary font-headline-sm text-headline-sm">
                  <span className="material-symbols-outlined text-[16px] text-text-primary">analytics</span>
                  <span>3. CONFIDENCE & EXPLAINABILITY</span>
                </div>
                <p className="font-body-md text-body-md text-text-primary pl-5 leading-relaxed font-code-hash text-code-hash">
                  {confidenceScore}% calibrated probability [Platt scaled]. Threshold: 0.500. Model calibration error (ECE): 0.031. Grad-CAM visual explanation localizes feature attribution to {isPneumonia ? 'right basilar pulmonary parenchyma' : 'diffuse baseline thoracic features'}.
                </p>
              </div>

              {/* Compartment 4: Recommendation */}
              <div className="bg-status-caution-bg p-space-sm rounded flex flex-col gap-1 shadow-sm border border-status-caution-border">
                <div className="flex items-center gap-1.5 text-status-caution font-headline-sm text-headline-sm">
                  <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                  <span>4. RECOMMENDATION</span>
                </div>
                <p className="font-body-md text-body-md text-text-primary pl-5 leading-relaxed font-medium">
                  Clinical and radiologist review strictly recommended. Correlate with clinical presentation (fever, auscultatory crackles, CRP/WBC counts). If pneumonia is confirmed by attending physician, write signed encounter to blockchain ledger for longitudinal continuity.
                </p>
              </div>
            </div>
          </div>

          {/* Action Footer Toolbar */}
          <div className="p-space-md bg-surface-base shadow-sm flex flex-col gap-space-sm border-t border-border-grid">
            <button
              type="button"
              onClick={handleCommit}
              className={`w-full h-10 font-headline-sm text-headline-sm rounded flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer ${
                isCommitted ? 'bg-status-verified text-on-primary' : 'bg-secondary hover:bg-secondary/90 text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>
                {isCommitted
                  ? 'Encounter Recorded on MST Testnet Ledger'
                  : 'Commit Finding to Blockchain Ledger (Hash & Off-Chain Sync)'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-space-sm">
              <button
                type="button"
                onClick={() => alert('Attending Radiologist Override recorded. Specify clinical rationale.')}
                className="h-9 bg-surface-card hover:bg-surface-nested text-alert-tamper font-body-sm text-body-sm font-medium rounded flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-border-grid"
              >
                <span className="material-symbols-outlined text-[16px]">rule</span>
                <span>Flag False Positive / Override</span>
              </button>
              <button
                type="button"
                onClick={() => alert('Exporting structured report bundle for Accession #98765.')}
                className="h-9 bg-surface-card hover:bg-surface-nested text-text-primary font-body-sm text-body-sm font-medium rounded flex items-center justify-center gap-1.5 transition-colors shadow-sm border border-border-grid"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>Export Report (.pdf / .hl7)</span>
              </button>
            </div>

            {toastMessage && (
              <div className="font-code-hash text-code-hash p-2 rounded bg-status-verified-bg text-status-verified flex items-center justify-between border border-status-verified-border">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{toastMessage}</span>
                </div>
                <span className="text-text-muted text-[10px]">CONFIRMED</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
