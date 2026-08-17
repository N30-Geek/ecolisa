import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Check, Layers, Users, Plus, Trash2, CheckCircle2, AlertTriangle, School, Loader2,
} from 'lucide-react';
import { CategorieFrais, ClasseScolaire } from '../../types';
import { NumberInput } from '../common/NumberInput';

export const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// ─── Référentiel des Cycles & Niveaux EPST ────────────────────────────────
export type CodeCycleWizard = 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';

export const CYCLES_REF: { code: CodeCycleWizard; nom: string; couleur: string }[] = [
  { code: 'MATERNELLE', nom: 'Cycle Maternelle & Éveil (3–5 ans)', couleur: 'amber' },
  { code: 'PRIMAIRE', nom: 'Cycle Primaire (1ère – 6ème)', couleur: 'emerald' },
  { code: 'SECONDAIRE_CTEB', nom: 'Cycle Terminal d\'Éducation de Base (7ème – 8ème CTEB)', couleur: 'sky' },
  { code: 'HUMANITES', nom: 'Humanités Générales, Scientifiques & Techniques (1ère – 4ème)', couleur: 'indigo' },
];

export const NIVEAUX_PAR_CYCLE: Record<CodeCycleWizard, string[]> = {
  MATERNELLE: ['1ère Maternelle', '2ème Maternelle', '3ème Maternelle'],
  PRIMAIRE: ['1ère Primaire', '2ème Primaire', '3ème Primaire', '4ème Primaire', '5ème Primaire', '6ème Primaire'],
  SECONDAIRE_CTEB: ['7ème CTEB', '8ème CTEB'],
  HUMANITES: ['1ère Humanités', '2ème Humanités', '3ème Humanités', '4ème Humanités'],
};

export const CATEGORIES_FRAIS: { value: CategorieFrais; label: string }[] = [
  { value: 'FRAIS_INSCRIPTION', label: 'Frais d\'Inscription' },
  { value: 'FRAIS_REINSCRIPTION', label: 'Frais de Réinscription' },
  { value: 'FRAIS_MINERVAL', label: 'Minerval Scolaire' },
  { value: 'FRAIS_CONNEXES', label: 'Frais Connexes' },
  { value: 'FRAIS_KITS_EQUIPEMENTS', label: 'Kits & Équipements' },
  { value: 'FRAIS_BUS', label: 'Transport / Bus Scolaire' },
  { value: 'FRAIS_UNIFORME', label: 'Uniforme Scolaire' },
  { value: 'FRAIS_EXAMEN', label: 'Frais d\'Examen' },
  { value: 'FRAIS_CARTE', label: 'Carte d\'Élève / Badge' },
  { value: 'FRAIS_ACTIVITE', label: 'Activités Parascolaires' },
  { value: 'AUTRE', label: 'Autre (Saisie Manuelle)' },
];

// ─── Structures de travail (brouillon avant persistance) ──────────────────
export interface DraftSection {
  id: string;
  cycleCode: CodeCycleWizard;
  niveau: string;
  label: string;
  capacite: number;
}

export interface DraftFee {
  id: string;
  cycleCode: CodeCycleWizard | 'TOUS';
  cible: string; // niveau précis OU 'TRONC_COMMUN' pour tout le cycle
  categorie: CategorieFrais;
  nomPersonnalise?: string;
  montant: number;
  devise: string;
  priorite: 'OBLIGATOIRE' | 'REPARTI';
  modePaiement: 'UNIQUE' | 'MENSUEL' | 'TRIMESTRIEL' | 'SEMESTRIEL' | 'PERSONNALISE';
  nombreTranches: number;
}

export interface ExistingYearSummary {
  id: string;
  nom: string;
  statut: string;
  debut: string;
  fin: string;
  nombreElevesTotal?: number;
}

export const feeLabel = (f: DraftFee) => f.nomPersonnalise || CATEGORIES_FRAIS.find(c => c.value === f.categorie)?.label || f.categorie;
export const feeCibleLabel = (f: DraftFee) => {
  if (f.cycleCode === 'TOUS') return 'Toute l\'école';
  const cycleNom = CYCLES_REF.find(c => c.code === f.cycleCode)?.nom || f.cycleCode;
  return f.cible === 'TRONC_COMMUN' ? `${cycleNom} (Tronc Commun)` : `${cycleNom} · ${f.cible}`;
};

export const parseClassesToDraft = (classes: ClasseScolaire[]) => {
  const selected: Record<string, boolean> = {};
  const sections: DraftSection[] = [];

  for (const cls of classes) {
    const cycleCode = (cls.cycleId || cls.cycleCode) as CodeCycleWizard;
    if (!cycleCode || !NIVEAUX_PAR_CYCLE[cycleCode]) continue;

    const niveau = NIVEAUX_PAR_CYCLE[cycleCode].find(n => cls.nom?.startsWith(n));
    if (!niveau) continue;

    selected[`${cycleCode}|${niveau}`] = true;
    const label = cls.nom.slice(niveau.length).trim() || 'A';
    sections.push({
      id: cls.id || uuid(),
      cycleCode,
      niveau,
      label,
      capacite: cls.capacite || 45,
    });
  }

  return { selected, sections };
};

// ─── Modal : Sélection des Classes RDC ────────────────────────────────────
interface ClassPickerModalProps {
  activeCycles: CodeCycleWizard[];
  selectedNiveaux: Record<string, boolean>;
  onToggle: (key: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const ClassPickerModal: React.FC<ClassPickerModalProps> = ({
  activeCycles, selectedNiveaux, onToggle, onConfirm, onClose,
}) => {
  const [search, setSearch] = useState('');

  const totalSelected = Object.values(selectedNiveaux).filter(Boolean).length;

  const setAll = (value: boolean, cycleCode?: CodeCycleWizard) => {
    const cycles = cycleCode ? [cycleCode] : activeCycles;
    cycles.forEach(c => {
      NIVEAUX_PAR_CYCLE[c].forEach(niveau => {
        const key = `${c}|${niveau}`;
        if (selectedNiveaux[key] !== value) onToggle(key);
      });
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-black flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" /> Sélectionner les Classes RDC à Ajouter
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une classe, section ou option..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-[11px] font-bold">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setAll(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1">
                <Check className="w-3 h-3" /> Tout sélectionner
              </button>
              <button type="button" onClick={() => setAll(false)} className="text-slate-400 hover:underline cursor-pointer">Tout désélectionner</button>
            </div>
            <span className="text-slate-400">{totalSelected} classe(s) sélectionnée(s)</span>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 sidebar-scroll space-y-5">
          {activeCycles.length === 0 && (
            <p className="text-xs text-amber-500 font-semibold text-center py-6">Aucun cycle actif. Retournez à l'étape précédente.</p>
          )}
          {activeCycles.map(cycleCode => {
            const niveaux = NIVEAUX_PAR_CYCLE[cycleCode].filter(n => n.toLowerCase().includes(search.toLowerCase()));
            if (niveaux.length === 0) return null;
            const cycleInfo = CYCLES_REF.find(c => c.code === cycleCode)!;
            const countSelected = NIVEAUX_PAR_CYCLE[cycleCode].filter(n => selectedNiveaux[`${cycleCode}|${n}`]).length;
            return (
              <div key={cycleCode}>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{cycleInfo.nom.split('(')[0].trim()}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black">{countSelected}</span>
                  <button type="button" onClick={() => setAll(true, cycleCode)} className="ml-auto text-[10.5px] font-bold text-indigo-500 hover:underline cursor-pointer flex items-center gap-1">
                    <Check className="w-3 h-3" /> Sélectionner
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {niveaux.map(niveau => {
                    const key = `${cycleCode}|${niveau}`;
                    const checked = !!selectedNiveaux[key];
                    return (
                      <label
                        key={key}
                        className={`px-3 py-2 rounded-lg border flex items-center gap-2 cursor-pointer text-xs font-semibold transition-all ${
                          checked ? 'border-indigo-500 bg-indigo-500/10' : 'hover:border-indigo-500/40'
                        }`}
                        style={{ borderColor: checked ? '#6366f1' : 'var(--border)' }}
                      >
                        <input type="checkbox" checked={checked} onChange={() => onToggle(key)} className="w-3.5 h-3.5 rounded accent-indigo-600" />
                        <span style={{ color: 'var(--text-primary)' }}>{niveau}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" /> Ajouter les Classes Sélectionnées
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Modal : Ajout des Sections / Salles pour un Niveau ───────────────────
interface SectionsModalProps {
  cycleCode: CodeCycleWizard;
  niveau: string;
  existingLabels: string[];
  onConfirm: (rows: { label: string; capacite: number }[]) => void;
  onClose: () => void;
}

export const SectionsModal: React.FC<SectionsModalProps> = ({ niveau, existingLabels, onConfirm, onClose }) => {
  const defaultLabels = ['A', 'B', 'C'].filter(l => !existingLabels.includes(l));
  const [labelStyle, setLabelStyle] = useState<'ALPHA' | 'NUM'>('ALPHA');
  const [rows, setRows] = useState<{ id: string; label: string; capacite: number; checked: boolean }[]>(
    (defaultLabels.length > 0 ? defaultLabels : ['A', 'B', 'C']).map(l => ({ id: uuid(), label: l, capacite: 45, checked: true }))
  );

  const applyLabelStyle = (style: 'ALPHA' | 'NUM') => {
    setLabelStyle(style);
    const alpha = ['A', 'B', 'C', 'D', 'E', 'F'];
    setRows(prev => prev.map((r, i) => ({ ...r, label: style === 'ALPHA' ? (alpha[i] || `${i + 1}`) : `${i + 1}` })));
  };

  const addRow = () => {
    setRows(prev => [...prev, { id: uuid(), label: labelStyle === 'ALPHA' ? (['A','B','C','D','E','F'][prev.length] || `${prev.length + 1}`) : `${prev.length + 1}`, capacite: 45, checked: true }]);
  };

  const removeRow = (id: string) => setRows(prev => prev.filter(r => r.id !== id));

  const updateRow = (id: string, patch: Partial<{ label: string; capacite: number; checked: boolean }>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const handleConfirm = () => {
    const selected = rows.filter(r => r.checked && r.label.trim());
    if (selected.length === 0) return;
    onConfirm(selected.map(r => ({ label: r.label.trim(), capacite: r.capacite || 45 })));
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Sections / Salles Physiques</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Niveau : <strong style={{ color: 'var(--text-primary)' }}>{niveau}</strong></p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 sidebar-scroll space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">Étiquetage :</span>
            <button
              type="button"
              onClick={() => applyLabelStyle('ALPHA')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${labelStyle === 'ALPHA' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500'}`}
              style={{ borderColor: labelStyle === 'ALPHA' ? undefined : 'var(--border)' }}
            >
              A, B, C
            </button>
            <button
              type="button"
              onClick={() => applyLabelStyle('NUM')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${labelStyle === 'NUM' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500'}`}
              style={{ borderColor: labelStyle === 'NUM' ? undefined : 'var(--border)' }}
            >
              1, 2, 3
            </button>
          </div>

          <div className="space-y-2">
            {rows.map(row => (
              <div key={row.id} className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <input
                  type="checkbox"
                  checked={row.checked}
                  onChange={e => updateRow(row.id, { checked: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600 shrink-0"
                />
                <input
                  type="text"
                  value={row.label}
                  onChange={e => updateRow(row.id, { label: e.target.value })}
                  className="w-16 px-2 py-1.5 rounded-lg border text-xs font-black text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                />
                <span className="text-[11px] text-slate-400 shrink-0">{niveau}</span>
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <NumberInput
                    value={row.capacite}
                    onChange={v => updateRow(row.id, { capacite: v || 45 })}
                    min={5}
                    max={120}
                    integer
                    placeholder="45"
                    className="w-16 px-2 py-1.5 rounded-lg border text-xs font-bold text-center"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                  />
                  <span className="text-[10px] text-slate-400">élèves</span>
                </div>
                <button type="button" onClick={() => removeRow(row.id)} className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="w-full py-2 rounded-xl border border-dashed text-xs font-bold text-slate-500 hover:border-indigo-500 hover:text-indigo-500 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            style={{ borderColor: 'var(--border)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter une Autre Section
          </button>
        </div>

        <div className="p-4 border-t flex items-center gap-2 shrink-0" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" /> Ajouter les Sections Sélectionnées
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
