import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Download, Printer, Calendar, Filter, Search, Lightbulb,
  AlertTriangle, CheckCircle2, BarChart3, Bell, Wallet, Banknote, ChevronDown, X, RotateCcw, PieChart as PieChartIcon,
} from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { getInvoiceTotal, getInvoicePaid, getPaymentAmount, getInvoiceStatus } from '../../utils/financeCalculations';
import { NumberInput } from '../common/NumberInput';
import type {
  FactureEleve, OperationCaisse, EcritureComptable, CompteComptable, AnneeScolaireConfig,
  Eleve, ClasseScolaire, TypeFraisScolaire, TransactionPaiement, MembrePersonnel,
} from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];
interface ReportsTabProps {
  activeSchoolYear?: string;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ activeSchoolYear }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const isSingle = payload.length === 1;
    const title = label || (isSingle ? undefined : payload[0]?.name);
    return (
      <div className="glass-card p-3 rounded-xl text-xs" style={{ minWidth: 170, border: '1px solid var(--border)' }}>
        {title && <p className="font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>{title}</p>}
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-mono font-black" style={{ color: 'var(--text-primary)' }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [cashOps, setCashOps] = useState<OperationCaisse[]>([]);
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [comptes, setComptes] = useState<CompteComptable[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [staff, setStaff] = useState<MembrePersonnel[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);

  // Filtres
  const [yearFilter, setYearFilter] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('');
  const [optionFilter, setOptionFilter] = useState<string>('');
  const [cycleFilter, setCycleFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [feeCategoryFilter, setFeeCategoryFilter] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [periodPreset, setPeriodPreset] = useState<string>('');
  const [reportSearch, setReportSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Coûts imputés pour le résultat net
  const [imputedCosts, setImputedCosts] = useState<number>(0);

  const activeYearId = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear)?.id, [years, activeSchoolYear]);

  useEffect(() => {
    setYearFilter(activeYearId || '');
  }, [activeYearId]);

  const load = async () => {
    setLoading(true);
    const [i, p, c, e, cm, ft, el, cl, st, y] = await Promise.all([
      LocalDatabaseService.getInvoices(yearFilter || undefined),
      LocalDatabaseService.getPayments(),
      LocalDatabaseService.getCashOperations({ yearId: yearFilter || undefined }),
      LocalDatabaseService.getEcritures(),
      LocalDatabaseService.getComptes(),
      LocalDatabaseService.getFeeTypes(yearFilter || undefined),
      LocalDatabaseService.getEleves({ schoolYearId: yearFilter || undefined }),
      LocalDatabaseService.getClasses(yearFilter || undefined),
      LocalDatabaseService.getStaff(),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setInvoices(i);
    setPayments(p);
    setCashOps(c);
    setEcritures(e);
    setComptes(cm);
    setFeeTypes(ft);
    setStudents(el);
    setClasses(cl);
    setStaff(st);
    setYears(y);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter]);

  // Raccourcis de période
  const applyPeriodPreset = (preset: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    let from = '';
    let to = today;
    switch (preset) {
      case 'today':
        from = today;
        break;
      case 'this_week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        from = startOfWeek.toISOString().split('T')[0];
        break;
      }
      case 'this_month':
        from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'last_month': {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const last = new Date(now.getFullYear(), now.getMonth(), 0);
        from = first.toISOString().split('T')[0];
        to = last.toISOString().split('T')[0];
        break;
      }
      case 'this_quarter': {
        const q = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0];
        break;
      }
      case 'this_year':
        from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      case 'last_year': {
        from = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        to = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
        break;
      }
      default:
        from = '';
        to = '';
    }
    setDateFrom(from);
    setDateTo(to);
  };

  useEffect(() => {
    if (periodPreset) applyPeriodPreset(periodPreset);
  }, [periodPreset]);

  const inDateRange = (d?: string) => {
    if (!d) return true;
    const day = d.split('T')[0];
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  };

  const inPreviousDateRange = (d?: string) => {
    if (!d || !dateFrom || !dateTo) return false;
    const currentMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
    const prevEnd = new Date(dateFrom).getTime();
    const prevStart = prevEnd - currentMs;
    const dayMs = new Date(d).getTime();
    return dayMs >= prevStart && dayMs < prevEnd;
  };

  const invoiceHasPaymentMethod = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const p of payments) {
      if (!map.has(p.invoiceId)) map.set(p.invoiceId, new Set());
      map.get(p.invoiceId)!.add(p.moyenPaiement);
    }
    return map;
  }, [payments]);

  const filteredCash = useMemo(() => cashOps.filter(o => {
    if (!inDateRange(o.date)) return false;
    if (paymentMethodFilter && o.modePaiement !== paymentMethodFilter) return false;
    return true;
  }), [cashOps, dateFrom, dateTo, paymentMethodFilter]);

  const filteredInvoices = useMemo(() => invoices.filter(i => {
    if (!inDateRange(i.dateEcheance || new Date().toISOString())) return false;
    if (yearFilter && i.anneeScolaireId && i.anneeScolaireId !== yearFilter) return false;
    if (classFilter && i.nomClasse !== classFilter) return false;
    const cls = classes.find(c => c.nom === i.nomClasse);
    if (optionFilter && cls?.optionCode !== optionFilter) return false;
    if (cycleFilter && cls?.cycleId !== cycleFilter) return false;
    if (feeCategoryFilter) {
      const hasCategory = i.lignes?.some(l => l.categorie === feeCategoryFilter);
      if (!hasCategory) return false;
    }
    if (invoiceStatusFilter && i.statut !== invoiceStatusFilter) return false;
    if (paymentMethodFilter) {
      const methods = invoiceHasPaymentMethod.get(i.id);
      if (!methods || !methods.has(paymentMethodFilter)) return false;
    }
    return true;
  }), [invoices, dateFrom, dateTo, yearFilter, classFilter, optionFilter, cycleFilter, feeCategoryFilter, invoiceStatusFilter, paymentMethodFilter, classes, invoiceHasPaymentMethod]);

  const filteredPayments = useMemo(() => payments.filter(p => {
    if (!inDateRange(p.dateCreation)) return false;
    if (paymentMethodFilter && p.moyenPaiement !== paymentMethodFilter) return false;
    return true;
  }), [payments, dateFrom, dateTo, paymentMethodFilter]);

  const totalBilled = useMemo(() => filteredInvoices.reduce((a, i) => a + getInvoiceTotal(i, currency), 0), [filteredInvoices, currency]);
  const totalPaid = useMemo(() => filteredInvoices.reduce((a, i) => a + getInvoicePaid(i, payments, currency), 0), [filteredInvoices, payments, currency]);
  const totalUnpaid = totalBilled - totalPaid;
  const recoveryRate = useMemo(() => totalBilled > 0 ? totalPaid / totalBilled : 0, [totalBilled, totalPaid]);
  const totalEntrees = useMemo(() => filteredCash.filter(o => o.type === 'ENTREE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [filteredCash, currency, exchangeRate]);
  const totalSorties = useMemo(() => filteredCash.filter(o => o.type === 'SORTIE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [filteredCash, currency, exchangeRate]);
  const netCash = useMemo(() => totalEntrees - totalSorties, [totalEntrees, totalSorties]);

  // ─── Résultat net estimé ─────────────────────────────────────────────────
  const salaryExpenses = useMemo(() => filteredCash
    .filter(o => o.type === 'SORTIE' && o.categorie === 'SALAIRES')
    .reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [filteredCash, currency, exchangeRate]);
  const nonSalaryExpenses = useMemo(() => totalSorties - salaryExpenses, [totalSorties, salaryExpenses]);
  const payrollMass = useMemo(() => staff
    .filter(s => s.statut === 'ACTIF')
    .reduce((a, s) => a + convertCurrency(s.salaireBase || 0, (s.devise || 'USD'), currency, exchangeRate), 0), [staff, currency, exchangeRate]);
  const netResult = useMemo(() => totalEntrees - nonSalaryExpenses - salaryExpenses - imputedCosts,
    [totalEntrees, nonSalaryExpenses, salaryExpenses, imputedCosts]);

  // ─── Reliquats / restes à payer ──────────────────────────────────────────
  const reliquats = useMemo(() => {
    const map = new Map<string, {
      invoiceId: string; numeroFacture: string; eleveId: string; nomEleve: string; nomClasse: string;
      telephoneParent: string; total: number; paye: number; reste: number; echeance: string; joursRetard: number;
    }>();
    for (const inv of invoices) {
      if (yearFilter && inv.anneeScolaireId && inv.anneeScolaireId !== yearFilter) continue;
      if (!inDateRange(inv.dateEcheance || new Date().toISOString())) continue;
      if (classFilter && inv.nomClasse !== classFilter) continue;
      const cls = classes.find(c => c.nom === inv.nomClasse);
      if (optionFilter && cls?.optionCode !== optionFilter) continue;
      if (cycleFilter && cls?.cycleId !== cycleFilter) continue;
      if (feeCategoryFilter && !inv.lignes?.some(l => l.categorie === feeCategoryFilter)) continue;
      const invStatus = getInvoiceStatus(inv, payments, currency);
      if (invoiceStatusFilter && invStatus !== invoiceStatusFilter) continue;
      if (paymentMethodFilter) {
        const methods = invoiceHasPaymentMethod.get(inv.id);
        if (methods && !methods.has(paymentMethodFilter)) continue;
      }
      const total = getInvoiceTotal(inv, currency);
      const paye = getInvoicePaid(inv, payments, currency);
      const reste = Math.max(0, total - paye);
      if (reste <= 0.001) continue;
      const stu = students.find(s => s.id === inv.studentId || s.id === inv.eleveId);
      const due = inv.dateEcheance ? new Date(inv.dateEcheance).getTime() : Date.now();
      const jours = Math.max(0, Math.floor((Date.now() - due) / (1000 * 60 * 60 * 24)));
      const key = inv.id;
      map.set(key, {
        invoiceId: inv.id,
        numeroFacture: inv.numeroFacture,
        eleveId: inv.studentId || inv.eleveId || '',
        nomEleve: inv.nomEleve,
        nomClasse: inv.nomClasse,
        telephoneParent: stu?.telephoneParent || stu?.telephonePere || stu?.telephoneMere || stu?.telephoneTuteur || '—',
        total,
        paye,
        reste,
        echeance: inv.dateEcheance || '—',
        joursRetard: jours,
      });
    }
    return Array.from(map.values()).sort((a, b) => b.reste - a.reste);
  }, [invoices, yearFilter, classFilter, optionFilter, cycleFilter, feeCategoryFilter, invoiceStatusFilter, paymentMethodFilter, invoiceHasPaymentMethod, dateFrom, dateTo, classes, students, payments, currency, exchangeRate]);

  const previousInvoices = useMemo(() => invoices.filter(i => inPreviousDateRange(i.dateEcheance)), [invoices, dateFrom, dateTo]);
  const previousBilled = useMemo(() => previousInvoices.reduce((a, i) => a + getInvoiceTotal(i, currency), 0), [previousInvoices, currency]);
  const previousPaid = useMemo(() => previousInvoices.reduce((a, i) => a + getInvoicePaid(i, payments, currency), 0), [previousInvoices, payments, currency]);
  const previousEntrees = useMemo(() => cashOps.filter(o => o.type === 'ENTREE' && inPreviousDateRange(o.date)).reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [cashOps, dateFrom, dateTo, currency, exchangeRate]);
  const previousSorties = useMemo(() => cashOps.filter(o => o.type === 'SORTIE' && inPreviousDateRange(o.date)).reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [cashOps, dateFrom, dateTo, currency, exchangeRate]);
  const previousNetCash = useMemo(() => previousEntrees - previousSorties, [previousEntrees, previousSorties]);

  const pctChange = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);

  const feeApplies = (ft: TypeFraisScolaire, cls: ClasseScolaire) => {
    if (ft.actif === false) return false;
    if (ft.anneeScolaireId && ft.anneeScolaireId !== cls.schoolYearId) return false;
    if (ft.cycleId && ft.cycleId !== 'TOUS' && ft.cycleId !== cls.cycleId) return false;
    if (ft.optionCode && ft.optionCode !== 'TOUS' && ft.optionCode !== (cls.optionCode || '')) return false;
    if (ft.portee && ft.portee !== 'TOUS' && !cls.nom.toLowerCase().includes(ft.portee.toLowerCase())) return false;
    return true;
  };

  const recoveryByFeeClass = useMemo(() => {
    const expectedMap = new Map<string, { feeId: string; feeName: string; feeCategorie: string; classId: string; className: string; classCycle: string; expected: number }>();
    for (const cls of classes) {
      const activeStudents = students.filter(s => s.classId === cls.id);
      if (activeStudents.length === 0) continue;
      for (const ft of feeTypes) {
        if (!feeApplies(ft, cls)) continue;
        const key = `${ft.id}||${cls.id}`;
        const amount = convertCurrency(ft.montant, ft.devise, currency, exchangeRate) * activeStudents.length;
        const cur = expectedMap.get(key) || { feeId: ft.id, feeName: ft.nom, feeCategorie: ft.categorie, classId: cls.id, className: cls.nom, classCycle: cls.cycleId, expected: 0 };
        cur.expected += amount;
        expectedMap.set(key, cur);
      }
    }
    const collectedMap = new Map<string, number>();
    for (const inv of filteredInvoices) {
      const invTotal = getInvoiceTotal(inv, currency);
      const invPaid = getInvoicePaid(inv, payments, currency);
      if (!invTotal || invPaid <= 0) continue;
      const stu = students.find(s => s.id === inv.studentId || s.id === inv.eleveId);
      const classId = stu?.classId;
      if (!classId) continue;
      for (const l of inv.lignes || []) {
        const feeTypeId = l.feeTypeId || 'non_reparti';
        const lineTotal = convertCurrency(l.montant, l.devise || inv.devise, currency, exchangeRate);
        const paidShare = invTotal > 0 ? (lineTotal * invPaid) / invTotal : 0;
        const key = `${feeTypeId}||${classId}`;
        collectedMap.set(key, (collectedMap.get(key) || 0) + paidShare);
      }
    }
    return Array.from(expectedMap.entries())
      .map(([key, exp]) => ({ ...exp, collected: collectedMap.get(key) || 0, rate: exp.expected > 0 ? (collectedMap.get(key) || 0) / exp.expected : 0 }))
      .filter(r => r.expected > 0.001)
      .sort((a, b) => b.expected - a.expected);
  }, [filteredInvoices, students, classes, feeTypes, currency, exchangeRate]);

  const recoveryByClass = useMemo(() => {
    const expMap = new Map<string, number>();
    const colMap = new Map<string, number>();
    for (const r of recoveryByFeeClass) {
      expMap.set(r.classId, (expMap.get(r.classId) || 0) + r.expected);
      colMap.set(r.classId, (colMap.get(r.classId) || 0) + r.collected);
    }
    return classes
      .filter(c => expMap.has(c.id))
      .map(c => ({
        classId: c.id,
        className: c.nom,
        cycle: c.cycleId,
        expected: expMap.get(c.id) || 0,
        collected: colMap.get(c.id) || 0,
        rate: (expMap.get(c.id) || 0) > 0 ? (colMap.get(c.id) || 0) / (expMap.get(c.id) || 0) : 0,
      }))
      .sort((a, b) => b.expected - a.expected);
  }, [recoveryByFeeClass, classes]);

  const alerts = useMemo(() => {
    const items: { type: 'danger' | 'warning' | 'success'; text: string }[] = [];
    if (totalUnpaid > totalPaid * 0.75 && totalUnpaid > 0) items.push({ type: 'danger', text: `Créances élevées : ${fmt(totalUnpaid)} restent à recouvrer sur ${fmt(totalBilled)} facturés.` });
    if (recoveryRate < 0.5 && totalBilled > 0) items.push({ type: 'warning', text: 'Taux de recouvrement faible. Relancez les impayés ou proposez des échéanciers.' });
    if (totalSorties > totalEntrees) items.push({ type: 'danger', text: `Déficit de trésorerie : les sorties (${fmt(totalSorties)}) dépassent les entrées (${fmt(totalEntrees)}).` });
    if (netResult < 0) items.push({ type: 'danger', text: `Résultat net négatif : ${fmt(netResult)}. Les charges dépassent les revenus.` });
    const lowRecovery = recoveryByClass.filter(r => r.expected > 1000 && r.rate < 0.4).slice(0, 3);
    lowRecovery.forEach(r => items.push({ type: 'warning', text: `Recouvrement faible en ${r.className} (${(r.rate * 100).toFixed(0)}%).` }));
    const overdue = reliquats.filter(r => r.joursRetard > 30).slice(0, 5);
    overdue.forEach(r => items.push({ type: 'warning', text: `Impayé > 30 jours : ${r.nomEleve} (${r.nomClasse}) — ${fmt(r.reste)}` }));
    if (items.length === 0) items.push({ type: 'success', text: 'Situation financière globalement saine pour la période filtrée.' });
    return items;
  }, [totalUnpaid, totalPaid, totalBilled, recoveryRate, totalSorties, totalEntrees, netResult, recoveryByClass, reliquats]);

  // ─── Notifications globales ──────────────────────────────────────────────
  const NOTIF_KEY = 'ecolisa_financial_notifications';
  useEffect(() => {
    if (loading) return;
    const existingRaw = localStorage.getItem(NOTIF_KEY);
    const existing: any[] = existingRaw ? JSON.parse(existingRaw) : [];
    const newNotifs = alerts
      .filter(a => a.type !== 'success')
      .map((a, i) => ({
        id: `fin-${Date.now()}-${i}`,
        type: 'finance',
        text: a.text,
        time: 'À l\'instant',
        icon: a.type === 'danger' ? 'AlertTriangle' : 'AlertTriangle',
        iconColor: a.type === 'danger' ? '#ef4444' : '#f59e0b',
      }));
    const merged = [...newNotifs, ...existing.filter(e => !newNotifs.some(n => n.text === e.text))].slice(0, 20);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(merged));
  }, [loading, alerts]);

  const topExpenses = useMemo(() => {
    return filteredCash
      .filter(o => o.type === 'SORTIE')
      .map(o => ({ ...o, usd: convertCurrency(o.montant, o.devise, currency, exchangeRate) }))
      .sort((a, b) => b.usd - a.usd)
      .slice(0, 20);
  }, [filteredCash, currency, exchangeRate]);

  const expenseByBeneficiary = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredCash.filter(o => o.type === 'SORTIE')) {
      const key = o.beneficiaire || o.caissier || 'Non renseigné';
      map.set(key, (map.get(key) || 0) + convertCurrency(o.montant, o.devise, currency, exchangeRate));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredCash, currency, exchangeRate]);

  const revenueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of filteredInvoices) {
      const total = getInvoiceTotal(i, currency);
      const paid = getInvoicePaid(i, payments, currency);
      for (const l of i.lignes || []) {
        const key = l.categorie || 'AUTRE';
        const lineTotal = convertCurrency(l.montant, l.devise || i.devise, currency, exchangeRate);
        const paidShare = total > 0 ? (lineTotal * paid) / total : 0;
        map.set(key, (map.get(key) || 0) + paidShare);
      }
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices, payments, currency, exchangeRate]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredCash.filter(o => o.type === 'SORTIE')) {
      map.set(o.categorie, (map.get(o.categorie) || 0) + convertCurrency(o.montant, o.devise, currency, exchangeRate));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredCash, currency, exchangeRate]);

  const revenueByPaymentMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filteredPayments) {
      map.set(p.moyenPaiement, (map.get(p.moyenPaiement) || 0) + getPaymentAmount(p, currency));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredPayments, currency, exchangeRate]);

  // Synthèse par catégorie de frais (facturé vs encaissé)
  const revenueByFeeCategory = useMemo(() => {
    const CATEGORY_LABELS: Record<string, string> = {
      FRAIS_INSCRIPTION: 'Inscription',
      FRAIS_REINSCRIPTION: 'Réinscription',
      FRAIS_MINERVAL: 'Minerval',
      FRAIS_CONNEXES: 'Connexion',
      FRAIS_CARTE: 'Carte',
      FRAIS_EXAMEN: 'Examen',
      FRAIS_KITS_EQUIPEMENTS: 'Kits/Équip.',
      FRAIS_UNIFORME: 'Uniforme',
      FRAIS_BUS: 'Transport',
      FRAIS_ACTIVITE: 'Activités',
      AUTRE: 'Autres',
    };
    const billedMap = new Map<string, number>();
    const paidMap = new Map<string, number>();
    for (const inv of filteredInvoices) {
      const invTotal = getInvoiceTotal(inv, currency);
      const invPaid = getInvoicePaid(inv, payments, currency);
      for (const l of inv.lignes || []) {
        const key = l.categorie || 'AUTRE';
        const lineTotal = convertCurrency(l.montant, l.devise || inv.devise, currency, exchangeRate);
        const billed = lineTotal;
        const paid = invTotal > 0 ? (lineTotal * invPaid) / invTotal : 0;
        billedMap.set(key, (billedMap.get(key) || 0) + billed);
        paidMap.set(key, (paidMap.get(key) || 0) + paid);
      }
    }
    return Array.from(billedMap.entries())
      .map(([cat, billed]) => ({
        cat,
        label: CATEGORY_LABELS[cat] || cat,
        billed,
        paid: paidMap.get(cat) || 0,
        rate: billed > 0 ? Math.round(((paidMap.get(cat) || 0) / billed) * 100) : 0,
      }))
      .filter(r => r.billed > 0.001)
      .sort((a, b) => b.billed - a.billed);
  }, [filteredInvoices, currency, exchangeRate]);

  const classOptions = useMemo(() => [
    { value: '', label: 'Toutes classes' },
    ...Array.from(new Set(invoices.map(i => i.nomClasse).filter(Boolean))).sort().map(c => ({ value: c, label: c })),
  ], [invoices]);

  const optionOptions = useMemo(() => [
    { value: '', label: 'Toutes options' },
    ...Array.from(new Set(classes.map(c => c.optionCode).filter(Boolean))).sort().map(o => ({ value: o!, label: o! })),
  ], [classes]);

  const cycleOptions = useMemo(() => [
    { value: '', label: 'Tous cycles' },
    { value: 'MATERNELLE', label: 'Maternelle' },
    { value: 'PRIMAIRE', label: 'Primaire' },
    { value: 'SECONDAIRE_CTEB', label: 'CTEB' },
    { value: 'HUMANITES', label: 'Humanités' },
  ], []);

  const paymentMethodOptions = useMemo(() => [
    { value: '', label: 'Tous modes' },
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK', label: 'Banque' },
    { value: 'FLEXPAY_MPESA', label: 'M-Pesa' },
    { value: 'FLEXPAY_ORANGE', label: 'Orange' },
    { value: 'FLEXPAY_AIRTEL', label: 'Airtel' },
    { value: 'FLUTTERWAVE_CARTE', label: 'Carte' },
  ], []);

  const feeCategoryOptions = useMemo(() => [
    { value: '', label: 'Toutes catégories' },
    { value: 'FRAIS_INSCRIPTION', label: 'Inscription' },
    { value: 'FRAIS_REINSCRIPTION', label: 'Réinscription' },
    { value: 'FRAIS_MINERVAL', label: 'Minerval' },
    { value: 'FRAIS_CONNEXES', label: 'Connexion' },
    { value: 'FRAIS_CARTE', label: 'Carte' },
    { value: 'FRAIS_EXAMEN', label: 'Examen' },
    { value: 'FRAIS_KITS_EQUIPEMENTS', label: 'Kits/Équip.' },
    { value: 'FRAIS_UNIFORME', label: 'Uniforme' },
    { value: 'FRAIS_BUS', label: 'Transport' },
    { value: 'FRAIS_ACTIVITE', label: 'Activités' },
    { value: 'AUTRE', label: 'Autres' },
  ], []);

  const invoiceStatusOptions = useMemo(() => [
    { value: '', label: 'Tous statuts' },
    { value: 'PAYE', label: 'Payé' },
    { value: 'PARTIEL', label: 'Partiel' },
    { value: 'NON_PAYE', label: 'Impayé' },
  ], []);

  const periodPresetOptions = useMemo(() => [
    { value: '', label: 'Période libre' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'this_week', label: 'Cette semaine' },
    { value: 'this_month', label: 'Ce mois' },
    { value: 'last_month', label: 'Mois dernier' },
    { value: 'this_quarter', label: 'Ce trimestre' },
    { value: 'this_year', label: 'Cette année' },
    { value: 'last_year', label: 'Année dernière' },
  ], []);

  const yearOptions = useMemo(() => [
    { value: '', label: 'Toutes années' },
    ...years.map(y => ({ value: y.id, label: y.nom })),
  ], [years]);

  const cashFlowByMonth = useMemo(() => {
    const map = new Map<string, { entrees: number; sorties: number }>();
    for (const o of filteredCash) {
      const month = o.date?.slice(0, 7) || '—';
      const val = convertCurrency(o.montant, o.devise, currency, exchangeRate);
      const cur = map.get(month) || { entrees: 0, sorties: 0 };
      if (o.type === 'ENTREE') cur.entrees += val;
      else cur.sorties += val;
      map.set(month, cur);
    }
    return Array.from(map.entries()).sort().map(([month, v]) => ({ month, ...v }));
  }, [filteredCash, currency, exchangeRate]);

  const balanceByCompte = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of ecritures) {
      for (const l of e.lignes || []) {
        const cur = map.get(l.compteId) || 0;
        map.set(l.compteId, cur + (l.debit || 0) - (l.credit || 0));
      }
    }
    return Array.from(map.entries())
      .map(([id, solde]) => {
        const c = comptes.find(x => x.id === id);
        return { name: c ? `${c.code} ${c.nom}` : id, solde };
      })
      .filter(x => Math.abs(x.solde) > 0.001)
      .sort((a, b) => Math.abs(b.solde) - Math.abs(a.solde));
  }, [ecritures, comptes]);

  const exportReport = () => {
    const period = `${dateFrom || '—'} au ${dateTo || '—'}`;
    let csv = `Rapport Financier ECOLISA,,${period}\n\n`;
    csv += 'Synthèse\n';
    csv += `Total facturé,${fmt(totalBilled)}\n`;
    csv += `Total encaissé,${fmt(totalPaid)}\n`;
    csv += `Reste à recouvrer,${fmt(totalUnpaid)}\n`;
    csv += `Taux de recouvrement,${(recoveryRate * 100).toFixed(1)}%\n`;
    csv += `Total entrées caisse,${fmt(totalEntrees)}\n`;
    csv += `Total sorties caisse,${fmt(totalSorties)}\n`;
    csv += `Solde net,${fmt(netCash)}\n`;
    csv += `Résultat net,${fmt(netResult)}\n`;
    csv += `Salaires payés,${fmt(salaryExpenses)}\n`;
    csv += `Coûts imputés,${fmt(imputedCosts)}\n\n`;
    csv += 'Reliquats / Restes à payer,Classe,Téléphone,Total,Payé,Reste,Retard\n';
    for (const r of reliquats) {
      csv += `"${r.nomEleve}",${r.nomClasse},${r.telephoneParent},${fmt(r.total)},${fmt(r.paye)},${fmt(r.reste)},${r.joursRetard} j\n`;
    }
    csv += '\nRecouvrement par classe,Frais attendus,Encaissé,Taux\n';
    for (const r of recoveryByClass) {
      csv += `${r.className},${fmt(r.expected)},${fmt(r.collected)},${(r.rate * 100).toFixed(1)}%\n`;
    }
    csv += '\nDépenses principales,Date,Montant,Bénéficiaire,Caissier,Pièce\n';
    for (const o of topExpenses.slice(0, 15)) {
      csv += `"${o.libelle}",${o.date?.split('T')[0]},${fmt(o.usd)},${o.beneficiaire || '—'},${o.caissier || '—'},${o.pieceJustificative || '—'}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-financier-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => { window.print(); };

  const printRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const html2pdfModule = await import('html2pdf.js').catch(() => null);
      if (!html2pdfModule) { printReport(); return; }
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      const opt = {
        margin: 8,
        filename: `rapport-financier-ecolisa-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      await html2pdf().set(opt).from(printRef.current).save();
    } catch {
      printReport();
    }
  };

  const displayRecovery = useMemo(() => {
    if (!reportSearch) return recoveryByFeeClass;
    const q = reportSearch.toLowerCase();
    return recoveryByFeeClass.filter(r =>
      r.feeName.toLowerCase().includes(q) ||
      r.className.toLowerCase().includes(q) ||
      r.feeCategorie.toLowerCase().includes(q)
    );
  }, [recoveryByFeeClass, reportSearch]);

  const displayTopExpenses = useMemo(() => {
    if (!reportSearch) return topExpenses;
    const q = reportSearch.toLowerCase();
    return topExpenses.filter(o =>
      [o.libelle, o.categorie, o.beneficiaire, o.caissier, o.pieceJustificative].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [topExpenses, reportSearch]);

  const { paginated: paginatedRecoveryByClass, ...recoveryByClassPagination } = usePagination(recoveryByClass, { defaultPageSize: 10 });
  const { paginated: paginatedDisplayRecovery, ...displayRecoveryPagination } = usePagination(displayRecovery, { defaultPageSize: 15 });
  const { paginated: paginatedTopExpenses, ...topExpensesPagination } = usePagination(displayTopExpenses, { defaultPageSize: 15 });
  const { paginated: paginatedReliquats, ...reliquatsPagination } = usePagination(reliquats, { defaultPageSize: 10 });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Rapports Financiers</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyse intelligente : recouvrement, trésorerie, bénéfice et relances</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CustomSelect
            options={periodPresetOptions}
            value={periodPreset}
            onChange={setPeriodPreset}
            placeholder="Période libre"
            className="w-36"
          />
          <CustomSelect
            options={yearOptions}
            value={yearFilter}
            onChange={setYearFilter}
            placeholder="Toutes années"
            icon={Calendar}
            className="w-40"
          />
          <CustomSelect
            options={cycleOptions}
            value={cycleFilter}
            onChange={setCycleFilter}
            placeholder="Tous cycles"
            className="w-36"
          />
          <CustomSelect
            options={classOptions}
            value={classFilter}
            onChange={setClassFilter}
            placeholder="Toutes classes"
            className="w-40"
          />
          <CustomSelect
            options={optionOptions}
            value={optionFilter}
            onChange={setOptionFilter}
            placeholder="Toutes options"
            className="w-36"
          />
          <CustomSelect
            options={paymentMethodOptions}
            value={paymentMethodFilter}
            onChange={setPaymentMethodFilter}
            placeholder="Tous modes"
            className="w-36"
          />
          <CustomSelect
            options={feeCategoryOptions}
            value={feeCategoryFilter}
            onChange={setFeeCategoryFilter}
            placeholder="Toutes catégories"
            className="w-40"
          />
          <CustomSelect
            options={invoiceStatusOptions}
            value={invoiceStatusFilter}
            onChange={setInvoiceStatusFilter}
            placeholder="Tous statuts"
            className="w-36"
          />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <CustomDatePicker value={dateFrom} onChange={setDateFrom} placeholder="Du" className="w-36" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>au</span>
            <CustomDatePicker value={dateTo} onChange={setDateTo} placeholder="Au" className="w-36" />
          </div>
          <button
            onClick={() => {
              setYearFilter(''); setClassFilter(''); setOptionFilter(''); setCycleFilter('');
              setPaymentMethodFilter(''); setFeeCategoryFilter(''); setInvoiceStatusFilter('');
              setPeriodPreset(''); setDateFrom(''); setDateTo(''); setReportSearch('');
              setImputedCosts(0);
            }}
            className="px-3 py-2 rounded-xl border text-[11px] font-black flex items-center gap-1.5"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={exportReport} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={downloadPDF} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={printReport} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Printer className="w-3.5 h-3.5" /> Imprimer
          </button>
        </div>
      </div>

      {dateFrom && dateTo && (
        <div className="mb-4 flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <span className="px-2 py-1 rounded-md border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            Période active : {dateFrom} au {dateTo}
          </span>
          {(yearFilter || classFilter || optionFilter || cycleFilter || paymentMethodFilter || feeCategoryFilter || invoiceStatusFilter) && (
            <span className="px-2 py-1 rounded-md border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              Filtres : {[
                yearFilter && years.find(y => y.id === yearFilter)?.nom,
                classFilter,
                optionFilter,
                cycleFilter,
                paymentMethodFilter,
                feeCategoryFilter,
                invoiceStatusFilter,
              ].filter(Boolean).join(' · ') || 'Aucun'}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {[
          { label: 'Facturé', val: fmt(totalBilled), color: '#3b82f6', icon: FileText, desc: 'Montant total facturé' },
          { label: 'Encaissé', val: fmt(totalPaid), color: '#10b981', icon: TrendingUp, desc: 'Paiements reçus' },
          { label: 'Reste à recouvrer', val: fmt(totalUnpaid), color: totalUnpaid > 0 ? '#ef4444' : '#10b981', icon: DollarSign, desc: 'Créances clients' },
          { label: 'Taux recouvrement', val: `${(recoveryRate * 100).toFixed(1)}%`, color: '#8b5cf6', icon: TrendingUp, desc: 'Encaissé / facturé' },
          { label: 'Dépenses', val: fmt(totalSorties), color: '#ef4444', icon: TrendingDown, desc: 'Sorties de caisse' },
          { label: 'Solde net', val: fmt(netCash), color: netCash >= 0 ? '#6366f1' : '#ef4444', icon: DollarSign, desc: 'Entrées - sorties' },
          { label: 'Résultat net', val: fmt(netResult), color: netResult >= 0 ? '#10b981' : '#ef4444', icon: PieChartIcon, desc: 'Encaissements - charges' },
        ].map(s => (
          <div key={s.label} className="kpi-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}12` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-[17px] font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{s.desc}</p>
          </div>
        ))}
      </div>

      {/* ─── Analyse comparative & alertes ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="section-card p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Comparaison avec la période précédente
          </h3>
          {dateFrom && dateTo ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Facturé', cur: totalBilled, prev: previousBilled },
                { label: 'Encaissé', cur: totalPaid, prev: previousPaid },
                { label: 'Entrées caisse', cur: totalEntrees, prev: previousEntrees },
                { label: 'Sorties caisse', cur: totalSorties, prev: previousSorties },
                { label: 'Solde net', cur: netCash, prev: previousNetCash },
              ].map(s => {
                const change = pctChange(s.cur, s.prev);
                const positive = change >= 0;
                return (
                  <div key={s.label} className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{s.label}</p>
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{fmt(s.cur)}</p>
                    <p className={`text-[10px] font-black ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {s.prev > 0 ? `${positive ? '+' : ''}${change.toFixed(1)}%` : 'N/A'} vs période précédente
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sélectionnez une plage de dates pour activer la comparaison.</p>
          )}
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lightbulb className="w-4 h-4 text-amber-500" /> Alertes & recommandations
          </h3>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                {a.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" /> : <AlertTriangle className={`w-4 h-4 mt-0.5 ${a.type === 'danger' ? 'text-rose-500' : 'text-amber-500'}`} />}
                <p className={`text-[11px] leading-5 ${a.type === 'success' ? 'text-emerald-700' : a.type === 'danger' ? 'text-rose-700' : 'text-amber-700'}`}>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Vue de bénéfice / Résultat net estimé ─────────────────────────── */}
      <div className="section-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Wallet className="w-4 h-4 text-emerald-500" /> Résultat net estimé
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Coûts imputés</span>
            <NumberInput
              value={imputedCosts}
              onChange={setImputedCosts}
              min={0}
              className="w-32 text-right"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: 'Revenus', val: fmt(totalEntrees), color: '#10b981', icon: TrendingUp },
            { label: 'Dépenses', val: fmt(nonSalaryExpenses), color: '#f59e0b', icon: TrendingDown },
            { label: 'Salaires payés', val: fmt(salaryExpenses), color: '#3b82f6', icon: Banknote },
            { label: 'Masse salariale', val: fmt(payrollMass), color: '#6366f1', icon: DollarSign },
            { label: 'Coûts imputés', val: fmt(imputedCosts), color: '#8b5cf6', icon: PieChartIcon },
            { label: 'Résultat net', val: fmt(netResult), color: netResult >= 0 ? '#10b981' : '#ef4444', icon: Wallet },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              </div>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Formule : encaissements − (dépenses de caisse − salaires payés) − salaires payés − coûts imputés = {fmt(netResult)}.
        </p>
      </div>

      {/* ─── Synthèse par Catégorie de Frais ─────────────────────────── */}
      {revenueByFeeCategory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-black mb-3" style={{ color: 'var(--text-primary)' }}>
            Synthèse par Catégorie de Frais
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {revenueByFeeCategory.map((r, i) => (
              <div
                key={r.cat}
                className="p-4 rounded-xl border flex flex-col gap-2"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black" style={{ color: 'var(--text-primary)' }}>{r.label}</span>
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-full"
                    style={{
                      background: r.rate >= 80 ? 'rgba(16,185,129,0.15)' : r.rate >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                      color: r.rate >= 80 ? '#059669' : r.rate >= 50 ? '#d97706' : '#dc2626',
                    }}
                  >
                    {r.rate}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, r.rate)}%`,
                      background: r.rate >= 80 ? '#10b981' : r.rate >= 50 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(r.paid)}</span>
                  {' '} / {fmt(r.billed)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Flux de trésorerie par mois</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowByMonth}>
                <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="entrees" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recettes par catégorie de frais</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name} fontSize={9}>
                  {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Dépenses par catégorie</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Méthodes de paiement</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByPaymentMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name} fontSize={9}>
                  {revenueByPaymentMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recouvrement par classe</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recoveryByClass}>
                <XAxis dataKey="className" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="expected" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Dépenses par bénéficiaire</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByBeneficiary} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} width={80} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="section-card p-5 mb-6">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Évolution du solde cumulé</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlowByMonth} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradReport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="entrees" stroke="#10b981" strokeWidth={2} fill="rgba(16,185,129,0.1)" />
              <Area type="monotone" dataKey="sorties" stroke="#ef4444" strokeWidth={2} fill="rgba(239,68,68,0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Reliquats / Restes à payer ─────────────────────────── */}
      <div className="section-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Reliquats / Restes à payer</h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Impayés par élève et par famille, téléphone pour relance</p>
          </div>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500">{reliquats.length} factures</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Élève</th>
                <th>Classe</th>
                <th>Téléphone</th>
                <th className="text-right">Total</th>
                <th className="text-right">Payé</th>
                <th className="text-right">Reste</th>
                <th className="text-center">Échéance</th>
                <th className="text-center">Retard</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReliquats.map(r => (
                <tr key={r.invoiceId}>
                  <td className="font-bold text-[12px]">{r.nomEleve}</td>
                  <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.nomClasse}</td>
                  <td className="text-[11px]">{r.telephoneParent}</td>
                  <td className="text-right font-bold">{fmt(r.total)}</td>
                  <td className="text-right font-bold text-emerald-600">{fmt(r.paye)}</td>
                  <td className="text-right font-black" style={{ color: '#ef4444' }}>{fmt(r.reste)}</td>
                  <td className="text-center text-[11px]">{r.echeance?.split('T')[0] || '—'}</td>
                  <td className="text-center">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: r.joursRetard > 30 ? 'rgba(239,68,68,0.15)' : r.joursRetard > 0 ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: r.joursRetard > 30 ? '#dc2626' : r.joursRetard > 0 ? '#d97706' : '#059669',
                      }}
                    >
                      {r.joursRetard > 0 ? `${r.joursRetard} j` : 'À jour'}
                    </span>
                  </td>
                </tr>
              ))}
              {reliquats.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun reliquat trouvé pour les filtres sélectionnés.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={reliquatsPagination.page}
          totalPages={reliquatsPagination.totalPages}
          total={reliquatsPagination.total}
          pageSize={reliquatsPagination.pageSize}
          start={reliquatsPagination.start}
          end={reliquatsPagination.end}
          onPageChange={reliquatsPagination.setPage}
          onPageSizeChange={reliquatsPagination.setPageSize}
        />
      </div>

      <div className="section-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Recouvrement par classe</h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500">{recoveryByClass.length} classes</span>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Classe</th>
                <th>Cycle</th>
                <th className="text-right">Frais attendus</th>
                <th className="text-right">Encaissé</th>
                <th className="text-right">Reste</th>
                <th className="text-center">Taux</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecoveryByClass.map(r => (
                <tr key={r.classId}>
                  <td className="font-bold text-[12px]">{r.className}</td>
                  <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.cycle}</td>
                  <td className="text-right font-bold">{fmt(r.expected)}</td>
                  <td className="text-right font-bold text-emerald-600">{fmt(r.collected)}</td>
                  <td className="text-right font-bold" style={{ color: r.expected - r.collected > 0 ? '#ef4444' : '#10b981' }}>{fmt(Math.max(0, r.expected - r.collected))}</td>
                  <td className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-[11px] font-black" style={{ color: r.rate >= 0.75 ? '#10b981' : r.rate >= 0.5 ? '#f59e0b' : '#ef4444' }}>{(r.rate * 100).toFixed(1)}%</span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.rate * 100)}%`, background: r.rate >= 0.75 ? '#10b981' : r.rate >= 0.5 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {recoveryByClass.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune donnée de recouvrement pour la période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={recoveryByClassPagination.page}
          totalPages={recoveryByClassPagination.totalPages}
          total={recoveryByClassPagination.total}
          pageSize={recoveryByClassPagination.pageSize}
          start={recoveryByClassPagination.start}
          end={recoveryByClassPagination.end}
          onPageChange={recoveryByClassPagination.setPage}
          onPageSizeChange={recoveryByClassPagination.setPageSize}
        />
      </div>

      <div className="section-card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Recouvrement détaillé par frais et par classe</h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Combien chaque frais devrait rapporter et ce qui a été réellement encaissé</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={reportSearch}
              onChange={e => setReportSearch(e.target.value)}
              placeholder="Rechercher frais, classe..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Frais</th>
                <th>Catégorie</th>
                <th>Classe</th>
                <th className="text-right">Attendu</th>
                <th className="text-right">Encaissé</th>
                <th className="text-right">Taux</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDisplayRecovery.map(r => (
                <tr key={`${r.feeId}-${r.classId}`}>
                  <td className="font-bold text-[12px]">{r.feeName}</td>
                  <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{r.feeCategorie.replace(/_/g, ' ')}</td>
                  <td className="text-[11px]">{r.className}</td>
                  <td className="text-right font-bold">{fmt(r.expected)}</td>
                  <td className="text-right font-bold text-emerald-600">{fmt(r.collected)}</td>
                  <td className="text-right font-black" style={{ color: r.rate >= 0.75 ? '#10b981' : r.rate >= 0.5 ? '#f59e0b' : '#ef4444' }}>{(r.rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {displayRecovery.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun frais configuré ou encaissé sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={displayRecoveryPagination.page}
          totalPages={displayRecoveryPagination.totalPages}
          total={displayRecoveryPagination.total}
          pageSize={displayRecoveryPagination.pageSize}
          start={displayRecoveryPagination.start}
          end={displayRecoveryPagination.end}
          onPageChange={displayRecoveryPagination.setPage}
          onPageSizeChange={displayRecoveryPagination.setPageSize}
        />
      </div>

      <div className="section-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Où est passé l'argent ? — Dépenses détaillées</h3>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-slate-500/10 text-slate-500">{displayTopExpenses.length} opérations</span>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th>Bénéficiaire</th>
                <th>Payé par</th>
                <th>Pièce</th>
                <th className="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTopExpenses.map(o => (
                <tr key={o.id}>
                  <td className="text-[11px]">{o.date?.split('T')[0]}</td>
                  <td className="font-bold text-[12px]">{o.libelle}</td>
                  <td className="text-[11px]"><span className="px-1.5 py-0.5 rounded text-[9px] font-black border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>{o.categorie}</span></td>
                  <td className="text-[11px]">{o.beneficiaire || '—'}</td>
                  <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{o.caissier}</td>
                  <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{o.pieceJustificative || '—'}</td>
                  <td className="text-right font-black text-rose-600">{fmt(o.montant, o.devise)}</td>
                </tr>
              ))}
              {displayTopExpenses.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucune sortie de caisse sur cette période.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={topExpensesPagination.page}
          totalPages={topExpensesPagination.totalPages}
          total={topExpensesPagination.total}
          pageSize={topExpensesPagination.pageSize}
          start={topExpensesPagination.start}
          end={topExpensesPagination.end}
          onPageChange={topExpensesPagination.setPage}
          onPageSizeChange={topExpensesPagination.setPageSize}
        />
      </div>

      <div ref={printRef} className="printable-fiche p-8" style={{ background: '#ffffff', color: '#0f172a' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black mb-1">Rapport Financier ECOLISA</h1>
          <p className="text-sm">
            Période : {dateFrom || '—'} au {dateTo || '—'} · Année : {years.find(y => y.id === yearFilter)?.nom || 'Toutes'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Filtres : {[
              yearFilter && years.find(y => y.id === yearFilter)?.nom,
              classFilter,
              optionFilter,
              cycleFilter,
              paymentMethodFilter,
              feeCategoryFilter,
              invoiceStatusFilter,
            ].filter(Boolean).join(' · ') || 'Aucun'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-3 border rounded">
            <p className="text-xs text-slate-500">Facturé</p>
            <p className="text-lg font-black">{fmt(totalBilled)}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-xs text-slate-500">Encaissé</p>
            <p className="text-lg font-black">{fmt(totalPaid)}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-xs text-slate-500">Reste / Solde</p>
            <p className="text-lg font-black">{fmt(totalUnpaid)} / {fmt(netCash)}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-xs text-slate-500">Résultat net</p>
            <p className="text-lg font-black">{fmt(netResult)}</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-xs text-slate-500">Taux de recouvrement</p>
            <p className="text-lg font-black">{(recoveryRate * 100).toFixed(1)}%</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-xs text-slate-500">Reliquats</p>
            <p className="text-lg font-black">{reliquats.length} factures</p>
          </div>
        </div>

        <h2 className="font-bold text-lg mb-2">Résultat net estimé</h2>
        <table className="w-full text-sm mb-6">
          <thead><tr className="border-b"><th className="text-left">Indicateur</th><th className="text-right">Montant</th></tr></thead>
          <tbody>
            <tr className="border-b"><td>Revenus (entrées caisse)</td><td className="text-right">{fmt(totalEntrees)}</td></tr>
            <tr className="border-b"><td>Dépenses hors salaires</td><td className="text-right">{fmt(nonSalaryExpenses)}</td></tr>
            <tr className="border-b"><td>Salaires payés</td><td className="text-right">{fmt(salaryExpenses)}</td></tr>
            <tr className="border-b"><td>Coûts imputés</td><td className="text-right">{fmt(imputedCosts)}</td></tr>
            <tr className="border-b font-black"><td>Résultat net</td><td className="text-right">{fmt(netResult)}</td></tr>
          </tbody>
        </table>

        <h2 className="font-bold text-lg mb-2">Reliquats / Restes à payer</h2>
        <table className="w-full text-sm mb-6">
          <thead><tr className="border-b"><th className="text-left">Élève</th><th className="text-left">Classe</th><th className="text-right">Total</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th className="text-center">Retard</th></tr></thead>
          <tbody>
            {reliquats.slice(0, 20).map(r => (
              <tr key={r.invoiceId} className="border-b"><td>{r.nomEleve}</td><td>{r.nomClasse}</td><td className="text-right">{fmt(r.total)}</td><td className="text-right">{fmt(r.paye)}</td><td className="text-right">{fmt(r.reste)}</td><td className="text-center">{r.joursRetard} j</td></tr>
            ))}
          </tbody>
        </table>

        <h2 className="font-bold text-lg mb-2">Recouvrement par classe</h2>
        <table className="w-full text-sm mb-6">
          <thead><tr className="border-b"><th className="text-left">Classe</th><th className="text-right">Attendu</th><th className="text-right">Encaissé</th><th className="text-right">Taux</th></tr></thead>
          <tbody>
            {recoveryByClass.map(r => (
              <tr key={r.classId} className="border-b"><td>{r.className}</td><td className="text-right">{fmt(r.expected)}</td><td className="text-right">{fmt(r.collected)}</td><td className="text-right">{(r.rate * 100).toFixed(1)}%</td></tr>
            ))}
          </tbody>
        </table>

        <h2 className="font-bold text-lg mb-2">Dépenses principales</h2>
        <table className="w-full text-sm">
          <thead><tr className="border-b"><th className="text-left">Date</th><th className="text-left">Libellé</th><th className="text-left">Bénéficiaire</th><th className="text-right">Montant</th></tr></thead>
          <tbody>
            {topExpenses.slice(0, 15).map(o => (
              <tr key={o.id} className="border-b"><td>{o.date?.split('T')[0]}</td><td>{o.libelle}</td><td>{o.beneficiaire || '—'}</td><td className="text-right">{fmt(o.montant, o.devise)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
