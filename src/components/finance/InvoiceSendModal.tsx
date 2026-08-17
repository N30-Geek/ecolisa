import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Mail,
  MessageSquare,
  Printer,
  Download,
  Share2,
  Send,
  Loader2,
  Smartphone,
  FileText,
  Check,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';
import { getInvoiceTotal, getPaymentAmount } from '../../utils/financeCalculations';
import type { FactureEleve, Eleve, TransactionPaiement, TypeFraisScolaire, HistoriqueEnvoiFacture } from '../../types';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

interface InvoiceSendModalProps {
  invoice: FactureEleve;
  student?: Eleve;
  payments?: TransactionPaiement[];
  feeTypes?: TypeFraisScolaire[];
  onClose: () => void;
}

export const InvoiceSendModal: React.FC<InvoiceSendModalProps> = ({ invoice, student, payments = [], feeTypes = [], onClose }) => {
  const { config, currency, format } = useSchoolConfig();
  const invTotal = getInvoiceTotal(invoice, currency);
  const invPaid = payments.reduce((a, p) => a + getPaymentAmount(p, currency), 0);
  const remaining = Math.max(0, invTotal - invPaid);

  const printRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoriqueEnvoiFacture[]>([]);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    loadHistory();
    return () => { document.body.style.overflow = prev; };
  }, []);

  const loadHistory = async () => {
    const h = await LocalDatabaseService.getInvoiceSendingHistory({ invoiceId: invoice.id });
    setHistory(h);
  };

  const generatePDF = async (): Promise<Blob | null> => {
    if (!printRef.current) return null;
    try {
      const html2canvasModule = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      return pdf.output('blob') as Blob;
    } catch (err) {
      console.error('Erreur génération PDF :', err);
      return null;
    }
  };

  const getOrCreatePDF = async () => {
    if (pdfBlob) return pdfBlob;
    const blob = await generatePDF();
    if (blob) setPdfBlob(blob);
    return blob;
  };

  const log = async (methode: HistoriqueEnvoiFacture['methode'], contact: string, status: 'SIMULE' | 'ENVOYE' | 'ERREUR', message: string, destinataire?: string) => {
    await LocalDatabaseService.addInvoiceSendingHistory({
      id: uuid(),
      invoiceId: invoice.id,
      methode,
      destinataire: destinataire || student?.nomParent || invoice.nomEleve,
      contact,
      statut: status,
      dateEnvoi: new Date().toISOString(),
      message,
    });
    loadHistory();
  };

  const handleDownload = async () => {
    setBusy('DOWNLOAD');
    const blob = await getOrCreatePDF();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Facture_${invoice.numeroFacture}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await log('DOWNLOAD', '', 'ENVOYE', 'PDF téléchargé localement');
    } else {
      await log('DOWNLOAD', '', 'ERREUR', 'Échec de la génération du PDF');
    }
    setBusy(null);
  };

  const handlePrint = async () => {
    setBusy('PRINT');
    const blob = await getOrCreatePDF();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.position = 'fixed';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {}
      };
      await log('PRINT', '', 'ENVOYE', 'PDF envoyé à l\'impression');
    } else {
      await log('PRINT', '', 'ERREUR', 'Échec de la génération du PDF');
    }
    setBusy(null);
  };

  const handleEmail = async () => {
    setBusy('EMAIL');
    const subject = encodeURIComponent(`Facture ${invoice.numeroFacture} - ${invoice.nomEleve}`);
    const body = encodeURIComponent(buildMessage());
    const email = student?.emailParent || '';
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    await log('EMAIL', email, 'SIMULE', body, student?.nomParent);
    setBusy(null);
  };

  const handleSMS = async () => {
    setBusy('SMS');
    const phone = (student?.telephoneParent || '').replace(/\s/g, '');
    const body = encodeURIComponent(buildShortMessage());
    window.location.href = `sms:${phone}?body=${body}`;
    await log('SMS', student?.telephoneParent || '', 'SIMULE', body, student?.nomParent);
    setBusy(null);
  };

  const handleWhatsApp = async () => {
    setBusy('WHATSAPP');
    const phone = (student?.telephoneParent || '').replace(/\D/g, '');
    const text = encodeURIComponent(buildMessage());
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    await log('WHATSAPP', student?.telephoneParent || '', 'SIMULE', text, student?.nomParent);
    setBusy(null);
  };

  const handleNativeShare = async () => {
    setBusy('SHARE');
    const blob = await getOrCreatePDF();
    if (!blob) {
      await log('SHARE', '', 'ERREUR', 'Échec de la génération du PDF');
      setBusy(null);
      return;
    }
    const file = new File([blob], `Facture_${invoice.numeroFacture}.pdf`, { type: 'application/pdf' });
    const shareData: any = {
      title: `Facture ${invoice.numeroFacture}`,
      text: buildShortMessage(),
      files: [file],
    };
    try {
      if ((navigator as any).canShare && (navigator as any).canShare(shareData)) {
        await (navigator as any).share(shareData);
        await log('SHARE', '', 'SIMULE', buildShortMessage());
      } else {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        await log('SHARE', '', 'SIMULE', buildShortMessage());
      }
    } catch (err) {
      console.warn('Partage natif non supporté ou annulé', err);
      await log('SHARE', '', 'SIMULE', buildShortMessage());
    }
    setBusy(null);
  };

  const buildMessage = () => {
    return `Bonjour,\n\nVeuillez trouver ci-joint la facture N° ${invoice.numeroFacture} de ${invoice.nomEleve} (${invoice.nomClasse}).\n\nMontant total : ${format(invTotal, invoice.devise)}\nPayé : ${format(invPaid, currency)}\nReste à payer : ${format(remaining, currency)}\nÉchéance : ${invoice.dateEcheance?.split('T')[0] || '—'}\n\nMerci de votre confiance.\n\n${config?.schoolName || 'ÉCOLISA'}`;
  };

  const buildShortMessage = () => {
    return `Facture ${invoice.numeroFacture} - ${invoice.nomEleve} - Total ${format(invTotal, invoice.devise)} - Reste ${format(remaining, currency)}. Échéance ${invoice.dateEcheance?.split('T')[0] || '—'}.`;
  };

  const statusIcon = (s?: string) => {
    if (s === 'ENVOYE') return <Check className="w-3 h-3 text-emerald-500" />;
    if (s === 'ERREUR') return <AlertTriangle className="w-3 h-3 text-rose-500" />;
    return <Clock className="w-3 h-3 text-amber-500" />;
  };

  const actionButtons = [
    { id: 'DOWNLOAD', label: 'Télécharger PDF', icon: Download, color: 'bg-indigo-600 hover:bg-indigo-700', onClick: handleDownload },
    { id: 'PRINT', label: 'Imprimer', icon: Printer, color: 'bg-slate-700 hover:bg-slate-800', onClick: handlePrint },
    { id: 'EMAIL', label: 'Email', icon: Mail, color: 'bg-sky-600 hover:bg-sky-700', onClick: handleEmail, disabled: !student?.emailParent },
    { id: 'SMS', label: 'SMS', icon: Smartphone, color: 'bg-emerald-600 hover:bg-emerald-700', onClick: handleSMS, disabled: !student?.telephoneParent },
    { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600 hover:bg-green-700', onClick: handleWhatsApp, disabled: !student?.telephoneParent },
    { id: 'SHARE', label: 'Partager natif', icon: Share2, color: 'bg-violet-600 hover:bg-violet-700', onClick: handleNativeShare },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-3xl border shadow-2xl p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-500">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black">Envoyer / Partager la facture</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{invoice.numeroFacture} · {invoice.nomEleve}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-sunken)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <h4 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Destinataire</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-bold" style={{ color: 'var(--text-muted)' }}>Parent/Tuteur :</span> {student?.nomParent || '—'}</p>
              <p><span className="font-bold" style={{ color: 'var(--text-muted)' }}>Email :</span> {student?.emailParent || '—'}</p>
              <p><span className="font-bold" style={{ color: 'var(--text-muted)' }}>Téléphone :</span> {student?.telephoneParent || '—'}</p>
              <p><span className="font-bold" style={{ color: 'var(--text-muted)' }}>Élève :</span> {invoice.nomEleve} ({invoice.nomClasse})</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <h4 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Récapitulatif</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Total</span><span className="font-black">{format(invTotal, invoice.devise)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Payé</span><span className="font-black text-emerald-600">{format(invPaid, currency)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Reste</span><span className={`font-black ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{format(remaining, currency)}</span></div>
              <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Échéance</span><span className="font-bold">{invoice.dateEcheance?.split('T')[0] || '—'}</span></div>
            </div>
          </div>
        </div>

        <p className="text-[11px] mb-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          Ces actions ouvrent les applications locales (messagerie, navigateur, etc.). L'envoi effectif dépend du service configuré sur l'appareil.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {actionButtons.map(a => (
            <button
              key={a.id}
              onClick={a.onClick}
              disabled={busy === a.id || a.disabled}
              className={`p-3 rounded-xl text-white text-[11px] font-black flex flex-col items-center justify-center gap-1.5 transition-all ${a.color} ${(busy === a.id || a.disabled) ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {busy === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <a.icon className="w-4 h-4" />}
              {a.label}
            </button>
          ))}
        </div>

        <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Historique d'envoi / partage</h4>
          {history.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aucune action d'envoi enregistrée.</p>}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between p-2.5 rounded-xl border text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  {statusIcon(h.statut)}
                  <div>
                    <p className="font-bold">{h.methode} <span style={{ color: 'var(--text-muted)' }}>{h.destinataire ? `— ${h.destinataire}` : ''}</span></p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{h.contact} · {h.dateEnvoi?.split('T')[0]} {h.dateEnvoi?.split('T')[1]?.slice(0, 5)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hidden A4 invoice template for PDF generation */}
      <div className="hidden">
        <div ref={printRef} className="relative bg-white text-slate-900 p-8 w-[210mm] min-h-[297mm] font-sans text-xs overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] z-0">
            {config?.logoUrl ? <img src={config.logoUrl} alt="" className="w-[180mm] max-h-[180mm] object-contain filter grayscale" /> : null}
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">{config?.schoolName || 'ÉCOLISA'}</h1>
                <p className="text-[10px] text-slate-600 font-semibold">{[config?.address, config?.subDivision, config?.province].filter(Boolean).join(', ')}</p>
                <p className="text-[10px] text-slate-600 font-semibold">Tél: {config?.phone || '—'} | Email: {config?.email || '—'}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md mb-1.5 shadow-sm">FACTURE ÉLÈVE</span>
                <p className="text-[11px] font-mono font-black text-slate-900">N° {invoice.numeroFacture}</p>
                <p className="text-[10px] text-slate-500 font-bold">Échéance : {invoice.dateEcheance?.split('T')[0] || '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-300 overflow-hidden shadow-xs">
              <table className="w-full text-[10.5px]">
                <tbody>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <td className="p-2.5 font-extrabold uppercase text-slate-500 w-1/4">Nom de l'Élève :</td>
                    <td className="p-2.5 font-black text-slate-900 text-sm w-1/4">{invoice.nomEleve}</td>
                    <td className="p-2.5 font-extrabold uppercase text-slate-500 w-1/4 border-l border-slate-200">Matricule :</td>
                    <td className="p-2.5 font-mono font-black text-indigo-700 w-1/4">{invoice.studentId || invoice.eleveId || '—'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-extrabold uppercase text-slate-500">Classe :</td>
                    <td className="p-2.5 font-bold text-slate-800">{invoice.nomClasse || '—'}</td>
                    <td className="p-2.5 font-extrabold uppercase text-slate-500 border-l border-slate-200">Année Scolaire :</td>
                    <td className="p-2.5 font-bold text-slate-800">{invoice.anneeScolaire || '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-2">Détail des lignes de frais</h4>
              <table className="w-full border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-black uppercase tracking-wider">
                    <th className="p-2.5 text-left rounded-tl-md">Désignation</th>
                    <th className="p-2.5 text-left">Catégorie</th>
                    <th className="p-2.5 text-right rounded-tr-md">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                  {(invoice.lignes || []).map((l, idx) => (
                    <tr key={idx} className="even:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900">{l.nom}</td>
                      <td className="p-2.5 text-slate-600 font-medium">{l.categorie?.replace(/_/g, ' ')}</td>
                      <td className="p-2.5 text-right font-mono font-black text-slate-900">{format(l.montant, l.devise || invoice.devise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <div className="w-72 space-y-1.5 text-[11px] p-3.5 rounded-xl bg-slate-50 border border-slate-300">
                <div className="flex justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-700"><span>TOTAL FACTURÉ :</span><span className="font-mono font-black text-slate-900">{format(invTotal, invoice.devise)}</span></div>
                <div className="flex justify-between border-b border-slate-200 pb-1.5 font-bold text-emerald-700"><span>TOTAL ENCAISSÉ :</span><span className="font-mono font-black text-emerald-700">{format(invPaid, currency)}</span></div>
                <div className="flex justify-between py-1 font-black text-xs" style={{ color: remaining > 0 ? '#b91c1c' : '#047857' }}><span>SOLDE RESTANT :</span><span className="font-mono text-sm">{format(remaining, currency)}</span></div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-300 flex items-end justify-between text-[10px] font-bold text-slate-700">
              <div><p className="font-black text-slate-900">Le Service de Comptabilité</p><div className="h-12" /></div>
              <div className="text-right"><p className="font-black text-slate-900">Parent / Tuteur</p><div className="h-12" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
