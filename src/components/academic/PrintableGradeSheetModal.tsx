import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText } from 'lucide-react';
import { Eleve } from '../../types';

interface PrintableGradeSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  disciplineName: string;
  domaineName?: string;
  teacherName?: string;
  anneeScolaire?: string;
  students: Eleve[];
  fullGradesMap?: Record<string, Record<string, number>>;
}

export const PrintableGradeSheetModal: React.FC<PrintableGradeSheetModalProps> = ({
  isOpen,
  onClose,
  className,
  disciplineName,
  domaineName = 'Domaine Général / EPST RDC',
  teacherName = 'MAOMBI B. Isaac Deodatus',
  anneeScolaire = '2025 - 2026',
  students,
  fullGradesMap = {}
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    const el = document.getElementById('printable-feuille-cotation');
    if (!el) return;
    import('html2pdf.js')
      .then((mod) => {
        const html2pdf = mod.default || mod;
        html2pdf()
          .set({
            margin: [2, 2, 2, 2],
            filename: `Feuille_Cotation_Officielle_${className}_${disciplineName}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
          })
          .from(el)
          .save();
      })
      .catch(() => window.print());
  };

  // Remplir jusqu'à au moins 35 ou 75 lignes si la classe a moins d'élèves
  const totalRowsCount = Math.max(35, students.length);
  const rows = Array.from({ length: totalRowsCount }).map((_, idx) => students[idx] || null);

  const S = {
    cell: {
      border: '1px solid #000',
      padding: '2px 1px',
      textAlign: 'center' as const,
      fontSize: '8px',
      fontFamily: 'monospace',
    },
    headerCellVertical: {
      border: '1px solid #000',
      padding: '2px 1px',
      textAlign: 'center' as const,
      fontSize: '7.5px',
      fontWeight: 900,
      writingMode: 'vertical-rl' as const,
      transform: 'rotate(180deg)',
      height: '65px',
      whiteSpace: 'nowrap' as const,
    },
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[1250px] h-[98vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden bg-white text-slate-900" style={{ borderColor: 'var(--border)' }}>
        
        {/* BARRE D'OUTILS NO-PRINT */}
        <div className="no-print px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Feuille Officielle de Cotation — Format Établissement (EPST RDC)
              </h3>
              <p className="text-[11px] text-slate-300">
                Classe: <strong>{className}</strong> • Cours: <strong>{disciplineName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePDF}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Exporter PDF (Paysage)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer la Feuille</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ZONE FEUILLE IMPRIMABLE (CONFORME À L'IMAGE COMPLIANT RDC) */}
        <div id="printable-feuille-cotation" className="flex-1 overflow-auto p-4 bg-white text-black" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
          
          {/* EN-TÊTE SUPÉRIEUR GAUCHE */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '2px solid #000', paddingBottom: '6px' }}>
            <div style={{ fontSize: '9.5px', lineHeight: '1.4' }}>
              <div><strong>Année Scolaire :</strong> {anneeScolaire}</div>
              <div><strong>Tit. :</strong> {teacherName}</div>
              <div><strong>Classe :</strong> {className}</div>
              <div><strong>Domaine de :</strong> {domaineName}</div>
              <div><strong>Discipline :</strong> {disciplineName}</div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: 900 }}>
              <div>REPUBLIQUE DEMOCRATIQUE DU CONGO</div>
              <div>MINISTERE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</div>
              <div style={{ fontSize: '12px', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                FEUILLE GENERAL DE COTATION PAR DISCIPLINE
              </div>
            </div>
          </div>

          {/* TABLEAU MATRICIEL OFFICIEL RDC (IDEM IMAGE SCANNÉE) */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000', fontSize: '8px' }}>
            <thead>
              {/* Ligne 1: Titres généraux Semestres */}
              <tr>
                <th rowSpan={3} style={{ border: '1px solid #000', width: '22px', textAlign: 'center', fontWeight: 900 }}>N°</th>
                <th rowSpan={3} style={{ border: '1px solid #000', width: '180px', textAlign: 'left', paddingLeft: '4px', fontWeight: 900 }}>NOMS & POSTNOMS</th>
                <th colSpan={7} style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900, background: '#f1f5f9' }}>SEMESTRE I</th>
                <th colSpan={7} style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900, background: '#f1f5f9' }}>SEMESTRE II</th>
                <th rowSpan={3} style={{ ...S.headerCellVertical, background: '#e2e8f0' }}>Tot. Gén.</th>
              </tr>

              {/* Ligne 2: Périodes & Examens */}
              <tr>
                <th colSpan={3} style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>I<sup>e</sup> Période</th>
                <th colSpan={3} style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>II<sup>e</sup> Période</th>
                <th rowSpan={2} style={{ ...S.headerCellVertical, background: '#cbd5e1' }}>Tot. Ex. (I)</th>
                <th colSpan={3} style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>III<sup>e</sup> Période</th>
                <th colSpan={3} style={{ border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>IV<sup>e</sup> Période</th>
                <th rowSpan={2} style={{ ...S.headerCellVertical, background: '#cbd5e1' }}>Tot. Ex. (II)</th>
              </tr>

              {/* Ligne 3: Intitulés sub-colonnes */}
              <tr>
                <th style={{ ...S.cell, width: '16px' }}>Int.1</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.2</th>
                <th style={{ ...S.headerCellVertical }}>Tot. Pér. (1)</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.1</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.2</th>
                <th style={{ ...S.headerCellVertical }}>Tot. Pér. (2)</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.1</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.2</th>
                <th style={{ ...S.headerCellVertical }}>Tot. Pér. (3)</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.1</th>
                <th style={{ ...S.cell, width: '16px' }}>Int.2</th>
                <th style={{ ...S.headerCellVertical }}>Tot. Pér. (4)</th>
              </tr>

              {/* Ligne 4: Maxima */}
              <tr style={{ background: '#000', color: '#fff', fontWeight: 900 }}>
                <td style={{ ...S.cell, color: '#fff' }}>Max.</td>
                <td style={{ ...S.cell, textAlign: 'left', paddingLeft: '4px', color: '#fff' }}>MAXIMA DE LA BRANCHE</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>20</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>20</td>
                <td style={{ ...S.cell, color: '#fff' }}>40</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>20</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>10</td>
                <td style={{ ...S.cell, color: '#fff' }}>20</td>
                <td style={{ ...S.cell, color: '#fff' }}>40</td>
                <td style={{ ...S.cell, color: '#fff' }}>160</td>
              </tr>
            </thead>
            <tbody>
              {rows.map((st, idx) => {
                const num = String(idx + 1).padStart(2, '0');
                const stGrades = st ? (fullGradesMap[st.id] || {}) : {};

                const p1 = stGrades['P1'];
                const p2 = stGrades['P2'];
                const ex1 = stGrades['EX1'];
                const p3 = stGrades['P3'];
                const p4 = stGrades['P4'];
                const ex2 = stGrades['EX2'];

                const totP1 = p1 !== undefined && p1 !== null ? Number(p1) : '';
                const totP2 = p2 !== undefined && p2 !== null ? Number(p2) : '';
                const hasS1 = p1 !== undefined || p2 !== undefined || ex1 !== undefined;
                const totS1 = hasS1 ? (Number(p1 || 0) + Number(p2 || 0) + Number(ex1 || 0)) : '';

                const totP3 = p3 !== undefined && p3 !== null ? Number(p3) : '';
                const totP4 = p4 !== undefined && p4 !== null ? Number(p4) : '';
                const hasS2 = p3 !== undefined || p4 !== undefined || ex2 !== undefined;
                const totS2 = hasS2 ? (Number(p3 || 0) + Number(p4 || 0) + Number(ex2 || 0)) : '';

                const totGen = (hasS1 || hasS2) ? (Number(totS1 || 0) + Number(totS2 || 0)) : '';

                return (
                  <tr key={idx} style={{ height: '18px' }}>
                    <td style={{ ...S.cell, fontWeight: 900 }}>{num}</td>
                    <td style={{ ...S.cell, textAlign: 'left', paddingLeft: '4px', fontWeight: st ? 700 : 400 }}>
                      {st ? `${st.nom.toUpperCase()} ${st.prenom}` : ''}
                    </td>
                    <td style={S.cell}></td>
                    <td style={S.cell}></td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#f8fafc' }}>{totP1}</td>
                    <td style={S.cell}></td>
                    <td style={S.cell}></td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#f8fafc' }}>{totP2}</td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#f1f5f9' }}>{totS1}</td>
                    <td style={S.cell}></td>
                    <td style={S.cell}></td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#f8fafc' }}>{totP3}</td>
                    <td style={S.cell}></td>
                    <td style={S.cell}></td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#f8fafc' }}>{totP4}</td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#f1f5f9' }}>{totS2}</td>
                    <td style={{ ...S.cell, fontWeight: 900, background: '#e2e8f0' }}>{totGen}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>

      </div>
    </div>,
    document.body
  );
};
