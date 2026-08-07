import React, { useState, useEffect } from 'react';
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
import { InvoiceTab } from './InvoiceTab';
import { CashTab } from './CashTab';
import { FeesTab } from './FeesTab';
import { AccountingTab } from './AccountingTab';
import { ReportsTab } from './ReportsTab';

interface FinanceManagerProps {
  activeSubTab?: string;
}

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

const PayrollTab: React.FC = () => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [selectedMonth, setSelectedMonth] = useState('07-2026');
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    LocalDatabaseService.getStaff()
      .then(res => setStaff(res || []))
      .catch(() => setStaff([]))
      .finally(() => setLoading(false));
  }, []);

  const totalMasse = staff.reduce((a, s) => a + convertCurrency(s.salaireBase || 0, (s.devise || 'USD'), currency, exchangeRate), 0);

  return (
    <div>
      <SectionHeader
        title="Paie du Personnel"
        subtitle={`Masse salariale — Mois de ${selectedMonth}`}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Masse Salariale', val: fmt(totalMasse), color: '#6366f1', icon: Wallet },
          { label: 'Personnel Actif', val: String(staff.filter(s => s.statut === 'ACTIF').length), color: '#10b981', icon: CheckCircle },
          { label: 'En Congé / Absent', val: String(staff.filter(s => s.statut === 'CONGE').length), color: '#f59e0b', icon: AlertTriangle },
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
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                <th className="p-3">Employé</th>
                <th className="p-3">Fonction</th>
                <th className="p-3 text-right">Salaire Base</th>
                <th className="p-3 text-center">Statut Paie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {staff.map((s, i) => (
                <tr key={s.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom}</td>
                  <td className="p-3 text-slate-400">{s.role}</td>
                  <td className="p-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {fmt(s.salaireBase || 0, s.devise)}
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                      PAYÉ
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── MAIN MANAGER ────────────────────────────────────────────────────────

export const FinanceManager: React.FC<FinanceManagerProps> = ({ activeSubTab = 'invoices' }) => {
  const tabs = [
    { id: 'invoices',   label: 'Factures & Recouvrement', icon: Receipt },
    { id: 'cash',       label: 'Caisse',                  icon: Wallet },
    { id: 'payroll',    label: 'Paie du Personnel',       icon: DollarSign },
    { id: 'fees',       label: 'Frais',                   icon: PieChart },
    { id: 'accounting', label: 'Comptabilite',            icon: FileText },
    { id: 'reports',    label: 'Rapports',                icon: TrendingUp },
  ];

  const [localTab, setLocalTab] = useState(activeSubTab);

  React.useEffect(() => {
    setLocalTab(activeSubTab);
  }, [activeSubTab]);

  const renderTab = () => {
    switch (localTab) {
      case 'invoices':   return <InvoiceTab />;
      case 'cash':       return <CashTab />;
      case 'payroll':    return <PayrollTab />;
      case 'fees':       return <FeesTab />;
      case 'accounting': return <AccountingTab />;
      case 'reports':    return <ReportsTab />;
      default:           return <InvoiceTab />;
    }
  };

  return (
    <div className="p-6">
      {/* Sub Navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = localTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setLocalTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12.5px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: isActive ? '#6366f1' : 'transparent',
                color: isActive ? 'white' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in" key={localTab}>
        {renderTab()}
      </div>
    </div>
  );
};
