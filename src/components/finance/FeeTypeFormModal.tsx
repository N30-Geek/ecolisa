import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Tag, Calculator, Calendar, Trash2, Plus, AlertTriangle, Wallet } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { CustomDatePicker } from '../common/CustomDatePicker';
import type { TypeFraisScolaire, AnneeScolaireConfig, ClasseScolaire, CategorieFrais, FraisTranche, ModePaiementFrais } from '../../types';
import { genererTranches, tranchesDefautParMode, MODE_PAIEMENT_LABELS, uuid } from '../../utils/feeTranches';

interface FeeTypeFormModalProps {
  fee: TypeFraisScolaire;
  years?: AnneeScolaireConfig[];
  classes?: ClasseScolaire[];
  selection?: { type: 'cycle' | 'class'; cycleCode?: string; classId?: string; className?: string } | null;
  onClose: () => void;
  onSave: (ft: TypeFraisScolaire) => void;
}

const CATEGORIES: { value: CategorieFrais; label: string }[] = [
  { value: 'FRAIS_INSCRIPTION', label: 'Frais d\'Inscription' },
  { value: 'FRAIS_REINSCRIPTION', label: 'Frais de Réinscription' },
  { value: 'FRAIS_MINERVAL', label: 'Minerval Scolaire' },
  { value: 'FRAIS_CONNEXES', label: 'Frais Connexes' },
  { value: 'FRAIS_KITS_EQUIPEMENTS', label: 'Kits & Équipements' },
  { value: 'FRAIS_BUS', label: 'Transport / Bus' },
  { value: 'FRAIS_UNIFORME', label: 'Uniforme Scolaire' },
  { value: 'FRAIS_EXAMEN', label: 'Frais d\'Examen' },
  { value: 'FRAIS_CARTE', label: 'Carte d\'Élève / Badge' },
  { value: 'FRAIS_ACTIVITE', label: 'Activités Parascolaires' },
  { value: 'AUTRE', label: 'Autre' },
];

const REGIMES = ['TOUS', 'EXTERNE', 'INTERNE', 'SEMI_INTERNE'] as const;
const CYCLES = ['TOUS', 'MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'] as const;

const MODE_OPTIONS: { value: ModePaiementFrais; label: string; tranchesDefaut: number }[] = (Object.keys(MODE_PAIEMENT_LABELS) as ModePaiementFrais[]).map(k => ({
  value: k,
  label: MODE_PAIEMENT_LABELS[k],
  tranchesDefaut: tranchesDefautParMode[k],
}));

export const FeeTypeFormModal: React.FC<FeeTypeFormModalProps> = ({
  fee, years = [], classes = [], selection, onClose, onSave,
}) => {
  const { currencies, format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const [form, setForm] = useState<TypeFraisScolaire>({ ...fee });
  const [mode, setMode] = useState<ModePaiementFrais>(fee.modePaiement || 'UNIQUE');
  const [nombreTranches, setNombreTranches] = useState(fee.nombreTranches || 1);

  const activeYear = useMemo(() => {
    return years.find(y => y.id === form.schoolYearId || y.id === form.anneeScolaireId)
      || years.find(y => y.statut === 'EN_COURS')
      || years[0];
  }, [years, form.schoolYearId, form.anneeScolaireId]);

  const anneeDebut = activeYear?.debut;
  const anneeFin = activeYear?.fin;

  const cibleLabel = useMemo(() => {
    if (selection?.type === 'class') return selection.className;
    if (form.cycleId && form.cycleId !== 'TOUS') return form.cycleId;
    return '';
  }, [selection, form.cycleId]);

  // Génération des tranches quand le mode, le nombre, l'année ou la devise changent
  useEffect(() => {
    const expectedTranches = mode === 'UNIQUE' ? 1 : mode === 'PERSONNALISE' ? Math.max(1, nombreTranches) : MODE_OPTIONS.find(m => m.value === mode)?.tranchesDefaut || 1;
    const shouldRegen =
      !form.tranches ||
      form.tranches.length !== expectedTranches ||
      form.tranches[0]?.devise !== form.devise;

    if (shouldRegen) {
      setForm(prev => ({
        ...prev,
        modePaiement: mode,
        nombreTranches: expectedTranches,
        tranches: genererTranches(mode, expectedTranches, prev.montant || 0, prev.devise || 'USD', anneeDebut, anneeFin, cibleLabel),
      }));
    }
  }, [mode, nombreTranches, anneeDebut, anneeFin, cibleLabel, form.devise]);

  // Bloque le scroll body
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const currencyOptions = useMemo(() =>
    currencies.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` })),
    [currencies]
  );

  const yearOptions = useMemo(() => years.map(y => ({ value: y.id, label: `${y.nom} (${y.statut})` })), [years]);

  const cycleOptions = CYCLES.map(c => ({ value: c, label: c }));

  const regimeOptions = REGIMES.map(r => ({ value: r, label: r.replace(/_/g, ' ') }));

  const redistributeTranches = (prev: TypeFraisScolaire, montant: number, devise: string) => {
    const n = prev.tranches?.length || 1;
    if (n === 0) return prev.tranches || [];
    const base = Math.floor((montant / n) * 100) / 100;
    const reste = Math.round((montant - base * n) * 100) / 100;
    return prev.tranches!.map((t, i) => ({
      ...t,
      montant: i === n - 1 ? Math.round((base + reste) * 100) / 100 : base,
      devise,
    }));
  };

  const handleChange = <K extends keyof TypeFraisScolaire>(key: K, value: TypeFraisScolaire[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'montant' || key === 'devise') {
        const montant = key === 'montant' ? (value as number) : (prev.montant || 0);
        const devise = (key === 'devise' ? (value as string) : (prev.devise || 'USD')) as string;
        if (next.tranches && next.tranches.length > 0) {
          next.tranches = redistributeTranches(next as TypeFraisScolaire, montant, devise);
        }
      }
      return next;
    });
  };

  const handleModeChange = (val: ModePaiementFrais) => {
    setMode(val);
    const count = val === 'UNIQUE' ? 1 : val === 'PERSONNALISE' ? nombreTranches : MODE_OPTIONS.find(m => m.value === val)?.tranchesDefaut || 1;
    setNombreTranches(count);
    setForm(prev => ({
      ...prev,
      modePaiement: val,
      nombreTranches: count,
    }));
  };

  const updateTranche = (index: number, patch: Partial<FraisTranche>) => {
    setForm(prev => {
      const tranches = [...(prev.tranches || [])];
      tranches[index] = { ...tranches[index], ...patch };
      const total = tranches.reduce((s, t) => s + (t.montant || 0), 0);
      return { ...prev, tranches, montant: total };
    });
  };

  const addTranche = () => {
    setForm(prev => {
      const list = [...(prev.tranches || [])];
      list.push({
        id: uuid(),
        nom: `Tranche ${list.length + 1}`,
        montant: 0,
        devise: prev.devise || 'CDF',
        ordre: list.length + 1,
      });
      return { ...prev, tranches: list, nombreTranches: list.length, modePaiement: 'PERSONNALISE' as ModePaiementFrais };
    });
    setMode('PERSONNALISE');
    setNombreTranches(prev => prev + 1);
  };

  const removeTranche = (index: number) => {
    setForm(prev => {
      const list = [...(prev.tranches || [])];
      list.splice(index, 1);
      const total = list.reduce((s, t) => s + (t.montant || 0), 0);
      return { ...prev, tranches: list, nombreTranches: list.length, montant: total };
    });
  };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    const totalTranches = (form.tranches || []).reduce((s, t) => s + (t.montant || 0), 0);
    const montant = form.montant || 0;

    // Si les tranches ne correspondent pas au total, on ajuste le montant total
    const saved: TypeFraisScolaire = {
      ...form,
      montant: totalTranches || montant,
      modePaiement: mode,
      nombreTranches: mode === 'UNIQUE' ? 1 : (form.tranches?.length || nombreTranches),
      tranches: form.tranches || [],
      priorite: form.priorite || 0,
      schoolYearId: form.schoolYearId || activeYear?.id,
      anneeScolaireId: form.anneeScolaireId || activeYear?.id,
    };
    onSave(saved);
  };

  const totalTranches = (form.tranches || []).reduce((s, t) => s + (t.montant || 0), 0);
  const trancheMismatch = Math.abs(totalTranches - (form.montant || 0)) > 0.001;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Modifier le type de frais' : 'Nouveau type de frais'}</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Configurez le montant, les tranches et la cible.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Identification ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nom du frais *</label>
              <input
                value={form.nom}
                onChange={e => handleChange('nom', e.target.value)}
                placeholder="ex: Minerval annuel"
                className="input w-full text-sm py-2.5"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Code</label>
              <input
                value={form.code}
                onChange={e => handleChange('code', e.target.value)}
                placeholder="ex: MIN-001"
                className="input w-full text-sm py-2.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
              <CustomSelect options={CATEGORIES} value={form.categorie} onChange={val => handleChange('categorie', val as CategorieFrais)} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect options={currencyOptions} value={form.devise || 'USD'} onChange={val => handleChange('devise', val as string)} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect
                options={yearOptions}
                value={form.schoolYearId || activeYear?.id || ''}
                onChange={val => handleChange('schoolYearId', val)}
              />
            </div>
          </div>

          {/* ── Montant & mode de paiement ── */}
          <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-indigo-500" />
              <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Montant & paiement</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant total</label>
                <NumberInput value={form.montant} onChange={v => handleChange('montant', v)} min={0} className="input w-full text-sm py-2.5" />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Mode de paiement</label>
                <CustomSelect options={MODE_OPTIONS} value={mode} onChange={val => handleModeChange(val as ModePaiementFrais)} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Priorité (1 = le plus prioritaire)</label>
                <NumberInput value={form.priorite || 0} onChange={v => setForm(prev => ({ ...prev, priorite: Math.max(0, v) }))} min={0} className="input w-full text-sm py-2.5" />
              </div>
              {mode === 'PERSONNALISE' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre de tranches</label>
                  <NumberInput
                    value={nombreTranches}
                    onChange={v => {
                      setNombreTranches(Math.max(1, v));
                      setForm(prev => ({ ...prev, nombreTranches: Math.max(1, v) }));
                    }}
                    min={1}
                    className="input w-full text-sm py-2.5"
                  />
                </div>
              )}
            </div>

            {mode !== 'UNIQUE' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    Tranches ({form.tranches?.length || 0})
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${trancheMismatch ? 'text-amber-500' : 'text-emerald-500'}`}>
                      Total tranches : {fmt(totalTranches, form.devise)}
                    </span>
                    <span className="text-xs text-slate-400">/</span>
                    <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                      Montant total : {fmt(form.montant || 0, form.devise)}
                    </span>
                  </div>
                </div>

                {trancheMismatch && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[11px] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Les montants des tranches ne totalisent pas le montant total. Ajustez le montant total ou les tranches.
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {form.tranches?.map((t, i) => (
                    <div
                      key={t.id}
                      className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                    >
                      <div className="col-span-4">
                        <input
                          value={t.nom}
                          onChange={e => updateTranche(i, { nom: e.target.value })}
                          className="input w-full text-xs py-1.5"
                          placeholder="Nom de la tranche"
                        />
                      </div>
                      <div className="col-span-3">
                        <NumberInput
                          value={t.montant}
                          onChange={v => updateTranche(i, { montant: v })}
                          min={0}
                          className="input w-full text-xs py-1.5"
                        />
                      </div>
                      <div className="col-span-4">
                        <CustomDatePicker
                          value={t.dateEcheance || ''}
                          onChange={d => updateTranche(i, { dateEcheance: d })}
                          placeholder="Échéance"
                          className="w-full"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeTranche(i)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all"
                          title="Retirer cette tranche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addTranche}
                  className="w-full py-2 rounded-xl border border-dashed text-xs font-bold flex items-center justify-center gap-2 transition-all hover:bg-slate-500/5"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter une tranche
                </button>
              </div>
            )}

            {mode === 'UNIQUE' && (
              <div className="p-3 rounded-xl border border-dashed flex items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <Calculator className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Ce frais sera facturé en un seul paiement.</span>
              </div>
            )}
          </div>

          {/* ── Ciblage ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Cycle cible</label>
              <CustomSelect options={cycleOptions} value={form.cycleId || 'TOUS'} onChange={val => handleChange('cycleId', val)} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Option cible</label>
              <input
                value={form.optionCode || ''}
                onChange={e => handleChange('optionCode', e.target.value.toUpperCase() || 'TOUS')}
                className="input w-full text-sm py-2.5"
                placeholder="TOUS ou section"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Régime cible</label>
              <CustomSelect options={regimeOptions} value={form.regime || 'TOUS'} onChange={val => handleChange('regime', val as any)} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Portée / classe cible</label>
            <input
              value={form.portee || ''}
              onChange={e => handleChange('portee', e.target.value)}
              className="input w-full text-sm py-2.5"
              placeholder="TOUS ou nom de classe (ex: 6ème Primaire)"
            />
          </div>

          {/* ── Options ── */}
          <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.obligatoire}
                onChange={e => handleChange('obligatoire', e.target.checked)}
                className="w-4 h-4 rounded border accent-indigo-500 cursor-pointer"
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Obligatoire</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.actif !== false}
                onChange={e => handleChange('actif', e.target.checked)}
                className="w-4 h-4 rounded border accent-emerald-500 cursor-pointer"
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Actif</span>
            </label>
          </div>

          <button
            onClick={handleSave}
            disabled={!form.nom.trim()}
            className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: '#6366f1', color: 'white' }}
          >
            <Save className="w-4 h-4" /> Enregistrer le type de frais
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
