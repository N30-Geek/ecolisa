import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Plus,
  Wallet,
  PieChart,
  CreditCard,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Loader2,
  Sparkles,
  AlertTriangle,
  Target,
  Receipt,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

// ─── Dynamic Code-Splitting / Lazy-Loaded Tabs ──────────────────────────────
const InvoiceTab = lazy(() => import('./InvoiceTab').then(m => ({ default: m.InvoiceTab })));
const CashTab = lazy(() => import('./CashTab').then(m => ({ default: m.CashTab })));
const FeesTab = lazy(() => import('./FeesTab').then(m => ({ default: m.FeesTab })));
const AccountingTab = lazy(() => import('./AccountingTab').then(m => ({ default: m.AccountingTab })));
const ReportsTab = lazy(() => import('./ReportsTab').then(m => ({ default: m.ReportsTab })));
const FinancialChartsTab = lazy(() => import('./FinancialChartsTab').then(m => ({ default: m.FinancialChartsTab })));
const PayrollTab = lazy(() => import('./PayrollTab').then(m => ({ default: m.PayrollTab })));
const UnpaidStudentsTab = lazy(() => import('./UnpaidStudentsTab').then(m => ({ default: m.UnpaidStudentsTab })));
const BudgetTab = lazy(() => import('./BudgetTab').then(m => ({ default: m.BudgetTab })));
const StaffExpenseNotesTab = lazy(() => import('./StaffExpenseNotesTab').then(m => ({ default: m.StaffExpenseNotesTab })));
const PayFeesModal = lazy(() => import('./PayFeesModal').then(m => ({ default: m.PayFeesModal })));

// ─── Pre-fetch Helpers for Instant 0ms Tab Switching ────────────────────────
const prefetchTab = (tabId: string) => {
  switch (tabId) {
    case 'invoices':   import('./InvoiceTab'); break;
    case 'cash':       import('./CashTab'); break;
    case 'payroll':    import('./PayrollTab'); break;
    case 'fees':       import('./FeesTab'); break;
    case 'accounting': import('./AccountingTab'); break;
    case 'reports':    import('./ReportsTab'); break;
    case 'arrears':    import('./UnpaidStudentsTab'); break;
    case 'analytics':  import('./FinancialChartsTab'); break;
    case 'budget':     import('./BudgetTab'); break;
    case 'expense-notes': import('./StaffExpenseNotesTab'); break;
    default: break;
  }
};

// ─── Material Design 3 Skeleton Loader ─────────────────────────────────────
const FinanceTabSkeleton: React.FC<{ title?: string }> = ({ title }) => (
  <div className="space-y-4 animate-pulse w-full">
    {/* KPI Skeleton Row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="p-4.5 rounded-2xl border flex flex-col justify-between h-28"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1.5 w-2/3">
              <div className="h-2.5 bg-slate-500/15 rounded-md w-3/4" />
              <div className="h-2 bg-slate-500/10 rounded-md w-1/2" />
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-500/15" />
          </div>
          <div className="h-6 bg-slate-500/20 rounded-md w-1/3 mt-2" />
        </div>
      ))}
    </div>

    {/* Filter Bar Skeleton */}
    <div
      className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 h-14"
      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
    >
      <div className="h-8 bg-slate-500/15 rounded-xl w-64" />
      <div className="flex gap-2">
        <div className="h-8 bg-slate-500/15 rounded-xl w-24" />
        <div className="h-8 bg-slate-500/15 rounded-xl w-24" />
      </div>
    </div>

    {/* Table Skeleton */}
    <div
      className="p-5 rounded-2xl border space-y-3"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="h-4 bg-slate-500/20 rounded-md w-48" />
        <div className="h-4 bg-slate-500/15 rounded-md w-24" />
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 w-1/3">
            <div className="w-8 h-8 rounded-lg bg-slate-500/15 shrink-0" />
            <div className="space-y-1 w-full">
              <div className="h-3 bg-slate-500/20 rounded w-3/4" />
              <div className="h-2 bg-slate-500/10 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-slate-500/15 rounded w-20" />
          <div className="h-5 bg-slate-500/15 rounded-md w-16" />
          <div className="h-3 bg-slate-500/20 rounded w-24" />
        </div>
      ))}
    </div>
  </div>
);

interface FinanceManagerProps {
  activeSubTab?: string;
  activeSchoolYear?: string;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({ activeSubTab = 'invoices', activeSchoolYear }) => {
  const [localTab, setLocalTab] = useState(activeSubTab);
  const [quickAction, setQuickAction] = useState<'invoice' | 'expense' | 'fee' | 'payment' | null>(null);
  const [payFeesOpen, setPayFeesOpen] = useState(false);

  useEffect(() => {
    setLocalTab(activeSubTab);
  }, [activeSubTab]);

  const actionConsumed = () => setQuickAction(null);

  const quickActions = [
    { id: 'invoice' as const, label: 'Nouvelle Facture', icon: Plus, color: 'indigo', tab: 'invoices' },
    { id: 'expense' as const, label: 'Nouvelle Dépense', icon: Wallet, color: 'amber', tab: 'cash' },
    { id: 'fee' as const, label: 'Nouveau Frais', icon: PieChart, color: 'emerald', tab: 'fees' },
    { id: 'payment' as const, label: 'Encaissement Frais', icon: CreditCard, color: 'slate', tab: null },
  ];

  const openQuick = (action: typeof quickActions[number]) => {
    if (action.id === 'payment') {
      setPayFeesOpen(true);
      return;
    }
    if (action.tab) {
      setLocalTab(action.tab);
    }
    setQuickAction(action.id);
  };

  const subTabs = [
    { id: 'invoices', label: 'Factures & Recouvrement', icon: CreditCard },
    { id: 'cash', label: 'Caisse & Dépenses', icon: Wallet },
    { id: 'payroll', label: 'Paie & Primes', icon: Plus },
    { id: 'fees', label: 'Frais Scolaires', icon: PieChart },
    { id: 'arrears', label: 'Créances', icon: AlertTriangle },
    { id: 'accounting', label: 'Comptabilité OHADA', icon: Building2 },
    { id: 'budget', label: 'Budgets', icon: Target },
    { id: 'expense-notes', label: 'Notes de frais', icon: Receipt },
    { id: 'reports', label: 'Rapports Financiers', icon: FileSpreadsheet },
    { id: 'analytics', label: 'Analytique Financière', icon: BarChart3 },
  ];

  const renderActiveTab = () => {
    switch (localTab) {
      case 'invoices':
        return (
          <InvoiceTab
            activeSchoolYear={activeSchoolYear}
            autoOpenCreate={quickAction === 'invoice'}
            autoOpenPayment={false}
            onActionConsumed={actionConsumed}
          />
        );
      case 'cash':
        return (
          <CashTab
            activeSchoolYear={activeSchoolYear}
            autoOpenForm={quickAction === 'expense'}
            onActionConsumed={actionConsumed}
          />
        );
      case 'payroll':
        return <PayrollTab activeSchoolYear={activeSchoolYear} />;
      case 'fees':
        return (
          <FeesTab
            activeSchoolYear={activeSchoolYear}
            autoOpenFee={quickAction === 'fee'}
            onActionConsumed={actionConsumed}
          />
        );
      case 'arrears':
        return <UnpaidStudentsTab activeSchoolYear={activeSchoolYear} />;
      case 'accounting':
        return <AccountingTab activeSchoolYear={activeSchoolYear} />;
      case 'budget':
        return <BudgetTab activeSchoolYear={activeSchoolYear} />;
      case 'expense-notes':
        return <StaffExpenseNotesTab activeSchoolYear={activeSchoolYear} />;
      case 'reports':
        return <ReportsTab activeSchoolYear={activeSchoolYear} />;
      case 'analytics':
        return <FinancialChartsTab activeSchoolYear={activeSchoolYear} />;
      default:
        return (
          <InvoiceTab
            activeSchoolYear={activeSchoolYear}
            autoOpenCreate={quickAction === 'invoice'}
            autoOpenPayment={false}
            onActionConsumed={actionConsumed}
          />
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in w-full">
      {/* ═══ HEADER & ACTIONS RAPIDES ═══ */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Finance & Trésorerie
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              Module Optimisé
            </span>
          </div>
          <p className="text-xs font-semibold mt-0.5 text-slate-500 dark:text-slate-400">
            Facturation des élèves, gestion de caisse, paie, frais scolaires et journal comptable
          </p>
        </div>

        {/* Actions Rapides */}
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map(a => {
            const Icon = a.icon;
            const colorMap: Record<string, { ring: string; icon: string; bg: string }> = {
              indigo: { ring: 'border-indigo-500/25 hover:border-indigo-500/50', icon: 'bg-indigo-600 text-white', bg: 'hover:bg-indigo-500/8' },
              emerald: { ring: 'border-emerald-500/25 hover:border-emerald-500/50', icon: 'bg-emerald-600 text-white', bg: 'hover:bg-emerald-500/8' },
              amber: { ring: 'border-amber-500/25 hover:border-amber-500/50', icon: 'bg-amber-600 text-white', bg: 'hover:bg-amber-500/8' },
              slate: { ring: 'border-slate-500/25 hover:border-slate-500/50', icon: 'bg-slate-700 dark:bg-slate-600 text-white', bg: 'hover:bg-slate-500/8' },
            };
            const c = colorMap[a.color];
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => openQuick(a)}
                onMouseEnter={() => a.tab && prefetchTab(a.tab)}
                className={`group flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-xs ${c.ring} ${c.bg}`}
                style={{ background: 'var(--bg-surface)' }}
              >
                <div className={`p-1.5 rounded-lg transition-transform duration-200 group-hover:scale-110 shadow-xs ${c.icon}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ BARRE D'ONGLETS FINANCIÈRE (Material Design 3 Segmented Control) ═══ */}
      <div
        className="flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto sidebar-scroll border transition-all"
        style={{
          background: 'var(--bg-sunken)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        {subTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = localTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setLocalTab(tab.id)}
              onMouseEnter={() => prefetchTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent'
              }`}
            >
              <TabIcon className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-white scale-110' : 'text-indigo-500 dark:text-indigo-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ CONTENU DE L'ONGLET AVEC SUSPENSE & SKELETON ULTRA-RAPIDE ═══ */}
      <div className="w-full">
        <Suspense fallback={<FinanceTabSkeleton title={localTab} />}>
          {renderActiveTab()}
        </Suspense>
      </div>

      {/* ═══ MODALE PAIEMENT RAPIDE LAZY-LOADED ═══ */}
      {payFeesOpen && (
        <Suspense fallback={null}>
          <PayFeesModal
            activeSchoolYear={activeSchoolYear}
            onClose={() => setPayFeesOpen(false)}
            onSaved={() => { setPayFeesOpen(false); }}
          />
        </Suspense>
      )}
    </div>
  );
};
