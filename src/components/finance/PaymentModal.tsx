import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CreditCard,
  Check,
  Loader2,
  Banknote,
  Smartphone,
  Wallet,
  User,
  AlertTriangle,
  ReceiptText,
  ChevronRight,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { FactureEleve, TransactionPaiement } from '../../types';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { getInvoiceTotal, getInvoicePaid } from '../../utils/financeCalculations';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { showToast } from '../common/ToastNotification';

interface PaymentModalProps {
  invoice: FactureEleve;
  onClose: () => void;
  onSaved?: (payment: TransactionPaiement) => void;
}

const METHOD_OPTIONS = [
  { value: 'CASH',              label: 'Espèces (Cash)' },
  { value: 'BANK',              label: 'Virement Bancaire' },
  { value: 'FLEXPAY_MPESA',     label: 'M-Pesa (FlexPay)' },
  { value: 'FLEXPAY_ORANGE',    label: 'Orange Money' },
  { value: 'FLEXPAY_AIRTEL',    label: 'Airtel Money' },
  { value: 'FLUTTERWAVE_CARTE', label: 'Carte Bancaire' },
];

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

const getFeePriority = (categorie: string) => {
  if (['FRAIS_INSCRIPTION','FRAIS_REINSCRIPTION','FRAIS_CARTE','FRAIS_CONNEXION','FRAIS_CONNEXES'].includes(categorie)) {
    return { code: 'P1', bg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
  }
  if (categorie === 'FRAIS_MINERVAL') {
    return { code: 'P2', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
  }
  if (['FRAIS_KITS_EQUIPEMENTS','FRAIS_UNIFORME','FRAIS_BUS','FRAIS_ACTIVITE','FRAIS_EXAMEN'].includes(categorie)) {
    return { code: 'P3', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
  }
  return { code: 'P4', bg: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' };
};

export const PaymentModal: React.FC<PaymentModalProps> = ({ invoice, onClose, onSaved }) => {
  const { currency, exchangeRate } = useSchoolConfig();
  const fmt = (n: number, src?: string) => formatCurrency(n, currency, src || currency, exchangeRate);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [method, setMethod] = useState<string>('CASH');
  const [reference, setReference] = useState('');
  const [caissier, setCaissier] = useState('Caissier');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linePayments, setLinePayments] = useState<Record<string, number>>({});
  const [invoicePayments, setInvoicePayments] = useState<TransactionPaiement[]>([]);

  useEffect(() => {
    LocalDatabaseService.getPayments(invoice.id).then(setInvoicePayments).catch(() => {});
  }, [invoice.id]);

  useEffect(() => {
    (window as any).electronAPI?.getCurrentSession?.().then((s: any) => {
      if (s?.nom) setCaissier(`${s.prenom || ''} ${s.nom}`.trim());
    }).catch(() => {});
  }, []);

  const enrichedLines = useMemo(() => {
    if (!invoice.lignes?.length) return [];
    return invoice.lignes.map(l => {
      const lMontant = convertCurrency(l.montant || 0, l.devise || invoice.devise, currency, exchangeRate);
      let paid = 0;
      for (const p of invoicePayments) {
        if (!p.allocations || p.allocations.length === 0) continue;
        const matches = p.allocations.filter(a =>
          a.feeTypeId &&
          a.feeTypeId === l.feeTypeId &&
          (!l.trancheId || a.trancheId === l.trancheId)
        );
        if (matches.length > 0) {
          paid += matches.reduce((s, a) => s + convertCurrency(a.montant, p.devise, currency, exchangeRate), 0);
        } else if (p.allocations.length === 1 && !p.allocations[0].feeTypeId) {
          // fallback : allocation globale répartie au prorata
          const totalPaid = getInvoicePaid(invoice, invoicePayments, currency);
          paid += (lMontant / (getInvoiceTotal(invoice, currency) || 1)) * totalPaid;
        }
      }
      const remaining = round2(Math.max(0, lMontant - paid));
      const montantDu = remaining <= 0.10 ? 0 : remaining;
      return { ...l, montantDu, prio: getFeePriority(l.categorie || '') };
    });
  }, [invoice, currency, exchangeRate, invoicePayments]);

  useEffect(() => {
    if (enrichedLines.length > 0) {
      const init: Record<string, number> = {};
      enrichedLines.forEach(l => { init[l.feeTypeId] = Math.round(l.montantDu * 100) / 100; });
      setLinePayments(init);
    }
  }, [enrichedLines]);

  const totalDu = useMemo(() =>
    enrichedLines.reduce((a, l) => a + l.montantDu, 0),
    [enrichedLines]
  );

  const totalPaidByLines = useMemo(() => {
    if (enrichedLines.length === 0) return linePayments['__global'] ?? 0;
    return enrichedLines.reduce((a, l) => a + (linePayments[l.feeTypeId] ?? 0), 0);
  }, [enrichedLines, linePayments]);

  const soldeRestant = Math.max(0, totalDu - totalPaidByLines);
  const hasLines = enrichedLines.length > 0;

  const setAll = () => {
    const all: Record<string, number> = {};
    enrichedLines.forEach(l => { all[l.feeTypeId] = Math.round(l.montantDu * 100) / 100; });
    setLinePayments(all);
  };

  const setP1Only = () => {
    const p1: Record<string, number> = {};
    enrichedLines.forEach(l => {
      p1[l.feeTypeId] = l.prio.code === 'P1' ? Math.round(l.montantDu * 100) / 100 : 0;
    });
    setLinePayments(p1);
  };

  const clearAll = () => {
    const none: Record<string, number> = {};
    enrichedLines.forEach(l => { none[l.feeTypeId] = 0; });
    setLinePayments(none);
  };

  const mandatoryP1Covered = enrichedLines
    .filter(l => l.prio.code === 'P1')
    .every(l => (linePayments[l.feeTypeId] || 0) >= l.montantDu - 0.001);

  const handleSubmit = async () => {
    if (totalPaidByLines <= 0) {
      setError('Veuillez saisir au moins un montant de paiement.');
      return;
    }
    if (totalPaidByLines > totalDu + 0.01) {
      setError(`Le montant encaissé (${fmt(totalPaidByLines)}) dépasse le reste dû (${fmt(totalDu)}).`);
      return;
    }
    setError(null);
    setLoading(true);

    const allocations = hasLines
      ? enrichedLines
          .filter(l => (linePayments[l.feeTypeId] || 0) > 0.001)
          .map(l => ({
            feeTypeId: l.feeTypeId,
            montant: round2(convertCurrency(linePayments[l.feeTypeId] || 0, currency, invoice.devise, exchangeRate)),
          }))
      : [{ feeTypeId: '', montant: round2(convertCurrency(totalPaidByLines, currency, invoice.devise, exchangeRate)) }];

    const paymentMontant = round2(allocations.reduce((a, alloc) => a + alloc.montant, 0));

    const payment: TransactionPaiement = {
      id: uuid(),
      anneeScolaireId: invoice.anneeScolaireId,
      invoiceId: invoice.id,
      eleveId: invoice.eleveId,
      studentId: invoice.studentId,
      nomEleve: invoice.nomEleve,
      registrationNumber: invoice.studentId,
      montantPaye: paymentMontant,
      devise: invoice.devise || 'USD',
      moyenPaiement: method as any,
      reference,
      numeroRecu: `R-${Date.now()}`,
      dateCreation: new Date().toISOString(),
      nomCaissier: caissier,
      jetonQrCode: `qr-${invoice.studentId}-${Date.now()}`,
      allocations,
    };

    await LocalDatabaseService.addPayment(payment);
    setLoading(false);
    showToast('Paiement enregistré avec succès !', `Encaissement N° ${payment.numeroRecu} de ${fmt(payment.montantPaye, payment.devise)} pour ${payment.nomEleve}.`, 'success');
    onSaved?.(payment);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] animate-scale-in"
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-2xl)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ReceiptText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Encaissement — Paiement de Frais</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {invoice.nomEleve}
                {invoice.nomClasse && <span> · {invoice.nomClasse}</span>}
                <span className="ml-1.5 font-mono text-indigo-500">#{invoice.numeroFacture}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* KPI Récap Facture */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Facturé</p>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {fmt(getInvoiceTotal(invoice, currency))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
              <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1">Déjà  Encaissé</p>
              <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                {fmt(getInvoicePaid(invoice, invoicePayments, currency))}
              </p>
            </div>
            <div className="p-3.5 rounded-xl border bg-rose-500/5 border-rose-500/20">
              <p className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 mb-1">Reste à  Payer</p>
              <p className="text-sm font-black text-rose-700 dark:text-rose-300">{fmt(totalDu)}</p>
            </div>
          </div>

          {/* Tableau individuel par ligne */}
          {hasLines && (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border-b" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Saisie Individuelle par Type de Frais
                  </p>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">Saisissez le montant encaissé pour chaque frais séparément.</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={setAll}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all cursor-pointer">
                    Solder Tout
                  </button>
                  <button type="button" onClick={setP1Only}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 transition-all cursor-pointer">
                    P1 Seuls
                  </button>
                  <button type="button" onClick={clearAll}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/25 transition-all cursor-pointer">
                    Tout à  0
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b text-[10px] font-black uppercase tracking-wider text-slate-400" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                      <th className="py-2 px-3">Prio.</th>
                      <th className="py-2 px-3">Type de Frais</th>
                      <th className="py-2 px-3 text-right">Dû</th>
                      <th className="py-2 px-3 text-right">Montant Payé</th>
                      <th className="py-2 px-3 text-right">Solde</th>
                      <th className="py-2 px-3 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {enrichedLines.map(l => {
                      const paid = linePayments[l.feeTypeId] ?? 0;
                      const solde = Math.max(0, l.montantDu - paid);
                      const isCovered = paid >= l.montantDu - 0.001;
                      const isPartial = paid > 0 && !isCovered;
                      return (
                        <tr key={l.id} className="transition-colors hover:bg-slate-500/5">
                          <td className="py-2.5 px-3">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${l.prio.bg}`}>{l.prio.code}</span>
                          </td>
                          <td className="py-2.5 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>{l.nom}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-500 dark:text-slate-400">{fmt(l.montantDu)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <NumberInput
                                value={paid}
                                onChange={v => setLinePayments(prev => ({ ...prev, [l.feeTypeId]: Math.max(0, v) }))}
                                min={0}
                                max={l.montantDu}
                                step={0.01}
                                placeholder="0"
                                className="w-24 px-2 py-1 text-right text-xs font-mono font-black border rounded-lg"
                                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                              />
                              <button type="button"
                                onClick={() => setLinePayments(prev => ({ ...prev, [l.feeTypeId]: Math.round(l.montantDu * 100) / 100 }))}
                                className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20 cursor-pointer">
                                Max
                              </button>
                              <button type="button"
                                onClick={() => setLinePayments(prev => ({ ...prev, [l.feeTypeId]: 0 }))}
                                className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 cursor-pointer">
                                0
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {solde > 0.001 ? fmt(solde) : <span className="text-emerald-600">—</span>}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              isCovered ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : isPartial ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            }`}>
                              {isCovered ? 'âœ“ SOLDÉ' : isPartial ? 'â—‘ PARTIEL' : 'âœ— ATTENTE'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Récap 3 colonnes */}
              <div className="grid grid-cols-3 gap-3 p-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                <div className="p-2.5 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                  <p className="text-[9.5px] font-black uppercase text-slate-400">Total Dû</p>
                  <p className="text-sm font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{fmt(totalDu)}</p>
                </div>
                <div className="p-2.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-[9.5px] font-black uppercase text-emerald-600 dark:text-emerald-400">Encaissé</p>
                  <p className="text-sm font-black mt-0.5 text-emerald-700 dark:text-emerald-300">{fmt(totalPaidByLines)}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${soldeRestant > 0.001 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                  <p className={`text-[9.5px] font-black uppercase ${soldeRestant > 0.001 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Solde Restant</p>
                  <p className={`text-sm font-black mt-0.5 ${soldeRestant > 0.001 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{fmt(soldeRestant)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Fallback sans lignes */}
          {!hasLines && (
            <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Montant Encaissé ({currency})</label>
              <NumberInput
                value={linePayments['__global'] ?? totalDu}
                onChange={v => setLinePayments({ __global: Math.max(0, v) })}
                min={0}
                step={0.01}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-black"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          )}

          {/* Mode + Référence + Caissier */}
          <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-indigo-500" />Mode de Règlement & Caissier
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Mode de Paiement</label>
                <CustomSelect options={METHOD_OPTIONS} value={method} onChange={setMethod} />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>NÂ° Référence / Bordereau</label>
                <input
                  type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="NÂ° Transaction / Bordereau"
                  className="w-full px-3 py-2 rounded-lg border text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  <User className="w-3 h-3 inline mr-1 text-slate-400" />Nom Caissier
                </label>
                <input
                  type="text" value={caissier} onChange={e => setCaissier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Alerte P1 non couverts */}
          {hasLines && totalPaidByLines > 0 && !mandatoryP1Covered && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/8">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                Les frais prioritaires (P1) ne sont pas entièrement soldés. Le paiement partiel sera enregistré.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t shrink-0 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-500/10"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <X className="w-3.5 h-3.5" />Annuler
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Total à  encaisser</p>
              <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">{fmt(totalPaidByLines)}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading || totalPaidByLines <= 0}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {loading ? 'Enregistrement...' : 'Valider & Générer Reçu'}
              {!loading && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

