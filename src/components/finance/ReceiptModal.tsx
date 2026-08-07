import React, { useRef, useState } from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency } from '../../utils/currency';
import type { TransactionPaiement, FactureEleve, TypeFraisScolaire } from '../../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: TransactionPaiement;
  invoice?: FactureEleve;
  feeTypes?: TypeFraisScolaire[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK: 'Virement bancaire',
  FLEXPAY_MPESA: 'M-Pesa',
  FLEXPAY_ORANGE: 'Orange Money',
  FLEXPAY_AIRTEL: 'Airtel Money',
  FLUTTERWAVE_CARTE: 'Carte bancaire',
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  invoice,
  feeTypes = [],
}) => {
  const { config, currency, exchangeRate, format } = useSchoolConfig();
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  if (!isOpen) return null;

  const schoolName = config?.schoolName || 'ECOLISA - Gestion Scolaire';
  const schoolAddress = [config?.address, config?.subDivision, config?.province].filter(Boolean).join(', ');
  const schoolPhone = config?.phone || '';
  const schoolEmail = config?.email || '';

  const amountFmt = format(payment.montantPaye, payment.devise);
  const dateFmt = new Date(payment.dateCreation).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const remaining = invoice
    ? Math.max(0, (invoice.montantTotal || 0) - (invoice.montantPaye || 0))
    : 0;

  const qrValue = JSON.stringify({
    r: payment.numeroRecu,
    i: payment.invoiceId,
    m: payment.montantPaye,
    d: payment.dateCreation,
  });

  const allocations = payment.allocations || [];

  const handlePrint = () => {
    setIsPrinting(true);
    const originalTitle = document.title;
    document.title = `Recu_${payment.numeroRecu}`;
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
      setIsPrinting(false);
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const html2pdfModule = await import('html2pdf.js').catch(() => null);
      if (!html2pdfModule) {
        window.print();
        return;
      }
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      const opt = {
        margin: 4,
        filename: `Recu_${payment.numeroRecu}.pdf`,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: [80, 220] as any, orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(printRef.current).save();
    } catch {
      //
    }
  };

  const allocationLabel = (feeTypeId: string) => {
    const ft = feeTypes.find(f => f.id === feeTypeId);
    return ft?.nom || feeTypeId;
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)' }}
      >
        <div
          className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black">Reçu de paiement</h3>
                <p className="text-[10px] font-bold text-slate-400">{payment.numeroRecu}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-indigo-500 transition-all"
                title="Imprimer"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownloadPDF}
                className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-indigo-500 transition-all"
                title="Télécharger PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-500 hover:text-rose-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <div
              ref={printRef}
              id="receipt-print-section"
              className="receipt-ticket bg-white text-slate-900 rounded-2xl border p-6 mx-auto"
              style={{ maxWidth: '80mm', borderColor: '#e2e8f0' }}
            >
              <div className="text-center border-b-2 border-dashed border-slate-300 pb-4 mb-4">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">{schoolName}</h2>
                {schoolAddress && <p className="text-[10px] text-slate-600 mt-0.5">{schoolAddress}</p>}
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-1">
                  {schoolPhone && <span>{schoolPhone}</span>}
                  {schoolPhone && schoolEmail && <span>·</span>}
                  {schoolEmail && <span>{schoolEmail}</span>}
                </div>
              </div>

              <div className="text-center mb-4">
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black border border-emerald-200">
                  RECU DE PAIEMENT
                </span>
                <p className="text-[10px] font-mono text-slate-500 mt-1.5">N° {payment.numeroRecu}</p>
                <p className="text-[10px] text-slate-500">{dateFmt}</p>
              </div>

              <div className="space-y-2 text-[11px] border-b border-dashed border-slate-300 pb-4 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Elève</span>
                  <span className="font-bold text-right">{payment.nomEleve}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Matricule</span>
                  <span className="font-mono font-bold">{payment.registrationNumber}</span>
                </div>
                {invoice?.numeroFacture && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Facture</span>
                    <span className="font-mono font-bold">{invoice.numeroFacture}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Caissier</span>
                  <span className="font-bold">{payment.nomCaissier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode</span>
                  <span className="font-bold">{METHOD_LABELS[payment.moyenPaiement] || payment.moyenPaiement}</span>
                </div>
                {payment.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Référence</span>
                    <span className="font-mono font-bold">{payment.reference}</span>
                  </div>
                )}
              </div>

              {allocations.length > 0 && (
                <div className="mb-4 border-b border-dashed border-slate-300 pb-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Répartition par frais</p>
                  <div className="space-y-1.5">
                    {allocations.map((a, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span className="text-slate-600 truncate pr-2">{allocationLabel(a.feeTypeId)}</span>
                        <span className="font-bold font-mono">
                          {formatCurrency(a.montant, currency, payment.devise, exchangeRate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100 mb-4">
                <span className="text-[11px] font-black text-emerald-700">TOTAL PAYE</span>
                <span className="text-lg font-black text-emerald-700">{amountFmt}</span>
              </div>

              {invoice && remaining > 0.001 && (
                <div className="text-center text-[10px] font-bold text-amber-600 mb-4">
                  Reste à payer sur la facture : {formatCurrency(remaining, currency, invoice.devise, exchangeRate)}
                </div>
              )}

              {invoice && remaining <= 0.001 && (
                <div className="text-center text-[10px] font-black text-emerald-600 mb-4">
                  Facture entièrement soldée
                </div>
              )}

              <div className="flex flex-col items-center justify-center mb-4">
                <QRCode value={qrValue} size={96} level="M" />
                <p className="text-[9px] text-slate-400 mt-2">Scannez pour vérifier l'authenticité</p>
              </div>

              <div className="text-center border-t border-dashed border-slate-300 pt-4">
                <p className="text-[10px] text-slate-500">Merci pour votre confiance</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Reçu généré par ECOLISA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-section,
          #receipt-print-section * {
            visibility: visible;
          }
          #receipt-print-section {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            width: 80mm;
            margin: 0;
            box-shadow: none;
            border: none;
          }
        }
      `}</style>
    </>
  );
};
