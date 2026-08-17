import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Wallet,
  Plus,
  X,
  Trash2,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
  Loader2,
  Target,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { DatePicker } from '../common/DatePicker';
import type { BudgetPrevisionnel, AnneeScolaireConfig, OperationCaisse, TypeFraisScolaire } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface BudgetTabProps {
  activeSchoolYear?: string;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ activeSchoolYear }) => {
  const { currency, format, convert, currencies } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);

  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [cashOps, setCashOps] = useState<OperationCaisse[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'REVENU' | 'DEPENSE' | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BudgetPrevisionnel | null>(null);

  const activeYearId = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear)?.id, [years, activeSchoolYear]);

  useEffect(() => {
    setYearFilter(activeYearId || '');
  }, [activeYearId]);

  const load = async () => {
    setLoading(true);
    const [b, y, c, f] = await Promise.all([
      LocalDatabaseService.getBudgets({ schoolYearId: yearFilter || undefined }),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getCashOperations({ yearId: yearFilter || undefined }),
      LocalDatabaseService.getFeeTypes(yearFilter || undefined),
    ]);
    setBudgets(b);
    setYears(y);
    setCashOps(c);
    setFeeTypes(f);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter]);

  const inDateRange = (d: string, from?: string, to?: string) => {
    const day = d?.split('T')[0];
    if (!day) return true;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  };

  const actualForBudget = (b: BudgetPrevisionnel) => {
    return cashOps
      .filter(o => {
        const matchType = b.type === 'REVENU' ? o.type === 'ENTREE' : o.type === 'SORTIE';
        return matchType && o.categorie === b.categorie && inDateRange(o.date, b.dateDebut, b.dateFin);
      })
      .reduce((sum, o) => sum + convert(o.montant, o.devise), 0);
  };

  const rows = useMemo(() => {
    return budgets
      .filter(b => (periodFilter ? b.periode === periodFilter : true) && (typeFilter ? b.type === typeFilter : true))
      .map(b => {
        const budgetConv = convert(b.montant, b.devise);
        const actualConv = actualForBudget(b);
        const ecart = actualConv - budgetConv;
        const taux = budgetConv > 0 ? (actualConv / budgetConv) * 100 : 0;
        return { ...b, budgetConv, actualConv, ecart, taux };
      })
      .sort((a, b) => (a.periode || '').localeCompare(b.periode || '') || a.categorie.localeCompare(b.categorie));
  }, [budgets, periodFilter, typeFilter, cashOps, convert, currency]);

  const totals = useMemo(() => {
    const rev = rows.filter(r => r.type === 'REVENU').reduce((acc, r) => ({ budget: acc.budget + r.budgetConv, actual: acc.actual + r.actualConv }), { budget: 0, actual: 0 });
    const dep = rows.filter(r => r.type === 'DEPENSE').reduce((acc, r) => ({ budget: acc.budget + r.budgetConv, actual: acc.actual + r.actualConv }), { budget: 0, actual: 0 });
    return { revenu: rev, depense: dep, resultatPrevu: rev.budget - dep.budget, resultatReel: rev.actual - dep.actual };
  }, [rows]);

  const chartData = useMemo(() => {
    const map = new Map<string, { revenuBudget: number; revenuActual: number; depenseBudget: number; depenseActual: number }>();
    for (const r of rows) {
      const cur = map.get(r.periode) || { revenuBudget: 0, revenuActual: 0, depenseBudget: 0, depenseActual: 0 };
      if (r.type === 'REVENU') {
        cur.revenuBudget += r.budgetConv;
        cur.revenuActual += r.actualConv;
      } else {
        cur.depenseBudget += r.budgetConv;
        cur.depenseActual += r.actualConv;
      }
      map.set(r.periode, cur);
    }
    return Array.from(map.entries()).map(([periode, data]) => ({ periode, ...data })).sort((a, b) => a.periode.localeCompare(b.periode));
  }, [rows]);

  const periodOptions = useMemo(() => {
    const unique = Array.from(new Set(budgets.map(b => b.periode))).sort();
    return [{ value: '', label: 'Toutes les périodes' }, ...unique.map(p => ({ value: p, label: p }))];
  }, [budgets]);

  const revenueCategories = useMemo(() => {
    const fromFees = feeTypes.map(ft => ft.categorie).filter(Boolean);
    const fromCash = cashOps.filter(o => o.type === 'ENTREE').map(o => o.categorie);
    return Array.from(new Set([...fromFees, ...fromCash, 'PAIEMENT'])).sort();
  }, [feeTypes, cashOps]);

  const expenseCategories = useMemo(() => {
    const fromCash = cashOps.filter(o => o.type === 'SORTIE').map(o => o.categorie);
    return Array.from(new Set([...fromCash, 'SALAIRES', 'FOURNITURES', 'EAU_ELECTRICITE', 'MAINTENANCE', 'AUTRE'])).sort();
  }, [cashOps]);

  const exportCSV = () => {
    const header = 'Periode,Debut,Fin,Type,Categorie,Budget,Devise,Realise,Reel_Devise,Ecart,Taux\n';
    const body = rows.map(r => `"${r.periode}","${r.dateDebut || ''}","${r.dateFin || ''}",${r.type},"${r.categorie}",${r.budgetConv},${currency},${r.actualConv},${currency},${r.ecart},${r.taux.toFixed(1)}%`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette ligne budgétaire ?')) return;
    await LocalDatabaseService.deleteBudget(id);
    load();
  };

  const saveBudget = async (b: BudgetPrevisionnel) => {
    if (b.id) {
      await LocalDatabaseService.updateBudget(b.id, b);
    } else {
      await LocalDatabaseService.addBudget(b);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="p-2 rounded-xl border text-xs shadow-xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /> {p.name}</span>
            <span className="font-mono font-black">{fmt(p.value, currency)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Budgétisation</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Prévisions de revenus et de dépenses avec suivi des réalisations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
          <button onClick={() => { setEditing({ id: '', periode: '', type: 'REVENU', categorie: '', montant: 0, devise: currency, note: '' }); setShowForm(true); }} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenus prévus', val: fmt(totals.revenu.budget, currency), color: '#10b981', icon: TrendingUp },
          { label: 'Revenus réalisés', val: fmt(totals.revenu.actual, currency), color: '#10b981', icon: TrendingUp },
          { label: 'Dépenses prévues', val: fmt(totals.depense.budget, currency), color: '#ef4444', icon: TrendingDown },
          { label: 'Dépenses réalisées', val: fmt(totals.depense.actual, currency), color: '#ef4444', icon: TrendingDown },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CustomSelect
            options={[{ value: '', label: 'Toutes les années' }, ...years.map(y => ({ value: y.id, label: y.nom }))]}
            value={yearFilter}
            onChange={setYearFilter}
          />
          <CustomSelect
            options={periodOptions}
            value={periodFilter}
            onChange={setPeriodFilter}
          />
          <CustomSelect
            options={[
              { value: '', label: 'Tous les types' },
              { value: 'REVENU', label: 'Revenu' },
              { value: 'DEPENSE', label: 'Dépense' },
            ]}
            value={typeFilter}
            onChange={v => setTypeFilter(v as any)}
          />
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="section-card p-4">
          <h3 className="text-sm font-black mb-3" style={{ color: 'var(--text-primary)' }}>Budget vs réalisé par période</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="periode" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={v => fmt(v, currency)} tick={{ fontSize: 10 }} width={80} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="revenuBudget" name="Revenu prévu" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenuActual" name="Revenu réalisé" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenseBudget" name="Dépense prévue" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenseActual" name="Dépense réalisée" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="section-card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Période</th>
              <th>Type</th>
              <th>Catégorie</th>
              <th className="text-right">Budget</th>
              <th className="text-right">Réalisé</th>
              <th className="text-right">Écart</th>
              <th className="text-right">%</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="text-[12px] font-bold">{r.periode}</td>
                <td>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${r.type === 'REVENU' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                    {r.type === 'REVENU' ? 'Revenu' : 'Dépense'}
                  </span>
                </td>
                <td className="text-[12px]">{r.categorie.replace(/_/g, ' ')}</td>
                <td className="text-right font-bold">{fmt(r.budgetConv, currency)}</td>
                <td className="text-right font-bold">{fmt(r.actualConv, currency)}</td>
                <td className={`text-right font-bold ${r.ecart >= 0 ? (r.type === 'REVENU' ? 'text-emerald-600' : 'text-rose-600') : (r.type === 'REVENU' ? 'text-rose-600' : 'text-emerald-600')}`}>
                  {fmt(r.ecart, currency)}
                </td>
                <td className="text-right text-[11px] font-black">{r.taux.toFixed(0)}%</td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(r); setShowForm(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-50 text-indigo-500"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={8} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune ligne budgétaire. Créez un budget pour commencer.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && editing && (
        <BudgetFormModal
          budget={editing}
          years={years}
          yearFilter={yearFilter}
          revenueCategories={revenueCategories}
          expenseCategories={expenseCategories}
          currencies={currencies}
          currency={currency}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={saveBudget}
        />
      )}
    </div>
  );
};

const BudgetFormModal: React.FC<{
  budget: BudgetPrevisionnel;
  years: AnneeScolaireConfig[];
  yearFilter: string;
  revenueCategories: string[];
  expenseCategories: string[];
  currencies: any[];
  currency: string;
  onClose: () => void;
  onSave: (b: BudgetPrevisionnel) => void;
}> = ({ budget, years, yearFilter, revenueCategories, expenseCategories, currencies, currency, onClose, onSave }) => {
  const [form, setForm] = useState<BudgetPrevisionnel>({ ...budget });
  const [customCat, setCustomCat] = useState('');

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const categories = form.type === 'REVENU' ? revenueCategories : expenseCategories;

  const handleSave = () => {
    const b = {
      ...form,
      schoolYearId: form.schoolYearId || yearFilter,
      categorie: customCat || form.categorie,
    };
    onSave(b);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black">{form.id ? 'Modifier le budget' : 'Nouvelle ligne budgétaire'}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Période</label>
              <input value={form.periode} onChange={e => setForm({ ...form, periode: e.target.value })} className="input w-full text-sm" placeholder="ex: Janvier 2025" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Type</label>
              <CustomSelect
                options={[
                  { value: 'REVENU', label: 'Revenu' },
                  { value: 'DEPENSE', label: 'Dépense' },
                ]}
                value={form.type}
                onChange={v => setForm({ ...form, type: v as 'REVENU' | 'DEPENSE', categorie: '' })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date début</label>
              <DatePicker value={form.dateDebut || ''} onChange={v => setForm({ ...form, dateDebut: v })} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date fin</label>
              <DatePicker value={form.dateFin || ''} onChange={v => setForm({ ...form, dateFin: v })} className="w-full" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
            <CustomSelect
              options={[{ value: '', label: 'Choisir ou ajouter manuellement' }, ...categories.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))]}
              value={form.categorie}
              onChange={v => { setForm({ ...form, categorie: v }); setCustomCat(''); }}
            />
            <input
              value={customCat}
              onChange={e => { setCustomCat(e.target.value); setForm({ ...form, categorie: e.target.value }); }}
              placeholder="Ou saisir une catégorie personnalisée"
              className="input w-full text-sm mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant prévu</label>
              <NumberInput value={form.montant} onChange={v => setForm({ ...form, montant: v })} min={0} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect
                options={currencies.map(c => ({ value: c.code, label: `${c.code} (${c.name || c.code})` }))}
                value={form.devise || currency}
                onChange={v => setForm({ ...form, devise: v })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Note</label>
            <textarea value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className="input w-full text-sm" />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
            <CustomSelect
              options={years.map(y => ({ value: y.id, label: y.nom }))}
              value={form.schoolYearId || yearFilter}
              onChange={v => setForm({ ...form, schoolYearId: v })}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!form.periode || !form.categorie || form.montant <= 0}
            className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: 'white', opacity: (!form.periode || !form.categorie || form.montant <= 0) ? 0.6 : 1 }}
          >
            <Target className="w-4 h-4" /> Enregistrer le budget
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
