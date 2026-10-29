import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText, CheckCircle2, Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Eleve, Discipline, ClasseScolaire, Cote, AnneeScolaireConfig, GroupeActiviteMaternelle } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { normalizeNiveau, GROUPE_MATERNELLE_LABELS, OFFICIAL_EPST_COURSES, BAREME_QUALITATIF_MATERNELLE } from '../../data/referentielEpstData';
import { filterSubjectsByContext } from '../../utils/academicContext';
import { computeStudentAnnualResult, getDecisionLabel, getDecisionColor, DEFAULT_DELIBERATION_RULES } from '../../utils/deliberation';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';

// ─── Images officielles EPST / RDC ─────────────────────────────────
import { FLAG_RDC_BASE64 } from '../../assets/flagRDCData';
import { LOGO_EPST_RDC_BASE64 } from '../../assets/logoEPSTData';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BulletinCTBEModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Eleve;
  anneeScolaire?: string;
  periode?: string;
}

interface BulletinRow {
  subject: Discipline;
  scores: Record<string, number | undefined>;
  earned: number;
  possible: number;
  percent: number | null;
  s1: number;
  s1Max: number;
  s2: number;
  s2Max: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getMention = (pct: number) => {
  if (pct >= 90) return { code: 'PGD', label: 'Plus Grande Distinction', color: 'text-emerald-600' };
  if (pct >= 80) return { code: 'GD', label: 'Grande Distinction', color: 'text-indigo-600' };
  if (pct >= 70) return { code: 'D', label: 'Distinction', color: 'text-sky-600' };
  if (pct >= 60) return { code: 'S', label: 'Satisfaction', color: 'text-teal-600' };
  if (pct >= 50) return { code: 'P', label: 'Passable', color: 'text-amber-600' };
  return { code: 'A', label: 'Ajourné / Insuffisant', color: 'text-rose-600' };
};

/**
 * Conversion qualitative officielle Maternelle (bas du bulletin IGE/PS.001) :
 * 100-80 → E / JAUNE · 79-60 → TB / BLEU · 59-50 → B / VERT · 49-40 → AB / NOIR · 39-0 → M / ROUGE
 */
const getAppreciationMaternelle = (earned: number, possible: number) => {
  if (!possible || possible <= 0) return { qualite: '', couleur: '', bg: 'transparent' };
  const pct = (earned / possible) * 100;
  const tranche = BAREME_QUALITATIF_MATERNELLE.find((t) => pct >= t.min);
  if (!tranche) return { qualite: '', couleur: '', bg: 'transparent' };
  return { qualite: tranche.qualite, couleur: tranche.couleur, bg: tranche.hex };
};

const getPeriodsForCycle = (cycleCode?: string) => {
  if ((cycleCode || '').toUpperCase() === 'MATERNELLE') {
    return ['T1', 'T2', 'T3'];
  }
  return ['P1', 'P2', 'EX1', 'P3', 'P4', 'EX2'];
};

const getMaxForPeriod = (period: string, subject: Discipline) => {
  if (period.startsWith('EX')) return subject.maxExamen || 0;
  return subject.maxScore || 0;
};

// ─── Composant Principal ───────────────────────────────────────────────────
// ─── Cellule de tableau avec div interne (padding stable en PDF) ─────────────
const BulletinCell: React.FC<{ style?: React.CSSProperties } & React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  style,
  children,
  ...rest
}) => {
  const cellStyle: React.CSSProperties = { ...style, padding: '5px 7px' };
  if (style?.paddingLeft) cellStyle.paddingLeft = style.paddingLeft;
  if (style?.paddingRight) cellStyle.paddingRight = style.paddingRight;
  if (style?.paddingTop) cellStyle.paddingTop = style.paddingTop;
  if (style?.paddingBottom) cellStyle.paddingBottom = style.paddingBottom;
  return <td {...rest} style={cellStyle}>{children}</td>;
};


export const BulletinCTBEModal: React.FC<BulletinCTBEModalProps> = ({
  isOpen,
  onClose,
  student,
  anneeScolaire,
  periode,
}) => {
  const { config } = useSchoolConfig();
  const [cotes, setCotes] = useState<Cote[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [schoolYears, setSchoolYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showRibbon, setShowRibbon] = useState(!!periode);
  const [ribbonPeriod, setRibbonPeriod] = useState(periode || '');

  useEffect(() => {
    if (periode) {
      setShowRibbon(true);
      setRibbonPeriod(periode);
    }
  }, [periode]);

  useEffect(() => {
    if (!isOpen || !student.id) return;
    (async () => {
      setLoading(true);
      try {
        const [c, s, cl, y] = await Promise.all([
          LocalDatabaseService.getCotes({ eleveId: student.id }),
          LocalDatabaseService.getSubjects(),
          LocalDatabaseService.getClasses(),
          LocalDatabaseService.getSchoolYears(),
        ]);
        setCotes(c || []);
        setSubjects(s || []);
        setClasses(cl || []);
        setSchoolYears(y || []);
      } catch (err) {
        console.error('[BulletinCTBEModal] Erreur chargement :', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, student.id]);

  if (!isOpen) return null;

  const currentClass = useMemo(
    () => classes.find((c) => c.id === student.classId) || null,
    [classes, student.classId]
  );
  const cycle = (currentClass?.cycleId || 'PRIMAIRE').toUpperCase();
  const optionCode = currentClass?.optionCode;
  const niveau = normalizeNiveau(currentClass?.nom) || '';
  const isMaternelle = cycle === 'MATERNELLE';

  const activeYear = useMemo(
    () =>
      schoolYears.find((y) => y.id === student.schoolYearId) ||
      schoolYears.find((y) => y.statut === 'EN_COURS') ||
      schoolYears[0],
    [schoolYears, student.schoolYearId]
  );
  const yearLabel = anneeScolaire || activeYear?.nom || 'Année scolaire';

  const cotesMap = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    (cotes || []).forEach((c) => {
      const matiereId = c.matiereId || 'unknown';
      if (!m[matiereId]) m[matiereId] = {};
      m[matiereId][(c.periode || '').toUpperCase()] = c.score;
    });
    return m;
  }, [cotes]);

  const relevantSubjects = useMemo(() => {
    if (!currentClass) return subjects.filter((s) => (s.cycleCode || '').toUpperCase() === cycle).sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
    return filterSubjectsByContext(subjects, currentClass, optionCode)
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
  }, [subjects, currentClass, optionCode]);

  const periods = getPeriodsForCycle(cycle);
  const hasTwoSemesters = !isMaternelle;

  const rows: BulletinRow[] = useMemo(() => {
    return relevantSubjects.map((subject) => {
      const scores: Record<string, number | undefined> = {};
      let earned = 0;
      let possible = 0;
      let s1 = 0;
      let s1Max = 0;
      let s2 = 0;
      let s2Max = 0;

      periods.forEach((p) => {
        const score = cotesMap[subject.id]?.[p];
        if (score !== undefined) {
          scores[p] = score;
          earned += score;
          const maxP = getMaxForPeriod(p, subject);
          possible += maxP;

          if (hasTwoSemesters) {
            if (p === 'P1' || p === 'P2' || p === 'EX1') {
              s1 += score;
              s1Max += maxP;
            } else if (p === 'P3' || p === 'P4' || p === 'EX2') {
              s2 += score;
              s2Max += maxP;
            }
          }
        }
      });

      const percent = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : null;
      return { subject, scores, earned, possible, percent, s1, s1Max, s2, s2Max };
    });
  }, [relevantSubjects, cotesMap, periods, hasTwoSemesters]);

  const totalEarned = rows.reduce((sum, r) => sum + r.earned, 0);
  const totalPossible = rows.reduce((sum, r) => sum + r.possible, 0);
  const totalPercent = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 1000) / 10 : 0;
  const mention = getMention(totalPercent);

  const deliberationResult = useMemo(() => {
    if (!currentClass || !relevantSubjects.length) return null;
    return computeStudentAnnualResult(student, cotes, relevantSubjects, DEFAULT_DELIBERATION_RULES);
  }, [student, cotes, relevantSubjects, currentClass]);

  // ── Regroupement officiel Maternelle (12 activités fixes) ───────────────
  const maternelleGroups = useMemo(() => {
    if (!isMaternelle) return [];

    // On relie chaque activité officielle à la matière réelle en base :
    // d'abord par code EPST (fiable), sinon par nom.
    const dbByCode = new Map<string, Discipline>();
    const dbByName = new Map<string, Discipline>();
    relevantSubjects.forEach((s) => {
      if (s.code) dbByCode.set(s.code.toUpperCase().trim(), s);
      if (s.nom) dbByName.set(s.nom.toLowerCase().trim(), s);
    });

    const order: GroupeActiviteMaternelle[] = ['GROUPE_I', 'GROUPE_II', 'GROUPE_III', 'GROUPE_IV'];
    return order.map((g) => {
      const official = OFFICIAL_EPST_COURSES.filter((c) => c.groupeMaternelle === g && c.cycleCode === 'MATERNELLE')
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

      const items: Discipline[] = official.map((c) => {
        const db = dbByCode.get(c.code.toUpperCase().trim()) || dbByName.get(c.nom.toLowerCase().trim());
        return {
          id: db?.id || c.code,
          nom: c.nom,
          code: c.code,
          coefficient: 1,
          maxScore: c.maxScore,
          maxAnnuel: c.maxAnnuel,
          cycleCode: 'MATERNELLE',
          optionCode: 'TRONC_COMMUN',
          groupeMaternelle: c.groupeMaternelle,
          categorie: c.categorie,
          ordre: c.ordre,
        } as Discipline;
      });

      const label = GROUPE_MATERNELLE_LABELS[g]?.label?.split(':')[0]?.trim() || g;
      return { key: g, label, items };
    });
  }, [relevantSubjects, isMaternelle]);

  const maternelleGlobalTotals = useMemo(() => {
    const earned = { T1: 0, T2: 0, T3: 0, total: 0 };
    const possible = { T1: 0, T2: 0, T3: 0, total: 0 };
    maternelleGroups.forEach((g) => {
      g.items.forEach((s) => {
        const max = s.maxScore || 0;
        possible.T1 += max;
        possible.T2 += max;
        possible.T3 += max;
        possible.total += max * 3;
        const scores = cotesMap[s.id] || {};
        const t1 = scores['T1'];
        const t2 = scores['T2'];
        const t3 = scores['T3'];
        if (t1 !== undefined) earned.T1 += t1;
        if (t2 !== undefined) earned.T2 += t2;
        if (t3 !== undefined) earned.T3 += t3;
        earned.total += (t1 || 0) + (t2 || 0) + (t3 || 0);
      });
    });
    return { earned, possible };
  }, [maternelleGroups, cotesMap]);

  const handlePDF = () => {
    const el = document.getElementById('bulletin-epst-content');
    if (!el) return;

    // Clone dédié à l'impression PDF pour garantir une page A4 complète
    // sans altérer l'aperçu (qui peut être en hauteur automatique).
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.minHeight = '297mm';
    clone.style.height = '297mm';
    clone.style.boxSizing = 'border-box';
    clone.setAttribute('id', 'bulletin-epst-content-pdf-clone');

    const hiddenHost = document.createElement('div');
    hiddenHost.style.position = 'fixed';
    hiddenHost.style.top = '-9999px';
    hiddenHost.style.left = '-9999px';
    hiddenHost.style.width = '210mm';
    hiddenHost.appendChild(clone);
    document.body.appendChild(hiddenHost);

    import('html2pdf.js')
      .then((mod) => {
        const html2pdf = (mod as any).default || mod;
        html2pdf()
          .set({
            margin: [0, 0, 0, 0],
            filename: `Bulletin_${student.nom}_${student.prenom || ''}_${yearLabel}.pdf`.replace(/\s+/g, '_'),
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          })
          .from(clone)
          .save()
          .then(() => {
            document.body.removeChild(hiddenHost);
          })
          .catch((err: any) => {
            document.body.removeChild(hiddenHost);
            console.error('[BulletinCTBEModal] Erreur PDF :', err);
            alert('Erreur lors de la génération du PDF.');
          });
      })
      .catch((err) => {
        document.body.removeChild(hiddenHost);
        console.error('[BulletinCTBEModal] Erreur PDF :', err);
        alert('Erreur lors de la génération du PDF.');
      });
  };

  const handlePrint = () => {
    window.print();
  };

  const schoolName = config?.schoolName || 'Complexe Scolaire';
  const schoolSubtitle = 'République Démocratique du Congo — EPST';
  const schoolProvince = config?.province || '';
  const schoolSubDivision = config?.subDivision || '';
  const schoolAddress = config?.address || '';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:hidden">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 flex flex-col w-full max-w-6xl max-h-[95vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="print:hidden flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
            <FileText className="w-4 h-4" />
            Bulletin {yearLabel} — {student.prenom} {student.nom}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Zoom arrière"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(1)))}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Zoom avant"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                title="Réinitialiser le zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Ruban période */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRibbon}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setShowRibbon(checked);
                    if (checked && !ribbonPeriod) {
                      setRibbonPeriod(isMaternelle ? '1er Trimestre' : '1ère Période');
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Ruban
              </label>
              {showRibbon && (
                <select
                  value={ribbonPeriod}
                  onChange={(e) => setRibbonPeriod(e.target.value)}
                  className="text-[11px] font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 py-0.5 px-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(isMaternelle
                    ? ['1er Trimestre', '2ème Trimestre', '3ème Trimestre']
                    : ['1ère Période', '2ème Période', 'Examen 1er Semestre', '3ème Période', '4ème Période', 'Examen 2ème Semestre']
                  ).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimer
            </button>
            <button
              onClick={handlePDF}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement du bulletin...
            </div>
          ) : (
            <div className="min-h-full flex items-center justify-center py-10">
              <div
                className="print:hidden"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center top',
                  boxShadow: '0 10px 35px rgba(0, 0, 0, 0.22)',
                  borderRadius: '2px',
                  background: 'transparent',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div
                  id="bulletin-epst-content"
                  className="bg-white text-black mx-auto print:shadow-none"
                  style={{ position: 'relative', fontFamily: 'Arial, sans-serif', fontSize: '10px', width: '210mm', minHeight: 'auto', padding: '10mm', boxSizing: 'border-box' }}
                >
                  <style>{`
                    .epst-table { border-collapse: separate !important; border-spacing: 0 !important; }
                    .epst-table td,
                    .epst-table th { padding: 5px 7px !important; border-width: 0 1px 1px 0 !important; border-style: solid !important; border-color: #000 !important; }
                    .epst-table tr:first-child td,
                    .epst-table tr:first-child th { border-top-width: 0 !important; }
                    .epst-table td:first-child,
                    .epst-table th:first-child { border-left-width: 0 !important; }
                    .epst-table tr:last-child td,
                    .epst-table tr:last-child th { border-bottom-width: 0 !important; }
                    .epst-table td:last-child,
                    .epst-table th:last-child { border-right-width: 0 !important; }
                  `}</style>
                  {showRibbon && ribbonPeriod && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '170%',
                        height: '26px',
                        background: '#000',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 900,
                        textAlign: 'center',
                        lineHeight: '26px',
                        whiteSpace: 'nowrap',
                        transform: 'rotate(45deg)',
                        transformOrigin: 'top right',
                        zIndex: 20,
                        letterSpacing: '1px',
                      }}
                    >
                      BULLETIN — {ribbonPeriod.toUpperCase()}
                    </div>
                  )}
              {isMaternelle ? (
                /* ═══ GABARIT OFFICIEL — BULLETIN DE L'ENFANT DE LA MATERNELLE (IGE/PS.001) ═══ */
                (() => {
                  const bd = '1px solid #000';
                  const cell: React.CSSProperties = { border: bd, padding: '2px 4px' };
                  const cellC: React.CSSProperties = { ...cell, textAlign: 'center' };
                  const grey: React.CSSProperties = { ...cell, background: '#dfe3ea' };
                  const greyC: React.CSSProperties = { ...grey, textAlign: 'center' };
                  const dark: React.CSSProperties = { ...cell, background: '#3f3f3f' };
                  const e = maternelleGlobalTotals.earned;
                  const p = maternelleGlobalTotals.possible;
                  const a1 = getAppreciationMaternelle(e.T1, p.T1);
                  const a2 = getAppreciationMaternelle(e.T2, p.T2);
                  const a3 = getAppreciationMaternelle(e.T3, p.T3);
                  const aT = getAppreciationMaternelle(e.total, p.total);
                  const maxActivite = GROUPE_MATERNELLE_LABELS.GROUPE_I.maxTrimestre;

                  return (
                    <div style={{ border: '2px solid #000', background: '#fff', fontSize: '9.5px', lineHeight: 1.3 }}>
                      {/* ── EN-TÊTE : drapeau | ministère | sceau ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderBottom: '1.5px solid #000' }}>
                        <img
                          src={FLAG_RDC_BASE64}
                          alt="Drapeau RDC"
                          style={{ width: '56px', height: '42px', objectFit: 'cover', border: '0.75px solid #000', flexShrink: 0, display: 'block' }}
                        />
                        <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '11px', lineHeight: 1.4, flex: 1 }}>
                          REPUBLIQUE DEMOCRATIQUE DU CONGO<br />
                          MINISTERE DE L'EDUCATION NATIONALE<br />
                          ET NOUVELLE CITOYENNETE
                        </div>
                        <img
                          src={LOGO_EPST_RDC_BASE64}
                          alt="Sceau officiel"
                          style={{ width: '44px', height: '44px', objectFit: 'contain', flexShrink: 0, display: 'block' }}
                        />
                      </div>

                      {/* ── N° ID. : libellé et cases sur la même ligne ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 8px', borderBottom: '1.5px solid #000' }}>
                        <span style={{ fontWeight: 900, fontSize: '10.5px', flexShrink: 0, paddingLeft: '20px' }}>N° ID.</span>
                        <div style={{ display: 'flex', flex: 1 }}>
                          {Array.from({ length: 24 }).map((_, i) => {
                            const chars = (student.registrationNumber || '').toUpperCase().padEnd(24, ' ').slice(0, 24);
                            return (
                              <span key={i} style={{ flex: 1, height: '15px', border: '0.75px solid #000', borderLeft: i === 0 ? '0.75px solid #000' : 'none', display: 'inline-block', textAlign: 'center', fontSize: '9px', fontWeight: 700, lineHeight: '15px', whiteSpace: 'nowrap' }}>
                                {chars[i] === ' ' ? '\u00A0' : chars[i]}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── PROVINCE EDUCATIONNELLE ── */}
                      <div style={{ padding: '3px 8px', borderBottom: '1.5px solid #000', fontWeight: 900, fontSize: '10.5px' }}>
                        PROVINCE EDUCATIONNELLE : <span style={{ fontWeight: 400 }}>{schoolProvince}</span>
                      </div>

                      {/* ── IDENTITÉ : établissement (gauche) / enfant (droite) ── */}
                      <div style={{ display: 'flex', borderBottom: '1.5px solid #000' }}>
                        <div style={{ flex: 1, padding: '5px 8px', borderRight: bd }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '3px' }}>VILLE :</BulletinCell>
                                <BulletinCell style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '3px' }}>{schoolSubDivision}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '3px' }}>TERRITOIRE / COMMUNE :</BulletinCell>
                                <BulletinCell style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '3px' }}>{schoolAddress}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '3px' }}>ECOLE :</BulletinCell>
                                <BulletinCell style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '3px' }}>{schoolName}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>CODE :</BulletinCell>
                                <BulletinCell style={{ paddingLeft: '5px', verticalAlign: 'middle' }}>
                                  <span style={{ display: 'inline-flex' }}>
                                    {Array.from({ length: 7 }).map((_, i) => (
                                      <span key={i} style={{ width: '16px', height: '15px', border: '0.75px solid #000', borderLeft: i === 0 ? '0.75px solid #000' : 'none', display: 'inline-block' }} />
                                    ))}
                                  </span>
                                </BulletinCell>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div style={{ flex: 1.05, padding: '5px 8px' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '2px' }}>NOM :</BulletinCell>
                                <BulletinCell colSpan={2} style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '2px', textTransform: 'uppercase' }}>{student.nom}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'middle', paddingBottom: '2px' }}>POSTNOM :</BulletinCell>
                                <BulletinCell style={{ paddingLeft: '5px', verticalAlign: 'middle', paddingBottom: '2px' }}>{student.postnom}</BulletinCell>
                                <BulletinCell style={{ verticalAlign: 'middle', paddingBottom: '2px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                                  <span style={{ fontWeight: 900, marginRight: '4px' }}>SEXE</span>
                                  <span style={{ width: '22px', height: '15px', border: '0.75px solid #000', display: 'inline-block', textAlign: 'center', fontWeight: 900, lineHeight: '14px', verticalAlign: 'middle' }}>
                                    {student.sexe || ''}
                                  </span>
                                </BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '2px' }}>PRENOM :</BulletinCell>
                                <BulletinCell colSpan={2} style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '2px' }}>{student.prenom}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '2px' }}>NE(E) A :</BulletinCell>
                                <BulletinCell colSpan={2} style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '2px' }}>
                                  {student.lieuNaissance}
                                  {student.dateNaissance ? <span style={{ fontWeight: 900 }}>{'  LE  '}</span> : null}
                                  {student.dateNaissance}
                                </BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '2px' }}>CLASSE :</BulletinCell>
                                <BulletinCell colSpan={2} style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '2px' }}>{currentClass?.nom}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: '3px' }}>MATRICULE :</BulletinCell>
                                <BulletinCell colSpan={2} style={{ paddingLeft: '5px', verticalAlign: 'top', paddingBottom: '3px' }}>{student.registrationNumber}</BulletinCell>
                              </tr>
                              <tr>
                                <BulletinCell style={{ fontWeight: 900, whiteSpace: 'nowrap', verticalAlign: 'middle' }}>N° PERM. :</BulletinCell>
                                <BulletinCell colSpan={2} style={{ paddingLeft: '5px', verticalAlign: 'middle' }}>
                                  <div style={{ display: 'flex' }}>
                                    {Array.from({ length: 13 }).map((_, i) => (
                                      <span key={i} style={{ flex: 1, height: '15px', border: '0.75px solid #000', borderLeft: i === 0 ? '0.75px solid #000' : 'none', display: 'inline-block' }} />
                                    ))}
                                  </div>
                                </BulletinCell>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ── TITRE ── */}
                      <div style={{ padding: '4px 8px', borderBottom: '1.5px solid #000', fontWeight: 900, fontSize: '10.5px', textAlign: 'center' }}>
                        BULLETIN DE L'ENFANT DE LA MATERNELLE (1<sup>ère</sup>, 2<sup>ème</sup>, 3<sup>ème</sup>)
                        &nbsp;&nbsp;&nbsp;&nbsp;ANNEE SCOLAIRE&nbsp; {yearLabel}
                      </div>

                      {/* ── TABLEAU DES ACTIVITÉS ── */}
                      <table className="epst-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <colgroup>
                          <col style={{ width: '4%' }} />
                          <col style={{ width: '21%' }} />
                          <col style={{ width: '21%' }} />
                          <col style={{ width: '9.5%' }} />
                          <col style={{ width: '9.5%' }} />
                          <col style={{ width: '9.5%' }} />
                          <col style={{ width: '9.5%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '8%' }} />
                        </colgroup>
                        <tbody>
                          {/* En-tête */}
                          <tr>
                            <BulletinCell style={greyC}>*</BulletinCell>
                            <BulletinCell colSpan={2} style={{ ...grey, fontWeight: 900 }}>TRIMESTRES</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>TRIM 1</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>TRIM 2</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>TRIM 3</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>TOTAL</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>QUAL.</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>COUL.</BulletinCell>
                          </tr>
                          <tr>
                            <BulletinCell style={greyC}>*</BulletinCell>
                            <BulletinCell colSpan={2} style={{ ...grey, fontWeight: 900, paddingLeft: '18px' }}>MAXIMA</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>{maxActivite}</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>{maxActivite}</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>{maxActivite}</BulletinCell>
                            <BulletinCell style={{ ...greyC, fontWeight: 900 }}>{maxActivite * 3}</BulletinCell>
                            <BulletinCell style={dark} />
                            <BulletinCell style={dark} />
                          </tr>

                          {/* Groupes d'activités */}
                          {maternelleGroups.map((g, gIdx) => {
                            const maxT = GROUPE_MATERNELLE_LABELS[g.key]?.maxTrimestre || g.items[0]?.maxScore || 0;
                            const subMaxTrim = maxT * g.items.length;
                            const subMaxAnnuel = subMaxTrim * 3;

                            const sub = { T1: 0, T2: 0, T3: 0, total: 0 };
                            g.items.forEach((s) => {
                              const sc = cotesMap[s.id] || {};
                              if (sc['T1'] !== undefined) sub.T1 += sc['T1'];
                              if (sc['T2'] !== undefined) sub.T2 += sc['T2'];
                              if (sc['T3'] !== undefined) sub.T3 += sc['T3'];
                              sub.total += (sc['T1'] || 0) + (sc['T2'] || 0) + (sc['T3'] || 0);
                            });
                            const subAppr = getAppreciationMaternelle(sub.total, subMaxAnnuel);
                            const startNum = maternelleGroups.slice(0, gIdx).reduce((n, gr) => n + gr.items.length, 0);

                            return (
                              <React.Fragment key={g.key}>
                                <tr>
                                  <BulletinCell style={greyC}>&#9679;</BulletinCell>
                                  <BulletinCell colSpan={8} style={{ ...grey, fontWeight: 900 }}>
                                    {GROUPE_MATERNELLE_LABELS[g.key]?.label}
                                  </BulletinCell>
                                </tr>

                                {g.items.map((s, idx) => {
                                  const sc = cotesMap[s.id] || {};
                                  const t1 = sc['T1'];
                                  const t2 = sc['T2'];
                                  const t3 = sc['T3'];
                                  const entered = [t1, t2, t3].filter((v) => v !== undefined).length;
                                  const sum = (t1 || 0) + (t2 || 0) + (t3 || 0);
                                  const appr = entered > 0
                                    ? getAppreciationMaternelle(sum, maxT * entered)
                                    : { qualite: '', couleur: '', bg: 'transparent' };
                                  return (
                                    <tr key={s.id}>
                                      <BulletinCell style={cellC}>{startNum + idx + 1}</BulletinCell>
                                      <BulletinCell colSpan={2} style={cell}>{s.nom}</BulletinCell>
                                      <BulletinCell style={cellC}>{t1 !== undefined ? t1 : ''}</BulletinCell>
                                      <BulletinCell style={cellC}>{t2 !== undefined ? t2 : ''}</BulletinCell>
                                      <BulletinCell style={cellC}>{t3 !== undefined ? t3 : ''}</BulletinCell>
                                      <BulletinCell style={{ ...cellC, fontWeight: 700 }}>{entered > 0 ? sum : ''}</BulletinCell>
                                      <BulletinCell style={{ ...cellC, fontWeight: 700, background: appr.bg }}>{appr.qualite}</BulletinCell>
                                      <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: appr.bg }}>{appr.couleur}</BulletinCell>
                                    </tr>
                                  );
                                })}

                                <tr>
                                  <BulletinCell style={cellC}>*</BulletinCell>
                                  <BulletinCell colSpan={2} style={{ ...cellC, fontWeight: 900 }}>SOUS-TOTAL</BulletinCell>
                                  <BulletinCell style={cellC}>{sub.T1 > 0 ? sub.T1 : ''}/{subMaxTrim}</BulletinCell>
                                  <BulletinCell style={cellC}>{sub.T2 > 0 ? sub.T2 : ''}/{subMaxTrim}</BulletinCell>
                                  <BulletinCell style={cellC}>{sub.T3 > 0 ? sub.T3 : ''}/{subMaxTrim}</BulletinCell>
                                  <BulletinCell style={{ ...cellC, fontWeight: 700 }}>{sub.total > 0 ? sub.total : ''}/{subMaxAnnuel}</BulletinCell>
                                  <BulletinCell style={{ ...cellC, fontWeight: 700, background: subAppr.bg }}>{subAppr.qualite}</BulletinCell>
                                  <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: subAppr.bg }}>{subAppr.couleur}</BulletinCell>
                                </tr>
                              </React.Fragment>
                            );
                          })}

                          {/* Appréciation générale */}
                          <tr>
                            <BulletinCell rowSpan={3} colSpan={2} style={{ ...cellC, fontWeight: 900, verticalAlign: 'middle' }}>
                              APPRECIATION<br />GENERALE
                            </BulletinCell>
                            <BulletinCell style={{ ...cell, fontWeight: 900 }}>TOTAL</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700 }}>{e.T1 > 0 ? e.T1 : ''}/{p.T1}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700 }}>{e.T2 > 0 ? e.T2 : ''}/{p.T2}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700 }}>{e.T3 > 0 ? e.T3 : ''}/{p.T3}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 900 }}>{e.total > 0 ? e.total : ''}/{p.total}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 900, background: aT.bg }}>{aT.qualite}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: aT.bg }}>{aT.couleur}</BulletinCell>
                          </tr>
                          <tr>
                            <BulletinCell style={{ ...cell, fontWeight: 900, fontSize: '8.5px' }}>CONVERSION QUALITATIVE</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700, background: a1.bg }}>{a1.qualite}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700, background: a2.bg }}>{a2.qualite}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700, background: a3.bg }}>{a3.qualite}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontWeight: 700, background: aT.bg }}>{aT.qualite}</BulletinCell>
                            <BulletinCell style={cell} />
                            <BulletinCell style={cell} />
                          </tr>
                          <tr>
                            <BulletinCell style={{ ...cell, fontWeight: 900 }}>COULEURS</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: a1.bg }}>{a1.couleur}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: a2.bg }}>{a2.couleur}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: a3.bg }}>{a3.couleur}</BulletinCell>
                            <BulletinCell style={{ ...cellC, fontSize: '8.5px', background: aT.bg }}>{aT.couleur}</BulletinCell>
                            <BulletinCell style={cell} />
                            <BulletinCell style={cell} />
                          </tr>

                          {/* Bandeau SIGNATURES */}
                          <tr>
                            <BulletinCell style={cellC}>*</BulletinCell>
                            <BulletinCell colSpan={8} style={{ ...cell, fontWeight: 900, paddingLeft: '18px' }}>SIGNATURES</BulletinCell>
                          </tr>
                        </tbody>
                      </table>

                      {/* ── SIGNATURES : tableau trimestriel + mentions ── */}
                      <div style={{ display: 'flex', borderTop: bd, borderBottom: bd }}>
                        <div style={{ width: '52%' }}>
                          <table className="epst-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              <tr>
                                <BulletinCell style={{ ...greyC, fontWeight: 900, width: '32%' }}>TRIMESTRES</BulletinCell>
                                <BulletinCell style={{ ...greyC, fontWeight: 900 }}>INSTITUTEUR (TRICE)</BulletinCell>
                                <BulletinCell style={{ ...greyC, fontWeight: 900, width: '26%' }}>PARENT</BulletinCell>
                              </tr>
                              {['1er TRIMESTRE', '2e TRIMESTRE', '3e TRIMESTRE'].map((t) => (
                                <tr key={t}>
                                  <BulletinCell style={{ ...cell, fontWeight: 700 }}>{t}</BulletinCell>
                                  <BulletinCell style={{ ...cell, height: '17px' }} />
                                  <BulletinCell style={cell} />
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div style={{ flex: 1, borderLeft: bd, padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ textAlign: 'left', marginBottom: '6px' }}>
                            Fait à ................................., le ......../......../20......
                          </div>
                          <div style={{ fontWeight: 900, marginBottom: '4px' }}>Sceau de l'École</div>
                          <div style={{ fontWeight: 900 }}>Le (la) Directeur (trice)</div>
                        </div>
                      </div>

                      {/* ── LÉGENDE OFFICIELLE ── */}
                      <table className="epst-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr>
                            <BulletinCell rowSpan={3} style={{ ...cellC, fontWeight: 900, width: '14%', verticalAlign: 'middle' }}>LEGENDE</BulletinCell>
                            <BulletinCell style={{ ...cell, fontWeight: 900, width: '20%' }}>Pourcentages</BulletinCell>
                            {BAREME_QUALITATIF_MATERNELLE.map((t) => (
                              <BulletinCell key={t.plage} style={{ ...cellC, fontWeight: 700 }}>{t.plage}</BulletinCell>
                            ))}
                          </tr>
                          <tr>
                            <BulletinCell style={{ ...cell, fontWeight: 900 }}>Qualité</BulletinCell>
                            {BAREME_QUALITATIF_MATERNELLE.map((t) => (
                              <BulletinCell key={t.plage} style={{ ...cellC, fontWeight: 700 }}>{t.qualite}</BulletinCell>
                            ))}
                          </tr>
                          <tr>
                            <BulletinCell style={{ ...cell, fontWeight: 900 }}>Couleurs</BulletinCell>
                            {BAREME_QUALITATIF_MATERNELLE.map((t) => (
                              <BulletinCell key={t.plage} style={{ ...cellC, background: t.hex, fontWeight: 700 }}>{t.couleur}</BulletinCell>
                            ))}
                          </tr>
                        </tbody>
                      </table>

                      {/* ── OBSERVATIONS ── */}
                      <div style={{ display: 'flex', borderTop: bd }}>
                        <div style={{ width: '52%', padding: '6px 8px', borderRight: bd }}>
                          <div style={{ fontWeight: 900, marginBottom: '14px' }}>Observations :</div>
                          <div style={{ fontSize: '8px' }}>
                            (1) Biffer la mention inutile<br />
                            Note importante : le bulletin est sans valeur s'il est raturé ou surchargé.
                          </div>
                        </div>
                        <div style={{ flex: 1, padding: '6px 8px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-around', fontWeight: 900, marginBottom: '18px' }}>
                            <span>Sceau de l'École</span>
                            <span>Le (la) Directeur (trice)</span>
                          </div>
                          <div style={{ textAlign: 'right', fontWeight: 900, fontStyle: 'italic', fontSize: '8.5px' }}>IGE/PS.001</div>
                        </div>
                      </div>

                      {/* ── BANDEAU LÉGAL ── */}
                      <div style={{ borderTop: '1.5px solid #000', padding: '3px 8px', textAlign: 'center', fontStyle: 'italic', fontWeight: 700, fontSize: '9px' }}>
                        Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi.
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ border: '2px solid #000', background: '#fff' }}>
              {/* ═══ EN-TÊTE OFFICIEL EPST ═══ */}
              <div style={{ borderBottom: '2px solid #000', padding: '8px', background: '#fff', fontSize: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '4px 6px 8px' }}>
                  <img src={FLAG_RDC_BASE64} alt="Drapeau RDC" style={{ height: '46px', width: 'auto' }} />
                  <div style={{ textAlign: 'center', fontWeight: 900, fontSize: '12px', lineHeight: 1.5, paddingTop: '4px' }}>
                    REPUBLIQUE DEMOCRATIQUE DU CONGO<br />
                    MINISTERE DE L'ENSEIGNEMENT PRIMAIRE,<br />
                    SECONDAIRE ET PROFESSIONNEL<br />
                    <span style={{ fontSize: '10px', fontWeight: 700 }}>{schoolName}</span>
                  </div>
                  <img src={LOGO_EPST_RDC_BASE64} alt="Logo EPST RDC" style={{ height: '52px', width: 'auto' }} />
                </div>

                {/* N.ID. et Province */}
                <div style={{ borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '4px 6px' }}>
                  <div style={{ display: 'flex', gap: '1px', marginBottom: '2px' }}>
                    {Array.from({ length: 30 }).map((_, i) => {
                      const chars = (student.registrationNumber || '').toUpperCase().padEnd(30, ' ').slice(0, 30);
                      return (
                        <div key={i} style={{ flex: 1, height: '14px', border: '1px solid #000', textAlign: 'center', fontSize: '8px', fontWeight: 700, lineHeight: '14px', whiteSpace: 'nowrap' }}>
                          {chars[i] === ' ' ? '\u00A0' : chars[i]}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontWeight: 900, fontSize: '9px' }}>N.ID.</div>
                  <div style={{ fontWeight: 900, marginTop: '2px' }}>PROVINCE : {schoolProvince || '..............................................................'}</div>
                </div>

                {/* Identité scolaire et élève */}
                <div style={{ display: 'flex', borderBottom: '2px solid #000' }}>
                  <div style={{ flex: 1, padding: '4px 6px', borderRight: '1px solid #000' }}>
                    <div><b>TERRITOIRE / COMMUNE :</b> {schoolSubDivision || '................................'}</div>
                    <div><b>ECOLE :</b> {schoolName}</div>
                    <div><b>ADRESSE :</b> {schoolAddress || '................................'}</div>
                    <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <b>CODE ECOLE :</b>
                      <span style={{ display: 'inline-flex', gap: '1px' }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span key={i} style={{ width: '14px', height: '14px', border: '1px solid #000', display: 'inline-block' }} />
                        ))}
                      </span>
                    </div>
                  </div>
                  <div style={{ flex: 1.1, padding: '4px 6px' }}>
                    <div><b>NOM :</b> <span style={{ textTransform: 'uppercase' }}>{student.nom || '........................................................'}</span></div>
                    <div><b>POST-NOM :</b> {student.postnom || '.....................................'} <b>SEXE</b> <span style={{ display: 'inline-block', minWidth: '18px', border: '1px solid #000', textAlign: 'center', fontWeight: 900 }}>{student.sexe || ''}</span></div>
                    <div><b>PRENOM :</b> {student.prenom || '...................................'}</div>
                    <div><b>NE(E) A</b> {student.lieuNaissance || '..............................'}, <b>LE</b> {student.dateNaissance || '....../......./..........'}</div>
                    <div><b>CLASSE :</b> {currentClass?.nom || '.................................................'} <b>ANNEE SCOLAIRE :</b> {yearLabel}</div>
                    <div><b>MATRICULE :</b> {student.registrationNumber || '...........................................'}</div>
                  </div>
                </div>

                {/* Titre */}
                <div style={{ borderBottom: '2px solid #000', padding: '4px 6px', fontWeight: 900, fontSize: '11px', textAlign: 'center', textTransform: 'uppercase' }}>
                  Bulletin de notes — {cycle === 'PRIMAIRE' ? 'Cycle Primaire' : cycle === 'SECONDAIRE_CTEB' ? 'Cycle Secondaire / CTEB' : cycle === 'HUMANITES' ? 'Cycle Humanités' : cycle}
                </div>
              </div>
              {/* ═══ TABLEAU DES NOTES CTEB / PRIMAIRE / HUMANITÉS ═══ */}
              <table className="epst-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ background: '#334155', color: '#fff' }}>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '22px' }}>N°</th>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'left', minWidth: '120px' }}>Matière / Activité</th>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>Coef.</th>
                    {hasTwoSemesters ? (
                      <>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>P1</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>P2</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>Ex1</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '38px', background: '#1e293b' }}>S1</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>P3</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>P4</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '32px' }}>Ex2</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '38px', background: '#1e293b' }}>S2</th>
                      </>
                    ) : (
                      <>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '38px' }}>T1</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '38px' }}>T2</th>
                        <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '38px' }}>T3</th>
                      </>
                    )}
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '52px', background: '#1e293b' }}>Annuel</th>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', width: '42px' }}>%</th>
                    <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', minWidth: '70px' }}>Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rowMention = row.percent !== null ? getMention(row.percent) : null;
                    return (
                      <tr key={row.subject.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{idx + 1}</BulletinCell>
                        <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 700 }}>{row.subject.nom}</BulletinCell>
                        <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{row.subject.coefficient}</BulletinCell>
                        {periods.map((p) => (
                          <BulletinCell key={p} style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                            {row.scores[p] !== undefined ? row.scores[p] : ''}
                          </BulletinCell>
                        ))}
                        {hasTwoSemesters && (
                          <>
                            <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9' }}>
                              {row.s1 > 0 ? row.s1 : ''}
                            </BulletinCell>
                            <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9' }}>
                              {row.s2 > 0 ? row.s2 : ''}
                            </BulletinCell>
                          </>
                        )}
                        <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#f1f5f9' }}>
                          {row.earned > 0 ? row.earned : ''} / {row.possible > 0 ? row.possible : ''}
                        </BulletinCell>
                        <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontWeight: 700 }}>
                          {row.percent !== null ? `${row.percent.toFixed(1)}%` : ''}
                        </BulletinCell>
                        <BulletinCell style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', color: rowMention ? (row.percent || 0) >= 50 ? '#059669' : '#e11d48' : 'inherit' }}>
                          {rowMention ? rowMention.code : ''}
                        </BulletinCell>
                      </tr>
                    );
                  })}

                  <tr style={{ background: '#e2e8f0', fontWeight: 900 }}>
                    <BulletinCell style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }} colSpan={hasTwoSemesters ? 11 : 6}>
                      TOTAL GÉNÉRAL
                    </BulletinCell>
                    <BulletinCell style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>
                      {totalPossible > 0 ? `${totalEarned} / ${totalPossible}` : ''}
                    </BulletinCell>
                    <BulletinCell style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '10px' }}>
                      {totalPercent.toFixed(1)}%
                    </BulletinCell>
                    <BulletinCell style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', color: (mention.code === 'PGD' || mention.code === 'GD' || mention.code === 'D') ? '#059669' : (mention.code === 'S' || mention.code === 'P') ? '#d97706' : '#e11d48' }}>
                      {mention.code}
                    </BulletinCell>
                  </tr>
                </tbody>
              </table>
                </div>
              )}

              {/* ═══ DÉCISION ET SIGNATURES ═══ */}
              {!isMaternelle && (
                <div style={{ borderTop: '2px solid #000', padding: '8px', fontSize: '10px', background: '#fff' }}>
                  <div style={{ fontWeight: 900, textTransform: 'uppercase', marginBottom: '6px' }}>Décision du conseil de classe</div>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        readOnly
                        checked={deliberationResult?.decision === 'ADMIS' || deliberationResult?.decision === 'ADMIS_DISTINCTION'}
                        style={{ accentColor: '#059669' }}
                      /> Passe dans la classe supérieure
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        readOnly
                        checked={deliberationResult?.decision === 'REDOUBLEMENT'}
                        style={{ accentColor: '#e11d48' }}
                      /> Doit redoubler
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="checkbox"
                        readOnly
                        checked={deliberationResult?.decision === 'REPECHAGE'}
                        style={{ accentColor: '#d97706' }}
                      /> Examen de repêchage
                    </label>
                  </div>

                  {deliberationResult && (
                    <div style={{ fontSize: '9px', marginBottom: '12px' }}>
                      <b>Appréciation générale :</b>{' '}
                      <span style={{ color: totalPercent >= 50 ? '#059669' : '#e11d48', fontWeight: 900 }}>
                        {mention.label} ({mention.code}) — {totalPercent.toFixed(1)}%
                      </span>
                      <span style={{ marginLeft: '8px', color: '#334155', fontWeight: 700 }}>
                        Décision : {getDecisionLabel(deliberationResult.decision)}
                      </span>
                      {deliberationResult.failedMajorSubjects.length > 0 && (
                        <span style={{ marginLeft: '8px', color: '#be123c' }}>
                          (Échec majeur : {deliberationResult.failedMajorSubjects.map((f) => f.subject.nom).join(', ')})
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: '24px' }}>Le Titulaire</div>
                      <div style={{ width: '120px', height: '1px', background: '#000', margin: '0 auto' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: '24px' }}>Le Chef d'Établissement</div>
                      <div style={{ width: '120px', height: '1px', background: '#000', margin: '0 auto' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: '24px' }}>Le Parent / Tuteur</div>
                      <div style={{ width: '120px', height: '1px', background: '#000', margin: '0 auto' }} />
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '9px', color: '#64748b' }}>
                    Fait à .................... le ....... / ....... / .......... — Sceau de l'école
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

        {/* Footer */}
        <div className="print:hidden border-t border-slate-200 dark:border-slate-700 px-4 py-2 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Bulletin EPST RDC — données réelles
          </div>
          <button onClick={onClose} className="px-3 py-1 rounded-lg bg-slate-700 text-white font-bold text-[10px]">
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
