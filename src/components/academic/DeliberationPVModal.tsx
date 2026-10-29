import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download } from 'lucide-react';
import type { ClasseScolaire, Eleve } from '../../types';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { FLAG_RDC_BASE64 } from '../../assets/flagRDCData';
import { LOGO_EPST_RDC_BASE64 } from '../../assets/logoEPSTData';
import type { StudentDeliberationResult, ClassDeliberationStats } from '../../utils/deliberation';
import { getDecisionLabel } from '../../utils/deliberation';

interface DeliberationPVModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentClass?: ClasseScolaire | null;
  yearName?: string;
  results: StudentDeliberationResult[];
  stats: ClassDeliberationStats | null;
}

export const DeliberationPVModal: React.FC<DeliberationPVModalProps> = ({
  isOpen,
  onClose,
  currentClass,
  yearName,
  results,
  stats,
}) => {
  const { config } = useSchoolConfig();
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!contentRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>PV Délibération ${currentClass?.nom || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
            th, td { border: 1px solid #333; padding: 6px; text-align: left; }
            th { background: #eee; }
            .header { text-align: center; margin-bottom: 24px; }
            .header h2 { margin: 0; font-size: 18px; }
            .stats { display: flex; gap: 24px; margin: 16px 0; font-size: 12px; }
            .signatures { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
          </style>
        </head>
        <body>
          ${contentRef.current.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePDF = async () => {
    if (!contentRef.current) return;
    try {
      const mod = await import('html2pdf.js');
      const html2pdf = (mod as any).default || mod;
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `PV_Deliberation_${currentClass?.nom || 'Classe'}_${yearName || ''}.pdf`.replace(/\s+/g, '_'),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };
      html2pdf().set(opt).from(contentRef.current).save();
    } catch (e) {
      console.error('html2pdf error', e);
    }
  };

  if (!isOpen) return null;

  const schoolName = config?.schoolName || 'Établissement Scolaire';
  const today = new Date().toLocaleDateString('fr-FR');

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Procès-verbal de délibération</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 rounded-lg hover:bg-slate-200/50" title="Imprimer">
              <Printer className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <button onClick={handlePDF} className="p-2 rounded-lg hover:bg-slate-200/50" title="PDF">
              <Download className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200/50">
              <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div ref={contentRef} className="bg-white text-black p-6 rounded-xl">
            <div className="header">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <img src={FLAG_RDC_BASE64} alt="Drapeau RDC" style={{ height: '46px', width: 'auto' }} />
                <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
                  <div className="uppercase text-sm font-black">{schoolName}</div>
                  <div className="text-xs">République Démocratique du Congo — EPST</div>
                  <h2 className="mt-2 text-lg font-black underline">Procès-verbal de Délibération de fin d'année</h2>
                </div>
                <img src={LOGO_EPST_RDC_BASE64} alt="Logo EPST RDC" style={{ height: '52px', width: 'auto' }} />
              </div>
              <div className="text-xs mt-1 font-bold">Année scolaire : {yearName || '__________'}</div>
              <div className="text-xs">Classe : <strong>{currentClass?.nom || '__________'}</strong> — Titulaire : <strong>{currentClass?.professeurTitulaire || '__________'}</strong></div>
              <div className="text-xs">Date du conseil de classe : {today}</div>
            </div>

            <div className="stats">
              {stats && (
                <>
                  <div>Inscrits : <strong>{stats.inscrits}</strong></div>
                  <div>Participants : <strong>{stats.participants}</strong></div>
                  <div>Admis : <strong>{stats.admis + stats.admisDistinction}</strong></div>
                  <div>Repêchage : <strong>{stats.repechage}</strong></div>
                  <div>Redoublement : <strong>{stats.redoublement}</strong></div>
                  <div>Exclusion : <strong>{stats.exclusion}</strong></div>
                  <div>Taux de réussite : <strong>{stats.tauxReussite}%</strong></div>
                </>
              )}
            </div>

            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Matricule</th>
                  <th>Nom et prénom</th>
                  <th>Sexe</th>
                  <th>% Général</th>
                  <th>Mention</th>
                  <th>Décision du conseil</th>
                  <th>Observation</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.eleve.id}>
                    <td>{r.rank}</td>
                    <td>{r.eleve.registrationNumber}</td>
                    <td>{r.eleve.nom} {r.eleve.prenom} {r.eleve.postnom || ''}</td>
                    <td>{r.eleve.sexe}</td>
                    <td>{r.generalPercent.toFixed(1)}%</td>
                    <td>{r.mention.label}</td>
                    <td>{getDecisionLabel(r.decision)}</td>
                    <td>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="signatures">
              <div>
                <div className="font-bold mb-6">Président du Conseil de Classe</div>
                <div className="w-32 border-b border-black h-6" />
              </div>
              <div>
                <div className="font-bold mb-6">Titulaire de Classe</div>
                <div className="w-32 border-b border-black h-6" />
              </div>
              <div>
                <div className="font-bold mb-6">Directeur des Études</div>
                <div className="w-32 border-b border-black h-6" />
              </div>
              <div>
                <div className="font-bold mb-6">Chef d'Établissement</div>
                <div className="w-32 border-b border-black h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
