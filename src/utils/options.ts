import { EPST_SECTIONS_OPTIONS } from '../data/referentielEpstData';
import type { Eleve, ClasseScolaire } from '../types';

/**
 * Carte de normalisation des libellés / codes d'options vers le code officiel EPST.
 * Permet de supporter les anciennes saisies (Math-Physique, Littéraire, …)
 * ainsi que les variantes de casse.
 */
const OPTION_ALIASES: Record<string, string> = {
  // Scientifique
  'math-physique': 'SCIENTIFIQUE',
  'mathematique-physique': 'SCIENTIFIQUE',
  'mathematiques-physique': 'SCIENTIFIQUE',
  'maths-physique': 'SCIENTIFIQUE',
  'math-phy': 'SCIENTIFIQUE',
  'maths-phy': 'SCIENTIFIQUE',
  'biologie-chimie': 'SCIENTIFIQUE',
  'bio-chimie': 'SCIENTIFIQUE',
  'svt': 'SCIENTIFIQUE',
  'sciences': 'SCIENTIFIQUE',
  'scientifique': 'SCIENTIFIQUE',
  'math-physique/chimie-biologie': 'SCIENTIFIQUE',

  // Commerciale
  'commerciale': 'COMMERCIALE',
  'commerciale & gestion': 'COMMERCIALE',
  'commerciale et gestion': 'COMMERCIALE',
  'gestion': 'COMMERCIALE',
  'comptabilite': 'COMMERCIALE',

  // Latin / Philo
  'littaire': 'LATIN_PHILO',
  'litteraire': 'LATIN_PHILO',
  'litt\u00e9raire': 'LATIN_PHILO',
  'latin-philo': 'LATIN_PHILO',
  'latin philo': 'LATIN_PHILO',
  'latin-philosophie': 'LATIN_PHILO',
  'latin philosophie': 'LATIN_PHILO',
  'philosophie': 'LATIN_PHILO',
  'langues': 'LATIN_PHILO',
  'philologie': 'LATIN_PHILO',

  // Pédagogie
  'pedagogie': 'PEDAGOGIE',
  'p\u00e9dagogie': 'PEDAGOGIE',
  'pedagogie generale': 'PEDAGOGIE',
  'education': 'PEDAGOGIE',

  // Informatique
  'informatique': 'INFORMATIQUE',
  'informatique de gestion': 'INFORMATIQUE',

  // Électricité
  'electricite': 'ELECTRICITE',
  '\u00e9lectricit\u00e9': 'ELECTRICITE',
  'electricite & construction industrielle': 'ELECTRICITE',

  // Coupe & Couture
  'coupe & couture': 'COUPE_COUTURE',
  'coupe-couture': 'COUPE_COUTURE',
  'coupe et couture': 'COUPE_COUTURE',
  'stylisme': 'COUPE_COUTURE',

  // Agriculture
  'agriculture': 'AGRICULTURE',
  'agriculture generale': 'AGRICULTURE',

  // Secrétariat
  'secretariat': 'SECRETARIAT',
  'secretariat et administration': 'SECRETARIAT',
  'administration': 'SECRETARIAT',

  // Tronc commun
  'tronc commun': 'TRONC_COMMUN',
  'tronc': 'TRONC_COMMUN',
  'all': 'TRONC_COMMUN',
  'toutes': 'TRONC_COMMUN',
};

export function normalizeOptionCode(value?: string | null): string | undefined {
  if (!value) return undefined;
  const raw = value.trim();
  if (!raw) return undefined;

  // Déjà un code officiel ?
  const upper = raw.toUpperCase();
  const official = EPST_SECTIONS_OPTIONS.find(o => o.value === upper);
  if (official) return official.value;

  // Alias
  const key = raw.toLowerCase().replace(/[_\-/\s]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const alias = OPTION_ALIASES[key];
  if (alias) return alias;

  // Tentative par correspondance partielle des libellés officiels
  const lower = raw.toLowerCase();
  for (const opt of EPST_SECTIONS_OPTIONS) {
    if (opt.value === 'ALL' || opt.value === 'TRONC_COMMUN') continue;
    const labelNorm = opt.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (labelNorm.includes(lower) || lower.includes(labelNorm)) return opt.value;
  }

  // Retourne la valeur nettoyée en majuscules avec underscores
  return raw.toUpperCase().replace(/[-\s/]+/g, '_');
}

export function getOptionLabel(value?: string | null): string {
  if (!value) return '—';
  const code = normalizeOptionCode(value) || value;
  const opt = EPST_SECTIONS_OPTIONS.find(o => o.value === code);
  return opt?.label || value;
}

/**
 * Renvoie l'option officielle d'un élève, en privilégiant l'option saisie
 * sur l'élève, puis l'option de sa classe, en normalisant.
 */
export function getStudentOption(student: Eleve, classes: ClasseScolaire[] = []): string {
  const cls = classes.find(c => c.id === student.classId || c.nom === student.nomClasse);
  return normalizeOptionCode(student.optionCode || student.optionEPST || cls?.optionCode) || 'TRONC_COMMUN';
}

export function getClassOption(cls?: ClasseScolaire | null): string {
  return normalizeOptionCode(cls?.optionCode) || 'TRONC_COMMUN';
}
