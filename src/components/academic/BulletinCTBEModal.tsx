import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Eleve } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';

// ─── Images officielles importées via Vite ─────────────────────────────────
import drapeauRdc from '../../assets/drapeau_rdc.svg';
import armoiriesRdc from '../../assets/armoiries_rdc.svg';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BulletinCTBEModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Eleve;
  anneeScolaire?: string;
  anneeEtude?: '7' | '8';
}

interface BrancheConfig {
  id: string;
  nom: string;
  maxP: number;
  keywords: string[];
}

interface SousDomaine {
  titre: string;
  branches: BrancheConfig[];
}

interface Domaine {
  titre: string;
  sousDomaines: SousDomaine[];
}

// ─── Composant Principal ───────────────────────────────────────────────────

export const BulletinCTBEModal: React.FC<BulletinCTBEModalProps> = ({
  isOpen,
  onClose,
  student,
  anneeEtude: initialAnnee = '7',
}) => {
  const [annee, setAnnee] = useState<'7' | '8'>(
    student.nomClasse?.includes('8') ? '8' : initialAnnee
  );
  const [realGrades, setRealGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !student.id) return;
    (async () => {
      setLoading(true);
      try {
        const g = await LocalDatabaseService.getGrades(student.id);
        setRealGrades(g || []);
      } catch {
        setRealGrades([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, student.id]);

  if (!isOpen) return null;

  // ── Configuration branches/maxima par domaine ─────────────────────
  const is8 = annee === '8';

  const domaines: Domaine[] = [
    {
      titre: 'DOMAINE DES SCIENCES',
      sousDomaines: [
        {
          titre: 'Sous-domaine des mathématiques',
          branches: [
            { id: 'alg', nom: 'Algèbre', maxP: 40, keywords: ['algèbre', 'algebre'] },
            { id: 'ari', nom: 'Arithmétique', maxP: 10, keywords: ['arithmétique', 'arithmetique'] },
            { id: 'geo', nom: 'Géométrie', maxP: 20, keywords: ['géométrie', 'geometrie'] },
            { id: 'sta', nom: 'Statistique', maxP: 10, keywords: ['statistique', 'stat'] },
          ],
        },
        {
          titre: 'Sous-domaine des sciences de la vie et de la terre (SVT)',
          branches: [
            { id: 'ana', nom: 'Anatomie', maxP: 10, keywords: ['anatomie'] },
            { id: 'bot', nom: 'Botanique', maxP: 10, keywords: ['botanique'] },
            { id: 'zoo', nom: 'Zoologie', maxP: is8 ? 20 : 10, keywords: ['zoologie'] },
          ],
        },
        {
          titre: 'Sous-domaine des sciences physique, technologie et TIC',
          branches: [
            { id: 'phy', nom: 'Sciences Physiques', maxP: 10, keywords: ['physique'] },
            { id: 'tec', nom: 'Technologie', maxP: 10, keywords: ['technologie'] },
            { id: 'tic', nom: "Techno. D'Info. & Com (TIC)", maxP: 10, keywords: ['tic', 'informatique'] },
          ],
        },
      ],
    },
    {
      titre: 'DOMAINE DES LANGUES',
      sousDomaines: [
        {
          titre: '',
          branches: [
            { id: 'ang', nom: 'Anglais', maxP: 30, keywords: ['anglais'] },
            { id: 'fra', nom: 'Français', maxP: is8 ? 50 : 70, keywords: ['français', 'francais'] },
          ],
        },
      ],
    },
    {
      titre: "DOMAINE DE L'UNIVERS SOCIAL ET ENVIRONNEMENT",
      sousDomaines: [
        {
          titre: '',
          branches: [
            { id: 'edv', nom: 'Éducation à la vie (1)', maxP: 20, keywords: ['vie', 'edv'] },
            { id: 'ecm', nom: 'Éducation civique et morale', maxP: 20, keywords: ['civique', 'morale', 'ecm'] },
            { id: 'geog', nom: 'Géographie', maxP: is8 ? 30 : 20, keywords: ['géographie', 'geographie'] },
            { id: 'his', nom: 'Histoire', maxP: 20, keywords: ['histoire'] },
          ],
        },
      ],
    },
    {
      titre: 'DOMAINE DES ARTS',
      sousDomaines: [
        {
          titre: '',
          branches: [
            { id: 'des', nom: 'Dessin', maxP: 20, keywords: ['dessin'] },
            { id: 'mus', nom: 'Musique', maxP: 20, keywords: ['musique'] },
          ],
        },
      ],
    },
    {
      titre: 'DOMAINE DU DEVELOPPEMENT PERSONNEL',
      sousDomaines: [
        {
          titre: '',
          branches: [
            { id: 'eps', nom: 'Éducation physique', maxP: 20, keywords: ['physique', 'sport', 'eps'] },
          ],
        },
      ],
    },
  ];

  // ── Mapping cotes réelles ────────────────────────────────────────
  type GradeSlots = { p1?: number; p2?: number; ex1?: number; p3?: number; p4?: number; ex2?: number };
  const gMap: Record<string, GradeSlots> = {};

  domaines.forEach((d) =>
    d.sousDomaines.forEach((sd) =>
      sd.branches.forEach((b) => {
        gMap[b.id] = {};
        realGrades
          .filter((g: any) => {
            const n = (g.nomDiscipline || g.disciplineId || '').toLowerCase();
            return b.keywords.some((k) => n.includes(k));
          })
          .forEach((g: any) => {
            const p = (g.periode || '').toUpperCase();
            if (p === 'P1') gMap[b.id].p1 = g.note;
            else if (p === 'P2') gMap[b.id].p2 = g.note;
            else if (['EX1', 'EXAM1', 'S1'].includes(p)) gMap[b.id].ex1 = g.note;
            else if (p === 'P3') gMap[b.id].p3 = g.note;
            else if (p === 'P4') gMap[b.id].p4 = g.note;
            else if (['EX2', 'EXAM2', 'S2'].includes(p)) gMap[b.id].ex2 = g.note;
          });
      })
    )
  );

  // ── Helpers ──────────────────────────────────────────────────────
  const v = (n?: number) => (n !== undefined && n !== null ? n : '');

  const sumIfAny = (...vals: (number | undefined)[]): number | null => {
    const defined = vals.filter((x) => x !== undefined) as number[];
    return defined.length > 0 ? defined.reduce((a, b) => a + b, 0) : null;
  };

  // ── PDF / Print ─────────────────────────────────────────────────
  const handlePDF = () => {
    const el = document.getElementById('bulletin-ctbe-content');
    if (!el) return;
    import('html2pdf.js')
      .then((mod) => {
        const html2pdf = mod.default || mod;
        html2pdf()
          .set({
            margin: [2, 2, 2, 2],
            filename: `Bulletin_${annee}e_CTBE_${student.nom}_${student.prenom}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
          })
          .from(el)
          .save();
      })
      .catch(() => window.print());
  };

  // ── Totaux généraux ─────────────────────────────────────────────
  let gMaxP = 0;
  let gTotP1: number | null = null;
  let gTotP2: number | null = null;
  let gTotEx1: number | null = null;
  let gTotS1: number | null = null;
  let gTotP3: number | null = null;
  let gTotP4: number | null = null;
  let gTotEx2: number | null = null;
  let gTotS2: number | null = null;

  const accum = (val: number | undefined, acc: number | null): number | null =>
    val !== undefined ? (acc ?? 0) + val : acc;

  domaines.forEach((d) =>
    d.sousDomaines.forEach((sd) =>
      sd.branches.forEach((b) => {
        const g = gMap[b.id] || {};
        gMaxP += b.maxP;
        gTotP1 = accum(g.p1, gTotP1);
        gTotP2 = accum(g.p2, gTotP2);
        gTotEx1 = accum(g.ex1, gTotEx1);
        gTotP3 = accum(g.p3, gTotP3);
        gTotP4 = accum(g.p4, gTotP4);
        gTotEx2 = accum(g.ex2, gTotEx2);

        const s1 = sumIfAny(g.p1, g.p2, g.ex1);
        if (s1 !== null) gTotS1 = (gTotS1 ?? 0) + s1;

        const s2 = sumIfAny(g.p3, g.p4, g.ex2);
        if (s2 !== null) gTotS2 = (gTotS2 ?? 0) + s2;
      })
    )
  );

  const gMaxTJ = gMaxP * 2;
  const gMaxEx = gMaxP * 2;
  const gMaxSem = gMaxTJ + gMaxEx;
  const gMaxTG = gMaxSem * 2;
  const gTotTG = gTotS1 !== null || gTotS2 !== null ? (gTotS1 ?? 0) + (gTotS2 ?? 0) : null;

  const pct = (val: number | null, max: number) =>
    val !== null ? ((val / max) * 100).toFixed(0) + '%' : '';

  // ── Styles inline pour l'impression ──────────────────────────────
  const S = {
    page: {
      fontFamily: "'Segoe UI', Tahoma, sans-serif",
      fontSize: '9.5px',
      lineHeight: '1.3',
      color: '#000',
      background: '#fff',
      padding: '10px',
    } as React.CSSProperties,
    cell: {
      border: '1px solid #000',
      padding: '2px 3px',
      textAlign: 'center' as const,
      verticalAlign: 'middle' as const,
    } as React.CSSProperties,
    cellLeft: {
      border: '1px solid #000',
      padding: '2px 4px',
      textAlign: 'left' as const,
      verticalAlign: 'middle' as const,
    } as React.CSSProperties,
    headerCell: {
      border: '1px solid #000',
      padding: '2px 3px',
      textAlign: 'center' as const,
      verticalAlign: 'middle' as const,
      fontWeight: 900,
      background: '#e2e8f0',
      fontSize: '8.5px',
    } as React.CSSProperties,
    domaineRow: {
      border: '1px solid #000',
      padding: '2px 6px',
      textAlign: 'left' as const,
      fontWeight: 900,
      fontSize: '8.5px',
      background: '#cbd5e1',
      textTransform: 'uppercase' as const,
    } as React.CSSProperties,
    sousDomaineRow: {
      border: '1px solid #000',
      padding: '2px 10px',
      textAlign: 'left' as const,
      fontWeight: 700,
      fontStyle: 'italic' as const,
      fontSize: '8.5px',
      background: '#f1f5f9',
    } as React.CSSProperties,
    sousTotalRow: {
      border: '1px solid #000',
      padding: '2px 4px',
      fontWeight: 900,
      background: '#e2e8f0',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    maximaRow: {
      border: '1px solid #000',
      padding: '3px',
      fontWeight: 900,
      background: '#000',
      color: '#fff',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    totauxRow: {
      border: '1px solid #000',
      padding: '2px 4px',
      fontWeight: 900,
      background: '#f8fafc',
      textAlign: 'center' as const,
    } as React.CSSProperties,
    box: {
      display: 'inline-flex',
      width: '13px',
      height: '15px',
      border: '1px solid #000',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'monospace',
      fontSize: '9px',
      fontWeight: 900,
      background: '#fff',
      marginRight: '1px',
    } as React.CSSProperties,
  };

  const boxes = (n: number, txt = '') => {
    const chars = txt.padEnd(n, ' ').slice(0, n).split('');
    return (
      <span style={{ display: 'inline-flex', marginLeft: '4px' }}>
        {chars.map((c, i) => (
          <span key={i} style={S.box}>{c !== ' ' ? c : ''}</span>
        ))}
      </span>
    );
  };

  // ── Rendu principal ─────────────────────────────────────────────

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '8px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        width: '100%', maxWidth: '900px', height: '96vh',
        borderRadius: '16px', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
      }}>

        {/* ═══ BARRE D'OUTILS (no-print) ═══ */}
        <div className="no-print" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px', background: '#0f172a', color: '#fff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', background: '#4f46e5' }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '13px' }}>
                Bulletin Officiel EPST — {annee}ème CTBE
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                {student.prenom} {student.nom}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', padding: '3px', borderRadius: '10px', background: '#1e293b', border: '1px solid #334155' }}>
              {(['7', '8'] as const).map((a) => (
                <button key={a} onClick={() => setAnnee(a)}
                  style={{
                    padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 900, cursor: 'pointer',
                    border: 'none', transition: 'all .2s',
                    background: annee === a ? '#4f46e5' : 'transparent',
                    color: annee === a ? '#fff' : '#64748b',
                  }}>
                  {a}ème
                </button>
              ))}
            </div>
            <button onClick={handlePDF} style={{
              padding: '6px 14px', borderRadius: '10px', background: '#059669', color: '#fff',
              fontWeight: 900, fontSize: '11px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <Download size={14} /> PDF
            </button>
            <button onClick={() => window.print()} style={{
              padding: '6px 14px', borderRadius: '10px', background: '#4f46e5', color: '#fff',
              fontWeight: 700, fontSize: '11px', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              <Printer size={14} /> Imprimer
            </button>
            <button onClick={onClose} style={{
              padding: '6px', borderRadius: '10px', background: 'transparent', color: '#94a3b8',
              border: 'none', cursor: 'pointer',
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ═══ CONTENU BULLETIN — identique au gabarit scanné ═══ */}
        <div id="bulletin-ctbe-content" style={{ ...S.page, overflow: 'auto', flex: 1, padding: '14px 18px' }}>

          {/* ─── EN-TÊTE INSTITUTIONNEL ─── */}
          <div style={{ border: '2px solid #000', padding: '8px', marginBottom: '6px' }}>

            {/* Ligne Drapeau — Titre — Armoiries */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px',
            }}>
              <img src={drapeauRdc} alt="Drapeau RDC" style={{ width: '90px', height: '65px', border: '1px solid #000', objectFit: 'cover' }} />
              <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  REPUBLIQUE DEMOCRATIQUE DU CONGO
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 900, textTransform: 'uppercase' }}>
                  MINISTERE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE
                </div>
                <div style={{ fontSize: '11.5px', fontWeight: 900, textTransform: 'uppercase' }}>
                  ET PROFESSIONNEL
                </div>
              </div>
              <img src={armoiriesRdc} alt="Armoiries RDC" style={{ width: '65px', height: '75px', objectFit: 'contain' }} />
            </div>

            {/* Ligne N° ID */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontSize: '10px', fontWeight: 900 }}>
              <span style={{ width: '38px' }}>N° ID</span>
              {boxes(24, student.registrationNumber || '')}
            </div>

            {/* Grille d'identification */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', fontSize: '10px', fontWeight: 600 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div><strong>PROVINCE :</strong> .................................................</div>
                <div><strong>VILLE :</strong> .................................................</div>
                <div><strong>COMMUNE / TER (1) :</strong> .................................................</div>
                <div><strong>ECOLE :</strong> .................................................</div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <strong style={{ marginRight: '4px' }}>CODE</strong>
                  {boxes(10, '')}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div><strong>ELEVE :</strong> <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>{student.nom} {student.postnom || ''} {student.prenom}</span></div>
                <div><strong>SEXE :</strong> {student.sexe || '........'}</div>
                <div><strong>NE (E) A :</strong> {student.lieuNaissance || '..................'} <strong>Le</strong> {student.dateNaissance || '....../....../......'}</div>
                <div><strong>CLASSE :</strong> {annee}ème Année CTBE</div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '2px' }}>
                  <strong style={{ marginRight: '4px' }}>N° PERM.</strong>
                  {boxes(12, '')}
                </div>
              </div>
            </div>

            {/* Bandeau titre */}
            <div style={{
              marginTop: '8px', padding: '4px 0', background: '#000', color: '#fff',
              textAlign: 'center', fontWeight: 900, fontSize: '10.5px',
              letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              BULLETIN DE LA {annee}<sup>ème</sup> ANNEE CYCLE TERMINAL DE L'EDUCATION DE BASE (CTBE) ANNEE SCOLAIRE 2 0 ..... 2 0 .....
            </div>
          </div>

          {/* ─── TABLEAU CENTRAL ─── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid #000' }}>
            <thead>
              <tr>
                <th rowSpan={3} style={{ ...S.headerCell, width: '160px', textAlign: 'left', paddingLeft: '6px' }}>BRANCHE</th>
                <th colSpan={4} style={S.headerCell}>PREMIER SEMESTRE</th>
                <th colSpan={4} style={S.headerCell}>SECOND SEMESTRE</th>
                <th rowSpan={3} style={{ ...S.headerCell, width: '36px' }}>T.G.</th>
                <th colSpan={2} rowSpan={2} style={S.headerCell}>EXAMEN DE<br/>REPECHAGE</th>
              </tr>
              <tr>
                <th rowSpan={2} style={{ ...S.headerCell, width: '30px' }}>MAX</th>
                <th colSpan={2} style={S.headerCell}>TRAVAUX<br/>JOURNAL</th>
                <th rowSpan={2} style={{ ...S.headerCell, width: '38px' }}>MAX<br/>EXAMEN</th>
                <th rowSpan={2} style={{ ...S.headerCell, width: '32px' }}>TOT</th>
                <th rowSpan={2} style={{ ...S.headerCell, width: '30px' }}>MAX</th>
                <th colSpan={2} style={S.headerCell}>TRAVAUX<br/>JOURNAL</th>
                <th rowSpan={2} style={{ ...S.headerCell, width: '38px' }}>EXAMEN</th>
                <th rowSpan={2} style={{ ...S.headerCell, width: '32px' }}>TOT</th>
              </tr>
              <tr>
                <th style={{ ...S.headerCell, width: '28px' }}>1<sup>ère</sup> P</th>
                <th style={{ ...S.headerCell, width: '28px' }}>2<sup>ème</sup> P</th>
                <th style={{ ...S.headerCell, width: '28px' }}>3<sup>ème</sup> P</th>
                <th style={{ ...S.headerCell, width: '28px' }}>4<sup>ème</sup> P</th>
                <th style={{ ...S.headerCell, width: '28px' }}>%</th>
                <th style={{ ...S.headerCell, width: '52px' }}>Sign. Prof</th>
              </tr>
            </thead>
            <tbody>
              {domaines.map((dom, di) => {
                // Accumulateurs pour SOUS-TOTAL du domaine
                let dMaxP = 0;
                let dP1: number | null = null, dP2: number | null = null, dEx1: number | null = null, dS1: number | null = null;
                let dP3: number | null = null, dP4: number | null = null, dEx2: number | null = null, dS2: number | null = null;
                let dTG: number | null = null;

                return (
                  <React.Fragment key={di}>
                    {/* Bandeau domaine */}
                    <tr><td colSpan={14} style={S.domaineRow}>{dom.titre}</td></tr>

                    {dom.sousDomaines.map((sd, si) => (
                      <React.Fragment key={si}>
                        {sd.titre && (
                          <tr><td colSpan={14} style={S.sousDomaineRow}>{sd.titre}</td></tr>
                        )}

                        {sd.branches.map((b) => {
                          const g = gMap[b.id] || {};
                          dMaxP += b.maxP;

                          dP1 = accum(g.p1, dP1);
                          dP2 = accum(g.p2, dP2);
                          dEx1 = accum(g.ex1, dEx1);
                          dP3 = accum(g.p3, dP3);
                          dP4 = accum(g.p4, dP4);
                          dEx2 = accum(g.ex2, dEx2);

                          const s1 = sumIfAny(g.p1, g.p2, g.ex1);
                          if (s1 !== null) dS1 = (dS1 ?? 0) + s1;
                          const s2 = sumIfAny(g.p3, g.p4, g.ex2);
                          if (s2 !== null) dS2 = (dS2 ?? 0) + s2;
                          const tg = s1 !== null || s2 !== null ? (s1 ?? 0) + (s2 ?? 0) : null;
                          if (tg !== null) dTG = (dTG ?? 0) + tg;

                          return (
                            <tr key={b.id}>
                              <td style={{ ...S.cellLeft, paddingLeft: '16px', fontWeight: 500 }}>{b.nom}</td>
                              <td style={{ ...S.cell, fontWeight: 700 }}>{b.maxP}</td>
                              <td style={S.cell}>{v(g.p1)}</td>
                              <td style={S.cell}>{v(g.p2)}</td>
                              <td style={{ ...S.cell, fontWeight: 700 }}>{v(g.ex1)}</td>
                              <td style={{ ...S.cell, fontWeight: 900 }}>{v(s1 ?? undefined)}</td>
                              <td style={{ ...S.cell, fontWeight: 700 }}>{b.maxP}</td>
                              <td style={S.cell}>{v(g.p3)}</td>
                              <td style={S.cell}>{v(g.p4)}</td>
                              <td style={{ ...S.cell, fontWeight: 700 }}>{v(g.ex2)}</td>
                              <td style={{ ...S.cell, fontWeight: 900 }}>{v(s2 ?? undefined)}</td>
                              <td style={{ ...S.cell, fontWeight: 900, background: '#f8fafc' }}>{v(tg ?? undefined)}</td>
                              <td style={S.cell}></td>
                              <td style={S.cell}></td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}

                    {/* SOUS-TOTAL */}
                    <tr>
                      <td style={{ ...S.sousTotalRow, textAlign: 'left', paddingLeft: '6px' }}>SOUS-TOTAL</td>
                      <td style={S.sousTotalRow}>{dMaxP}</td>
                      <td style={S.sousTotalRow}>{v(dP1 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dP2 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dEx1 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dS1 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{dMaxP}</td>
                      <td style={S.sousTotalRow}>{v(dP3 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dP4 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dEx2 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dS2 ?? undefined)}</td>
                      <td style={S.sousTotalRow}>{v(dTG ?? undefined)}</td>
                      <td style={S.sousTotalRow}></td>
                      <td style={S.sousTotalRow}></td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* MAXIMA GENERAUX */}
              <tr>
                <td style={{ ...S.maximaRow, textAlign: 'left', paddingLeft: '6px' }}>MAXIMA GENERAUX</td>
                <td style={S.maximaRow}>{gMaxP}</td>
                <td style={S.maximaRow}>{gMaxP}</td>
                <td style={S.maximaRow}>{gMaxP}</td>
                <td style={S.maximaRow}>{gMaxEx}</td>
                <td style={S.maximaRow}>{gMaxSem}</td>
                <td style={S.maximaRow}>{gMaxP}</td>
                <td style={S.maximaRow}>{gMaxP}</td>
                <td style={S.maximaRow}>{gMaxP}</td>
                <td style={S.maximaRow}>{gMaxEx}</td>
                <td style={S.maximaRow}>{gMaxSem}</td>
                <td style={S.maximaRow}>{gMaxTG}</td>
                <td style={S.maximaRow}></td>
                <td style={S.maximaRow}></td>
              </tr>

              {/* TOTAUX */}
              <tr>
                <td style={{ ...S.totauxRow, textAlign: 'left', paddingLeft: '6px' }}>TOTAUX</td>
                <td style={S.totauxRow}></td>
                <td style={S.totauxRow}>{v(gTotP1 ?? undefined)}</td>
                <td style={S.totauxRow}>{v(gTotP2 ?? undefined)}</td>
                <td style={S.totauxRow}>{v(gTotEx1 ?? undefined)}</td>
                <td style={{ ...S.totauxRow, fontWeight: 900 }}>{v(gTotS1 ?? undefined)}</td>
                <td style={S.totauxRow}></td>
                <td style={S.totauxRow}>{v(gTotP3 ?? undefined)}</td>
                <td style={S.totauxRow}>{v(gTotP4 ?? undefined)}</td>
                <td style={S.totauxRow}>{v(gTotEx2 ?? undefined)}</td>
                <td style={{ ...S.totauxRow, fontWeight: 900 }}>{v(gTotS2 ?? undefined)}</td>
                <td style={{ ...S.totauxRow, fontWeight: 900, fontSize: '10px' }}>{v(gTotTG ?? undefined)}</td>

                {/* Cellule décision */}
                <td colSpan={2} rowSpan={6} style={{
                  ...S.cell, verticalAlign: 'top', textAlign: 'left', padding: '6px', fontSize: '9px',
                }}>
                  <div style={{ fontWeight: 900, marginBottom: '4px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '1.5px solid #000', borderRadius: '50%', marginRight: '5px', verticalAlign: 'middle' }}></span>
                    PASSE (1)
                  </div>
                  <div style={{ fontWeight: 900, marginBottom: '8px' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '1.5px solid #000', borderRadius: '50%', marginRight: '5px', verticalAlign: 'middle' }}></span>
                    DOUBLE (1)
                  </div>
                  <div style={{ fontSize: '8.5px', marginBottom: '2px' }}>LE ..... / ..... / 20.....</div>
                  <div style={{ fontWeight: 900, fontSize: '8.5px', marginTop: '8px' }}>Le chef d'établissement</div>
                  <div style={{
                    width: '55px', height: '30px', border: '1px dashed #94a3b8', borderRadius: '4px',
                    marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '7px', color: '#94a3b8',
                  }}>
                    Sceau de l'école
                  </div>
                </td>
              </tr>

              {/* POURCENTAGE */}
              <tr>
                <td style={{ ...S.totauxRow, textAlign: 'left', paddingLeft: '6px' }}>POURCENTAGE</td>
                <td style={S.totauxRow}></td>
                <td style={S.totauxRow}>{pct(gTotP1, gMaxP)}</td>
                <td style={S.totauxRow}>{pct(gTotP2, gMaxP)}</td>
                <td style={S.totauxRow}>{pct(gTotEx1, gMaxEx)}</td>
                <td style={{ ...S.totauxRow, fontWeight: 900 }}>{pct(gTotS1, gMaxSem)}</td>
                <td style={S.totauxRow}></td>
                <td style={S.totauxRow}>{pct(gTotP3, gMaxP)}</td>
                <td style={S.totauxRow}>{pct(gTotP4, gMaxP)}</td>
                <td style={S.totauxRow}>{pct(gTotEx2, gMaxEx)}</td>
                <td style={{ ...S.totauxRow, fontWeight: 900 }}>{pct(gTotS2, gMaxSem)}</td>
                <td style={{ ...S.totauxRow, fontWeight: 900 }}>{pct(gTotTG, gMaxTG)}</td>
              </tr>

              {/* PLACE / NBRE D'ÉLÈVES */}
              <tr>
                <td style={{ ...S.cell, textAlign: 'left', paddingLeft: '6px', fontWeight: 700 }}>PLACE/NBRE D'ELEVES</td>
                {Array.from({ length: 11 }).map((_, i) => <td key={i} style={S.cell}></td>)}
              </tr>

              {/* APPLICATION */}
              <tr>
                <td style={{ ...S.cell, textAlign: 'left', paddingLeft: '6px', fontWeight: 700 }}>APPLICATION</td>
                {Array.from({ length: 11 }).map((_, i) => <td key={i} style={S.cell}></td>)}
              </tr>

              {/* CONDUITE */}
              <tr>
                <td style={{ ...S.cell, textAlign: 'left', paddingLeft: '6px', fontWeight: 700 }}>CONDUITE</td>
                {Array.from({ length: 11 }).map((_, i) => <td key={i} style={S.cell}></td>)}
              </tr>

              {/* SIGNATURE */}
              <tr>
                <td style={{ ...S.cell, textAlign: 'left', paddingLeft: '6px', fontWeight: 700 }}>SIGNATURE</td>
                {Array.from({ length: 11 }).map((_, i) => <td key={i} style={S.cell}></td>)}
              </tr>
            </tbody>
          </table>

          {/* ─── PIED DE BULLETIN ─── */}
          <div style={{ marginTop: '10px', paddingTop: '6px', borderTop: '2px solid #000', fontSize: '9px' }}>
            <p style={{ margin: '2px 0' }}>
              - L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en ............................................................................................................................................................................ (1)
            </p>
            <p style={{ margin: '2px 0' }}>- L'élève passe dans la classe supérieure (1)</p>
            <p style={{ margin: '2px 0' }}>- L'élève double la classe (1)</p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700 }}>Sceau de l'école</div>
                <div style={{
                  width: '70px', height: '35px', border: '1px dashed #94a3b8', borderRadius: '4px',
                  marginTop: '4px',
                }}></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div>Fait à ........................................ le .......... / .......... / 20.......</div>
                <div style={{ fontWeight: 900, marginTop: '4px' }}>Le Chef d'Établissement</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <div style={{ textAlign: 'center' }}>
                <div>Signature de l'élève</div>
                <div style={{ width: '100px', borderBottom: '1px solid #000', marginTop: '14px' }}></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div>Nom et Signature</div>
                <div style={{ width: '100px', borderBottom: '1px solid #000', marginTop: '14px' }}></div>
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: '8px',
              paddingTop: '4px', borderTop: '1px solid #ccc', fontSize: '8px', fontStyle: 'italic', color: '#555',
            }}>
              <span>(1) Biffer la mention inutile</span>
              <span>Note importante : Le Bulletin est sans valeur s'il est raturé ou surchargé</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, fontStyle: 'normal' }}>IGE/P.S./010</span>
            </div>
          </div>

        </div>

        {/* ═══ BARRE INFÉRIEURE (no-print) ═══ */}
        <div className="no-print" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '11px', color: '#059669' }}>
            <CheckCircle2 size={14} /> Gabarit Officiel EPST RDC — Données réelles SQLite
          </span>
          <button onClick={onClose} style={{
            padding: '5px 14px', borderRadius: '10px', background: '#0f172a', color: '#fff',
            fontWeight: 700, fontSize: '11px', border: 'none', cursor: 'pointer',
          }}>
            Fermer
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
