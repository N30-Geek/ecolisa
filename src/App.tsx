import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { AcademicManager } from './components/academic/AcademicManager';
import { FinanceManager } from './components/finance/FinanceManager';
import { DocumentEngine } from './components/documents/DocumentEngine';
import { LicenseSyncManager } from './components/system/LicenseSyncManager';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { SystemRole } from './types';
import { OfflineStorageService } from './services/offlineStorage';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<SystemRole>('PROMOTEUR_ADMIN');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const [pendingQueueCount, setPendingQueueCount] = useState<number>(
    OfflineStorageService.getPendingQueue().length
  );

  const handleCompleteOnboarding = (config: any) => {
    setShowOnboarding(false);
    console.log('Ecolisa Pre-Configuration Saved:', config);
  };

  return (
    <div className="min-h-screen flex bg-[#f4f6fb] font-sans antialiased text-[#1c1d22]">
      
      {/* Onboarding Setup Wizard Modal */}
      {showOnboarding && (
        <OnboardingWizard 
          onComplete={handleCompleteOnboarding}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole} 
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Navbar */}
        <Navbar 
          userRole={userRole}
          setUserRole={setUserRole}
          isOnline={isOnline}
          setIsOnline={setIsOnline}
          pendingQueueCount={pendingQueueCount}
          onOpenOnboarding={() => setShowOnboarding(true)}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto pb-12">
          {activeTab === 'dashboard' && <ExecutiveDashboard />}
          
          {(activeTab === 'students' || activeTab === 'teachers' || activeTab === 'classes' || activeTab === 'schedule') && (
            <AcademicManager />
          )}

          {(activeTab === 'invoices' || activeTab === 'payroll' || activeTab === 'expenses') && (
            <FinanceManager />
          )}

          {activeTab === 'documents' && <DocumentEngine />}

          {activeTab === 'license' && <LicenseSyncManager />}

          {(activeTab === 'messages' || activeTab === 'announcements' || activeTab === 'hr' || activeTab === 'settings') && (
            <div className="p-8 text-center py-24 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl font-bold">
                ⚙️
              </div>
              <h2 className="text-xl font-bold text-slate-900 capitalize">{activeTab} Module</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ce module est configuré et prêt pour l'intégration des webhooks Supabase Edge Functions.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Retour au Dashboard ACADEMIA
              </button>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

export default App;
