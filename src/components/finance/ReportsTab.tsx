import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileText, Download } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import type { FactureEleve, OperationCaisse, EcritureComptable, CompteComptable, AnneeScolaireConfig } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export const ReportsTab: React.FC = () => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [cashOps, setCashOps] = useState<OperationCaisse[]>([]);
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([]);
  const [comptes, setComptes] = useState<CompteComptable[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [yearFilter, setYearFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [i, c, e, cm, y] = await Promise.all([
      LocalDatabaseService.getInvoices(yearFilter || undefined),
      LocalDatabaseService.getCashOperations({ yearId: yearFilter || undefined }),
      LocalDatabaseService.getEcritures(),
      LocalDatabaseService.getComptes(),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setInvoices(i);
    setCashOps(c);
    setEcritures(e);
    setComptes(cm);
    setYears(y);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter]);

  const filteredCash = cashOps;
  const filteredInvoices = invoices;

  const totalBilled = useMemo(() => filteredInvoices.reduce((a, i) => a + convertCurrency(i.montantTotal, i.devise, currency, exchangeRate), 0), [filteredInvoices, currency, exchangeRate]);
  const totalPaid = useMemo(() => filteredInvoices.reduce((a, i) => a + convertCurrency(i.montantPaye, i.devise, currency, exchangeRate), 0), [filteredInvoices, currency, exchangeRate]);
  const totalUnpaid = totalBilled - totalPaid;
  const totalEntrees = useMemo(() => filteredCash.filter(o => o.type === 'ENTREE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [filteredCash, currency, exchangeRate]);
  const totalSorties = useMemo(() => filteredCash.filter(o => o.type === 'SORTIE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0), [filteredCash, currency, exchangeRate]);

  const revenueByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of filteredInvoices) {
      for (const l of i.lignes || []) {
        const key = l.categorie || 'AUTRE';
        const paidShare = i.montantTotal > 0 ? (l.montant * i.montantPaye) / i.montantTotal : 0;
        map.set(key, (map.get(key) || 0) + convertCurrency(paidShare, i.devise, currency, exchangeRate));
      }
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredInvoices, currency, exchangeRate]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredCash.filter(o => o.type === 'SORTIE')) {
      map.set(o.categorie, (map.get(o.categorie) || 0) + convertCurrency(o.montant, o.devise, currency, exchangeRate));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredCash, currency, exchangeRate]);

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
    let csv = 'Rapport financier\n';
    csv += `Total facture,${totalBilled}\n`;
    csv += `Total paye,${totalPaid}\n`;
    csv += `Reste a recouvrer,${totalUnpaid}\n`;
    csv += `Total entrees,${totalEntrees}\n`;
    csv += `Total sorties,${totalSorties}\n`;
    csv += `Solde tresorerie,${totalEntrees - totalSorties}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-financier-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Rapports financiers</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Indicateurs, graphiques et analyses comptables</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="input text-sm w-40">
            <option value="">Toutes annees</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.nom}</option>)}
          </select>
          <button onClick={exportReport} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Factures emises', val: fmt(totalBilled), color: '#3b82f6', icon: FileText },
          { label: 'Encaissements', val: fmt(totalPaid), color: '#10b981', icon: TrendingUp },
          { label: 'Depenses', val: fmt(totalSorties), color: '#ef4444', icon: TrendingDown },
          { label: 'Solde caisse', val: fmt(totalEntrees - totalSorties), color: '#6366f1', icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}12` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
            </div>
            <p className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Flux de tresorerie par mois</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowByMonth}>
                <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                <Bar dataKey="entrees" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sorties" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Recettes par categorie</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name} fontSize={9}>
                  {revenueByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Depenses par categorie</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                  {expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="section-card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Solde des comptes</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceByCompte}>
                <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={50} />
                <YAxis fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="solde" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {balanceByCompte.map((x, i) => <Cell key={i} fill={x.solde >= 0 ? '#10b981' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="section-card p-5">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Evolution du solde cumule</h3>
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
              <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
              <Area type="monotone" dataKey="entrees" stroke="#10b981" strokeWidth={2} fill="rgba(16,185,129,0.1)" />
              <Area type="monotone" dataKey="sorties" stroke="#ef4444" strokeWidth={2} fill="rgba(239,68,68,0.1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
