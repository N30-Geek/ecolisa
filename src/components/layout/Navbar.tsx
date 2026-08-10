import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  Calendar,
  ClipboardCheck,
  Receipt,
  Banknote,
  Wallet,
  UserCheck,
  CalendarDays,
  Scale,
  HeartPulse,
  Utensils,
  Bus,
  BookOpen,
  FileText,
  MessageSquare,
  ShieldCheck,
  Settings,
  ChevronDown,
  Bell,
  RefreshCw,
  WifiOff,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Loader,
  HelpCircle,
  LogOut,
  User,
  Shield,
  LifeBuoy,
  X,
  CheckCircle2,
  Search,
  Command,
  ArrowRight,
  Menu,
  Briefcase,
  Layers,
  HardDrive
} from 'lucide-react';
import { RôleSystème } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CommandPalette } from './CommandPalette';
import { LocalDatabaseService } from '../../services/localDatabase';

interface NavbarProps {
  userRole: RôleSystème;
  setUserRole: (role: RôleSystème) => void;
  activeSchoolYear?: string;
  setActiveSchoolYear?: (yr: string) => void;
  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  pendingQueueCount: number;
  onOpenOnboarding: () => void;
  activeTab?: string;
  onNavigate?: (tab: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isSidebarCollapsed?: boolean;
  toggleSidebar?: () => void;
  onLogout?: () => void;
}

const roleLabels: Record<RôleSystème, string> = {
  PROMOTEUR_ADMIN: 'Promoteur / Admin',
  PREFET_DIRECTEUR: 'Préfet / Directeur',
  DIRECTEUR_ETUDES: 'Directeur des Études',
  DIRECTEUR_DISCIPLINE: 'Dir. de Discipline',
  COMPTABLE: 'Comptable / Intendant',
  TITULAIRE: 'Titulaire de Classe',
  ENSEIGNANT: 'Enseignant',
  PARENT_ELEVE: 'Parent / Élève',
};

const roleOptions: SelectOption[] = [
  { value: 'PROMOTEUR_ADMIN', label: 'Promoteur / Admin Système', description: 'Accès complet & administration', badge: 'PRO' },
  { value: 'PREFET_DIRECTEUR', label: 'Préfet / Directeur', description: 'Direction pédagogique et administrative', badge: 'DIR' },
  { value: 'DIRECTEUR_ETUDES', label: 'Directeur des Études', description: 'Horaires, cotes et délibérations', badge: 'EDU' },
  { value: 'DIRECTEUR_DISCIPLINE', label: 'Dir. de Discipline', description: 'Suivi de la conduite et absences', badge: 'DISC' },
  { value: 'COMPTABLE', label: 'Comptable / Intendant', description: 'Frais scolaires, caisse et paie', badge: 'FIN' },
  { value: 'TITULAIRE', label: 'Titulaire de Classe', description: 'Gestion de la classe attribuée', badge: 'PED' },
  { value: 'ENSEIGNANT', label: 'Enseignant', description: 'Cahier de textes et notes', badge: 'ENS' },
  { value: 'PARENT_ELEVE', label: 'Parent / Élève', description: 'Consultation du portail famille', badge: 'PAR' },
];

function getYearBadge(statut: string): string | undefined {
  switch (statut) {
    case 'EN_COURS': return 'Active';
    case 'CLOTUREE': return 'Archive';
    case 'PLANIFIEE': return 'Futur';
    default: return undefined;
  }
}

const tabBreadcrumbs: Record<string, { label: string; icon: React.ElementType; category: string }> = {
  dashboard:   { label: 'Tableau de Bord Exécutif', icon: LayoutDashboard, category: 'Vue Générale' },
  students:    { label: 'Inscription & Admissions', icon: GraduationCap, category: 'Pédagogie' },
  apprenants:  { label: 'Dossier Apprenant', icon: Users, category: 'Pédagogie' },
  schedule:    { label: 'Horaire & Emplois du Temps', icon: Calendar, category: 'Pédagogie' },
  grades:      { label: 'Cote, Progression & Bulletins', icon: ClipboardCheck, category: 'Pédagogie' },
  examens:     { label: 'Examens & Évaluations EPST', icon: FileText, category: 'Pédagogie' },
  classes:     { label: 'Classe & Promotions', icon: School, category: 'Pédagogie' },
  subjects:    { label: 'Matières & Coefficients', icon: BookOpen, category: 'Pédagogie' },
  library:     { label: 'Bibliothèque & CDI', icon: BookOpen, category: 'Ressources' },
  years:       { label: 'Années Scolaires & Périodes', icon: Calendar, category: 'Administration' },
  invoices:    { label: 'Factures & Recouvrement Minerval', icon: Receipt, category: 'Finances' },
  payroll:     { label: 'Gestion Paie & Primes', icon: Banknote, category: 'Finances' },
  expenses:    { label: 'Gestion Caisse & Dépenses', icon: Wallet, category: 'Finances' },
  discipline:  { label: 'Discipline & Conduites', icon: Scale, category: 'Vie Scolaire' },
  teachers:    { label: 'Gestion Enseignants', icon: Users, category: 'Administration' },
  hr:          { label: 'Dossiers Personnel Scolaire', icon: UserCheck, category: 'Administration' },
  leaves:      { label: 'Congés & Absences', icon: CalendarDays, category: 'Administration' },
  documents:   { label: 'Documents Officiels EPST RDC', icon: FileText, category: 'Administration' },
  messages:    { label: 'Messagerie & Communications', icon: MessageSquare, category: 'Communication' },
  infirmerie:  { label: 'Santé & Infirmerie', icon: HeartPulse, category: 'Services' },
  cantine:     { label: 'Cantine & Garderie', icon: Utensils, category: 'Services' },
  ressources:  { label: 'Ressources Scolaires', icon: BookOpen, category: 'Ressources' },
  transport:   { label: 'Transport Scolaire', icon: Bus, category: 'Services' },
  license:     { label: 'Licence & Synchronisation Offline', icon: ShieldCheck, category: 'Système' },
  settings:    { label: 'Paramètres du Système', icon: Settings, category: 'Système' },
};

// CATEGORIES PRINCIPALES POUR LE MENU STRIP HAUT DE GRANDE CLASSE
const NAV_CATEGORIES = [
  { id: 'dashboard', label: 'Vue Générale', icon: LayoutDashboard, defaultTab: 'dashboard', tabs: ['dashboard'] },
  { id: 'pedagogie', label: 'Pédagogie', icon: GraduationCap, defaultTab: 'apprenants', tabs: ['students', 'apprenants', 'grades', 'classes', 'schedule', 'subjects', 'examens'] },
  { id: 'finances', label: 'Finances & Caisse', icon: Wallet, defaultTab: 'invoices', tabs: ['invoices', 'payroll', 'expenses'] },
  { id: 'admin', label: 'Administration & RH', icon: Briefcase, defaultTab: 'teachers', tabs: ['teachers', 'hr', 'leaves', 'documents', 'years'] },
  { id: 'services', label: 'Vie Scolaire & Services', icon: Layers, defaultTab: 'infirmerie', tabs: ['discipline', 'infirmerie', 'cantine', 'transport', 'ressources', 'library', 'messages'] },
];

export const Navbar: React.FC<NavbarProps> = ({
  userRole,
  setUserRole,
  activeSchoolYear = '2025–2026',
  setActiveSchoolYear,
  isOnline,
  setIsOnline,
  pendingQueueCount,
  onOpenOnboarding,
  activeTab = 'dashboard',
  onNavigate,
  isDarkMode,
  toggleTheme,
  isSidebarCollapsed,
  toggleSidebar,
  onLogout
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'finance' | 'system'>('all');
  const [yearOptions, setYearOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadYears = async () => {
      const years = await LocalDatabaseService.getSchoolYears();
      if (!isMounted) return;
      const options = years.map(y => ({
        value: y.nom,
        label: y.nom,
        description: `${y.debut} → ${y.fin}`,
        badge: getYearBadge(y.statut),
      }));
      setYearOptions(options);
      if (setActiveSchoolYear) {
        const found = options.find(o => o.value === activeSchoolYear);
        if (!found && options.length > 0) {
          const active = years.find(y => y.statut === 'EN_COURS')?.nom || years[0]?.nom;
          setActiveSchoolYear(active || '');
        }
      }
    };
    loadYears();
    const timer = setInterval(loadYears, 3000);
    return () => { isMounted = false; clearInterval(timer); };
  }, [activeSchoolYear, setActiveSchoolYear]);

  const currentTabInfo = tabBreadcrumbs[activeTab] || {
    label: 'Tableau de Bord',
    icon: LayoutDashboard,
    category: 'Vue Générale',
  };
  const CurrentIcon = currentTabInfo.icon;

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1200);
  };

  const notifications = [
    { id: '1', type: 'finance', text: '12 reçus de paiement FlexPay validés', time: 'Il y a 5 min', icon: Banknote, iconColor: '#10b981' },
    { id: '2', type: 'system', text: 'Exetat RDC : Inscriptions ouvertes', time: 'Il y a 20 min', icon: FileText, iconColor: '#6366f1' },
    { id: '3', type: 'system', text: 'Sauvegarde SQLite P2P réussie (0.4ms)', time: 'Il y a 1h', icon: CheckCircle2, iconColor: '#3b82f6' },
  ];

  const filteredNotifs = notifications.filter((n) => {
    if (notifFilter === 'finance') return n.type === 'finance';
    if (notifFilter === 'system') return n.type === 'system';
    return true;
  });

  return (
    <>
      <header
        className="px-4 py-2 border-b flex flex-col justify-center gap-2 shrink-0 relative z-30 transition-all duration-200"
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* LIGNE SUPÉRIEURE : OUTILS, RECHERCHE ET PROFIL */}
        <div className="flex items-center justify-between gap-4 w-full">
          {/* ===== SECTION GAUCHE: TOGGLE SIDEBAR + PROFIL MODULE COURANT ===== */}
          <div className="flex items-center gap-3 min-w-0">
            {toggleSidebar && (
              <button
                onClick={toggleSidebar}
                className="toolbar-btn shrink-0"
                title={isSidebarCollapsed ? 'Déplier le menu latéral' : 'Réduire le menu latéral'}
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Icone & Titre du module courant */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs"
                style={{
                  background: 'rgba(99,102,241,0.12)',
                  borderColor: 'rgba(99,102,241,0.25)',
                }}
              >
                <CurrentIcon className="w-4 h-4 text-indigo-500" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {currentTabInfo.category}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-400 opacity-50" />
                  <span className="text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hidden sm:inline flex items-center gap-1">
                    <HardDrive className="w-3 h-3 inline" /> LOCAL-FIRST
                  </span>
                </div>

                <h1
                  className="text-sm font-black tracking-tight truncate leading-none mt-0.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {currentTabInfo.label}
                </h1>
              </div>
            </div>

            {/* Selecteur Rapide d'Année Scolaire */}
            <div className="hidden lg:block ml-2 shrink-0">
              <CustomSelect
                options={yearOptions.length ? yearOptions : [{ value: '', label: 'Aucune année créée', description: 'Créez une année dans Administration > Années' }]}
                value={activeSchoolYear}
                onChange={(val) => setActiveSchoolYear && setActiveSchoolYear(val)}
                placeholder="Aucune année créée"
                icon={Calendar}
                className="w-44"
              />
            </div>
          </div>

          {/* ===== SECTION CENTRALE: RECHERCHE GLOBALE ===== */}
          <div className="hidden md:flex items-center justify-center max-w-xs xl:max-w-sm w-full mx-2">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-150 cursor-pointer group"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.35)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(99,102,241,0.07)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="truncate group-hover:text-indigo-500 transition-colors">
                  Rechercher un élève, reçu, classe...
                </span>
              </div>
              <kbd
                className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-black text-indigo-500"
                style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.18)' }}
              >
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          </div>

          {/* ===== SECTION DROITE: SYNCHRO, THÈME, NOTIFS & PROFIL ===== */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bascule Thème Clair / Sombre */}
            <button
              onClick={toggleTheme}
              className="toolbar-btn"
              title={isDarkMode ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
              )}
            </button>

            {/* Statut Local-First & Synchro */}
            <button
              onClick={() => {
                if (isOnline) handleSync();
                else setIsOnline(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 active:scale-95 cursor-pointer"
              style={{
                background: isOnline ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                borderColor: isOnline ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)',
                color: isOnline ? '#10b981' : '#f87171',
              }}
              title={isOnline ? 'Base SQLite locale synchronisée' : 'Mode Hors-Ligne'}
            >
              {isSyncing ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : isOnline ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <WifiOff className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isSyncing ? 'Synchro...' : isOnline ? 'SQLite WAL' : 'Hors-ligne'}
              </span>
            </button>

            {/* Centre de Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifMenu(!showNotifMenu);
                  setShowProfileMenu(false);
                }}
                className="toolbar-btn relative"
                title="Notifications Système"
              >
                <Bell className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                {notifications.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white text-[8px] font-black flex items-center justify-center"
                    style={{ background: '#ef4444', border: '1.5px solid var(--bg-surface)' }}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Popover Notifications */}
              {showNotifMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-scale-in"
                  style={{
                    background: 'var(--sidebar-popover-bg)',
                    borderColor: 'var(--sidebar-popover-border)',
                  }}
                >
                  <div
                    className="p-3.5 border-b flex items-center justify-between"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
                  >
                    <div>
                      <h3 className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>
                        Notifications Système
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {notifications.length} nouvelles mises à jour récents
                      </p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-500/10 max-h-72 overflow-y-auto">
                    {filteredNotifs.map((n) => {
                      const NotifIcon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 p-3 hover:bg-indigo-500/10 cursor-pointer transition-colors"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              borderColor: 'rgba(99,102,241,0.2)',
                            }}
                          >
                            <NotifIcon className="w-3.5 h-3.5" style={{ color: n.iconColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11.5px] font-extrabold leading-snug" style={{ color: 'var(--text-primary)' }}>
                              {n.text}
                            </p>
                            <p className="text-[9.5px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Menu Profil Utilisateur */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl border transition-all duration-150 hover:border-indigo-500/40 active:scale-95 shadow-xs cursor-pointer"
                style={{
                  background: 'var(--bg-sunken)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-xs">
                  P
                </div>
                <div className="text-left hidden md:block leading-tight">
                  <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                    Promoteur Racine
                  </p>
                  <p className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400">{roleLabels[userRole]}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Popover Profil & Actions */}
              {showProfileMenu && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 rounded-2xl border shadow-2xl z-50 overflow-hidden animate-scale-in"
                  style={{
                    background: 'var(--sidebar-popover-bg)',
                    borderColor: 'var(--sidebar-popover-border)',
                  }}
                >
                  <div
                    className="p-3.5 border-b space-y-2"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-xs">
                        P
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>
                          Promoteur Administrateur
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">admin@ecolisa.cd</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-500/10">
                      <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Changer de Rôle Système :
                      </label>
                      <CustomSelect
                        options={roleOptions}
                        value={userRole}
                        onChange={(val) => setUserRole(val as RôleSystème)}
                        icon={User}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="p-1.5 space-y-0.5 text-xs font-extrabold">
                    <button
                      onClick={() => {
                        onNavigate?.('settings');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-black hover:bg-slate-500/10 transition-all text-left cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Settings className="w-4 h-4 text-indigo-500" />
                      <span>Paramètres Système & Accès</span>
                    </button>

                    <button
                      onClick={() => {
                        onNavigate?.('license');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-black hover:bg-slate-500/10 transition-all text-left cursor-pointer"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Licence & Synchro Offline</span>
                    </button>

                    <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-black text-red-500 hover:bg-red-500/10 transition-all text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Verrouiller la Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* LIGNE INFÉRIEURE : BARRE DE NAVIGATION PRINCIPALE DES PÔLES (MENU STRIP DE GRANDE CLASSE) */}
        <div className="flex items-center gap-1 overflow-x-auto sidebar-scroll pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
          {NAV_CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            const isCatActive = cat.tabs.includes(activeTab);
            return (
              <button
                key={cat.id}
                onClick={() => onNavigate?.(cat.defaultTab)}
                className={`nav-strip-btn ${isCatActive ? 'active' : ''}`}
              >
                <CatIcon className={`w-3.5 h-3.5 shrink-0 ${isCatActive ? 'text-white' : 'text-indigo-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* OVERLAY FERMETURE MENUS */}
      {(showProfileMenu || showNotifMenu) && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => {
            setShowNotifMenu(false);
            setShowProfileMenu(false);
          }}
        />
      )}

      {/* PALETTE DE COMMANDES (CTRL+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          onNavigate?.(tab);
          setIsCommandPaletteOpen(false);
        }}
      />
    </>
  );
};
