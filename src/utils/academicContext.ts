import type { ClasseScolaire, Discipline, MembrePersonnel } from '../types';
import { EPST_SECTIONS_OPTIONS, getCoursesForContext, normalizeNiveau } from '../data/referentielEpstData';

export const CYCLE_HUMANITES = 'HUMANITES';

export type OptionItem = { value: string; label: string };

/**
 * Dédoublonne les classes par nom en privilégiant celle qui a une option valide (non TRONC_COMMUN).
 */
export function dedupeClassesByName(classes: ClasseScolaire[]): ClasseScolaire[] {
  const seen = new Map<string, ClasseScolaire>();
  for (const c of classes) {
    const key = (c.nom || '').toLowerCase().trim();
    if (!key) continue;
    if (!seen.has(key)) {
      seen.set(key, c);
      continue;
    }
    const existing = seen.get(key)!;
    if (!existing.optionCode || existing.optionCode === 'TRONC_COMMUN') {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

function normalizeTokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\w\u00C0-\u017F]+/)
    .filter(t => t.length >= 3);
}

function hasCommonToken(a: string, b: string): boolean {
  const ta = new Set(normalizeTokens(a));
  const tb = normalizeTokens(b);
  return tb.some(t => ta.has(t));
}

/**
 * Détermine le cycle standardisé d'une classe à partir du cycle_id ou, à défaut,
 * du nom de la classe. Mappe les variantes connues vers les codes EPST officiels.
 */
export function getClassCycle(classObj?: ClasseScolaire): string {
  const cycleId = (classObj?.cycleId || '').toUpperCase().trim();
  const cycleAliases: Record<string, string> = {
    MATERNELLE: 'MATERNELLE',
    PRIMAIRE: 'PRIMAIRE',
    CTEB: 'SECONDAIRE_CTEB',
    SECONDAIRE_CTEB: 'SECONDAIRE_CTEB',
    SECONDAIRE: 'SECONDAIRE_CTEB',
    HUMANITES: 'HUMANITES',
    HUMANITE: 'HUMANITES',
    HUMANITES_S: 'HUMANITES',
  };
  if (cycleAliases[cycleId]) return cycleAliases[cycleId];

  const nom = (classObj?.nom || '').toLowerCase();
  if (nom.includes('humanit')) return CYCLE_HUMANITES;
  if (nom.includes('cteb') || nom.includes('éducation de base')) return 'SECONDAIRE_CTEB';
  if (nom.includes('primaire')) return 'PRIMAIRE';
  if (nom.includes('maternelle')) return 'MATERNELLE';
  if (nom.includes('secondaire') && nom.includes('7') && nom.includes('8')) return 'SECONDAIRE_CTEB';
  return '';
}

/**
 * Retourne les options autorisées pour une classe donnée.
 * - Humanités : l'option de la classe si déjà définie, sinon toutes les options EPST.
 * - Autres cycles : TRONC_COMMUN uniquement.
 * Si un enseignant est fourni, les options sont filtrées aux options que l'enseignant est susceptible d'enseigner.
 */
export function getAllowedOptionsForClass(
  classObj: ClasseScolaire | undefined,
  allClasses: ClasseScolaire[],
  staff?: MembrePersonnel | null
): OptionItem[] {
  const cycle = getClassCycle(classObj);

  if (cycle !== CYCLE_HUMANITES) {
    return EPST_SECTIONS_OPTIONS.filter(o => o.value === 'TRONC_COMMUN');
  }

  // Si la classe a déjà une option valide, c'est l'option par défaut.
  const classOption = classObj?.optionCode;
  const allHumaniteOptions = EPST_SECTIONS_OPTIONS.filter(
    o => o.value !== 'ALL' && o.value !== 'TRONC_COMMUN'
  );

  let baseOptions = allHumaniteOptions;
  if (classOption && classOption !== 'TRONC_COMMUN') {
    baseOptions = allHumaniteOptions.filter(o => o.value === classOption);
  }

  if (!staff) return baseOptions;

  // Options de l'enseignant : celles présentes dans ses classes / disciplines
  const teacherOptions = getTeacherOptionCodes(staff, allClasses);
  if (teacherOptions.size === 0) return baseOptions;

  return baseOptions.filter(o => teacherOptions.has(o.value));
}

/**
 * Extrait les codes d'option pertinents pour un enseignant à partir de ses classes assignées,
 * de son option titulaire, des sujets auxquels il est rattaché et de ses disciplines.
 */
export function getTeacherOptionCodes(
  staff: MembrePersonnel,
  allClasses: ClasseScolaire[]
): Set<string> {
  const set = new Set<string>();

  if (staff.optionTitulaireCode && staff.optionTitulaireCode !== 'TRONC_COMMUN') {
    set.add(staff.optionTitulaireCode);
  }

  const classNames = new Set([
    ...(staff.classesAssignees || []),
    ...(staff.classesTitularisees || []),
    staff.classeTitulaireId || '',
  ].filter(Boolean).map(c => c.toLowerCase().trim()));

  allClasses.forEach(c => {
    if (c.optionCode && c.optionCode !== 'TRONC_COMMUN' && classNames.has((c.nom || '').toLowerCase().trim())) {
      set.add(c.optionCode);
    }
  });

  (staff.coursAttribues || []).forEach(c => {
    const parsed = parseCoursString(c);
    const cls = allClasses.find(cl =>
      (cl.nom || '').toLowerCase().trim() === parsed.classeName.toLowerCase().trim()
    );
    if (cls?.optionCode && cls.optionCode !== 'TRONC_COMMUN') {
      set.add(cls.optionCode);
    }
  });

  return set;
}

/**
 * Parse une chaîne de type "Matière (Classe)" ou "Matière détaillée (Classe)".
 */
export function parseCoursString(cours: string): { matiereName: string; classeName: string } {
  const cleaned = (cours || '').trim();
  const match = cleaned.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (match) {
    return { matiereName: match[1].trim(), classeName: match[2].trim() };
  }
  return { matiereName: cleaned, classeName: '' };
}

/**
 * Vérifie si un enseignant est autorisé à enseigner / coter une matière dans une classe.
 */
export function isTeacherAllowedForSubject(
  staff: MembrePersonnel | null | undefined,
  subject: Discipline,
  classObj: ClasseScolaire | undefined,
  allClasses: ClasseScolaire[]
): boolean {
  if (!staff) return true;

  const subName = (subject.nom || '').toLowerCase().trim();
  const subCode = (subject.code || '').toLowerCase().trim();
  const className = (classObj?.nom || '').toLowerCase().trim();

  // 1. Correspondance directe par IDs
  if (subject.enseignantId === staff.id) return true;

  // 2. Correspondance par disciplines : nom exact, inclusion ou mot-clé commun.
  for (const d of staff.disciplines || []) {
    const disc = d.toLowerCase().trim();
    const { matiereName } = parseCoursString(d);
    const cleanDiscipline = matiereName.toLowerCase().trim() || disc;
    if (cleanDiscipline === subName || subName.includes(cleanDiscipline) || cleanDiscipline.includes(subName)) return true;
    if (subCode && (cleanDiscipline.includes(subCode) || subCode.includes(cleanDiscipline))) return true;
    if (hasCommonToken(cleanDiscipline, subName)) return true;
  }

  // 3. Correspondance par cours attribués "Matière (Classe)"
  for (const c of staff.coursAttribues || []) {
    const parsed = parseCoursString(c);
    const parsedMatiere = parsed.matiereName.toLowerCase().trim();
    const parsedClasse = parsed.classeName.toLowerCase().trim();

    const matchesSubject =
      parsedMatiere === subName ||
      subName.includes(parsedMatiere) ||
      parsedMatiere.includes(subName) ||
      (subCode && (parsedMatiere.includes(subCode) || subCode.includes(parsedMatiere)));

    if (!matchesSubject) continue;

    if (!className || !parsedClasse) return true;

    const sameClass =
      parsedClasse === className ||
      className.includes(parsedClasse) ||
      parsedClasse.includes(className);

    if (sameClass) return true;

    // Le cours attribué est peut-être pour une autre classe de la même option
    const assignedClass = allClasses.find(cl =>
      (cl.nom || '').toLowerCase().trim() === parsedClasse
    );
    if (
      assignedClass &&
      classObj &&
      assignedClass.optionCode &&
      assignedClass.optionCode === classObj.optionCode
    ) {
      return true;
    }
  }

  // 4. Correspondance par classes assignées ET disciplines
  const assignedClassNames = [
    ...(staff.classesAssignees || []),
    ...(staff.classesTitularisees || []),
    staff.classeTitulaireId || '',
  ].filter(Boolean).map(c => c.toLowerCase().trim());

  const matchesClass =
    !className ||
    assignedClassNames.some(c =>
      c === className || className.includes(c) || c.includes(className)
    );

  if (matchesClass) {
    for (const d of staff.disciplines || []) {
      const disc = d.toLowerCase().trim();
      // Extrait le nom de la matière de "Matière (Classe)" si présent
      const { matiereName } = parseCoursString(d);
      const cleanDiscipline = matiereName || disc;
      if (
        cleanDiscipline === subName ||
        subName.includes(cleanDiscipline) ||
        cleanDiscipline.includes(subName) ||
        hasCommonToken(cleanDiscipline, subName)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Infère le cycle EPST d'une matière quand cycleCode est manquant,
 * à partir de l'option, du code, du nom ou du groupe Maternelle.
 */
export function inferSubjectCycle(subject: Discipline): string {
  if (subject.cycleCode) return subject.cycleCode.toUpperCase().trim();
  if (subject.groupeMaternelle) return 'MATERNELLE';
  if (subject.optionCode && subject.optionCode !== 'TRONC_COMMUN' && subject.optionCode !== 'ALL') return 'HUMANITES';

  const code = (subject.code || '').toUpperCase().trim();
  if (code.startsWith('MAT-') || code.startsWith('MAT_')) return 'MATERNELLE';
  if (code.startsWith('PRIM-') || code.startsWith('PRIM_')) return 'PRIMAIRE';
  if (code.startsWith('CTEB-') || code.startsWith('CTEB_')) return 'SECONDAIRE_CTEB';
  if (code.startsWith('HUM-') || code.startsWith('HUM_')) return 'HUMANITES';

  const nom = (subject.nom || '').toLowerCase();
  if (nom.includes('maternelle')) return 'MATERNELLE';
  if (nom.includes('activité') || nom.includes('activite')) {
    // Les "Activités ..." correspondent au référentiel Maternelle EPST.
    // Si le max est 4 (Maternelle) ou qu'aucune autre info n'est connue, on classe en Maternelle.
    if ((subject.maxScore || 0) <= 4 || !nom.includes('primaire')) return 'MATERNELLE';
  }
  if (nom.includes('primaire')) return 'PRIMAIRE';
  if (nom.includes('cteb') || nom.includes('éducation de base') || nom.includes('education de base')) return 'SECONDAIRE_CTEB';
  if (nom.includes('humanité') || nom.includes('humanite') || nom.includes('latin') || nom.includes('commerciale') || nom.includes('gestion') || nom.includes('sténographie') || nom.includes('sténgraphie')) return 'HUMANITES';

  return '';
}

/**
 * Filtre les matières selon le contexte cycle / option / niveau.
 * Le cycle est inféré si nécessaire (classe et/ou matière).
 */
export function filterSubjectsByContext(
  subjects: Discipline[],
  classObj: ClasseScolaire | undefined,
  activeOption?: string
): Discipline[] {
  if (!classObj) return subjects;

  const classNiveau = normalizeNiveau(classObj.nom);
  const classCycle = getClassCycle(classObj);
  const isHumanite = classCycle === CYCLE_HUMANITES;
  const option = isHumanite
    ? (activeOption || classObj.optionCode || 'TRONC_COMMUN')
    : (classObj.optionCode || 'TRONC_COMMUN');

  if (isHumanite && !option) return [];

  return subjects.filter(s => {
    const subCycle = inferSubjectCycle(s);
    // Si le cycle de la classe est connu et que la matière n'appartient pas au même cycle, on l'exclut.
    if (classCycle && subCycle && subCycle !== classCycle) return false;
    if (classCycle && !subCycle) return false;

    const subOption = s.optionCode || 'TRONC_COMMUN';
    if (isHumanite) {
      // Humanités : si aucune option n'est définie (TRONC_COMMUN), on affiche toutes les matières Humanités.
      if (option && option !== 'TRONC_COMMUN' && subOption !== option) return false;
    } else if (option && subOption !== option) {
      return false;
    }

    if (classNiveau && s.niveau && s.niveau !== classNiveau) return false;

    return true;
  });
}

/**
 * Filtre les matières par enseignant de manière cohérente.
 */
export function filterSubjectsByTeacher(
  subjects: Discipline[],
  staff: MembrePersonnel | null | undefined,
  classObj: ClasseScolaire | undefined,
  allClasses: ClasseScolaire[]
): Discipline[] {
  if (!staff) return subjects;
  return subjects.filter(s => isTeacherAllowedForSubject(staff, s, classObj, allClasses));
}

/**
 * Filtre les matières par contexte ET enseignant.
 */
export function getAvailableSubjectsForContext(
  subjects: Discipline[],
  classObj: ClasseScolaire | undefined,
  activeOption: string,
  staff: MembrePersonnel | null | undefined,
  allClasses: ClasseScolaire[]
): Discipline[] {
  const contextFiltered = filterSubjectsByContext(subjects, classObj, activeOption);
  if (!staff) return contextFiltered;
  return filterSubjectsByTeacher(contextFiltered, staff, classObj, allClasses);
}

/**
 * Détermine les cours EPST manquants pour un contexte donné.
 * Pour les Humanités sans option définie (TRONC_COMMUN), on propose les cours de toutes les options
 * afin que l'utilisateur puisse choisir et, éventuellement, assigner l'option de la classe.
 */
export function getMissingEpstCoursesForContext(
  subjects: Discipline[],
  classObj: ClasseScolaire | undefined,
  activeOption: string
) {
  if (!classObj) return [];
  const classCycle = getClassCycle(classObj);
  const classNiveau = normalizeNiveau(classObj.nom);
  const isHumanite = classCycle === CYCLE_HUMANITES;
  const option = isHumanite ? activeOption : (classObj.optionCode || 'TRONC_COMMUN');

  if (isHumanite && !option) return [];

  const seen = new Set<string>();
  const missing: any[] = [];

  const optionsToSeed =
    isHumanite && option === 'TRONC_COMMUN'
      ? EPST_SECTIONS_OPTIONS.filter(o => o.value !== 'ALL' && o.value !== 'TRONC_COMMUN').map(o => o.value)
      : [option];

  for (const opt of optionsToSeed) {
    const needed = getCoursesForContext(classCycle as any, opt, classNiveau);
    for (const c of needed) {
      const key = `${c.code}-${(c.cycleCode || '').toUpperCase()}-${(c.optionCode || 'TRONC_COMMUN')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const exists = subjects.some(s =>
        s.code === c.code &&
        (s.cycleCode || '').toUpperCase() === (c.cycleCode || '').toUpperCase() &&
        (s.optionCode || 'TRONC_COMMUN') === (c.optionCode || 'TRONC_COMMUN')
      );
      if (!exists) missing.push(c);
    }
  }

  return missing;
}
