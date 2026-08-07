import React, { useEffect, useMemo, useState } from 'react';
import { X, CreditCard, Check, Loader2 } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { FactureEleve, LigneFacture, TransactionPaiement } from '../../types';
import { convertCurrency } from '../../utils/currency';

interface PaymentModalProps {
  invoice: FactureEleve;
  onClose: () => void;
  onSaved?: () => void;
}

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Virement bancaire' },
  { value: 'FLEXPAY_MPESA', label: 'M-Pesa' },
  { value: 'FLEXPAY_ORANGE', label: 'Orange Money' },
  { value: 'FLEXPAY_AIRTEL', label: 'Airtel Money' },
  { value: 'FLUTTERWAVE_CARTE', label: 'Carte bancaire' },
];

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, onClose, onSaved }) => {
  const { currency, exchangeRate, format } = useSchoolConfig();
  const remaining = useMemo(
    () => Math.max(0, convertCurrency((invoice.montantTotal || 0) - (invoice.montantPaye || 0), invoice.devise, currency, exchangeRate)),
    [invoice, currency, exchangeRate]
  );

  const [amount, setAmount] = useState<number>(remaining);
  const [method, setMethod] = useState<string>('CASH');
  const [reference, setReference] = useState('');
  const [caissier, setCaissier] = useState('Caissier');
  const [loading, setLoading] = useState(false);
  const [allocations, setAllocations] = useState<{ feeTypeId: string; montant: number }[]>([]);

  useEffect(() => {
    setAmount(remaining);
    if (invoice.lignes?.length) {
      const allocs: { feeTypeId: string; montant: number }[] = [];
      let left = remaining;
      const lignesUSD = invoice.lignes.map(l => ({
        ...l,
        dueUSD: convertCurrency(Math.max(0, (l.montant || 0) - (l.montantPaye || 0)), invoice.devise, currency, exchangeRate),
      }));
      for (const l of lignesUSD) {
        const alloc = Math.min(l.dueUSD, left);
        if (alloc > 0.001) allocs.push({ feeTypeId: l.feeTypeId, montant: convertCurrency(alloc, currency, invoice.devise, exchangeRate) });
        left -= alloc;
      }
      setAllocations(allocs);
    } else {
      setAllocations([{ feeTypeId: '', montant: convertCurrency(remaining, currency, invoice.devise, exchangeRate) }]);
    }
  }, [remaining, invoice, currency, exchangeRate]);

  useEffect(() => {
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
  }, []);

  const onAmountChange = (val: number) => {
    setAmount(val);
    if (!invoice.lignes?.length) {
      setAllocations([{ feeTypeId: '', montant: convertCurrency(val, currency, invoice.devise, exchangeRate) }]);
      return;
    }
    // redistribute proportionally
    const totalDue = invoice.lignes.reduce((a, l) => a + convertCurrency(Math.max(0, (l.montant || 0) - (l.montantPaye || 0)), invoice.devise, currency, exchangeRate), 0);
    if (totalDue === 0) return;
    let left = val;
    const allocs: { feeTypeId: string; montant: number }[] = [];
    const sorted = [...invoice.lignes];
    for (let i = 0; i < sorted.length; i++) {
      const l = sorted[i];
      const due = convertCurrency(Math.max(0, (l.montant || 0) - (l.montantPaye || 0)), invoice.devise, currency, exchangeRate);
      const share = i === sorted.length - 1 ? left : Math.min(due, Math.max(0, Math.round((val * due) / totalDue)));
      const alloc = Math.min(share, left);
      if (alloc > 0.001) allocs.push({ feeTypeId: l.feeTypeId, montant: convertCurrency(alloc, currency, invoice.devise, exchangeRate) });
      left -= alloc;
    }
    setAllocations(allocs);
  };

  const handleSubmit = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    const payment: TransactionPaiement = {
      id: uuid(),
      anneeScolaireId: invoice.anneeScolaireId,
      invoiceId: invoice.id,
      nomEleve: invoice.nomEleve,
      registrationNumber: invoice.studentId,
      montantPaye: convertCurrency(amount, currency, invoice.devise, exchangeRate),
      devise: invoice.devise || 'USD',
      moyenPaiement: method as any,
      reference,
      numeroRecu: `R-${Date.now()}`,
      dateCreation: new Date().toISOString(),
      nomCaissier: caissier,
      jetonQrCode: '',
      allocations: allocations.filter(a => a.montant > 0),
    };
    await LocalDatabaseService.addPayment(payment);
    setLoading(false);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full max-w-xl rounded-3xl border shadow-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.10)' }}>
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Paiement</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{invoice.nomEleve} · {invoice.numeroFacture}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:opacity-80 flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-2xl mb-5" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Reste à payer</p>
          <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{format(remaining, currency)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Montant reçu ({currency})</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={e => onAmountChange(Number(e.target.value))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm font-bold outline-none focus:ring-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Moyen de paiement</label>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Référence</label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="N° transaction"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>Caissier</label>
            <input
              type="text"
              value={caissier}
              onChange={e => setCaissier(e.target.value)}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {invoice.lignes && invoice.lignes.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Répartition par type de frais</label>
            <div className="space-y-2">
              {invoice.lignes.map(l => {
                const due = convertCurrency(Math.max(0, (l.montant || 0) - (l.montantPaye || 0)), invoice.devise, currency, exchangeRate);
                const alloc = allocations.find(a => a.feeTypeId === l.feeTypeId)?.montant || 0;
                const allocDisplay = convertCurrency(alloc, invoice.devise, currency, exchangeRate);
                return (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                    <div>
                      <p className="text-sm font-bold">{l.nom}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Reste: {format(due, currency)}</p>
                    </div>
                    <p className="text-sm font-black text-emerald-600">{format(allocDisplay, currency)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || amount <= 0}
          className="w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 transition-opacity"
          style={{ background: '#10b981', color: 'white', opacity: loading || amount <= 0 ? 0.6 : 1 }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {loading ? 'Enregistrement...' : 'Valider le paiement'}
        </button>
      </div>
    </div>
  );
};
