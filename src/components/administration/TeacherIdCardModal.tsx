import React, { useState } from 'react';
import { X, Printer, Download, School, CheckCircle2, Layers } from 'lucide-react';
import { TeacherIdCardRenderer } from './TeacherIdCardRenderer';
import { MembrePersonnel } from '../../types';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';

interface TeacherIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: MembrePersonnel;
}

export const TeacherIdCardModal: React.FC<TeacherIdCardModalProps> = ({
  isOpen,
  onClose,
  teacher,
}) => {
  const { config } = useSchoolConfig();
  const [face, setFace] = useState<'both' | 'front' | 'back'>('both');

  if (!isOpen) return null;

  const fileNameBase = `CartePro_${teacher.numeroMatriculeEPST || teacher.id}_${teacher.prenom}_${teacher.nom}`
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const element = document.getElementById('teacher-card-print-section');
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
    const element = document.getElementById('teacher-card-print-section');
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

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in overflow-y-auto"
      style={{ background: 'rgba(15, 23, 42, 0.75)' }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #teacher-card-print-section, #teacher-card-print-section * { visibility: visible !important; }
          #teacher-card-print-section {
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
        className="relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border text-slate-900 dark:text-white"
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
                Carte de Service Professionnelle d'Enseignant RDC
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {teacher.prenom} {teacher.nom} — EPST RDC
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-500/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR CONTROLES */}
        <div className="px-6 py-3 border-b flex items-center justify-between gap-3 no-print" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-400">Affichage :</span>
            <div className="flex gap-1">
              {[
                { id: 'both', label: 'Recto & Verso' },
                { id: 'front', label: 'Recto Seul' },
                { id: 'back', label: 'Verso Seul' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFace(f.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    face === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-500/10 text-slate-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPNG}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-500 text-xs font-bold hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> PNG HD
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-500 text-xs font-bold hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> PDF A4
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer Carte
            </button>
          </div>
        </div>

        {/* CARTE EN RENDU */}
        <div className="p-8 overflow-y-auto flex items-center justify-center min-h-[300px]">
          <div id="teacher-card-print-section">
            <TeacherIdCardRenderer
              teacher={teacher}
              schoolConfig={config}
              face={face}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t text-xs text-slate-400 flex items-center justify-between no-print" style={{ borderColor: 'var(--border)' }}>
          <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
            <CheckCircle2 className="w-4 h-4" /> Format carte bancaire certifié CR80 (85.6mm × 53.98mm)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-500/30 text-xs font-bold hover:bg-slate-500/10 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
