import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, PieChart as PieIcon, BarChart2, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, DollarSign,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrencyFromList, convertCurrencyFromList } from '../../utils/currency';
import { getInvoiceTotal, getInvoicePaid, getPaymentAmount } from '../../utils/financeCalculations';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import type { FactureEleve, TransactionPaiement, TypeFraisScolaire, AnneeScolaireConfig, ClasseScolaire } from '../../types';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#a78bfa'];
const CYCLES_ORDER = ['MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'];

// ─── Tooltip personnalisé ─────────────────────────────────────────────────────
const ChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const { format } = useSchoolConfig();
  return (
    <div className="rounded-xl border p-3 shadow-lg text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <p className="font-black mb-2" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: 'var(--text-secondary)' }}>{p.name} :</span>
          <span className="font-black" style={{ color: p.color }}>{format(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

interface KPI { label: string; value: number; sub?: string; trend?: number; color: string }

interface Props {
  activeSchoolYear?: string;
}

export const FinancialChartsTab: React.FC<Props> = ({ activeSchoolYear }) => {
  const { displayCurrency, currencies, referenceCurrency } = useSchoolConfig();
  const fmt = (n: number, src?: string) => formatCurrencyFromList(n, displayCurrency, src || referenceCurrency, currencies);
  const conv = (n: number, src?: string) => convertCurrencyFromList(n, src || referenceCurrency, displayCurrency, currencies);

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [inv, pmt, ft, cls, y] = await Promise.all([
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setInvoices(inv);
    setPayments(pmt);
    setFeeTypes(ft);
    setClasses(cls);
    setYears(y);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load, activeSchoolYear]);

  const refresh = () => { setRefreshing(true); load(); };

  const activeYear = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear) || years.find(y => y.statut === 'EN_COURS') || years[0], [years, activeSchoolYear]);
  const activeYearId = activeYear?.id;

  // ─── Filtrage par année ───────────────────────────────────────────────────
  const filteredInvoices = useMemo(() =>
    activeYearId ? invoices.filter(i => i.anneeScolaireId === activeYearId || i.anneeScolaire === activeYearId) : invoices,
  [invoices, activeYearId]);

  const filteredPayments = useMemo(() =>
    activeYearId ? payments.filter(p => p.anneeScolaireId === activeYearId) : payments,
  [payments, activeYearId]);

  // ─── KPIs globaux ────────────────────────────────────────────────────────
  const kpis = useMemo((): KPI[] => {
    const attendu = filteredInvoices.reduce((s, i) => s + getInvoiceTotal(i, displayCurrency), 0);
    const paye = filteredPayments.reduce((s, p) => s + getPaymentAmount(p, displayCurrency), 0);
    const reste = Math.max(0, attendu - paye);
    const taux = attendu > 0 ? Math.round((paye / attendu) * 100) : 0;
    return [
      { label: 'Total Attendu', value: attendu, color: '#6366f1', trend: 0 },
      { label: 'Recouvré', value: paye, color: '#10b981', trend: taux, sub: `Taux : ${taux}%` },
      { label: 'Reste à Payer', value: reste, color: '#f59e0b', sub: filteredInvoices.filter(i => i.statut !== 'PAYE').length + ' factures ouvertes' },
      { label: 'Paiements Enreg.', value: filteredPayments.length, color: '#ec4899', sub: 'transactions', trend: undefined },
    ];
  }, [filteredInvoices, filteredPayments, displayCurrency, currencies]);

  // ─── Répartition par type de frais (Pie) ─────────────────────────────────
  const pieData = useMemo(() => {
    const map = new Map<string, { name: string; value: number }>();
    filteredPayments.forEach(p => {
      const allocations = p.allocations || [];
      if (allocations.length > 0) {
        allocations.forEach(a => {
          const ft = feeTypes.find(f => f.id === a.feeTypeId);
          const key = ft?.categorie || 'AUTRE';
          const label = key.replace(/FRAIS_/, '').replace(/_/g, ' ');
          const existing = map.get(key);
          const amount = conv(a.montant, p.devise);
          if (existing) existing.value += amount;
          else map.set(key, { name: label, value: amount });
        });
      } else {
        const key = 'AUTRE';
        const existing = map.get(key);
        const amount = getPaymentAmount(p, displayCurrency);
        if (existing) existing.value += amount;
        else map.set(key, { name: 'Autres', value: amount });
      }
    });
    return Array.from(map.values()).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [filteredPayments, feeTypes, displayCurrency, currencies]);

  // ─── Recouvrement par classe (Bar horizontal) ─────────────────────────────
  const classBarData = useMemo(() => {
    const classMap = new Map<string, { nom: string; attendu: number; paye: number }>();
    classes.forEach(c => {
      if (activeYearId && c.schoolYearId !== activeYearId) return;
      classMap.set(c.id, { nom: c.nom, attendu: 0, paye: 0 });
    });
    filteredInvoices.forEach(inv => {
      const cd = classMap.get(inv.classeId || '');
      if (cd) cd.attendu += getInvoiceTotal(inv, displayCurrency);
    });
    filteredPayments.forEach(p => {
      const inv = filteredInvoices.find(i => i.id === p.invoiceId || i.id === (p as any).factureId);
      const cd = classMap.get(inv?.classeId || '');
      if (cd) cd.paye += getPaymentAmount(p, displayCurrency);
    });
    return Array.from(classMap.values())
      .filter(d => d.attendu > 0)
      .sort((a, b) => b.attendu - a.attendu)
      .slice(0, 12);
  }, [classes, filteredInvoices, filteredPayments, activeYearId, displayCurrency, currencies]);

  // ─── Évolution mensuelle (Area) ───────────────────────────────────────────
  const areaData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const arr = months.map((m, i) => ({ month: m, attendu: 0, paye: 0, _idx: i }));
    filteredInvoices.forEach(inv => {
      const d = inv.dateEcheance ? new Date(inv.dateEcheance).getMonth() : null;
      if (d !== null && d >= 0 && d <= 11) arr[d].attendu += getInvoiceTotal(inv, displayCurrency);
    });
    filteredPayments.forEach(p => {
      const d = p.dateCreation ? new Date(p.dateCreation).getMonth() : null;
      if (d !== null && d >= 0 && d <= 11) arr[d].paye += getPaymentAmount(p, displayCurrency);
    });
    return arr.filter(m => m.attendu > 0 || m.paye > 0);
  }, [filteredInvoices, filteredPayments, displayCurrency, currencies]);

  // ─── Recouvrement par cycle (Bar) ─────────────────────────────────────────
  const cycleBarData = useMemo(() => {
    const cycleMap: Record<string, { attendu: number; paye: number }> = {};
    CYCLES_ORDER.forEach(c => { cycleMap[c] = { attendu: 0, paye: 0 }; });

    filteredInvoices.forEach(inv => {
      const cls = classes.find(c => c.id === inv.classeId);
      const cycleCode = ((cls as any)?.cycleCode || cls?.cycleId || 'AUTRE').toUpperCase();
      const found = CYCLES_ORDER.find(c => c === cycleCode || cycleCode.includes(c));
      if (found) cycleMap[found].attendu += getInvoiceTotal(inv, displayCurrency);
    });
    filteredPayments.forEach(p => {
      const inv = filteredInvoices.find(i => i.id === p.invoiceId || i.id === (p as any).factureId);
      const cls = classes.find(c => c.id === inv?.classeId);
      const cycleCode = ((cls as any)?.cycleCode || cls?.cycleId || 'AUTRE').toUpperCase();
      const found = CYCLES_ORDER.find(c => c === cycleCode || cycleCode.includes(c));
      if (found) cycleMap[found].paye += getPaymentAmount(p, displayCurrency);
    });
    const CYCLE_LABELS: Record<string, string> = { MATERNELLE: 'Maternel', PRIMAIRE: 'Primaire', SECONDAIRE_CTEB: 'CTEB', HUMANITES: 'Human.' };
    return CYCLES_ORDER.map(c => ({ cycle: CYCLE_LABELS[c] || c, ...cycleMap[c] })).filter(d => d.attendu > 0);
  }, [filteredInvoices, filteredPayments, classes, displayCurrency, currencies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Chargement des données financières…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500"><Activity className="w-5 h-5" /></div>
          <div>
            <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Tableau de Bord Financier</h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Graphiques de répartition en temps réel</p>
          </div>
        </div>
        <button onClick={refresh} disabled={refreshing} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-slate-500/10 transition-all disabled:opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {kpis.map((kpi, i) => (
          <div key={i} className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl" style={{ background: kpi.color + '18' }}>
                <DollarSign className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              {kpi.trend !== undefined && kpi.trend > 0 && (
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-black">
                  <ArrowUpRight className="w-3 h-3" />
                  {typeof kpi.trend === 'number' && kpi.trend <= 100 ? `${kpi.trend}%` : kpi.trend}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
              <p className="text-base font-black tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {typeof kpi.value === 'number' && kpi.value < 10000 && kpi.label.includes('Paiements')
                  ? kpi.value.toLocaleString('fr-FR')
                  : fmt(kpi.value)}
              </p>
              {kpi.sub && <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Graphiques rangée 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Évolution mensuelle */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Évolution Mensuelle</h3>
          </div>
          {areaData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Pas de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAttendu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradPaye" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Area type="monotone" dataKey="attendu" name="Attendu" stroke="#6366f1" strokeWidth={2} fill="url(#gradAttendu)" />
                <Area type="monotone" dataKey="paye" name="Recouvré" stroke="#10b981" strokeWidth={2} fill="url(#gradPaye)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répartition par type de frais */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <PieIcon className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Répartition par Type de Frais</h3>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Pas de données</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                      <p className="text-[10px] font-black" style={{ color: COLORS[i % COLORS.length] }}>{fmt(item.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Graphiques rangée 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recouvrement par classe */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Recouvrement par Classe</h3>
          </div>
          {classBarData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Pas de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, classBarData.length * 28)}>
              <BarChart data={classBarData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="nom" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="attendu" name="Attendu" fill="#6366f1" fillOpacity={0.25} radius={[0, 4, 4, 0]} />
                <Bar dataKey="paye" name="Recouvré" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recouvrement par cycle */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Comparaison par Cycle</h3>
          </div>
          {cycleBarData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Pas de données</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cycleBarData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis dataKey="cycle" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                <Bar dataKey="attendu" name="Attendu" fill="#6366f1" fillOpacity={0.35} radius={[4, 4, 0, 0]} />
                <Bar dataKey="paye" name="Recouvré" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
