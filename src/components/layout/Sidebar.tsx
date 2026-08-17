import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Award,
  BookOpen,
  Calendar,
  Banknote,
  PieChart,
  TrendingUp,
  UserCog,
  CalendarOff,
  FileText,
  History,
  HeartPulse,
  Utensils,
  Bus,
  BookMarked,
  Building2,
  CheckCircle2,
  XCircle,
  Sliders,
  Clock,
} from 'lucide-react';
import { RôleSystème } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { hasTabAccess } from '../../utils/permissions';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: RôleSystème;
  isOnline: boolean;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onLock?: () => void;
  onOpenAccountSwitcher?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
}

interface SectionCategory {
  key: string;
  title: string;
  icon: React.ElementType;
  items: SubMenuItem[];
  addAction?: { tab: string; tooltip: string };
}

interface PopoverState {
  key: string;
  top: number;
  left: number;
}

const roleLabelMap: Record<string, string> = {
  PROMOTEUR_ADMIN: 'Promoteur / Admin',
  PREFET_DIRECTEUR: 'Préfet / Directeur',
  DIRECTEUR_ETUDES: 'Directeur des Études',
  DIRECTEUR_DISCIPLINE: 'Dir. Discipline',
  COMPTABLE: 'Comptable Général',
  TITULAIRE: 'Enseignant Titulaire',
  ENSEIGNANT: 'Professeur / Enseignant',
  PARENT_ELEVE: 'Parent d\'Élève',
};

const FlyoutPortal: React.FC<{
  popover: PopoverState;
  title: string;
  items: SubMenuItem[];
  icon: React.ElementType;
  activeTab: string;
  onSelect: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ popover, title, items, icon: IconComp, activeTab, onSelect, onMouseEnter, onMouseLeave }) => {
  return ReactDOM.createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="rounded-2xl border p-2.5 space-y-1 animate-scale-in select-none"
      style={{
        position: 'fixed',
        top: popover.top,
        left: popover.left,
        zIndex: 99999,
        width: 260,
        background: 'var(--sidebar-popover-bg, rgba(15, 23, 42, 0.96))',
        borderColor: 'var(--sidebar-popover-border, rgba(255, 255, 255, 0.1))',
        boxShadow: 'var(--elevation-4)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="px-3 py-2 flex items-center gap-2.5 mb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/15 text-indigo-500 border border-indigo-500/25">
          <IconComp className="w-4 h-4" />
        </div>
        <span className="font-black text-xs tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>
      <div className="py-0.5 space-y-1 max-h-80 overflow-y-auto sidebar-scroll">
        {items.map((sub) => {
          const isActive = activeTab === sub.id;
          const SubIcon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onSelect(sub.id)}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs transition-all duration-200 cursor-pointer text-left relative group ${
                isActive
                  ? 'font-black bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500'
                  : 'font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/12 hover:text-indigo-600 dark:hover:text-indigo-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <SubIcon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                <span className="truncate">{sub.label}</span>
              </div>
              {sub.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black shrink-0 ${
                    isActive
                      ? 'bg-white/25 text-white border border-white/35'
                      : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {sub.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  isOnline,
  isCollapsed = false,
  setIsCollapsed,
  onLock,
  onOpenAccountSwitcher,
}) => {
  const { config } = useSchoolConfig();
  const [activePopover, setActivePopover] = useState<PopoverState | null>(null);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  const [counts, setCounts] = useState<{ eleves: number; teachers: number; yearName: string; unpaidInvoices: number }>({
    eleves: 0,
    teachers: 0,
    yearName: '2025–2026',
    unpaidInvoices: 0,
  });

  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      const [eleves, staff, years, invoices] = await Promise.all([
        LocalDatabaseService.getEleves().catch(() => []),
        LocalDatabaseService.getStaff().catch(() => []),
        LocalDatabaseService.getSchoolYears().catch(() => []),
        LocalDatabaseService.getInvoices().catch(() => []),
      ]);
      if (!isMounted) return;
      const activeY = years.find(y => y.statut === 'EN_COURS') || years[0];
      const unpaid = invoices.filter(i => i.statut !== 'PAYE').length;
      setCounts({
        eleves: eleves.length,
        teachers: staff.filter(s => s.role === 'ENSEIGNANT').length,
        yearName: activeY?.nom || '2025–2026',
        unpaidInvoices: unpaid,
      });
    };
    loadCounts();
    return () => { isMounted = false; };
  }, [activeTab]);

  const getSectionForTab = (tab: string): string | null => {
    if (['apprenants', 'students', 'classes', 'grades', 'examens', 'schedule', 'subjects'].includes(tab)) return 'pedagogie';
    if (['invoices', 'cash', 'payroll', 'fees', 'accounting', 'reports', 'expenses', 'analytics'].includes(tab)) return 'finances';
    if (['teachers', 'hr', 'leaves', 'documents', 'years'].includes(tab)) return 'administration';
    if (['discipline', 'infirmerie', 'cantine', 'transport', 'library'].includes(tab)) return 'services';
    if (['users', 'audit', 'license', 'settings'].includes(tab)) return 'system';
    return null;
  };

  useEffect(() => {
    if (!isCollapsed) setActivePopover(null);
  }, [isCollapsed]);

  const openPopover = useCallback((key: string) => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
    const el = sectionRefs.current[key];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setActivePopover({ key, top: rect.top, left: rect.right + 8 });
  }, []);

  const closePopover = useCallback((immediate = false) => {
    if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
    if (immediate) {
      setActivePopover(null);
    } else {
      popoverTimeoutRef.current = setTimeout(() => setActivePopover(null), 180);
    }
  }, []);

  const handleSectionClick = (sectionKey: string) => {
    if (isCollapsed) {
      if (activePopover?.key === sectionKey) closePopover(true);
      else openPopover(sectionKey);
    } else {
      setExpandedSection(prev => (prev === sectionKey ? null : sectionKey));
    }
  };

  const handleMouseEnterSection = (sectionKey: string) => {
    if (isCollapsed) openPopover(sectionKey);
  };

  const handleMouseLeaveSection = () => {
    if (isCollapsed) closePopover();
  };

  const selectSubTab = (tabId: string) => {
    setActiveTab(tabId);
    closePopover(true);
  };

  const activeSection = getSectionForTab(activeTab);

  useEffect(() => {
    setExpandedSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const pedagogieItems: SubMenuItem[] = [
    { id: 'students',   label: 'Dossiers Élèves (RDC)', icon: UserCheck, badge: counts.eleves > 0 ? counts.eleves : undefined },
    { id: 'classes',    label: 'Classes & Promotions', icon: School },
    { id: 'grades',     label: 'Cotes & Bulletins', icon: Award },
    { id: 'examens',    label: 'Évaluations & Examens', icon: Sparkles },
    { id: 'schedule',   label: 'Emplois du Temps', icon: Calendar },
    { id: 'subjects',   label: 'Matières & Coefficients', icon: BookOpen },
  ];

  const financesItems: SubMenuItem[] = [
    { id: 'invoices',   label: 'Factures & Recouvrement', icon: CreditCard, badge: counts.unpaidInvoices > 0 ? counts.unpaidInvoices : undefined, badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' },
    { id: 'cash',       label: 'Caisse & Dépenses',       icon: Wallet },
    { id: 'payroll',    label: 'Paie & Primes',           icon: Banknote },
    { id: 'fees',       label: 'Frais Scolaires',         icon: PieChart },
    { id: 'analytics',  label: 'Analytique Financière',  icon: TrendingUp },
    { id: 'accounting', label: 'Comptabilité',            icon: FileText },
    { id: 'reports',    label: 'Rapports Financiers',     icon: TrendingUp },
  ];

  const adminItems: SubMenuItem[] = [
    { id: 'teachers',  label: 'Gestion Enseignants',      icon: UserCog, badge: counts.teachers > 0 ? counts.teachers : undefined },
    { id: 'hr',        label: 'Dossiers Personnel Admin', icon: Users },
    { id: 'leaves',    label: 'Congés & Absences',        icon: CalendarOff },
    { id: 'documents', label: 'Documents EPST RDC',       icon: FileText },
    { id: 'years',     label: 'Années Scolaires',         icon: History },
  ];

  const servicesItems: SubMenuItem[] = [
    { id: 'discipline',  label: 'Discipline & Conduite', icon: ShieldCheck },
    { id: 'infirmerie',  label: 'Infirmerie & Santé', icon: HeartPulse },
    { id: 'cantine',     label: 'Cantine & Garderie', icon: Utensils },
    { id: 'transport',   label: 'Transport Scolaire', icon: Bus },
    { id: 'library',     label: 'Bibliothèque & CDI', icon: BookMarked },
  ];

  const systemItems: SubMenuItem[] = [
    { id: 'users',     label: 'Comptes Utilisateurs',     icon: Lock },
    { id: 'audit',     label: 'Journal d\'Audit',         icon: Sliders },
    { id: 'license',   label: 'Licence & Synchronisation', icon: ShieldCheck },
    { id: 'settings',  label: 'Paramètres Établissement', icon: Settings },
  ];

  const sections: SectionCategory[] = [
    {
      key: 'pedagogie',
      title: 'Pédagogie & Élèves',
      icon: GraduationCap,
      items: pedagogieItems,
      addAction: { tab: 'students', tooltip: 'Inscrire un élève' },
    },
    {
      key: 'finances',
      title: 'Finances & Caisse',
      icon: Wallet,
      items: financesItems,
      addAction: { tab: 'invoices', tooltip: 'Nouvelle Facture' },
    },
    {
      key: 'administration',
      title: 'Administration & RH',
      icon: Users,
      items: adminItems,
    },
    {
      key: 'services',
      title: 'Vie Scolaire & Services',
      icon: Trophy,
      items: servicesItems,
    },
    {
      key: 'system',
      title: 'Système & Sécurité',
      icon: Settings,
      items: systemItems,
    },
  ];

  const visibleSections = useMemo(() => {
    return sections
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => hasTabAccess(userRole, item.id)),
      }))
      .filter(sec => sec.items.length > 0);
  }, [userRole, counts]);

  const schoolName = config?.schoolName || 'ECOLISA';

  return (
    <>
      <aside
        className={`h-full flex flex-col select-none shrink-0 transition-all duration-300 relative border-r z-30 ${
          isCollapsed ? 'w-[74px]' : 'w-[280px]'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        {/* HEADER BRAND & LIVE CLOCK CAPSULE */}
        <div
          className="border-b shrink-0 relative p-3"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="w-14 h-14 flex items-center justify-center overflow-hidden transition-transform hover:scale-105">
                {config?.logoUrl ? (
                  <img src={config.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <School className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/30" />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-3 py-1">
              {/* Full-Width Clean Logo Presentation (No border, No background, No shadow) */}
              <div className="relative w-full h-48 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                {config?.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt={schoolName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <School className="w-24 h-24 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>

              {/* Establishment Identity & Academic Year */}
              <div className="space-y-1 w-full px-1">
                <h1
                  className="font-black text-sm tracking-tight leading-tight line-clamp-2 px-1"
                  style={{ color: 'var(--text-primary)' }}
                  title={schoolName}
                >
                  {schoolName}
                </h1>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {counts.yearName}
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-400">· RDC</span>
                </div>
              </div>

              {/* Real-time Material Capsule */}
              <div
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border bg-slate-500/5 shadow-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{formattedDate}</span>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight">
                  {currentTime}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION LIST */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-2.5 sidebar-scroll">
          {/* DASHBOARD LINK (Pinned top) */}
          <div>
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                Vue Exécutive
              </div>
            )}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-xs transition-all duration-200 cursor-pointer text-left relative group ${
                activeTab === 'dashboard'
                  ? 'font-black bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 border border-transparent'
              } ${isCollapsed ? 'justify-center py-3 px-0' : ''}`}
              title={isCollapsed ? 'Tableau de Bord' : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Home className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                {!isCollapsed && <span className="truncate">Tableau de Bord</span>}
              </div>
              {!isCollapsed && activeTab === 'dashboard' && (
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              )}
            </button>
          </div>

          {/* GROUPED CATEGORIES */}
          {visibleSections.map((section) => {
            const SectionIcon = section.icon;
            const isSectionActive = activeSection === section.key;
            const isExpanded = expandedSection === section.key;

            if (isCollapsed) {
              return (
                <div
                  key={section.key}
                  className="relative"
                  ref={(el) => { sectionRefs.current[section.key] = el; }}
                  onMouseEnter={() => handleMouseEnterSection(section.key)}
                  onMouseLeave={handleMouseLeaveSection}
                >
                  <button
                    onClick={() => handleSectionClick(section.key)}
                    className={`w-full flex items-center justify-center py-3 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                      isSectionActive || activePopover?.key === section.key
                        ? 'bg-indigo-600/20 text-indigo-500 border border-indigo-500/40 shadow-xs'
                        : 'text-slate-400 hover:bg-slate-500/10 hover:text-indigo-500 border border-transparent'
                    }`}
                    title={section.title}
                  >
                    <SectionIcon className={`w-5 h-5 shrink-0 ${isSectionActive || activePopover?.key === section.key ? 'text-indigo-500' : 'text-slate-400'}`} />
                  </button>
                </div>
              );
            }

            return (
              <div
                key={section.key}
                className={`rounded-2xl p-1.5 transition-all duration-200 border ${
                  isSectionActive
                    ? 'bg-indigo-500/6 border-indigo-500/20 shadow-xs'
                    : 'border-transparent hover:border-slate-500/15'
                }`}
              >
                {/* Group Header */}
                <button
                  onClick={() => handleSectionClick(section.key)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left cursor-pointer group/header transition-all duration-200 ${
                    isSectionActive
                      ? 'text-indigo-600 dark:text-indigo-400 font-black'
                      : 'text-slate-600 dark:text-slate-300 font-extrabold hover:text-indigo-500 hover:bg-slate-500/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <SectionIcon className={`w-4 h-4 shrink-0 transition-transform group-hover/header:scale-110 ${
                      isSectionActive ? 'text-indigo-500' : 'text-slate-400 group-hover/header:text-indigo-500'
                    }`} />
                    <span className="text-[11px] uppercase tracking-wider truncate">
                      {section.title}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-slate-400'}`} />
                </button>

                {/* Submenu items list */}
                {isExpanded && (
                  <div className="mt-1 space-y-0.5 pl-1">
                    {section.items.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => selectSubTab(sub.id)}
                          className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs transition-all duration-200 cursor-pointer text-left relative group ${
                            isActive
                              ? 'font-black bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-sm shadow-indigo-600/30 border border-indigo-400/40'
                              : 'font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-300 border border-transparent hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <SubIcon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                            <span className="truncate">{sub.label}</span>
                          </div>
                          {sub.badge !== undefined && (
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black shrink-0 border ${
                                sub.badgeColor
                                  ? sub.badgeColor
                                  : isActive
                                    ? 'bg-white/20 text-white border-white/30'
                                    : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/25'
                              }`}
                            >
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* FOOTER : SETTINGS, LOCK & USER PROFILE */}
        <div
          className="p-3 border-t shrink-0 flex flex-col gap-2"
          style={{ borderColor: 'var(--sidebar-border)', background: 'var(--bg-sunken)' }}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10'
                }`}
                title="Paramètres Système"
              >
                <Settings className={`w-4.5 h-4.5 shrink-0 ${activeTab === 'settings' ? 'animate-spin-slow' : ''}`} />
              </button>
              {onOpenAccountSwitcher && (
                <button
                  onClick={onOpenAccountSwitcher}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all cursor-pointer"
                  title="Changer de compte"
                >
                  <Users className="w-4.5 h-4.5" />
                </button>
              )}
              {onLock && (
                <button
                  onClick={onLock}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer"
                  title="Verrouiller la session"
                >
                  <Lock className="w-4.5 h-4.5" />
                </button>
              )}
              {setIsCollapsed && (
                <button
                  onClick={() => setIsCollapsed(prev => !prev)}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-500/10 transition-all cursor-pointer"
                  title="Agrandir le menu"
                >
                  <PanelLeftOpen className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                    activeTab === 'settings'
                      ? 'bg-indigo-600 text-white shadow-sm border border-indigo-500'
                      : 'bg-slate-500/5 text-slate-600 dark:text-slate-300 border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-600'
                  }`}
                >
                  <Settings className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'settings' ? 'animate-spin-slow' : ''}`} />
                  Paramètres
                </button>
                {onLock && (
                  <button
                    onClick={onLock}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer bg-slate-500/5 text-slate-600 dark:text-slate-300 border border-transparent hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    Verrouiller
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-500/10">
                <div
                  onClick={onOpenAccountSwitcher}
                  className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                  title="Cliquer pour changer de compte"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-xs border border-indigo-400/30 group-hover:scale-105 transition-transform">
                      {LocalDatabaseService.getCurrentUser()?.nom ? LocalDatabaseService.getCurrentUser()!.nom.charAt(0).toUpperCase() : 'E'}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <p className="text-xs font-bold truncate group-hover:text-indigo-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                      {LocalDatabaseService.getCurrentUser()?.nom || 'Session Active'}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-500 truncate">
                      {roleLabelMap[userRole] || userRole}
                    </p>
                  </div>
                </div>

                {onOpenAccountSwitcher && (
                  <button
                    onClick={onOpenAccountSwitcher}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-500/10 transition-all cursor-pointer shrink-0"
                    title="Changer de compte"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                )}

                {setIsCollapsed && (
                  <button
                    onClick={() => setIsCollapsed(prev => !prev)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-500/10 transition-all cursor-pointer shrink-0"
                    title="Réduire le menu"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Flyout Popovers in Collapsed Mode */}
      {isCollapsed && activePopover && (
        <FlyoutPortal
          popover={activePopover}
          title={sections.find(s => s.key === activePopover.key)?.title || ''}
          items={sections.find(s => s.key === activePopover.key)?.items || []}
          icon={sections.find(s => s.key === activePopover.key)?.icon || GraduationCap}
          activeTab={activeTab}
          onSelect={selectSubTab}
          onMouseEnter={() => {
            if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
          }}
          onMouseLeave={() => closePopover()}
        />
      )}
    </>
  );
};