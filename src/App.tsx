import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { AcademicManager } from './components/academic/AcademicManager';
import { FinanceManager } from './components/finance/FinanceManager';
import { DocumentEngine } from './components/documents/DocumentEngine';
import { LicenseSyncManager } from './components/system/LicenseSyncManager';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { RôleSystème } from './types';
import { OfflineStorageService } from './services/offlineStorage';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<RôleSystème>('PROMOTEUR_ADMIN');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  const [pendingQueueCount, setPendingQueueCount] = useState<number>(
    OfflineStorageService.getPendingQueue().length
  );

  const handleCompleteOnboarding = (config: any) => {
    setShowOnboarding(false);
    console.log('Préconfiguration Ecolisa Enregistrée :', config);
  };

  return (
    <div className="min-h-screen flex bg-[#f4f6fb] font-sans antialiased text-[#1c1d22]">
      
      {/* Modal d'Assistant de Préconfiguration */}
      {showOnboarding && (
        <OnboardingWizard 
          onComplete={handleCompleteOnboarding}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Barre Latérale (Sidebar) */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        userRole={userRole} 
      />

      {/* Conteneur Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Barre Supérieure (Navbar) */}
        <Navbar 
          userRole={userRole}
          setUserRole={setUserRole}
          isOnline={isOnline}
          setIsOnline={setIsOnline}
          pendingQueueCount={pendingQueueCount}
          onOpenOnboarding={() => setShowOnboarding(true)}
        />

        {/* Zone d'Affichage du Contenu */}
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
              <h2 className="text-xl font-bold text-slate-900 capitalize">Module {activeTab}</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ce module est pré-configuré et prêt pour les fonctions métier d'arrière-plan.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Retour au Tableau de Bord
              </button>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

export default App;
