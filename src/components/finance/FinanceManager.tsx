import React, { useState, useEffect, useMemo } from 'react';
import { CustomSelect } from '../common/CustomSelect';
import {
  Receipt,
  Wallet,
  PieChart,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Printer,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Clock,
  Phone,
  FileText,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, BarChart, Bar } from 'recharts';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { NumberInput } from '../common/NumberInput';
import type { DepenseCaisse, MembrePersonnel } from '../../types';
import { InvoiceTab } from './InvoiceTab';
import { CashTab } from './CashTab';
import { FeesTab } from './FeesTab';
import { AccountingTab } from './AccountingTab';
import { ReportsTab } from './ReportsTab';
import { PayFeesModal } from './PayFeesModal';

interface FinanceManagerProps {
  activeSubTab?: string;
  activeSchoolYear?: string;
}

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// ─── Shared Components ────────────────────────────────────────────────────

const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex items-center justify-between mb-6">
    <div>
      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

const invoiceStatusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    PAYE:     { label: '✓ Soldé',   cls: 'badge-success' },
    PARTIEL:  { label: '◑ Partiel', cls: 'badge-warning' },
    NON_PAYE: { label: '✗ Impayé',  cls: 'badge-danger' },
  };
  const s = map[statut] || { label: statut, cls: 'badge-neutral' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
};

const methodBadge = (method: string) => {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    CASH:              { bg: 'rgba(16,185,129,0.10)',  text: '#059669', label: '💵 Cash' },
    FLEXPAY_MPESA:     { bg: 'rgba(0,160,0,0.08)',    text: '#15803d', label: '📱 M-Pesa' },
    FLEXPAY_ORANGE:    { bg: 'rgba(234,88,12,0.10)',  text: '#c2410c', label: '📱 Orange' },
    FLEXPAY_AIRTEL:    { bg: 'rgba(220,38,38,0.10)',  text: '#b91c1c', label: '📱 Airtel' },
    FLUTTERWAVE_CARTE: { bg: 'rgba(99,102,241,0.10)', text: '#4f46e5', label: '💳 Carte' },
  };
  const c = colors[method] || { bg: '#f1f5f9', text: '#64748b', label: method };
  return (
    <span
      className="badge"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
};


// ─── PAYROLL TAB ──────────────────────────────────────────────────────────

const PayrollTab: React.FC<{ activeSchoolYear?: string }> = ({ activeSchoolYear }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  });
  const [staff, setStaff] = useState<MembrePersonnel[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [caissier, setCaissier] = useState('Caissier');
  const [adjustments, setAdjustments] = useState<Record<string, { prime: number; deduction: number; avance: number; mode: string }>>({});
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [payingId, setPayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
    Promise.all([
      LocalDatabaseService.getStaff().then(res => setStaff(res || [])).catch(() => setStaff([])),
      LocalDatabaseService.getSchoolYears().then(setYears).catch(() => {})
    ]).finally(() => setLoading(false));
  }, []);

  const activeYear = useMemo(() => years.find(y => y.statut === 'EN_COURS') || years[0], [years]);

  const adj = (s: MembrePersonnel) => adjustments[s.id] || { prime: 0, deduction: 0, avance: 0, mode: 'CASH' };

  const netSalary = (s: MembrePersonnel) => {
    const a = adj(s);
    return Math.max(0, (s.salaireBase || 0) + (a.prime || 0) - (a.deduction || 0) - (a.avance || 0));
  };

  const totalMasse = useMemo(() => staff.reduce((a, s) => a + convertCurrency(netSalary(s), (s.devise || 'USD'), currency, exchangeRate), 0), [staff, adjustments, currency, exchangeRate]);

  const updateAdj = (id: string, key: 'prime' | 'deduction' | 'avance' | 'mode', val: any) => {
    setAdjustments(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { prime: 0, deduction: 0, avance: 0, mode: 'CASH' }), [key]: val },
    }));
  };

  const handlePay = async (s: MembrePersonnel) => {
    const net = netSalary(s);
    if (net <= 0) return;
    setPayingId(s.id);
    const a = adj(s);
    const expense: DepenseCaisse = {
      id: uuid(),
      date: new Date().toISOString(),
      libelle: `Salaire ${selectedMonth} — ${s.prenom || ''} ${s.nom}`.trim(),
      montant: net,
      devise: (s.devise || 'USD') as 'USD' | 'CDF',
      type: 'SORTIE',
      categorie: 'SALAIRES',
      modePaiement: a.mode || 'CASH',
      caissier,
      beneficiaire: `${s.prenom || ''} ${s.nom}`.trim(),
      pieceJustificative: `Paie ${selectedMonth}`,
      schoolYearId: activeYear?.id,
      origine: 'PAYROLL',
      origineId: s.id,
    };
    await LocalDatabaseService.addExpense(expense);
    setPaidIds(prev => { const n = new Set(prev); n.add(s.id); return n; });
    setPayingId(null);
  };

  return (
    <div>
      <SectionHeader
        title="Paie & Primes"
        subtitle={`Masse salariale nette — Mois de ${selectedMonth}`}
        actions={
          <div className="flex gap-2">
            <CustomSelect
              options={['07-2026', '06-2026', '05-2026', '04-2026'].map(m => ({ value: m, label: m }))}
              value={selectedMonth}
              onChange={val => setSelectedMonth(val)}
              className="w-36"
            />
            <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>
              <Printer className="w-3.5 h-3.5" /> État de Paie
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Masse Salariale Nette', val: fmt(totalMasse), color: '#6366f1', icon: Wallet },
          { label: 'Personnel Actif', val: String(staff.filter(s => s.statut === 'ACTIF').length), color: '#10b981', icon: CheckCircle },
          { label: 'En Congé / Absent', val: String(staff.filter(s => s.statut === 'EN_CONGE' || s.statut === 'SUSPENDU' || s.statut === 'INACTIF').length), color: '#f59e0b', icon: AlertTriangle },
        ].map(s => (
          <div
            key={s.label}
            className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}12` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800" style={{ background: 'var(--bg-surface)' }}>
          <p className="text-xs text-slate-400 font-bold">Chargement de la paie du personnel...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-slate-200 dark:border-slate-800" style={{ background: 'var(--bg-surface)' }}>
          <p className="text-xs text-slate-400 font-bold">Aucun membre du personnel enregistré pour établir la paie.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                <th className="p-3">Employé</th>
                <th className="p-3">Fonction</th>
                <th className="p-3 text-right">Salaire Base</th>
                <th className="p-3 text-right">Primes</th>
                <th className="p-3 text-right">Déductions</th>
                <th className="p-3 text-right">Avance</th>
                <th className="p-3 text-right">Net à payer</th>
                <th className="p-3 text-center">Mode</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {staff.map((s, i) => {
                const a = adj(s);
                const isPaid = paidIds.has(s.id);
                return (
                  <tr key={s.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom}</td>
                    <td className="p-3 text-slate-400">{s.role}</td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(s.salaireBase || 0, s.devise)}</td>
                    <td className="p-2">
                      <NumberInput value={a.prime} onChange={v => updateAdj(s.id, 'prime', v)} min={0} placeholder="0" className="input w-24 text-right text-xs py-1.5" />
                    </td>
                    <td className="p-2">
                      <NumberInput value={a.deduction} onChange={v => updateAdj(s.id, 'deduction', v)} min={0} placeholder="0" className="input w-24 text-right text-xs py-1.5" />
                    </td>
                    <td className="p-2">
                      <NumberInput value={a.avance} onChange={v => updateAdj(s.id, 'avance', v)} min={0} placeholder="0" className="input w-24 text-right text-xs py-1.5" />
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-600">{fmt(netSalary(s), s.devise)}</td>
                    <td className="p-2 text-center">
                      <select value={a.mode} onChange={e => updateAdj(s.id, 'mode', e.target.value)} className="input text-xs py-1.5 w-28">
                        <option value="CASH">Cash</option>
                        <option value="BANQUE">Banque</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                      </select>
                    </td>
                    <td className="p-3 text-center">
                      {isPaid ? (
                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">PAYÉ</span>
                      ) : (
                        <button
                          onClick={() => handlePay(s)}
                          disabled={payingId === s.id || netSalary(s) <= 0}
                          className="btn-primary py-1.5 px-3 text-[10px] flex items-center gap-1"
                        >
                          {payingId === s.id ? '...' : <><DollarSign className="w-3 h-3" /> Payer</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── MAIN MANAGER ────────────────────────────────────────────────────────

export const FinanceManager: React.FC<FinanceManagerProps> = ({ activeSubTab = 'invoices', activeSchoolYear }) => {
  const [localTab, setLocalTab] = useState(activeSubTab);
  const [quickAction, setQuickAction] = useState<'invoice' | 'expense' | 'fee' | 'payment' | null>(null);
  const [payFeesOpen, setPayFeesOpen] = useState(false);

  React.useEffect(() => {
    setLocalTab(activeSubTab);
  }, [activeSubTab]);

  const actionConsumed = () => setQuickAction(null);

  const quickActions = [
    { id: 'invoice' as const, label: 'Nouvelle Facture', icon: Plus, color: 'indigo' },
    { id: 'expense' as const, label: 'Nouvelle Dépense', icon: Wallet, color: 'amber' },
    { id: 'fee' as const, label: 'Nouveau Frais', icon: PieChart, color: 'emerald' },
    { id: 'payment' as const, label: 'Encaissement Frais', icon: CreditCard, color: 'slate' },
  ];

  const openQuick = (id: typeof quickActions[number]['id']) => {
    if (id === 'payment') { setPayFeesOpen(true); return; }
    if (id === 'invoice') setLocalTab('invoices');
    if (id === 'expense') setLocalTab('cash');
    if (id === 'fee') setLocalTab('fees');
    setQuickAction(id);
  };

  const renderTab = () => {
    switch (localTab) {
      case 'invoices':   return <InvoiceTab activeSchoolYear={activeSchoolYear} autoOpenCreate={quickAction === 'invoice'} autoOpenPayment={false} onActionConsumed={actionConsumed} />;
      case 'cash':       return <CashTab activeSchoolYear={activeSchoolYear} autoOpenForm={quickAction === 'expense'} onActionConsumed={actionConsumed} />;
      case 'payroll':    return <PayrollTab activeSchoolYear={activeSchoolYear} />;
      case 'fees':       return <FeesTab activeSchoolYear={activeSchoolYear} autoOpenFee={quickAction === 'fee'} onActionConsumed={actionConsumed} />;
      case 'accounting': return <AccountingTab activeSchoolYear={activeSchoolYear} />;
      case 'reports':    return <ReportsTab activeSchoolYear={activeSchoolYear} />;
      default:           return <InvoiceTab activeSchoolYear={activeSchoolYear} autoOpenCreate={quickAction === 'invoice'} autoOpenPayment={false} onActionConsumed={actionConsumed} />;
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header + Actions rapides */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Finance & Comptabilité</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Factures, caisse, paie, frais scolaires et rapports</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {quickActions.map(a => {
            const Icon = a.icon;
            const colorMap: Record<string, { ring: string; icon: string; bg: string }> = {
              indigo: { ring: 'border-indigo-500/20 hover:border-indigo-500/40', icon: 'bg-indigo-500 text-white', bg: 'hover:bg-indigo-500/10' },
              emerald: { ring: 'border-emerald-500/20 hover:border-emerald-500/40', icon: 'bg-emerald-500 text-white', bg: 'hover:bg-emerald-500/10' },
              amber: { ring: 'border-amber-500/20 hover:border-amber-500/40', icon: 'bg-amber-500 text-white', bg: 'hover:bg-amber-500/10' },
              slate: { ring: 'border-slate-400/20 hover:border-slate-400/40', icon: 'bg-slate-500 text-white', bg: 'hover:bg-slate-500/10' },
            };
            const c = colorMap[a.color];
            return (
              <button
                key={a.id}
                onClick={() => openQuick(a.id)}
                className={`group flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-2xl border text-[12px] font-black transition-all shadow-sm hover:shadow-md ${c.ring} ${c.bg}`}
                style={{ background: 'var(--bg-surface)' }}
              >
                <div className={`p-1.5 rounded-xl transition-transform group-hover:scale-110 ${c.icon}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in" key={localTab}>
        {renderTab()}
      </div>

      {payFeesOpen && (
        <PayFeesModal
          activeSchoolYear={activeSchoolYear}
          onClose={() => setPayFeesOpen(false)}
          onSaved={() => { setPayFeesOpen(false); }}
        />
      )}
    </div>
  );
};
