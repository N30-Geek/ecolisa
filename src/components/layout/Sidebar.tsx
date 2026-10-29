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
  Briefcase,
  CalendarOff,
  CalendarCheck,
  FileText,
  History,
  HeartPulse,
  Utensils,
  Bus,
  BookMarked,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileCheck,
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
  PREFET_DIRECTEUR: 'Préfet des Études',
  DIRECTEUR_ECOLE: 'Directeur d’école (Maternelle & Primaire)',
  DIRECTEUR_ETUDES: 'Directeur des Études',
  DIRECTEUR_DISCIPLINE: 'Dir. Discipline',
  COMPTABLE: 'Comptable Général',
  TITULAIRE: 'Enseignant Titulaire',
  ENSEIGNANT: 'Professeur / Enseignant',
  PARENT_ELEVE: 'Parent d\'Élève',
};

// Tailles de polices fluides plus discrètes
const FS_SM = 'clamp(0.7rem, calc(0.4vw + 0.5rem), 0.8rem)';          // nom école / labels principaux
const FS_XS = 'clamp(0.6rem, calc(0.3vw + 0.45rem), 0.7rem)';         // sections / sous-menus
const FS_XS2 = 'clamp(0.55rem, calc(0.28vw + 0.42rem), 0.65rem)';     // petits labels
const FS_XXS = 'clamp(0.5rem, calc(0.22vw + 0.4rem), 0.6rem)';        // badges / pills
const FS_XXXS = 'clamp(0.45rem, calc(0.18vw + 0.36rem), 0.55rem)';    // micro badges

/* ── Portail "flyout" en mode réduit avec icônes colorées ── */
const FlyoutPortal: React.FC<{
  popover: PopoverState;
  title: string;
  items: SubMenuItem[];
  icon: React.ElementType;
  color?: string;
  activeTab: string;
  onSelect: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ popover, title, items, icon: IconComp, activeTab, onSelect, onMouseEnter, onMouseLeave }) => {
  return ReactDOM.createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="rounded-2xl p-2.5 space-y-1 select-none animate-scale-in"
      style={{
        position: 'fixed',
        top: popover.top,
        left: popover.left,
        zIndex: 99999,
        width: 260,
        background: 'var(--sidebar-popover-bg)',
        boxShadow: 'var(--elevation-4)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      <div className="px-3 py-2 flex items-center gap-3 mb-1">
        <IconComp className="w-4 h-4 shrink-0" style={{ color: 'var(--sidebar-icon-color)' }} />
        <span className="font-semibold text-xs text-[var(--sidebar-text-title)] tracking-wide capitalize" style={{ fontSize: FS_XS }}>
          {title}
        </span>
      </div>
      <div className="py-0.5 space-y-0.5 max-h-80 overflow-y-auto sidebar-scroll">
        {items.map((sub) => {
          const isActive = activeTab === sub.id;
          const SubIcon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onSelect(sub.id)}
              className={`group w-full flex items-center gap-3 px-3 h-9 rounded-xl text-xs transition-all duration-200 cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                isActive
                  ? 'bg-[var(--sidebar-active-bg)]'
                  : 'hover:bg-[var(--sidebar-item-hover)]'
              }`}
            >
              <SubIcon className="w-4 h-4 shrink-0" style={{ color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon-color)' }} />
              <span className={`flex-1 text-left truncate font-medium text-xs capitalize ${isActive ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text-item)] group-hover:text-[var(--sidebar-active-text)]'}`} style={{ fontSize: FS_XS }}>
                {sub.label}
              </span>
              {sub.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-md leading-none font-black shrink-0 bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]" style={{ fontSize: FS_XXS }}>
                  {sub.badge}
                </span>
              )}
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--sidebar-active-text)]" />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

/* ── Accordéon avec transition de hauteur fluide ── */
const Accordion: React.FC<{ open: boolean; children: React.ReactNode }> = ({ open, children }) => (
  <div
    className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
    style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
  >
    <div className="overflow-hidden min-h-0">
      {children}
    </div>
  </div>
);

/* ── Élément de navigation simple avec icône plate ── */
const NavItem: React.FC<{
  icon: React.ElementType;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, active, collapsed, onClick }) => {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={label}
        className={`w-full flex items-center justify-center py-3 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
          active
            ? 'bg-[var(--sidebar-active-bg)]'
            : 'hover:bg-[var(--sidebar-item-hover)]'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0 transition-transform duration-300" style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon-color)' }} />
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-3 px-3 h-10 rounded-2xl text-xs font-medium tracking-wide transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
        active
          ? 'bg-[var(--sidebar-active-bg)] shadow-sm'
          : 'hover:bg-[var(--sidebar-item-hover)]'
      }`}
      style={{ fontSize: FS_XS }}
    >
      <Icon className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon-color)' }} />
      <span className={`flex-1 text-left truncate capitalize transition-transform duration-300 group-hover:translate-x-0.5 ${active ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text-item)] group-hover:text-[var(--sidebar-active-text)]'}`}>
        {label}
      </span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--sidebar-active-text)]" />}
    </button>
  );
};

/* ── Catégorie avec sous-menu en cascade ── */
const Section: React.FC<{
  section: SectionCategory;
  active: boolean;
  expanded: boolean;
  activeTab: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  sectionRef: (el: HTMLDivElement | null) => void;
}> = ({
  section,
  active,
  expanded,
  activeTab,
  collapsed,
  onToggle,
  onSelect,
  onMouseEnter,
  onMouseLeave,
  sectionRef,
}) => {
  const SectionIcon = section.icon;
  if (collapsed) {
    return (
      <div
        key={section.key}
        className="relative"
        ref={sectionRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-center py-3 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
            active ? 'bg-[var(--sidebar-active-bg)]' : 'hover:bg-[var(--sidebar-item-hover)]'
          }`}
          title={section.title}
        >
          <SectionIcon className="w-5 h-5 shrink-0 transition-transform duration-300" style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon-color)' }} />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl">
      <button
        onClick={onToggle}
        className={`group/header w-full flex items-center gap-3 px-3 h-10 rounded-2xl text-left transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
          active
            ? 'bg-[var(--sidebar-active-bg)] shadow-sm'
            : 'hover:bg-[var(--sidebar-item-hover)]'
        }`}
      >
        <SectionIcon className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover/header:scale-105" style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon-color)' }} />
        <span className={`flex-1 text-left text-xs font-medium tracking-wide truncate capitalize transition-transform duration-300 group-hover/header:translate-x-0.5 ${active ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text-item)] group-hover/header:text-[var(--sidebar-active-text)]'}`} style={{ fontSize: FS_XS }}>
          {section.title}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-300 ${expanded ? 'rotate-180' : ''} ${active ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-icon-color)]'}`} />
      </button>

      <Accordion open={expanded}>
        <div className="pl-3 py-1 space-y-1">
          {section.items.map((sub, idx) => {
            const SubIcon = sub.icon;
            const isActive = activeTab === sub.id;
            return (
              <div
                key={sub.id}
                className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${expanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
                style={{ transitionDelay: expanded ? `${idx * 25}ms` : '0ms' }}
              >
                <button
                  onClick={() => onSelect(sub.id)}
                  className={`group w-full flex items-center gap-3 px-3 h-9 rounded-xl text-xs font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${
                    isActive
                      ? 'bg-[var(--sidebar-active-bg)]'
                      : 'hover:bg-[var(--sidebar-item-hover)]'
                  }`}
                  style={{ fontSize: FS_XS }}
                >
                  <SubIcon className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:scale-105" style={{ color: isActive ? 'var(--sidebar-active-text)' : 'var(--sidebar-icon-color)' }} />
                  <span className={`flex-1 text-left truncate capitalize ${isActive ? 'text-[var(--sidebar-active-text)]' : 'text-[var(--sidebar-text-item)] group-hover:text-[var(--sidebar-active-text)]'}`}>
                    {sub.label}
                  </span>
                  {sub.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-md leading-none font-black shrink-0 bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)]" style={{ fontSize: FS_XXXS }}>
                      {sub.badge}
                    </span>
                  )}
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--sidebar-active-text)]" />}
                </button>
              </div>
            );
          })}
        </div>
      </Accordion>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  isOnline,
  isCollapsed = false,
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

  const isTeacherRole = userRole === 'ENSEIGNANT' || userRole === 'TITULAIRE';

  const getSectionForTab = (tab: string): string | null => {
    if (['dashboard'].includes(tab)) return isTeacherRole ? 'mon_enseignement' : null;
    if (['apprenants', 'students', 'classes', 'grades', 'examens', 'schedule', 'subjects'].includes(tab)) return isTeacherRole ? 'mon_enseignement' : 'pedagogie';
    if (['invoices', 'cash', 'payroll', 'fees', 'accounting', 'reports', 'expenses', 'analytics'].includes(tab)) return 'finances';
    if (['deliberation'].includes(tab)) return isTeacherRole ? 'outils_prof' : 'administration';
    if (['teachers', 'hr', 'leaves', 'pointage', 'documents', 'years'].includes(tab)) return isTeacherRole ? 'outils_prof' : 'administration';
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
    { id: 'deliberation', label: 'Délibérations', icon: FileCheck },
    { id: 'teachers',  label: 'Gestion Enseignants',      icon: UserCog, badge: counts.teachers > 0 ? counts.teachers : undefined },
    { id: 'hr',        label: 'Dossiers Personnel Admin', icon: Users },
    { id: 'leaves',    label: 'Congés & Absences',        icon: CalendarOff },
    { id: 'pointage',  label: 'Pointage & Présence',      icon: CalendarCheck },
    { id: 'documents', label: 'Documents',                icon: FileText },
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

  // ── Menu spécifique Enseignant / Titulaire ─────────────────────────────────
  const teacherSections: SectionCategory[] = [
    {
      key: 'mon_enseignement',
      title: 'Mon Enseignement',
      icon: GraduationCap,

      items: [
        { id: 'dashboard', label: 'Tableau de Bord', icon: Home },
        { id: 'examens', label: 'Mes Épreuves & Évaluations', icon: ClipboardList },
        { id: 'schedule', label: 'Mon Emploi du Temps', icon: Calendar },
        { id: 'grades', label: 'Mes Cotes & Bulletins', icon: Award },
      ],
    },
    {
      key: 'ma_classe',
      title: 'Ma Classe',
      icon: School,

      items: [
        { id: 'students', label: 'Mes Élèves', icon: UserCheck, badge: isTeacherRole ? counts.eleves : undefined },
        { id: 'classes', label: 'Ma Classe', icon: School },
        { id: 'pointage', label: 'Présences & Pointage', icon: CalendarCheck },
      ],
    },
    {
      key: 'outils_prof',
      title: 'Mes Outils',
      icon: Briefcase,

      items: [
        { id: 'documents', label: 'Documents', icon: FileText },
      ],
    },
  ];

  const adminSections: SectionCategory[] = [
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

  const sections = isTeacherRole ? teacherSections : adminSections;

  const visibleSections = useMemo(() => {
    return sections
      .map(sec => ({
        ...sec,
        items: sec.items.filter(item => hasTabAccess(userRole, item.id)),
      }))
      .filter(sec => sec.items.length > 0);
  }, [userRole, counts, sections]);

  const schoolName = config?.schoolName || 'ECOLISA';

  return (
    <>
      <aside
        className={`h-full flex flex-col select-none shrink-0 z-30 transition-all duration-300 relative ${
          isCollapsed ? 'w-[74px]' : 'w-[280px]'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          color: 'var(--sidebar-text-title)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        {/* HEADER BRAND & LIVE CLOCK CAPSULE */}
        <div className="shrink-0 relative p-3">
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
                  style={{ color: 'var(--text-primary)', fontSize: FS_SM }}
                  title={schoolName}
                >
                  {schoolName}
                </h1>
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full leading-none font-black uppercase tracking-wider bg-indigo-500/12 text-indigo-700 dark:text-indigo-300" style={{ fontSize: FS_XXS }}>
                    {counts.yearName}
                  </span>
                  <span className="leading-none font-bold text-slate-400" style={{ fontSize: FS_XXS }}>· RDC</span>
                </div>
              </div>

              {/* Real-time Material Capsule */}
              <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-500/5 shadow-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="leading-none font-bold uppercase tracking-wider" style={{ fontSize: FS_XXS }}>{formattedDate}</span>
                </div>
                <span className="leading-none font-black text-indigo-600 dark:text-indigo-400 tabular-nums tracking-tight text-xs" style={{ fontSize: FS_XS }}>
                  {currentTime}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 sidebar-scroll">
          <NavItem
            icon={Home}
            label="Tableau de Bord"
            active={activeTab === 'dashboard'}
            collapsed={isCollapsed}
            onClick={() => setActiveTab('dashboard')}
          />

          {visibleSections.map((section) => (
            <Section
              key={section.key}
              section={section}
              active={activeSection === section.key}
              expanded={expandedSection === section.key}
              activeTab={activeTab}
              collapsed={isCollapsed}
              onToggle={() => handleSectionClick(section.key)}
              onSelect={selectSubTab}
              onMouseEnter={() => handleMouseEnterSection(section.key)}
              onMouseLeave={handleMouseLeaveSection}
              sectionRef={(el) => { sectionRefs.current[section.key] = el; }}
            />
          ))}
        </nav>

      </aside>

      {/* Flyout Popovers in Collapsed Mode */}
      {isCollapsed && activePopover && (() => {
        const activeSectionData = visibleSections.find(s => s.key === activePopover.key);
        return (
          <FlyoutPortal
            popover={activePopover}
            title={activeSectionData?.title || ''}
            items={activeSectionData?.items || []}
            icon={activeSectionData?.icon || GraduationCap}
            activeTab={activeTab}
            onSelect={selectSubTab}
            onMouseEnter={() => {
              if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
            }}
            onMouseLeave={() => closePopover()}
          />
        );
      })()}
    </>
  );
};