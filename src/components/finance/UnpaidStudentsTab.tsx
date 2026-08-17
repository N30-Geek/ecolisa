import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Eye,
  CreditCard,
  Printer,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency } from '../../utils/currency';
import { getInvoiceTotal, getInvoicePaid, getInvoiceStatus } from '../../utils/financeCalculations';
import type { FactureEleve, TransactionPaiement, TypeFraisScolaire, ClasseScolaire } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { PaginationBar } from '../common/PaginationBar';
import { usePagination } from '../../hooks/usePagination';
import { InvoiceDetailModal } from './InvoiceTab';
import { PayFeesModal } from './PayFeesModal';

interface UnpaidStudentsTabProps {
  activeSchoolYear?: string;
}

interface UnpaidRow {
  invoice: FactureEleve;
  eleve: string;
  registrationNumber?: string;
  classe: string;
  cycle: string;
  feeTypeNames: string[];
  total: number;
  paye: number;
  reste: number;
  statut: 'NON_PAYE' | 'PARTIEL' | 'PAYE';
}

export const UnpaidStudentsTab: React.FC<UnpaidStudentsTabProps> = ({ activeSchoolYear }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number) => formatCurrency(n, currency, currency, exchangeRate);

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [feeTypeFilter, setFeeTypeFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [sortBy, setSortBy] = useState<string>('reste');

  const [viewInvoice, setViewInvoice] = useState<FactureEleve | null>(null);
  const [payInvoice, setPayInvoice] = useState<FactureEleve | null>(null);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [invData, payData, ftData, clsData] = await Promise.all([
          LocalDatabaseService.getInvoices(activeSchoolYear),
          LocalDatabaseService.getPayments(),
          LocalDatabaseService.getFeeTypes(activeSchoolYear),
          LocalDatabaseService.getClasses(activeSchoolYear),
        ]);
        if (!isMounted) return;
        setInvoices(invData);
        setPayments(payData);
        setFeeTypes(ftData);
        setClasses(clsData);
      } catch (err) {
        console.error('Erreur chargement créances :', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [activeSchoolYear]);

  const getClassByInvoice = (inv: FactureEleve) => classes.find(c => c.id === inv.classeId || c.nom === inv.nomClasse);

  const getCycleFromClass = (inv: FactureEleve) => {
    const cls = getClassByInvoice(inv);
    if (cls?.cycleCode) return cls.cycleCode;
    const nom = (inv.nomClasse || '').toLowerCase();
    if (nom.includes('maternelle')) return 'MATERNELLE';
    if (nom.includes('primaire')) return 'PRIMAIRE';
    if (nom.includes('cteb')) return 'SECONDAIRE_CTEB';
    if (nom.includes('humanité')) return 'HUMANITES';
    return 'CUSTOM';
  };

  const getFeeTypeNames = (inv: FactureEleve) => {
    if (inv.lignes && inv.lignes.length > 0) {
      const names = new Set<string>();
      inv.lignes.forEach(l => {
        const ft = feeTypes.find(f => f.id === l.feeTypeId);
        names.add(ft?.nom || l.nom || 'Frais');
      });
      return Array.from(names);
    }
    return ['Frais scolaires'];
  };

  const rawRows = useMemo<UnpaidRow[]>(() => {
    return invoices
      .map(inv => {
        const total = getInvoiceTotal(inv, currency);
        const paye = getInvoicePaid(inv, payments, currency);
        const reste = Math.max(0, total - paye);
        const statut = getInvoiceStatus(inv, payments, currency);
        return {
          invoice: inv,
          eleve: inv.nomEleve || '—',
          registrationNumber: inv.studentId,
          classe: inv.nomClasse || '—',
          cycle: getCycleFromClass(inv),
          feeTypeNames: getFeeTypeNames(inv),
          total,
          paye,
          reste,
          statut,
        };
      })
      .filter(r => r.statut !== 'PAYE');
  }, [invoices, payments, currency, feeTypes, classes]);

  const filteredRows = useMemo(() => {
    let rows = rawRows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.eleve.toLowerCase().includes(q) ||
        r.invoice.numeroFacture.toLowerCase().includes(q) ||
        r.classe.toLowerCase().includes(q)
      );
    }
    if (classFilter) rows = rows.filter(r => r.classe === classFilter);
    if (cycleFilter) rows = rows.filter(r => r.cycle === cycleFilter);
    if (feeTypeFilter) rows = rows.filter(r => r.feeTypeNames.some(n => n === feeTypeFilter));

    rows = [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'eleve': return a.eleve.localeCompare(b.eleve);
        case 'classe': return a.classe.localeCompare(b.classe);
        case 'echeance': return (a.invoice.dateEcheance || '').localeCompare(b.invoice.dateEcheance || '');
        case 'reste':
        default: return b.reste - a.reste;
      }
    });

    return rows;
  }, [rawRows, search, classFilter, cycleFilter, feeTypeFilter, sortBy]);

  const { paginated, ...pagination } = usePagination(filteredRows, { defaultPageSize: 10 });

  const uniqueClasses = useMemo(() => Array.from(new Set(rawRows.map(r => r.classe))).sort(), [rawRows]);
  const uniqueFeeTypeNames = useMemo(() => Array.from(new Set(rawRows.flatMap(r => r.feeTypeNames))).sort(), [rawRows]);
  const uniqueCycles = useMemo(() => Array.from(new Set(rawRows.map(r => r.cycle))).sort(), [rawRows]);

  const totalReste = useMemo(() => filteredRows.reduce((s, r) => s + r.reste, 0), [filteredRows]);
  const totalCount = filteredRows.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in w-full">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>Créances & Impayés</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Liste des élèves ayant des dettes non soldées.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <div className="relative min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher élève, facture, classe..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-bold outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <CustomSelect
            options={[{ value: '', label: 'Toutes classes' }, ...uniqueClasses.map(c => ({ value: c, label: c }))]}
            value={classFilter}
            onChange={setClassFilter}
            className="w-40"
          />
          <CustomSelect
            options={[{ value: '', label: 'Tous cycles' }, ...uniqueCycles.map(c => ({ value: c, label: c }))]}
            value={cycleFilter}
            onChange={setCycleFilter}
            className="w-40"
          />
          <CustomSelect
            options={[{ value: '', label: 'Tous types de frais' }, ...uniqueFeeTypeNames.map(c => ({ value: c, label: c }))]}
            value={feeTypeFilter}
            onChange={setFeeTypeFilter}
            className="w-48"
          />
          <CustomSelect
            options={[
              { value: 'reste', label: 'Tri : Montant dû' },
              { value: 'eleve', label: 'Tri : Élève' },
              { value: 'classe', label: 'Tri : Classe' },
              { value: 'echeance', label: 'Tri : Échéance' },
            ]}
            value={sortBy}
            onChange={setSortBy}
            className="w-40"
          />
          {(search || classFilter || cycleFilter || feeTypeFilter) && (
            <button
              onClick={() => { setSearch(''); setClassFilter(''); setCycleFilter(''); setFeeTypeFilter(''); setSortBy('reste'); }}
              className="px-3 py-2 rounded-xl text-[11px] font-black border border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 transition-all"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Créances affichées</p>
          <p className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Montant total dû</p>
          <p className="text-lg font-black text-rose-600">{fmt(totalReste)}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Élèves concernés</p>
          <p className="text-lg font-black text-amber-600">{new Set(filteredRows.map(r => r.invoice.studentId || r.eleve)).size}</p>
        </div>
        <div className="p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Moyenne par dette</p>
          <p className="text-lg font-black text-indigo-600">{fmt(totalCount > 0 ? totalReste / totalCount : 0)}</p>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-xs">
          <thead style={{ background: 'var(--bg-sunken)' }}>
            <tr className="text-left text-slate-500 dark:text-slate-400 font-bold">
              <th className="px-3 py-2.5">Élève</th>
              <th className="px-3 py-2.5">Classe</th>
              <th className="px-3 py-2.5">Cycle</th>
              <th className="px-3 py-2.5">Type(s) de frais</th>
              <th className="px-3 py-2.5">N° Facture</th>
              <th className="px-3 py-2.5 text-right">Total</th>
              <th className="px-3 py-2.5 text-right">Payé</th>
              <th className="px-3 py-2.5 text-right">Reste dû</th>
              <th className="px-3 py-2.5">Échéance</th>
              <th className="px-3 py-2.5 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-400 text-sm font-bold">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="w-8 h-8" />
                    Aucun impayé trouvé.
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(row => (
                <tr key={row.invoice.id} className="border-t hover:bg-slate-500/5 transition-all" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>{row.eleve}</td>
                  <td className="px-3 py-2">{row.classe}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>{row.cycle}</span>
                  </td>
                  <td className="px-3 py-2 max-w-40 truncate" title={row.feeTypeNames.join(', ')}>{row.feeTypeNames.join(', ')}</td>
                  <td className="px-3 py-2 font-mono">{row.invoice.numeroFacture}</td>
                  <td className="px-3 py-2 text-right font-bold">{fmt(row.total)}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600">{fmt(row.paye)}</td>
                  <td className="px-3 py-2 text-right font-black text-rose-600">{fmt(row.reste)}</td>
                  <td className="px-3 py-2 text-slate-400 font-mono">{row.invoice.dateEcheance?.split('T')[0] || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setViewInvoice(row.invoice)}
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-indigo-500"
                        title="Voir la facture"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPayInvoice(row.invoice)}
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-emerald-500"
                        title="Encaisser"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-amber-500"
                        title="Imprimer rappel"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationBar
        totalItems={pagination.total}
        currentPage={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />

      {viewInvoice && (
        <InvoiceDetailModal
          invoice={viewInvoice}
          payments={payments.filter(p => p.invoiceId === viewInvoice.id)}
          feeTypes={feeTypes}
          onClose={() => setViewInvoice(null)}
          onPay={() => { setPayInvoice(viewInvoice); setViewInvoice(null); }}
        />
      )}

      {payInvoice && (
        <PayFeesModal
          activeSchoolYear={activeSchoolYear}
          initialStudentId={payInvoice.eleveId || payInvoice.studentId}
          initialInvoiceId={payInvoice.id}
          onClose={() => setPayInvoice(null)}
          onSaved={async () => {
            setPayInvoice(null);
            try {
              const [invData, payData] = await Promise.all([
                LocalDatabaseService.getInvoices(activeSchoolYear),
                LocalDatabaseService.getPayments(),
              ]);
              setInvoices(invData);
              setPayments(payData);
            } catch (err) {
              console.error('Erreur rechargement après encaissement :', err);
            }
          }}
        />
      )}
    </div>
  );
};
