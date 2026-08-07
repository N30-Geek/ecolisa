import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Printer, GraduationCap, CheckSquare, Users, AlertCircle } from 'lucide-react';
import { IdCardRenderer } from './IdCardRenderer';
import { Eleve, ClasseScolaire } from '../../types';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { LocalDatabaseService } from '../../services/localDatabase';

interface BulkIdCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Eleve[];
}

const A4_PAGE_WIDTH_MM = 210;
const A4_PAGE_HEIGHT_MM = 297;

export const BulkIdCardModal: React.FC<BulkIdCardModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const { config } = useSchoolConfig();
  const [face, setFace] = useState<'front' | 'back'>('front');
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [pageCount, setPageCount] = useState(0);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    LocalDatabaseService.getClasses().then((c) => {
      setClasses(c);
    });
  }, [isOpen]);

  const classOptions = useMemo(() => {
    const list = Array.from(new Set(students.map((s) => s.classId)))
      .filter(Boolean)
      .map((classId) => {
        const c = classes.find((cl) => cl.id === classId);
        const label = students.find((s) => s.classId === classId)?.nomClasse || classId;
        return { value: classId, label: c ? c.nom : label };
      });
    return [{ value: '', label: 'Toutes les classes' }, ...list];
  }, [students, classes]);

  const filtered = useMemo(() => {
    return selectedClassId ? students.filter((s) => s.classId === selectedClassId) : students;
  }, [students, selectedClassId]);

  const displayStudents = useMemo(() => {
    return filtered.filter((s) => selectedIds.has(s.id));
  }, [filtered, selectedIds]);

  useEffect(() => {
    setSelectedIds(new Set(filtered.map((s) => s.id)));
  }, [filtered]);

  useEffect(() => {
    const cardsPerPage = 12;
    setPageCount(Math.ceil(displayStudents.length / cardsPerPage));
  }, [displayStudents.length]);

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const generatePDF = async () => {
    if (!displayStudents.length) return;
    setIsGenerating(true);
    try {
      const html2pdfModule = await import('html2pdf.js').catch(() => null);
      if (!html2pdfModule) {
        setIsGenerating(false);
        return;
      }
      const html2pdf = (html2pdfModule as any).default || html2pdfModule;
      const opt = {
        margin: 0,
        filename: `Cartes_Eleves_${face === 'front' ? 'Recto' : 'Verso'}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      };
      await html2pdf().set(opt).from(printRef.current).save();
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePNG = async () => {
    if (!printRef.current || !displayStudents.length) return;
    setIsGenerating(true);
    try {
      const html2canvasModule = await import('html2canvas').catch(() => null);
      if (!html2canvasModule) return;
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Cartes_Eleves_${face === 'front' ? 'Recto' : 'Verso'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsGenerating(false);
    }
  };

  const pages = useMemo(() => {
    const perPage = 12;
    const p: Eleve[][] = [];
    for (let i = 0; i < displayStudents.length; i += perPage) {
      p.push(displayStudents.slice(i, i + perPage));
    }
    return p;
  }, [displayStudents]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #bulk-card-print-section, #bulk-card-print-section * { visibility: visible !important; }
          #bulk-card-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div
        className="relative w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Impression en masse des cartes élèves
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Sélection par classe ou individuelle · Export A4 PDF / PNG
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-500/10 text-slate-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRE D'ACTIONS */}
        <div
          className="px-6 py-3 border-b flex flex-wrap items-center gap-3 no-print"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {classOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setFace('front')} className={`px-3 py-1.5 text-[10px] font-black ${face === 'front' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}>Recto</button>
            <button onClick={() => setFace('back')} className={`px-3 py-1.5 text-[10px] font-black ${face === 'back' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}>Verso</button>
          </div>

          <button
            onClick={toggleSelectAll}
            className="px-3 py-1.5 rounded-xl border text-[10px] font-black flex items-center gap-1.5 transition-all hover:bg-slate-500/10"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {selectedIds.size === filtered.length ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>

          <div className="flex-1" />

          <button
            onClick={generatePNG}
            disabled={!displayStudents.length || isGenerating}
            className="px-3 py-2 rounded-xl bg-slate-600 text-white font-black text-xs shadow-md flex items-center gap-2 hover:bg-slate-500 transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> PNG A4
          </button>
          <button
            onClick={generatePDF}
            disabled={!displayStudents.length || isGenerating}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-md flex items-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> {isGenerating ? 'Génération...' : 'PDF A4'}
          </button>
        </div>

        {/* LISTE + PRÉVISUALISATION */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 no-print" style={{ background: 'var(--bg-surface)' }}>
          {/* LISTE */}
          <div className="lg:col-span-1 space-y-3" style={{ maxHeight: '60vh' }}>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              {filtered.length} élève{filtered.length !== 1 ? 's' : ''} · {selectedIds.size} sélectionné{selectedIds.size !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: '55vh' }}>
              {filtered.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                    selectedIds.has(s.id)
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-600/30 hover:bg-slate-500/5'
                  }`}
                  style={{ borderColor: 'var(--border)' }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onChange={() => toggleStudent(s.id)}
                    className="w-4 h-4 rounded border-slate-500 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black truncate" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom}</p>
                    <p className="text-[10px] text-slate-500 font-bold">{s.nomClasse} · {s.registrationNumber}</p>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className="p-6 text-center rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Aucun élève pour cette classe.</p>
                </div>
              )}
            </div>
          </div>

          {/* PRÉVISUALISATION A4 */}
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Prévisualisation A4 — {pageCount} page{pageCount !== 1 ? 's' : ''}</p>
            <div className="overflow-auto rounded-2xl border p-4 bg-slate-950/40" style={{ borderColor: 'var(--border)', maxHeight: '65vh' }}>
              <div ref={printRef} id="bulk-card-print-section" className="space-y-0">
                {pages.map((pageStudents, pageIndex) => (
                  <div
                    key={pageIndex}
                    className="bg-white shadow-lg mx-auto mb-4 relative overflow-hidden"
                    style={{
                      width: `${A4_PAGE_WIDTH_MM}mm`,
                      height: `${A4_PAGE_HEIGHT_MM}mm`,
                      padding: '8mm',
                      boxSizing: 'border-box',
                      pageBreakAfter: 'always',
                    }}
                  >
                    <div className="absolute top-2 left-4 text-[8px] text-slate-400 font-black uppercase tracking-wider">
                      {config?.schoolName} — Cartes {face === 'front' ? 'Recto' : 'Verso'} · Page {pageIndex + 1}/{pageCount}
                    </div>
                    <div className="pt-4 flex flex-wrap content-start gap-x-3 gap-y-2" style={{ height: '100%' }}>
                      {pageStudents.map((s) => (
                        <div
                          key={s.id}
                          className="relative"
                          style={{ width: '86mm', height: '118mm', overflow: 'hidden' }}
                        >
                          <div
                            className="absolute top-0 left-0"
                            style={{ transform: 'scale(0.48)', transformOrigin: 'top left' }}
                          >
                            <IdCardRenderer student={s} schoolConfig={config} face={face} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
