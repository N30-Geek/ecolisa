import React, { useEffect, useMemo, useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Download,
  Eye,
  Printer,
  X,
  Trash2,
  Loader2,
  FileText,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import type { FactureEleve, TransactionPaiement, Eleve, TypeFraisScolaire, LigneFacture, AnneeScolaireConfig } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const invoiceStatusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    PAYE:     { label: 'Solde',   cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' },
    PARTIEL:  { label: 'Partiel', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25' },
    NON_PAYE: { label: 'Impaye',  cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25' },
  };
  const s = map[statut] || { label: statut, cls: 'bg-slate-500/15 text-slate-700 border-slate-500/25' };
  return <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${s.cls}`}>{s.label}</span>;
};

export const InvoiceTab: React.FC = () => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [payInvoice, setPayInvoice] = useState<FactureEleve | null>(null);
  const [viewReceipt, setViewReceipt] = useState<TransactionPaiement | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const [inv, pay, el, ft, yrs] = await Promise.all([
      LocalDatabaseService.getInvoices(),
      LocalDatabaseService.getPayments(),
      LocalDatabaseService.getEleves(),
      LocalDatabaseService.getFeeTypes(),
      LocalDatabaseService.getSchoolYears(),
    ]);
    setInvoices(inv);
    setPayments(pay);
    setStudents(el);
    setFeeTypes(ft);
    setYears(yrs);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = !search || [inv.nomEleve, inv.nomClasse, inv.numeroFacture].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = !statusFilter || inv.statut === statusFilter;
      const matchesYear = !yearFilter || inv.anneeScolaireId === yearFilter || inv.anneeScolaire === yearFilter;
      return matchesSearch && matchesStatus && matchesYear;
    });
  }, [invoices, search, statusFilter, yearFilter]);

  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((a, i) => a + convertCurrency(i.montantTotal, i.devise, currency, exchangeRate), 0);
    const totalPaid = invoices.reduce((a, i) => a + convertCurrency(i.montantPaye, i.devise, currency, exchangeRate), 0);
    const totalUnpaid = totalBilled - totalPaid;
    return { totalBilled, totalPaid, totalUnpaid, count: invoices.length };
  }, [invoices, currency, exchangeRate]);

  const exportCSV = () => {
    const header = 'Facture,Eleve,Classe,Total,Paye,Reste,Statut\n';
    const rows = filteredInvoices.map(i => `${i.numeroFacture},${i.nomEleve},${i.nomClasse},${i.montantTotal},${i.montantPaye},${i.montantTotal - i.montantPaye},${i.statut}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factures-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette facture et ses paiements ?')) return;
    await LocalDatabaseService.deleteInvoice(id);
    await loadAll();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Factures & Recouvrement</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gestion des factures, encaissements et suivi des impayes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Download className="w-3.5 h-3.5" /> Exporter
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2" style={{ fontSize: '12px' }}>
            <Plus className="w-3.5 h-3.5" /> Nouvelle facture
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Factures', val: stats.count, color: '#6366f1', icon: Receipt },
          { label: 'Total facture', val: fmt(stats.totalBilled), color: '#3b82f6', icon: Eye },
          { label: 'Deja paye', val: fmt(stats.totalPaid), color: '#10b981', icon: Receipt },
          { label: 'Reste a recouvrer', val: fmt(stats.totalUnpaid), color: stats.totalUnpaid > 0 ? '#ef4444' : '#10b981', icon: Receipt },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}12` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[18px] font-black" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="p-4 border-b flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--border)' }}>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une facture, un eleve..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-36 text-sm">
            <option value="">Tous statuts</option>
            <option value="NON_PAYE">Impaye</option>
            <option value="PARTIEL">Partiel</option>
            <option value="PAYE">Solde</option>
          </select>
          <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="input w-40 text-sm">
            <option value="">Toutes annees</option>
            {years.map(y => <option key={y.id} value={y.id}>{y.nom}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Facture</th>
                <th>Eleve</th>
                <th>Classe</th>
                <th>Montant</th>
                <th>Paye</th>
                <th>Reste</th>
                <th>Statut</th>
                <th>Echeance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const remaining = convertCurrency(inv.montantTotal - inv.montantPaye, inv.devise, currency, exchangeRate);
                return (
                  <tr key={inv.id}>
                    <td>
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{inv.numeroFacture}</span>
                    </td>
                    <td>
                      <p className="font-bold text-[12px]" style={{ color: 'var(--text-primary)' }}>{inv.nomEleve}</p>
                    </td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{inv.nomClasse}</td>
                    <td className="font-black text-[14px]" style={{ color: 'var(--text-primary)' }}>{fmt(inv.montantTotal, inv.devise)}</td>
                    <td className="font-semibold text-emerald-600">{fmt(inv.montantPaye, inv.devise)}</td>
                    <td className="font-semibold" style={{ color: remaining > 0 ? '#ef4444' : '#059669' }}>{fmt(remaining, currency)}</td>
                    <td>{invoiceStatusBadge(inv.statut)}</td>
                    <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{inv.dateEcheance?.split('T')[0] || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {inv.statut !== 'PAYE' && (
                          <button onClick={() => setPayInvoice(inv)} className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600" title="Payer">
                            Payer
                          </button>
                        )}
                        <button onClick={() => window.print()} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100" title="Imprimer">
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                    Aucune facture trouvee.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="section-card mt-6">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>Derniers paiements</h3>
        </div>
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Recu</th>
              <th>Eleve</th>
              <th>Moyen</th>
              <th>Reference</th>
              <th>Montant</th>
              <th>Caissier</th>
              <th>Date</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.slice(0, 15).map(p => (
              <tr key={p.id}>
                <td><span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">{p.numeroRecu}</span></td>
                <td>
                  <p className="font-bold text-[12px]" style={{ color: 'var(--text-primary)' }}>{p.nomEleve}</p>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{p.registrationNumber}</p>
                </td>
                <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.moyenPaiement}</td>
                <td className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                <td className="font-black text-[14px] text-emerald-700">{fmt(p.montantPaye, p.devise)}</td>
                <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.nomCaissier}</td>
                <td className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.dateCreation?.split('T')[0]}</td>
                <td className="text-right">
                  <button
                    onClick={() => setViewReceipt(p)}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-all"
                    title="Voir le reçu"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateInvoiceModal
          students={students}
          feeTypes={feeTypes}
          years={years}
          onClose={() => setShowCreate(false)}
          onSaved={loadAll}
        />
      )}
      {payInvoice && (
        <PaymentModal
          invoice={payInvoice}
          onClose={() => setPayInvoice(null)}
          onSaved={() => {
            loadAll().then(() => {
              LocalDatabaseService.getPayments(payInvoice.id).then(payments => {
                if (payments.length > 0) {
                  setViewReceipt(payments[payments.length - 1]);
                }
              });
            });
          }}
        />
      )}

      {viewReceipt && (
        <ReceiptModal
          isOpen={!!viewReceipt}
          onClose={() => setViewReceipt(null)}
          payment={viewReceipt}
          invoice={invoices.find(inv => inv.id === viewReceipt.invoiceId)}
          feeTypes={feeTypes}
        />
      )}
    </div>
  );
};

const CreateInvoiceModal: React.FC<{
  students: Eleve[];
  feeTypes: TypeFraisScolaire[];
  years: AnneeScolaireConfig[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ students, feeTypes, years, onClose, onSaved }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, source?: string) => formatCurrency(n, currency, source || currency, exchangeRate);

  const [studentId, setStudentId] = useState<string>('');
  const [yearId, setYearId] = useState<string>(years.find(y => y.statut === 'EN_COURS')?.id || '');
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [lines, setLines] = useState<{ feeTypeId: string; montant: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const activeYear = years.find(y => y.id === yearId) || years[0];
  const selectedStudent = students.find(s => s.id === studentId);

  const toggleFee = (ft: TypeFraisScolaire) => {
    const exists = lines.find(l => l.feeTypeId === ft.id);
    if (exists) {
      setLines(lines.filter(l => l.feeTypeId !== ft.id));
    } else {
      setLines([...lines, { feeTypeId: ft.id, montant: convertCurrency(ft.montant, ft.devise, currency, exchangeRate) }]);
    }
  };

  const total = lines.reduce((a, l) => {
    const ft = feeTypes.find(f => f.id === l.feeTypeId);
    return a + convertCurrency(l.montant, currency, ft?.devise || 'USD', exchangeRate);
  }, 0);

  const handleSubmit = async () => {
    if (!studentId || lines.length === 0) return;
    setLoading(true);
    const invoiceLignes: LigneFacture[] = lines.map(l => {
      const ft = feeTypes.find(f => f.id === l.feeTypeId)!;
      return {
        id: uuid(),
        invoiceId: '',
        feeTypeId: ft.id,
        nom: ft.nom,
        categorie: ft.categorie,
        montant: convertCurrency(l.montant, currency, ft.devise, exchangeRate),
        devise: ft.devise,
      };
    });
    const invoice: FactureEleve = {
      id: uuid(),
      anneeScolaireId: yearId,
      anneeScolaire: activeYear?.nom,
      numeroFacture: `F-${Date.now()}`,
      eleveId: studentId,
      studentId,
      nomEleve: `${selectedStudent?.prenom || ''} ${selectedStudent?.nom || ''}`.trim() || 'Eleve',
      nomClasse: selectedStudent?.nomClasse || '—',
      montantTotal: invoiceLignes.reduce((a, l) => a + l.montant, 0),
      montantPaye: 0,
      devise: currency,
      statut: 'NON_PAYE',
      dateEcheance: dueDate,
      lignes: invoiceLignes,
    };
    await LocalDatabaseService.addInvoice(invoice);
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-2xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nouvelle facture</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Eleve</label>
              <select value={studentId} onChange={e => setStudentId(e.target.value)} className="input w-full text-sm">
                <option value="">Choisir un eleve</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.prenom} {s.nom} — {s.nomClasse || s.classId}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Annee scolaire</label>
              <select value={yearId} onChange={e => setYearId(e.target.value)} className="input w-full text-sm">
                {years.map(y => <option key={y.id} value={y.id}>{y.nom}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Date d'echeance</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input w-full text-sm" />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Types de frais</label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
              {feeTypes.map(ft => {
                const selected = lines.find(l => l.feeTypeId === ft.id);
                return (
                  <button
                    key={ft.id}
                    onClick={() => toggleFee(ft)}
                    className="p-3 rounded-xl border text-left transition-all"
                    style={{
                      borderColor: 'var(--border)',
                      background: selected ? 'rgba(99,102,241,0.10)' : 'var(--bg-surface)',
                      borderWidth: selected ? '2px' : '1px',
                    }}
                  >
                    <p className="text-sm font-bold">{ft.nom}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ft.categorie} · {fmt(ft.montant, ft.devise)}</p>
                    {selected && (
                      <input
                        type="number"
                        value={selected.montant}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setLines(lines.map(l => l.feeTypeId === ft.id ? { ...l, montant: Number(e.target.value) } : l))}
                        className="mt-2 w-full text-sm rounded-lg border px-2 py-1"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-2xl flex items-center justify-between" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
            <span className="text-sm font-bold">Total facture</span>
            <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{fmt(total)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !studentId || lines.length === 0}
            className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: '#6366f1', color: 'white', opacity: loading || !studentId || lines.length === 0 ? 0.6 : 1 }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Creation...' : 'Creer la facture'}
          </button>
        </div>
      </div>
    </div>
  );
};
