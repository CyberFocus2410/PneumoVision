import React, { useState } from 'react';
import {
  Eye, ZoomIn, ZoomOut, RotateCcw, Sliders, Layers, Sparkles,
  Image as ImageIcon, Crosshair, HelpCircle, MapPin, Maximize2
} from 'lucide-react';

const WINDOW_PRESETS = [
  { name: 'Standard CXR', brightness: 100, contrast: 100 },
  { name: 'Lung Window', brightness: 115, contrast: 140 },
  { name: 'Mediastinum', brightness: 90, contrast: 160 },
  { name: 'Soft Tissue', brightness: 105, contrast: 120 }
];

export default function DicomViewer({
  analysisResult,
  selectedFinding,
  setSelectedFinding
}) {
  const [viewMode, setViewMode] = useState('overlay'); // 'overlay', 'side', 'original'
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [inverted, setInverted] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [showCrosshair, setShowCrosshair] = useState(false);

  const heatmaps = analysisResult?.heatmaps || {};
  const activeFinding = selectedFinding || analysisResult?.primary_finding || Object.keys(heatmaps)[0] || 'Pneumonia';
  const activeHeatmapData = heatmaps[activeFinding];
  const locData = activeHeatmapData?.localization;

  // Resolve Image URL based on view mode with safe fallbacks
  let displayUrl = null;
  if (viewMode === 'side') {
    displayUrl = activeHeatmapData?.side_url || activeHeatmapData?.overlay_url || analysisResult?.original_image_url;
  } else if (viewMode === 'original') {
    displayUrl = analysisResult?.original_image_url || activeHeatmapData?.original_url;
  } else {
    displayUrl = activeHeatmapData?.overlay_url || activeHeatmapData?.original_url || analysisResult?.original_image_url;
  }

  const applyPreset = (preset) => {
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
  };

  const resetControls = () => {
    setZoom(1.0);
    setBrightness(100);
    setContrast(100);
    setInverted(false);
  };

  return (
    <div className="pacs-viewport-center">
      {/* Viewport Action Toolbar */}
      <div className="pacs-toolbar">
        {/* View Mode */}
        <div className="toolbar-btn-group">
          <button
            className={`pacs-tool-btn ${viewMode === 'overlay' ? 'active' : ''}`}
            onClick={() => setViewMode('overlay')}
          >
            <Sparkles size={13} /> Grad-CAM++ Focus
          </button>
          <button
            className={`pacs-tool-btn ${viewMode === 'original' ? 'active' : ''}`}
            onClick={() => setViewMode('original')}
          >
            <ImageIcon size={13} /> Clean Radiograph
          </button>
          <button
            className={`pacs-tool-btn ${viewMode === 'side' ? 'active' : ''}`}
            onClick={() => setViewMode('side')}
          >
            <Layers size={13} /> Synchronized Split
          </button>
        </div>

        {/* Finding Layer Selector */}
        {Object.keys(heatmaps).filter((k) => k !== 'No Finding').length > 1 && (
          <div className="toolbar-btn-group">
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Layer:</span>
            {Object.keys(heatmaps).filter((k) => k !== 'No Finding').map((fName) => (
              <button
                key={fName}
                className={`pacs-tool-btn ${activeFinding === fName ? 'active' : ''}`}
                onClick={() => setSelectedFinding(fName)}
              >
                {fName}
              </button>
            ))}
          </div>
        )}

        {/* Windowing Presets */}
        <div className="toolbar-btn-group">
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Window:</span>
          {WINDOW_PRESETS.map((p) => (
            <button
              key={p.name}
              className="pacs-tool-btn"
              style={{ fontSize: '0.68rem', padding: '3px 8px' }}
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Zoom & Canvas Adjustments */}
        <div className="toolbar-btn-group">
          <button className="pacs-tool-btn" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} title="Zoom In">
            <ZoomIn size={13} />
          </button>
          <button className="pacs-tool-btn" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} title="Zoom Out">
            <ZoomOut size={13} />
          </button>
          <button
            className={`pacs-tool-btn ${inverted ? 'active' : ''}`}
            onClick={() => setInverted((inv) => !inv)}
            title="Invert Presentation"
          >
            Invert
          </button>
          <button
            className={`pacs-tool-btn ${showCrosshair ? 'active' : ''}`}
            onClick={() => setShowCrosshair((c) => !c)}
            title="Toggle Center Crosshair"
          >
            <Crosshair size={13} />
          </button>
          <button className="pacs-tool-btn" onClick={resetControls} title="Reset">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Main Radiograph Canvas */}
      <div className="pacs-canvas-wrapper">
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt="Radiograph Viewport"
              className="pacs-radiograph-view"
              style={{
                transform: `scale(${zoom})`,
                filter: `brightness(${brightness}%) contrast(${contrast}%) ${inverted ? 'invert(1)' : ''}`,
              }}
            />

            {/* Crosshair Overlay */}
            {showCrosshair && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ position: 'absolute', width: '100%', height: '1px', background: 'rgba(6, 182, 212, 0.3)' }} />
                <div style={{ position: 'absolute', height: '100%', width: '1px', background: 'rgba(6, 182, 212, 0.3)' }} />
              </div>
            )}

            {/* Floating Heatmap Interpretation Guide */}
            {showGuide && (
              <div className="heatmap-floating-guide">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    AI Visual Attention Map
                  </span>
                  <button
                    onClick={() => setShowGuide(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem' }}
                  >
                    Hide
                  </button>
                </div>
                <div className="heatmap-color-scale-bar" />
                <div className="heatmap-scale-labels">
                  <span>Normal / Background</span>
                  <span>Moderate</span>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>Peak Focus &gt;80%</span>
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: '1.25' }}>
                  <b>Red/Yellow zones</b> highlight the precise image pixels the deep neural network used to identify pathology.
                </p>
              </div>
            )}

            {/* Anatomical Landmark Focus Tag */}
            {locData && (
              <div className="anatomical-focus-pill">
                <MapPin size={13} color="#38bdf8" />
                <span>Attention Focus: {locData.anatomical_site}</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            <ImageIcon size={44} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.8rem' }}>Select a patient case or upload an X-ray to inspect</p>
          </div>
        )}
      </div>

      {/* Manual Fine Sliders */}
      <div style={{ display: 'flex', gap: '16px', background: 'var(--bg-card)', padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
        <Sliders size={13} color="var(--text-muted)" style={{ marginTop: '3px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span>Brightness:</span>
          <input
            type="range"
            min="50"
            max="180"
            value={brightness}
            onChange={(e) => setBrightness(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--cyan-primary)' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{brightness}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          <span>Contrast:</span>
          <input
            type="range"
            min="50"
            max="200"
            value={contrast}
            onChange={(e) => setContrast(parseInt(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--cyan-primary)' }}
          />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{contrast}%</span>
        </div>
      </div>
    </div>
  );
}
