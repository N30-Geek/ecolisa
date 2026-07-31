import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  Receipt,
  Wallet,
  PieChart,
  Briefcase,
  UserCheck,
  Lock,
  Heart,
  Utensils,
  Bus,
  Library,
  FileCheck,
  MessageSquare,
  ShieldCheck,
  Settings,
  ChevronsUpDown,
  Check,
  LogOut,
  Search,
  Layers,
  Sparkles,
  Activity,
  FileText,
  ChevronDown,
  ChevronRight,
  FolderKanban
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
}

interface NavSubItem {
  id: string;
  label: string;
  icon: React.ElementType;
  isNew?: boolean;
}

interface NavCategory {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  items: NavSubItem[];
  color: string;
}

interface WorkspaceOption {
  id: string;
  name: string;
  email: string;
  badge: string;
  color: string;
  codeEPST: string;
}

const workspaces: WorkspaceOption[] = [
  { id: 'st_michel', name: 'CS Saint-Michel', email: 'admin@st-michel.cd', badge: 'PRO', color: '#6366f1', codeEPST: 'EPST-KIN-8821' },
  { id: 'la_sagesse', name: 'Complexe La Sagesse', email: 'contact@lasagesse.cd', badge: 'EDU', color: '#10b981', codeEPST: 'EPST-KIN-4019' },
  { id: 'kabambare', name: 'Lycée Kabambare', email: 'direction@kabambare.cd', badge: 'VIP', color: '#ec4899', codeEPST: 'EPST-KIN-0912' },
  { id: 'kimwenza', name: 'Institut Kimwenza', email: 'info@kimwenza.cd', badge: 'PRO', color: '#f59e0b', codeEPST: 'EPST-KIN-7320' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole: _userRole,
  isOnline: _isOnline,
  isCollapsed: controlledIsCollapsed,
  setIsCollapsed: controlledSetIsCollapsed,
  onOpenRegistration,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(false);
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalCollapsed;
  const setIsCollapsed = controlledSetIsCollapsed || setInternalCollapsed;

  const [searchFilter, setSearchFilter] = useState('');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeRailPopover, setActiveRailPopover] = useState<string | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceOption>(workspaces[0]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Accordéon des catégories : Pédagogie & Finances ouvertes par défaut
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    pedagogie: true,
    finances: true,
    administration: false,
    viescolaire: false,
  });

  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleMouseEnterCategory = (catId: string) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setActiveRailPopover(catId);
  };

  const handleMouseLeaveCategory = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    hoverTimerRef.current = setTimeout(() => {
      setActiveRailPopover(null);
    }, 200);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isCollapsed) setIsCollapsed(false);
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, setIsCollapsed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setShowWorkspaceMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories: NavCategory[] = [
    {
      id: 'pedagogie',
      label: 'GESTION PÉDAGOGIE',
      subtitle: 'Inscriptions, Apprenants, Horaires, Cotes, Examens, Classes & Cours',
      icon: GraduationCap,
      color: '#6366f1',
      items: [
        { id: 'apprenants', label: 'Dossiers Apprenants', icon: Users },
        { id: 'years', label: 'Année Scolaire & Périodes', icon: Calendar },
        { id: 'schedule', label: 'Horaire et Emplois du Temps', icon: Calendar },
        { id: 'grades', label: 'Cote et Progression et Bulletins', icon: ClipboardList },
        { id: 'examens', label: 'Examens et Évaluations', icon: FileCheck, isNew: true },
        { id: 'classes', label: 'Classe', icon: BookOpen },
        { id: 'subjects', label: 'Matière (Cours)', icon: Layers },
        { id: 'library', label: 'Bibliothèques', icon: Library },
      ],
    },
    {
      id: 'finances',
      label: 'FINANCES & CAISSE',
      subtitle: 'Minerval, Paie, Primes, Caisse & Dépenses',
      icon: Receipt,
      color: '#10b981',
      items: [
        { id: 'invoices', label: 'Factures & Recouvrement Minerval', icon: Receipt },
        { id: 'payroll', label: 'Gestion Paie & Primes', icon: Wallet },
        { id: 'expenses', label: 'Gestion de Caisse et Dépenses', icon: PieChart },
      ],
    },
    {
      id: 'administration',
      label: 'ADMINISTRATION',
      subtitle: 'Discipline, Enseignants, Personnel, Congés, Documents EPST & Messagerie',
      icon: FolderKanban,
      color: '#f59e0b',
      items: [
        { id: 'discipline', label: 'Discipline et Conduites', icon: Lock },
        { id: 'teachers', label: 'Gestion des Enseignants', icon: Users },
        { id: 'hr', label: 'Dossiers Personnel & Agents Scolaires', icon: Briefcase },
        { id: 'leaves', label: 'Congés & Absences', icon: UserCheck },
        { id: 'documents', label: 'Documents Officiels EPST RDC', icon: FileText },
        { id: 'messages', label: 'Messageries & Communications', icon: MessageSquare },
      ],
    },
    {
      id: 'viescolaire',
      label: 'VIE SCOLAIRE',
      subtitle: 'Santé, Cantine, Ressources & Transport Scolaire',
      icon: ShieldCheck,
      color: '#f43f5e',
      items: [
        { id: 'infirmerie', label: 'Santés & Infirmerie Scolaire', icon: Heart },
        { id: 'cantine', label: 'Cantine & Garderie', icon: Utensils },
        { id: 'ressources', label: 'Ressources Scolaires', icon: FolderKanban },
        { id: 'transport', label: 'Transport Scolaire & Lines', icon: Bus },
      ],
    },
  ];

  const toggleCategory = (catId: string) => {
    setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  useEffect(() => {
    categories.forEach(cat => {
      if (cat.items.some(item => item.id === activeTab)) {
        setOpenCategories(prev => ({ ...prev, [cat.id]: true }));
      }
    });
  }, [activeTab]);

  return (
    <aside
      className={`h-full flex flex-col select-none shrink-0 transition-all duration-300 relative border-r shadow-xs ${
        isCollapsed ? 'w-[78px] overflow-visible z-40' : 'w-[290px] overflow-hidden z-20'
      }`}
      style={{
        background: 'var(--sidebar-bg)',
        borderColor: 'var(--sidebar-border)',
      }}
    >
      {/* ===== HEADER : WORKSPACE CARD ===== */}
      <div
        className="p-3 border-b shrink-0 flex items-center justify-between gap-2 relative z-30"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        {!isCollapsed ? (
          <div className="flex-1 min-w-0 relative" ref={workspaceMenuRef}>
            <button
              onClick={() => {
                setShowWorkspaceMenu(!showWorkspaceMenu);
                setShowProfileMenu(false);
              }}
              className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border shadow-xs transition-all group cursor-pointer hover:border-indigo-400"
              style={{
                background: 'var(--sidebar-card-bg)',
                borderColor: 'var(--sidebar-border)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 text-white font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${selectedWorkspace.color} 0%, #4f46e5 100%)`,
                  }}
                >
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-1.5">
                    <h1
                      className="font-bold text-xs tracking-tight truncate leading-tight"
                      style={{ color: 'var(--sidebar-text-title)' }}
                    >
                      {selectedWorkspace.name}
                    </h1>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 shrink-0">
                      {selectedWorkspace.badge}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>{selectedWorkspace.codeEPST}</span>
                  </p>
                </div>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            </button>

            {showWorkspaceMenu && (
              <div
                className="absolute left-0 top-full mt-2 w-72 rounded-xl border shadow-xl z-50 p-2 space-y-1 animate-scale-in"
                style={{
                  background: 'var(--sidebar-popover-bg)',
                  borderColor: 'var(--sidebar-popover-border)',
                }}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-500/10 pb-2 flex items-center justify-between">
                  <span>Établissements Actifs</span>
                  <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
                {workspaces.map(ws => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setSelectedWorkspace(ws);
                      setShowWorkspaceMenu(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer ${
                      selectedWorkspace.id === ws.id
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-semibold border border-indigo-500/30'
                        : 'hover:bg-slate-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                        style={{ background: ws.color }}
                      >
                        {ws.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{ws.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{ws.codeEPST}</p>
                      </div>
                    </div>
                    {selectedWorkspace.id === ws.id && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full flex justify-center py-1 relative z-50" ref={workspaceMenuRef}>
            <button
              onClick={() => {
                setShowWorkspaceMenu(!showWorkspaceMenu);
                setShowProfileMenu(false);
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform cursor-pointer hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${selectedWorkspace.color} 0%, #4f46e5 100%)`,
              }}
              title={`Établissement actuel : ${selectedWorkspace.name}`}
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* ===== SEARCH BAR ===== */}
      {!isCollapsed && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Rechercher un module..."
              className="w-full pl-8 pr-12 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/80 transition-all font-medium"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 bg-slate-500/10 rounded border border-slate-500/20 pointer-events-none">
              Ctrl K
            </kbd>
          </div>
        </div>
      )}

      {/* ===== CORPS DE NAVIGATION ===== */}
      <nav className={`flex-1 py-2 px-3 space-y-1.5 ${isCollapsed ? 'overflow-visible z-40' : 'overflow-y-auto sidebar-scroll'}`}>

        {/* DASHBOARD PRINCIPAL */}
        {(!searchFilter || 'tableau de bord dashboard'.includes(searchFilter.toLowerCase())) && (
          <div className={isCollapsed ? 'flex justify-center' : ''}>
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setActiveRailPopover(null);
              }}
              className={`w-full flex items-center gap-3 ${
                isCollapsed ? 'w-10 h-10 justify-center rounded-xl' : 'px-3 py-2 rounded-lg text-xs'
              } transition-all cursor-pointer border ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-500/20 border-indigo-500/40'
                  : 'border-transparent hover:bg-slate-500/10 font-semibold'
              }`}
              style={{
                color: activeTab === 'dashboard' ? '#ffffff' : 'var(--sidebar-text-item)',
              }}
              title="Tableau de Bord Exécutif"
            >
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 ${
                  activeTab === 'dashboard' ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'
                }`}
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate text-left">Tableau de Bord</span>
                  <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'dashboard' ? 'text-amber-300' : 'text-indigo-500 dark:text-indigo-400'} animate-pulse`} />
                </>
              )}
            </button>
          </div>
        )}

        {/* LISTE DES CATEGORIES STRUCTURÉES */}
        {categories.map((cat) => {
          const filteredSubItems = cat.items.filter(item =>
            !searchFilter || item.label.toLowerCase().includes(searchFilter.toLowerCase())
          );

          if (searchFilter && filteredSubItems.length === 0) return null;

          const isCatOpen = openCategories[cat.id] || !!searchFilter;
          const hasActiveChild = cat.items.some(item => item.id === activeTab);
          const CategoryIcon = cat.icon;

          if (isCollapsed) {
            const isPopoverOpen = activeRailPopover === cat.id;

            return (
              <div
                key={cat.id}
                className="relative flex justify-center py-0.5 z-40"
                onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                onMouseLeave={handleMouseLeaveCategory}
              >
                <button
                  onClick={() => {
                    setActiveRailPopover(isPopoverOpen ? null : cat.id);
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                    hasActiveChild || isPopoverOpen
                      ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30 shadow-xs font-semibold'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
                  }`}
                  title={cat.label}
                >
                  <CategoryIcon className={`w-4.5 h-4.5 shrink-0 ${
                    hasActiveChild || isPopoverOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
                  }`} />
                </button>

                {isPopoverOpen && (
                  <div
                    className="absolute left-full ml-3 top-0 w-64 rounded-xl border shadow-xl z-50 p-2 space-y-1 animate-scale-in"
                    style={{
                      background: 'var(--sidebar-popover-bg)',
                      borderColor: 'var(--sidebar-popover-border)',
                    }}
                  >
                    <div className="px-2.5 py-1.5 border-b border-slate-500/10 pb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                          {cat.label}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{cat.subtitle}</p>
                      </div>
                      <CategoryIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    </div>
                    <div className="space-y-0.5 pt-1">
                      {cat.items.map(subItem => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeTab === subItem.id;
                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              if (subItem.id === 'students_register') {
                                if (onOpenRegistration) onOpenRegistration();
                                else setActiveTab('apprenants');
                              } else {
                                setActiveTab(subItem.id);
                              }
                              setActiveRailPopover(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              isSubActive
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'hover:bg-slate-500/10 font-semibold'
                            }`}
                            style={{
                              color: isSubActive ? '#ffffff' : 'var(--sidebar-text-item)',
                            }}
                          >
                            <SubIcon className={`w-3.5 h-3.5 ${isSubActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                            <span className="flex-1 text-left truncate">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={cat.id} className="space-y-0.5">
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer group/cat hover:bg-slate-500/10"
                style={{
                  color: hasActiveChild ? 'var(--sidebar-text-title)' : 'var(--sidebar-text-item)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      background: hasActiveChild ? `${cat.color}22` : 'transparent',
                    }}
                  >
                    <CategoryIcon
                      className="w-3.5 h-3.5 transition-colors"
                      style={{ color: cat.color }}
                    />
                  </div>
                  <span className="truncate uppercase tracking-wider text-[10.5px] font-bold">
                    {cat.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isCatOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {isCatOpen && (
                <div
                  className="pl-3 border-l ml-3.5 space-y-0.5 my-1"
                  style={{ borderColor: 'var(--sidebar-border)' }}
                >
                  {filteredSubItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'students_register') {
                            if (onOpenRegistration) onOpenRegistration();
                            else setActiveTab('apprenants');
                          } else {
                            setActiveTab(item.id);
                          }
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow-xs border-indigo-500/40'
                            : 'border-transparent hover:bg-slate-500/10 font-semibold'
                        }`}
                        style={{
                          color: isActive ? '#ffffff' : 'var(--sidebar-text-item)',
                        }}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span className="flex-1 truncate text-left">{item.label}</span>
                        {item.isNew && (
                          <span className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25">
                            NEW
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

      {/* ===== FOOTER : PROFIL UTILISATEUR ===== */}
      <div
        className="p-3 border-t shrink-0 relative z-30"
        style={{
          borderColor: 'var(--sidebar-border)',
          background: 'var(--bg-sunken)',
        }}
      >
        {!isCollapsed ? (
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowWorkspaceMenu(false);
              }}
              className="w-full flex items-center justify-between gap-2.5 p-2 rounded-xl border shadow-xs transition-all hover:border-indigo-400 cursor-pointer"
              style={{
                background: 'var(--sidebar-card-bg)',
                borderColor: 'var(--sidebar-border)',
              }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                  }}
                >
                  J
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-xs truncate leading-tight" style={{ color: 'var(--sidebar-text-title)' }}>
                    Jean-Paul Mukendi
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">Promoteur Principal</p>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {showProfileMenu && (
              <div
                className="absolute left-0 bottom-full mb-2 w-72 rounded-xl border shadow-xl z-50 p-1.5 space-y-0.5 animate-scale-in"
                style={{
                  background: 'var(--sidebar-popover-bg)',
                  borderColor: 'var(--sidebar-popover-border)',
                }}
              >
                <div
                  className="p-2.5 border-b rounded-lg mb-1"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Jean-Paul Mukendi</p>
                  <p className="text-[10.5px] font-medium text-indigo-600 dark:text-indigo-400">j.mukendi@ecolisa.cd</p>
                </div>
                <button
                  onClick={() => { setActiveTab('settings'); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-500/10 transition-colors text-left cursor-pointer"
                  style={{ color: 'var(--sidebar-text-item)' }}
                >
                  <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Paramètres Système</span>
                </button>
                <button
                  onClick={() => { setActiveTab('license'); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-500/10 transition-colors text-left cursor-pointer"
                  style={{ color: 'var(--sidebar-text-item)' }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Licence & Synchro Offline</span>
                </button>
                <button
                  onClick={() => { setActiveTab('documents'); setShowProfileMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-500/10 transition-colors text-left cursor-pointer"
                  style={{ color: 'var(--sidebar-text-item)' }}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Documents EPST RDC</span>
                </button>
                <div className="my-1 border-t border-slate-500/10" />
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Verrouiller la Session</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <div
              onClick={() => setActiveTab('settings')}
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              }}
              title="Jean-Paul Mukendi — Paramètres Système"
            >
              J
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
