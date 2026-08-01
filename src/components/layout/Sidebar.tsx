import React, { useState, useEffect, useRef } from 'react';
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

interface SubMenuItem {
  id: string;
  label: string;
  badge?: string;
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
  // Mode Accordéon Stricte pour le mode étendu
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Popover actif en mode compact (collapsed)
  const [hoveredPopover, setHoveredPopover] = useState<string | null>(null);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    const sec = getSectionForTab(activeTab);
    setExpandedSection(sec);
  }, [activeTab]);

  const handleSectionClick = (sectionKey: string) => {
    if (isCollapsed) {
      // En mode compact, basculer le popover
      setHoveredPopover((prev) => (prev === sectionKey ? null : sectionKey));
    } else {
      // En mode étendu, basculer l'accordéon exclusif
      setExpandedSection((prev) => (prev === sectionKey ? null : sectionKey));
    }
  };

  const handleMouseEnterSection = (sectionKey: string) => {
    if (isCollapsed) {
      if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
      setHoveredPopover(sectionKey);
    }
  };

  const handleMouseLeaveSection = () => {
    if (isCollapsed) {
      popoverTimeoutRef.current = setTimeout(() => {
        setHoveredPopover(null);
      }, 200);
    }
  };

  const handlePopoverMouseEnter = () => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
  };

  const selectSubTab = (tabId: string) => {
    setActiveTab(tabId);
    setHoveredPopover(null);
  };

  const isPedagogieOpen = expandedSection === 'pedagogie';
  const isFinancesOpen = expandedSection === 'finances';
  const isAdminOpen = expandedSection === 'administration';
  const isServicesOpen = expandedSection === 'services';

  // Données des sous-menus
  const pedagogieItems: SubMenuItem[] = [
    { id: 'apprenants', label: 'Dossiers Apprenants' },
    { id: 'students', label: 'Inscriptions & Admissions' },
    { id: 'classes', label: 'Classes & Promotions' },
    { id: 'grades', label: 'Cotes & Bulletins' },
    { id: 'examens', label: 'Examens EPST', badge: 'EXETAT' },
    { id: 'schedule', label: 'Emplois du Temps' },
    { id: 'subjects', label: 'Matières & Coefficients' },
  ];

  const financesItems: SubMenuItem[] = [
    { id: 'invoices', label: 'Factures & Minerval' },
    { id: 'payroll', label: 'Gestion Paie & Primes' },
    { id: 'expenses', label: 'Caisse & Dépenses' },
  ];

  const adminItems: SubMenuItem[] = [
    { id: 'teachers', label: 'Gestion des Enseignants' },
    { id: 'hr', label: 'Dossiers Personnel' },
    { id: 'leaves', label: 'Congés & Absences' },
    { id: 'documents', label: 'Documents EPST RDC' },
    { id: 'years', label: 'Années Scolaires' },
  ];

  const servicesItems: SubMenuItem[] = [
    { id: 'discipline', label: 'Discipline & Conduite' },
    { id: 'infirmerie', label: 'Infirmerie & Santé' },
    { id: 'cantine', label: 'Cantine & Garderie' },
    { id: 'transport', label: 'Transport Scolaire' },
    { id: 'library', label: 'Bibliothèque & CDI' },
  ];

  // Composant Rendu Popover Flottant (Flyout Menu pour Mode Compact)
  const renderFlyoutPopover = (title: string, items: SubMenuItem[], icon: React.ElementType) => {
    const IconComp = icon;
    return (
      <div
        onMouseEnter={handlePopoverMouseEnter}
        onMouseLeave={handleMouseLeaveSection}
        className="absolute left-full top-0 ml-2.5 w-60 rounded-2xl border shadow-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 z-50 p-2 space-y-1 animate-scale-in"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs">
          <IconComp className="w-4 h-4 shrink-0" />
          <span>{title}</span>
        </div>
        <div className="py-1 space-y-0.5 max-h-72 overflow-y-auto sidebar-scroll">
          {items.map((sub) => {
            const isActive = activeTab === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => selectSubTab(sub.id)}
                className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs transition-all cursor-pointer text-left ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 font-black bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/50'
                    : 'text-slate-700 dark:text-slate-300 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
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
      </div>
    );
  };

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
      {/* ── HEADER : LOGO DE L'APPLICATION ET NOM SEULEMENT (PROFIL RETIRÉ) ── */}
      <div className="px-4 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
            <School className="w-5.5 h-5.5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 leading-tight">
              <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                ECOLISA <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">ERP</span>
              </h1>
              <p className="text-[9.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                Éducation RDC
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── NAVIGATION (ACCORDÉON EN ÉTENDU / POPOVER EN COMPACT) ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll">

        {/* 1. TABLEAU DE BORD */}
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title={isCollapsed ? 'Tableau de Bord' : undefined}
        >
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Home className={`w-4.5 h-4.5 ${activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
            {!isCollapsed && <span>Tableau de Bord</span>}
          </div>
        </button>

        {/* 2. ACCORDEON / POPOVER: PÉDAGOGIE & ÉLÈVES */}
        <div
          className="relative"
          onMouseEnter={() => handleMouseEnterSection('pedagogie')}
          onMouseLeave={handleMouseLeaveSection}
        >
          <button
            onClick={() => handleSectionClick('pedagogie')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isPedagogieOpen || (isCollapsed && hoveredPopover === 'pedagogie')
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title={isCollapsed ? 'Pédagogie & Élèves' : undefined}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className={`w-4.5 h-4.5 ${isPedagogieOpen || (isCollapsed && hoveredPopover === 'pedagogie') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Pédagogie & Élèves</span>}
            </div>
            {!isCollapsed && (
              isPedagogieOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Mode étendu : accordéon vertical */}
          {!isCollapsed && isPedagogieOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
              {pedagogieItems.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubTab(sub.id)}
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

          {/* Mode compact : popover flottant à droite */}
          {isCollapsed && hoveredPopover === 'pedagogie' && renderFlyoutPopover('Pédagogie & Élèves', pedagogieItems, GraduationCap)}
        </div>

        {/* 3. ACCORDEON / POPOVER: FINANCES & CAISSE */}
        <div
          className="relative"
          onMouseEnter={() => handleMouseEnterSection('finances')}
          onMouseLeave={handleMouseLeaveSection}
        >
          <button
            onClick={() => handleSectionClick('finances')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isFinancesOpen || (isCollapsed && hoveredPopover === 'finances')
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title={isCollapsed ? 'Finances & Caisse' : undefined}
          >
            <div className="flex items-center gap-3">
              <Wallet className={`w-4.5 h-4.5 ${isFinancesOpen || (isCollapsed && hoveredPopover === 'finances') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Finances & Caisse</span>}
            </div>
            {!isCollapsed && (
              isFinancesOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isFinancesOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
              {financesItems.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubTab(sub.id)}
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

          {isCollapsed && hoveredPopover === 'finances' && renderFlyoutPopover('Finances & Caisse', financesItems, Wallet)}
        </div>

        {/* 4. ACCORDEON / POPOVER: ADMINISTRATION & RH */}
        <div
          className="relative"
          onMouseEnter={() => handleMouseEnterSection('administration')}
          onMouseLeave={handleMouseLeaveSection}
        >
          <button
            onClick={() => handleSectionClick('administration')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isAdminOpen || (isCollapsed && hoveredPopover === 'administration')
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title={isCollapsed ? 'Administration & RH' : undefined}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-4.5 h-4.5 ${isAdminOpen || (isCollapsed && hoveredPopover === 'administration') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Administration & RH</span>}
            </div>
            {!isCollapsed && (
              isAdminOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isAdminOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
              {adminItems.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubTab(sub.id)}
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

          {isCollapsed && hoveredPopover === 'administration' && renderFlyoutPopover('Administration & RH', adminItems, Users)}
        </div>

        {/* 5. MESSAGERIE */}
        <button
          onClick={() => setActiveTab('messages')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
            activeTab === 'messages'
              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black border border-indigo-200 dark:border-indigo-800'
              : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title={isCollapsed ? 'Messagerie & SMS (12)' : undefined}
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

        {/* 6. ACCORDEON / POPOVER: VIE SCOLAIRE & SERVICES */}
        <div
          className="relative"
          onMouseEnter={() => handleMouseEnterSection('services')}
          onMouseLeave={handleMouseLeaveSection}
        >
          <button
            onClick={() => handleSectionClick('services')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              isServicesOpen || (isCollapsed && hoveredPopover === 'services')
                ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
            title={isCollapsed ? 'Vie Scolaire & Services' : undefined}
          >
            <div className="flex items-center gap-3">
              <Trophy className={`w-4.5 h-4.5 ${isServicesOpen || (isCollapsed && hoveredPopover === 'services') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span>Vie Scolaire & Services</span>}
            </div>
            {!isCollapsed && (
              isServicesOpen ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {!isCollapsed && isServicesOpen && (
            <div className="pl-6 ml-5 my-1 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-1 animate-fade-in">
              {servicesItems.map((sub) => {
                const isActive = activeTab === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => selectSubTab(sub.id)}
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

          {isCollapsed && hoveredPopover === 'services' && renderFlyoutPopover('Vie Scolaire & Services', servicesItems, Trophy)}
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
          title={isCollapsed ? 'Paramètres Système' : undefined}
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
          title={isCollapsed ? 'Licence & Mode Offline' : undefined}
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
          title={isCollapsed ? 'Aide Rapide & Support' : undefined}
        >
          <HelpCircle className="w-4.5 h-4.5 text-slate-400" />
          {!isCollapsed && <span>Aide Rapide & Support</span>}
        </button>

        <button
          onClick={() => {
            if (onLock) onLock();
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-black text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
          title={isCollapsed ? 'Déconnexion / Verrouiller' : undefined}
        >
          <LogOut className="w-4.5 h-4.5 text-red-500" />
          {!isCollapsed && <span>Déconnexion / Verrouiller</span>}
        </button>
      </div>
    </aside>
  );
};
