import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { AcademicManager } from './components/academic/AcademicManager';
import { FinanceManager } from './components/finance/FinanceManager';
import { DocumentEngine } from './components/documents/DocumentEngine';
import { LicenseSyncManager } from './components/system/LicenseSyncManager';
import { OnboardingWizard, SchoolConfig } from './components/onboarding/OnboardingWizard';
import { SettingsManager } from './components/settings/SettingsManager';
import { StudentRegistrationModal } from './components/academic/StudentRegistrationModal';
import { LoginScreen } from './components/auth/LoginScreen';
import { mockClasses } from './data/mockData';
import { RôleSystème } from './types';
import { OfflineStorageService } from './services/offlineStorage';
import { LocalDatabaseService, UserSession } from './services/localDatabase';

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
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  
  // Auth & Onboarding State
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [appLoading, setAppLoading] = useState<boolean>(true);

  // Le theme reste dans localStorage (preference UI seulement)
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

  // Chargement initial depuis SQLite via IPC
  useEffect(() => {
    const initApp = async () => {
      await LocalDatabaseService.init();

      // Lire l'onboarding depuis SQLite
      const onboardingDone = await LocalDatabaseService.getConfig('onboarding_completed');
      setIsOnboardingCompleted(!!onboardingDone);

      // Restaurer la session utilisateur depuis SQLite
      const user = LocalDatabaseService.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setUserRole(user.role);
      }

      setAppLoading(false);
    };
    initApp();
  }, []);

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

  const handleCompleteOnboarding = async (config: SchoolConfig) => {
    // Persister l'etat onboarding et la config ecole dans SQLite
    await LocalDatabaseService.setConfig('onboarding_completed', true);
    await LocalDatabaseService.setConfig('school_config', config);
    setIsOnboardingCompleted(true);
    setShowOnboardingModal(false);
  };

  const handleLoginSuccess = async (user: UserSession) => {
    await LocalDatabaseService.setCurrentUser(user);
    setCurrentUser(user);
    setUserRole(user.role);
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await LocalDatabaseService.logout();
    setCurrentUser(null);
  };

  const handleResetAndReconfigure = async () => {
    if (window.confirm('Etes-vous sur de vouloir reinitialiser la base de donnees et relancer la configuration initiale ?')) {
      await LocalDatabaseService.resetDatabase();
      setCurrentUser(null);
      setIsOnboardingCompleted(false);
      setShowOnboardingModal(true);
    }
  };

  // Ecran de chargement pendant l'init SQLite
  if (appLoading) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center ${theme} bg-slate-50 dark:bg-slate-950`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 animate-pulse" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Chargement de la base de donnees...</p>
        </div>
      </div>
    );
  }

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
        return <SettingsManager onOpenOnboarding={() => setShowOnboardingModal(true)} />;

      default:
        return <ExecutiveDashboard onNavigate={setActiveTab} onOpenRegistration={() => setShowRegistrationModal(true)} />;
    }
  };

  // PHASES DE RENDU :
  // 1. Si Onboarding pas encore effectué ou réinitialisé -> Afficher l'Onboarding Principal
  if (!isOnboardingCompleted || showOnboardingModal) {
    return (
      <div className={`h-screen w-screen overflow-hidden flex flex-col antialiased font-sans select-none ${theme}`}>
        <TitleBar isOnline={isOnline} />
        <OnboardingWizard
          onComplete={handleCompleteOnboarding}
          onSkip={isOnboardingCompleted ? () => setShowOnboardingModal(false) : undefined}
          isDarkMode={theme === 'dark'}
          toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        />
      </div>
    );
  }

  // 2. Si non authentifié -> Afficher l'Écran de Connexion
  if (!currentUser) {
    return (
      <div className={`h-screen w-screen overflow-hidden flex flex-col antialiased font-sans select-none ${theme}`}>
        <TitleBar isOnline={isOnline} />
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onResetAndReconfigure={handleResetAndReconfigure}
          isDarkMode={theme === 'dark'}
          toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        />
      </div>
    );
  }

  // 3. Authentification Réussie -> Accès à l'Application Complète
  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col antialiased font-sans select-none ${theme}`}>

      {/* Barre de titre frameless Electron */}
      <TitleBar isOnline={isOnline} />

      {/* Modal d'Inscription Élève Global */}
      {showRegistrationModal && (
        <StudentRegistrationModal
          onClose={() => setShowRegistrationModal(false)}
          onRegister={(newStudent) => {
            setShowRegistrationModal(false);
            setActiveTab('apprenants');
          }}
          availableClasses={mockClasses.map(c => ({ id: c.id, nom: c.nom }))}
        />
      )}

      {/* Conteneur principal sous la TitleBar (Menu latéral FIXE + Zone de travail) */}
      <div className="flex-1 flex min-h-0 relative">

        {/* Sidebar FIXE avec bouton de verrouillage/déconnexion */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={userRole}
          isOnline={isOnline}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onOpenRegistration={() => setShowRegistrationModal(true)}
          onLock={handleLogout}
        />

        {/* Colonne de droite : Header FIXE + Zone de contenu défilante */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>

          {/* Navbar FIXE */}
          <Navbar
            userRole={userRole}
            setUserRole={setUserRole}
            activeSchoolYear={activeSchoolYear}
            setActiveSchoolYear={setActiveSchoolYear}
            isOnline={isOnline}
            setIsOnline={setIsOnline}
            pendingQueueCount={pendingQueueCount}
            onOpenOnboarding={() => setShowOnboardingModal(true)}
            activeTab={activeTab}
            onNavigate={setActiveTab}
            isDarkMode={theme === 'dark'}
            toggleTheme={toggleTheme}
            isSidebarCollapsed={isSidebarCollapsed}
            toggleSidebar={toggleSidebar}
            onLogout={handleLogout}
          />

          {/* Zone de contenu principale */}
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
