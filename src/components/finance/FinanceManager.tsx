import React, { useState } from 'react';
import { 
  mockInvoices, 
  mockPayments, 
  mockFeeTypes,
  mockStudents
} from '../../data/mockData';
import { StudentInvoice, PaymentTransaction } from '../../types';
import { 
  Receipt, 
  CreditCard, 
  Smartphone, 
  Plus, 
  CheckCircle, 
  QrCode, 
  Printer, 
  DollarSign, 
  ShieldCheck,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FinanceManager: React.FC = () => {
  const [invoices, setInvoices] = useState<StudentInvoice[]>(mockInvoices);
  const [payments, setPayments] = useState<PaymentTransaction[]>(mockPayments);
  const [selectedInvoice, setSelectedInvoice] = useState<StudentInvoice | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentTransaction | null>(null);

  // Form states for payment simulation
  const [payMethod, setPayMethod] = useState<'FLEXPAY_MPESA' | 'FLEXPAY_ORANGE' | 'FLEXPAY_AIRTEL' | 'CASH' | 'FLUTTERWAVE_CARD'>('FLEXPAY_MPESA');
  const [phoneNumber, setPhoneNumber] = useState('+243 81 555 0192');
  const [payAmount, setPayAmount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenPayModal = (inv: StudentInvoice) => {
    setSelectedInvoice(inv);
    setPayAmount(inv.totalAmount - inv.paidAmount);
    setShowPayModal(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedInvoice) return;
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setShowPayModal(false);

      const newPaidAmount = selectedInvoice.paidAmount + payAmount;
      const newStatus = newPaidAmount >= selectedInvoice.totalAmount ? 'PAID' : 'PARTIAL';

      // Update invoice
      setInvoices(prev => prev.map(inv => inv.id === selectedInvoice.id ? {
        ...inv,
        paidAmount: newPaidAmount,
        status: newStatus
      } : inv));

      // Create payment transaction
      const newPayment: PaymentTransaction = {
        id: `pay-${Date.now()}`,
        invoiceId: selectedInvoice.id,
        studentName: selectedInvoice.studentName,
        registrationNumber: '2026-ED-0941',
        amountPaid: payAmount,
        currency: 'USD',
        paymentMethod: payMethod,
        reference: `FLEXPAY-TX-${Math.floor(100000000 + Math.random() * 900000000)}`,
        receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toLocaleString(),
        cashierName: payMethod.startsWith('FLEXPAY') ? 'FlexPay API RDC (Mobile Money)' : 'Caisse Centrique',
        qrCodeToken: `ECOLISA-VERIF-${Date.now()}`
      };

      setPayments([newPayment, ...payments]);
      setSelectedReceipt(newPayment);

      // Trigger confetti celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }, 1200);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestion Financière & Encaissement Mobile Money
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Passerelle de paiement FlexPay RDC (M-Pesa, Orange, Airtel Money) & Flutterwave (Cartes).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            FlexPay Webhook Live Engine
          </span>
        </div>
      </div>

      {/* Fee Types Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockFeeTypes.map(fee => (
          <div key={fee.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">{fee.tranche}</span>
              <h4 className="font-bold text-sm text-slate-900 mt-0.5">{fee.title}</h4>
            </div>
            <div className="text-lg font-extrabold text-indigo-600 font-mono">
              ${fee.amount}
            </div>
          </div>
        ))}
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-base">
            Factures de Scolarité & Minerval
          </h3>
          <span className="text-xs font-bold text-slate-500">
            {invoices.length} Factures Générées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-6">Réf Facture</th>
                <th className="py-3 px-6">Élève & Classe</th>
                <th className="py-3 px-6">Montant Total</th>
                <th className="py-3 px-6">Payé / Restant</th>
                <th className="py-3 px-6">Statut Paiement</th>
                <th className="py-3 px-6 text-right">Action Encaissement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {invoices.map((inv) => {
                const remaining = inv.totalAmount - inv.paidAmount;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{inv.studentName}</div>
                      <div className="text-[11px] text-slate-400">{inv.className} ({inv.academicYear})</div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-900 text-sm">
                      ${inv.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-4 px-6 font-mono">
                      <div className="text-emerald-700 font-bold">${inv.paidAmount.toFixed(2)} payé</div>
                      <div className="text-rose-600 text-[11px] font-medium">${remaining.toFixed(2)} restant</div>
                    </td>
                    <td className="py-4 px-6">
                      {inv.status === 'PAID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> PAYÉ EN TOTALITÉ
                        </span>
                      )}
                      {inv.status === 'PARTIAL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                          PAIEMENT PARTIEL
                        </span>
                      )}
                      {inv.status === 'UNPAID' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                          IMPAYÉ
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {inv.status !== 'PAID' ? (
                        <button
                          onClick={() => handleOpenPayModal(inv)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm text-xs transition-all flex items-center gap-1.5 ml-auto"
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Encaisser (Mobile Money)
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            const p = payments.find(pay => pay.invoiceId === inv.id) || payments[0];
                            setSelectedReceipt(p);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <Printer className="w-3.5 h-3.5" /> Voir Reçu QR
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE MONEY PAYMENT MODAL (FlexPay Simulation) */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Paiement FlexPay RDC (Mobile Money)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Facture: {selectedInvoice.invoiceNumber} • {selectedInvoice.studentName}
                </p>
              </div>
              <button 
                onClick={() => setShowPayModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Method */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Choisir le Moyen de Paiement :
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMethod('FLEXPAY_MPESA')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                    payMethod === 'FLEXPAY_MPESA'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">M-Pesa RDC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod('FLEXPAY_ORANGE')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                    payMethod === 'FLEXPAY_ORANGE'
                      ? 'border-orange-500 bg-orange-50 text-orange-900 font-bold ring-2 ring-orange-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span className="text-xs">Orange Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod('FLEXPAY_AIRTEL')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                    payMethod === 'FLEXPAY_AIRTEL'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-rose-600" />
                  <span className="text-xs">Airtel Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayMethod('FLUTTERWAVE_CARD')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                    payMethod === 'FLUTTERWAVE_CARD'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs">Visa / Mastercard</span>
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              {payMethod.startsWith('FLEXPAY') && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                    Numéro de Téléphone Client (RDC)
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
                  Montant à Payer (USD)
                </label>
                <input
                  type="number"
                  max={selectedInvoice.totalAmount - selectedInvoice.paidAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {/* Confirm Submit */}
            <button
              disabled={isProcessing || payAmount <= 0}
              onClick={handleConfirmPayment}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/20 text-sm transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <span>Validation USSD FlexPay en cours...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmer le Paiement USSD (${payAmount.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL WITH QR CODE */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">
                Reçu d'Encaissement Officiel
              </h3>
              <p className="text-xs font-mono text-indigo-600 font-bold mt-0.5">
                {selectedReceipt.receiptNumber}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Élève :</span>
                <span className="font-bold text-slate-900">{selectedReceipt.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Montant :</span>
                <span className="font-bold text-emerald-700">${selectedReceipt.amountPaid.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Moyen :</span>
                <span className="font-bold text-slate-900">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Réf FlexPay :</span>
                <span className="text-slate-700">{selectedReceipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date :</span>
                <span className="text-slate-700">{selectedReceipt.createdAt}</span>
              </div>
            </div>

            {/* QR Code Verification Simulation */}
            <div className="p-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-2">
              <QrCode className="w-20 h-20 text-slate-800" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Scannez pour vérifier la validité
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimer Reçu
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
