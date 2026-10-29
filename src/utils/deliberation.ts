import type { Cote, Discipline, Eleve, ClasseScolaire } from '../types';

export type TypeDecisionDeliberation =
  | 'ADMIS'
  | 'ADMIS_DISTINCTION'
  | 'REPECHAGE'
  | 'REDOUBLEMENT'
  | 'EXCLUSION'
  | 'NON_DELIBERE';

export interface DeliberationRules {
  /** Pourcentage général minimum pour passer d’office (défaut 50). */
  passThreshold: number;
  /** Seuil inférieur autorisant le repêchage (défaut 45). */
  repechageThreshold: number;
  /** Pourcentage en dessous duquel on redouble automatiquement (défaut 45). */
  redoublementThreshold: number;
  /** Nombre maximum de branches secondaires en échec autorisant un repêchage (défaut 3). */
  maxMinorFailsForRepechage: number;
  /** Pourcentage minimum dans une branche majeure de l’option (défaut 50). */
  majorSubjectThreshold: number;
}

export const DEFAULT_DELIBERATION_RULES: DeliberationRules = {
  passThreshold: 50,
  repechageThreshold: 45,
  redoublementThreshold: 45,
  maxMinorFailsForRepechage: 3,
  majorSubjectThreshold: 50,
};

export interface Mention {
  code: string;
  label: string;
  color: string;
}

export function getMention(pct: number): Mention {
  if (pct >= 90) return { code: 'PGD', label: 'Plus Grande Distinction', color: 'text-emerald-600' };
  if (pct >= 80) return { code: 'GD', label: 'Grande Distinction', color: 'text-indigo-600' };
  if (pct >= 70) return { code: 'D', label: 'Distinction', color: 'text-sky-600' };
  if (pct >= 60) return { code: 'S', label: 'Satisfaction', color: 'text-teal-600' };
  if (pct >= 50) return { code: 'P', label: 'Passable', color: 'text-amber-600' };
  return { code: 'A', label: 'Ajourné / Insuffisant', color: 'text-rose-600' };
}

export interface SubjectResult {
  subject: Discipline;
  earned: number;
  possible: number;
  percent: number;
  passed: boolean;
  isMajor: boolean;
}

export interface StudentDeliberationResult {
  eleve: Eleve;
  subjectResults: SubjectResult[];
  totalEarned: number;
  totalPossible: number;
  generalPercent: number;
  failedMajorSubjects: SubjectResult[];
  failedMinorSubjects: SubjectResult[];
  mention: Mention;
  decision: TypeDecisionDeliberation;
  reason: string;
  rank?: number;
}

/**
 * Détermine les codes de périodes utilisées pour un cycle donné.
 */
export function getPeriodsForCycle(cycleCode?: string): string[] {
  if ((cycleCode || '').toUpperCase() === 'MATERNELLE') {
    return ['T1', 'T2', 'T3'];
  }
  return ['P1', 'P2', 'EX1', 'P3', 'P4', 'EX2'];
}

function isMajorSubject(s: Discipline): boolean {
  if (s.isOptionMajora !== undefined) return !!s.isOptionMajora;
  return (s.coefficient || 1) >= 3;
}

function groupCotesBySubject(
  cotes: Cote[],
  subjectIds: Set<string>
): Record<string, Cote[]> {
  const groups: Record<string, Cote[]> = {};
  for (const c of cotes) {
    const mid = c.matiereId || 'unknown';
    if (!subjectIds.has(mid)) continue;
    if (!groups[mid]) groups[mid] = [];
    groups[mid].push(c);
  }
  return groups;
}

/**
 * Calcule le résultat annuel d’un élève pour un contexte classe / option / matières.
 * Les cotes validées uniquement sont prises en compte par défaut.
 */
export function computeStudentAnnualResult(
  eleve: Eleve,
  cotes: Cote[],
  subjects: Discipline[],
  rules: DeliberationRules = DEFAULT_DELIBERATION_RULES,
  onlyValidated: boolean = false
): StudentDeliberationResult {
  const subjectIds = new Set(subjects.map((s) => s.id));
  const filteredCotes = onlyValidated
    ? cotes.filter(
        (c) =>
          c.eleveId === eleve.id &&
          subjectIds.has(c.matiereId || '') &&
          (!c.statut || ['VALIDE_TITULAIRE', 'VALIDE_DE'].includes(c.statut))
      )
    : cotes.filter((c) => c.eleveId === eleve.id && subjectIds.has(c.matiereId || ''));

  const cotesBySubject = groupCotesBySubject(filteredCotes, subjectIds);

  const subjectResults: SubjectResult[] = subjects
    .map((subject) => {
      const list = cotesBySubject[subject.id] || [];
      const earned = list.reduce((sum, c) => sum + (c.score || 0), 0);
      const possible = list.reduce((sum, c) => sum + (c.maxScore || 0), 0);
      const percent = possible > 0 ? Math.round((earned / possible) * 1000) / 10 : 0;
      const isMajor = isMajorSubject(subject);
      const passed = percent >= (isMajor ? rules.majorSubjectThreshold : rules.passThreshold);
      return { subject, earned, possible, percent, passed, isMajor };
    })
    .filter((r) => r.possible > 0);

  const totalEarned = subjectResults.reduce((sum, r) => sum + r.earned, 0);
  const totalPossible = subjectResults.reduce((sum, r) => sum + r.possible, 0);
  const generalPercent = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 1000) / 10 : 0;

  const failedMajorSubjects = subjectResults.filter((r) => r.isMajor && !r.passed);
  const failedMinorSubjects = subjectResults.filter((r) => !r.isMajor && !r.passed);

  const { decision, reason } = determineDecision(
    generalPercent,
    failedMajorSubjects,
    failedMinorSubjects,
    rules
  );

  return {
    eleve,
    subjectResults,
    totalEarned,
    totalPossible,
    generalPercent,
    failedMajorSubjects,
    failedMinorSubjects,
    mention: getMention(generalPercent),
    decision,
    reason,
  };
}

/**
 * Applique les règles EPST pour déterminer la décision.
 */
export function determineDecision(
  generalPercent: number,
  failedMajorSubjects: SubjectResult[],
  failedMinorSubjects: SubjectResult[],
  rules: DeliberationRules = DEFAULT_DELIBERATION_RULES
): { decision: TypeDecisionDeliberation; reason: string } {
  const hasMajorFail = failedMajorSubjects.length > 0;
  const minorFailCount = failedMinorSubjects.length;

  // Échec majeur option : si l'élève n'atteint pas 50% dans une matière majeure, pas d'admission simple.
  if (generalPercent >= rules.passThreshold && !hasMajorFail && minorFailCount === 0) {
    return {
      decision: generalPercent >= 70 ? 'ADMIS_DISTINCTION' : 'ADMIS',
      reason: `Pourcentage général ${generalPercent}% ≥ ${rules.passThreshold}% et aucune branche en échec.`,
    };
  }

  // Repêchage : entre 45% et 49,9% ou 1-3 branches secondaires en échec.
  if (
    (generalPercent >= rules.repechageThreshold && generalPercent < rules.passThreshold) ||
    (minorFailCount >= 1 && minorFailCount <= rules.maxMinorFailsForRepechage && !hasMajorFail)
  ) {
    if (hasMajorFail) {
      return {
        decision: 'REDOUBLEMENT',
        reason: `Branche(s) majeure(s) en échec : ${failedMajorSubjects.map((f) => f.subject.nom).join(', ')}.`,
      };
    }
    const parts: string[] = [];
    if (generalPercent < rules.passThreshold) parts.push(`moyenne ${generalPercent}% entre ${rules.repechageThreshold}% et ${rules.passThreshold}%`);
    if (minorFailCount > 0) parts.push(`${minorFailCount} branche(s) secondaire(s) en échec`);
    return {
      decision: 'REPECHAGE',
      reason: `Repêchage : ${parts.join(' et ')}.`,
    };
  }

  // Redoublement ou exclusion.
  if (generalPercent < rules.redoublementThreshold || minorFailCount > rules.maxMinorFailsForRepechage) {
    return {
      decision: 'REDOUBLEMENT',
      reason: generalPercent < rules.redoublementThreshold
        ? `Pourcentage général ${generalPercent}% < ${rules.redoublementThreshold}%.`
        : `Plus de ${rules.maxMinorFailsForRepechage} branches secondaires en échec (${minorFailCount}).`,
    };
  }

  // Cas résiduel : défaut de moyenne malgré un échec majeur isolé.
  if (hasMajorFail) {
    return {
      decision: 'REDOUBLEMENT',
      reason: `Branche majeure en échec : ${failedMajorSubjects.map((f) => f.subject.nom).join(', ')}.`,
    };
  }

  return {
    decision: 'REDOUBLEMENT',
    reason: 'Les conditions de passage ne sont pas remplies.',
  };
}

/**
 * Calcule le rang de chaque élève dans la classe selon le pourcentage général.
 */
export function rankResults(results: StudentDeliberationResult[]): StudentDeliberationResult[] {
  const sorted = [...results].sort((a, b) => b.generalPercent - a.generalPercent);
  return sorted.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export interface ClassDeliberationStats {
  inscrits: number;
  participants: number;
  admis: number;
  admisDistinction: number;
  repechage: number;
  redoublement: number;
  exclusion: number;
  nonDelibere: number;
  tauxReussite: number;
}

export function computeClassStats(results: StudentDeliberationResult[]): ClassDeliberationStats {
  const stats: ClassDeliberationStats = {
    inscrits: results.length,
    participants: results.filter((r) => r.totalPossible > 0).length,
    admis: 0,
    admisDistinction: 0,
    repechage: 0,
    redoublement: 0,
    exclusion: 0,
    nonDelibere: 0,
    tauxReussite: 0,
  };
  for (const r of results) {
    switch (r.decision) {
      case 'ADMIS':
        stats.admis++;
        break;
      case 'ADMIS_DISTINCTION':
        stats.admisDistinction++;
        break;
      case 'REPECHAGE':
        stats.repechage++;
        break;
      case 'REDOUBLEMENT':
        stats.redoublement++;
        break;
      case 'EXCLUSION':
        stats.exclusion++;
        break;
      default:
        stats.nonDelibere++;
    }
  }
  const passing = stats.admis + stats.admisDistinction;
  stats.tauxReussite = stats.inscrits > 0 ? Math.round((passing / stats.inscrits) * 1000) / 10 : 0;
  return stats;
}

/**
 * Retourne le libellé court d’une décision.
 */
export function getDecisionLabel(decision: TypeDecisionDeliberation): string {
  switch (decision) {
    case 'ADMIS':
      return 'Admis';
    case 'ADMIS_DISTINCTION':
      return 'Admis avec distinction';
    case 'REPECHAGE':
      return 'Repêchage';
    case 'REDOUBLEMENT':
      return 'Redoublement';
    case 'EXCLUSION':
      return 'Exclusion';
    default:
      return 'Non délibéré';
  }
}

/**
 * Retourne la couleur de badge associée à une décision.
 */
export function getDecisionColor(decision: TypeDecisionDeliberation): string {
  switch (decision) {
    case 'ADMIS':
    case 'ADMIS_DISTINCTION':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    case 'REPECHAGE':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'REDOUBLEMENT':
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
    case 'EXCLUSION':
      return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
    default:
      return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
  }
}
