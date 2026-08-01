import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  BarChart2,
  LayoutGrid,
  ArrowLeftRight,
  Receipt,
  Users,
  MessageSquare,
  Trophy,
  Calendar,
  Wallet,
  GitBranch,
  FileText,
  Archive,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileCheck,
  Layers,
  Library,
  Briefcase,
  UserCheck,
  Lock,
  Heart,
  Utensils,
  Bus,
  School,
  Sparkles,
  Search,
  HardDrive
} from 'lucide-react';
import { RôleSystème } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: RôleSystème;
  isOnline: boolean;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenRegistration?: () => void;
  onLock?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number | string;
  badgeColor?: string;
  children?: { id: string; label: string; badge?: string }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  isOnline,
  isCollapsed = false,
  setIsCollapsed,
  onLock,
}) => {
  // Navigation Groups modeled after the clean, modern accordion UI in the inspiration image
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pedagogie: true,
    finances: false,
    administration: false,
    services: false,
  });

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Auto-expand section if activeTab is inside it
  useEffect(() => {
    const pedagogieTabs = ['apprenants', 'students', 'classes', 'grades', 'examens', 'schedule', 'subjects'];
    const financesTabs = ['invoices', 'payroll', 'expenses'];
    const adminTabs = ['teachers', 'hr', 'leaves', 'documents', 'years'];
    const servicesTabs = ['discipline', 'messages', 'infirmerie', 'cantine', 'transport', 'library'];

    if (pedagogieTabs.includes(activeTab)) setOpenSections((p) => ({ ...p, pedagogie: true }));
    if (financesTabs.includes(activeTab)) setOpenSections((p) => ({ ...p, finances: true }));
    if (adminTabs.includes(activeTab)) setOpenSections((p) => ({ ...p, administration: true }));
    if (servicesTabs.includes(activeTab)) setOpenSections((p) => ({ ...p, services: true }));
  }, [activeTab]);

  const roleBadgeLabel = userRole === 'PROMOTEUR_ADMIN' ? 'Promoteur' : 'Utilisateur';

  return (
    <aside
      className={`h-full flex flex-col select-none shrink-0 transition-all duration-300 relative border-r shadow-xs ${
        isCollapsed ? 'w-[74px] overflow-visible' : 'w-[270px] overflow-hidden'
      }`}
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {/* ── HEADER : LOGO + TITRE + PROFILE AVATAR ── */}
      <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                ECOLISA <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full">ERP</span>
              </h1>
              <p className="text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Éducation RDC
              </p>
            </div>
          )}
        </div>

        {/* User Profile Circle Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all"
          title="Promoteur Racine (Connecté)"
        >
          P
        </div>
      </div>

      {/* ── CORPS DU MENU DE NAVIGATION (PIXEL PERFECT REF IMAGE) ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll">
        {/* 1. HOME / TABLEAU DE BORD */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black shadow-2xs border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Home className={`w-4.5 h-4.5 ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Tableau de Bord</span>}
          </div>
        </button>

        {/* 2. ACCORDEON: PÉDAGOGIE & ÉLÈVES */}
        <div>
          <button
            onClick={() => toggleSection('pedagogie')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              openSections.pedagogie
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className={`w-4.5 h-4.5 ${openSections.pedagogie ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Pédagogie & Élèves</span>}
            </div>
            {!isCollapsed && (
              openSections.pedagogie ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* ARBRE D'OPTIONS SOUS-CATEGORIES AVEC LIGNE VERTICALE (CONNECTEUR BRANCHE) */}
          {!isCollapsed && openSections.pedagogie && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
              {[
                { id: 'apprenants', label: 'Dossiers Apprenants' },
                { id: 'students', label: 'Inscriptions & Admissions' },
                { id: 'classes', label: 'Classes & Promotions' },
                { id: 'grades', label: 'Cotes & Bulletins' },
                { id: 'examens', label: 'Examens EPST', badge: 'EXETAT' },
                { id: 'schedule', label: 'Emplois du Temps' },
                { id: 'subjects', label: 'Matières & Coefficients' },
              ].map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveTab(sub.id)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                    {sub.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {sub.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. ACCORDEON: FINANCES & CAISSE */}
        <div>
          <button
            onClick={() => toggleSection('finances')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              openSections.finances
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className={`w-4.5 h-4.5 ${openSections.finances ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Finances & Caisse</span>}
            </div>
            {!isCollapsed && (
              openSections.finances ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && openSections.finances && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
              {[
                { id: 'invoices', label: 'Factures & Minerval' },
                { id: 'payroll', label: 'Gestion Paie & Primes' },
                { id: 'expenses', label: 'Caisse & Dépenses' },
              ].map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveTab(sub.id)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. ACCORDEON: ADMINISTRATION & RH */}
        <div>
          <button
            onClick={() => toggleSection('administration')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              openSections.administration
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4.5 h-4.5 ${openSections.administration ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Administration & RH</span>}
            </div>
            {!isCollapsed && (
              openSections.administration ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && openSections.administration && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
              {[
                { id: 'teachers', label: 'Gestion des Enseignants' },
                { id: 'hr', label: 'Dossiers Personnel' },
                { id: 'leaves', label: 'Congés & Absences' },
                { id: 'documents', label: 'Documents EPST RDC' },
                { id: 'years', label: 'Années Scolaires' },
              ].map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveTab(sub.id)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. MESSAGERIE (AVEC PILULE BADGE 12 COMME DANS L'IMAGE) */}
        <button
          onClick={() => setActiveTab('messages')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'messages'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <MessageSquare className={`w-4.5 h-4.5 ${activeTab === 'messages' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Messagerie & SMS</span>}
          </div>
          {!isCollapsed && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white shadow-2xs">
              12
            </span>
          )}
        </button>

        {/* 6. ACCORDEON: VIE SCOLAIRE & SERVICES */}
        <div>
          <button
            onClick={() => toggleSection('services')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              openSections.services
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trophy className={`w-4.5 h-4.5 ${openSections.services ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Vie Scolaire & Services</span>}
            </div>
            {!isCollapsed && (
              openSections.services ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && openSections.services && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-slate-200 dark:border-slate-800 space-y-1">
              {[
                { id: 'discipline', label: 'Discipline & Conduite' },
                { id: 'infirmerie', label: 'Infirmerie & Santé' },
                { id: 'cantine', label: 'Cantine & Garderie' },
                { id: 'transport', label: 'Transport Scolaire' },
                { id: 'library', label: 'Bibliothèque & CDI' },
              ].map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveTab(sub.id)}
                    className={`w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50/50 dark:bg-indigo-950/40'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SÉPARATEUR DE SECTION */}
        <div className="my-2 border-t border-slate-200 dark:border-slate-800/80" />

        {/* 7. PARAMÈTRES SYSTÈME */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Settings className={`w-4.5 h-4.5 ${activeTab === 'settings' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Paramètres Système</span>}
          </div>
        </button>

        {/* 8. LICENCE LOGICIEL & HORS-LIGNE */}
        <button
          onClick={() => setActiveTab('license')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'license'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <HardDrive className={`w-4.5 h-4.5 ${activeTab === 'license' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Licence & Mode Offline</span>}
          </div>
        </button>
      </nav>

      {/* ── FOOTER: QUICK HELP & SIGN OUT (EXACTEMENT COMME DANS L'IMAGE DE RÉFÉRENCE) ── */}
      <div className="p-3 border-t shrink-0 space-y-1" style={{ borderColor: 'var(--sidebar-border)' }}>
        {/* Quick Help */}
        <button
          onClick={() => setActiveTab('settings')}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
        >
          <HelpCircle className="w-4.5 h-4.5 text-slate-400" />
          {!isCollapsed && <span>Aide Rapide & Support</span>}
        </button>

        {/* Sign Out (Rouge distinct comme dans la maquette du designer) */}
        <button
          onClick={() => {
            if (onLock) onLock();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-black text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5 text-red-500" />
          {!isCollapsed && <span>Déconnexion / Verrouiller</span>}
        </button>
      </div>
    </aside>
  );
};
