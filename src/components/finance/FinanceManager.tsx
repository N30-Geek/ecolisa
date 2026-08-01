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
import { mockInvoices, mockPayments, mockStaff } from '../../data/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, BarChart, Bar } from 'recharts';
import { LocalDatabaseService } from '../../services/localDatabase';

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

// ─── PAYMENT MODAL ────────────────────────────────────────────────────────

const PaymentModal: React.FC<{ invoice: typeof mockInvoices[0]; onClose: () => void }> = ({ invoice, onClose }) => {
  const [method, setMethod] = useState('CASH');
  const [amount, setAmount] = useState(invoice.montantTotal - invoice.montantPaye);
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => setStep('success'), 2000);
  };

  if (step === 'processing') {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '400px' }}>
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 rounded-full border-4 border-t-transparent mx-auto mb-4 animate-spin"
              style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }}
            />
            <h3 className="text-lg font-bold text-slate-900">Traitement en cours...</h3>
            <p className="text-sm text-slate-400 mt-2">
              {method === 'CASH' ? 'Enregistrement du paiement en caisse...' : `Confirmation ${method.replace('FLEXPAY_', '')} en attente...`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '440px' }}>
          <div className="p-10 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.25)' }}
            >
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Paiement Enregistré !</h3>
            <p className="text-sm text-slate-500 mt-2 mb-1">
              Montant: <strong className="text-slate-900">${amount} USD</strong>
            </p>
            <p className="text-xs text-slate-400 mb-6">
              Reçu: <strong className="font-mono text-slate-600">REC-2026-{Math.floor(Math.random() * 9000 + 1000)}</strong>
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" style={{ justifyContent: 'center', fontSize: '13px' }}>
                <Printer className="w-3.5 h-3.5" /> Imprimer Reçu
              </button>
              <button className="btn-primary flex-1" style={{ justifyContent: 'center', fontSize: '13px' }} onClick={onClose}>
                Terminer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const remaining = invoice.montantTotal - invoice.montantPaye;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Enregistrer un Paiement</h3>
            <p className="text-xs text-slate-400 mt-0.5">{invoice.nomEleve} · {invoice.nomClasse}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Résumé de la facture */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="text-slate-500 font-medium">Facture</span>
              <span className="font-mono font-bold text-slate-700">{invoice.numeroFacture}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400">Montant total</span>
              <span className="font-bold text-slate-900">${invoice.montantTotal}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400">Déjà payé</span>
              <span className="font-bold text-emerald-600">${invoice.montantPaye}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs font-bold text-slate-500">Solde restant</span>
              <span className="font-black text-lg text-red-600">${remaining}</span>
            </div>
            <div className="progress-bar mt-2">
              <div
                className="progress-fill"
                style={{
                  width: `${(invoice.montantPaye / invoice.montantTotal) * 100}%`,
                  background: '#10b981',
                }}
              />
            </div>
          </div>

          {/* Moyen de paiement */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Moyen de Paiement
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CASH', label: '💵 Cash', desc: 'Espèces' },
                { id: 'FLEXPAY_MPESA', label: '📱 M-Pesa', desc: 'FlexPay' },
                { id: 'FLEXPAY_ORANGE', label: '📱 Orange', desc: 'Money' },
                { id: 'FLEXPAY_AIRTEL', label: '📱 Airtel', desc: 'Money' },
                { id: 'FLUTTERWAVE_CARTE', label: '💳 Carte', desc: 'Flutterwave' },
                { id: 'BANK', label: '🏦 Banque', desc: 'Virement' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className="p-2.5 rounded-xl text-center transition-all"
                  style={{
                    background: method === m.id ? 'rgba(99,102,241,0.10)' : 'var(--bg-elevated)',
                    border: `1.5px solid ${method === m.id ? '#6366f1' : 'var(--border)'}`,
                  }}
                >
                  <div className="text-lg mb-0.5">{m.label.split(' ')[0]}</div>
                  <div className="text-[11px] font-bold" style={{ color: method === m.id ? '#6366f1' : '#64748b' }}>
                    {m.label.split(' ').slice(1).join(' ')}
                  </div>
                  <div className="text-[9px] text-slate-400">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Numéro de téléphone (Mobile Money) */}
          {method.startsWith('FLEXPAY') && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Numéro de Téléphone
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="px-3 py-2 rounded-xl font-bold text-sm"
                  style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)', color: '#64748b' }}
                >
                  +243
                </div>
                <input
                  type="tel"
                  placeholder="8X XXX XXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-field flex-1 py-2"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Un message de confirmation sera envoyé à ce numéro
              </p>
            </div>
          )}

          {/* Montant à payer */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Montant à Encaisser (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">$</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                min={0}
                max={remaining}
                className="input-field pl-7 text-lg font-black py-2.5"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setAmount(remaining)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}
              >
                Solde complet (${remaining})
              </button>
              <button
                onClick={() => setAmount(Math.round(remaining / 2))}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors"
                style={{ background: 'var(--bg-elevated)', color: '#64748b', border: '1px solid var(--border)' }}
              >
                Mi-tranche (${Math.round(remaining / 2)})
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="btn-secondary" style={{ fontSize: '13px' }}>
            Annuler
          </button>
          <button
            onClick={handlePay}
            className="btn-primary"
            style={{ fontSize: '13px', padding: '10px 24px' }}
          >
            <Check className="w-4 h-4" />
            Valider ${amount} USD
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── INVOICES TAB ─────────────────────────────────────────────────────────

const InvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);

  React.useEffect(() => {
    LocalDatabaseService.getInvoices().then((data) => {
      setInvoices(data.length > 0 ? data : []);
    });
  }, []);

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const match = !q || (inv.nomEleve && inv.nomEleve.toLowerCase().includes(q)) || (inv.numeroFacture && inv.numeroFacture.toLowerCase().includes(q));
    const status = !filterStatus || inv.statut === filterStatus;
    return match && status;
  });

  const stats = {
    total: invoices.reduce((a: number, b: any) => a + (b.montantTotal || 0), 0),
    paye: invoices.reduce((a: number, b: any) => a + (b.montantPaye || 0), 0),
    impaye: invoices.filter((i: any) => i.statut === 'NON_PAYE').length,
    partiel: invoices.filter((i: any) => i.statut === 'PARTIEL').length,
  };

  return (
    <div>
      <SectionHeader
        title="Factures & Recouvrement"
        subtitle="Gestion des frais scolaires, minerval et encaissement Mobile Money"
        actions={
          <>
            <button className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }}>
              <Download className="w-3.5 h-3.5" /> Exporter CSV
            </button>
            <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>
              <Plus className="w-3.5 h-3.5" /> Facturation Groupée
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Facturé', val: `$${stats.total.toLocaleString()}`, color: '#6366f1', icon: DollarSign, sub: 'Année 2025-2026' },
          { label: 'Montant Encaissé', val: `$${stats.paye.toLocaleString()}`, color: '#10b981', icon: CheckCircle, sub: `${((stats.paye / stats.total) * 100).toFixed(1)}% du total` },
          { label: 'Comptes en Retard', val: String(stats.impaye), color: '#ef4444', icon: XCircle, sub: 'Non payés' },
          { label: 'Paiements Partiels', val: String(stats.partiel), color: '#f59e0b', icon: AlertTriangle, sub: 'À relancer' },
        ].map(s => (
          <div
            key={s.label}
            className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}12` }}>
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[18px] font-black text-slate-900 leading-tight">{s.val}</p>
              <p className="text-[10px] font-semibold text-slate-400">{s.label}</p>
              <p className="text-[9px] text-slate-300 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de recouvrement globale */}
      <div
        className="p-4 rounded-2xl mb-6 flex items-center gap-5"
        style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <div className="flex-1">
          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
            <span>Taux de Recouvrement Global</span>
            <span className="text-indigo-700">{((stats.paye / stats.total) * 100).toFixed(1)}%</span>
          </div>
          <div className="progress-bar" style={{ height: '8px' }}>
            <div
              className="progress-fill"
              style={{
                width: `${(stats.paye / stats.total) * 100}%`,
                background: 'linear-gradient(90deg, #6366f1, #818cf8)',
              }}
            />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[11px] text-indigo-600 font-semibold">Objectif: 95%</p>
          <p className="text-[10px] text-slate-400">Ecart: $<strong>{(stats.total - stats.paye).toLocaleString()}</strong></p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Nom élève, numéro de facture..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 py-2 text-[13px]"
          />
        </div>
        <CustomSelect
          options={[
            { value: '', label: 'Tous les statuts' },
            { value: 'PAYE', label: 'Soldés' },
            { value: 'PARTIEL', label: 'Partiels' },
            { value: 'NON_PAYE', label: 'Impayés' },
          ]}
          value={filterStatus}
          onChange={val => setFilterStatus(val)}
          className="w-44"
        />
      </div>

      {/* Table */}
      <div className="section-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>N° Facture</th>
              <th>Élève</th>
              <th>Classe</th>
              <th>Montant Total</th>
              <th>Payé</th>
              <th>Progression</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const pct = (inv.montantPaye / inv.montantTotal) * 100;
              return (
                <tr key={inv.id}>
                  <td>
                    <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {inv.numeroFacture}
                    </span>
                  </td>
                  <td className="font-bold text-slate-900 text-[13px]">{inv.nomEleve}</td>
                  <td className="text-[12px] text-slate-600">{inv.nomClasse}</td>
                  <td className="font-bold text-slate-900">${inv.montantTotal} {inv.devise}</td>
                  <td className="font-bold text-emerald-600">${inv.montantPaye}</td>
                  <td>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="progress-bar flex-1">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct === 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 flex-shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>{invoiceStatusBadge(inv.statut)}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 transition-colors"
                        title="Voir détail"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      {inv.statut !== 'PAYE' && (
                        <button
                          onClick={() => setPayingInvoice(inv)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                          style={{ background: 'rgba(99,102,241,0.10)', color: '#4f46e5' }}
                        >
                          <DollarSign className="w-3 h-3" /> Encaisser
                        </button>
                      )}
                      <button
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-50 transition-colors"
                        title="Imprimer reçu"
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

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 font-medium text-sm">Aucune facture trouvée</p>
          </div>
        )}
      </div>

      {/* Historique des paiements */}
      <div className="section-card mt-6">
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-slate-900">Historique des Transactions</h3>
          <span className="badge badge-brand">{mockPayments.length} transactions</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Reçu</th>
              <th>Élève / Matricule</th>
              <th>Moyen</th>
              <th>Référence</th>
              <th>Montant</th>
              <th>Caissier</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {mockPayments.map(p => (
              <tr key={p.id}>
                <td>
                  <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                    {p.numeroRecu}
                  </span>
                </td>
                <td>
                  <p className="font-bold text-[12px] text-slate-900">{p.nomEleve}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{p.registrationNumber}</p>
                </td>
                <td>{methodBadge(p.moyenPaiement)}</td>
                <td>
                  <span className="font-mono text-[10px] text-slate-500">{p.reference}</span>
                </td>
                <td className="font-black text-[14px] text-emerald-700">
                  ${p.montantPaye}
                </td>
                <td className="text-[11px] text-slate-600">{p.nomCaissier}</td>
                <td className="text-[11px] text-slate-400">{p.dateCreation.split(' ')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {payingInvoice && (
        <PaymentModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
      )}
    </div>
  );
};

// ─── PAYROLL TAB ──────────────────────────────────────────────────────────

const PayrollTab: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('07-2026');

  const totalMasse = mockStaff.reduce((a, s) => a + (s.salaireBase || 0), 0);

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
          { label: 'Masse Salariale', val: `$${totalMasse.toLocaleString()}`, color: '#6366f1', icon: Wallet },
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
              const heureSupp = [0, 150, 0, 200][i % 4];
              const prime = [100, 0, 80, 0][i % 4];
              const retenue = Math.round((s.salaireBase || 0) * 0.15);
              const net = (s.salaireBase || 0) + heureSupp + prime - retenue;
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
                  <td className="font-bold text-slate-900">${(s.salaireBase || 0).toLocaleString()}</td>
                  <td className="text-emerald-600 font-semibold">{heureSupp > 0 ? `+$${heureSupp}` : '—'}</td>
                  <td className="text-indigo-600 font-semibold">{prime > 0 ? `+$${prime}` : '—'}</td>
                  <td className="text-red-500 font-semibold">-${retenue}</td>
                  <td className="font-black text-[14px] text-slate-900">${net.toLocaleString()}</td>
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

// ─── EXPENSES TAB ────────────────────────────────────────────────────────

const ExpensesTab: React.FC = () => {
  const journalCaisse = [
    { id: 1, date: '30/07/2026', description: 'Encaissement Minerval — Gloire Kambale', type: 'ENTREE', montant: 280, caissier: 'Mme Chantal Bondo', categorie: 'MINERVAL' },
    { id: 2, date: '30/07/2026', description: 'Encaissement Minerval — Divine Bakamba (M-Pesa)', type: 'ENTREE', montant: 180, caissier: 'FlexPay Auto', categorie: 'MINERVAL' },
    { id: 3, date: '29/07/2026', description: 'Achat fournitures bureau (papeterie)', type: 'SORTIE', montant: 45, caissier: 'M. Patrice Kanyama', categorie: 'FOURNITURES' },
    { id: 4, date: '29/07/2026', description: 'Paiement facture électricité SNEL — Juillet', type: 'SORTIE', montant: 320, caissier: 'M. Patrice Kanyama', categorie: 'CHARGES' },
    { id: 5, date: '28/07/2026', description: 'Encaissement frais laboratoire — Naomie Nzuzi', type: 'ENTREE', montant: 45, caissier: 'Mme Chantal Bondo', categorie: 'LABORATOIRE' },
    { id: 6, date: '28/07/2026', description: 'Maintenance climatiseur salle des profs', type: 'SORTIE', montant: 120, caissier: 'M. Patrice Kanyama', categorie: 'MAINTENANCE' },
    { id: 7, date: '27/07/2026', description: 'Transport excursion 4ème Bio — Virunga', type: 'SORTIE', montant: 850, caissier: 'Prof. Alan Turing', categorie: 'ACTIVITES' },
  ];

  const totalEntrees = journalCaisse.filter(j => j.type === 'ENTREE').reduce((a, b) => a + b.montant, 0);
  const totalSorties = journalCaisse.filter(j => j.type === 'SORTIE').reduce((a, b) => a + b.montant, 0);
  const solde = totalEntrees - totalSorties;

  const tresoDonnees = [
    { jour: 'L', solde: 1200 },
    { jour: 'M', solde: 1450 },
    { jour: 'M', solde: 1180 },
    { jour: 'J', solde: 1680 },
    { jour: 'V', solde: 1890 },
    { jour: 'S', solde: 1720 },
  ];

  return (
    <div>
      <SectionHeader
        title="Caisse & Dépenses"
        subtitle="Journal de caisse chronologique · Bons de décaissement"
        actions={
          <>
            <button className="btn-secondary" style={{ fontSize: '12px', padding: '7px 14px' }}>
              <Download className="w-3.5 h-3.5" /> Export Comptable
            </button>
            <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px' }}>
              <Plus className="w-3.5 h-3.5" /> Nouveau Décaissement
            </button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Journal (8 colonnes) */}
        <div className="col-span-8 space-y-4">
          {/* Résumé */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Entrées', val: `$${totalEntrees}`, color: '#10b981', icon: ArrowDownLeft },
              { label: 'Total Sorties', val: `$${totalSorties}`, color: '#ef4444', icon: ArrowUpRight },
              { label: 'Solde de Caisse', val: `$${solde}`, color: solde >= 0 ? '#6366f1' : '#ef4444', icon: DollarSign },
            ].map(s => (
              <div
                key={s.label}
                className="p-4 rounded-xl"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}12` }}>
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">{s.label}</span>
                </div>
                <p className="text-[20px] font-black" style={{ color: s.color }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Journal */}
          <div className="section-card">
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-bold text-slate-900">Journal de Caisse — Juillet 2026</h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {journalCaisse.map(j => (
                <div key={j.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: j.type === 'ENTREE' ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)',
                    }}
                  >
                    {j.type === 'ENTREE'
                      ? <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                      : <ArrowUpRight className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[13px] text-slate-800 truncate">{j.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{j.date}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[10px] text-slate-400">{j.caissier}</span>
                      <span className="badge badge-neutral" style={{ fontSize: '9px' }}>{j.categorie}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p
                      className="font-black text-[14px]"
                      style={{ color: j.type === 'ENTREE' ? '#059669' : '#dc2626' }}
                    >
                      {j.type === 'ENTREE' ? '+' : '-'}${j.montant}
                    </p>
                  </div>
                  <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-200 flex-shrink-0">
                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graphique trésorerie (4 colonnes) */}
        <div className="col-span-4 space-y-4">
          <div className="section-card p-5">
            <h3 className="font-bold text-slate-900 mb-1">Trésorerie Semaine</h3>
            <p className="text-[11px] text-slate-400 mb-4">Évolution du solde de caisse</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tresoDonnees} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTreso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="jour" fontSize={10} stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
                  <Area type="monotone" dataKey="solde" stroke="#6366f1" strokeWidth={2} fill="url(#gradTreso)" dot={{ r: 3, fill: '#6366f1' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Répartition dépenses */}
          <div className="section-card p-5">
            <h3 className="font-bold text-slate-900 mb-4">Répartition Dépenses</h3>
            <div className="space-y-3">
              {[
                { label: 'Salaires Personnel', pct: 68, color: '#6366f1' },
                { label: 'Charges (SNEL, Eau)', pct: 14, color: '#f59e0b' },
                { label: 'Fournitures', pct: 8, color: '#10b981' },
                { label: 'Maintenance', pct: 6, color: '#ef4444' },
                { label: 'Activités & Sorties', pct: 4, color: '#8b5cf6' },
              ].map(d => (
                <div key={d.label}>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                    <span>{d.label}</span>
                    <span>{d.pct}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: '5px' }}>
                    <div className="progress-fill" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN MANAGER ────────────────────────────────────────────────────────

export const FinanceManager: React.FC<FinanceManagerProps> = ({ activeSubTab = 'invoices' }) => {
  const tabs = [
    { id: 'invoices', label: 'Factures & Recouvrement', icon: Receipt },
    { id: 'payroll', label: 'Paie du Personnel', icon: Wallet },
    { id: 'expenses', label: 'Caisse & Dépenses', icon: PieChart },
  ];

  const [localTab, setLocalTab] = useState(activeSubTab);

  React.useEffect(() => {
    setLocalTab(activeSubTab);
  }, [activeSubTab]);

  const renderTab = () => {
    switch (localTab) {
      case 'invoices': return <InvoicesTab />;
      case 'payroll':  return <PayrollTab />;
      case 'expenses': return <ExpensesTab />;
      default:         return <InvoicesTab />;
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
