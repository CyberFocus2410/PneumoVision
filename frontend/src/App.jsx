import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UploadPanel from './components/UploadPanel';
import DicomViewer from './components/DicomViewer';
import FindingsPanel from './components/FindingsPanel';
import LongitudinalTab from './components/LongitudinalTab';
import ReportModal from './components/ReportModal';
import AuditDrawer from './components/AuditDrawer';
import { fetchSystemHealth, analyzeImage } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('single');
  const [theme, setTheme] = useState('dark');
  const [healthData, setHealthData] = useState(null);
  const [selectedSample, setSelectedSample] = useState('sample_pneumonia');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);

  // Load health & initial benchmark sample
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetchSystemHealth()
      .then((data) => setHealthData(data))
      .catch((err) => console.error('Health check failed:', err));

    // Analyze default sample on boot
    handleSelectSample('sample_pneumonia');
  }, []);

  const handleSelectSample = async (sampleId) => {
    setSelectedSample(sampleId);
    setIsAnalyzing(true);
    try {
      const data = await analyzeImage(sampleId);
      setAnalysisResult(data);
      setSelectedFinding(data.primary_finding !== 'No Finding' ? data.primary_finding : null);
    } catch (e) {
      console.error(e);
      alert('Analysis error: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUploadFile = async (file) => {
    setSelectedSample(null);
    setIsAnalyzing(true);
    try {
      const data = await analyzeImage(file);
      setAnalysisResult(data);
      setSelectedFinding(data.primary_finding !== 'No Finding' ? data.primary_finding : null);
    } catch (e) {
      console.error(e);
      alert('Upload analysis error: ' + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthData={healthData}
        theme={theme}
        setTheme={setTheme}
        onOpenAudit={() => setShowAuditDrawer(true)}
      />

      {activeTab === 'single' ? (
        <main className="dashboard-grid">
          {/* Left Column: Upload & Sample Ingestion */}
          <UploadPanel
            onSelectSample={handleSelectSample}
            onUploadFile={handleUploadFile}
            selectedSample={selectedSample}
            isAnalyzing={isAnalyzing}
            dicomMetadata={analysisResult?.dicom_metadata}
            qualityMetrics={analysisResult?.quality_metrics}
          />

          {/* Center Column: High-Fidelity Radiograph & Grad-CAM Viewport */}
          <DicomViewer
            analysisResult={analysisResult}
            selectedFinding={selectedFinding}
            setSelectedFinding={setSelectedFinding}
          />

          {/* Right Column: Quantitative Calibrated Findings */}
          <FindingsPanel
            analysisResult={analysisResult}
            selectedFinding={selectedFinding}
            setSelectedFinding={setSelectedFinding}
            onOpenReport={() => setShowReportModal(true)}
          />
        </main>
      ) : (
        <LongitudinalTab />
      )}

      {/* Structured Report Modal */}
      {showReportModal && (
        <ReportModal
          analysisResult={analysisResult}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* Governance & Audit Drawer */}
      <AuditDrawer
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        healthData={healthData}
      />
    </div>
  );
}
