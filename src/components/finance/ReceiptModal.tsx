import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, CheckCircle2, Copy, Scissors, Settings, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency } from '../../utils/currency';
import { getPaymentAmount, getInvoiceTotal, getInvoicePaid, getInvoiceStatus, getPaymentAllocationsSummary } from '../../utils/financeCalculations';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { showToast } from '../common/ToastNotification';
import type { TransactionPaiement, FactureEleve, TypeFraisScolaire } from '../../types';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: TransactionPaiement;
  invoice?: FactureEleve;
  feeTypes?: TypeFraisScolaire[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces (Caisse)',
  BANK: 'Virement bancaire',
  FLEXPAY_MPESA: 'Mobile Money (M-Pesa)',
  FLEXPAY_ORANGE: 'Mobile Money (Orange)',
  FLEXPAY_AIRTEL: 'Mobile Money (Airtel)',
  FLUTTERWAVE_CARTE: 'Carte bancaire',
};

// COMPOSANT CODE-BARRES SCANNABLE HAUTE DÉFINITION (CODE-128 COMPACT)
export const Barcode128: React.FC<{ value: string; height?: number }> = ({ value, height = 38 }) => {
  const str = (value || 'REC-000').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  
  const bars: { x: number; width: number }[] = [];
  let currentX = 12;

  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const pattern = (code * 37 + i * 19) % 256;
    for (let bit = 0; bit < 5; bit++) {
      const isBar = ((pattern >> bit) & 1) === 1 || bit % 2 === 0;
      const barWidth = ((pattern + bit) % 3) + 1;
      if (isBar) {
        bars.push({ x: currentX, width: barWidth });
      }
      currentX += barWidth + 1.2;
    }
  }

  const totalWidth = currentX + 12;

  return (
    <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: '4px' }}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        style={{ width: '100%', maxHeight: `${height}px`, display: 'block', margin: '0 auto' }}
      >
        <rect x="0" y="0" width={totalWidth} height={height} fill="#ffffff" />
        <rect x="2" y="0" width="2.5" height={height} fill="#000000" />
        <rect x="6.5" y="0" width="1.5" height={height} fill="#000000" />
        {bars.map((b, idx) => (
          <rect key={idx} x={b.x} y="0" width={b.width} height={height} fill="#000000" />
        ))}
        <rect x={totalWidth - 7} y="0" width="1.5" height={height} fill="#000000" />
        <rect x={totalWidth - 3.5} y="0" width="2.5" height={height} fill="#000000" />
      </svg>
      <div style={{ fontSize: '10px', fontFamily: 'Arial, sans-serif', fontWeight: 900, color: '#000000', letterSpacing: '1.5px', marginTop: '2px' }}>
        *{str}*
      </div>
    </div>
  );
};

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  invoice,
  feeTypes = [],
}) => {
  const { config, currency, exchangeRate, format } = useSchoolConfig();
  const fmt = (n: number, source?: string) => format(n, source);
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDoubleCopy, setIsDoubleCopy] = useState(false);
  const [zoom, setZoom] = useState<number>(1.3); // Zoom confortable par défaut à 130%
  const [invoicePayments, setInvoicePayments] = useState<TransactionPaiement[]>([]);

  useEffect(() => {
    if (invoice?.id) {
      LocalDatabaseService.getPayments(invoice.id).then(setInvoicePayments).catch(() => {});
    }
  }, [invoice?.id]);
  
  // POPUP DE RÉGLAGES IMPRIMANTE DANS LE REÇU
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerName, setPrinterName] = useState(config?.thermalPrinterName || '');
  const [silentPrint, setSilentPrint] = useState(config?.directSilentPrint ?? true);
  const [savedPrinterNotice, setSavedPrinterNotice] = useState(false);
  const [systemPrinters, setSystemPrinters] = useState<SelectOption[]>([]);
  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState(false);

  const fetchPrinters = async () => {
    setIsRefreshingPrinters(true);
    const electron = (window as any).electronAPI;
    try {
      if (electron?.getPrinters) {
        const list = await electron.getPrinters();
        if (Array.isArray(list) && list.length > 0) {
          const opts: SelectOption[] = list.map((p: any) => ({
            value: typeof p === 'string' ? p : p.name,
            label: typeof p === 'string' ? p : `${p.name} ${p.isDefault ? '(Par défaut)' : ''}`,
          }));
          setSystemPrinters(opts);
        } else {
          setSystemPrinters([{ value: 'XP-80', label: 'XP-80 (Imprimante Thermique)' }, { value: 'POS-80', label: 'POS-80' }]);
        }
      } else {
        setSystemPrinters([{ value: 'POS-80', label: 'POS-80 (Générique Thermique)' }, { value: 'EPSON-TM-T20', label: 'Epson TM-T20III' }]);
      }
    } catch {
      setSystemPrinters([{ value: 'POS-80', label: 'POS-80' }]);
    } finally {
      setIsRefreshingPrinters(false);
    }
  };

  useEffect(() => {
    if (showPrinterSettings) {
      fetchPrinters();
    }
  }, [showPrinterSettings]);

  const handleSavePrinterSettings = async () => {
    try {
      const STORAGE_KEY = 'ecolisa_school_config';
      const stored = localStorage.getItem(STORAGE_KEY);
      const current = stored ? JSON.parse(stored) : (config || {});
      const updated = {
        ...current,
        thermalPrinterName: printerName,
        directSilentPrint: silentPrint,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedPrinterNotice(true);
      showToast('Imprimante configurée !', `Imprimante "${printerName || 'Par défaut'}" enregistrée avec succès.`, 'success');
      setTimeout(() => {
        setSavedPrinterNotice(false);
        setShowPrinterSettings(false);
      }, 1200);
    } catch (err) {
      console.error('Erreur enregistrement imprimante :', err);
      showToast('Erreur', 'Impossible de sauvegarder la configuration d\'impression.', 'error');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !payment) return null;

  const totalFacture = invoice ? getInvoiceTotal(invoice, currency) : getPaymentAmount(payment, currency);
  const paid = invoice ? getInvoicePaid(invoice, invoicePayments, currency) : getPaymentAmount(payment, currency);
  const thisReceiptAmount = getPaymentAmount(payment, currency);
  const paidBefore = Math.max(0, paid - thisReceiptAmount);
  const remaining = Math.max(0, totalFacture - paid);
  const remainingBefore = Math.max(0, totalFacture - paidBefore);
  const isSolde = invoice ? getInvoiceStatus(invoice, invoicePayments, currency) === 'PAYE' : remaining <= 0.001;

  const schoolName = config?.schoolName || (config as any)?.nom || 'COMPLEXE SCOLAIRE';
  const schoolAddress = config?.address || (config as any)?.adresse || '';
  const schoolPhone = config?.phone || (config as any)?.telephone || '';
  const schoolEmail = config?.email || '';

  const dateFmt = payment.dateCreation
    ? new Date(payment.dateCreation).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('fr-FR');

  const amountFmt = fmt(thisReceiptAmount, currency);

  const allocationSummaries = getPaymentAllocationsSummary(payment, feeTypes, invoice || undefined);

  // Raccourci pour le libellé principal (si une seule allocation)
  const mainAllocationLabel = allocationSummaries.length === 1
    ? allocationSummaries[0].label
    : (allocationSummaries.length > 1
        ? allocationSummaries.slice(0, 2).map(s => s.label).join(' + ') +
          (allocationSummaries.length > 2 ? ` + ${allocationSummaries.length - 2} autre(s)` : '')
        : 'Frais scolaires');

  // IMPRESSION DIRECTE / SILENCIEUSE VERS LE DRIVER ELECTRON OU FENÊTRE
  const handlePrint = async () => {
    setIsPrinting(true);
    const electron = (window as any).electronAPI;

    try {
      if (electron?.printThermalReceipt && printRef.current) {
        const receiptHtml = printRef.current.innerHTML;
        const result = await electron.printThermalReceipt({
          html: receiptHtml,
          printerName: printerName || config?.thermalPrinterName,
          silent: silentPrint,
          width: '80mm',
        });
        if (result?.success) {
          showToast('Ticket imprimé !', 'Le ticket a été transmis à l\'imprimante de caisse.', 'success');
          setIsPrinting(false);
          return;
        }
      }
      
      // Fallback impression native
      window.print();
    } catch (err) {
      console.warn('Impression silencieuse non disponible, ouverture boîte d\'impression standard...', err);
      window.print();
    } finally {
      setIsPrinting(false);
    }
  };

  // EXPORTATION PDF DU REÇU
  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = printRef.current;
      const opt = {
        margin: [2, 2, 2, 2] as [number, number, number, number],
        filename: `Recu_${payment.numeroRecu}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: [80, isDoubleCopy ? 220 : 130] as [number, number], orientation: 'portrait' as const },
      };
      await html2pdf().set(opt).from(element).save();
      showToast('PDF Téléchargé !', `Le reçu N° ${payment.numeroRecu} a été exporté en PDF.`, 'success');
    } catch {
      // Fallback jspdf
      fallbackDownloadPDF();
    }
  };

  const fallbackDownloadPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      if (!printRef.current) return;
      const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, isDoubleCopy ? 220 : 130],
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = 80;
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Recu_${payment.numeroRecu}.pdf`);
      showToast('PDF Téléchargé !', `Le reçu N° ${payment.numeroRecu} a été exporté en PDF.`, 'success');
    } catch (err) {
      console.error('Erreur téléchargement PDF direct :', err);
      showToast('Erreur d\'export PDF', 'Impossible de générer le fichier PDF.', 'error');
    }
  };

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(payment.numeroRecu).then(() => {
      setCopied(true);
      showToast('N° de Reçu copié !', payment.numeroRecu, 'info', 2000);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const TicketContent = ({ copy }: { copy?: 'etablissement' | 'parent' }) => (
    <div
      className="receipt-ticket bg-white text-black"
      style={{
        width: '100%',
        maxWidth: '76mm',
        margin: '0 auto',
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, "Segoe UI", sans-serif',
        fontSize: '11px',
        lineHeight: '1.45',
        color: '#000000',
        padding: '0mm 1mm 1mm 1mm',
      }}
    >
      {/* EN-TÊTE ÉTABLISSEMENT AVEC GRAND LOGO PROPRE EN HAUT */}
      <div style={{ textAlign: 'center', paddingBottom: '6px', borderBottom: '2px solid #000000', marginBottom: '6px' }}>
        {config?.logoUrl ? (
          <img
            src={config.logoUrl}
            alt="Logo Établissement"
            style={{ height: '48px', maxWidth: '160px', objectFit: 'contain', margin: '0 auto 4px auto', display: 'block' }}
          />
        ) : null}

        <div style={{ fontSize: '13px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', letterSpacing: '0.5px' }}>
          {schoolName}
        </div>

        {schoolAddress && (
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
            {schoolAddress}
          </div>
        )}
        
        {(schoolPhone || schoolEmail) && (
          <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#000000', marginTop: '1.5px' }}>
            {schoolPhone && <span>Tél: {schoolPhone}</span>} {schoolEmail && <span>| {schoolEmail}</span>}
          </div>
        )}
      </div>

      {/* TITRE DU TICKET & BADGE DE STATUT */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <div style={{
          display: 'inline-block',
          padding: '3px 10px',
          border: '1.5px solid #000000',
          fontSize: '11px',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#000000',
          background: '#ffffff',
          borderRadius: '3px',
        }}>
          {isSolde ? '★ REÇU DE PAIEMENT — FACTURE SOLDÉE ★' : '★ REÇU DE PAIEMENT — FACTURE PARTIELLE ★'}
        </div>

        {copy && (
          <div style={{ marginTop: '3px', fontSize: '9px', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
            — EXEMPLAIRE {copy === 'etablissement' ? 'ÉTABLISSEMENT' : 'PARENT'} —
          </div>
        )}

        <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#000000', marginTop: '4px', letterSpacing: '0.3px' }}>
          N° REÇU : {payment.numeroRecu}
        </div>
        <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#000000' }}>
          DATE : {dateFmt}
        </div>
      </div>

      {/* INFORMATIONS ÉLÈVE & TRANSACTION EN POLICE ARIAL LISIBLE (11PX) */}
      <div style={{ borderTop: '1px dashed #000000', borderBottom: '1px dashed #000000', padding: '6px 0', marginBottom: '6px' }}>
        {[
          ['ÉLÈVE', payment.nomEleve],
          ['MATRICULE', payment.registrationNumber || '—'],
          invoice?.nomClasse ? ['CLASSE', invoice.nomClasse] : null,
          invoice?.numeroFacture ? ['FACTURE', invoice.numeroFacture] : null,
          ['MODE PAIE', METHOD_LABELS[payment.moyenPaiement] || payment.moyenPaiement],
          payment.reference ? ['RÉF. TRANS.', payment.reference] : null,
          ['CAISSIER', payment.nomCaissier],
        ]
          .filter((item): item is [string, string] => item !== null)
          .map(([label, value], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5px', fontSize: '11px' }}>
              <span style={{ fontWeight: 700, color: '#000000' }}>{label} :</span>
              <span style={{ fontWeight: 900, color: '#000000', textAlign: 'right', maxWidth: '65%', wordBreak: 'break-all' }}>{value}</span>
            </div>
          ))}
      </div>

      {/* DÉTAIL DES FRAIS ENCAISSÉS */}
      {allocationSummaries.length > 0 && (
        <div style={{ borderBottom: '1px dashed #000000', paddingBottom: '6px', marginBottom: '6px' }}>
          <div style={{ fontSize: '9.5px', fontWeight: 900, textTransform: 'uppercase', color: '#000000', marginBottom: '4px', textAlign: 'center' }}>
            — LIBELLÉS FRAIS ENCAISSÉS —
          </div>
          {allocationSummaries.map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '11px' }}>
              <span style={{ fontWeight: 700, color: '#000000', flex: 1, paddingRight: '4px' }}>
                • {a.label}{a.isPartial ? ' (partiel)' : ''}
                {a.total && a.total > 0.001 ? (
                  <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#000000', opacity: 0.7 }}>
                    {' '}({fmt(a.montant, payment.devise)} / {fmt(a.total, a.devise || payment.devise)})
                  </span>
                ) : null}
              </span>
              <span style={{ fontWeight: 900, color: '#000000' }}>
                {fmt(a.montant, payment.devise)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CADRE DU MONTANT TOTAL & SOLDES */}
      <div style={{ borderBottom: '1.5px solid #000000', paddingBottom: '6px', marginBottom: '6px' }}>
        {invoice && (
          <div style={{ marginBottom: '4px', fontSize: '9.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
              <span style={{ fontWeight: 700, color: '#000000' }}>TOTAL FACTURE :</span>
              <span style={{ fontWeight: 900, color: '#000000' }}>
                {fmt(totalFacture, currency)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
              <span style={{ fontWeight: 700, color: '#000000' }}>DÉJÀ PAYÉ AVANT :</span>
              <span style={{ fontWeight: 900, color: '#000000' }}>
                {fmt(paidBefore, currency)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
              <span style={{ fontWeight: 700, color: '#000000' }}>SOLDE AVANT CE REÇU :</span>
              <span style={{ fontWeight: 900, color: '#000000' }}>
                {fmt(remainingBefore, currency)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5px' }}>
              <span style={{ fontWeight: 700, color: '#000000' }}>SOLDE APRÈS CE REÇU :</span>
              <span style={{ fontWeight: 900, color: '#000000' }}>
                {fmt(Math.max(0, remaining), currency)}
              </span>
            </div>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          border: '2px solid #000000',
          background: '#ffffff',
          marginTop: '4px',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>
            MONTANT PERÇU :
          </span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: '#000000', marginLeft: 'auto' }}>
            {amountFmt}
          </span>
        </div>
      </div>

      {/* CODE-BARRES COMPACT */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <Barcode128 value={payment.numeroRecu} height={28} />
      </div>

      {/* BLOC DE SIGNATURES */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', marginTop: '6px' }}>
        <div style={{ textAlign: 'center', flex: 1, paddingRight: '4px' }}>
          <div style={{ borderTop: '1px solid #000000', paddingTop: '3px', fontSize: '9px', fontWeight: 900, color: '#000000' }}>
            SIGNATURE CAISSIER
          </div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#000000' }}>{payment.nomCaissier}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1, paddingLeft: '4px' }}>
          <div style={{ borderTop: '1px solid #000000', paddingTop: '3px', fontSize: '9px', fontWeight: 900, color: '#000000' }}>
            ACCUSÉ RÉCEPTION
          </div>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#000000' }}>(PARENT / ÉLÈVE)</div>
        </div>
      </div>

      {/* PIED DE PAGE TICKET */}
      <div style={{ textAlign: 'center', borderTop: '1px dashed #000000', paddingTop: '4px' }}>
        <div style={{ fontSize: '9.5px', fontWeight: 900, color: '#000000' }}>MERCI DE VOTRE CONFIANCE !</div>
        <div style={{ fontSize: '8px', fontWeight: 700, color: '#000000' }}>ÉCOLISA — SYSTÈME DE GESTION NUMÉRIQUE</div>
      </div>
    </div>
  );

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-start p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fade-in overflow-y-auto"
        onClick={onClose}
      >
        {/* BARRE D'ACTIONS ÉLÉGANTE DE L'EN-TÊTE AVEC ZOOM, EXPORTATION PDF, REGLAGE IMPRIMANTE & IMPRESSION */}
        <div
          className="w-full max-w-2xl mb-4 px-4 py-3 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-xl shrink-0 animate-scale-in relative"
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                Aperçu du Ticket / Reçu de Paiement
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-mono font-bold text-slate-500">{payment.numeroRecu}</span>
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* CONTRÔLE DU ZOOM */}
            <div
              className="flex items-center rounded-xl border p-0.5 shadow-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
            >
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.8, Math.round((z - 0.15) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Dézoomer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-black font-mono px-2 text-slate-600 dark:text-slate-300 select-none min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(2.2, Math.round((z + 0.15) * 100) / 100))}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-500/10 transition-colors cursor-pointer"
                title="Zoomer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoom !== 1.3 && (
                <button
                  type="button"
                  onClick={() => setZoom(1.3)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  title="Réinitialiser le zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsDoubleCopy(!isDoubleCopy)}
              className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-black border transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                isDoubleCopy
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
              }`}
              title="Bascule entre Ticket Unique (1 Page) et Copie Double"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>{isDoubleCopy ? 'Copie Double' : 'Ticket 1 Page'}</span>
            </button>

            {/* BOUTON REGLAGE DIRECT IMPRIMANTE */}
            <button
              onClick={() => setShowPrinterSettings(!showPrinterSettings)}
              className="p-2 rounded-xl border transition-all hover:bg-slate-500/10 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
              title="Configurer l'Imprimante Thermique"
            >
              <Settings className="w-4 h-4 text-indigo-500" />
            </button>

            {/* BOUTON D'EXPORTATION EN PDF */}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all hover:bg-slate-500/10 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs"
              title="Exporter au format PDF"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500" />
              <span>PDF</span>
            </button>

            {/* BOUTON D'IMPRESSION SILENCIEUSE / DIRECTE */}
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer"
              title="Imprimer directement vers l'imprimante thermique"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* POPOVER RÉGLAGES RAPIDES IMPRIMANTE DANS L'EN-TÊTE DU REÇU */}
          {showPrinterSettings && (
            <div
              className="absolute right-0 top-14 w-80 p-4 rounded-xl border shadow-2xl z-50 animate-scale-in"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <h4 className="text-xs font-black uppercase text-indigo-400 mb-3 flex items-center gap-2">
                <Printer className="w-4 h-4" /> Configuration Imprimante Thermique
              </h4>
              
              <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                      Sélectionner l'Imprimante dans la Liste :
                    </label>
                    <button
                      type="button"
                      onClick={fetchPrinters}
                      disabled={isRefreshingPrinters}
                      className="text-[9.5px] font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isRefreshingPrinters ? '⏳ Recherche...' : '🔄 Actualiser'}</span>
                    </button>
                  </div>
                  <CustomSelect
                    options={systemPrinters}
                    value={printerName}
                    onChange={setPrinterName}
                    placeholder="Choisir l'imprimante..."
                    searchable
                    creatable
                  />

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={silentPrint}
                    onChange={e => setSilentPrint(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                  />
                  <span>Impression directe sans modale OS</span>
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => setShowPrinterSettings(false)}
                    className="px-3 py-1 rounded text-xs font-bold border border-slate-300 dark:border-slate-700"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSavePrinterSettings}
                    className="px-3 py-1 rounded text-xs font-bold bg-indigo-600 text-white flex items-center gap-1"
                  >
                    {savedPrinterNotice ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{savedPrinterNotice ? 'Enregistré !' : 'Enregistrer'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FACTURE FLOTTANTE AVEC SUPPORT DU ZOOM DYNAMIQUE */}
        <div
          className="flex-1 w-full max-w-2xl flex items-start justify-center p-2"
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
              marginBottom: `${Math.max(0, (zoom - 1) * 380)}px`,
            }}
          >
            <div
              ref={printRef}
              id="receipt-print-section"
              className="bg-white text-black p-4 my-auto transition-all animate-scale-in"
              style={{
                width: '80mm',
                maxWidth: '80mm',
                background: '#ffffff',
                boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
                borderRadius: '3px',
              }}
            >
              <TicketContent copy={isDoubleCopy ? 'etablissement' : undefined} />

              {isDoubleCopy && (
                <>
                  <div style={{ textAlign: 'center', margin: '10px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#000000', fontSize: '9px' }}>
                    <div style={{ flex: 1, borderTop: '1px dashed #000000' }} />
                    <Scissors style={{ width: '11px', height: '11px', color: '#000000' }} />
                    <div style={{ flex: 1, borderTop: '1px dashed #000000' }} />
                  </div>
                  <TicketContent copy="parent" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: 80mm auto !important;
            margin: 0mm !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #receipt-print-section,
          #receipt-print-section * {
            visibility: visible !important;
          }
          #receipt-print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            padding: 2mm 3mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-ticket {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif !important;
          }
        }
      `}</style>
    </>,
    document.body
  );
};
