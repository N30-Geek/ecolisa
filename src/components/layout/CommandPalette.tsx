import React, { useState, useEffect, useRef } from 'react';
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
  X
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
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
  {
    id: 'dashboard',
    label: 'Tableau de Bord Exécutif',
    category: 'Vue Générale',
    categoryBadge: 'Synthèse',
    icon: LayoutDashboard,
    description: 'Vue d\'ensemble de l\'établissement, indicateurs clés et statistiques',
    shortcut: 'G D'
  },
  {
    id: 'students',
    label: 'Inscriptions & Admissions',
    category: 'Pédagogie',
    categoryBadge: 'Élèves',
    icon: GraduationCap,
    description: 'Gestion des admissions, réinscriptions et dossiers élèves',
    shortcut: 'P I'
  },
  {
    id: 'apprenants',
    label: 'Dossiers des Apprenants',
    category: 'Pédagogie',
    categoryBadge: 'Élèves',
    icon: Users,
    description: 'Fiches individuelles des élèves, historiques et parcours',
  },
  {
    id: 'classes',
    label: 'Classes & Promotions',
    category: 'Pédagogie',
    categoryBadge: 'Structure',
    icon: School,
    description: 'Gestion des salles de classe, effectifs et répartition',
  },
  {
    id: 'schedule',
    label: 'Emplois du Temps & Horaires',
    category: 'Pédagogie',
    categoryBadge: 'Planning',
    icon: Calendar,
    description: 'Planning des cours, affectations des enseignants et salles',
  },
  {
    id: 'grades',
    label: 'Bulletins, Cotes & Délibérations',
    category: 'Pédagogie',
    categoryBadge: 'Évaluations',
    icon: ClipboardCheck,
    description: 'Encodage des points, calcul des moyennes et édition des bulletins',
  },
  {
    id: 'invoices',
    label: 'Factures & Recouvrement Minerval',
    category: 'Finances',
    categoryBadge: 'Comptabilité',
    icon: Receipt,
    description: 'Émission des frais scolaires, reçus de paiement et relances',
    shortcut: 'F M'
  },
  {
    id: 'payroll',
    label: 'Gestion de Paie & Primes',
    category: 'Finances',
    categoryBadge: 'RH',
    icon: Banknote,
    description: 'Bulletins de paie des enseignants et agents scolaires',
  },
  {
    id: 'expenses',
    label: 'Gestion de Caisse & Dépenses',
    category: 'Finances',
    categoryBadge: 'Trésorerie',
    icon: Wallet,
    description: 'Suivi des sorties de caisse, approvisionnements et pièces de banque',
  },
  {
    id: 'discipline',
    label: 'Discipline & Conduites',
    category: 'Vie Scolaire',
    categoryBadge: 'Discipline',
    icon: Scale,
    description: 'Registre de retenues, avertissements et suivi comportemental',
  },
  {
    id: 'hr',
    label: 'Dossiers Personnel & Agents',
    category: 'Administration',
    categoryBadge: 'Personnel',
    icon: UserCheck,
    description: 'Registre matricule des enseignants et administratifs',
  },
  {
    id: 'documents',
    label: 'Documents Officiels EPST RDC',
    category: 'Administration',
    categoryBadge: 'EPST',
    icon: FileText,
    description: 'Génération des palmarès, attestations de fréquentation et bordereaux',
    shortcut: 'A D'
  },
  {
    id: 'messages',
    label: 'Messagerie & Communications SMS',
    category: 'Communication',
    categoryBadge: 'Parents',
    icon: MessageSquare,
    description: 'Envoi de communiqués aux parents et notifications système',
  },
  {
    id: 'infirmerie',
    label: 'Santé & Infirmerie Scolaire',
    category: 'Services',
    categoryBadge: 'Santé',
    icon: HeartPulse,
    description: 'Fiches médicales, soins d\'urgence et passages à l\'infirmerie',
  },
  {
    id: 'cantine',
    label: 'Cantine & Restauration',
    category: 'Services',
    categoryBadge: 'Services',
    icon: Utensils,
    description: 'Abonnements cantine, tickets repas et gestion des menus',
  },
  {
    id: 'transport',
    label: 'Transport Scolaire & Lignes',
    category: 'Services',
    categoryBadge: 'Services',
    icon: Bus,
    description: 'Circuits de ramassage scolaire, abonnements et chauffeurs',
  },
  {
    id: 'library',
    label: 'Bibliothèque & CDI',
    category: 'Ressources',
    categoryBadge: 'Livres',
    icon: BookOpen,
    description: 'Gestion des ouvrages, prêts et manuels scolaires',
  },
  {
    id: 'license',
    label: 'Licence & Synchronisation Offline',
    category: 'Système',
    categoryBadge: 'Sécurité',
    icon: ShieldCheck,
    description: 'Statut de licence Ed25519, réplication SQLite P2P et Cloud',
  },
  {
    id: 'settings',
    label: 'Paramètres du Système',
    category: 'Système',
    categoryBadge: 'Config',
    icon: Settings,
    description: 'Configuration générale, rôles d\'accès et sauvegardes',
    shortcut: 'S S'
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = COMMAND_ITEMS.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          onNavigate(filteredItems[selectedIndex].id);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onNavigate, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-200"
        style={{
          background: 'var(--sidebar-popover-bg)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div
          className="p-4 border-b flex items-center gap-3 relative"
          style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
        >
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un module, fonction ou raccourci... (ex: Factures, Bulletins)"
            className="w-full bg-transparent border-none text-sm font-bold placeholder:text-slate-400 focus:outline-none focus:ring-0"
            style={{ color: 'var(--text-primary)' }}
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-mono font-bold">
              <span>ESC pour fermer</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 divide-y divide-slate-500/10">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-indigo-400 opacity-60 animate-pulse" />
              <p className="font-bold text-sm">Aucun module trouvé pour "{query}"</p>
              <p className="text-xs">Essayez un autre mot-clé comme "Élèves", "Comptabilité" ou "Paramètres".</p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const ItemIcon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-150 text-left group cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 border border-indigo-500/40 shadow-xs'
                      : 'hover:bg-slate-500/10 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500 scale-105 shadow-sm'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                      <ItemIcon className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {item.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-500/15 text-slate-400 border border-slate-500/20">
                          {item.categoryBadge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.shortcut && (
                      <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-mono font-bold">
                        {item.shortcut}
                      </span>
                    )}
                    <ArrowRight
                      className={`w-4 h-4 text-indigo-400 transition-transform ${
                        isSelected ? 'translate-x-1 opacity-100' : 'opacity-0 -translate-x-1'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between text-[11px] text-slate-400 font-semibold"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-500/20 border border-slate-500/30 text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-500/20 border border-slate-500/30 text-[10px]">↓</kbd> Naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-500/20 border border-slate-500/30 text-[10px]">↵</kbd> Sélectionner
            </span>
          </div>

          <div className="flex items-center gap-1 text-indigo-400 font-bold">
            <Command className="w-3.5 h-3.5" />
            <span>Ecolisa QuickNav</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
