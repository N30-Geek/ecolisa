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
import { TeacherManager } from './components/administration/TeacherManager';
import { UsersManager } from './components/administration/UsersManager';
import { AuditLogViewer } from './components/administration/AuditLogViewer';
import { LoginScreen } from './components/auth/LoginScreen';
import { AccountSwitcherModal } from './components/auth/AccountSwitcherModal';
import { ToastContainer } from './components/common/ToastNotification';
import { RôleSystème } from './types';
import { OfflineStorageService } from './services/offlineStorage';
import { LocalDatabaseService, UserSession } from './services/localDatabase';
import { hasTabAccess, getDefaultTabForRole } from './utils/permissions';

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

// ─── Banner pour Accès Restreint ──────────────────────────────────────────────
const AccessDeniedBanner: React.FC<{ role: RôleSystème; onFallback: () => void }> = ({ role, onFallback }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 animate-fade-in">
    <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center text-3xl mb-6 shadow-md">
      🛡️
    </div>
    <h2 className="text-2xl font-black mb-2 text-rose-500">Accès Restreint pour ce Rôle</h2>
    <p className="text-sm max-w-md leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
      Votre compte est configuré sous le rôle <span className="font-black text-indigo-500">{role}</span>. Ce module est réservé aux administrateurs autorisés.
    </p>
    <button
      onClick={onFallback}
      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition-all shadow-md cursor-pointer"
    >
      Retourner à mon Tableau de Bord
    </button>
  </div>
);

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<RôleSystème>('PROMOTEUR_ADMIN');
  const [activeSchoolYear, setActiveSchoolYear] = useState<string>('2025–2026');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Verification dynamique de permission d'onglet
  useEffect(() => {
    if (!hasTabAccess(userRole, activeTab)) {
      const fallback = getDefaultTabForRole(userRole);
      setActiveTab(fallback);
    }
  }, [userRole, activeTab]);

  // Auth & Onboarding State
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [lockedUser, setLockedUser] = useState<UserSession | null>(null); // Dernier utilisateur verrouillé
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState<boolean>(false);
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

      // Restaurer l'année scolaire active depuis la config établissement
      const savedConfig = await LocalDatabaseService.getConfig('school_config');
      if (savedConfig?.activeSchoolYear) {
        setActiveSchoolYear(savedConfig.activeSchoolYear);
      }

      // ⚠️ RE-AUTHENTIFICATION OBLIGATOIRE à chaque lancement.
      // La session précédente est effacée : l'utilisateur doit toujours
      // saisir son code PIN ou mot de passe au démarrage et après verrouillage.
      await LocalDatabaseService.logout();

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

  // Déclencheur pour ouvrir le formulaire d'inscription depuis le dashboard
  const [registrationRequest, setRegistrationRequest] = useState<number>(0);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const handleCompleteOnboarding = async (config: SchoolConfig) => {
    // 1. Persister la config établissement dans SQLite
    await LocalDatabaseService.setConfig('onboarding_completed', true);
    await LocalDatabaseService.setConfig('school_config', config);
    localStorage.setItem('ecolisa_school_config', JSON.stringify(config));

    // 2. Synchroniser l'année scolaire active dans l'état de l'app
    if (config.activeSchoolYear) {
      setActiveSchoolYear(config.activeSchoolYear);
    }

    // 3. Créer l'année scolaire dans SQLite si elle n'existe pas encore
    try {
      const existingYears = await LocalDatabaseService.getSchoolYears();
      const nomAnnee = config.activeSchoolYear || '2025–2026';
      // Chercher par le champ "nom" (type canonique AnneeScolaireConfig)
      const alreadyExists = existingYears.some(y => y.nom === nomAnnee);
      if (!alreadyExists) {
        const yearParts = nomAnnee.split(/[–-]/);
        const startYear = yearParts[0]?.trim() || new Date().getFullYear().toString();
        const endYear   = yearParts[1]?.trim() || String(parseInt(startYear) + 1);
        await LocalDatabaseService.addSchoolYear({
          id:               `sy_${Date.now()}`,
          nom:              nomAnnee,
          statut:           'EN_COURS',
          debut:            `${startYear}-09-01`,
          fin:              `${endYear}-06-30`,
          nombreElevesTotal: 0,
          fraisInscription:  0,
          fraisConnexion:    0,
          fraisReinscription: 0,
          fraisCarte:        0,
          fraisAnnexes:      [],
          cycles:            [],
          salles:            [],
          semestres:         [],
          periodes:          [],
        });
      } else {
        // S'assurer que l'année existante est marquée EN_COURS
        const target = existingYears.find(y => y.nom === nomAnnee);
        if (target && target.statut !== 'EN_COURS') {
          await LocalDatabaseService.updateSchoolYear(target.id, { statut: 'EN_COURS' });
        }
      }
    } catch (e) {
      console.warn('[Onboarding] Impossible de créer l\'année scolaire :', e);
    }

    setIsOnboardingCompleted(true);
    setShowOnboardingModal(false);
  };

  const handleLoginSuccess = async (user: UserSession) => {
    await LocalDatabaseService.setCurrentUser(user);
    setCurrentUser(user);
    setLockedUser(null); // Effacer le verrouillage une fois authentifié
    setUserRole(user.role);
    const targetTab = getDefaultTabForRole(user.role);
    setActiveTab(targetTab);
  };

  const handleLogout = async () => {
    // Mémoriser le dernier utilisateur pour l'écran de verrouillage rapide
    if (currentUser) setLockedUser(currentUser);
    // Journaliser le verrouillage avant d'effacer la session
    try {
      await LocalDatabaseService.logAction('DECONNEXION', 'SYSTEME', undefined, undefined, {
        role: userRole,
        action: 'Verrouillage de session',
        timestamp: new Date().toISOString(),
      });
    } catch {}
    await LocalDatabaseService.logout();
    setCurrentUser(null);
    setIsAccountSwitcherOpen(false);
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
        return (
          <ExecutiveDashboard
            activeSchoolYear={activeSchoolYear}
            onNavigate={setActiveTab}
            onOpenRegistration={() => { setActiveTab('students'); setRegistrationRequest(n => n + 1); }}
            userRole={userRole}
          />
        );

      // ── Gestion Pédagogies ──
      case 'students':
      case 'apprenants':
      case 'years':
      case 'schedule':
      case 'grades':
      case 'examens':
      case 'classes':
      case 'subjects':
        return <AcademicManager activeSchoolYear={activeSchoolYear} activeSubTab={activeTab} registrationRequest={registrationRequest} />;

      // ── Finances & Caisse ──
      case 'invoices':
      case 'cash':
      case 'payroll':
      case 'expenses':
      case 'fees':
      case 'accounting':
      case 'reports':
      case 'analytics':
        return <FinanceManager activeSchoolYear={activeSchoolYear} activeSubTab={activeTab} />;

      // ── Administration ──
      case 'discipline':
        return <ComingSoonModule title="Discipline & Conduites" icon="⚖️" description="Registre de retenues, avertissements et cahier de liaison numérique." />;
      case 'teachers':
        return <TeacherManager activeSchoolYear={activeSchoolYear} targetCategory="ENSEIGNANT" />;
      case 'hr':
        return <TeacherManager activeSchoolYear={activeSchoolYear} targetCategory="STAFF" />;
      case 'users':
        return hasTabAccess(userRole, 'users')
          ? <div className="p-6 animate-fade-in"><UsersManager /></div>
          : <AccessDeniedBanner role={userRole} onFallback={() => setActiveTab(getDefaultTabForRole(userRole))} />;
      case 'audit':
        return hasTabAccess(userRole, 'audit')
          ? <div className="p-6 animate-fade-in"><AuditLogViewer /></div>
          : <AccessDeniedBanner role={userRole} onFallback={() => setActiveTab(getDefaultTabForRole(userRole))} />;
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
        return hasTabAccess(userRole, 'settings')
          ? <SettingsManager onOpenOnboarding={() => setShowOnboardingModal(true)} />
          : <AccessDeniedBanner role={userRole} onFallback={() => setActiveTab(getDefaultTabForRole(userRole))} />;

      default:
        return (
          <ExecutiveDashboard
            activeSchoolYear={activeSchoolYear}
            onNavigate={setActiveTab}
            onOpenRegistration={() => { setActiveTab('students'); setRegistrationRequest(n => n + 1); }}
            userRole={userRole}
          />
        );
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

  // 2. Si non authentifié -> Afficher l'Écran de Connexion ou de Verrouillage
  if (!currentUser) {
    return (
      <div className={`h-screen w-screen overflow-hidden flex flex-col antialiased font-sans select-none ${theme}`}>
        <TitleBar isOnline={isOnline} />
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onResetAndReconfigure={handleResetAndReconfigure}
          isDarkMode={theme === 'dark'}
          toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          lockedUser={lockedUser ?? undefined}
        />
      </div>
    );
  }

  // 3. Authentification Réussie -> Accès à l'Application Complète
  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col antialiased font-sans select-none ${theme}`}>

      {/* Barre de titre frameless Electron */}
      <TitleBar isOnline={isOnline} />

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
          onLock={handleLogout}
          onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
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
            onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
          />

          {/* Zone de contenu principale */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-4" style={{ background: 'var(--bg-base)' }}>
            <div key={activeTab} className="animate-fade-in w-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        currentUser={currentUser}
        onSwitchUser={handleLoginSuccess}
      />
      <ToastContainer />
    </div>
  );
}

export default App;
