import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import DiagnosticScreeningTab from './components/DiagnosticScreeningTab';
import AccessControlTab from './components/AccessControlTab';
import CareHistoryTab from './components/CareHistoryTab';
import TamperAuditTab from './components/TamperAuditTab';
import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const { user, role, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('screening');

  // Auth modal controls
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState('DOCTOR');
  const [authModalMode, setAuthModalMode] = useState('login');

  const handleOpenAuth = (defaultRole = 'DOCTOR', defaultMode = 'login') => {
    setAuthModalRole(defaultRole);
    setAuthModalMode(defaultMode);
    setShowAuthModal(true);
  };

  return (
    <div className="h-screen max-h-screen flex flex-col bg-surface-base font-body-md text-text-primary antialiased overflow-hidden">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={handleOpenAuth}
      />

      <main className="w-full flex-1 min-h-0 bg-surface-base overflow-hidden flex flex-col">
        {(activeTab === 'screening' || activeTab === 'single') && (
          <DiagnosticScreeningTab onCommitLedger={() => setActiveTab('history')} />
        )}
        {activeTab === 'access' && <AccessControlTab />}
        {activeTab === 'history' && <CareHistoryTab />}
        {activeTab === 'tamper' && (
          <TamperAuditTab onNavigateSafe={() => setActiveTab('screening')} />
        )}
        {activeTab === 'doctor' && <DoctorDashboard />}
        {activeTab === 'patient' && <PatientDashboard />}
      </main>

      <Footer />

      {/* Login / Signup Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialRole={authModalRole}
        initialMode={authModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
