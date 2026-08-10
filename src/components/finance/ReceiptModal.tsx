import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, CheckCircle2, Copy, Scissors } from 'lucide-react';
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

const methodIcon = (m: string) => {
  if (m === 'CASH') return 'Cash';
  if (m === 'BANK') return 'Banque';
  if (m.startsWith('FLEXPAY_')) return 'Mobile';
  if (m === 'FLUTTERWAVE_CARTE') return 'Carte';
  return m;
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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const schoolName = config?.schoolName || 'ECOLISA';
  const schoolAddress = [config?.address, config?.subDivision, config?.province].filter(Boolean).join(', ');
  const schoolPhone = config?.phone || '';
  const schoolEmail = config?.email || '';

  const amountFmt = format(payment.montantPaye, payment.devise);
  const dateFmt = new Date(payment.dateCreation).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const dateShort = new Date(payment.dateCreation).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const totalFacture = invoice?.montantTotal || 0;
  const dejaEncaisse = invoice?.montantPaye || 0;
  const remaining = invoice ? Math.max(0, totalFacture - dejaEncaisse) : 0;
  const isSolde = remaining <= 0.001;

  const allocations = payment.allocations || [];
  const allocationLabel = (feeTypeId: string) => {
    const ft = feeTypes.find(f => f.id === feeTypeId);
    return ft?.nom || (feeTypeId ? `Frais #${feeTypeId.slice(-6)}` : 'Frais scolaire');
  };

  const qrValue = JSON.stringify({
    r: payment.numeroRecu,
    i: payment.invoiceId,
    e: payment.nomEleve,
    m: payment.montantPaye,
    d: payment.dateCreation.slice(0, 10),
  });

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
      if (!html2pdfModule) { window.print(); return; }
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      await html2pdf().set({
        margin: 2,
        filename: `Recu_${payment.numeroRecu}.pdf`,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 3, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: [80, 260] as any, orientation: 'portrait' as const },
      }).from(printRef.current).save();
    } catch { window.print(); }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(payment.numeroRecu).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // The actual printable ticket component (reused for both screen and print)
  const TicketContent = ({ copy }: { copy?: 'etablissement' | 'parent' }) => (
    <div
      className="receipt-ticket bg-white text-slate-900"
      style={{ width: '100%', maxWidth: '80mm', fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', fontSize: '11px', lineHeight: '1.5' }}
    >
      {/* School Header */}
      <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '2px dashed #cbd5e1', marginBottom: '10px' }}>
        {config?.logoUrl && (
          <img src={config.logoUrl} alt="Logo" style={{ height: '56px', objectFit: 'contain', marginBottom: '8px' }} />
        )}
        <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#1e293b' }}>
          {schoolName}
        </div>
        {schoolAddress && <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>{schoolAddress}</div>}
        <div style={{ fontSize: '9.5px', color: '#64748b', display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '2px' }}>
          {schoolPhone && <span>Tél. {schoolPhone}</span>}
          {schoolEmail && <span>Email {schoolEmail}</span>}
        </div>
      </div>

      {/* Title Band */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{
          display: 'inline-block',
          padding: '3px 14px',
          borderRadius: '999px',
          fontSize: '10.5px',
          fontWeight: 900,
          letterSpacing: '1px',
          textTransform: 'uppercase',
          background: isSolde ? '#dcfce7' : '#fef3c7',
          color: isSolde ? '#15803d' : '#92400e',
          border: `1px solid ${isSolde ? '#86efac' : '#fde68a'}`,
        }}>
          {isSolde ? '✓ REÇU DE PAIEMENT — SOLDÉ' : '◑ REÇU DE PAIEMENT — PARTIEL'}
        </div>
        {copy && (
          <div style={{ marginTop: '4px', fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
            — Copie {copy === 'etablissement' ? 'Établissement' : 'Parent / Élève'} —
          </div>
        )}
        <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#475569', marginTop: '4px' }}>
          N° {payment.numeroRecu}
        </div>
        <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>{dateFmt}</div>
      </div>

      {/* Élève & Info */}
      <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px' }}>
        {([
          ['Élève', payment.nomEleve],
          ['Matricule', payment.registrationNumber],
          invoice?.nomClasse ? ['Classe', invoice.nomClasse] : null,
          invoice?.numeroFacture ? ['N° Facture', invoice.numeroFacture] : null,
          ['Caissier', payment.nomCaissier],
          ['Mode', `${methodIcon(payment.moyenPaiement)} — ${METHOD_LABELS[payment.moyenPaiement] || payment.moyenPaiement}`],
          payment.reference ? ['Référence', payment.reference] : null,
        ] as Array<[string, string] | null>)
          .filter((item): item is [string, string] => item !== null)
          .map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#64748b' }}>{label}</span>
              <span style={{ fontWeight: 700, textAlign: 'right', maxWidth: '55%', wordBreak: 'break-all' }}>{value}</span>
            </div>
          ))}
      </div>

      {/* Détail des frais payés */}
      {allocations.length > 0 && (
        <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '5px', letterSpacing: '0.5px' }}>
            Détail des frais réglés
          </div>
          {allocations.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5px', fontSize: '10.5px' }}>
              <span style={{ color: '#475569', flex: 1, paddingRight: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                - {allocationLabel(a.feeTypeId)}
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {formatCurrency(a.montant, currency, payment.devise, exchangeRate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Récapitulatif Financier */}
      {invoice && (
        <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '5px', letterSpacing: '0.5px' }}>
            Récapitulatif Facture
          </div>
          {[
            ['Total Facturé', formatCurrency(totalFacture, currency, invoice.devise, exchangeRate), '#1e293b'],
            ['Payé ce jour', amountFmt, '#15803d'],
            ['Solde Restant', formatCurrency(Math.max(0, remaining), currency, invoice.devise, exchangeRate), remaining > 0.001 ? '#b45309' : '#15803d'],
          ].map(([label, value, color], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: '#475569' }}>{label}</span>
              <span style={{ fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total Principal */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: '8px', marginBottom: '10px',
        background: isSolde ? '#f0fdf4' : '#fffbeb',
        border: `1px solid ${isSolde ? '#86efac' : '#fde68a'}`,
      }}>
        <span style={{ fontSize: '11px', fontWeight: 900, color: isSolde ? '#15803d' : '#92400e', textTransform: 'uppercase' }}>
          PAYÉ CE JOUR
        </span>
        <span style={{ fontSize: '17px', fontWeight: 900, color: isSolde ? '#15803d' : '#92400e', fontFamily: 'monospace' }}>
          {amountFmt}
        </span>
      </div>

      {/* QR Code */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'inline-block', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
          <QRCode value={qrValue} size={80} level="M" />
        </div>
        <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '3px' }}>Scannez pour vérifier l'authenticité</div>
        <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#64748b', fontWeight: 700 }}>{payment.numeroRecu}</div>
      </div>

      {/* Signature ligne */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', marginTop: '4px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '20px', paddingTop: '3px', fontSize: '9px', color: '#64748b' }}>
            Signature Caissier
          </div>
          <div style={{ fontSize: '9px', fontWeight: 700 }}>{payment.nomCaissier}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ borderTop: '1px solid #cbd5e1', marginTop: '20px', paddingTop: '3px', fontSize: '9px', color: '#64748b' }}>
            Lu et approuvé
          </div>
          <div style={{ fontSize: '9px', color: '#94a3b8' }}>(Parent / Tuteur)</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', borderTop: '2px dashed #cbd5e1', paddingTop: '8px' }}>
        <div style={{ fontSize: '9.5px', color: '#64748b' }}>Merci de votre confiance</div>
        <div style={{ fontSize: '8.5px', color: '#94a3b8', marginTop: '2px' }}>
          Reçu généré par ECOLISA — Gestion Scolaire Numérique
        </div>
        <div style={{ fontSize: '8.5px', color: '#94a3b8' }}>{dateShort}</div>
      </div>
    </div>
  );

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-scale-in"
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)', maxHeight: '92vh', boxShadow: 'var(--shadow-2xl)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  {isSolde ? 'Reçu — Paiement Soldé ✓' : 'Reçu — Paiement Partiel ◑'}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-mono font-bold text-slate-400">{payment.numeroRecu}</p>
                  <button
                    onClick={handleCopyNumber}
                    className="text-[9px] px-1.5 py-0.5 rounded border font-bold transition-all cursor-pointer"
                    style={{ borderColor: 'var(--border)', color: copied ? '#10b981' : 'var(--text-muted)' }}
                    title="Copier le N° de reçu"
                  >
                    {copied ? '✓ Copié' : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                title="Imprimer"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimer
              </button>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:bg-slate-500/10 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                title="Télécharger PDF"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preview scroll */}
          <div className="p-5 overflow-y-auto flex-1 flex justify-center" style={{ background: 'var(--bg-sunken)' }}>
            <div ref={printRef} id="receipt-print-section">
              {/* Copie Établissement */}
              <TicketContent copy="etablissement" />

              {/* Séparateur coupe */}
              <div style={{ textAlign: 'center', margin: '8px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '9px' }}>
                <div style={{ flex: 1, borderTop: '1px dashed #cbd5e1' }} />
                <Scissors style={{ width: '11px', height: '11px' }} />
                <div style={{ flex: 1, borderTop: '1px dashed #cbd5e1' }} />
              </div>

              {/* Copie Parent */}
              <TicketContent copy="parent" />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-section,
          #receipt-print-section * { visibility: visible; }
          #receipt-print-section {
            position: fixed;
            left: 0; top: 0;
            width: 80mm;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: 80mm auto;
            margin: 4mm;
          }
        }
      `}</style>
    </>,
    document.body
  );
};

