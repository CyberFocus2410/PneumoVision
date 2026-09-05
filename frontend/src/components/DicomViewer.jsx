import React, { useState } from 'react';
import { Eye, ZoomIn, ZoomOut, RotateCcw, Sliders, Layers, Sparkles, Image as ImageIcon } from 'lucide-react';

export default function DicomViewer({
  analysisResult,
  selectedFinding,
  setSelectedFinding
}) {
  const [viewMode, setViewMode] = useState('overlay'); // 'original', 'overlay', 'side'
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [inverted, setInverted] = useState(false);
  const [opacity, setOpacity] = useState(0.45);

  const heatmaps = analysisResult?.heatmaps || {};
  const activeFinding = selectedFinding || analysisResult?.primary_finding || Object.keys(heatmaps)[0];
  const activeHeatmapData = heatmaps[activeFinding];

  // Resolve Image URL based on view mode
  let displayUrl = null;
  if (viewMode === 'original' || !activeHeatmapData) {
    displayUrl = activeHeatmapData?.overlay_url ? activeHeatmapData.overlay_url.replace('_overlay.png', '_side.png') : null;
    // Fallback: we will use overlay or original
    displayUrl = activeHeatmapData?.overlay_url || null;
  } else if (viewMode === 'side') {
    displayUrl = activeHeatmapData?.side_url;
  } else {
    displayUrl = activeHeatmapData?.overlay_url;
  }

  const resetControls = () => {
    setZoom(1.0);
    setBrightness(100);
    setContrast(100);
    setInverted(false);
    setOpacity(0.45);
  };

  return (
    <div className="clinical-card viewer-card">
      <div className="card-title-row">
        <span className="card-title">
          <Eye size={16} /> Radiologic Diagnostic Viewport
        </span>
        {activeFinding && (
          <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>
            Active CAM Target: <b>{activeFinding}</b>
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="viewer-toolbar">
        {/* View Mode Toggle */}
        <div className="toolbar-group">
          <button
            className={`tool-btn ${viewMode === 'overlay' ? 'active' : ''}`}
            onClick={() => setViewMode('overlay')}
          >
            <Sparkles size={13} /> Grad-CAM++
          </button>
          <button
            className={`tool-btn ${viewMode === 'side' ? 'active' : ''}`}
            onClick={() => setViewMode('side')}
          >
            <Layers size={13} /> Side-by-Side
          </button>
        </div>

        {/* Heatmap Finding Selection if multiple available */}
        {Object.keys(heatmaps).length > 1 && (
          <div className="toolbar-group">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Layer:</span>
            {Object.keys(heatmaps).map((findingName) => (
              <button
                key={findingName}
                className={`tool-btn ${activeFinding === findingName ? 'active' : ''}`}
                onClick={() => setSelectedFinding(findingName)}
              >
                {findingName}
              </button>
            ))}
          </div>
        )}

        {/* Zoom & Image Processing Tools */}
        <div className="toolbar-group">
          <button className="tool-btn" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))} title="Zoom In">
            <ZoomIn size={13} />
          </button>
          <button className="tool-btn" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} title="Zoom Out">
            <ZoomOut size={13} />
          </button>
          <button
            className={`tool-btn ${inverted ? 'active' : ''}`}
            onClick={() => setInverted((inv) => !inv)}
            title="Invert Presentation (MONOCHROME1/2)"
          >
            Invert
          </button>
          <button className="tool-btn" onClick={resetControls} title="Reset Viewport">
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="viewport-canvas-container">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Radiograph Viewport"
            className="radiograph-img"
            style={{
              transform: `scale(${zoom})`,
              filter: `brightness(${brightness}%) contrast(${contrast}%) ${inverted ? 'invert(1)' : ''}`,
            }}
          />
        ) : (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
            <ImageIcon size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <p style={{ fontSize: '0.85rem' }}>Select or upload a study to display radiograph</p>
          </div>
        )}

        {/* Live Heatmap Opacity Controls */}
        {viewMode === 'overlay' && displayUrl && (
          <div className="viewport-overlay-slider">
            <span>CAM Blend:</span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '90px', cursor: 'pointer', accentColor: 'var(--cyan-primary)' }}
            />
            <span>{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>

      {/* Window Level Controls */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
        <Sliders size={14} color="var(--text-muted)" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
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
