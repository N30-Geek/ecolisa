import React, { useState, useEffect } from 'react';
import {
  Home,
  Users,
  MessageSquare,
  Trophy,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  School,
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

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  isOnline,
  isCollapsed = false,
  setIsCollapsed,
  onLock,
}) => {
  // Mode Accordéon Stricte : une seule section ouverte à la fois.
  // Par défaut, aucune section ouverte (état masqué), sauf si activeTab est dans un sous-menu.
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Déterminer la section associée à un tab
  const getSectionForTab = (tab: string): string | null => {
    if (['apprenants', 'students', 'classes', 'grades', 'examens', 'schedule', 'subjects'].includes(tab)) {
      return 'pedagogie';
    }
    if (['invoices', 'payroll', 'expenses'].includes(tab)) {
      return 'finances';
    }
    if (['teachers', 'hr', 'leaves', 'documents', 'years'].includes(tab)) {
      return 'administration';
    }
    if (['discipline', 'infirmerie', 'cantine', 'transport', 'library'].includes(tab)) {
      return 'services';
    }
    return null;
  };

  // Mise à jour automatique de la section active lors du changement de tab
  useEffect(() => {
    const sec = getSectionForTab(activeTab);
    setExpandedSection(sec); // si sec === null, tous les accordéons se masquent !
  }, [activeTab]);

  // Bascule accordéon : ferme toutes les autres sections et toggle la section cliquée
  const handleSectionClick = (sectionKey: string) => {
    setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
  };

  const isPedagogieOpen = expandedSection === 'pedagogie';
  const isFinancesOpen = expandedSection === 'finances';
  const isAdminOpen = expandedSection === 'administration';
  const isServicesOpen = expandedSection === 'services';

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
      {/* ── HEADER : LOGO + TITRE ── */}
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

        {/* User Profile Avatar */}
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 cursor-pointer hover:ring-2 hover:ring-indigo-500/40 transition-all"
          title="Promoteur Racine"
        >
          P
        </div>
      </div>

      {/* ── NAVIGATION (ACCORDÉON EXCLUSIF / MASQUÉ PAR DÉFAUT) ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll">

        {/* 1. TABLEAU DE BORD */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800'
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
            onClick={() => handleSectionClick('pedagogie')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isPedagogieOpen
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className={`w-4.5 h-4.5 ${isPedagogieOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Pédagogie & Élèves</span>}
            </div>
            {!isCollapsed && (
              isPedagogieOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isPedagogieOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
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
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-100/80 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/50'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
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
            onClick={() => handleSectionClick('finances')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isFinancesOpen
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wallet className={`w-4.5 h-4.5 ${isFinancesOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Finances & Caisse</span>}
            </div>
            {!isCollapsed && (
              isFinancesOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isFinancesOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
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
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-100/80 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/50'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
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
            onClick={() => handleSectionClick('administration')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isAdminOpen
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4.5 h-4.5 ${isAdminOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Administration & RH</span>}
            </div>
            {!isCollapsed && (
              isAdminOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isAdminOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
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
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-100/80 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/50'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. MESSAGERIE */}
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
            onClick={() => handleSectionClick('services')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isServicesOpen
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trophy className={`w-4.5 h-4.5 ${isServicesOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Vie Scolaire & Services</span>}
            </div>
            {!isCollapsed && (
              isServicesOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isServicesOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
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
                    className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer text-left ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-100/80 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/50'
                        : 'text-slate-600 dark:text-slate-400 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
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

        {/* 8. LICENCE LOGICIEL */}
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

      {/* ── FOOTER: AIDE & DÉCONNEXION ── */}
      <div className="p-3 border-t shrink-0 space-y-1" style={{ borderColor: 'var(--sidebar-border)' }}>
        <button
          onClick={() => setActiveTab('settings')}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
        >
          <HelpCircle className="w-4.5 h-4.5 text-slate-400" />
          {!isCollapsed && <span>Aide Rapide & Support</span>}
        </button>

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
