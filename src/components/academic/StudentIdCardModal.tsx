import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, School, CheckCircle2, Layers, Eye, RotateCw, FileText, Image } from 'lucide-react';
import { IdCardRenderer } from './IdCardRenderer';
import { Eleve } from '../../types';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';

interface StudentIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Eleve;
}

export const StudentIdCardModal: React.FC<StudentIdCardModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  const { config } = useSchoolConfig();
  const [activeTab, setActiveTab] = useState<'inner' | 'outer' | 'unfolded'>('inner');

  if (!isOpen) return null;

  const fileNameBase = `Carte_${student.registrationNumber || student.id}_${student.prenom}_${student.nom}`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');

  const handlePrint = () => window.print();

  const getPrintElement = () => document.getElementById('card-print-section');

  const handleDownloadPDF = async () => {
    const element = getPrintElement();
    if (!element) return;
    const html2pdfModule = await import('html2pdf.js').catch(() => null);
    if (!html2pdfModule) return;
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;
    const opt = {
      margin: 4,
      filename: `${fileNameBase}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleDownloadPNG = async () => {
    const element = getPrintElement();
    if (!element) return;
    const html2canvasModule = await import('html2canvas').catch(() => null);
    if (!html2canvasModule) return;
    const html2canvas = (html2canvasModule as any).default || html2canvasModule;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const link = document.createElement('a');
    link.download = `${fileNameBase}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const modalJSX = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in overflow-y-auto"
      style={{ background: 'rgba(15, 23, 42, 0.75)' }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #card-print-section, #card-print-section * { visibility: visible !important; }
          #card-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            gap: 16px;
            padding: 16px;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="relative w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border text-slate-900 dark:text-white"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Carte Officielle EPST RDC
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold">
                  Certifié
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Aperçu Recto / Verso · Export PDF / PNG
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-500/10 text-slate-500 dark:text-slate-300 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRE D'ACTIONS */}
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            {[
              { id: 'inner', icon: Eye, label: 'Recto' },
              { id: 'outer', icon: RotateCw, label: 'Verso' },
              { id: 'unfolded', icon: Layers, label: 'Recto + Verso' },
            ].map((t: any) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'hover:bg-slate-500/10'
                }`}
                style={{ color: activeTab === t.id ? '#ffffff' : 'var(--text-secondary)' }}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPNG}
              className="px-3 py-2 rounded-xl bg-slate-600 text-white font-black text-xs shadow-md flex items-center gap-2 hover:bg-slate-500 transition-all cursor-pointer"
            >
              <Image className="w-4 h-4" /> PNG
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md flex items-center gap-2 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </button>
          </div>
        </div>

        {/* ZONE CARTE */}
        <div
          className="p-6 overflow-y-auto flex-1 flex items-center justify-center"
          id="card-print-section"
          style={{ background: 'var(--bg-surface)' }}
        >
          {activeTab === 'inner' && (
            <IdCardRenderer student={student} schoolConfig={config} face="front" />
          )}

          {activeTab === 'outer' && (
            <IdCardRenderer student={student} schoolConfig={config} face="back" />
          )}

          {activeTab === 'unfolded' && (
            <div className="flex flex-wrap items-start justify-center gap-6">
              <IdCardRenderer student={student} schoolConfig={config} face="front" />
              <IdCardRenderer student={student} schoolConfig={config} face="back" />
            </div>
          )}
        </div>

        {/* PIED */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Prêt pour impression ou export
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-500/10 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-500/20 transition-all cursor-pointer border border-slate-500/20"
          >
            Fermer l'Aperçu
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};
