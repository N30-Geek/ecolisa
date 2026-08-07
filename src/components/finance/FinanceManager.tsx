import React, { useState } from 'react';
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
import { mockStaff } from '../../data/mockData';
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

  const totalMasse = mockStaff.reduce((a, s) => a + convertCurrency(s.salaireBase || 0, (s.devise || 'USD'), currency, exchangeRate), 0);

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
          { label: 'Personnel Actif', val: String(mockStaff.filter(s => s.statut === 'ACTIF').length), color: '#10b981', icon: CheckCircle },
          { label: 'En Congé / Absent', val: '2', color: '#f59e0b', icon: AlertTriangle },
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
              <p className="text-[18px] font-black text-slate-900">{s.val}</p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table de paie */}
      <div className="section-card">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-slate-900">Tableau de Paie — {selectedMonth}</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Fonction</th>
              <th>Salaire Base</th>
              <th>Heures Supp.</th>
              <th>Prime</th>
              <th>Retenues</th>
              <th>Net à Payer</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockStaff.map((s, i) => {
              const src = (s.devise || 'USD');
              const base = convertCurrency(s.salaireBase || 0, src, currency, exchangeRate);
              const heureSupp = convertCurrency([0, 150, 0, 200][i % 4], src, currency, exchangeRate);
              const prime = convertCurrency([100, 0, 80, 0][i % 4], src, currency, exchangeRate);
              const retenue = Math.round(base * 0.15);
              const net = base + heureSupp + prime - retenue;
              const isPaid = i % 3 !== 2;

              return (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.avatarUrl && (
                        <img src={s.avatarUrl} alt={s.prenom} className="avatar w-7 h-7" />
                      )}
                      <div>
                        <p className="font-bold text-[12px] text-slate-900">{s.prenom} {s.nom}</p>
                        <p className="text-[10px] text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-brand" style={{ fontSize: '10px' }}>{s.role}</span>
                  </td>
                  <td className="font-bold text-slate-900">{fmt(base)}</td>
                  <td className="text-emerald-600 font-semibold">{heureSupp > 0 ? `+${fmt(heureSupp)}` : '—'}</td>
                  <td className="text-indigo-600 font-semibold">{prime > 0 ? `+${fmt(prime)}` : '—'}</td>
                  <td className="text-red-500 font-semibold">-{fmt(retenue)}</td>
                  <td className="font-black text-[14px] text-slate-900">{fmt(net)}</td>
                  <td>
                    <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
                      {isPaid ? '✓ Payé' : '⏳ En attente'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {!isPaid && (
                        <button
                          className="px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}
                        >
                          Payer
                        </button>
                      )}
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-50 transition-colors"
                        title="Fiche de paie"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
