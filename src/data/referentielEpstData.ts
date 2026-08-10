// Référentiel Officiel du Système Éducatif RDC (EPST RDC)
// Cycles, Options, Matières, Coefficients et Maxima Période & Examen

export interface CourseReference {
  code: string;
  nom: string;
  categorie: 'LANGUES' | 'SCIENCES_EXACTES' | 'SCIENCES_HUMAINES' | 'TECHNIQUE_PROF' | 'EVEIL_ART' | 'AUTRE';
  cycleCode: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
  optionCode?: string; // ex: "Commerciale", "Secrétariat", "Scientifique", "Pédagogie", "TRONC_COMMUN"
  maxScore: number; // Max Période (ex: 10 ou 20)
  maxExamen: number; // Max Examen (ex: 20 ou 40, toujours Max Période x 2 en RDC)
  coefficient: number;
}

export const EPST_SECTIONS_OPTIONS = [
  { value: 'ALL', label: 'Toutes les Options' },
  { value: 'TRONC_COMMUN', label: 'Tronc Commun (Maternelle, Primaire & CTEB 7-8)' },
  { value: 'COMMERCIALE', label: 'Commerciale et Gestion' },
  { value: 'SECRETARIAT', label: 'Secrétariat et Administration' },
  { value: 'SCIENTIFIQUE', label: 'Scientifique (Math-Physique / Bio-Chimie)' },
  { value: 'PEDAGOGIE', label: 'Humanités Pédagogiques' },
  { value: 'INFORMATIQUE', label: 'Informatique de Gestion & Réseaux' },
  { value: 'ELECTRICITE', label: 'Électricité & Construction' },
  { value: 'COUPE_COUTURE', label: 'Coupe & Couture' },
  { value: 'AGRICULTURE', label: 'Agriculture & Écologie' },
];

export const OFFICIAL_EPST_COURSES: CourseReference[] = [
  // ─── CYCLE MATERNELLE (ÉVALUATION DU DÉVELOPPEMENT & ÉVEIL) ────────────────
  { code: 'LANG-MAT', nom: 'Activités Langagières & Expression Orale', categorie: 'LANGUES', cycleCode: 'MATERNELLE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'EVEIL-MAT', nom: 'Éveil Scientifique & Structuration du Milieu', categorie: 'SCIENCES_EXACTES', cycleCode: 'MATERNELLE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'GRAPH-MAT', nom: 'Graphisme, Dessin & Pré-écriture', categorie: 'EVEIL_ART', cycleCode: 'MATERNELLE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'PSYCHO-MAT', nom: 'Psychomotricité & Jeux Éducatifs', categorie: 'EVEIL_ART', cycleCode: 'MATERNELLE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'SOC-MAT', nom: 'Éducation Sociale, Hygiène & Comportement', categorie: 'SCIENCES_HUMAINES', cycleCode: 'MATERNELLE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },

  // ─── CYCLE PRIMAIRE (1ÈRE À 6È ANNEE PRIMAIRE EPST) ───────────────────────
  { code: 'FRAN-PRIM', nom: 'Français (Lecture, Orthographe, Grammaire)', categorie: 'LANGUES', cycleCode: 'PRIMAIRE', optionCode: 'TRONC_COMMUN', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'MATH-PRIM', nom: 'Mathématiques (Arithmétique, Calcul & Géométrie)', categorie: 'SCIENCES_EXACTES', cycleCode: 'PRIMAIRE', optionCode: 'TRONC_COMMUN', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'EVEIL-PRIM', nom: 'Éveil Scientifique (Sciences Naturelles & Hygiène)', categorie: 'SCIENCES_EXACTES', cycleCode: 'PRIMAIRE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'HIST-GEO-PRIM', nom: 'Histoire, Géographie & Éducation Civique (ECM)', categorie: 'SCIENCES_HUMAINES', cycleCode: 'PRIMAIRE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'CALLIG-PRIM', nom: 'Calligraphie & Travaux Manuel Pratiques', categorie: 'EVEIL_ART', cycleCode: 'PRIMAIRE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'EPS-PRIM', nom: 'Éducation Physique & Esthétique (Chant, EPS)', categorie: 'EVEIL_ART', cycleCode: 'PRIMAIRE', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },

  // ─── CYCLE SECONDAIRE DE BASE / CTEB (7È & 8È ÉDUCATION DE BASE) ────────────
  { code: 'FRAN-CTEB', nom: 'Français (Grammaire, Textes & Expression)', categorie: 'LANGUES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'MATH-CTEB', nom: 'Mathématiques (Algèbre & Géométrie)', categorie: 'SCIENCES_EXACTES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'PHYS-CTEB', nom: 'Sciences Physiques', categorie: 'SCIENCES_EXACTES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'SVT-CTEB', nom: 'Sciences de la Vie et de la Terre (SVT)', categorie: 'SCIENCES_EXACTES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'ANGL-CTEB', nom: 'Anglais (Language & Conversation)', categorie: 'LANGUES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'HIST-CTEB', nom: 'Histoire (RDC & Universelle)', categorie: 'SCIENCES_HUMAINES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'GEO-CTEB', nom: 'Géographie Physique & Économique', categorie: 'SCIENCES_HUMAINES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'ECM-CTEB', nom: 'Éducation Civique & Morale (ECM)', categorie: 'SCIENCES_HUMAINES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'EDVIE-CTEB', nom: 'Éducation à la Vie (EDVIE)', categorie: 'SCIENCES_HUMAINES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'TIC-CTEB', nom: 'Technologie & Informatique (TICE)', categorie: 'SCIENCES_EXACTES', cycleCode: 'SECONDAIRE_CTEB', optionCode: 'TRONC_COMMUN', maxScore: 10, maxExamen: 20, coefficient: 1 },

  // ─── HUMANITÉS COMMERCIALE ET GESTION ─────────────────────────────────────
  { code: 'COMPTA-CG', nom: 'Comptabilité Générale & Analytique', categorie: 'TECHNIQUE_PROF', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'MATHFIN-CG', nom: 'Mathématiques Financières', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'DOCOM-CG', nom: 'Documents du Commerce (DOCOM)', categorie: 'TECHNIQUE_PROF', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'INFOGEST-CG', nom: 'Informatique de Gestion (Tableurs & ERP)', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'FISC-CG', nom: 'Fiscalité & Législation Commerciale', categorie: 'TECHNIQUE_PROF', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'DROIT-CG', nom: 'Droit Commercial & des Sociétés', categorie: 'SCIENCES_HUMAINES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'CCA-CG', nom: 'Correspondance Commerciale (CCA)', categorie: 'LANGUES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'ECO-CG', nom: 'Économie Générale & Monétaire', categorie: 'SCIENCES_HUMAINES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'FRAN-HUM', nom: 'Français Général & Rédaction', categorie: 'LANGUES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'ANGL-COMM', nom: 'Anglais Commercial', categorie: 'LANGUES', cycleCode: 'HUMANITES', optionCode: 'COMMERCIALE', maxScore: 10, maxExamen: 20, coefficient: 1 },

  // ─── HUMANITÉS SECRÉTARIAT ET ADMINISTRATION ──────────────────────────────
  { code: 'STENO-SEC', nom: 'Sténographie (Prise de Notes)', categorie: 'TECHNIQUE_PROF', cycleCode: 'HUMANITES', optionCode: 'SECRETARIAT', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'ORGBUR-SEC', nom: 'Organisation de Bureau & Accueil', categorie: 'TECHNIQUE_PROF', cycleCode: 'HUMANITES', optionCode: 'SECRETARIAT', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'CCA-FR-SEC', nom: 'Correspondance Administrative Française', categorie: 'LANGUES', cycleCode: 'HUMANITES', optionCode: 'SECRETARIAT', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'CCA-ANG-SEC', nom: 'Commercial Correspondence (CCA Anglais)', categorie: 'LANGUES', cycleCode: 'HUMANITES', optionCode: 'SECRETARIAT', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'INFOBUR-SEC', nom: 'Informatique & Secrétariat Numérique', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SECRETARIAT', maxScore: 20, maxExamen: 40, coefficient: 2 },
  { code: 'COMPTA-SEC', nom: 'Comptabilité Générale I & II', categorie: 'TECHNIQUE_PROF', cycleCode: 'HUMANITES', optionCode: 'SECRETARIAT', maxScore: 20, maxExamen: 40, coefficient: 2 },

  // ─── HUMANITÉS SCIENTIFIQUE (MATH-PHYSIQUE / BIO-CHIMIE) ───────────────────
  { code: 'ALG-ANAL-SCI', nom: 'Algèbre & Analyse Mathématique', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SCIENTIFIQUE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'PHYS-SCI', nom: 'Physique Général & Atomique', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SCIENTIFIQUE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'CHIM-SCI', nom: 'Chimie Minérale & Organique', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SCIENTIFIQUE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'BIO-SCI', nom: 'Biologie Générale, Cytologie & Génétique', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SCIENTIFIQUE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'GEOM-SCI', nom: 'Géométrie dans l\'Espace & Trigonométrie', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SCIENTIFIQUE', maxScore: 10, maxExamen: 20, coefficient: 1 },
  { code: 'DESSIN-SCI', nom: 'Dessin Scientifique & Technique', categorie: 'SCIENCES_EXACTES', cycleCode: 'HUMANITES', optionCode: 'SCIENTIFIQUE', maxScore: 10, maxExamen: 20, coefficient: 1 },

  // ─── HUMANITÉS PÉDAGOGIQUES ───────────────────────────────────────────────
  { code: 'PEDAG-PED', nom: 'Pédagogie Générale & Didactique', categorie: 'SCIENCES_HUMAINES', cycleCode: 'HUMANITES', optionCode: 'PEDAGOGIE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'PSYCHO-PED', nom: 'Psychologie de l\'Enfant & de l\'Adolescent', categorie: 'SCIENCES_HUMAINES', cycleCode: 'HUMANITES', optionCode: 'PEDAGOGIE', maxScore: 20, maxExamen: 40, coefficient: 3 },
  { code: 'HIST-PEDAG', nom: 'Histoire de la Pédagogie & Systèmes', categorie: 'SCIENCES_HUMAINES', cycleCode: 'HUMANITES', optionCode: 'PEDAGOGIE', maxScore: 10, maxExamen: 20, coefficient: 1 },
];
