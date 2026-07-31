import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { AcademicManager } from './components/academic/AcademicManager';
import { FinanceManager } from './components/finance/FinanceManager';
import { DocumentEngine } from './components/documents/DocumentEngine';
import { LicenseSyncManager } from './components/system/LicenseSyncManager';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { StudentRegistrationModal } from './components/academic/StudentRegistrationModal';
import { mockClasses } from './data/mockData';
import { RôleSystème } from './types';
import { OfflineStorageService } from './services/offlineStorage';

// ─── Placeholder pour les modules en développement ───────────────────────────
const ComingSoonModule: React.FC<{ title: string; icon: string; description: string }> = ({
  title, icon, description,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 animate-fade-in">
    <div
      className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-xl border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      {icon}
    </div>
    <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>{title}</h2>
    <p className="text-sm max-w-sm leading-relaxed mb-8" style={{ color: 'var(--text-muted)' }}>{description}</p>
    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
      Module en cours de déploiement
    </div>
  </div>
);

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<RôleSystème>('PROMOTEUR_ADMIN');
  const [activeSchoolYear, setActiveSchoolYear] = useState<string>('2025–2026');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ecolisa_theme') as 'dark' | 'light') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('ecolisa_theme', theme);
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');
    root.classList.add(theme);
    body.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const [pendingQueueCount] = useState<number>(
    OfflineStorageService.getPendingQueue().length
  );

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const handleCompleteOnboarding = (config: any) => {
    setShowOnboarding(false);
    console.log('Préconfiguration Ecolisa Enregistrée :', config);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ExecutiveDashboard onNavigate={setActiveTab} onOpenRegistration={() => setShowRegistrationModal(true)} />;

      // ── Gestion Pédagogies ──
      case 'students':
      case 'apprenants':
      case 'years':
      case 'schedule':
      case 'grades':
      case 'examens':
      case 'classes':
      case 'subjects':
        return <AcademicManager activeSubTab={activeTab} />;

      // ── Finances & Caisse ──
      case 'invoices':
      case 'payroll':
      case 'expenses':
        return <FinanceManager activeSubTab={activeTab} />;

      // ── Administration ──
      case 'discipline':
        return <ComingSoonModule title="Discipline & Conduites" icon="⚖️" description="Registre de retenues, avertissements et cahier de liaison numérique." />;
      case 'teachers':
      case 'hr':
        return <ComingSoonModule title="Dossiers Personnel & Agents Scolaires" icon="👥" description="Gestion des dossiers du personnel, contrats, fonctions et affectations." />;
      case 'leaves':
        return <ComingSoonModule title="Congés & Absences" icon="🗓️" description="Gestion des demandes de congés et suivi des présences du personnel." />;
      // ── Vie Scolaire ──
      case 'infirmerie':
        return <ComingSoonModule title="Santés & Infirmerie Scolaire" icon="🏥" description="Registre de passage à l'infirmerie, fiches médicales et urgences." />;
      case 'cantine':
        return <ComingSoonModule title="Cantine & Garderie" icon="🍽️" description="Inscriptions, menus et contrôle de passage." />;
      case 'ressources':
        return <ComingSoonModule title="Ressources Scolaires" icon="📦" description="Inventaire des équipements, matériels didactiques et mobiliers scolaires." />;
      case 'transport':
        return <ComingSoonModule title="Transport Scolaire & Lines" icon="🚌" description="Gestion des circuits, lignes de bus, chauffeurs et arrêts." />;
      case 'library':
        return <ComingSoonModule title="Bibliothèques & CDI" icon="📚" description="Catalogue de livres, gestion des prêts et retours." />;

      // ── System & Administration ──
      case 'documents':
        return <DocumentEngine />;
      case 'messages':
        return <ComingSoonModule title="Messageries & Communications" icon="💬" description="Communication sécurisée entre équipes pédagogiques, administratives et parents." />;
      case 'license':
        return <LicenseSyncManager />;
      case 'settings':
        return <ComingSoonModule title="Paramètres du Système" icon="⚙️" description="Configuration de l'établissement, années scolaires, RBAC et intégrations." />;

      default:
        return <ExecutiveDashboard onNavigate={setActiveTab} onOpenRegistration={() => setShowRegistrationModal(true)} />;
    }
  };

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col antialiased font-sans select-none ${theme}`}>

      {/* Barre de titre frameless Electron */}
      <TitleBar isOnline={isOnline} />

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={handleCompleteOnboarding}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Modal d'Inscription Élève Global */}
      {showRegistrationModal && (
        <StudentRegistrationModal
          onClose={() => setShowRegistrationModal(false)}
          onRegister={(newStudent) => {
            console.log('Nouveau dossier élève inscrit :', newStudent);
            setShowRegistrationModal(false);
            setActiveTab('apprenants');
          }}
          availableClasses={mockClasses.map(c => ({ id: c.id, nom: c.nom }))}
        />
      )}

      {/* Conteneur principal sous la TitleBar (Menu latéral FIXE + Zone de travail) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Sidebar FIXE */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          isOnline={isOnline}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onOpenRegistration={() => setShowRegistrationModal(true)}
        />

        {/* Colonne de droite : Header FIXE + Zone de contenu défilante */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

          {/* Navbar FIXE (avec switcher Dark/Light mode & Toggle Sidebar) */}
          <Navbar
            userRole={userRole}
            setUserRole={setUserRole}
            activeSchoolYear={activeSchoolYear}
            setActiveSchoolYear={setActiveSchoolYear}
            isOnline={isOnline}
            setIsOnline={setIsOnline}
            pendingQueueCount={pendingQueueCount}
            onOpenOnboarding={() => setShowOnboarding(true)}
            activeTab={activeTab}
            onNavigate={setActiveTab}
            isDarkMode={theme === 'dark'}
            toggleTheme={toggleTheme}
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
          />

          {/* Zone de contenu principale (Seule zone qui défile - Pleine largeur sans marges excessives) */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4" style={{ background: 'var(--bg-base)' }}>
            <div key={activeTab} className="animate-fade-in w-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
