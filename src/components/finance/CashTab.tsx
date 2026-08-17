import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Plus,
  X,
  Trash2,
  Loader2,
  Download,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Eye,
  Printer,
  FileText,
  FileDown,
  ArrowUpDown,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { CustomSelect } from '../common/CustomSelect';
import { DatePicker } from '../common/DatePicker';
import { NumberInput } from '../common/NumberInput';
import { ActionMenu } from '../common/ActionMenu';
import { PaginationBar } from '../common/PaginationBar';
import { SortableTh } from '../common/SortableTh';
import { showToast } from '../common/ToastNotification';
import { Barcode128 } from './ReceiptModal';
import type { OperationCaisse, AnneeScolaireConfig } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const DEFAULT_EXPENSE_CATEGORIES = [
  'SALAIRES', 'FOURNITURES', 'CHARGES_LOCATIVES', 'EAU_ELECTRICITE', 'CARBURANT', 'MAINTENANCE',
  'RESTAURATION', 'TRANSPORT_BUS', 'ACTIVITES_SCOLAIRES', 'FRAIS_BANCAIRES', 'COMMUNICATION',
  'MARKETING', 'ASSURANCES', 'TAXES_IMPOTS', 'FRAIS_SCOLAIRES_REMBOURSES', 'MATERIEL_INFORMATIQUE', 'AUTRE',
];

interface CashTabProps {
  activeSchoolYear?: string;
  autoOpenForm?: boolean;
  onActionConsumed?: () => void;
}

export const CashTab: React.FC<CashTabProps> = ({ activeSchoolYear, autoOpenForm, onActionConsumed }) => {
  const { config, currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const CashTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass-card p-3 rounded-xl text-xs shadow-xl font-sans" style={{ minWidth: 160, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <p className="font-extrabold mb-1 text-slate-500 uppercase text-[10px] tracking-wider">{label}</p>
        <p className="font-mono font-black text-sm" style={{ color: payload[0].value >= 0 ? '#10b981' : '#ef4444' }}>{fmt(payload[0].value)}</p>
      </div>
    );
  };

  const [ops, setOps] = useState<OperationCaisse[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>('');

  const activeYearId = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear)?.id, [years, activeSchoolYear]);

  useEffect(() => {
    setYearFilter(activeYearId || '');
  }, [activeYearId]);

  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
      onActionConsumed?.();
    }
  }, [autoOpenForm, onActionConsumed]);

  // State des filtres & tri
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ENTREE' | 'SORTIE' | 'TRANSFERT' | ''>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Modales & Détails
  const [showForm, setShowForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [detailOp, setDetailOp] = useState<OperationCaisse | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const load = async () => {
    setLoading(true);
    const [o, y] = await Promise.all([
      LocalDatabaseService.getCashOperations({ yearId: yearFilter || undefined }),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setOps(o);
    setYears(y);
    setLoading(false);
  };

  useEffect(() => { load(); }, [yearFilter]);

  // Counts pour les onglets rapides
  const counts = useMemo(() => {
    return {
      all: ops.length,
      entrees: ops.filter(o => o.type === 'ENTREE').length,
      sorties: ops.filter(o => o.type === 'SORTIE').length,
      transferts: ops.filter(o => o.type === 'TRANSFERT').length,
    };
  }, [ops]);

  // Filtrage des opérations
  const filteredOps = useMemo(() => {
    return ops.filter(o => {
      if (typeFilter && o.type !== typeFilter) return false;
      if (categoryFilter && o.categorie !== categoryFilter) return false;
      if (modeFilter && o.modePaiement !== modeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [o.libelle, o.caissier, o.beneficiaire, o.reference, o.categorie, o.modePaiement, o.pieceJustificative].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const day = o.date?.split('T')[0];
      if (dateFrom && day && day < dateFrom) return false;
      if (dateTo && day && day > dateTo) return false;
      return true;
    });
  }, [ops, typeFilter, categoryFilter, modeFilter, search, dateFrom, dateTo]);

  // Tri des opérations filtrées
  const sortedOps = useMemo(() => {
    return [...filteredOps].sort((a, b) => {
      let res = 0;
      switch (sortField) {
        case 'libelle':
          res = (a.libelle || '').localeCompare(b.libelle || '');
          break;
        case 'beneficiaire': {
          const nameA = a.beneficiaire || a.caissier || '';
          const nameB = b.beneficiaire || b.caissier || '';
          res = nameA.localeCompare(nameB);
          break;
        }
        case 'modePaiement':
          res = (a.modePaiement || '').localeCompare(b.modePaiement || '');
          break;
        case 'montant':
          res = a.montant - b.montant;
          break;
        case 'date':
        default:
          res = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
      }
      return sortOrder === 'asc' ? res : -res;
    });
  }, [filteredOps, sortField, sortOrder]);

  // Pagination des résultats
  const paginatedOps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOps.slice(start, start + pageSize);
  }, [sortedOps, currentPage, pageSize]);

  // Totaux filtrés
  const { totalEntrees, totalSorties, solde } = useMemo(() => {
    const entrees = filteredOps.filter(o => o.type === 'ENTREE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0);
    const sorties = filteredOps.filter(o => o.type === 'SORTIE').reduce((a, o) => a + convertCurrency(o.montant, o.devise, currency, exchangeRate), 0);
    return { totalEntrees: entrees, totalSorties: sorties, solde: entrees - sorties };
  }, [filteredOps, currency, exchangeRate]);

  // Graphique d'évolution
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of [...filteredOps].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const day = o.date?.split('T')[0];
      if (!day) continue;
      const sign = o.type === 'ENTREE' ? 1 : o.type === 'SORTIE' ? -1 : 0;
      const val = convertCurrency(o.montant, o.devise, currency, exchangeRate) * sign;
      map.set(day, (map.get(day) || 0) + val);
    }
    let cumul = 0;
    return Array.from(map.entries()).map(([day, v]) => {
      cumul += v;
      return { day, solde: cumul };
    });
  }, [filteredOps, currency, exchangeRate]);

  const uniqueCategories = useMemo(() => Array.from(new Set(ops.map(o => o.categorie))).sort(), [ops]);
  const uniqueModes = useMemo(() => Array.from(new Set(ops.map(o => o.modePaiement))).sort(), [ops]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette opération de caisse ?')) return;
    await LocalDatabaseService.deleteCashOperation(id);
    showToast('Opération supprimée !', 'L\'opération de caisse a été retirée du journal.', 'info');
    load();
  };

  const exportCSV = () => {
    const header = 'Date,Type,Categorie,Libelle,Montant,Devise,Mode,Reference,Beneficiaire,Piece,Caissier\n';
    const rows = filteredOps.map(o => `"${o.date?.split('T')[0]}",${o.type},"${o.categorie || ''}","${o.libelle || ''}",${o.montant},${o.devise},"${o.modePaiement || ''}","${o.reference || ''}","${o.beneficiaire || ''}","${o.pieceJustificative || ''}","${o.caissier || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-caisse-filtre-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Fichier CSV exporté !', `${filteredOps.length} opérations exportées.`, 'success');
  };

  return (
    <div className="space-y-6 font-sans animate-fade-in">
      {/* HEADER SECTION DE HAUT DE PAGE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl border shadow-sm relative overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500" /> TRÉSORERIE & COMPTABILITÉ
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Journal Centralisé</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Journal de Caisse & Dépenses</h1>
          <p className="text-xs max-w-2xl font-medium" style={{ color: 'var(--text-muted)' }}>
            Consultez les recettes, les sorties de caisse et effectuez le suivi financier en temps réel avec filtres avancés et pièces justificatives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap z-10">
          <CustomSelect
            options={[{ value: '', label: 'Toutes les années' }, ...years.map(y => ({ value: y.id, label: y.nom }))]}
            value={yearFilter}
            onChange={setYearFilter}
            className="w-44"
          />
          <button onClick={() => setShowExportModal(true)} className="btn-secondary flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer">
            <FileDown className="w-4 h-4 text-indigo-500" /> Rapport PDF
          </button>
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer">
            <Download className="w-4 h-4 text-emerald-500" /> Exporter CSV
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl shadow-lg cursor-pointer">
            <Plus className="w-4.5 h-4.5" /> Saisir une Dépense
          </button>
        </div>
      </div>

      {/* KPI HERO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Entrées (Recettes)', val: fmt(totalEntrees), color: '#10b981', bgGlow: 'from-emerald-500/10 to-transparent', icon: TrendingUp, count: `${counts.entrees} entrées` },
          { label: 'Sorties (Dépenses)', val: fmt(totalSorties), color: '#ef4444', bgGlow: 'from-rose-500/10 to-transparent', icon: TrendingDown, count: `${counts.sorties} sorties` },
          { label: 'Solde Net Trésorerie', val: fmt(solde), color: solde >= 0 ? '#6366f1' : '#ef4444', bgGlow: solde >= 0 ? 'from-indigo-500/10 to-transparent' : 'from-rose-500/10 to-transparent', icon: DollarSign, count: 'Bilan filtré' },
          { label: 'Total Opérations', val: String(filteredOps.length), color: '#8b5cf6', bgGlow: 'from-purple-500/10 to-transparent', icon: Layers, count: 'Transactions trouvées' },
        ].map(s => (
          <div key={s.label} className={`p-5 rounded-2xl border shadow-xs relative overflow-hidden bg-gradient-to-br ${s.bgGlow}`} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs" style={{ background: `${s.color}15` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
            </div>
            <p className="text-2xl font-black tracking-tight" style={{ color: s.color }}>{s.val}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10" style={{ color: 'var(--text-muted)' }}>{s.count}</span>
            </div>
          </div>
        ))}
      </div>

      {/* BARRE DE RECHERCHE, TABS ET FILTRES MULTICRITÈRES */}
      <div className="p-5 rounded-3xl border shadow-xs space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        {/* Onglets Filtre Rapide Type */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            {[
              { id: '', label: 'Toutes les opérations', count: counts.all },
              { id: 'ENTREE', label: '🟢 Recettes (Entrées)', count: counts.entrees },
              { id: 'SORTIE', label: '🔴 Dépenses (Sorties)', count: counts.sorties },
              { id: 'TRANSFERT', label: '🔵 Transferts', count: counts.transferts },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setTypeFilter(tab.id as any); setCurrentPage(1); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  typeFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${typeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-500/15 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setCategoryFilter(''); setModeFilter(''); setDateFrom(''); setDateTo(''); setSortField('date'); setSortOrder('desc'); setCurrentPage(1); }}
            className="px-3 py-1.5 rounded-xl border text-xs font-black hover:bg-slate-500/10 flex items-center gap-1.5 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-500" /> Réinitialiser
          </button>
        </div>

        {/* Grille des Filtres Avancés */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Rechercher libellé, caissier, réf..."
              className="input w-full pl-10 pr-3 py-2.5 text-xs font-bold"
            />
          </div>

          <CustomSelect
            options={[{ value: '', label: 'Toutes catégories' }, ...uniqueCategories.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))]}
            value={categoryFilter}
            onChange={val => { setCategoryFilter(val); setCurrentPage(1); }}
            searchable
          />

          <CustomSelect
            options={[{ value: '', label: 'Tous modes de paiement' }, ...uniqueModes.map(m => ({ value: m, label: m }))]}
            value={modeFilter}
            onChange={val => { setModeFilter(val); setCurrentPage(1); }}
          />

          <CustomSelect
            options={[
              { value: 'date', label: '📅 Par date' },
              { value: 'montant', label: '💵 Par montant' },
              { value: 'libelle', label: '🏷️ Par libellé' },
              { value: 'beneficiaire', label: '👤 Par bénéficiaire' },
            ]}
            value={sortField}
            onChange={val => setSortField(val)}
          />

          <div className="flex items-center gap-1.5">
            <DatePicker value={dateFrom} onChange={val => { setDateFrom(val); setCurrentPage(1); }} className="w-full text-xs" placeholder="Du" />
            <span className="text-xs text-slate-400 font-bold">-</span>
            <DatePicker value={dateTo} onChange={val => { setDateTo(val); setCurrentPage(1); }} className="w-full text-xs" placeholder="Au" />
          </div>
        </div>
      </div>

      {/* TABLEAU PRINCIPAL ULTRA-MODERNE DES OPÉRATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border shadow-xs overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>Journal des Transactions de Caisse</h3>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>Affichage séquentiel des mouvements financiers</p>
                </div>
              </div>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                {filteredOps.length} opération{filteredOps.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* TABLEAU STRUCTURE ET HARMONISE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="border-b text-[10.5px] font-black uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--border)' }}>
                    <SortableTh label="Opération & Catégorie" field="libelle" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="Bénéficiaire / Caissier" field="beneficiaire" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="Mode & Pièce" field="modePaiement" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="Montant Net" field="montant" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} align="right" />
                    <th className="p-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {paginatedOps.map(o => {
                    const isEntree = o.type === 'ENTREE';
                    const isSortie = o.type === 'SORTIE';

                    return (
                      <tr key={o.id} className="hover:bg-slate-500/[0.03] transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs" style={{
                              background: isEntree ? 'rgba(16,185,129,0.12)' : isSortie ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                            }}>
                              {isEntree ? <ArrowDownLeft className="w-4.5 h-4.5 text-emerald-600" /> : isSortie ? <ArrowUpRight className="w-4.5 h-4.5 text-rose-600" /> : <RotateCcw className="w-4.5 h-4.5 text-indigo-600" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-xs truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }}>{o.libelle}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold text-slate-400">{o.date?.split('T')[0]}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                  {o.categorie?.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                            {isSortie && o.beneficiaire ? o.beneficiaire : o.caissier || '—'}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold">{isSortie ? 'Payé à' : 'Reçu par: ' + (o.caissier || 'Caissier')}</p>
                        </td>

                        <td className="p-4">
                          <div className="space-y-0.5">
                            <span className="inline-block px-2 py-0.5 rounded text-[9.5px] font-black border" style={{
                              background: isEntree ? 'rgba(16,185,129,0.10)' : isSortie ? 'rgba(239,68,68,0.10)' : 'rgba(99,102,241,0.10)',
                              borderColor: isEntree ? 'rgba(16,185,129,0.30)' : isSortie ? 'rgba(239,68,68,0.30)' : 'rgba(99,102,241,0.30)',
                              color: isEntree ? '#059669' : isSortie ? '#dc2626' : '#4f46e5',
                            }}>
                              {o.type === 'TRANSFERT' ? 'TRANSFERT' : o.modePaiement}
                            </span>
                            {o.pieceJustificative && (
                              <p className="text-[10px] font-bold text-indigo-500 truncate max-w-[130px]">N° {o.pieceJustificative}</p>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <p className="font-mono font-black text-sm" style={{ color: isEntree ? '#059669' : isSortie ? '#dc2626' : '#4f46e5' }}>
                            {isEntree ? '+' : isSortie ? '-' : '⇄ '}{fmt(o.montant, o.devise)}
                          </p>
                          {o.reference && <p className="text-[9.5px] font-mono font-bold text-slate-400">{o.reference}</p>}
                        </td>

                        <td className="p-4 text-center">
                          <ActionMenu
                            items={[
                              { label: 'Voir détails', icon: Eye, onClick: () => setDetailOp(o) },
                              { label: 'Imprimer reçu / pièce', icon: Printer, onClick: () => setDetailOp(o) },
                              { label: 'Supprimer', icon: Trash2, onClick: () => handleDelete(o.id), danger: true, separatorBefore: true },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredOps.length === 0 && !loading && (
                <div className="p-12 text-center text-xs font-bold text-slate-400">
                  Aucune opération de caisse trouvée pour ces filtres.
                </div>
              )}
              {loading && (
                <div className="p-12 text-center">
                  <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-500" />
                </div>
              )}
            </div>

            {/* Pagination Propre Intégrée */}
            <PaginationBar
              totalItems={filteredOps.length}
              currentPage={currentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>

        {/* Graphique de Trésorerie */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Évolution du Solde</h3>
                <p className="text-[11px] font-medium text-slate-400">Cumul quotidien de la trésorerie</p>
              </div>
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600"><TrendingUp className="w-4 h-4" /></span>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis fontSize={9} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip content={<CashTooltip />} />
                  <Area type="monotone" dataKey="solde" stroke="#6366f1" strokeWidth={3} fill="url(#gradCash)" dot={{ r: 3.5, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* MODALE NOUVELLE DÉPENSE */}
      {showForm && (
        <CashOperationModal
          years={years}
          onClose={() => setShowForm(false)}
          onSaved={load}
        />
      )}

      {/* MODALE DE DÉTAILS DE TRANSACTION */}
      {detailOp && (
        <CashOperationDetailModal
          op={detailOp}
          onClose={() => setDetailOp(null)}
        />
      )}

      {/* MODALE D'EXPORTATION RAPPORT PDF FLITRÉ */}
      {showExportModal && (
        <CashExportModal
          ops={filteredOps}
          totalEntrees={totalEntrees}
          totalSorties={totalSorties}
          solde={solde}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
};

// ── MODALE NOUVELLE DÉPENSE (SAISIE) ──────────────────────────────────────
const CashOperationModal: React.FC<{
  years: AnneeScolaireConfig[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ years, onClose, onSaved }) => {
  const { currency, format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const [libelle, setLibelle] = useState('');
  const [montant, setMontant] = useState(0);
  const [categorie, setCategorie] = useState('SALAIRES');
  const [modePaiement, setModePaiement] = useState('CASH');
  const [devise, setDevise] = useState<string>((currency as string) || 'USD');
  const [reference, setReference] = useState('');
  const [caissier, setCaissier] = useState('Caissier');
  const [beneficiaire, setBeneficiaire] = useState('');
  const [pieceJustificative, setPieceJustificative] = useState('');
  const [yearId, setYearId] = useState<string>(years.find(y => y.statut === 'EN_COURS')?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
    LocalDatabaseService.getConfig('expense_categories').then((saved: any) => {
      if (Array.isArray(saved) && saved.length > 0) {
        setCategories(Array.from(new Set([...DEFAULT_EXPENSE_CATEGORIES, ...saved])));
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!libelle || montant <= 0) return;
    setLoading(true);
    const op: OperationCaisse = {
      id: uuid(),
      date: new Date(date + 'T00:00:00.000Z').toISOString(),
      libelle,
      montant,
      devise,
      type: 'SORTIE',
      categorie,
      modePaiement,
      reference: reference || `SORTIE-${Date.now()}`,
      caissier,
      beneficiaire,
      pieceJustificative,
      schoolYearId: yearId,
      origine: 'MANUAL',
    };
    await LocalDatabaseService.addCashOperation(op);
    setLoading(false);
    showToast('Dépense enregistrée !', `${libelle} (${fmt(montant, devise)}) ajoutée en caisse.`, 'success');
    onSaved();
    onClose();
  };

  const handleCategoryChange = (val: string) => {
    setCategorie(val);
    if (!categories.includes(val) && !DEFAULT_EXPENSE_CATEGORIES.includes(val)) {
      const next = [...categories, val];
      setCategories(next);
      LocalDatabaseService.setConfig('expense_categories', next).catch(() => {});
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const categoryOptions = categories.map(c => ({ value: c, label: c.replace(/_/g, ' ') }));
  const modeOptions = [
    { value: 'CASH', label: 'Espèces (Caisse Cash)' },
    { value: 'BANQUE', label: 'Virement / Compte Bancaire' },
    { value: 'MOBILE_MONEY', label: 'Mobile Money (M-Pesa / Orange / Airtel)' },
  ];
  const yearOptions = years.map(y => ({ value: y.id, label: y.nom }));
  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'CDF', label: 'CDF (FC)' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-3xl border shadow-md p-6 max-h-[92vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-5 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Saisie d'une Nouvelle Dépense</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saisissez les détails de la sortie de caisse.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Libellé / Motif de la dépense *</label>
              <input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex: Achat fournitures bureau, Carburant générateur..." className="input w-full text-sm py-2.5" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
              <CustomSelect options={categoryOptions} value={categorie} onChange={handleCategoryChange} searchable creatable />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Montant *</label>
              <NumberInput value={montant} onChange={setMontant} min={0} placeholder="0" className="input w-full text-sm py-2.5" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Devise</label>
              <CustomSelect options={currencyOptions} value={devise} onChange={val => setDevise(val as string)} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Mode de paiement</label>
              <CustomSelect options={modeOptions} value={modePaiement} onChange={setModePaiement} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Bénéficiaire / Payé à</label>
              <input value={beneficiaire} onChange={e => setBeneficiaire(e.target.value)} className="input w-full text-sm py-2.5" placeholder="Nom du bénéficiaire" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Pièce justificative</label>
              <input value={pieceJustificative} onChange={e => setPieceJustificative(e.target.value)} className="input w-full text-sm py-2.5" placeholder="N° facture, Bon N°..." />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Date</label>
              <DatePicker value={date} onChange={setDate} className="input w-full text-sm py-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Référence N°</label>
              <input value={reference} onChange={e => setReference(e.target.value)} className="input w-full text-sm py-2.5" placeholder="N° transaction" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect options={yearOptions} value={yearId} onChange={setYearId} />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Caissier responsable</label>
              <input value={caissier} onChange={e => setCaissier(e.target.value)} className="input w-full text-sm py-2.5" />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !libelle || montant <= 0}
            className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg bg-rose-600 hover:bg-rose-700 text-white"
            style={{ opacity: loading || !libelle || montant <= 0 ? 0.5 : 1 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Enregistrement...' : "Valider la dépense de caisse"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── MODALE DE DÉTAILS DE TRANSACTION DE CAISSE ──────────────────────────────
const CashOperationDetailModal: React.FC<{
  op: OperationCaisse;
  onClose: () => void;
}> = ({ op, onClose }) => {
  const { config, currency, format } = useSchoolConfig();
  const [isPrinting, setIsPrinting] = useState(false);
  const voucherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handlePrintVoucher = async () => {
    if (!voucherRef.current) return;
    setIsPrinting(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const canvas = await html2canvas(voucherRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Justificatif_${op.type}_${op.reference || op.id.slice(0, 8)}.pdf`);
      showToast('Justificatif imprimé !', `Document exporté en PDF.`, 'success');
    } catch (err) {
      console.error('Erreur impression justificatif :', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const isEntree = op.type === 'ENTREE';
  const isSortie = op.type === 'SORTIE';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border shadow-md overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isEntree ? 'bg-emerald-500/15 text-emerald-600' : isSortie ? 'bg-rose-500/15 text-rose-600' : 'bg-indigo-500/15 text-indigo-600'}`}>
              {isEntree ? <ArrowDownLeft className="w-5 h-5" /> : isSortie ? <ArrowUpRight className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black">Détails de l'Opération</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{op.type === 'ENTREE' ? 'Recette de caisse' : op.type === 'SORTIE' ? 'Dépense / Sortie de caisse' : 'Transfert trésorerie'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 rounded-2xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <p className="text-[10px] font-black uppercase text-slate-400">Montant de l'opération</p>
            <p className="text-2xl font-black mt-1" style={{ color: isEntree ? '#059669' : isSortie ? '#dc2626' : '#4f46e5' }}>
              {isEntree ? '+' : isSortie ? '-' : '⇄ '}{format(op.montant, op.devise)}
            </p>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">{op.libelle}</p>
          </div>

          <div className="rounded-2xl border overflow-hidden text-xs" style={{ borderColor: 'var(--border)' }}>
            {[
              ['Référence', op.reference || op.id],
              ['Date', op.date?.split('T')[0] || '—'],
              ['Type d\'opération', op.type],
              ['Catégorie', op.categorie?.replace(/_/g, ' ')],
              ['Mode de paiement', op.modePaiement],
              ['Bénéficiaire / Payé à', op.beneficiaire || '—'],
              ['Pièce justificative', op.pieceJustificative || '—'],
              ['Caissier responsable', op.caissier || '—'],
            ].map(([k, v], idx) => (
              <div key={idx} className="flex justify-between p-2.5 border-b last:border-0" style={{ borderColor: 'var(--border)', background: idx % 2 ? 'var(--bg-sunken)' : 'transparent' }}>
                <span className="font-bold text-slate-500">{k} :</span>
                <span className="font-black" style={{ color: 'var(--text-primary)' }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-xs font-black cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Fermer
            </button>
            <button
              onClick={handlePrintVoucher}
              disabled={isPrinting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Imprimer Justificatif</span>
            </button>
          </div>
        </div>

        {/* Template caché d'impression A4 */}
        <div className="hidden">
          <div ref={voucherRef} className="relative bg-white text-slate-900 p-8 w-[210mm] min-h-[148mm] font-sans text-xs">
            {config?.logoUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0">
                <img src={config.logoUrl} alt="Filigrane Logo" className="w-[120mm] max-h-[120mm] object-contain filter grayscale" />
              </div>
            )}
            <div className="relative z-10 space-y-4">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div className="flex items-center gap-3">
                  {config?.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" /> : null}
                  <div>
                    <h1 className="text-sm font-black uppercase text-slate-900">{config?.schoolName || 'ÉCOLISA'}</h1>
                    <p className="text-[9px] text-slate-500">{config?.address || ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded">
                    JUSTIFICATIF DE CAISSE ({op.type})
                  </span>
                  <p className="text-[10px] font-mono font-bold text-slate-700 mt-1">Réf: {op.reference || op.id}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded border border-slate-300">
                <p className="text-sm font-black text-slate-900">MOTIF : {op.libelle}</p>
                <p className="text-[11px] font-mono font-black text-indigo-700 mt-1">MONTANT : {format(op.montant, op.devise)}</p>
              </div>

              <table className="w-full text-[10px] border border-slate-300">
                <tbody>
                  <tr className="border-b"><td className="p-2 font-bold bg-slate-50">Type :</td><td className="p-2 font-black">{op.type}</td></tr>
                  <tr className="border-b"><td className="p-2 font-bold bg-slate-50">Catégorie :</td><td className="p-2">{op.categorie}</td></tr>
                  <tr className="border-b"><td className="p-2 font-bold bg-slate-50">Mode de Paiement :</td><td className="p-2">{op.modePaiement}</td></tr>
                  <tr className="border-b"><td className="p-2 font-bold bg-slate-50">Bénéficiaire / Payé à :</td><td className="p-2 font-bold">{op.beneficiaire || '—'}</td></tr>
                  <tr><td className="p-2 font-bold bg-slate-50">Caissier Responsable :</td><td className="p-2 font-bold">{op.caissier}</td></tr>
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-6 text-[9.5px] font-bold text-slate-700">
                <div>
                  <p>Signature Caissier</p>
                  <div className="h-10" />
                  <p className="text-slate-500 font-normal">{op.caissier}</p>
                </div>
                <div className="text-center">
                  <Barcode128 value={op.reference || op.id} height={24} />
                </div>
                <div className="text-right">
                  <p>Signature Bénéficiaire / Direction</p>
                  <div className="h-10" />
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

// ── MODALE D'EXPORTATION RAPPORT DE CAISSE PDF ──────────────────────────────
const CashExportModal: React.FC<{
  ops: OperationCaisse[];
  totalEntrees: number;
  totalSorties: number;
  solde: number;
  onClose: () => void;
}> = ({ ops, totalEntrees, totalSorties, solde, onClose }) => {
  const { config, currency, format } = useSchoolConfig();
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleGeneratePDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    try {
      const html2canvasModule = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const canvas = await html2canvas(reportRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Rapport_Caisse_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast('Rapport PDF Généré !', `Le rapport financier de ${ops.length} opérations a été téléchargé.`, 'success');
    } catch (err) {
      console.error('Erreur rapport PDF caisse :', err);
    } finally {
      setIsExporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in font-sans" onClick={onClose}>
      <div className="w-full max-w-xl rounded-3xl border shadow-md p-6 animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Exportation du Rapport de Caisse PDF</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Générez un rapport financier propre contenant les {ops.length} opérations filtrées.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl border space-y-1.5 text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between"><span className="font-bold text-slate-500">Opérations incluses :</span><span className="font-black text-indigo-600">{ops.length}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-500">Total Entrées :</span><span className="font-mono font-bold text-emerald-600">{format(totalEntrees, currency)}</span></div>
            <div className="flex justify-between"><span className="font-bold text-slate-500">Total Sorties :</span><span className="font-mono font-bold text-rose-600">{format(totalSorties, currency)}</span></div>
            <div className="flex justify-between border-t pt-1.5 font-black"><span className="text-slate-700">Solde Trésorerie Net :</span><span className="font-mono text-indigo-600">{format(solde, currency)}</span></div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-xs font-black cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Fermer
            </button>
            <button
              onClick={handleGeneratePDF}
              disabled={isExporting || ops.length === 0}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              <span>Télécharger le Rapport PDF</span>
            </button>
          </div>
        </div>

        {/* Template d'impression A4 caché */}
        <div className="hidden">
          <div ref={reportRef} className="relative bg-white text-slate-900 p-8 w-[210mm] min-h-[297mm] font-sans text-xs">
            {config?.logoUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0">
                <img src={config.logoUrl} alt="Filigrane Logo" className="w-[180mm] max-h-[180mm] object-contain filter grayscale" />
              </div>
            )}
            <div className="relative z-10 space-y-5">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                  {config?.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-12 object-contain" /> : null}
                  <div>
                    <h1 className="text-base font-black uppercase text-slate-900">{config?.schoolName || 'ÉCOLISA'}</h1>
                    <p className="text-[10px] text-slate-500 font-semibold">{[config?.address, config?.subDivision].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded">RAPPORT DE CAISSE</span>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Généré le: {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-100 rounded border border-slate-300 text-[10.5px]">
                <div><p className="font-bold text-slate-500">TOTAL ENTRÉES :</p><p className="font-mono font-black text-emerald-700">{format(totalEntrees, currency)}</p></div>
                <div><p className="font-bold text-slate-500">TOTAL SORTIES :</p><p className="font-mono font-black text-rose-700">{format(totalSorties, currency)}</p></div>
                <div><p className="font-bold text-slate-500">SOLDE NET TRÉSORERIE :</p><p className="font-mono font-black text-slate-900">{format(solde, currency)}</p></div>
              </div>

              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase">
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Catégorie</th>
                    <th className="p-2 text-left">Libellé</th>
                    <th className="p-2 text-left">Mode</th>
                    <th className="p-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 border-b border-slate-300">
                  {ops.map((o, idx) => (
                    <tr key={idx} className="even:bg-slate-50">
                      <td className="p-2 font-mono font-bold">{o.date?.split('T')[0]}</td>
                      <td className="p-2 font-bold">{o.type}</td>
                      <td className="p-2">{o.categorie}</td>
                      <td className="p-2 font-semibold">{o.libelle}</td>
                      <td className="p-2">{o.modePaiement}</td>
                      <td className="p-2 text-right font-mono font-black">{format(o.montant, o.devise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-8 text-[10px] font-bold text-slate-700">
                <div><p>Le Comptable / Caissier</p><div className="h-10" /><p className="text-slate-500 font-normal">Sceau & Signature</p></div>
                <div className="text-right"><p>La Direction Établissement</p><div className="h-10" /><p className="text-slate-500 font-normal">Sceau & Signature</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
