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
  Search,
  RotateCcw,
  Copy,
  Layers,
  BarChart3,
  Grid3x3,
  Eye,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { DatePicker } from '../common/DatePicker';
import { SortableTh } from '../common/SortableTh';
import { Pagination } from '../common/Pagination';
import type { BudgetPrevisionnel, AnneeScolaireConfig, OperationCaisse, TypeFraisScolaire, TransactionPaiement, FactureEleve } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ComposedChart,
  Line,
  Area,
  AreaChart,
  Cell,
} from 'recharts';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface BudgetTabProps {
  activeSchoolYear?: string;
}

interface BudgetActualDetail {
  id: string;
  date: string;
  label: string;
  category: string;
  amount: number;
  devise: string;
  converted: number;
}

const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

const FREQ_OPTIONS = [
  { value: 'PONCTUEL', label: 'Ponctuel' },
  { value: 'MENSUEL', label: 'Mensuel' },
  { value: 'TRIMESTRIEL', label: 'Trimestriel' },
  { value: 'ANNUEL', label: 'Annuel' },
];

const NATURE_OPTIONS = [
  { value: 'REVENU', label: 'Revenu' },
  { value: 'CHARGE_FIXE', label: 'Charge fixe' },
  { value: 'CHARGE_DYNAMIQUE', label: 'Charge dynamique' },
];

const TYPE_OPTIONS = [
  { value: 'REVENU', label: 'Revenu' },
  { value: 'DEPENSE', label: 'Dépense' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const [datePart] = s.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || Number.isNaN(y) || Number.isNaN(m)) return null;
  return new Date(y, (m || 1) - 1, d || 1);
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonths(s: string, n: number): string {
  const d = parseDate(s) || new Date();
  d.setMonth(d.getMonth() + n);
  return toISODate(d);
}

function endOfMonth(s: string): string {
  const d = parseDate(s) || new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toISODate(d);
}

function endOfQuarter(s: string): string {
  const d = parseDate(s) || new Date();
  d.setMonth(d.getMonth() + 3);
  d.setDate(0);
  return toISODate(d);
}

function endOfYear(s: string): string {
  const d = parseDate(s) || new Date();
  d.setMonth(11);
  d.setDate(31);
  return toISODate(d);
}

function addYears(s: string, n: number): string {
  const d = parseDate(s) || new Date();
  d.setFullYear(d.getFullYear() + n);
  return toISODate(d);
}

function formatPeriodLabel(d: Date, freq: string): string {
  const month = d.getMonth();
  const year = d.getFullYear().toString().slice(-2);
  switch (freq) {
    case 'MENSUEL':
      return `${MONTHS_SHORT[month]}-${year}`;
    case 'TRIMESTRIEL':
      return `T${Math.floor(month / 3) + 1}-${year}`;
    case 'ANNUEL':
      return `${d.getFullYear()}`;
    default:
      return `Période unique`;
  }
}

function generatePeriodDates(start: string, freq: string, count: number): { periode: string; dateDebut: string; dateFin: string }[] {
  const periods: { periode: string; dateDebut: string; dateFin: string }[] = [];
  let current = start;
  for (let i = 0; i < count; i++) {
    const begin = parseDate(current) || new Date();
    let end: string;
    if (freq === 'MENSUEL') {
      current = i === 0 ? start : addMonths(start, i);
      end = endOfMonth(current);
    } else if (freq === 'TRIMESTRIEL') {
      current = i === 0 ? start : addMonths(start, i * 3);
      end = endOfQuarter(current);
    } else if (freq === 'ANNUEL') {
      current = i === 0 ? start : addYears(start, i);
      end = endOfYear(current);
    } else {
      current = start;
      end = start;
    }
    const d = parseDate(current) || new Date();
    const periode = formatPeriodLabel(d, freq);
    periods.push({ periode, dateDebut: current, dateFin: end });
    if (freq === 'PONCTUEL') break;
  }
  return periods;
}

function inDateRange(d?: string, from?: string, to?: string) {
  const day = d?.split('T')[0];
  if (!day) return true;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ activeSchoolYear }) => {
  const { currency, format, convert, currencies } = useSchoolConfig();
  const fmt = (n: number, source: string = currency) => format(n, source);

  const [budgets, setBudgets] = useState<BudgetPrevisionnel[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [cashOps, setCashOps] = useState<OperationCaisse[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [yearFilter, setYearFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [natureFilter, setNatureFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [freqFilter, setFreqFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Table state
  const [sortField, setSortField] = useState<string>('periode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BudgetPrevisionnel | null>(null);
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<(BudgetPrevisionnel & { actualConv?: number; budgetConv?: number; details?: BudgetActualDetail[] }) | null>(null);

  const activeYearId = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear)?.id, [years, activeSchoolYear]);

  useEffect(() => {
    setYearFilter(activeYearId || '');
  }, [activeYearId]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [yearFilter, periodFilter, natureFilter, typeFilter, freqFilter, categoryFilter, search, dateFrom, dateTo, sortField, sortOrder, pageSize]);

  const load = async () => {
    setLoading(true);
    const [b, y, c, f, p, i] = await Promise.all([
      LocalDatabaseService.getBudgets({ schoolYearId: yearFilter || undefined }),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getCashOperations({ yearId: yearFilter || undefined }),
      LocalDatabaseService.getFeeTypes(yearFilter || undefined),
      LocalDatabaseService.getPayments(),
      LocalDatabaseService.getInvoices(yearFilter || undefined),
    ]);
    setBudgets(b);
    setYears(y);
    setCashOps(c);
    setFeeTypes(f);
    setPayments(p);
    setInvoices(i);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter]);

  const actualForBudget = (b: BudgetPrevisionnel): { actual: number; details: BudgetActualDetail[] } => {
    const isRevenue = b.nature === 'REVENU' || b.type === 'REVENU';
    const details: BudgetActualDetail[] = [];
    let total = 0;

    const year = years.find(y => y.id === b.schoolYearId);
    const dateFrom = b.dateDebut || year?.debut;
    let dateTo = b.dateFin;
    // Si la date de fin est absente ou antérieure/égale au début, on étend à la fin de l'année scolaire.
    if (!dateTo || (dateFrom && dateTo <= dateFrom)) {
      dateTo = year?.fin || dateFrom;
    }

    // Pour les revenus ponctuels/annuels, on rattache tous les paiements de l'année (même avant le début scolaire).
    // Pour les mensualités/trimestres, on respecte strictement la période.
    const useRevenueDateFilter = b.frequence === 'MENSUEL' || b.frequence === 'TRIMESTRIEL';

    if (isRevenue) {
      for (const p of payments) {
        const invoice = invoices.find(inv => inv.id === p.invoiceId);
        const paymentYear = p.anneeScolaireId || invoice?.schoolYearId || invoice?.anneeScolaireId;
        if (b.schoolYearId && paymentYear && paymentYear !== b.schoolYearId) continue;
        if (useRevenueDateFilter && !inDateRange(p.dateCreation, dateFrom, dateTo)) continue;

        const allocs = p.allocations || [];
        if (allocs.length === 0) {
          const cash = cashOps.find(o => o.origine === 'PAYMENT' && o.origineId === p.id);
          if (cash && cash.categorie === b.categorie) {
            const conv = convert(cash.montant, cash.devise);
            total += conv;
            details.push({
              id: p.id,
              date: p.dateCreation,
              label: `${p.nomEleve} — ${p.numeroRecu}`,
              category: cash.categorie,
              amount: cash.montant,
              devise: cash.devise,
              converted: conv,
            });
          }
        } else {
          for (const a of allocs) {
            const ft = feeTypes.find(f => f.id === a.feeTypeId);
            if (ft?.categorie === b.categorie) {
              const conv = convert(a.montant, p.devise);
              total += conv;
              details.push({
                id: `${p.id}-${a.feeTypeId}`,
                date: p.dateCreation,
                label: `${p.nomEleve} — ${p.numeroRecu} (${ft.nom})`,
                category: ft.categorie,
                amount: a.montant,
                devise: p.devise,
                converted: conv,
              });
            }
          }
        }
      }
    } else {
      for (const o of cashOps) {
        if (o.type !== 'SORTIE') continue;
        if (!inDateRange(o.date, dateFrom, dateTo)) continue;
        if (o.categorie !== b.categorie) continue;
        const conv = convert(o.montant, o.devise);
        total += conv;
        details.push({
          id: o.id,
          date: o.date,
          label: o.libelle || o.categorie,
          category: o.categorie,
          amount: o.montant,
          devise: o.devise,
          converted: conv,
        });
      }
    }

    return { actual: total, details };
  };

  const computedRows = useMemo(() => {
    return budgets.map(b => {
      const nature = b.nature || (b.type === 'REVENU' ? 'REVENU' : 'CHARGE_FIXE');
      const frequence = b.frequence || 'PONCTUEL';
      const budgetConv = convert(b.montant, b.devise);
      const { actual: actualConv, details } = actualForBudget({ ...b, nature, frequence });
      const ecart = actualConv - budgetConv;
      const taux = budgetConv > 0 ? (actualConv / budgetConv) * 100 : 0;
      return { ...b, nature, frequence, budgetConv, actualConv, ecart, taux, details };
    });
  }, [budgets, cashOps, payments, invoices, feeTypes, convert, currency]);

  const filteredRows = useMemo(() => {
    let list = computedRows.filter(r => {
      if (yearFilter && r.schoolYearId !== yearFilter) return false;
      if (periodFilter && r.periode !== periodFilter) return false;
      if (natureFilter && r.nature !== natureFilter) return false;
      if (typeFilter && r.type !== typeFilter) return false;
      if (freqFilter && r.frequence !== freqFilter) return false;
      if (categoryFilter && r.categorie !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          r.periode.toLowerCase().includes(q) ||
          r.categorie.toLowerCase().includes(q) ||
          r.note?.toLowerCase().includes(q) ||
          r.nature.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (dateFrom && r.dateFin && r.dateFin < dateFrom) return false;
      if (dateTo && r.dateDebut && r.dateDebut > dateTo) return false;
      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'periode':
          cmp = (a.periode || '').localeCompare(b.periode || '');
          break;
        case 'nature':
          cmp = (a.nature || '').localeCompare(b.nature || '');
          break;
        case 'categorie':
          cmp = (a.categorie || '').localeCompare(b.categorie || '');
          break;
        case 'budget':
          cmp = a.budgetConv - b.budgetConv;
          break;
        case 'actual':
          cmp = a.actualConv - b.actualConv;
          break;
        case 'ecart':
          cmp = a.ecart - b.ecart;
          break;
        case 'taux':
          cmp = a.taux - b.taux;
          break;
        default:
          cmp = (a.periode || '').localeCompare(b.periode || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [computedRows, yearFilter, periodFilter, natureFilter, typeFilter, freqFilter, categoryFilter, search, dateFrom, dateTo, sortField, sortOrder]);

  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paginatedRows = filteredRows.slice(start, end);

  const kpi = useMemo(() => {
    const revenus = filteredRows.filter(r => r.nature === 'REVENU');
    const fixes = filteredRows.filter(r => r.nature === 'CHARGE_FIXE');
    const dynamiques = filteredRows.filter(r => r.nature === 'CHARGE_DYNAMIQUE');

    const revenuBudget = revenus.reduce((s, r) => s + r.budgetConv, 0);
    const revenuActual = revenus.reduce((s, r) => s + r.actualConv, 0);
    const fixeBudget = fixes.reduce((s, r) => s + r.budgetConv, 0);
    const fixeActual = fixes.reduce((s, r) => s + r.actualConv, 0);
    const dynBudget = dynamiques.reduce((s, r) => s + r.budgetConv, 0);
    const dynActual = dynamiques.reduce((s, r) => s + r.actualConv, 0);

    const totalChargeBudget = fixeBudget + dynBudget;
    const totalChargeActual = fixeActual + dynActual;
    const resultatPrevu = revenuBudget - totalChargeBudget;
    const resultatReel = revenuActual - totalChargeActual;
    const tauxRealisation = (revenuBudget + totalChargeBudget) > 0
      ? ((revenuActual + totalChargeActual) / (revenuBudget + totalChargeBudget)) * 100
      : 0;

    return {
      revenuBudget,
      revenuActual,
      fixeBudget,
      fixeActual,
      dynBudget,
      dynActual,
      totalChargeBudget,
      totalChargeActual,
      resultatPrevu,
      resultatReel,
      tauxRealisation,
    };
  }, [filteredRows]);

  const periodOptions = useMemo(() => {
    const unique = Array.from(new Set(budgets.map(b => b.periode))).sort();
    return [{ value: '', label: 'Toutes les périodes' }, ...unique.map(p => ({ value: p, label: p }))];
  }, [budgets]);

  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(budgets.map(b => b.categorie))).sort();
    return [{ value: '', label: 'Toutes les catégories' }, ...unique.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))];
  }, [budgets]);

  const revenueCategories = useMemo(() => {
    const fromFees = feeTypes.map(ft => ft.categorie).filter(Boolean);
    const fromCash = cashOps.filter(o => o.type === 'ENTREE').map(o => o.categorie);
    return Array.from(new Set([...fromFees, ...fromCash, 'PAIEMENT'])).sort();
  }, [feeTypes, cashOps]);

  const expenseCategories = useMemo(() => {
    const fromCash = cashOps.filter(o => o.type === 'SORTIE').map(o => o.categorie);
    return Array.from(new Set([...fromCash, 'SALAIRES', 'FOURNITURES', 'EAU_ELECTRICITE', 'MAINTENANCE', 'PUBLICITE', 'LOYERS', 'TELEPHONE_INTERNET', 'FORMATIONS', 'COTISATIONS', 'AUTRE'])).sort();
  }, [cashOps]);

  const periodChartData = useMemo(() => {
    const map = new Map<string, { revenuBudget: number; revenuActual: number; chargesBudget: number; chargesActual: number }>();
    for (const r of filteredRows) {
      const cur = map.get(r.periode) || { revenuBudget: 0, revenuActual: 0, chargesBudget: 0, chargesActual: 0 };
      if (r.nature === 'REVENU') {
        cur.revenuBudget += r.budgetConv;
        cur.revenuActual += r.actualConv;
      } else {
        cur.chargesBudget += r.budgetConv;
        cur.chargesActual += r.actualConv;
      }
      map.set(r.periode, cur);
    }
    return Array.from(map.entries())
      .map(([periode, data]) => ({ periode, ...data }))
      .sort((a, b) => a.periode.localeCompare(b.periode));
  }, [filteredRows]);

  const monthlyFlowData = useMemo(() => {
    const map = new Map<string, { month: string; entrees: number; sorties: number; net: number }>();
    for (const o of cashOps) {
      if (!o.date) continue;
      const month = o.date.split('T')[0].slice(0, 7);
      if (dateFrom && month < dateFrom.slice(0, 7)) continue;
      if (dateTo && month > dateTo.slice(0, 7)) continue;
      const conv = convert(o.montant, o.devise);
      const cur = map.get(month) || { month, entrees: 0, sorties: 0, net: 0 };
      if (o.type === 'ENTREE') {
        cur.entrees += conv;
      } else if (o.type === 'SORTIE') {
        cur.sorties += conv;
      }
      cur.net = cur.entrees - cur.sorties;
      map.set(month, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [cashOps, convert, dateFrom, dateTo]);

  const varianceByCategory = useMemo(() => {
    const map = new Map<string, { categorie: string; nature: string; budget: number; actual: number; ecart: number; taux: number }>();
    for (const r of filteredRows) {
      const key = `${r.nature}__${r.categorie}`;
      const cur = map.get(key) || { categorie: r.categorie, nature: r.nature, budget: 0, actual: 0, ecart: 0, taux: 0 };
      cur.budget += r.budgetConv;
      cur.actual += r.actualConv;
      cur.ecart += r.ecart;
      cur.taux = cur.budget > 0 ? (cur.actual / cur.budget) * 100 : 0;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
  }, [filteredRows]);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="p-2 rounded-xl border text-xs shadow-xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <p className="font-bold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /> {p.name}</span>
            <span className="font-mono font-black">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const resetFilters = () => {
    setPeriodFilter('');
    setNatureFilter('');
    setTypeFilter('');
    setFreqFilter('');
    setCategoryFilter('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSortField('periode');
    setSortOrder('asc');
  };

  const exportCSV = () => {
    const header = 'Période,Type,Nature,Fréquence,Catégorie,Début,Fin,Budget,Réalisé,Écart,Taux\n';
    const body = filteredRows
      .map(r => `"${r.periode}",${r.type},${r.nature},${r.frequence},"${r.categorie}","${r.dateDebut || ''}","${r.dateFin || ''}",${r.budgetConv.toFixed(2)},${r.actualConv.toFixed(2)},${r.ecart.toFixed(2)},${r.taux.toFixed(1)}%`)
      .join('\n');
    const summary = `
TOTAL,Revenus prévus,Revenus réalisés,Charges fixes prévues,Charges fixes réalisées,Charges dynamiques prévues,Charges dynamiques réalisées,Résultat prévu,Résultat réel,Taux de réalisation
,${kpi.revenuBudget.toFixed(2)},${kpi.revenuActual.toFixed(2)},${kpi.fixeBudget.toFixed(2)},${kpi.fixeActual.toFixed(2)},${kpi.dynBudget.toFixed(2)},${kpi.dynActual.toFixed(2)},${kpi.resultatPrevu.toFixed(2)},${kpi.resultatReel.toFixed(2)},${kpi.tauxRealisation.toFixed(1)}%`;
    const blob = new Blob([header + body + summary], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-ecolisa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  const saveSeries = async (items: BudgetPrevisionnel[]) => {
    await Promise.all(items.map(b => LocalDatabaseService.addBudget(b)));
    setShowSeriesForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette ligne budgétaire ?')) return;
    await LocalDatabaseService.deleteBudget(id);
    load();
  };

  const budgetNatureBadge = (n: string) => {
    switch (n) {
      case 'REVENU':
        return <span className="chip-tonal chip-tonal-emerald">Revenu</span>;
      case 'CHARGE_FIXE':
        return <span className="chip-tonal chip-tonal-amber">Charge fixe</span>;
      case 'CHARGE_DYNAMIQUE':
        return <span className="chip-tonal chip-tonal-rose">Charge dynamique</span>;
      default:
        return <span className="chip-tonal chip-tonal-indigo">{n}</span>;
    }
  };

  const activeFiltersCount = [yearFilter, periodFilter, natureFilter, typeFilter, freqFilter, categoryFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-5 animate-fade-in w-full pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Budgétisation</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Prévisions de revenus, charges fixes et dynamiques avec suivi des réalisations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter CSV
          </button>
          <button onClick={() => setShowSeriesForm(true)} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Layers className="w-3.5 h-3.5" /> Générer périodes
          </button>
          <button
            onClick={() => { setEditing({ id: '', schoolYearId: yearFilter, periode: '', dateDebut: '', dateFin: '', categorie: '', type: 'REVENU', nature: 'REVENU', frequence: 'PONCTUEL', renouvelable: false, montant: 0, devise: currency, note: '' }); setShowForm(true); }}
            className="btn-primary flex items-center gap-2"
            style={{ fontSize: '12px' }}
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenus prévus', val: kpi.revenuBudget, color: '#10b981', icon: TrendingUp },
          { label: 'Revenus réalisés', val: kpi.revenuActual, color: '#10b981', icon: TrendingUp },
          { label: 'Charges fixes prévues', val: kpi.fixeBudget, color: '#f59e0b', icon: TrendingDown },
          { label: 'Charges fixes réalisées', val: kpi.fixeActual, color: '#f59e0b', icon: TrendingDown },
          { label: 'Charges dynamiques prévues', val: kpi.dynBudget, color: '#ef4444', icon: TrendingDown },
          { label: 'Charges dynamiques réalisées', val: kpi.dynActual, color: '#ef4444', icon: TrendingDown },
          { label: 'Résultat prévu', val: kpi.resultatPrevu, color: '#6366f1', icon: Wallet },
          { label: 'Résultat réel', val: kpi.resultatReel, color: kpi.resultatReel >= 0 ? '#10b981' : '#ef4444', icon: kpi.resultatReel >= 0 ? TrendingUp : TrendingDown },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-lg font-black" style={{ color: s.color }}>{fmt(s.val)}</p>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
            <CustomSelect
              options={[{ value: '', label: 'Toutes les années' }, ...years.map(y => ({ value: y.id, label: y.nom }))]}
              value={yearFilter}
              onChange={setYearFilter}
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Période</label>
            <CustomSelect
              options={periodOptions}
              value={periodFilter}
              onChange={setPeriodFilter}
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nature</label>
            <CustomSelect
              options={[{ value: '', label: 'Toutes' }, ...NATURE_OPTIONS]}
              value={natureFilter}
              onChange={setNatureFilter}
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Type</label>
            <CustomSelect
              options={[{ value: '', label: 'Tous' }, ...TYPE_OPTIONS]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
          <div className="w-full sm:w-44">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Fréquence</label>
            <CustomSelect
              options={[{ value: '', label: 'Toutes' }, ...FREQ_OPTIONS]}
              value={freqFilter}
              onChange={setFreqFilter}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
            <CustomSelect
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Du</label>
            <DatePicker value={dateFrom} onChange={setDateFrom} className="w-full" />
          </div>
          <div className="w-full sm:w-40">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Au</label>
            <DatePicker value={dateTo} onChange={setDateTo} className="w-full" />
          </div>
          <div className="w-full sm:w-56">
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Recherche</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Période, catégorie..."
                className="input w-full pl-9 text-sm"
              />
            </div>
          </div>
          <button onClick={resetFilters} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <RotateCcw className="w-3.5 h-3.5" /> {activeFiltersCount > 0 ? `Réinitialiser (${activeFiltersCount})` : 'Réinitialiser'}
          </button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="section-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Budget vs réalisé par période</h3>
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="h-72 w-full">
            {periodChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucune donnée pour cette période</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={periodChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="periode" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="revenuBudget" name="Revenu prévu" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Line dataKey="revenuActual" name="Revenu réalisé" stroke="#34d399" strokeWidth={2} dot={false} />
                  <Bar dataKey="chargesBudget" name="Charges prévues" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Line dataKey="chargesActual" name="Charges réalisées" stroke="#ef4444" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Trésorerie mensuelle réelle</h3>
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="h-72 w-full">
            {monthlyFlowData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucune opération de caisse</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} width={80} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="entrees" name="Entrées" fill="#10b981" barSize={20} radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                  <Bar dataKey="sorties" name="Sorties" fill="#ef4444" barSize={20} radius={[4, 4, 0, 0]} fillOpacity={0.7} />
                  <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="section-card p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Écarts par catégorie</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>Budget</span>
              <span className="w-3 h-3 rounded-full" style={{ background: '#6366f1' }} />
              <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>Réalisé</span>
              <span className="w-3 h-3 rounded-full" style={{ background: '#22d3ee' }} />
              <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>Écart</span>
              <span className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
            </div>
          </div>
          <div className="h-96 w-full">
            {varianceByCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>Aucun écart à afficher</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={varianceByCategory.slice(0, 16)} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fontSize: 10 }} />
                  <YAxis dataKey="categorie" type="category" width={150} tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.replace(/_/g, ' ')} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="budget" name="Budget" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="actual" name="Réalisé" fill="#22d3ee" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="ecart" name="Écart" radius={[0, 4, 4, 0]} barSize={8}>
                    {varianceByCategory.slice(0, 16).map((e, i) => {
                      const positive = e.nature === 'REVENU' ? e.ecart >= 0 : e.ecart < 0;
                      return <Cell key={i} fill={positive ? '#10b981' : '#ef4444'} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="section-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Budgets détaillés</h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500">{total} lignes</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black" style={{ color: 'var(--text-muted)' }}>Taux global</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, kpi.tauxRealisation)}%`, background: kpi.tauxRealisation >= 100 ? '#10b981' : kpi.tauxRealisation >= 75 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <span className="text-[11px] font-black" style={{ color: kpi.tauxRealisation >= 100 ? '#10b981' : kpi.tauxRealisation >= 75 ? '#f59e0b' : '#ef4444' }}>{kpi.tauxRealisation.toFixed(0)}%</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <SortableTh label="Période" field="periode" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Nature" field="nature" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Catégorie" field="categorie" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Fréquence" field="frequence" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableTh label="Budget" field="budget" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} align="right" />
                <SortableTh label="Réalisé" field="actual" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} align="right" />
                <SortableTh label="Écart" field="ecart" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} align="right" />
                <SortableTh label="%" field="taux" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} align="right" />
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} /></td></tr>
              ) : paginatedRows.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune ligne budgétaire. Créez un budget ou ajustez les filtres.</td></tr>
              ) : (
                paginatedRows.map(r => (
                  <tr key={r.id} className="cursor-pointer hover:bg-indigo-500/[0.04]" onClick={() => setSelectedBudget(r)}>
                    <td className="text-[12px] font-bold">{r.periode}</td>
                    <td>{budgetNatureBadge(r.nature)}</td>
                    <td className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{r.categorie.replace(/_/g, ' ')}</td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{FREQ_OPTIONS.find(f => f.value === r.frequence)?.label || r.frequence}</td>
                    <td className="text-right font-bold">{fmt(r.budgetConv)}</td>
                    <td className="text-right font-bold">{fmt(r.actualConv)}</td>
                    <td className={`text-right font-bold ${r.ecart >= 0 ? (r.nature === 'REVENU' ? 'text-emerald-600' : 'text-rose-600') : (r.nature === 'REVENU' ? 'text-rose-600' : 'text-emerald-600')}`}>
                      {fmt(r.ecart)}
                    </td>
                    <td className="text-right text-[11px] font-black">{r.taux.toFixed(0)}%</td>
                    <td className="text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedBudget(r)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-50 text-emerald-500" title="Voir le détail"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { setEditing(r); setShowForm(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-50 text-indigo-500"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          start={start + 1}
          end={end}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
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

      {showSeriesForm && (
        <BudgetSeriesModal
          years={years}
          yearFilter={yearFilter}
          revenueCategories={revenueCategories}
          expenseCategories={expenseCategories}
          currencies={currencies}
          currency={currency}
          onClose={() => setShowSeriesForm(false)}
          onSave={saveSeries}
        />
      )}

      {selectedBudget && (
        <BudgetDetailModal
          budget={selectedBudget}
          onClose={() => setSelectedBudget(null)}
        />
      )}
    </div>
  );
};

const BudgetDetailModal: React.FC<{
  budget: BudgetPrevisionnel & { budgetConv?: number; actualConv?: number; details?: BudgetActualDetail[] };
  onClose: () => void;
}> = ({ budget, onClose }) => {
  const { format, currency } = useSchoolConfig();
  const fmt = (n: number) => format(n, currency);
  const details = budget.details || [];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const totals = useMemo(() => details.reduce((s, d) => s + d.converted, 0), [details]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black">Détail du budget</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{budget.periode} · {budget.categorie.replace(/_/g, ' ')} · {budget.nature}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Prévu</span>
            <p className="text-base font-black" style={{ color: '#6366f1' }}>{fmt(budget.budgetConv || 0)}</p>
          </div>
          <div className="p-3 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Réalisé</span>
            <p className="text-base font-black" style={{ color: '#10b981' }}>{fmt(budget.actualConv || 0)}</p>
          </div>
          <div className="p-3 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Écart</span>
            <p className="text-base font-black" style={{ color: (budget.actualConv || 0) - (budget.budgetConv || 0) >= 0 ? (budget.nature === 'REVENU' ? '#10b981' : '#ef4444') : (budget.nature === 'REVENU' ? '#ef4444' : '#10b981') }}>{fmt((budget.actualConv || 0) - (budget.budgetConv || 0))}</p>
          </div>
        </div>

        <div className="section-card overflow-hidden mb-4" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th className="text-right">Montant</th>
                <th className="text-right">Converti</th>
              </tr>
            </thead>
            <tbody>
              {details.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune opération n'a encore été rattachée à ce budget.</td></tr>
              ) : (
                details.map(d => (
                  <tr key={d.id}>
                    <td className="text-[11px]">{d.date?.split('T')[0] || '—'}</td>
                    <td className="text-[12px] font-bold">{d.label}</td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{d.category.replace(/_/g, ' ')}</td>
                    <td className="text-right font-bold" style={{ color: 'var(--text-muted)' }}>{formatCurrency(d.amount, d.devise, d.devise)}</td>
                    <td className="text-right font-black">{fmt(d.converted)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <span className="text-sm font-black" style={{ color: 'var(--text-muted)' }}>Total des opérations</span>
          <span className="text-lg font-black" style={{ color: '#6366f1' }}>{fmt(totals)}</span>
        </div>
      </div>
    </div>,
    document.body
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

  const categories = form.nature === 'REVENU' ? revenueCategories : [...expenseCategories, 'CHARGE_FIXE', 'CHARGE_DYNAMIQUE'];

  const handleSave = () => {
    const b: BudgetPrevisionnel = {
      ...form,
      schoolYearId: form.schoolYearId || yearFilter,
      categorie: customCat || form.categorie,
      type: form.nature === 'REVENU' ? 'REVENU' : 'DEPENSE',
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
            <h3 className="text-lg font-black">{form.id ? 'Modifier la ligne budgétaire' : 'Nouvelle ligne budgétaire'}</h3>
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
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nature</label>
              <CustomSelect
                options={NATURE_OPTIONS.map(n => ({ value: n.value, label: n.label }))}
                value={form.nature || (form.type === 'REVENU' ? 'REVENU' : 'CHARGE_FIXE')}
                onChange={v => setForm({ ...form, nature: v as any, type: v === 'REVENU' ? 'REVENU' : 'DEPENSE', categorie: '' })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Fréquence</label>
              <CustomSelect
                options={FREQ_OPTIONS}
                value={form.frequence || 'PONCTUEL'}
                onChange={v => setForm({ ...form, frequence: v as any })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Renouvelable</label>
              <CustomSelect
                options={[{ value: 'true', label: 'Oui' }, { value: 'false', label: 'Non' }]}
                value={form.renouvelable ? 'true' : 'false'}
                onChange={v => setForm({ ...form, renouvelable: v === 'true' })}
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

const BudgetSeriesModal: React.FC<{
  years: AnneeScolaireConfig[];
  yearFilter: string;
  revenueCategories: string[];
  expenseCategories: string[];
  currencies: any[];
  currency: string;
  onClose: () => void;
  onSave: (items: BudgetPrevisionnel[]) => void;
}> = ({ years, yearFilter, revenueCategories, expenseCategories, currencies, currency, onClose, onSave }) => {
  const [form, setForm] = useState({
    schoolYearId: yearFilter,
    nature: 'CHARGE_FIXE' as 'REVENU' | 'CHARGE_FIXE' | 'CHARGE_DYNAMIQUE',
    categorie: '',
    customCat: '',
    montant: 0,
    devise: currency,
    frequence: 'MENSUEL' as 'PONCTUEL' | 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL',
    dateDebut: toISODate(new Date()),
    occurrences: 12,
    renouvelable: false,
    note: '',
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const categories = form.nature === 'REVENU' ? revenueCategories : expenseCategories;

  const handleSave = () => {
    const type = form.nature === 'REVENU' ? 'REVENU' : 'DEPENSE';
    const cat = form.customCat || form.categorie;
    const modeleId = uuid();
    const periods = generatePeriodDates(form.dateDebut, form.frequence, form.occurrences);
    const items: BudgetPrevisionnel[] = periods.map((p, i) => ({
      id: uuid(),
      schoolYearId: form.schoolYearId,
      periode: p.periode,
      dateDebut: p.dateDebut,
      dateFin: p.dateFin,
      categorie: cat,
      type,
      nature: form.nature,
      frequence: form.frequence,
      renouvelable: form.renouvelable,
      modeleId,
      periodeIndex: i,
      montant: form.montant,
      devise: form.devise,
      note: form.note,
    }));
    onSave(items);
  };

  const isValid = form.categorie && form.montant > 0 && form.occurrences > 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-black">Générer une série budgétaire</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nature</label>
              <CustomSelect
                options={NATURE_OPTIONS.map(n => ({ value: n.value, label: n.label }))}
                value={form.nature}
                onChange={v => setForm({ ...form, nature: v as any, categorie: '' })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Fréquence</label>
              <CustomSelect
                options={FREQ_OPTIONS}
                value={form.frequence}
                onChange={v => setForm({ ...form, frequence: v as any })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
            <CustomSelect
              options={[{ value: '', label: 'Choisir ou ajouter manuellement' }, ...categories.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))]}
              value={form.categorie}
              onChange={v => { setForm({ ...form, categorie: v, customCat: '' }); }}
            />
            <input
              value={form.customCat}
              onChange={e => { setForm({ ...form, customCat: e.target.value, categorie: e.target.value }); }}
              placeholder="Ou saisir une catégorie personnalisée"
              className="input w-full text-sm mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant par période</label>
              <NumberInput value={form.montant} onChange={v => setForm({ ...form, montant: v })} min={0} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect
                options={currencies.map(c => ({ value: c.code, label: `${c.code} (${c.name || c.code})` }))}
                value={form.devise}
                onChange={v => setForm({ ...form, devise: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date de départ</label>
              <DatePicker value={form.dateDebut} onChange={v => setForm({ ...form, dateDebut: v })} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre de périodes</label>
              <NumberInput value={form.occurrences} onChange={v => setForm({ ...form, occurrences: v })} min={1} max={120} className="input w-full text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect
                options={years.map(y => ({ value: y.id, label: y.nom }))}
                value={form.schoolYearId}
                onChange={v => setForm({ ...form, schoolYearId: v })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Renouvelable automatiquement</label>
              <CustomSelect
                options={[{ value: 'true', label: 'Oui' }, { value: 'false', label: 'Non' }]}
                value={form.renouvelable ? 'true' : 'false'}
                onChange={v => setForm({ ...form, renouvelable: v === 'true' })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Note</label>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2} className="input w-full text-sm" />
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: 'white', opacity: isValid ? 1 : 0.6 }}
          >
            <Copy className="w-4 h-4" /> Générer {form.occurrences} période{form.occurrences > 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
