import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Pencil, Trash2, Copy, Check,
  Tag, Loader2, School, GraduationCap, X, Save, AlertTriangle,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { LocalDatabaseService } from '../../services/localDatabase';
import { FeeTypeFormModal } from './FeeTypeFormModal';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { isFeeTypeApplicable } from '../../utils/feeFilters';
import { MODE_PAIEMENT_LABELS } from '../../utils/feeTranches';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import type {
  TypeFraisScolaire, AnneeScolaireConfig, ClasseScolaire, CategorieFrais, FactureEleve, TransactionPaiement,
} from '../../types';

const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const CYCLES = ['MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'] as const;
type CycleCode = typeof CYCLES[number];

const CYCLE_LABELS: Record<CycleCode, string> = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  SECONDAIRE_CTEB: 'CTEB / Secondaire',
  HUMANITES: 'Humanités',
};

const CATEGORIES: CategorieFrais[] = [
  'FRAIS_INSCRIPTION', 'FRAIS_REINSCRIPTION', 'FRAIS_MINERVAL', 'FRAIS_CONNEXES',
  'FRAIS_KITS_EQUIPEMENTS', 'FRAIS_BUS', 'FRAIS_UNIFORME', 'FRAIS_EXAMEN',
  'FRAIS_CARTE', 'FRAIS_ACTIVITE', 'AUTRE',
];

const CATEGORIE_COLORS: Record<string, { bg: string; text: string }> = {
  FRAIS_INSCRIPTION:      { bg: 'bg-indigo-500/10',  text: 'text-indigo-600' },
  FRAIS_REINSCRIPTION:    { bg: 'bg-violet-500/10',  text: 'text-violet-600' },
  FRAIS_MINERVAL:         { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  FRAIS_CONNEXES:         { bg: 'bg-cyan-500/10',    text: 'text-cyan-600' },
  FRAIS_KITS_EQUIPEMENTS: { bg: 'bg-amber-500/10',   text: 'text-amber-600' },
  FRAIS_BUS:              { bg: 'bg-orange-500/10',  text: 'text-orange-600' },
  FRAIS_UNIFORME:         { bg: 'bg-pink-500/10',    text: 'text-pink-600' },
  FRAIS_EXAMEN:           { bg: 'bg-rose-500/10',    text: 'text-rose-600' },
  FRAIS_CARTE:            { bg: 'bg-sky-500/10',     text: 'text-sky-600' },
  FRAIS_ACTIVITE:         { bg: 'bg-teal-500/10',    text: 'text-teal-600' },
  AUTRE:                  { bg: 'bg-slate-500/10',   text: 'text-slate-600' },
};

interface ContextSelection {
  type: 'cycle' | 'class';
  cycleCode: CycleCode;
  classId?: string;
  className?: string;
}

interface FeeStats { attendu: number; paye: number }

interface Props {
  activeSchoolYear?: string;
}

export const FeesByContextPanel: React.FC<Props> = ({ activeSchoolYear }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, src?: string) => formatCurrency(n, currency, src || currency, exchangeRate);

  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<ContextSelection | null>(null);
  const [editing, setEditing] = useState<TypeFraisScolaire | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ft, cls, y, inv, pmt] = await Promise.all([
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
    ]);
    setFeeTypes(ft);
    setClasses(cls);
    setYears(y);
    setInvoices(inv);
    setPayments(pmt);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, activeSchoolYear]);

  const activeYear = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear) || years.find(y => y.statut === 'EN_COURS') || years[0], [years, activeSchoolYear]);
  const activeYearId = activeYear?.id;

  // Grouper classes par cycle
  const classesByCycle = useMemo(() => {
    const map = new Map<CycleCode, ClasseScolaire[]>();
    CYCLES.forEach(c => map.set(c, []));
    classes
      .filter(c => !activeYearId || c.schoolYearId === activeYearId)
      .forEach(c => {
        const code = ((c as any).cycleCode || c.cycleId || '').toUpperCase();
        const found = CYCLES.find(cyc => cyc === code || code.includes(cyc) || cyc.includes(code));
        if (found) map.get(found)!.push(c);
      });
    return map;
  }, [classes, activeYearId]);

  // Frais filtrés par contexte sélectionné
  const contextFees = useMemo(() => {
    if (!selection) return [];
    const cls = selection.type === 'class'
      ? classes.find(c => c.id === selection.classId) || { nom: selection.className, cycleId: selection.cycleCode }
      : undefined;
    const option = cls && (cls as any).optionCode ? (cls as any).optionCode : 'TRONC_COMMUN';
    return feeTypes.filter(ft => isFeeTypeApplicable(ft, {
      schoolYearId: activeYearId,
      classId: selection.type === 'class' ? selection.classId : undefined,
      className: cls?.nom,
      cycleId: selection.cycleCode,
      option,
      salleId: undefined,
      regime: undefined,
    }, CYCLE_LABELS));
  }, [feeTypes, selection, activeYearId, classes]);

  // Stats recouvrement par fee type
  const feeStats = useMemo(() => {
    const map = new Map<string, FeeStats>();
    contextFees.forEach(ft => map.set(ft.id, { attendu: 0, paye: 0 }));
    invoices.forEach(inv => {
      if (activeYearId && inv.anneeScolaireId !== activeYearId) return;
      if (selection?.type === 'class' && inv.nomClasse !== selection.className) return;
      inv.lignes?.forEach(l => {
        const s = map.get(l.feeTypeId);
        if (s) s.attendu += convertCurrency(l.montant, l.devise || inv.devise, currency, exchangeRate);
      });
    });
    payments.forEach(p => {
      if (activeYearId && p.anneeScolaireId !== activeYearId) return;
      p.allocations?.forEach(a => {
        const s = map.get(a.feeTypeId);
        if (s) s.paye += convertCurrency(a.montant, p.devise, currency, exchangeRate);
      });
    });
    return map;
  }, [contextFees, invoices, payments, selection, activeYearId, currency, exchangeRate]);

  const handleSave = async (ft: TypeFraisScolaire) => {
    if (ft.id) await LocalDatabaseService.updateFeeType(ft.id, ft);
    else await LocalDatabaseService.addFeeType(ft);
    LocalDatabaseService.logAction(ft.id ? 'MODIFICATION' : 'CREATION', 'FRAIS', 'TypeFraisScolaire', ft.id || ft.nom, { nom: ft.nom, montant: ft.montant });
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce type de frais ?')) return;
    await LocalDatabaseService.deleteFeeType(id);
    LocalDatabaseService.logAction('SUPPRESSION', 'FRAIS', 'TypeFraisScolaire', id);
    load();
  };

  const handleDuplicate = async (srcId: string, targetClassId: string) => {
    const src = feeTypes.find(f => f.id === srcId);
    if (!src) return;
    const clone: TypeFraisScolaire = { ...src, id: uuid(), classId: targetClassId };
    await LocalDatabaseService.addFeeType(clone);
    setDuplicating(null);
    load();
  };

  const startNew = () => {
    setEditing({
      id: '',
      code: '',
      nom: '',
      categorie: 'FRAIS_MINERVAL',
      montant: 0,
      devise: currency as string,
      obligatoire: true,
      schoolYearId: activeYear?.id,
      anneeScolaireId: activeYear?.id,
      cycleId: selection?.cycleCode || 'TOUS',
      classId: selection?.type === 'class' ? selection.classId : undefined,
      optionCode: 'TOUS',
      regime: 'TOUS',
      actif: true,
      modePaiement: 'UNIQUE',
      nombreTranches: 1,
      tranches: [{ id: uuid(), nom: 'Paiement unique', montant: 0, devise: currency as string, ordre: 1 }],
    });
  };

  // Sélectionne automatiquement le premier cycle avec des classes si rien n'est choisi
  useEffect(() => {
    if (selection) return;
    const firstWithClasses = CYCLES.find(c => (classesByCycle.get(c)?.length || 0) > 0);
    if (firstWithClasses) setSelection({ type: 'cycle', cycleCode: firstWithClasses });
  }, [selection, classesByCycle]);

  return (
    <div className="flex flex-col rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', minHeight: 520 }}>
      {/* ── Navigation par Contexte (horizontale) ── */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
        <div className="p-3">
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Navigation par Contexte</p>
          <div className="flex items-center gap-2 overflow-x-auto sidebar-scroll pb-1">
            {CYCLES.map(cycle => {
              const cycleClasses = classesByCycle.get(cycle) || [];
              const isSelected = selection?.cycleCode === cycle;
              return (
                <button
                  key={cycle}
                  onClick={() => setSelection({ type: 'cycle', cycleCode: cycle })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-500/10'
                  }`}
                >
                  <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                  <span>{CYCLE_LABELS[cycle]}</span>
                  {cycleClasses.length > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-500/10 text-slate-500'}`}>
                      {cycleClasses.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste des classes du cycle sélectionné */}
        {selection?.cycleCode && (classesByCycle.get(selection.cycleCode)?.length || 0) > 0 && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto sidebar-scroll">
              {classesByCycle.get(selection.cycleCode)!.map(cls => {
                const isClassSelected = selection?.type === 'class' && selection.classId === cls.id;
                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelection({ type: 'class', cycleCode: selection.cycleCode, classId: cls.id, className: cls.nom })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border ${
                      isClassSelected
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
                        : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500/30 hover:bg-slate-500/5'
                    }`}
                  >
                    <School className={`w-3 h-3 shrink-0 ${isClassSelected ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <span>{cls.nom}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Contenu principal ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selection ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-sunken)' }}>
              <GraduationCap className="w-7 h-7 text-indigo-400" />
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Sélectionnez un cycle ou une classe</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sélectionnez un cycle ci-dessus, puis une classe pour voir et définir les frais.</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-2">
                  {selection.type === 'cycle'
                    ? <GraduationCap className="w-4 h-4 text-indigo-500" />
                    : <School className="w-4 h-4 text-indigo-500" />}
                  <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    {selection.type === 'cycle' ? CYCLE_LABELS[selection.cycleCode] : selection.className}
                  </h3>
                  {selection.type === 'class' && (
                    <span className="text-[10px] text-slate-400">({CYCLE_LABELS[selection.cycleCode]})</span>
                  )}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {contextFees.length} type{contextFees.length !== 1 ? 's' : ''} de frais défini{contextFees.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={startNew} className="btn-primary flex items-center gap-2" style={{ fontSize: '11px', padding: '7px 14px' }}>
                <Plus className="w-3.5 h-3.5" /> Définir un frais
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : contextFees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
                  <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Aucun frais défini pour ce contexte</p>
                  <p className="text-xs mt-1 text-slate-400">Cliquez sur "Définir un frais" pour commencer.</p>
                  <button onClick={startNew} className="mt-4 btn-primary flex items-center gap-2" style={{ fontSize: '11px' }}>
                    <Plus className="w-3.5 h-3.5" /> Premier frais
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {contextFees.map(ft => {
                    const s = feeStats.get(ft.id) || { attendu: 0, paye: 0 };
                    const taux = s.attendu > 0 ? Math.round((s.paye / s.attendu) * 100) : 0;
                    const col = CATEGORIE_COLORS[ft.categorie] || CATEGORIE_COLORS.AUTRE;
                    return (
                      <div key={ft.id} className="group p-3.5 rounded-xl border flex items-center gap-4 hover:border-indigo-500/30 transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                        <div className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${col.bg} ${col.text}`}>
                          {ft.categorie.replace(/FRAIS_/, '').replace(/_/g, ' ')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{ft.nom}</p>
                          <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">{fmt(ft.montant, ft.devise)}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">{MODE_PAIEMENT_LABELS[ft.modePaiement || 'UNIQUE']} · {ft.nombreTranches || 1} tranche{(ft.nombreTranches || 1) > 1 ? 's' : ''}</p>
                        </div>
                        {s.attendu > 0 && (
                          <div className="shrink-0 w-24">
                            <div className="flex items-center justify-between text-[9px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                              <span>Recouvré</span><span>{taux}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${taux >= 80 ? 'bg-emerald-500' : taux >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${taux}%` }} />
                            </div>
                          </div>
                        )}
                        {ft.obligatoire && (
                          <div className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-emerald-500/15">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </div>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditing(ft)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-500/15 text-indigo-500" title="Modifier">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDuplicating(ft.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-500/15 text-amber-500" title="Dupliquer vers...">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(ft.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/15 text-rose-500" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {editing && (
        <FeeTypeFormModal fee={editing} years={years} classes={classes} selection={selection} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
      {duplicating && (
        <DuplicateModal sourceId={duplicating} classes={classes} onClose={() => setDuplicating(null)} onDuplicate={handleDuplicate} />
      )}
    </div>
  );
};

// ─── Modal Duplication ────────────────────────────────────────────────────────
const DuplicateModal: React.FC<{
  sourceId: string; classes: ClasseScolaire[];
  onClose: () => void; onDuplicate: (srcId: string, targetClassId: string) => void;
}> = ({ sourceId, classes, onClose, onDuplicate }) => {
  const [targetClassId, setTargetClassId] = useState('');
  const classOptions = classes.map(c => ({ value: c.id, label: c.nom }));
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border p-5 animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600"><Copy className="w-4 h-4" /></div>
          <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Dupliquer ce frais vers…</h3>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-500/10 text-slate-400"><X className="w-3.5 h-3.5" /></button>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Classe cible</label>
          <CustomSelect options={classOptions} value={targetClassId} onChange={setTargetClassId} />
        </div>
        <button onClick={() => { if (targetClassId) { onDuplicate(sourceId, targetClassId); onClose(); } }} disabled={!targetClassId} className="w-full rounded-xl py-2.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: '#f59e0b', color: 'white' }}>
          <Copy className="w-4 h-4" /> Dupliquer
        </button>
      </div>
    </div>,
    document.body
  );
};
