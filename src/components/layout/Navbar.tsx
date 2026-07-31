import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { RôleSystème } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CommandPalette } from './CommandPalette';

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

const schoolYearOptions: SelectOption[] = [
  { value: '2025–2026', label: 'Année 2025–2026', description: 'Année Académique Active EPST', badge: 'Active' },
  { value: '2024–2025', label: 'Année 2024–2025', description: 'Archives Clôturées RDC', badge: 'Archive' },
  { value: '2026–2027', label: 'Année 2026–2027', description: 'Préparation et Inscriptions', badge: 'Futur' },
];

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
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'finance' | 'system'>('all');

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
        className="h-16 px-4 border-b flex items-center justify-between gap-4 shrink-0 relative z-30 transition-all duration-200"
        style={{
          background: 'var(--header-bg)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* ===== LEFT SECTION: TOGGLE SIDEBAR + BREADCRUMB & ACADEMIC YEAR SELECTOR ===== */}
        <div className="flex items-center gap-3 min-w-0">
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-150 hover:bg-slate-500/10 active:scale-95 cursor-pointer shadow-xs"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              title={isSidebarCollapsed ? 'Déplier le menu latéral (Sidebar)' : 'Réduire le menu latéral (Sidebar)'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-indigo-500" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
              )}
            </button>
          )}

          {/* Module Icon & Active View Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border shadow-xs"
              style={{
                background: 'rgba(99,102,241,0.12)',
                borderColor: 'rgba(99,102,241,0.25)',
              }}
            >
              <CurrentIcon className="w-4.5 h-4.5 text-indigo-500" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
                  {currentTabInfo.category}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-400 opacity-50" />
                <span className="text-[9.5px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest hidden sm:inline">
                  EPST RDC
                </span>
              </div>

              <h1
                className="text-sm font-black tracking-tight truncate leading-tight mt-0.5"
                style={{ color: 'var(--text-primary)' }}
              >
                {currentTabInfo.label}
              </h1>
            </div>
          </div>

          {/* Academic Year Quick Selector via CustomSelect */}
          <div className="hidden lg:block ml-2 shrink-0">
            <CustomSelect
              options={schoolYearOptions}
              value={activeSchoolYear}
              onChange={(val) => setActiveSchoolYear && setActiveSchoolYear(val)}
              icon={Calendar}
              className="w-44"
            />
          </div>
        </div>

        {/* ===== CENTER SECTION: GLOBAL COMMAND PALETTE SEARCH TRIGGER ===== */}
        <div className="hidden md:flex items-center justify-center max-w-xs xl:max-w-sm w-full mx-2">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 hover:border-indigo-500/40 active:scale-98 shadow-xs cursor-pointer group"
            style={{
              background: 'var(--bg-sunken)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="truncate group-hover:text-indigo-400 transition-colors">
                Rechercher un module, élève...
              </span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-500/15 border border-slate-500/20 text-[10px] font-mono font-bold text-indigo-400">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* ===== RIGHT SECTION: CONTROLS, SYNC, NOTIFICATIONS & PROFILE ===== */}
        <div className="flex items-center gap-2 shrink-0">


          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg border flex items-center justify-center transition-all duration-150 hover:bg-slate-500/10 active:scale-95 cursor-pointer shadow-xs"
            style={{
              background: 'var(--bg-sunken)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            title={isDarkMode ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 hover:-rotate-12" />
            )}
          </button>

          {/* Offline Sync Button */}
          <button
            onClick={() => {
              if (isOnline) handleSync();
              else setIsOnline(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-150 active:scale-95 shadow-xs cursor-pointer"
            style={{
              background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              borderColor: isOnline ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
              color: isOnline ? '#34d399' : '#f87171',
            }}
            title={isOnline ? 'Cliquer pour synchroniser avec le réseau local / Cloud' : 'Mode hors-ligne. Cliquer pour reconnecter.'}
          >
            {isSyncing ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
            ) : isOnline ? (
              <RefreshCw className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isSyncing ? 'Synchro...' : isOnline ? 'En ligne' : 'Hors-ligne'}
            </span>
            {pendingQueueCount > 0 && (
              <span className="w-4 h-4 rounded-full text-slate-900 bg-amber-400 text-[9px] flex items-center justify-center font-black">
                {pendingQueueCount}
              </span>
            )}
          </button>

          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowProfileMenu(false);
              }}
              className="w-9 h-9 rounded-lg border flex items-center justify-center relative transition-all duration-150 hover:bg-slate-500/10 active:scale-95 cursor-pointer shadow-xs"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              title="Centre de Notifications"
            >
              <Bell className="w-4 h-4 text-slate-400" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs border-2 border-white dark:border-slate-900">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border shadow-xl z-50 overflow-hidden animate-scale-in"
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
                    <h3 className="font-extrabold text-xs" style={{ color: 'var(--text-primary)' }}>
                      Notifications Système
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {notifications.length} nouvelles mises à jour récents
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        notifFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Toutes
                    </button>
                    <button
                      onClick={() => setNotifFilter('finance')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        notifFilter === 'finance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Finances
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-500/10 max-h-72 overflow-y-auto">
                  {filteredNotifs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Aucune notification dans cette catégorie.
                    </div>
                  ) : (
                    filteredNotifs.map((n) => {
                      const NotifIcon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 p-3 hover:bg-indigo-500/10 cursor-pointer transition-colors"
                        >
                          <div
                            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 border"
                            style={{
                              background: 'rgba(99,102,241,0.1)',
                              borderColor: 'rgba(99,102,241,0.2)',
                            }}
                          >
                            <NotifIcon className="w-3.5 h-3.5" style={{ color: n.iconColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11.5px] font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>
                              {n.text}
                            </p>
                            <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Role Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border transition-all duration-150 hover:border-indigo-500/40 active:scale-95 shadow-xs cursor-pointer"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-xs text-white shadow-xs">
                J
              </div>
              <div className="text-left hidden md:block leading-tight">
                <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                  Jean-Paul Mukendi
                </p>
                <p className="text-[9px] font-bold text-indigo-400">{roleLabels[userRole]}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile & Settings Popover */}
            {showProfileMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-xl z-50 overflow-hidden animate-scale-in"
                style={{
                  background: 'var(--sidebar-popover-bg)',
                  borderColor: 'var(--sidebar-popover-border)',
                }}
              >
                {/* Profile Header */}
                <div
                  className="p-3.5 border-b space-y-2"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center font-black text-white text-sm shadow-xs">
                      J
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>
                        Jean-Paul Mukendi
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">j.mukendi@ecolisa.cd</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                        Licence Enterprise RDC
                      </span>
                    </div>
                  </div>

                  {/* Role Selector via CustomSelect inside profile popover */}
                  <div className="pt-2 border-t border-slate-500/10">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">
                      Simuler un Rôle Utilisateur :
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

                {/* Quick Menu Actions */}
                <div className="p-1.5 space-y-0.5 text-xs">
                  <button
                    onClick={() => {
                      onNavigate?.('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold hover:bg-slate-500/10 transition-all text-left cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Settings className="w-4 h-4 text-indigo-400" />
                    <span>Paramètres Système & Accès</span>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate?.('license');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold hover:bg-slate-500/10 transition-all text-left cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Licence & Synchro Offline</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowHelpModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold hover:bg-slate-500/10 transition-all text-left cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <LifeBuoy className="w-4 h-4 text-amber-400" />
                    <span>Aide & Support Technique EPST</span>
                  </button>

                  <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />

                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold text-red-400 hover:bg-red-500/10 transition-all text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Verrouiller la Session</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Click Outside Overlay */}
        {(showProfileMenu || showNotifMenu) && (
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => {
              setShowNotifMenu(false);
              setShowProfileMenu(false);
            }}
          />
        )}
      </header>

      {/* ===== COMMAND PALETTE MODAL ===== */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => {
          onNavigate?.(tab);
          setIsCommandPaletteOpen(false);
        }}
      />

      {/* ===== HELP & EPST SUPPORT MODAL ===== */}
      {showHelpModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none"
            onClick={() => setShowHelpModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--sidebar-popover-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="p-4 border-b flex items-center justify-between"
                style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25">
                    <LifeBuoy className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                      Support Technique ECOLISA EPST
                    </h3>
                    <p className="text-[10.5px] text-slate-400">
                      Assistance officielle pour établissements scolaires RDC
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/20 space-y-1">
                  <p className="font-black text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Assistance & Maintenance 24/7
                  </p>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Notre équipe d'ingénieurs intervient sur site et à distance pour assurer le suivi de vos données scolaires et la synchronisation avec le ministère de l'EPST RDC.
                  </p>
                </div>

                <div className="space-y-2">
                  <div
                    className="p-3 rounded-lg border flex items-center justify-between"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                  >
                    <span className="font-bold">Hotline WhatsApp Support EPST :</span>
                    <span className="font-mono font-black text-emerald-400">+243 81 555 0192</span>
                  </div>
                  <div
                    className="p-3 rounded-lg border flex items-center justify-between"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                  >
                    <span className="font-bold">Email Support Technique :</span>
                    <span className="font-mono font-black text-indigo-400">support@ecolisa.cd</span>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t flex justify-end" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-black text-xs cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  Fermer l'Aide
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
