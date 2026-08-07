import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  HardDrive,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Folder,
  Activity,
  Award,
  BookOpen,
  Calendar,
  Banknote,
  Receipt,
  UserCog,
  CalendarOff,
  FileText,
  History,
  HeartPulse,
  Utensils,
  Bus,
  BookMarked,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import { RôleSystème } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: RôleSystème;
  isOnline: boolean;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onLock?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
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

// ── Portal Flyout Popover (en mode réduit) ──────────────────────────────────
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
      className="rounded-2xl border p-2 space-y-0.5 animate-scale-in select-none"
      style={{
        position: 'fixed',
        top: popover.top,
        left: popover.left,
        zIndex: 99999,
        width: 256,
        background: 'var(--sidebar-popover-bg)',
        borderColor: 'var(--sidebar-popover-border)',
        boxShadow: 'var(--shadow-xl)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Header du popover */}
      <div
        className="px-3 py-2 flex items-center gap-2 mb-1 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="w-6.5 h-6.5 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
          <IconComp className="w-4 h-4 text-indigo-500" />
        </div>
        <span className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>
      <div className="py-0.5 space-y-0.5 max-h-72 overflow-y-auto sidebar-scroll">
        {items.map((sub) => {
          const isActive = activeTab === sub.id;
          const SubIcon = sub.icon;
          return (
            <button
              key={sub.id}
              onClick={() => onSelect(sub.id)}
              className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs transition-all cursor-pointer text-left relative group ${
                isActive
                  ? 'font-black bg-indigo-600 text-white shadow-sm border border-indigo-500'
                  : 'font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-300 border border-transparent hover:border-indigo-500/30'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-1">
                <SubIcon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                <span className="truncate">{sub.label}</span>
              </div>
              {sub.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25'
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
}) => {
  const [activePopover, setActivePopover] = useState<PopoverState | null>(null);
  const popoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [counts, setCounts] = useState<{ eleves: number; teachers: number; yearName: string }>({
    eleves: 0,
    teachers: 0,
    yearName: '2026–2027',
  });

  useEffect(() => {
    let isMounted = true;
    const loadCounts = async () => {
      const [eleves, staff, years] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getSchoolYears(),
      ]);
      if (!isMounted) return;
      const activeY = years.find(y => y.statut === 'EN_COURS') || years[0];
      setCounts({
        eleves: eleves.length,
        teachers: staff.filter(s => s.role === 'ENSEIGNANT').length,
        yearName: activeY?.nom || '2026–2027',
      });
    };
    loadCounts();
    return () => { isMounted = false; };
  }, [activeTab]);

  const getSectionForTab = (tab: string): string | null => {
    if (['apprenants', 'students', 'classes', 'grades', 'examens', 'schedule', 'subjects'].includes(tab)) return 'pedagogie';
    if (['invoices', 'cash', 'payroll', 'fees', 'accounting', 'reports', 'expenses'].includes(tab)) return 'finances';
    if (['teachers', 'hr', 'leaves', 'documents', 'years'].includes(tab)) return 'administration';
    if (['discipline', 'infirmerie', 'cantine', 'transport', 'library'].includes(tab)) return 'services';
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

  const pedagogieItems: SubMenuItem[] = [
    { id: 'students',   label: 'Dossiers Élèves (RDC)', icon: UserCheck, badge: counts.eleves > 0 ? counts.eleves : undefined },
    { id: 'classes',    label: 'Classes & Promotions', icon: School },
    { id: 'grades',     label: 'Cotes & Bulletins', icon: Award },
    { id: 'examens',    label: 'Évaluations & Examens', icon: Sparkles },
    { id: 'schedule',   label: 'Emplois du Temps', icon: Calendar },
    { id: 'subjects',   label: 'Matières & Coefficients', icon: BookOpen },
  ];

  const financesItems: SubMenuItem[] = [
    { id: 'invoices',   label: 'Factures & Recouvrement', icon: CreditCard },
    { id: 'cash',       label: 'Caisse & Dépenses',       icon: Wallet },
    { id: 'payroll',    label: 'Paie & Primes',           icon: Banknote },
    { id: 'fees',       label: 'Frais Scolaires',         icon: PieChart },
    { id: 'accounting', label: 'Comptabilité',            icon: FileText },
    { id: 'reports',    label: 'Rapports Financiers',     icon: TrendingUp },
  ];

  const adminItems: SubMenuItem[] = [
    { id: 'teachers',  label: 'Gestion Enseignants', icon: UserCog, badge: counts.teachers > 0 ? counts.teachers : undefined },
    { id: 'hr',        label: 'Dossiers Personnel Admin', icon: Users },
    { id: 'leaves',    label: 'Congés & Absences', icon: CalendarOff },
    { id: 'documents', label: 'Documents EPST RDC', icon: FileText },
    { id: 'years',     label: 'Années Scolaires', icon: History },
  ];

  const servicesItems: SubMenuItem[] = [
    { id: 'discipline',  label: 'Discipline & Conduite', icon: ShieldCheck },
    { id: 'infirmerie',  label: 'Infirmerie & Santé', icon: HeartPulse },
    { id: 'cantine',     label: 'Cantine & Garderie', icon: Utensils },
    { id: 'transport',   label: 'Transport Scolaire', icon: Bus },
    { id: 'library',     label: 'Bibliothèque & CDI', icon: BookMarked },
  ];

  const sectionData: Record<string, { title: string; items: SubMenuItem[]; icon: React.ElementType }> = {
    pedagogie:      { title: 'Pédagogie & Élèves',       items: pedagogieItems, icon: GraduationCap },
    finances:       { title: 'Finances & Caisse',        items: financesItems,  icon: Wallet },
    administration: { title: 'Administration & RH',      items: adminItems,     icon: Users },
    services:       { title: 'Vie Scolaire & Services',  items: servicesItems,  icon: Trophy },
  };

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: isCollapsed ? 'center' : 'space-between',
    width: '100%',
    padding: isCollapsed ? '10px' : '8.5px 12px',
    borderRadius: 12,
    fontSize: 12.5,
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
    background: active ? 'var(--sidebar-active-bg)' : 'transparent',
    color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-item)',
    border: active ? '1px solid var(--sidebar-active-border)' : '1px solid transparent',
    textAlign: 'left',
  });

  const sectionStyle = (active: boolean): React.CSSProperties => ({
    ...navItemStyle(active),
    justifyContent: 'space-between',
    background: active ? 'rgba(99,102,241,0.08)' : 'transparent',
    border: '1px solid transparent',
    color: active ? 'var(--sidebar-active-text)' : 'var(--sidebar-text-item)',
  });

  const iconCls = (active: boolean) => active ? 'text-indigo-500' : 'text-slate-400';

  const AccentBar = () => (
    <span
      style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 3.5,
        height: '60%',
        borderRadius: '0 9999px 9999px 0',
        background: 'linear-gradient(180deg, #818cf8, #6366f1)',
      }}
    />
  );

  return (
    <>
      <aside
        className={`h-full flex flex-col select-none shrink-0 transition-all duration-300 relative border-r z-30 ${
          isCollapsed ? 'w-[70px]' : 'w-[272px]'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderColor: 'var(--sidebar-border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* ── HEADER : BRANDING & ANNEÉ SCOLAIRE ── */}
        <div
          className="px-3.5 py-3.5 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: 'var(--sidebar-border)' }}
        >
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-9.5 h-9.5 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <School className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <h1 className="font-black text-sm tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  ECOLISA
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    PRO
                  </span>
                </h1>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 truncate mt-0.5">
                  {counts.yearName} • RDC EPST
                </p>
              </div>
            )}
          </div>

          {setIsCollapsed && !isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(prev => !prev)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-slate-500/10 transition-colors cursor-pointer"
              title="Réduire le menu latéral"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── NAVIGATION PRINCIPALE ── */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 sidebar-scroll">
          {!isCollapsed && (
            <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Vue Exécutive
            </div>
          )}

          {/* 1. TABLEAU DE BORD */}
          <button
            onClick={() => setActiveTab('dashboard')}
            style={navItemStyle(activeTab === 'dashboard')}
            title={isCollapsed ? 'Tableau de Bord' : undefined}
          >
            {activeTab === 'dashboard' && <AccentBar />}
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
              <Home className={`w-4.5 h-4.5 shrink-0 ${iconCls(activeTab === 'dashboard')}`} />
              {!isCollapsed && <span>Tableau de Bord</span>}
            </div>
          </button>

          {!isCollapsed && (
            <div className="px-2 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Modules Établissement
            </div>
          )}

          {Object.entries(sectionData).map(([key, section]) => {
            const SectionIcon = section.icon;
            const isSectionActive = activeSection === key;
            if (isCollapsed) {
              return (
                <div
                  key={key}
                  className="relative"
                  ref={(el) => { sectionRefs.current[key] = el; }}
                  onMouseEnter={() => handleMouseEnterSection(key)}
                  onMouseLeave={handleMouseLeaveSection}
                >
                  <button
                    onClick={() => handleSectionClick(key)}
                    className={`w-full flex items-center justify-center py-2.5 rounded-xl text-xs transition-all cursor-pointer ${isSectionActive || activePopover?.key === key ? 'bg-indigo-500/15 text-indigo-600 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-500/10 hover:text-indigo-500 border border-transparent'}`}
                    title={section.title}
                  >
                    <SectionIcon className={`w-5 h-5 shrink-0 ${isSectionActive || activePopover?.key === key ? 'text-indigo-500' : 'text-slate-400'}`} />
                  </button>
                </div>
              );
            }
            return (
              <div
                key={key}
                className="rounded-2xl p-2.5 mb-2.5"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <div
                  className="flex items-center gap-2 px-2 pb-2 mb-2 border-b"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
                    <SectionIcon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>
                    {section.title}
                  </span>
                  {isSectionActive && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((sub) => {
                    const SubIcon = sub.icon;
                    const isActive = activeTab === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => selectSubTab(sub.id)}
                        className={`w-full flex items-center justify-between py-2 px-2.5 rounded-xl text-xs transition-all cursor-pointer text-left relative group ${
                          isActive
                            ? 'font-black bg-indigo-600 text-white shadow-sm border border-indigo-500'
                            : 'font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-300 border border-transparent hover:border-indigo-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SubIcon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
                          <span className="truncate">{sub.label}</span>
                        </div>
                        {sub.badge !== undefined && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[8.5px] font-black shrink-0 ${
                              isActive
                                ? 'bg-white/20 text-white border border-white/30'
                                : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25'
                            }`}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>


        {/* ── FOOTER : PARAMÈTRES & PROFIL UTILISATEUR ── */}
        <div
          className="p-2.5 border-t shrink-0 flex flex-col gap-2"
          style={{ borderColor: 'var(--sidebar-border)', background: 'var(--bg-sunken)' }}
        >
          {/* BOUTON PARAMÈTRES SYSTÈME — ANCRÉ EN BAS */}
          <button
            onClick={() => setActiveTab('settings')}
            style={navItemStyle(activeTab === 'settings')}
            title={isCollapsed ? 'Paramètres Système' : undefined}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs transition-all cursor-pointer text-left relative group ${
              activeTab === 'settings'
                ? 'font-black bg-indigo-600 text-white shadow-sm border border-indigo-500'
                : 'font-bold text-slate-700 dark:text-slate-200 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-300 border border-transparent hover:border-indigo-500/30'
            }`}
          >
            {activeTab === 'settings' && <AccentBar />}
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-2.5'}`}>
              <Settings className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:rotate-45 ${activeTab === 'settings' ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}`} />
              {!isCollapsed && <span>Paramètres Système</span>}
            </div>
          </button>

          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2 pt-1 border-t border-slate-500/10">
              {setIsCollapsed && (
                <button
                  onClick={() => setIsCollapsed(prev => !prev)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-500/20 transition-colors cursor-pointer"
                  title="Agrandir le menu"
                >
                  <PanelLeftOpen className="w-4.5 h-4.5" />
                </button>
              )}
              {onLock && (
                <button
                  onClick={onLock}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title="Verrouiller la session"
                >
                  <Lock className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-500/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8.5 h-8.5 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                  E
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    Direction Générale
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {roleLabelMap[userRole] || userRole}
                  </p>
                </div>
              </div>

              {onLock && (
                <button
                  onClick={onLock}
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer shrink-0"
                  title="Verrouiller la session"
                >
                  <Lock className="w-4.5 h-4.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Rendu du popover volant lorsque le menu est réduit */}
      {isCollapsed && activePopover && (
        <FlyoutPortal
          popover={activePopover}
          title={sectionData[activePopover.key]?.title || ''}
          items={sectionData[activePopover.key]?.items || []}
          icon={sectionData[activePopover.key]?.icon || GraduationCap}
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
