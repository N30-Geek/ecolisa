import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Loader2, Filter, TrendingUp, AlertTriangle, TrendingDown, Wallet, PieChart, LayoutGrid, TreePine, Eye } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { CustomSelect } from '../common/CustomSelect';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { MODE_PAIEMENT_LABELS } from '../../utils/feeTranches';
import type { TypeFraisScolaire, AnneeScolaireConfig, CategorieFrais, FactureEleve, TransactionPaiement, ClasseScolaire } from '../../types';
import { FeesByContextPanel } from './FeesByContextPanel';
import { FeeTypeFormModal } from './FeeTypeFormModal';
import { FeeTypeDetailModal } from './FeeTypeDetailModal';
import { ReceiptModal } from './ReceiptModal';

const CATEGORIES: CategorieFrais[] = [
  'FRAIS_INSCRIPTION', 'FRAIS_REINSCRIPTION', 'FRAIS_MINERVAL', 'FRAIS_CONNEXES', 'FRAIS_KITS_EQUIPEMENTS',
  'FRAIS_BUS', 'FRAIS_UNIFORME', 'FRAIS_EXAMEN', 'FRAIS_CARTE', 'FRAIS_ACTIVITE', 'AUTRE',
];

const CYCLES = ['TOUS', 'MATERNELLE', 'PRIMAIRE', 'SECONDAIRE_CTEB', 'HUMANITES'] as const;
const REGIMES = ['TOUS', 'EXTERNE', 'INTERNE', 'SEMI_INTERNE'] as const;

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface FeesTabProps {
  activeSchoolYear?: string;
  autoOpenFee?: boolean;
  onActionConsumed?: () => void;
}

export const FeesTab: React.FC<FeesTabProps> = ({ activeSchoolYear, autoOpenFee, onActionConsumed }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [viewMode, setViewMode] = useState<'catalogue' | 'context'>('catalogue');

  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TypeFraisScolaire | null>(null);
  const [selectedFee, setSelectedFee] = useState<TypeFraisScolaire | null>(null);
  const [viewPayment, setViewPayment] = useState<TransactionPaiement | null>(null);

  const [cycleFilter, setCycleFilter] = useState<string>('TOUS');
  const [optionFilter, setOptionFilter] = useState<string>('TOUS');
  const [classFilter, setClassFilter] = useState<string>('TOUS');
  const [deviseFilter, setDeviseFilter] = useState<string>('TOUS');

  const load = async () => {
    setLoading(true);
    const [ft, y, cls, inv, pmt] = await Promise.all([
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getSchoolYears(),
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
    ]);
    setFeeTypes(ft);
    setYears(y);
    setClasses(cls);
    setInvoices(inv);
    setPayments(pmt);
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeSchoolYear]);

  useEffect(() => {
    if (autoOpenFee) {
      startNew();
      onActionConsumed?.();
    }
  }, [autoOpenFee, onActionConsumed]);

  const activeYear = useMemo(() => years.find(y => y.id === activeSchoolYear || y.nom === activeSchoolYear) || years.find(y => y.statut === 'EN_COURS') || years[0], [years, activeSchoolYear]);
  const activeYearId = activeYear?.id;

  const cycleOptions = useMemo(() => [
    { value: 'TOUS', label: 'Tous les cycles' },
    ...CYCLES.filter(c => c !== 'TOUS').map(c => ({ value: c, label: c })),
  ], []);

  const optionOptions = useMemo(() => [
    { value: 'TOUS', label: 'Toutes les options' },
    ...Array.from(new Set(classes.map(c => c.optionCode).filter((o): o is string => !!o))).map(o => ({ value: o, label: o })),
  ], [classes]);

  const classOptions = useMemo(() => [
    { value: 'TOUS', label: 'Toutes les classes' },
    ...Array.from(new Set(classes.map(c => c.nom).filter(Boolean))).map(c => ({ value: c, label: c })),
  ], [classes]);

  const deviseOptions = useMemo(() => [
    { value: 'TOUS', label: 'Toutes devises' },
    { value: 'USD', label: 'USD' },
    { value: 'CDF', label: 'CDF' },
  ], []);

  const filteredFeeTypes = useMemo(() => {
    let list = feeTypes.filter(f => f.actif !== false);
    if (activeYearId) list = list.filter(f => f.schoolYearId === activeYearId || f.anneeScolaireId === activeYearId);
    if (cycleFilter !== 'TOUS') list = list.filter(f => f.cycleId === cycleFilter || f.cycleId === 'TOUS');
    if (optionFilter !== 'TOUS') list = list.filter(f => f.optionCode === optionFilter || f.optionCode === 'TOUS');
    if (deviseFilter !== 'TOUS') list = list.filter(f => f.devise === deviseFilter);
    return list;
  }, [feeTypes, activeYearId, cycleFilter, optionFilter, deviseFilter]);

  const feeStats = useMemo(() => {
    const map = new Map<string, { attendu: number; paye: number }>();
    filteredFeeTypes.forEach(ft => map.set(ft.id, { attendu: 0, paye: 0 }));

    const relevantInvoices = invoices.filter(inv => {
      if (activeYearId && inv.anneeScolaireId !== activeYearId) return false;
      if (classFilter !== 'TOUS' && inv.nomClasse !== classFilter) return false;
      return true;
    });

    relevantInvoices.forEach(inv => {
      inv.lignes?.forEach(l => {
        const s = map.get(l.feeTypeId);
        if (s) s.attendu += convertCurrency(l.montant, l.devise || inv.devise, currency, exchangeRate);
      });
    });

    payments.forEach(p => {
      if (activeYearId && p.anneeScolaireId !== activeYearId) return;
      p.allocations?.forEach(a => {
        const s = map.get(a.feeTypeId);
        if (s) s.paye += convertCurrency(a.montant, p.devise, currency, exchangeRate);
      });
    });

    return map;
  }, [filteredFeeTypes, invoices, payments, activeYearId, classFilter, currency, exchangeRate]);

  const globalStats = useMemo(() => {
    let attendu = 0, paye = 0;
    feeStats.forEach(s => { attendu += s.attendu; paye += s.paye; });
    const reste = Math.max(0, attendu - paye);
    const taux = attendu > 0 ? Math.round((paye / attendu) * 100) : 0;
    return { attendu, paye, reste, taux };
  }, [feeStats]);

  const { paginated: paginatedFeeTypes, ...feeTypesPagination } = usePagination(filteredFeeTypes, { defaultPageSize: 15 });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce type de frais ?')) return;
    await LocalDatabaseService.deleteFeeType(id);
    load();
  };

  const handleSave = async (ft: TypeFraisScolaire) => {
    if (ft.id) await LocalDatabaseService.updateFeeType(ft.id, ft);
    else await LocalDatabaseService.addFeeType(ft);
    setEditing(null);
    load();
  };

  const startNew = () => {
    setEditing({
      id: '',
      code: '',
      nom: '',
      categorie: 'FRAIS_MINERVAL',
      montant: 0,
      devise: (currency as string) || 'USD',
      obligatoire: true,
      schoolYearId: activeYear?.id,
      anneeScolaireId: activeYear?.id,
      cycleId: 'TOUS',
      optionCode: 'TOUS',
      regime: 'TOUS',
      actif: true,
      modePaiement: 'UNIQUE',
      nombreTranches: 1,
      tranches: [{ id: uuid(), nom: 'Paiement unique', montant: 0, devise: (currency as string) || 'USD', ordre: 1 }],
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Types de frais &amp; Recouvrement</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Seuls les frais créés et définis sont affichés.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <button
              onClick={() => setViewMode('catalogue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'catalogue' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-500/10'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Catalogue
            </button>
            <button
              onClick={() => setViewMode('context')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'context' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-500/10'}`}
            >
              <TreePine className="w-3.5 h-3.5" /> Par Contexte
            </button>
          </div>
          {viewMode === 'catalogue' && (
            <button onClick={startNew} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
              <Plus className="w-3.5 h-3.5" /> Nouveau type
            </button>
          )}
        </div>
      </div>

      {/* ── Mode Par Contexte */}
      {viewMode === 'context' ? (
        <FeesByContextPanel activeSchoolYear={activeSchoolYear} />
      ) : (
        <>
          {selectedFee ? (
            <FeeTypeDetailModal
              feeType={selectedFee}
              invoices={invoices}
              payments={payments}
              classes={classes}
              onClose={() => setSelectedFee(null)}
              onViewReceipt={setViewPayment}
            />
          ) : (
          <>

      {/* KPI globaux de recouvrement */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total attendu</span>
          </div>
          <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{fmt(globalStats.attendu)}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total payé</span>
          </div>
          <p className="text-lg font-black text-emerald-600">{fmt(globalStats.paye)}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reste à recouvrir</span>
          </div>
          <p className="text-lg font-black text-rose-600">{fmt(globalStats.reste)}</p>
        </div>
        <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Taux de recouvrement</span>
          </div>
          <p className="text-lg font-black text-amber-600">{globalStats.taux}%</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
        <Filter className="w-4 h-4 text-slate-400" />
        <CustomSelect options={cycleOptions} value={cycleFilter} onChange={setCycleFilter} className="w-40" />
        <CustomSelect options={optionOptions} value={optionFilter} onChange={setOptionFilter} className="w-44" />
        <CustomSelect options={classOptions} value={classFilter} onChange={setClassFilter} className="w-44" />
        <CustomSelect options={deviseOptions} value={deviseFilter} onChange={setDeviseFilter} className="w-36" />
        {(cycleFilter !== 'TOUS' || optionFilter !== 'TOUS' || classFilter !== 'TOUS' || deviseFilter !== 'TOUS') && (
          <button
            onClick={() => { setCycleFilter('TOUS'); setOptionFilter('TOUS'); setClassFilter('TOUS'); setDeviseFilter('TOUS'); }}
            className="ml-auto px-3 py-1.5 rounded-lg text-[11px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Cartes des types de frais créés */}
      {filteredFeeTypes.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border mb-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>Aucun type de frais ne correspond aux filtres.</p>
          <p className="text-xs text-slate-400 mt-1">Créez un nouveau type de frais ou modifiez les filtres.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {paginatedFeeTypes.map(ft => {
          const s = feeStats.get(ft.id) || { attendu: 0, paye: 0 };
          const reste = Math.max(0, s.attendu - s.paye);
          const taux = s.attendu > 0 ? Math.round((s.paye / s.attendu) * 100) : 0;
          return (
            <div
              key={ft.id}
              onClick={() => setSelectedFee(ft)}
              className="p-4 rounded-xl border cursor-pointer hover:shadow-lg transition-all group"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{ft.categorie.replace(/_/g, ' ')}</span>
                  <h3 className="text-sm font-bold mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>{ft.nom}</h3>
                </div>
                <span className={`shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full border ${ft.actif !== false ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25' : 'bg-slate-500/10 text-slate-600 border-slate-500/25'}`}>
                  {ft.actif !== false ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-500/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Montant</p>
                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{fmt(ft.montant, ft.devise)}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-500/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Paiement</p>
                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{MODE_PAIEMENT_LABELS[ft.modePaiement || 'UNIQUE']}</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-500/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Attendu</p>
                  <p className="font-black" style={{ color: 'var(--text-primary)' }}>{fmt(s.attendu)}</p>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/5">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Payé</p>
                  <p className="font-black text-emerald-700">{fmt(s.paye)}</p>
                </div>
                <div className="p-2 rounded-lg bg-rose-500/5">
                  <p className="text-[10px] text-rose-600 font-bold uppercase">Reste</p>
                  <p className="font-black text-rose-700">{fmt(reste)}</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Taux de recouvrement</span>
                  <span>{taux}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${taux}%` }} />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFee(ft); }}
                className="w-full mt-3 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> Voir le détail
              </button>
            </div>
          );
        })}
      </div>

      <div className="section-card overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Code</th>
              <th>Nom</th>
              <th>Categorie</th>
              <th>Montant</th>
              <th>Devise</th>
              <th>Paiement</th>
              <th>Obligatoire</th>
              <th>Cycle</th>
              <th>Option</th>
              <th>Régime</th>
              <th>Portee</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedFeeTypes.map(ft => (
              <tr key={ft.id}>
                <td className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{ft.code}</td>
                <td className="font-bold text-[12px]">{ft.nom}</td>
                <td className="text-[11px]">{ft.categorie}</td>
                <td className="font-black text-[14px]">{fmt(ft.montant, ft.devise)}</td>
                <td className="text-[11px]">{ft.devise}</td>
                <td className="text-[11px]">{MODE_PAIEMENT_LABELS[ft.modePaiement || 'UNIQUE']}</td>
                <td>{ft.obligatoire ? <span className="text-emerald-600 font-bold text-[11px]">Oui</span> : <span className="text-slate-400 text-[11px]">Non</span>}</td>
                <td className="text-[11px]">{ft.cycleId || 'TOUS'}</td>
                <td className="text-[11px]">{ft.optionCode || 'TOUS'}</td>
                <td className="text-[11px]">{ft.regime || 'TOUS'}</td>
                <td className="text-[11px]">{ft.portee || 'TOUS'}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(ft)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600">Modifier</button>
                    <button onClick={() => handleDelete(ft.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {feeTypes.length === 0 && !loading && (
              <tr><td colSpan={12} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Aucun type de frais.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={11} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} /></td></tr>
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={feeTypesPagination.page}
          totalPages={feeTypesPagination.totalPages}
          total={feeTypesPagination.total}
          pageSize={feeTypesPagination.pageSize}
          start={feeTypesPagination.start}
          end={feeTypesPagination.end}
          onPageChange={feeTypesPagination.setPage}
          onPageSizeChange={feeTypesPagination.setPageSize}
        />
      </div>

      {editing && (
        <FeeTypeFormModal
          fee={editing}
          years={years}
          classes={classes}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {selectedFee && (
        <FeeTypeDetailModal
          feeType={selectedFee}
          invoices={invoices}
          payments={payments}
          classes={classes}
          onClose={() => setSelectedFee(null)}
          onViewReceipt={setViewPayment}
        />
      )}

      {viewPayment && (
        <ReceiptModal
          isOpen={!!viewPayment}
          onClose={() => { setViewPayment(null); load(); }}
          payment={viewPayment}
          invoice={invoices.find(i => i.id === viewPayment.invoiceId)}
          feeTypes={feeTypes}
        />
      )}
        </>
      )}
    </>
  )}
</div>
  );
};

