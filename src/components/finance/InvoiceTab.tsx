import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Receipt,
  Search,
  Plus,
  Download,
  Eye,
  Printer,
  X,
  Trash2,
  Loader2,
  FileText,
  Filter,
  TrendingDown,
  FileDown,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import type { FactureEleve, TransactionPaiement, Eleve, TypeFraisScolaire, LigneFacture, AnneeScolaireConfig, ClasseScolaire } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { DatePicker } from '../common/DatePicker';
import { NumberInput } from '../common/NumberInput';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const invoiceStatusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    PAYE:     { label: 'Solde',   cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' },
    PARTIEL:  { label: 'Partiel', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' },
    NON_PAYE: { label: 'Impaye',  cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25' },
  };
  const s = map[statut] || { label: statut, cls: 'bg-slate-500/15 text-slate-700 border-slate-500/25' };
  return <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${s.cls}`}>{s.label}</span>;
};

interface InvoiceTabProps {
  activeSchoolYear?: string;
  autoOpenCreate?: boolean;
  autoOpenPayment?: boolean;
  onActionConsumed?: () => void;
}

export const InvoiceTab: React.FC<InvoiceTabProps> = ({ activeSchoolYear, autoOpenCreate, autoOpenPayment, onActionConsumed }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>(activeSchoolYear || '');
  const [classFilter, setClassFilter] = useState<string>('');
  const [optionFilter, setOptionFilter] = useState<string>('');
  const [deviseFilter, setDeviseFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<number>(0);
  const [amountMax, setAmountMax] = useState<number>(0);
  const [showCreate, setShowCreate] = useState(false);
  const [payInvoice, setPayInvoice] = useState<FactureEleve | null>(null);
  const [viewReceipt, setViewReceipt] = useState<TransactionPaiement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeSchoolYear) setYearFilter(activeSchoolYear);
  }, [activeSchoolYear]);

  useEffect(() => {
    if (autoOpenCreate) {
      setShowCreate(true);
      onActionConsumed?.();
    }
  }, [autoOpenCreate, onActionConsumed]);

  const loadAll = async () => {
    setLoading(true);
    const [inv, pay, el, ft, yrs, cls] = await Promise.all([
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
      LocalDatabaseService.getEleves(),
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getClasses(),
    ]);
    setInvoices(inv);
    setPayments(pay);
    setStudents(el);
    setFeeTypes(ft);
    setYears(yrs);
    setClasses(cls);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = !search || [inv.nomEleve, inv.nomClasse, inv.numeroFacture].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = !statusFilter || inv.statut === statusFilter;
      const matchesYear = !yearFilter || inv.anneeScolaireId === yearFilter || inv.anneeScolaire === yearFilter;
      const matchesClass = !classFilter || inv.nomClasse === classFilter;
      const cls = classes.find(c => c.nom === inv.nomClasse);
      const matchesOption = !optionFilter || cls?.optionCode === optionFilter;
      const matchesDevise = !deviseFilter || inv.devise === deviseFilter;
      const matchesDate = (!dateFrom || (inv.dateEcheance && inv.dateEcheance >= dateFrom)) && (!dateTo || (inv.dateEcheance && inv.dateEcheance <= dateTo));
      const matchesAmount = (!amountMin || inv.montantTotal >= amountMin) && (!amountMax || inv.montantTotal <= amountMax);
      return matchesSearch && matchesStatus && matchesYear && matchesClass && matchesOption && matchesDevise && matchesDate && matchesAmount;
    });
  }, [invoices, search, statusFilter, yearFilter, classFilter, optionFilter, classes, deviseFilter, dateFrom, dateTo, amountMin, amountMax]);

  const stats = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((a, i) => a + convertCurrency(i.montantTotal, i.devise, currency, exchangeRate), 0);
    const invoiceIds = new Set(filteredInvoices.map(i => i.id));
    const totalPaid = payments.filter(p => invoiceIds.has(p.invoiceId || '')).reduce((a, p) => a + convertCurrency(p.montantPaye, p.devise, currency, exchangeRate), 0);
    const totalUnpaid = Math.max(0, totalBilled - totalPaid);
    const recoveryRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    const byStatus = {
      PAYE: filteredInvoices.filter(i => i.statut === 'PAYE').length,
      PARTIEL: filteredInvoices.filter(i => i.statut === 'PARTIEL').length,
      NON_PAYE: filteredInvoices.filter(i => i.statut === 'NON_PAYE').length,
    };
    const avgInvoice = filteredInvoices.length > 0 ? Math.round(totalBilled / filteredInvoices.length) : 0;
    const topUnpaid = filteredInvoices
      .map(i => ({ ...i, remaining: convertCurrency(i.montantTotal - i.montantPaye, i.devise, currency, exchangeRate) }))
      .sort((a, b) => b.remaining - a.remaining)[0];
    return { totalBilled, totalPaid, totalUnpaid, count: filteredInvoices.length, recoveryRate, byStatus, avgInvoice, topUnpaid };
  }, [filteredInvoices, payments, currency, exchangeRate]);

  const analytics = useMemo(() => {
    const byClass = new Map<string, { total: number; paid: number; count: number }>();
    filteredInvoices.forEach(inv => {
      const total = convertCurrency(inv.montantTotal, inv.devise, currency, exchangeRate);
      const paid = convertCurrency(inv.montantPaye, inv.devise, currency, exchangeRate);
      const cls = byClass.get(inv.nomClasse) || { total: 0, paid: 0, count: 0 };
      cls.total += total; cls.paid += paid; cls.count += 1;
      byClass.set(inv.nomClasse, cls);
    });
    return {
      byClass: Array.from(byClass.entries()).map(([name, v]) => ({ name, total: v.total, paid: v.paid, count: v.count })).sort((a, b) => b.total - a.total),
    };
  }, [filteredInvoices, currency, exchangeRate]);

  const exportCSV = () => {
    const header = '\uFEFFNuméro;Élève;Classe;Total;Payé;Reste;Devise;Statut;Échéance\n';
    const rows = filteredInvoices.map(i => `${i.numeroFacture};${i.nomEleve};${i.nomClasse};${i.montantTotal};${i.montantPaye};${i.montantTotal - i.montantPaye};${i.devise};${i.statut};${i.dateEcheance?.split('T')[0] || ''}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const header = '<tr><th>Numéro</th><th>Élève</th><th>Classe</th><th>Total</th><th>Payé</th><th>Reste</th><th>Devise</th><th>Statut</th><th>Échéance</th></tr>';
    const rows = filteredInvoices.map(i => `<tr><td>${i.numeroFacture}</td><td>${i.nomEleve}</td><td>${i.nomClasse}</td><td>${i.montantTotal}</td><td>${i.montantPaye}</td><td>${i.montantTotal - i.montantPaye}</td><td>${i.devise}</td><td>${i.statut}</td><td>${i.dateEcheance?.split('T')[0] || ''}</td></tr>`).join('');
    const html = `<table border="1">${header}${rows}</table>`;
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printList = () => {
    window.print();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette facture et ses paiements ?')) return;
    await LocalDatabaseService.deleteInvoice(id);
    await loadAll();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Factures & Recouvrement</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gestion, filtres et exports des factures</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Exporter CSV">
            <FileDown className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={exportExcel} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Exporter Excel">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={printList} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Imprimer">
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle facture
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: 'Factures', val: String(stats.count), color: '#6366f1', icon: Receipt },
          { label: 'Total facturé', val: fmt(stats.totalBilled), color: '#3b82f6', icon: Eye },
          { label: 'Déjà payé', val: fmt(stats.totalPaid), color: '#10b981', icon: Receipt },
          { label: 'Reste à recouvrer', val: fmt(stats.totalUnpaid), color: stats.totalUnpaid > 0 ? '#ef4444' : '#10b981', icon: TrendingDown },
          { label: 'Taux recouvrement', val: `${stats.recoveryRate}%`, color: stats.recoveryRate >= 80 ? '#10b981' : stats.recoveryRate >= 50 ? '#f59e0b' : '#ef4444', icon: Filter },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}12` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Soldées</p>
          <p className="text-xl font-black text-emerald-600">{stats.byStatus.PAYE}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Partielles</p>
          <p className="text-xl font-black text-amber-600">{stats.byStatus.PARTIEL}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Impayées</p>
          <p className="text-xl font-black text-rose-600">{stats.byStatus.NON_PAYE}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Moyenne / facture</p>
          <p className="text-xl font-black text-indigo-600">{fmt(stats.avgInvoice)}</p>
          {stats.topUnpaid && (
            <p className="text-[10px] text-slate-500 mt-1 truncate" title={stats.topUnpaid.nomEleve}>Max impayé: {fmt(stats.topUnpaid.remaining)}</p>
          )}
        </div>
      </div>

      {filteredInvoices.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Filter className="w-4 h-4 text-indigo-500" /> Recouvrement par classe
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byClass.slice(0, 8)} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" name="Facturé" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="Payé" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Eye className="w-4 h-4 text-amber-500" /> Répartition par statut
            </h3>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Soldée', value: stats.byStatus.PAYE, color: '#10b981' },
                      { name: 'Partielle', value: stats.byStatus.PARTIEL, color: '#f59e0b' },
                      { name: 'Impayée', value: stats.byStatus.NON_PAYE, color: '#ef4444' },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {[
                      { name: 'Soldée', value: stats.byStatus.PAYE, color: '#10b981' },
                      { name: 'Partielle', value: stats.byStatus.PARTIEL, color: '#f59e0b' },
                      { name: 'Impayée', value: stats.byStatus.NON_PAYE, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="p-4 border-b flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une facture, un eleve..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <CustomSelect
            options={[{ value: '', label: 'Tous statuts' }, { value: 'NON_PAYE', label: 'Impayé' }, { value: 'PARTIEL', label: 'Partiel' }, { value: 'PAYE', label: 'Soldé' }]}
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-36"
          />
          <CustomSelect
            options={[{ value: '', label: 'Toutes années' }, ...years.map(y => ({ value: y.id, label: y.nom }))]}
            value={yearFilter}
            onChange={setYearFilter}
            className="w-40"
          />
          <CustomSelect
            options={[{ value: '', label: 'Toutes classes' }, ...Array.from(new Set(invoices.map(i => i.nomClasse).filter(Boolean))).sort().map(c => ({ value: c, label: c }))]}
            value={classFilter}
            onChange={setClassFilter}
            className="w-40"
          />
          <CustomSelect
            options={[{ value: '', label: 'Toutes options' }, ...Array.from(new Set(classes.map(c => c.optionCode).filter((o): o is string => !!o))).sort().map(o => ({ value: o, label: o }))]}
            value={optionFilter}
            onChange={setOptionFilter}
            className="w-36"
          />
          <CustomSelect
            options={[{ value: '', label: 'Toutes devises' }, { value: 'USD', label: 'USD ($)' }, { value: 'CDF', label: 'CDF (FC)' }]}
            value={deviseFilter}
            onChange={setDeviseFilter}
            className="w-36"
          />
          <div className="flex items-center gap-2">
            <DatePicker value={dateFrom} onChange={setDateFrom} className="w-36" />
            <span className="text-xs text-slate-400">-</span>
            <DatePicker value={dateTo} onChange={setDateTo} className="w-36" />
          </div>
          <div className="flex items-center gap-2">
            <NumberInput value={amountMin} onChange={setAmountMin} min={0} placeholder="Min" className="input text-xs py-2 w-24" />
            <span className="text-xs text-slate-400">-</span>
            <NumberInput value={amountMax} onChange={setAmountMax} min={0} placeholder="Max" className="input text-xs py-2 w-24" />
          </div>
          {(classFilter || optionFilter || statusFilter || yearFilter || search || deviseFilter || dateFrom || dateTo || amountMin || amountMax) && (
            <button
              onClick={() => { setClassFilter(''); setOptionFilter(''); setStatusFilter(''); setSearch(''); setYearFilter(activeSchoolYear || ''); setDeviseFilter(''); setDateFrom(''); setDateTo(''); setAmountMin(0); setAmountMax(0); }}
              className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
            >
              Effacer filtres
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Eleve</th>
                <th>Classe</th>
                <th>Montant</th>
                <th>Paye</th>
                <th>Reste</th>
                <th>Statut</th>
                <th>Echeance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const remaining = convertCurrency(inv.montantTotal - inv.montantPaye, inv.devise, currency, exchangeRate);
                return (
                  <tr key={inv.id}>
                    <td>
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{inv.numeroFacture}</span>
                    </td>
                    <td>
                      <p className="font-bold text-[12px]" style={{ color: 'var(--text-primary)' }}>{inv.nomEleve}</p>
                    </td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{inv.nomClasse}</td>
                    <td className="font-black text-[14px]" style={{ color: 'var(--text-primary)' }}>{fmt(inv.montantTotal, inv.devise)}</td>
                    <td className="font-semibold text-emerald-600">{fmt(inv.montantPaye, inv.devise)}</td>
                    <td className="font-semibold" style={{ color: remaining > 0 ? '#ef4444' : '#059669' }}>{fmt(remaining, currency)}</td>
                    <td>{invoiceStatusBadge(inv.statut)}</td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{inv.dateEcheance?.split('T')[0] || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {inv.statut !== 'PAYE' && (
                          <button onClick={() => setPayInvoice(inv)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600" title="Payer">
                            Payer
                          </button>
                        )}
                        <button onClick={() => window.print()} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100" title="Imprimer">
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Aucune facture trouvee.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="section-card mt-6">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Derniers paiements</h3>
        </div>
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Recu</th>
              <th>Eleve</th>
              <th>Moyen</th>
              <th>Reference</th>
              <th>Montant</th>
              <th>Caissier</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.slice(0, 15).map(p => (
              <tr key={p.id}>
                <td><span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{p.numeroRecu}</span></td>
                <td>
                  <p className="font-bold text-[12px]" style={{ color: 'var(--text-primary)' }}>{p.nomEleve}</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{p.registrationNumber}</p>
                </td>
                <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.moyenPaiement}</td>
                <td className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                <td className="font-black text-[14px] text-emerald-700">{fmt(p.montantPaye, p.devise)}</td>
                <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.nomCaissier}</td>
                <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.dateCreation?.split('T')[0]}</td>
                <td className="text-right">
                  <button
                    onClick={() => setViewReceipt(p)}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-all"
                    title="Voir le reçu"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateInvoiceModal
          students={students}
          feeTypes={feeTypes}
          years={years}
          onClose={() => setShowCreate(false)}
          onSaved={loadAll}
        />
      )}
      {payInvoice && (
        <PaymentModal
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={() => {
            loadAll().then(() => {
              LocalDatabaseService.getPayments(payInvoice.id).then(payments => {
                if (payments.length > 0) {
                  setViewReceipt(payments[payments.length - 1]);
                }
              });
            });
          }}
        />
      )}

      {viewReceipt && (
        <ReceiptModal
          isOpen={!!viewReceipt}
          onClose={() => setViewReceipt(null)}
          payment={viewReceipt}
          invoice={invoices.find(inv => inv.id === viewReceipt.invoiceId)}
          feeTypes={feeTypes}
        />
      )}
    </div>
  );
};

const CreateInvoiceModal: React.FC<{
  students: Eleve[];
  feeTypes: TypeFraisScolaire[];
  years: AnneeScolaireConfig[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ students, feeTypes, years, onClose, onSaved }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [studentId, setStudentId] = useState<string>('');
  const [yearId, setYearId] = useState<string>(years.find(y => y.statut === 'EN_COURS')?.id || '');
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [lines, setLines] = useState<{ feeTypeId: string; montant: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const activeYear = years.find(y => y.id === yearId) || years[0];
  const selectedStudent = students.find(s => s.id === studentId);

  const toggleFee = (ft: TypeFraisScolaire) => {
    const exists = lines.find(l => l.feeTypeId === ft.id);
    if (exists) {
      setLines(lines.filter(l => l.feeTypeId !== ft.id));
    } else {
      setLines([...lines, { feeTypeId: ft.id, montant: convertCurrency(ft.montant, ft.devise, currency, exchangeRate) }]);
    }
  };

  const total = lines.reduce((a, l) => {
    const ft = feeTypes.find(f => f.id === l.feeTypeId);
    return a + convertCurrency(l.montant, currency, ft?.devise || 'USD', exchangeRate);
  }, 0);

  const handleSubmit = async () => {
    if (!studentId || lines.length === 0) return;
    setLoading(true);
    const invoiceLignes: LigneFacture[] = lines.map(l => {
      const ft = feeTypes.find(f => f.id === l.feeTypeId)!;
      return {
        id: uuid(),
        invoiceId: '',
        feeTypeId: ft.id,
        nom: ft.nom,
        categorie: ft.categorie,
        montant: convertCurrency(l.montant, currency, ft.devise, exchangeRate),
        devise: ft.devise,
      };
    });
    const invoice: FactureEleve = {
      id: uuid(),
      anneeScolaireId: yearId,
      anneeScolaire: activeYear?.nom,
      numeroFacture: `F-${Date.now()}`,
      eleveId: studentId,
      studentId,
      nomEleve: `${selectedStudent?.prenom || ''} ${selectedStudent?.nom || ''}`.trim() || 'Eleve',
      nomClasse: selectedStudent?.nomClasse || '—',
      montantTotal: invoiceLignes.reduce((a, l) => a + l.montant, 0),
      montantPaye: 0,
      devise: currency,
      statut: 'NON_PAYE',
      dateEcheance: dueDate,
      lignes: invoiceLignes,
    };
    await LocalDatabaseService.addInvoice(invoice);
    setLoading(false);
    onSaved();
    onClose();
  };

  const studentOptions = [
    { value: '', label: 'Sélectionner un élève' },
    ...students.map(s => ({ value: s.id, label: `${s.prenom} ${s.nom} · ${s.nomClasse || s.classId}` })),
  ];
  const yearOptions = years.map(y => ({ value: y.id, label: y.nom }));

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 max-h-[92vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-2xl)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Nouvelle facture</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Sélectionnez l'élève, l'année et les frais à facturer.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Élève</label>
              <CustomSelect options={studentOptions} value={studentId} onChange={setStudentId} searchable />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect options={yearOptions} value={yearId} onChange={setYearId} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Date d'échéance</label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Types de frais</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {feeTypes.map(ft => {
                const selected = lines.find(l => l.feeTypeId === ft.id);
                return (
                  <button
                    key={ft.id}
                    onClick={() => toggleFee(ft)}
                    className="p-3 rounded-xl border text-left transition-all hover:border-indigo-500/30"
                    style={{
                      borderColor: selected ? '#6366f1' : 'var(--border)',
                      background: selected ? 'rgba(99,102,241,0.10)' : 'var(--bg-surface)',
                      borderWidth: selected ? '2px' : '1px',
                    }}
                  >
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ft.nom}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ft.categorie.replace(/_/g, ' ')} · {fmt(ft.montant, ft.devise)}</p>
                    {selected && (
                      <NumberInput
                        value={selected.montant}
                        onChange={v => setLines(lines.map(l => l.feeTypeId === ft.id ? { ...l, montant: v } : l))}
                        onClick={e => (e.target as HTMLInputElement).focus()}
                        min={0}
                        placeholder="Montant"
                        className="mt-2 w-full text-sm rounded-lg border px-2 py-1.5"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Total facture</span>
            <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !studentId || lines.length === 0}
            className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{ background: '#6366f1', color: 'white', opacity: loading || !studentId || lines.length === 0 ? 0.5 : 1 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Création...' : 'Créer la facture'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
