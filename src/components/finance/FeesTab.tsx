import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2, Loader2, Save, Tag, Filter, TrendingUp, AlertTriangle, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import type { TypeFraisScolaire, AnneeScolaireConfig, CategorieFrais, FactureEleve, TransactionPaiement, ClasseScolaire } from '../../types';

const CATEGORIES: CategorieFrais[] = [
  'FRAIS_INSCRIPTION', 'FRAIS_REINSCRIPTION', 'FRAIS_MINERVAL', 'FRAIS_CONNEXES', 'FRAIS_KITS_EQUIPEMENTS',
  'FRAIS_BUS', 'FRAIS_UNIFORME', 'FRAIS_EXAMEN', 'FRAIS_CARTE', 'FRAIS_ACTIVITE', 'AUTRE',
];

const CYCLES = ['TOUS', 'MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'] as const;
const REGIMES = ['TOUS', 'EXTERNE', 'INTERNE', 'SEMI_INTERNE'] as const;

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface FeesTabProps {
  activeSchoolYear?: string;
  autoOpenFee?: boolean;
  onActionConsumed?: () => void;
}

export const FeesTab: React.FC<FeesTabProps> = ({ activeSchoolYear, autoOpenFee, onActionConsumed }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TypeFraisScolaire | null>(null);

  const [cycleFilter, setCycleFilter] = useState<string>('TOUS');
  const [optionFilter, setOptionFilter] = useState<string>('TOUS');
  const [classFilter, setClassFilter] = useState<string>('TOUS');
  const [deviseFilter, setDeviseFilter] = useState<string>('TOUS');

  const load = async () => {
    setLoading(true);
    const [ft, y, cls, inv, pmt] = await Promise.all([
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
    ]);
    setFeeTypes(ft);
    setYears(y);
    setClasses(cls);
    setInvoices(inv);
    setPayments(pmt);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeSchoolYear]);

  useEffect(() => {
    if (autoOpenFee) {
      startNew();
      onActionConsumed?.();
    }
  }, [autoOpenFee, onActionConsumed]);

  const activeYear = years.find(y => y.statut === 'EN_COURS') || years[0];

  const cycleOptions = useMemo(() => [
    { value: 'TOUS', label: 'Tous les cycles' },
    ...CYCLES.filter(c => c !== 'TOUS').map(c => ({ value: c, label: c })),
  ], []);

  const optionOptions = useMemo(() => [
    { value: 'TOUS', label: 'Toutes les options' },
    ...Array.from(new Set(classes.map(c => c.optionCode).filter((o): o is string => !!o))).map(o => ({ value: o, label: o })),
  ], [classes]);

  const classOptions = useMemo(() => [
    { value: 'TOUS', label: 'Toutes les classes' },
    ...Array.from(new Set(classes.map(c => c.nom).filter(Boolean))).map(c => ({ value: c, label: c })),
  ], [classes]);

  const deviseOptions = useMemo(() => [
    { value: 'TOUS', label: 'Toutes devises' },
    { value: 'USD', label: 'USD' },
    { value: 'CDF', label: 'CDF' },
  ], []);

  const filteredFeeTypes = useMemo(() => {
    let list = feeTypes.filter(f => f.actif !== false);
    if (activeSchoolYear) list = list.filter(f => f.schoolYearId === activeSchoolYear || f.anneeScolaireId === activeSchoolYear);
    if (cycleFilter !== 'TOUS') list = list.filter(f => f.cycleId === cycleFilter || f.cycleId === 'TOUS');
    if (optionFilter !== 'TOUS') list = list.filter(f => f.optionCode === optionFilter || f.optionCode === 'TOUS');
    if (deviseFilter !== 'TOUS') list = list.filter(f => f.devise === deviseFilter);
    return list;
  }, [feeTypes, activeSchoolYear, cycleFilter, optionFilter, deviseFilter]);

  const feeStats = useMemo(() => {
    const map = new Map<string, { attendu: number; paye: number }>();
    filteredFeeTypes.forEach(ft => map.set(ft.id, { attendu: 0, paye: 0 }));

    const relevantInvoices = invoices.filter(inv => {
      if (activeSchoolYear && inv.anneeScolaireId !== activeSchoolYear) return false;
      if (classFilter !== 'TOUS' && inv.nomClasse !== classFilter) return false;
      return true;
    });

    relevantInvoices.forEach(inv => {
      inv.lignes?.forEach(l => {
        const s = map.get(l.feeTypeId);
        if (s) s.attendu += convertCurrency(l.montant, inv.devise, currency, exchangeRate);
      });
    });

    payments.forEach(p => {
      if (activeSchoolYear && p.anneeScolaireId !== activeSchoolYear) return;
      p.allocations?.forEach(a => {
        const s = map.get(a.feeTypeId);
        if (s) s.paye += convertCurrency(a.montant, p.devise, currency, exchangeRate);
      });
    });

    return map;
  }, [filteredFeeTypes, invoices, payments, activeSchoolYear, classFilter, currency, exchangeRate]);

  const globalStats = useMemo(() => {
    let attendu = 0, paye = 0;
    feeStats.forEach(s => { attendu += s.attendu; paye += s.paye; });
    const reste = Math.max(0, attendu - paye);
    const taux = attendu > 0 ? Math.round((paye / attendu) * 100) : 0;
    return { attendu, paye, reste, taux };
  }, [feeStats]);

  const { paginated: paginatedFeeTypes, ...feeTypesPagination } = usePagination(filteredFeeTypes, { defaultPageSize: 15 });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce type de frais ?')) return;
    await LocalDatabaseService.deleteFeeType(id);
    load();
  };

  const handleSave = async (ft: TypeFraisScolaire) => {
    if (ft.id) await LocalDatabaseService.updateFeeType(ft.id, ft);
    else await LocalDatabaseService.addFeeType(ft);
    setEditing(null);
    load();
  };

  const startNew = () => {
    setEditing({
      id: '',
      code: '',
      nom: '',
      categorie: 'FRAIS_MINERVAL',
      montant: 0,
      devise: currency,
      obligatoire: true,
      schoolYearId: activeYear?.id,
      anneeScolaireId: activeYear?.id,
      cycleId: 'TOUS',
      optionCode: 'TOUS',
      regime: 'TOUS',
      actif: true,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Types de frais & Recouvrement</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Seuls les frais créés et définis sont affichés.</p>
        </div>
        <button onClick={startNew} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
          <Plus className="w-3.5 h-3.5" /> Nouveau type
        </button>
      </div>

      {/* KPI globaux de recouvrement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total attendu</span>
          </div>
          <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{fmt(globalStats.attendu)}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total payé</span>
          </div>
          <p className="text-lg font-black text-emerald-600">{fmt(globalStats.paye)}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reste à recouvrir</span>
          </div>
          <p className="text-lg font-black text-rose-600">{fmt(globalStats.reste)}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Taux de recouvrement</span>
          </div>
          <p className="text-lg font-black text-amber-600">{globalStats.taux}%</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
        <Filter className="w-4 h-4 text-slate-400" />
        <CustomSelect options={cycleOptions} value={cycleFilter} onChange={setCycleFilter} className="w-40" />
        <CustomSelect options={optionOptions} value={optionFilter} onChange={setOptionFilter} className="w-44" />
        <CustomSelect options={classOptions} value={classFilter} onChange={setClassFilter} className="w-44" />
        <CustomSelect options={deviseOptions} value={deviseFilter} onChange={setDeviseFilter} className="w-36" />
        {(cycleFilter !== 'TOUS' || optionFilter !== 'TOUS' || classFilter !== 'TOUS' || deviseFilter !== 'TOUS') && (
          <button
            onClick={() => { setCycleFilter('TOUS'); setOptionFilter('TOUS'); setClassFilter('TOUS'); setDeviseFilter('TOUS'); }}
            className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Cartes des types de frais créés */}
      {filteredFeeTypes.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border mb-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Aucun type de frais ne correspond aux filtres.</p>
          <p className="text-xs text-slate-400 mt-1">Créez un nouveau type de frais ou modifiez les filtres.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {paginatedFeeTypes.map(ft => {
          const s = feeStats.get(ft.id) || { attendu: 0, paye: 0 };
          const reste = Math.max(0, s.attendu - s.paye);
          const taux = s.attendu > 0 ? Math.round((s.paye / s.attendu) * 100) : 0;
          return (
            <div key={ft.id} className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{ft.categorie.replace(/_/g, ' ')}</span>
                  <h3 className="text-sm font-bold mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{ft.nom}</h3>
                </div>
                <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border ${ft.actif !== false ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-slate-500/10 text-slate-600 border-slate-500/25'}`}>
                  {ft.actif !== false ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-500/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Montant</p>
                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{fmt(ft.montant, ft.devise)}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-500/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Attendu</p>
                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{fmt(s.attendu)}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/5">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Payé</p>
                  <p className="font-black text-emerald-700">{fmt(s.paye)}</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/5">
                  <p className="text-[10px] text-rose-600 font-bold uppercase">Reste</p>
                  <p className="font-black text-rose-700">{fmt(reste)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Taux de recouvrement</span>
                  <span>{taux}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${taux}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="section-card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Categorie</th>
              <th>Montant</th>
              <th>Devise</th>
              <th>Obligatoire</th>
              <th>Cycle</th>
              <th>Option</th>
              <th>Régime</th>
              <th>Portee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFeeTypes.map(ft => (
              <tr key={ft.id}>
                <td className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{ft.code}</td>
                <td className="font-bold text-[12px]">{ft.nom}</td>
                <td className="text-[11px]">{ft.categorie}</td>
                <td className="font-black text-[14px]">{fmt(ft.montant, ft.devise)}</td>
                <td className="text-[11px]">{ft.devise}</td>
                <td>{ft.obligatoire ? <span className="text-emerald-600 font-bold text-[11px]">Oui</span> : <span className="text-slate-400 text-[11px]">Non</span>}</td>
                <td className="text-[11px]">{ft.cycleId || 'TOUS'}</td>
                <td className="text-[11px]">{ft.optionCode || 'TOUS'}</td>
                <td className="text-[11px]">{ft.regime || 'TOUS'}</td>
                <td className="text-[11px]">{ft.portee || 'TOUS'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(ft)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600">Modifier</button>
                    <button onClick={() => handleDelete(ft.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {feeTypes.length === 0 && !loading && (
              <tr><td colSpan={11} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun type de frais.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={11} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} /></td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={feeTypesPagination.page}
          totalPages={feeTypesPagination.totalPages}
          total={feeTypesPagination.total}
          pageSize={feeTypesPagination.pageSize}
          start={feeTypesPagination.start}
          end={feeTypesPagination.end}
          onPageChange={feeTypesPagination.setPage}
          onPageSizeChange={feeTypesPagination.setPageSize}
        />
      </div>

      {editing && (
        <FeeTypeModal
          fee={editing}
          years={years}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

const FeeTypeModal: React.FC<{
  fee: TypeFraisScolaire;
  years: AnneeScolaireConfig[];
  onClose: () => void;
  onSave: (ft: TypeFraisScolaire) => void;
}> = ({ fee, years, onClose, onSave }) => {
  const [form, setForm] = useState<TypeFraisScolaire>({ ...fee });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const categoryOptions = CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, ' ') }));
  const cycleOptions = CYCLES.map(c => ({ value: c, label: c }));
  const regimeOptions = REGIMES.map(r => ({ value: r, label: r.replace(/_/g, ' ') }));
  const yearOptions = years.map(y => ({ value: y.id, label: y.nom }));
  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'CDF', label: 'CDF (FC)' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-2xl)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Modifier le type de frais' : 'Nouveau type de frais'}</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Configurez le montant, la cible et les options.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nom du frais</label>
            <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="ex: Minerval annuel" className="input w-full text-sm py-2.5" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Code</label>
              <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input w-full text-sm py-2.5" placeholder="ex: MIN-001" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
              <CustomSelect options={categoryOptions} value={form.categorie} onChange={val => setForm({ ...form, categorie: val as any })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant</label>
              <NumberInput value={form.montant} onChange={v => setForm({ ...form, montant: v })} min={0} placeholder="0" className="input w-full text-sm py-2.5" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect options={currencyOptions} value={form.devise || 'USD'} onChange={val => setForm({ ...form, devise: val as any })} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect options={yearOptions} value={form.schoolYearId || yearOptions[0]?.value || ''} onChange={val => setForm({ ...form, schoolYearId: val, anneeScolaireId: val })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Cycle cible</label>
              <CustomSelect options={cycleOptions} value={form.cycleId || 'TOUS'} onChange={val => setForm({ ...form, cycleId: val as any })} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Option cible</label>
              <input value={form.optionCode || ''} onChange={e => setForm({ ...form, optionCode: e.target.value.toUpperCase() || 'TOUS' })} className="input w-full text-sm py-2.5" placeholder="TOUS ou section" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Régime cible</label>
              <CustomSelect options={regimeOptions} value={form.regime || 'TOUS'} onChange={val => setForm({ ...form, regime: val as any })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Portée / classe cible</label>
            <input value={form.portee || ''} onChange={e => setForm({ ...form, portee: e.target.value })} className="input w-full text-sm py-2.5" placeholder="TOUS ou nom de classe (ex: 6ème Primaire)" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="obligatoire"
                checked={form.obligatoire}
                onChange={e => setForm({ ...form, obligatoire: e.target.checked })}
                className="w-4 h-4 rounded border accent-indigo-500 cursor-pointer"
              />
              <label htmlFor="obligatoire" className="text-sm font-semibold cursor-pointer">Obligatoire</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="actif"
                checked={form.actif !== false}
                onChange={e => setForm({ ...form, actif: e.target.checked })}
                className="w-4 h-4 rounded border accent-emerald-500 cursor-pointer"
              />
              <label htmlFor="actif" className="text-sm font-semibold cursor-pointer">Actif</label>
            </div>
          </div>
          <button onClick={() => onSave(form)} className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90" style={{ background: '#6366f1', color: 'white' }}>
            <Save className="w-4 h-4" /> Enregistrer le type de frais
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
