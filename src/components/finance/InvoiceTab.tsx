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
  RotateCw,
  MoreVertical,
  CreditCard,
  Send,
  MessageCircle,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { isFeeTypeApplicable } from '../../utils/feeFilters';
import { getInvoiceTotal, getInvoicePaid, getPaymentAmount, getInvoiceStatus } from '../../utils/financeCalculations';
import type { FactureEleve, TransactionPaiement, Eleve, TypeFraisScolaire, LigneFacture, AnneeScolaireConfig, ClasseScolaire } from '../../types';
import { showToast } from '../common/ToastNotification';

const CYCLE_LABELS: Record<string, string> = {
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  SECONDAIRE_CTEB: 'Secondaire / CTEB',
  HUMANITES: 'Humanités',
};
import { CustomSelect } from '../common/CustomSelect';
import { DatePicker } from '../common/DatePicker';
import { NumberInput } from '../common/NumberInput';
import { ActionMenu } from '../common/ActionMenu';
import { PaginationBar } from '../common/PaginationBar';
import { SortableTh } from '../common/SortableTh';
import { PayFeesModal } from './PayFeesModal';
import { InvoiceSendModal } from './InvoiceSendModal';
import { ReceiptModal, Barcode128 } from './ReceiptModal';
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
  if (statut === 'PAYE') {
    return <span className="chip-tonal chip-tonal-emerald">✓ Soldé</span>;
  }
  if (statut === 'PARTIEL') {
    return <span className="chip-tonal chip-tonal-amber">◑ Partiel</span>;
  }
  return <span className="chip-tonal chip-tonal-rose">✗ Impayé</span>;
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
  const [yearFilter, setYearFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [optionFilter, setOptionFilter] = useState<string>('');
  const [deviseFilter, setDeviseFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [amountMin, setAmountMin] = useState<number>(0);
  const [amountMax, setAmountMax] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('dateEcheance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [paySortBy, setPaySortBy] = useState<string>('date');
  const [paySortOrder, setPaySortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreate, setShowCreate] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState<FactureEleve | null>(null);
  const [viewReceipt, setViewReceipt] = useState<TransactionPaiement | null>(null);
  const [viewInvoice, setViewInvoice] = useState<FactureEleve | null>(null);
  const [sendInvoice, setSendInvoice] = useState<FactureEleve | null>(null);
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(10);
  const [payPage, setPayPage] = useState(1);
  const [payPageSize, setPayPageSize] = useState(10);
  const [paySearch, setPaySearch] = useState('');
  const [payMethodFilter, setPayMethodFilter] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePaySort = (field: string) => {
    if (paySortBy === field) {
      setPaySortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setPaySortBy(field);
      setPaySortOrder('asc');
    }
  };

  const activeYearId = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear)?.id, [years, activeSchoolYear]);

  useEffect(() => {
    setYearFilter(activeYearId || '');
  }, [activeYearId]);

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
    const lastPaymentByInvoice = new Map<string, string>();
    for (const p of payments) {
      if (!p.invoiceId) continue;
      const current = lastPaymentByInvoice.get(p.invoiceId) || '';
      if ((p.dateCreation || '') > current) {
        lastPaymentByInvoice.set(p.invoiceId, p.dateCreation || '');
      }
    }

    const list = invoices.filter(inv => {
      const matchesSearch = !search || [inv.nomEleve, inv.nomClasse, inv.numeroFacture].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const invStatus = getInvoiceStatus(inv, payments, currency);
      const matchesStatus = !statusFilter || invStatus === statusFilter;
      const matchesYear = !yearFilter || inv.anneeScolaireId === yearFilter || inv.anneeScolaire === yearFilter;
      const matchesClass = !classFilter || inv.nomClasse === classFilter;
      const cls = classes.find(c => c.nom === inv.nomClasse);
      const matchesOption = !optionFilter || cls?.optionCode === optionFilter;
      const matchesDevise = !deviseFilter || inv.devise === deviseFilter;
      const matchesDate = (!dateFrom || (inv.dateEcheance && inv.dateEcheance >= dateFrom)) && (!dateTo || (inv.dateEcheance && inv.dateEcheance <= dateTo));
      const matchesAmount = (!amountMin || inv.montantTotal >= amountMin) && (!amountMax || inv.montantTotal <= amountMax);
      return matchesSearch && matchesStatus && matchesYear && matchesClass && matchesOption && matchesDevise && matchesDate && matchesAmount;
    });

    return [...list].sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case 'numeroFacture':
          res = (a.numeroFacture || '').localeCompare(b.numeroFacture || '');
          break;
        case 'nomEleve':
          res = (a.nomEleve || '').localeCompare(b.nomEleve || '');
          break;
        case 'nomClasse':
          res = (a.nomClasse || '').localeCompare(b.nomClasse || '');
          break;
        case 'montantTotal':
          res = (a.montantTotal || 0) - (b.montantTotal || 0);
          break;
        case 'montantPaye': {
          const paidA = getInvoicePaid(a, payments, currency);
          const paidB = getInvoicePaid(b, payments, currency);
          res = paidA - paidB;
          break;
        }
        case 'resteDu': {
          const remA = getInvoiceTotal(a, currency) - getInvoicePaid(a, payments, currency);
          const remB = getInvoiceTotal(b, currency) - getInvoicePaid(b, payments, currency);
          res = remA - remB;
          break;
        }
        case 'statut':
          res = (getInvoiceStatus(a, payments, currency) || '').localeCompare(getInvoiceStatus(b, payments, currency) || '');
          break;
        case 'dateEcheance':
        default:
          res = (a.dateEcheance || '').localeCompare(b.dateEcheance || '');
          break;
        case 'dernierEncaissement': {
          const da = lastPaymentByInvoice.get(a.id) || '';
          const db = lastPaymentByInvoice.get(b.id) || '';
          res = da.localeCompare(db);
          break;
        }
      }
      return sortOrder === 'asc' ? res : -res;
    });
  }, [invoices, search, statusFilter, yearFilter, classFilter, optionFilter, classes, deviseFilter, dateFrom, dateTo, amountMin, amountMax, sortBy, sortOrder, payments, currency, exchangeRate]);

  // Reset page when filters change
  useEffect(() => { setInvPage(1); }, [search, statusFilter, yearFilter, classFilter, optionFilter, deviseFilter, dateFrom, dateTo, amountMin, amountMax, sortBy, sortOrder]);

  const paginatedInvoices = useMemo(() => {
    const start = (invPage - 1) * invPageSize;
    return filteredInvoices.slice(start, start + invPageSize);
  }, [filteredInvoices, invPage, invPageSize]);

  const sortedPayments = useMemo(() => {
    return [...payments].sort((a, b) => {
      let res = 0;
      switch (paySortBy) {
        case 'numeroRecu':
          res = (a.numeroRecu || '').localeCompare(b.numeroRecu || '');
          break;
        case 'nomEleve':
          res = (a.nomEleve || '').localeCompare(b.nomEleve || '');
          break;
        case 'moyenPaiement':
          res = (a.moyenPaiement || '').localeCompare(b.moyenPaiement || '');
          break;
        case 'reference':
          res = (a.reference || '').localeCompare(b.reference || '');
          break;
        case 'montant':
          res = getPaymentAmount(a, currency) - getPaymentAmount(b, currency);
          break;
        case 'nomCaissier':
          res = (a.nomCaissier || '').localeCompare(b.nomCaissier || '');
          break;
        case 'date':
        default:
          res = (a.dateCreation || '').localeCompare(b.dateCreation || '');
          break;
      }
      return paySortOrder === 'asc' ? res : -res;
    });
  }, [payments, paySortBy, paySortOrder, currency]);

  const filteredPayments = useMemo(() => {
    return sortedPayments.filter(p => {
      if (payMethodFilter && p.moyenPaiement !== payMethodFilter) return false;
      if (paySearch) {
        const q = paySearch.toLowerCase();
        const haystack = `${p.numeroRecu} ${p.nomEleve} ${p.registrationNumber} ${p.nomCaissier} ${p.reference || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [sortedPayments, paySearch, payMethodFilter]);

  const paginatedPayments = useMemo(() => {
    const start = (payPage - 1) * payPageSize;
    return filteredPayments.slice(start, start + payPageSize);
  }, [filteredPayments, payPage, payPageSize]);

  const stats = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((a, i) => a + getInvoiceTotal(i, currency), 0);
    const invoiceIds = new Set(filteredInvoices.map(i => i.id));
    const totalPaid = payments.filter(p => invoiceIds.has(p.invoiceId || '')).reduce((a, p) => a + getPaymentAmount(p, currency), 0);
    const totalUnpaid = Math.max(0, totalBilled - totalPaid);
    const recoveryRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;
    const byStatus = {
      PAYE: filteredInvoices.filter(i => getInvoiceStatus(i, payments, currency) === 'PAYE').length,
      PARTIEL: filteredInvoices.filter(i => getInvoiceStatus(i, payments, currency) === 'PARTIEL').length,
      NON_PAYE: filteredInvoices.filter(i => getInvoiceStatus(i, payments, currency) === 'NON_PAYE').length,
    };
    const avgInvoice = filteredInvoices.length > 0 ? Math.round(totalBilled / filteredInvoices.length) : 0;
    const topUnpaid = filteredInvoices
      .map(i => ({ ...i, remaining: getInvoiceTotal(i, currency) - getInvoicePaid(i, payments, currency) }))
      .sort((a, b) => b.remaining - a.remaining)[0];
    return { totalBilled, totalPaid, totalUnpaid, count: filteredInvoices.length, recoveryRate, byStatus, avgInvoice, topUnpaid };
  }, [filteredInvoices, payments, currency, exchangeRate]);

  const analytics = useMemo(() => {
    const byClass = new Map<string, { total: number; paid: number; count: number }>();
    filteredInvoices.forEach(inv => {
      const total = getInvoiceTotal(inv, currency);
      const paid = getInvoicePaid(inv, payments, currency);
      const cls = byClass.get(inv.nomClasse) || { total: 0, paid: 0, count: 0 };
      cls.total += total; cls.paid += paid; cls.count += 1;
      byClass.set(inv.nomClasse, cls);
    });
    return {
      byClass: Array.from(byClass.entries()).map(([name, v]) => ({ name, total: v.total, paid: v.paid, count: v.count })).sort((a, b) => b.total - a.total),
    };
  }, [filteredInvoices, payments, currency]);

  const exportCSV = () => {
    const header = '\uFEFFNuméro;Élève;Classe;Total;Payé;Reste;Devise;Statut;Échéance\n';
    const rows = filteredInvoices.map(i => {
      const total = getInvoiceTotal(i, currency);
      const paid = getInvoicePaid(i, payments, currency);
      const reste = Math.max(0, total - paid);
      const statut = getInvoiceStatus(i, payments, currency);
      return `${i.numeroFacture};${i.nomEleve};${i.nomClasse};${total.toFixed(2)};${paid.toFixed(2)};${reste.toFixed(2)};${i.devise};${statut};${i.dateEcheance?.split('T')[0] || ''}`;
    }).join('\n');
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
    const rows = filteredInvoices.map(i => {
      const total = getInvoiceTotal(i, currency);
      const paid = getInvoicePaid(i, payments, currency);
      const reste = Math.max(0, total - paid);
      const statut = getInvoiceStatus(i, payments, currency);
      return `<tr><td>${i.numeroFacture}</td><td>${i.nomEleve}</td><td>${i.nomClasse}</td><td>${total.toFixed(2)}</td><td>${paid.toFixed(2)}</td><td>${reste.toFixed(2)}</td><td>${i.devise}</td><td>${statut}</td><td>${i.dateEcheance?.split('T')[0] || ''}</td></tr>`;
    }).join('');
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

  const handleSyncInvoices = async () => {
    setLoading(true);
    try {
      await LocalDatabaseService.syncStudentInvoices();
      const removed = await LocalDatabaseService.cleanupDuplicateInvoices();
      const removedFees = await LocalDatabaseService.cleanupDuplicateFeeTypes();
      if (removed > 0 || removedFees > 0) {
        const parts = [];
        if (removed > 0) parts.push(`${removed} facture(s) en double`);
        if (removedFees > 0) parts.push(`${removedFees} type(s) de frais en double`);
        showToast('Nettoyage automatique', `${parts.join(' et ')} supprimé(s).`, 'success');
      }
      await loadAll();
    } catch (e) {
      console.error('[InvoiceTab] Erreur synchro / nettoyage :', e);
      showToast('Erreur', (e as Error)?.message || 'La synchronisation a échoué.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette facture et ses paiements ?')) return;
    try {
      await LocalDatabaseService.deleteInvoice(id);
      showToast('Facture supprimée', 'La facture et ses paiements ont été supprimés.', 'success');
      await loadAll();
    } catch (e) {
      console.error('[InvoiceTab] Erreur suppression facture :', e);
      showToast('Erreur de suppression', (e as Error)?.message || 'Impossible de supprimer la facture.', 'error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Factures & Recouvrement</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gestion, filtres et exports des factures</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSyncInvoices} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Générer les factures impayées pour tous les élèves inscrits">
            <RotateCw className="w-3.5 h-3.5 text-indigo-500" /> Synchro
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Exporter CSV">
            <FileDown className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={exportExcel} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Exporter Excel">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={printList} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }} title="Imprimer la liste">
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
          <button onClick={() => setShowExportModal(true)} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5 text-white" /> Exporter Rapport PDF
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
          {/* Graphique barres - Recouvrement par classe */}
          <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Recouvrement par classe</h3>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Facturé vs Payé</p>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byClass.slice(0, 8)} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                    interval={0}
                    angle={analytics.byClass.length > 4 ? 20 : 0}
                    textAnchor={analytics.byClass.length > 4 ? 'start' : 'middle'}
                    height={analytics.byClass.length > 4 ? 45 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => fmt(v)}
                    width={70}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(v: number) => [fmt(v), '']}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: '8px' }}
                    iconType="circle"
                    verticalAlign="top"
                    align="right"
                    height={24}
                  />
                  <Bar dataKey="total" name="Facturé" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} barSize={24} />
                  <Bar dataKey="paid" name="Payé" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Graphique donut - Répartition par statut */}
          <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Répartition par statut</h3>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{filteredInvoices.length} factures au total</p>
              </div>
            </div>
            <div className="h-[240px]">
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
                    cy="45%"
                    innerRadius={52}
                    outerRadius={78}
                    cornerRadius={8}
                    paddingAngle={4}
                    stroke="var(--bg-surface)"
                    strokeWidth={3}
                  >
                    {[
                      { name: 'Soldée', value: stats.byStatus.PAYE, color: '#10b981' },
                      { name: 'Partielle', value: stats.byStatus.PARTIEL, color: '#f59e0b' },
                      { name: 'Impayée', value: stats.byStatus.NON_PAYE, color: '#ef4444' },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(v: number, n: string, p: any) => [
                      `${v} (${filteredInvoices.length > 0 ? Math.round((v / filteredInvoices.length) * 100) : 0}%)`,
                      n,
                    ]}
                    labelStyle={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '4px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Légende personnalisée en Material Design */}
            <div className="grid grid-cols-3 gap-2 -mt-2">
              {[
                { label: 'Soldée', value: stats.byStatus.PAYE, color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
                { label: 'Partielle', value: stats.byStatus.PARTIEL, color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-600' },
                { label: 'Impayée', value: stats.byStatus.NON_PAYE, color: '#ef4444', bg: 'bg-rose-500/10', text: 'text-rose-600' },
              ].map(s => (
                <div key={s.label} className={`p-2.5 rounded-xl border ${s.bg} flex flex-col items-center gap-1`} style={{ borderColor: `${s.color}30` }}>
                  <span className={`text-xs font-black ${s.text}`}>{s.value}</span>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                  <span className="text-[10px] font-black" style={{ color: s.color }}>
                    {filteredInvoices.length > 0 ? Math.round((s.value / filteredInvoices.length) * 100) : 0}%
                  </span>
                </div>
              ))}
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
          <CustomSelect
            options={[
              { value: 'dateEcheance', label: 'Tri : Échéance' },
              { value: 'dernierEncaissement', label: 'Tri : Dernier encaissement' },
              { value: 'montantTotal', label: 'Tri : Montant total' },
              { value: 'resteDu', label: 'Tri : Reste dû' },
              { value: 'nomEleve', label: 'Tri : Élève' },
            ]}
            value={sortBy}
            onChange={setSortBy}
            className="w-44"
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

        <div className="modern-table-container">
          <table className="modern-table w-full">
            <thead>
              <tr className="table-sticky-header">
                <SortableTh label="N° Facture" field="numeroFacture" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Élève & Matricule" field="nomEleve" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Classe" field="nomClasse" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Montant Total" field="montantTotal" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Montant Payé" field="montantPaye" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Reste Dû" field="resteDu" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Statut" field="statut" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Échéance" field="dateEcheance" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvoices.map(inv => {
                const invTotal = getInvoiceTotal(inv, currency);
                const invPaid = getInvoicePaid(inv, payments, currency);
                const remaining = Math.max(0, invTotal - invPaid);
                const invStatus = getInvoiceStatus(inv, payments, currency);
                return (
                  <tr key={inv.id} className="group">
                    <td>
                      <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{inv.numeroFacture}</span>
                    </td>
                    <td>
                      <p className="font-bold text-xs group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>{inv.nomEleve}</p>
                    </td>
                    <td className="text-xs font-semibold text-slate-600 dark:text-slate-300">{inv.nomClasse}</td>
                    <td className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>{fmt(invTotal)}</td>
                    <td className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{fmt(invPaid)}</td>
                    <td className="font-black text-xs" style={{ color: remaining > 0 ? '#ef4444' : '#10b981' }}>{fmt(remaining)}</td>
                    <td>{invoiceStatusBadge(invStatus)}</td>
                    <td className="text-[11px] font-mono text-slate-400">{inv.dateEcheance?.split('T')[0] || '—'}</td>
                    <td className="text-right">
                      <ActionMenu
                        items={[
                          { label: 'Voir détails', icon: Eye, onClick: () => setViewInvoice(inv) },
                          ...(invStatus !== 'PAYE' ? [{ label: 'Encaisser', icon: CreditCard, onClick: () => setPayInvoice(inv) }] : []),
                          {
                            label: 'Voir reçu',
                            icon: FileText,
                            onClick: () => {
                              const invPayments = payments.filter(p => p.invoiceId === inv.id);
                              if (invPayments.length > 0) setViewReceipt(invPayments[invPayments.length - 1]);
                            },
                          },
                          { label: 'Imprimer la facture', icon: Printer, onClick: () => setViewInvoice(inv) },
                          { label: 'Envoyer / Partager', icon: Send, onClick: () => setSendInvoice(inv) },
                          { label: 'Supprimer', icon: Trash2, onClick: () => handleDelete(inv.id), danger: true, separatorBefore: true },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-xs font-semibold text-slate-400">
                    Aucune facture trouvée pour ces critères.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredInvoices.length > 0 && (
          <PaginationBar
            totalItems={filteredInvoices.length}
            currentPage={invPage}
            pageSize={invPageSize}
            onPageChange={setInvPage}
            onPageSizeChange={setInvPageSize}
          />
        )}
      </div>

      {/* ── HISTORIQUE DES ENCAISSEMENTS ── */}
      <div className="rounded-2xl border shadow-xs transition-colors overflow-hidden mt-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

        {/* En-tête avec KPIs de synthèse */}
        <div className="p-4 sm:p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>Encaissements Effectués</h3>
                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>Journal complet des paiements reçus</p>
              </div>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                {payments.length} reçus
              </span>
            </div>

            {/* Mini-KPI bande rapide */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                {
                  label: 'Total encaissé',
                  value: fmt(payments.reduce((a, p) => a + getPaymentAmount(p, currency), 0), currency),
                  color: 'text-emerald-600 dark:text-emerald-400',
                  bg: 'bg-emerald-500/8 border-emerald-500/20',
                },
                {
                  label: 'Esp. / Caisse',
                  value: payments.filter(p => p.moyenPaiement === 'CASH').length,
                  suffix: 'reçus',
                  color: 'text-amber-600 dark:text-amber-400',
                  bg: 'bg-amber-500/8 border-amber-500/20',
                },
                {
                  label: 'Mobile Money',
                  value: payments.filter(p => ['FLEXPAY_MPESA','FLEXPAY_ORANGE','FLEXPAY_AIRTEL'].includes(p.moyenPaiement)).length,
                  suffix: 'reçus',
                  color: 'text-violet-600 dark:text-violet-400',
                  bg: 'bg-violet-500/8 border-violet-500/20',
                },
              ].map(kpi => (
                <div key={kpi.label} className={`px-3 py-1.5 rounded-xl border text-center ${kpi.bg}`} style={{ borderColor: 'var(--border)' }}>
                  <p className={`text-sm font-black ${kpi.color}`}>
                    {kpi.value}{kpi.suffix ? ` ${kpi.suffix}` : ''}
                  </p>
                  <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Barre de recherche + tri dédiés à la liste des encaissements */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                placeholder="Rechercher un reçu, élève, caissier..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none transition-all"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={paySearch}
                onChange={e => {
                  setPaySearch(e.target.value);
                  setPayPage(1);
                }}
              />
            </div>
            <CustomSelect
              options={[
                { value: '', label: 'Tous les modes' },
                { value: 'CASH', label: '💵 Espèces' },
                { value: 'BANK', label: '🏦 Virement' },
                { value: 'FLEXPAY_MPESA', label: '📱 M-Pesa' },
                { value: 'FLEXPAY_ORANGE', label: '📱 Orange Money' },
                { value: 'FLEXPAY_AIRTEL', label: '📱 Airtel Money' },
                { value: 'FLUTTERWAVE_CARTE', label: '💳 Carte' },
              ]}
              value={payMethodFilter}
              onChange={v => { setPayMethodFilter(v); setPayPage(1); }}
              className="w-44"
              placeholder="Mode de paiement"
            />
            <SortableTh label="" field="date" currentSortField={paySortBy} currentSortOrder={paySortOrder} onSort={handlePaySort} />
          </div>
        </div>

        {/* Liste des encaissements sous forme de lignes riches */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {paginatedPayments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-4 rounded-2xl bg-slate-500/8 border border-slate-500/15">
                <Receipt className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-400">Aucun encaissement enregistré</p>
              <p className="text-xs text-slate-400">Les encaissements apparaîtront ici après chaque paiement reçu.</p>
            </div>
          )}

          {paginatedPayments.map((p, idx) => {
            const amount = getPaymentAmount(p, currency);
            const methodMeta: Record<string, { icon: string; label: string; color: string; bg: string }> = {
              CASH:              { icon: '💵', label: 'Espèces',       color: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/20' },
              BANK:              { icon: '🏦', label: 'Virement',      color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-500/10 border-blue-500/20' },
              FLEXPAY_MPESA:     { icon: '📱', label: 'M-Pesa',        color: 'text-rose-700 dark:text-rose-300',     bg: 'bg-rose-500/10 border-rose-500/20' },
              FLEXPAY_ORANGE:    { icon: '📱', label: 'Orange Money',  color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-500/10 border-orange-500/20' },
              FLEXPAY_AIRTEL:    { icon: '📱', label: 'Airtel Money',  color: 'text-red-700 dark:text-red-300',       bg: 'bg-red-500/10 border-red-500/20' },
              FLUTTERWAVE_CARTE: { icon: '💳', label: 'Carte bancaire',color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-500/10 border-violet-500/20' },
            };
            const meta = methodMeta[p.moyenPaiement] || { icon: '💰', label: p.moyenPaiement, color: 'text-slate-600', bg: 'bg-slate-500/10 border-slate-500/20' };
            const initials = (p.nomCaissier || 'CA').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
            const dateStr = p.dateCreation ? new Date(p.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

            return (
              <div
                key={p.id}
                className="group flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-500/4 transition-colors cursor-default"
                style={{ animationDelay: `${idx * 20}ms` }}
              >
                {/* Numéro d'ordre & icône de méthode */}
                <div className="flex flex-col items-center gap-1 min-w-[28px]">
                  <span className="text-[9.5px] font-black text-slate-400 tabular-nums">#{(payPage - 1) * payPageSize + idx + 1}</span>
                  <span className="text-base">{meta.icon}</span>
                </div>

                {/* Numéro de reçu */}
                <div className="min-w-[130px] hidden sm:block">
                  <span className="font-mono text-[10.5px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25 inline-block">
                    {p.numeroRecu}
                  </span>
                </div>

                {/* Élève */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                    {p.nomEleve}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-slate-400">{p.registrationNumber || '—'}</span>
                    {p.reference && (
                      <span className="text-[9.5px] font-bold text-slate-400 bg-slate-500/10 px-1.5 py-0.5 rounded border border-slate-500/20">
                        Réf: {p.reference}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge mode de paiement */}
                <div className="hidden md:flex">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10.5px] font-black ${meta.color} ${meta.bg}`}>
                    <span className="text-sm leading-none">{meta.icon}</span>
                    {meta.label}
                  </span>
                </div>

                {/* Avatar caissier */}
                <div className="hidden lg:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400">{initials}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 max-w-[90px] truncate">{p.nomCaissier}</span>
                </div>

                {/* Montant — ancré à droite */}
                <div className="text-right min-w-[90px]">
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(amount, currency)}</p>
                  <p className="text-[9.5px] font-mono text-slate-400 mt-0.5">{dateStr}</p>
                </div>

                {/* Actions rapides : toujours visibles sur hover */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  <button
                    onClick={() => setViewReceipt(p)}
                    className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Voir & Imprimer le reçu"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewReceipt(p)}
                    className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                    title="Aperçu du ticket"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPayments.length > 0 && (
          <PaginationBar
            totalItems={filteredPayments.length}
            currentPage={payPage}
            pageSize={payPageSize}
            onPageChange={setPayPage}
            onPageSizeChange={setPayPageSize}
          />
        )}
      </div>

      {showCreate && (
        <CreateInvoiceModal
          students={students}
          feeTypes={feeTypes}
          years={years}
          classes={classes}
          onClose={() => setShowCreate(false)}
          onSaved={loadAll}
        />
      )}
      {payInvoice && (
        <PayFeesModal
          activeSchoolYear={activeYearId}
          initialStudentId={payInvoice.eleveId}
          initialInvoiceId={payInvoice.id}
          onClose={() => setPayInvoice(null)}
          onSaved={() => {
            setPayInvoice(null);
            loadAll();
          }}
        />
      )}

      {viewReceipt && (
        <ReceiptModal
          isOpen={!!viewReceipt}
          onClose={() => { setViewReceipt(null); loadAll(); }}
          payment={viewReceipt}
          invoice={invoices.find(inv => inv.id === viewReceipt.invoiceId)}
          feeTypes={feeTypes}
        />
      )}

      {viewInvoice && (
        <InvoiceDetailModal
          invoice={viewInvoice}
          payments={payments.filter(p => p.invoiceId === viewInvoice.id)}
          feeTypes={feeTypes}
          onClose={() => setViewInvoice(null)}
          onPay={() => { setPayInvoice(viewInvoice); setViewInvoice(null); }}
        />
      )}

      {sendInvoice && (
        <InvoiceSendModal
          invoice={sendInvoice}
          student={students.find(s => s.id === (sendInvoice.eleveId || sendInvoice.studentId))}
          payments={payments.filter(p => p.invoiceId === sendInvoice.id)}
          feeTypes={feeTypes}
          onClose={() => setSendInvoice(null)}
        />
      )}

      {showExportModal && (
        <InvoiceExportModal
          invoices={invoices}
          payments={payments}
          classes={classes}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

const InvoiceExportModal: React.FC<{
  invoices: FactureEleve[];
  payments: TransactionPaiement[];
  classes: ClasseScolaire[];
  onClose: () => void;
}> = ({ invoices, payments, classes, onClose }) => {
  const { config, currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, src?: string) => formatCurrency(n, currency, src || currency, exchangeRate);

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('eleve');
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    return invoices.filter(inv => {
      const invStatus = getInvoiceStatus(inv, payments, currency);
      if (filterStatus && invStatus !== filterStatus) return false;
      if (filterClass && inv.nomClasse !== filterClass) return false;
      const d = inv.dateEcheance?.split('T')[0];
      if (filterDateFrom && d && d < filterDateFrom) return false;
      if (filterDateTo && d && d > filterDateTo) return false;
      return true;
    }).sort((a, b) => {
      if (sortBy === 'eleve') return a.nomEleve.localeCompare(b.nomEleve);
      if (sortBy === 'reste') {
        const remA = getInvoiceTotal(a, currency) - getInvoicePaid(a, payments, currency);
        const remB = getInvoiceTotal(b, currency) - getInvoicePaid(b, payments, currency);
        return remB - remA;
      }
      return (b.numeroFacture || '').localeCompare(a.numeroFacture || '');
    });
  }, [invoices, payments, filterStatus, filterClass, filterDateFrom, filterDateTo, sortBy, currency]);

  const totals = useMemo(() => {
    let billed = 0;
    let paid = 0;
    filtered.forEach(inv => {
      const t = getInvoiceTotal(inv, currency);
      const p = getInvoicePaid(inv, payments, currency);
      billed += t;
      paid += p;
    });
    return { billed, paid, remaining: Math.max(0, billed - paid) };
  }, [filtered, payments, currency]);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const canvas = await html2canvas(printRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Rapport_Recouvrement_Factures_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Erreur export PDF :', err);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Exportation Intelligente des Factures en PDF</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Filtrez les données avant la génération du document officiel de recouvrement</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadPDF} disabled={isExporting || filtered.length === 0} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>Télécharger le Rapport PDF ({filtered.length})</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Statut de Paiement</label>
            <CustomSelect
              options={[
                { value: '', label: 'Toutes les factures' },
                { value: 'NON_PAYE', label: 'Factures Impayées' },
                { value: 'PARTIEL', label: 'Paiements Partiels' },
                { value: 'PAYE', label: 'Factures Soldées' },
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Classe / Niveau</label>
            <CustomSelect
              options={[
                { value: '', label: 'Toutes les classes' },
                ...classes.map(c => ({ value: c.nom, label: `Classe : ${c.nom}` })),
              ]}
              value={filterClass}
              onChange={setFilterClass}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Date de début</label>
            <DatePicker value={filterDateFrom} onChange={setFilterDateFrom} placeholder="Du..." />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Date de fin</label>
            <DatePicker value={filterDateTo} onChange={setFilterDateTo} placeholder="Au..." />
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-900/90 flex justify-center">
          <div ref={printRef} className="bg-white text-black p-8 shadow-2xl rounded-sm w-full max-w-[210mm] min-h-[297mm] font-sans text-xs">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                <h1 className="text-base font-black uppercase tracking-wider text-slate-900">{config?.schoolName || 'ÉCOLISA ENTERPRISE'}</h1>
                <p className="text-[10px] text-slate-600 font-semibold">{[config?.address, config?.subDivision, config?.province].filter(Boolean).join(', ')}</p>
                <p className="text-[10px] text-slate-600 font-semibold">Tél: {config?.phone || '—'} | Email: {config?.email || '—'}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-sm mb-1">RAPPORT DE RECOUVREMENT</span>
                <p className="text-[10px] font-mono font-bold text-slate-700">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                <p className="text-[10px] text-slate-600 font-semibold">Filtre: {filterStatus ? filterStatus : 'Toutes'} | Classe: {filterClass || 'Toutes'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-3 bg-slate-100 rounded-sm border border-slate-300">
                <p className="text-[9px] font-black text-slate-500 uppercase">TOTAL FACTURÉ</p>
                <p className="text-sm font-black text-slate-900 font-mono">{fmt(totals.billed)}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-sm border border-emerald-300">
                <p className="text-[9px] font-black text-emerald-700 uppercase">DÉJÀ PAYÉ</p>
                <p className="text-sm font-black text-emerald-800 font-mono">{fmt(totals.paid)}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-sm border border-rose-300">
                <p className="text-[9px] font-black text-rose-700 uppercase">RESTE À RECOUVRER</p>
                <p className="text-sm font-black text-rose-800 font-mono">{fmt(totals.remaining)}</p>
              </div>
            </div>

            <table className="w-full border-collapse text-[10px] mb-8">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase">
                  <th className="p-2 text-left">N° Facture</th>
                  <th className="p-2 text-left">Élève</th>
                  <th className="p-2 text-left">Classe</th>
                  <th className="p-2 text-right">Facturé</th>
                  <th className="p-2 text-right">Payé</th>
                  <th className="p-2 text-right">Solde</th>
                  <th className="p-2 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 border-b border-slate-300">
                {filtered.map(inv => {
                  const t = getInvoiceTotal(inv, currency);
                  const p = getInvoicePaid(inv, payments, currency);
                  const r = Math.max(0, t - p);
                  const invStatus = getInvoiceStatus(inv, payments, currency);
                  return (
                    <tr key={inv.id} className="even:bg-slate-50">
                      <td className="p-2 font-mono font-bold">{inv.numeroFacture}</td>
                      <td className="p-2 font-bold">{inv.nomEleve}</td>
                      <td className="p-2">{inv.nomClasse}</td>
                      <td className="p-2 text-right font-mono font-bold">{fmt(t)}</td>
                      <td className="p-2 text-right font-mono text-emerald-700 font-bold">{fmt(p)}</td>
                      <td className="p-2 text-right font-mono font-black" style={{ color: r > 0 ? '#b91c1c' : '#047857' }}>{fmt(r)}</td>
                      <td className="p-2 text-center font-bold">{invStatus === 'PAYE' ? 'SOLDÉ' : invStatus === 'PARTIEL' ? 'PARTIEL' : 'IMPAYÉ'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-12 pt-4 border-t border-slate-300 text-[10px] font-bold text-slate-700">
              <div>
                <p>Le Service de Comptabilité</p>
                <div className="h-12" />
                <p className="text-slate-500 font-normal">Sceau & Signature</p>
              </div>
              <div className="text-right">
                <p>Pour la Direction de l'Établissement</p>
                <div className="h-12" />
                <p className="text-slate-500 font-normal">Sceau & Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const CreateInvoiceModal: React.FC<{
  students: Eleve[];
  feeTypes: TypeFraisScolaire[];
  years: AnneeScolaireConfig[];
  classes: ClasseScolaire[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ students, feeTypes, years, classes, onClose, onSaved }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [studentId, setStudentId] = useState<string>('');
  const [yearId, setYearId] = useState<string>(years.find(y => y.statut === 'EN_COURS')?.id || '');
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [lines, setLines] = useState<{ feeTypeId: string; montant: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const activeYear = years.find(y => y.id === yearId) || years[0];
  const selectedStudent = students.find(s => s.id === studentId);

  const applicableFeeTypes = useMemo(() => {
    if (!selectedStudent) return feeTypes;
    const cls = classes.find(c => c.id === selectedStudent.classId || c.nom === selectedStudent.nomClasse);
    const option = cls?.optionCode || selectedStudent.optionEPST || 'TRONC_COMMUN';
    const ctx = {
      schoolYearId: yearId,
      classId: cls?.id || selectedStudent.classId,
      className: cls?.nom || selectedStudent.nomClasse,
      cycleId: cls?.cycleId,
      option,
      salleId: selectedStudent.salleId || cls?.salle,
      regime: selectedStudent.regime,
    };
    return feeTypes.filter(ft => isFeeTypeApplicable(ft, ctx, CYCLE_LABELS));
  }, [feeTypes, selectedStudent, classes, yearId]);

  const toggleFee = (ft: TypeFraisScolaire) => {
    const exists = lines.find(l => l.feeTypeId === ft.id);
    if (exists) {
      setLines(lines.filter(l => l.feeTypeId !== ft.id));
    } else {
      setLines([...lines, { feeTypeId: ft.id, montant: convertCurrency(ft.montant, ft.devise, currency, exchangeRate) }]);
    }
  };

  const total = lines.reduce((a, l) => a + l.montant, 0);

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
        montant: l.montant,
        devise: (currency as string) || 'USD',
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
      montantTotal: total,
      montantPaye: 0,
      devise: (currency as string) || 'USD',
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
              {applicableFeeTypes.map(ft => {
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

// ── MODALE DE DÉTAILS FACTURE ──────────────────────────────────────────────
export const InvoiceDetailModal: React.FC<{
  invoice: FactureEleve;
  payments: TransactionPaiement[];
  feeTypes: TypeFraisScolaire[];
  onClose: () => void;
  onPay: () => void;
}> = ({ invoice, payments, feeTypes, onClose, onPay }) => {
  const { config, currency, exchangeRate, format } = useSchoolConfig();
  const invTotal = getInvoiceTotal(invoice, currency);
  const invPaid = payments.reduce((a, p) => a + getPaymentAmount(p, currency), 0);
  const remaining = Math.max(0, invTotal - invPaid);
  const [isPrinting, setIsPrinting] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handlePrintInvoice = async () => {
    if (!invoicePrintRef.current) return;
    setIsPrinting(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const canvas = await html2canvas(invoicePrintRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Facture_${invoice.numeroFacture}.pdf`);
    } catch (err) {
      console.error('Erreur impression facture :', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[92vh] overflow-y-auto animate-scale-in relative" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Facture {invoice.numeroFacture}</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{invoice.nomEleve} · {invoice.nomClasse}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintInvoice}
              disabled={isPrinting}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Imprimer / PDF</span>
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Statut + montants */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-black uppercase text-slate-500">Total</p>
              <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{format(invTotal, invoice.devise)}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-black uppercase text-slate-500">Payé</p>
              <p className="text-lg font-black text-emerald-600">{format(invPaid, currency)}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-black uppercase text-slate-500">Reste</p>
              <p className="text-lg font-black" style={{ color: remaining > 0 ? '#ef4444' : '#10b981' }}>{format(remaining, currency)}</p>
            </div>
          </div>

          {/* Lignes de facture */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Lignes de facturation</h4>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {(invoice.lignes || []).map((l, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 text-sm" style={{ background: idx % 2 ? 'var(--bg-sunken)' : 'transparent' }}>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{l.nom}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{l.categorie?.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="font-black" style={{ color: 'var(--text-primary)' }}>{format(l.montant, l.devise || invoice.devise)}</span>
                </div>
              ))}
              {(!invoice.lignes || invoice.lignes.length === 0) && (
                <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Aucune ligne détaillée.</div>
              )}
            </div>
          </div>

          {/* Paiements reçus */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Paiements reçus ({payments.length})</h4>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {payments.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between p-3 text-sm" style={{ background: idx % 2 ? 'var(--bg-sunken)' : 'transparent' }}>
                  <div>
                    <p className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{p.numeroRecu}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.moyenPaiement} · {p.dateCreation?.split('T')[0]}</p>
                  </div>
                  <span className="font-black text-emerald-600">{format(getPaymentAmount(p, currency), p.devise)}</span>
                </div>
              ))}
              {payments.length === 0 && (
                <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Aucun paiement enregistré.</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-xs font-black" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Fermer
            </button>
            <button
              onClick={handlePrintInvoice}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Imprimer la Facture</span>
            </button>
            {remaining > 0 && (
              <button onClick={onPay} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 hover:bg-emerald-700 transition-all">
                <CreditCard className="w-3.5 h-3.5" /> Encaisser le reste
              </button>
            )}
          </div>
        </div>

        {/* Template caché d'impression de la facture A4 */}
        <div className="hidden">
          <div ref={invoicePrintRef} className="relative bg-white text-slate-900 p-8 w-[210mm] min-h-[297mm] font-sans text-xs overflow-hidden">
            {/* LOGO EN FILIGRANE DISCRET ET ÉLÉGANT */}
            {config?.logoUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0">
                <img src={config.logoUrl} alt="Filigrane Logo" className="w-[180mm] max-h-[180mm] object-contain filter grayscale" />
              </div>
            )}

            <div className="relative z-10 space-y-6">
              {/* EN-TÊTE OFFICIEL AVEC LOGO DE L'ÉCOLE EN HAUT */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-4">
                  {config?.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo Établissement" className="h-14 max-w-[160px] object-contain" />
                  ) : null}
                  <div>
                    <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">{config?.schoolName || 'ÉCOLISA ENTERPRISE'}</h1>
                    <p className="text-[10px] text-slate-600 font-semibold">{[config?.address, config?.subDivision, config?.province].filter(Boolean).join(', ')}</p>
                    <p className="text-[10px] text-slate-600 font-semibold">Tél: {config?.phone || '—'} | Email: {config?.email || '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md mb-1.5 shadow-sm">FACTURE ÉLÈVE</span>
                  <p className="text-[11px] font-mono font-black text-slate-900">N° {invoice.numeroFacture}</p>
                  <p className="text-[10px] text-slate-500 font-bold">Échéance : {invoice.dateEcheance?.split('T')[0] || '—'}</p>
                </div>
              </div>

              {/* PETIT TABLEAU PROPRE ET PRO DE SYNTHÈSE ÉLÈVE & FACTURE */}
              <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs">
                <table className="w-full text-[10.5px]">
                  <tbody>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td className="p-2.5 font-extrabold uppercase text-slate-500 w-1/4">Nom de l'Élève :</td>
                      <td className="p-2.5 font-black text-slate-900 text-sm w-1/4">{invoice.nomEleve}</td>
                      <td className="p-2.5 font-extrabold uppercase text-slate-500 w-1/4 border-l border-slate-200">Matricule :</td>
                      <td className="p-2.5 font-mono font-black text-indigo-700 w-1/4">{invoice.studentId || '—'}</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-extrabold uppercase text-slate-500">Classe :</td>
                      <td className="p-2.5 font-bold text-slate-800">{invoice.nomClasse || '—'}</td>
                      <td className="p-2.5 font-extrabold uppercase text-slate-500 border-l border-slate-200">Année Scolaire :</td>
                      <td className="p-2.5 font-bold text-slate-800">{invoice.anneeScolaire || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABLEAU DES LIGNES DE FACTURATION */}
              <div>
                <h4 className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-2">Détail des lignes de frais</h4>
                <table className="w-full border-collapse text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase tracking-wider">
                      <th className="p-2.5 text-left rounded-tl-md">Désignation des frais</th>
                      <th className="p-2.5 text-left">Catégorie</th>
                      <th className="p-2.5 text-right rounded-tr-md">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                    {(invoice.lignes || []).map((l, idx) => (
                      <tr key={idx} className="even:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{l.nom}</td>
                        <td className="p-2.5 text-slate-600 font-medium">{l.categorie?.replace(/_/g, ' ')}</td>
                        <td className="p-2.5 text-right font-mono font-black text-slate-900">{format(l.montant, l.devise || invoice.devise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SYNTHÈSE FINANCIÈRE */}
              <div className="flex justify-end pt-2">
                <div className="w-72 space-y-1.5 text-[11px] p-3.5 rounded-xl bg-slate-50 border border-slate-300">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-700">
                    <span>TOTAL FACTURÉ :</span>
                    <span className="font-mono font-black text-slate-900">{format(invTotal, invoice.devise)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5 font-bold text-emerald-700">
                    <span>TOTAL ENCAISSÉ :</span>
                    <span className="font-mono font-black text-emerald-700">{format(invPaid, currency)}</span>
                  </div>
                  <div className="flex justify-between py-1 font-black text-xs" style={{ color: remaining > 0 ? '#b91c1c' : '#047857' }}>
                    <span>SOLDE RESTANT :</span>
                    <span className="font-mono text-sm">{format(remaining, currency)}</span>
                  </div>
                </div>
              </div>

              {/* CODE BARRE COMPACT RECULÉ ET SIGNATURES */}
              <div className="pt-8 border-t border-slate-300 flex items-end justify-between text-[10px] font-bold text-slate-700">
                <div>
                  <p className="font-black text-slate-900">Le Service de Comptabilité</p>
                  <div className="h-12" />
                  <p className="text-slate-500 font-normal">Sceau & Signature</p>
                </div>

                <div className="text-center px-4">
                  <Barcode128 value={invoice.numeroFacture} height={28} />
                  <span className="text-[9px] font-mono text-slate-500 font-bold block mt-0.5">* {invoice.numeroFacture} *</span>
                </div>

                <div className="text-right">
                  <p className="font-black text-slate-900">Pour la Direction de l'Établissement</p>
                  <div className="h-12" />
                  <p className="text-slate-500 font-normal">Sceau & Signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
