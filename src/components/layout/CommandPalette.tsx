import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  Calendar,
  ClipboardCheck,
  Receipt,
  Banknote,
  Wallet,
  Scale,
  UserCheck,
  FileText,
  MessageSquare,
  HeartPulse,
  Utensils,
  Bus,
  BookOpen,
  ShieldCheck,
  Settings,
  ArrowRight,
  Sparkles,
  Command,
  X,
  User,
  FileSearch,
  GraduationCap as StudentIcon,
  Briefcase,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { setSearchTarget } from '../../hooks/useSearchTarget';
import { hasTabAccess } from '../../utils/permissions';
import { RôleSystème } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  userRole?: RôleSystème;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  categoryBadge: string;
  icon: React.ElementType;
  description: string;
  shortcut?: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  { id: 'dashboard', label: 'Tableau de Bord Exécutif', category: 'Vue Générale', categoryBadge: 'Synthèse', icon: LayoutDashboard, description: 'Vue d\'ensemble de l\'établissement', shortcut: 'G D' },
  { id: 'students', label: 'Inscriptions & Admissions', category: 'Pédagogie', categoryBadge: 'Élèves', icon: GraduationCap, description: 'Admissions, réinscriptions et dossiers élèves', shortcut: 'P I' },
  { id: 'apprenants', label: 'Dossiers des Apprenants', category: 'Pédagogie', categoryBadge: 'Élèves', icon: Users, description: 'Fiches individuelles et parcours' },
  { id: 'classes', label: 'Classes & Promotions', category: 'Pédagogie', categoryBadge: 'Structure', icon: School, description: 'Gestion des salles et effectifs' },
  { id: 'schedule', label: 'Emplois du Temps', category: 'Pédagogie', categoryBadge: 'Planning', icon: Calendar, description: 'Planning des cours et salles' },
  { id: 'grades', label: 'Bulletins, Cotes & Délibérations', category: 'Pédagogie', categoryBadge: 'Évaluations', icon: ClipboardCheck, description: 'Encodage des points et bulletins' },
  { id: 'examens', label: 'Examens & Évaluations', category: 'Pédagogie', categoryBadge: 'Évaluations', icon: FileText, description: 'Épreuves, examens et palmarès' },
  { id: 'invoices', label: 'Factures & Recouvrement', category: 'Finances', categoryBadge: 'Comptabilité', icon: Receipt, description: 'Frais scolaires et reçus', shortcut: 'F M' },
  { id: 'fees', label: 'Types de Frais Scolaires', category: 'Finances', categoryBadge: 'Frais', icon: Banknote, description: 'Configuration des minervals et frais' },
  { id: 'cash', label: 'Caisse & Encaissements', category: 'Finances', categoryBadge: 'Trésorerie', icon: Wallet, description: 'Versements, caisse et journal' },
  { id: 'payroll', label: 'Gestion de Paie', category: 'Finances', categoryBadge: 'RH', icon: Banknote, description: 'Bulletins de paie du personnel' },
  { id: 'expenses', label: 'Dépenses & Sorties', category: 'Finances', categoryBadge: 'Trésorerie', icon: Wallet, description: 'Sorties de caisse et approvisionnements' },
  { id: 'discipline', label: 'Discipline & Conduites', category: 'Vie Scolaire', categoryBadge: 'Discipline', icon: Scale, description: 'Retenues et suivi comportemental' },
  { id: 'teachers', label: 'Enseignants', category: 'Administration', categoryBadge: 'Personnel', icon: UserCheck, description: 'Registre des enseignants' },
  { id: 'hr', label: 'Personnel & Agents', category: 'Administration', categoryBadge: 'RH', icon: Briefcase, description: 'Agents administratifs et support' },
  { id: 'documents', label: 'Documents Officiels EPST', category: 'Administration', categoryBadge: 'EPST', icon: FileText, description: 'Palmarès et attestations' },
  { id: 'messages', label: 'Messagerie & SMS', category: 'Communication', categoryBadge: 'Parents', icon: MessageSquare, description: 'Communiqués aux parents' },
  { id: 'infirmerie', label: 'Santé & Infirmerie', category: 'Services', categoryBadge: 'Santé', icon: HeartPulse, description: 'Fiches médicales et soins' },
  { id: 'cantine', label: 'Cantine & Restauration', category: 'Services', categoryBadge: 'Services', icon: Utensils, description: 'Menus et tickets repas' },
  { id: 'transport', label: 'Transport Scolaire', category: 'Services', categoryBadge: 'Services', icon: Bus, description: 'Circuits et chauffeurs' },
  { id: 'library', label: 'Bibliothèque & CDI', category: 'Ressources', categoryBadge: 'Livres', icon: BookOpen, description: 'Ouvrages et prêts' },
  { id: 'license', label: 'Licence & Synchronisation', category: 'Système', categoryBadge: 'Sécurité', icon: ShieldCheck, description: 'Licence et réplication offline' },
  { id: 'settings', label: 'Paramètres du Système', category: 'Système', categoryBadge: 'Config', icon: Settings, description: 'Configuration et rôles', shortcut: 'S S' },
];

type ResultType = 'module' | 'student' | 'class' | 'staff' | 'invoice';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ElementType;
  iconColor: string;
  action: string;
  meta?: any;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  userRole = 'PROMOTEUR_ADMIN',
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [data, setData] = useState<{ students: any[]; classes: any[]; staff: any[]; invoices: any[] }>({ students: [], classes: [], staff: [], invoices: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    setLoading(true);

    const canSeeStudents = hasTabAccess(userRole, 'students') || hasTabAccess(userRole, 'apprenants') || hasTabAccess(userRole, 'classes');
    const canSeeStaff = hasTabAccess(userRole, 'teachers') || hasTabAccess(userRole, 'hr');
    const canSeeInvoices = hasTabAccess(userRole, 'invoices') || hasTabAccess(userRole, 'cash');

    Promise.all([
      canSeeStudents ? LocalDatabaseService.getEleves().catch(() => []) : Promise.resolve([]),
      canSeeStudents ? LocalDatabaseService.getClasses().catch(() => []) : Promise.resolve([]),
      canSeeStaff ? LocalDatabaseService.getStaff().catch(() => []) : Promise.resolve([]),
      canSeeInvoices ? LocalDatabaseService.getInvoices().catch(() => []) : Promise.resolve([]),
    ]).then(([students, classes, staff, invoices]) => {
      setData({ students, classes, staff, invoices });
      setLoading(false);
    });
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen, userRole]);

  const q = useMemo(() => query.toLowerCase().trim(), [query]);

  const allResults = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    if (!q) return results;

    // Modules accessibles au rôle connecté
    COMMAND_ITEMS.filter(item =>
      hasTabAccess(userRole, item.id) &&
      (item.label.toLowerCase().includes(q) ||
       item.category.toLowerCase().includes(q) ||
       item.description.toLowerCase().includes(q))
    ).forEach(item => results.push({
      id: `mod-${item.id}`,
      type: 'module',
      title: item.label,
      subtitle: item.description,
      badge: item.categoryBadge,
      icon: item.icon,
      iconColor: '#6366f1',
      action: item.id,
    }));

    // Carte classes pour enrichir la recherche avec cycle, option, salle
    const classById = new Map(data.classes.map((c: any) => [c.id, c]));
    const classByName = new Map(data.classes.map((c: any) => [c.nom, c]));

    // Élèves (uniquement si le rôle a accès aux dossiers élèves)
    const canSeeStudents = hasTabAccess(userRole, 'students') || hasTabAccess(userRole, 'apprenants') || hasTabAccess(userRole, 'classes');
    if (canSeeStudents) {
      data.students.filter((s: any) => {
        const cls = classById.get(s.classId) || classByName.get(s.nomClasse);
        const cycle = cls?.cycleCode || s.cycle || '';
        const salle = cls?.salle || s.salle || '';
        const option = s.optionCode || s.optionEPST || cls?.optionCode || '';
        const hay = [
          s.prenom, s.nom, s.postnom, s.registrationNumber, s.matricule,
          s.nomClasse, salle, cycle, option, s.nomParent
        ].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      }).slice(0, 8).forEach((s: any) => {
        const cls = classById.get(s.classId) || classByName.get(s.nomClasse);
        const cycle = cls?.cycleCode ? ` · ${cls.cycleCode}` : '';
        results.push({
          id: `std-${s.id}`,
          type: 'student',
          title: `${s.prenom || ''} ${s.nom || ''}`.trim(),
          subtitle: `${s.nomClasse || 'Élève'}${cycle}`,
          badge: s.registrationNumber || s.matricule || 'Élève',
          icon: StudentIcon,
          iconColor: '#10b981',
          action: 'students',
          meta: s,
        });
      });
    }

    // Classes
    const canSeeClasses = hasTabAccess(userRole, 'classes');
    if (canSeeClasses) {
      data.classes.filter((c: any) =>
        `${c.nom || ''} ${c.salle || ''} ${c.cycleCode || ''} ${c.optionCode || ''}`.toLowerCase().includes(q)
      ).slice(0, 5).forEach((c: any) => results.push({
        id: `cls-${c.id}`,
        type: 'class',
        title: c.nom,
        subtitle: c.salle || 'Classe',
        badge: 'Classe',
        icon: School,
        iconColor: '#f59e0b',
        action: 'classes',
        meta: c,
      }));
    }

    // Personnel
    const canSeeStaff = hasTabAccess(userRole, 'teachers') || hasTabAccess(userRole, 'hr');
    if (canSeeStaff) {
      data.staff.filter((p: any) =>
        `${p.prenom || ''} ${p.nom || ''} ${p.fonction || ''}`.toLowerCase().includes(q)
      ).slice(0, 3).forEach((p: any) => results.push({
        id: `stf-${p.id}`,
        type: 'staff',
        title: `${p.prenom || ''} ${p.nom || ''}`.trim(),
        subtitle: p.fonction || p.role || 'Personnel',
        badge: p.fonction || 'Staff',
        icon: UserCheck,
        iconColor: '#8b5cf6',
        action: p.fonction?.toLowerCase().includes('enseignant') ? 'teachers' : 'hr',
        meta: p,
      }));
    }

    // Factures
    const canSeeInvoices = hasTabAccess(userRole, 'invoices') || hasTabAccess(userRole, 'cash');
    if (canSeeInvoices) {
      data.invoices.filter((inv: any) =>
        `${inv.id || ''} ${(inv as any).nomEleve || inv.studentId || ''}`.toLowerCase().includes(q)
      ).slice(0, 3).forEach((inv: any) => results.push({
        id: `inv-${inv.id}`,
        type: 'invoice',
        title: `Facture ${(inv as any).nomEleve || inv.studentId || inv.id}`,
        subtitle: `Solde: ${(inv as any).soldeRestant || 0}`,
        badge: 'Facture',
        icon: Receipt,
        iconColor: '#ef4444',
        action: 'invoices',
        meta: inv,
      }));
    }

    return results;
  }, [q, data, userRole]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, allResults.length]);

  const handleSelect = useCallback((result: SearchResult) => {
    if (result.meta || result.title) {
      setSearchTarget({
        tab: result.action,
        id: result.meta?.id,
        name: result.title,
        type: result.type,
      });
    }
    onNavigate(result.action);
    onClose();
  }, [onNavigate, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (allResults.length > 0 ? (prev + 1) % allResults.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (allResults.length > 0 ? (prev - 1 + allResults.length) % allResults.length : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allResults[selectedIndex];
        if (selected) handleSelect(selected);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allResults, selectedIndex, onClose, handleSelect]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-14 sm:pt-20 px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200"
        style={{
          background: 'var(--sidebar-popover-bg)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          className="p-4 sm:p-5 border-b flex items-center gap-3"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Search className="w-4.5 h-4.5" style={{ color: '#6366f1' }} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un élève, une classe, un personnel, une facture ou un module..."
            className="flex-1 bg-transparent border-none text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-0 min-w-0"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-500/15 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
            title="Fermer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-1" style={{ background: 'var(--bg-surface)' }}>
          {loading && (
            <div className="py-10 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-400/30 border-t-indigo-500 rounded-full animate-spin" />
              Chargement des données...
            </div>
          )}

          {!loading && !q && (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <FileSearch className="w-8 h-8 mx-auto text-indigo-400 opacity-50" />
              <p className="text-sm font-medium">Recherche unifiée ECOLISA</p>
              <p className="text-xs">Tapez un nom d\'élève, une classe, un membre du personnel ou un module.</p>
            </div>
          )}

          {!loading && q && allResults.length === 0 && (
            <div className="py-10 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-400 opacity-50" />
              <p className="text-sm font-medium">Aucun résultat pour "{query}"</p>
              <p className="text-xs">Essayez un autre mot-clé ou vérifiez l\'orthographe.</p>
            </div>
          )}

          {!loading && q && allResults.length > 0 && (
            <div className="space-y-2">
              {allResults.map((result, idx) => {
                const Icon = result.icon;
                const isSelected = idx === selectedIndex;
                const typeLabels: Record<ResultType, string> = {
                  module: 'Module',
                  student: 'Élève',
                  class: 'Classe',
                  staff: 'Personnel',
                  invoice: 'Facture',
                };

                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/35'
                        : 'hover:bg-slate-500/5 border-transparent'
                    }`}
                    style={{ background: isSelected ? 'rgba(99,102,241,0.08)' : 'transparent' }}
                  >
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${result.iconColor}15`, color: result.iconColor }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {result.title}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                          style={{ background: `${result.iconColor}12`, color: result.iconColor }}
                        >
                          {typeLabels[result.type]}
                        </span>
                        {result.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-500/10 text-slate-500">
                            {result.badge}
                          </span>
                        )}
                      </div>
                      {result.subtitle && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{result.subtitle}</p>
                      )}
                    </div>

                    <ArrowRight
                      className={`w-4 h-4 transition-all ${
                        isSelected ? 'text-indigo-500 translate-x-0 opacity-100' : 'text-slate-400 -translate-x-1 opacity-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px] text-slate-400"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 text-[10px]">↓</kbd>
              <span className="text-slate-500">Naviguer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 text-[10px]">↵</kbd>
              <span className="text-slate-500">Ouvrir</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">{allResults.length} résultat{allResults.length > 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1 text-indigo-400">
              <Command className="w-3.5 h-3.5" />
              <span className="font-medium">K</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
