import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import {
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Plus,
  X,
  Trash2,
  Loader2,
  Download,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  RotateCcw,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { DatePicker } from '../common/DatePicker';
import { NumberInput } from '../common/NumberInput';
import type { OperationCaisse, AnneeScolaireConfig } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const CASH_CATEGORIES = [
  'MINERVAL', 'INSCRIPTION', 'FRAIS_KITS', 'SALAIRES', 'FOURNITURES', 'CHARGES', 'MAINTENANCE', 'ACTIVITES', 'BUS', 'AUTRE',
];

interface CashTabProps {
  activeSchoolYear?: string;
  autoOpenForm?: boolean;
  onActionConsumed?: () => void;
}

export const CashTab: React.FC<CashTabProps> = ({ activeSchoolYear, autoOpenForm, onActionConsumed }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const CashTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 rounded-xl text-xs" style={{ minWidth: 150, border: '1px solid var(--border)' }}>
        <p className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="font-mono font-black" style={{ color: payload[0].value >= 0 ? '#10b981' : '#ef4444' }}>{fmt(payload[0].value)}</p>
      </div>
    );
  };

  const [ops, setOps] = useState<OperationCaisse[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>(activeSchoolYear || '');

  useEffect(() => {
    if (activeSchoolYear) {
      setYearFilter(activeSchoolYear);
    }
  }, [activeSchoolYear]);

  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
      onActionConsumed?.();
    }
  }, [autoOpenForm, onActionConsumed]);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ENTREE' | 'SORTIE' | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [o, y] = await Promise.all([
      LocalDatabaseService.getCashOperations({ yearId: yearFilter || undefined }),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setOps(o);
    setYears(y);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter]);

  const filteredOps = useMemo(() => {
    return ops.filter(o => {
      if (typeFilter && o.type !== typeFilter) return false;
      if (categoryFilter && o.categorie !== categoryFilter) return false;
      if (modeFilter && o.modePaiement !== modeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [o.libelle, o.caissier, o.beneficiaire, o.reference, o.categorie, o.modePaiement, o.pieceJustificative].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const day = o.date?.split('T')[0];
      if (dateFrom && day && day < dateFrom) return false;
      if (dateTo && day && day > dateTo) return false;
      return true;
    });
  }, [ops, typeFilter, categoryFilter, modeFilter, search, dateFrom, dateTo]);

  const { paginated: paginatedOps, ...opsPagination } = usePagination(filteredOps, { defaultPageSize: 15 });

  const { totalEntrees, totalSorties, solde } = useMemo(() => {
    const entrees = filteredOps.filter(o => o.type === 'ENTREE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0);
    const sorties = filteredOps.filter(o => o.type === 'SORTIE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0);
    return { totalEntrees: entrees, totalSorties: sorties, solde: entrees - sorties };
  }, [filteredOps, currency, exchangeRate]);

  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of [...filteredOps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const day = o.date?.split('T')[0];
      if (!day) continue;
      const sign = o.type === 'ENTREE' ? 1 : -1;
      const val = convertCurrency(o.montant, o.devise, currency, exchangeRate) * sign;
      map.set(day, (map.get(day) || 0) + val);
    }
    let cumul = 0;
    return Array.from(map.entries()).map(([day, v]) => {
      cumul += v;
      return { day, solde: cumul };
    });
  }, [filteredOps, currency, exchangeRate]);

  const uniqueCategories = useMemo(() => Array.from(new Set(ops.map(o => o.categorie))).sort(), [ops]);
  const uniqueModes = useMemo(() => Array.from(new Set(ops.map(o => o.modePaiement))).sort(), [ops]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette operation de caisse ?')) return;
    await LocalDatabaseService.deleteCashOperation(id);
    load();
  };

  const exportCSV = () => {
    const header = 'Date,Type,Categorie,Libelle,Montant,Devise,Reference,Beneficiaire,Piece,Caissier\n';
    const rows = filteredOps.map(o => `"${o.date?.split('T')[0]}",${o.type},${o.categorie},"${o.libelle || ''}",${o.montant},${o.devise},${o.reference || ''},${o.beneficiaire || ''},${o.pieceJustificative || ''},${o.caissier || ''}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-caisse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Caisse & Dépenses</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Journal chronologique, filtres avancés et suivi de la trésorerie</p>
        </div>
        <div className="flex items-center gap-2">
          <CustomSelect
            options={[{ value: '', label: 'Toutes années' }, ...years.map(y => ({ value: y.id, label: y.nom }))]}
            value={yearFilter}
            onChange={setYearFilter}
            className="w-44"
          />
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Plus className="w-3.5 h-3.5" /> Opération
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Entrées', val: fmt(totalEntrees), color: '#10b981', icon: TrendingUp, desc: `${filteredOps.filter(o => o.type === 'ENTREE').length} opérations` },
          { label: 'Sorties', val: fmt(totalSorties), color: '#ef4444', icon: TrendingDown, desc: `${filteredOps.filter(o => o.type === 'SORTIE').length} opérations` },
          { label: 'Solde de caisse', val: fmt(solde), color: solde >= 0 ? '#6366f1' : '#ef4444', icon: DollarSign, desc: 'Bilan filtré' },
          { label: 'Transactions', val: String(filteredOps.length), color: '#8b5cf6', icon: Filter, desc: 'Opérations affichées' },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4">
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4.5 h-4.5" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-[18px] font-black" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher libellé, caissier, référence, catégorie..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <CustomSelect
            options={[{ value: '', label: 'Tous types' }, { value: 'ENTREE', label: 'Entrées' }, { value: 'SORTIE', label: 'Sorties' }]}
            value={typeFilter}
            onChange={val => setTypeFilter(val as any)}
            className="w-36"
          />
          <CustomSelect
            options={[{ value: '', label: 'Toutes catégories' }, ...uniqueCategories.map(c => ({ value: c, label: c }))]}
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="w-40"
          />
          <CustomSelect
            options={[{ value: '', label: 'Tous modes' }, ...uniqueModes.map(m => ({ value: m, label: m }))]}
            value={modeFilter}
            onChange={setModeFilter}
            className="w-40"
          />
          <div className="flex items-center gap-2">
            <DatePicker value={dateFrom} onChange={setDateFrom} className="w-36" />
            <span className="text-xs text-slate-400">à</span>
            <DatePicker value={dateTo} onChange={setDateTo} className="w-36" />
          </div>
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setCategoryFilter(''); setModeFilter(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2 rounded-xl border text-[11px] font-black hover:bg-slate-500/5 flex items-center gap-1.5 transition-all"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="section-card">
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Journal de caisse</h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500">{filteredOps.length} opérations</span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedOps.map(o => (
                <div key={o.id} className="flex items-center gap-4 p-4 hover:opacity-80 transition-opacity group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: o.type === 'ENTREE' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)' }}>
                    {o.type === 'ENTREE' ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>{o.libelle}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{o.date?.split('T')[0]}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{o.type === 'SORTIE' && o.beneficiaire ? `Payé à: ${o.beneficiaire}` : o.caissier || '—'}</span>
                      {o.pieceJustificative && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Pièce: {o.pieceJustificative}</span>}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{o.categorie}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black border" style={{ background: o.type === 'ENTREE' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)', borderColor: o.type === 'ENTREE' ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.30)', color: o.type === 'ENTREE' ? '#059669' : '#dc2626' }}>{o.modePaiement}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="font-black text-[14px]" style={{ color: o.type === 'ENTREE' ? '#059669' : '#dc2626' }}>
                      {o.type === 'ENTREE' ? '+' : '-'}{fmt(o.montant, o.devise)}
                    </p>
                    {o.reference && <p className="text-[9px] font-mono text-slate-400">{o.reference}</p>}
                  </div>
                  <button onClick={() => handleDelete(o.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              ))}
              {filteredOps.length === 0 && !loading && (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucune opération de caisse correspondante.</div>
              )}
              {loading && (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>
          </div>
          <Pagination
            currentPage={opsPagination.page}
            totalPages={opsPagination.totalPages}
            total={opsPagination.total}
            pageSize={opsPagination.pageSize}
            pageSizeOptions={[10, 15, 25, 50]}
            start={opsPagination.start}
            end={opsPagination.end}
            onPageChange={opsPagination.setPage}
            onPageSizeChange={opsPagination.setPageSize}
          />
        </div>

        <div className="space-y-4">
          <div className="section-card p-5">
            <h3 className="font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Évolution de la trésorerie</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>Solde cumulé par jour</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip content={<CashTooltip />} />
                  <Area type="monotone" dataKey="solde" stroke="#6366f1" strokeWidth={2} fill="url(#gradCash)" dot={{ r: 3, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <CashOperationModal
          years={years}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

const CashOperationModal: React.FC<{
  years: AnneeScolaireConfig[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ years, onClose, onSaved }) => {
  const { currency } = useSchoolConfig();
  const [type, setType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [categorie, setCategorie] = useState('MINERVAL');
  const [modePaiement, setModePaiement] = useState('CASH');
  const [devise, setDevise] = useState<'USD' | 'CDF'>(currency);
  const [reference, setReference] = useState('');
  const [caissier, setCaissier] = useState('Caissier');
  const [beneficiaire, setBeneficiaire] = useState('');
  const [pieceJustificative, setPieceJustificative] = useState('');
  const [yearId, setYearId] = useState<string>(years.find(y => y.statut === 'EN_COURS')?.id || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!libelle || montant <= 0) return;
    setLoading(true);
    const op: OperationCaisse = {
      id: uuid(),
      date: new Date().toISOString(),
      libelle,
      montant,
      devise,
      type,
      categorie,
      modePaiement,
      reference,
      caissier,
      beneficiaire,
      pieceJustificative,
      schoolYearId: yearId,
      origine: 'MANUAL',
    };
    await LocalDatabaseService.addCashOperation(op);
    setLoading(false);
    onSaved();
    onClose();
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const categoryOptions = CASH_CATEGORIES.map(c => ({ value: c, label: c }));
  const modeOptions = [
    { value: 'CASH', label: 'Espèces (Cash)' },
    { value: 'BANQUE', label: 'Virement / Banque' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  ];
  const yearOptions = years.map(y => ({ value: y.id, label: y.nom }));
  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'CDF', label: 'CDF (FC)' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 max-h-[92vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-2xl)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${type === 'ENTREE' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'}`}>
              {type === 'ENTREE' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Nouvelle opération de caisse</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saisissez les détails de l'entrée ou de la sortie.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
            <button onClick={() => setType('ENTREE')} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${type === 'ENTREE' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>Entrée</button>
            <button onClick={() => setType('SORTIE')} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${type === 'SORTIE' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>Sortie</button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Libellé</label>
              <input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex: Paiement frais scolaires..." className="input w-full text-sm py-2.5" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
              <CustomSelect options={categoryOptions} value={categorie} onChange={setCategorie} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant</label>
              <NumberInput value={montant} onChange={setMontant} min={0} placeholder="0" className="input w-full text-sm py-2.5" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect options={currencyOptions} value={devise} onChange={val => setDevise(val as 'USD' | 'CDF')} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Mode de paiement</label>
              <CustomSelect options={modeOptions} value={modePaiement} onChange={setModePaiement} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Bénéficiaire {type === 'SORTIE' && <span className="text-rose-500">*</span>}</label>
              <input value={beneficiaire} onChange={e => setBeneficiaire(e.target.value)} className="input w-full text-sm py-2.5" placeholder={type === 'SORTIE' ? 'Personne / Fournisseur payé' : 'Bénéficiaire (optionnel)'} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Pièce justificative</label>
              <input value={pieceJustificative} onChange={e => setPieceJustificative(e.target.value)} className="input w-full text-sm py-2.5" placeholder="N° facture, bon de commande..." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Référence</label>
              <input value={reference} onChange={e => setReference(e.target.value)} className="input w-full text-sm py-2.5" placeholder="N° transaction" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect options={yearOptions} value={yearId} onChange={setYearId} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Caissier</label>
              <input value={caissier} onChange={e => setCaissier(e.target.value)} className="input w-full text-sm py-2.5" />
            </div>
          </div>

          {type === 'SORTIE' && !beneficiaire && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">!</span>
              Pour les sorties, renseigner le bénéficiaire permet de savoir qui a reçu l'argent.
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !libelle || montant <= 0}
            className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 transition-all"
            style={{ background: type === 'ENTREE' ? '#10b981' : '#ef4444', color: 'white', opacity: loading || !libelle || montant <= 0 ? 0.5 : 1 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Enregistrement...' : 'Enregistrer l\'opération'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
