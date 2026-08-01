// ============================================================
//  Référentiel Officiel EPST — République Démocratique du Congo
//  Source : DIPROMAD / Ministère de l'Enseignement Primaire,
//           Secondaire et Technique (EPST)
// ============================================================

import type { OptionSecondaire, MatièreEPST, CycleScolaire } from '../types';

// ─── Cycles Officiels DRC ─────────────────────────────────────────────────────

export const CYCLES_EPST: CycleScolaire[] = [
  { id: 'PRESCHOOL',       code: 'PRESCHOOL', nom: 'Préscolaire (Maternelle)',              codeCite: 'CITE 020' },
  { id: 'PRIMAIRE',        code: 'PRIMAIRE',  nom: 'Enseignement Primaire',                 codeCite: 'CITE 100' },
  { id: 'CTEB',            code: 'CTEB',      nom: 'Tronc Commun (7ème & 8ème CTEB)',       codeCite: 'CITE 244' },
  { id: 'HUMANITES',       code: 'HUMANITES', nom: 'Humanités Générales',                  codeCite: 'CITE 344' },
  { id: 'TECHNIQUES',      code: 'CUSTOM',    nom: 'Humanités Techniques',                  codeCite: 'CITE 354' },
  { id: 'PROFESSIONNELLES',code: 'CUSTOM',    nom: 'Humanités Professionnelles',            codeCite: 'CITE 354' },
];

// ─── Classes Standard par Cycle ──────────────────────────────────────────────

export const CLASSES_PAR_CYCLE: Record<string, string[]> = {
  PRESCHOOL: ['Maternelle 1', 'Maternelle 2'],
  PRIMAIRE:  ['1ère Primaire','2ème Primaire','3ème Primaire','4ème Primaire','5ème Primaire','6ème Primaire'],
  CTEB:      ['7ème CTEB', '8ème CTEB'],
};

export const NIVEAUX_HUMANITES = ['1ère','2ème','3ème','4ème','5ème','6ème'];

// ─── Options Secondaires — Catalogue Complet EPST ────────────────────────────

export const OPTIONS_EPST: OptionSecondaire[] = [
  // ── Humanités Générales ──
  {
    id: 'MATH_PHY', code: 'MATH_PHY', nom: 'Mathématiques-Physique', filiere: 'GENERALES',
    description: 'Option scientifique axée sur les mathématiques avancées et la physique. Prépare aux études d\'ingénierie.',
  },
  {
    id: 'BIO_CHIM', code: 'BIO_CHIM', nom: 'Biologie-Chimie', filiere: 'GENERALES',
    description: 'Sciences du vivant : biologie cellulaire, chimie organique, écologie. Débouchés : médecine, pharmacie.',
  },
  {
    id: 'LAT_PHILO', code: 'LAT_PHILO', nom: 'Latin-Philosophie', filiere: 'GENERALES',
    description: 'Filière littéraire classique. Étude du latin, de la philosophie et des lettres humaines.',
  },
  {
    id: 'LAT_GREC', code: 'LAT_GREC', nom: 'Latin-Grec', filiere: 'GENERALES',
    description: 'Lettres classiques : étude approfondie du latin et du grec ancien.',
  },
  {
    id: 'PEDA_GEN', code: 'PEDA_GEN', nom: 'Pédagogie Générale', filiere: 'GENERALES',
    description: 'Formation des futurs instituteurs. Inclut pédagogie, psychologie et stages pratiques.',
  },
  {
    id: 'HPR', code: 'HPR', nom: 'Humanités Pédagogiques Rénovées (HPR)', filiere: 'GENERALES',
    description: 'Version modernisée de la pédagogie générale, intégrant l\'approche par compétences (APC).',
  },
  {
    id: 'SSA', code: 'SSA', nom: 'Sciences Sociales et Administratives', filiere: 'GENERALES',
    description: 'Sciences humaines : droit, économie, sociologie et administration publique.',
  },
  {
    id: 'LITT_MOD', code: 'LITT_MOD', nom: 'Lettres et Sciences Humaines', filiere: 'GENERALES',
    description: 'Littérature française et africaine, linguistique, communication.',
  },

  // ── Humanités Techniques ──
  {
    id: 'COMPTA', code: 'COMPTA', nom: 'Comptabilité', filiere: 'TECHNIQUES',
    description: 'Gestion comptable, fiscalité, audit et contrôle financier des entreprises.',
  },
  {
    id: 'SECR_ADMIN', code: 'SECR_ADMIN', nom: 'Secrétariat-Administration', filiere: 'TECHNIQUES',
    description: 'Techniques de secrétariat, bureautique, correspondance commerciale et administrative.',
  },
  {
    id: 'COMM_GEST', code: 'COMM_GEST', nom: 'Commerce & Gestion', filiere: 'TECHNIQUES',
    description: 'Gestion commerciale, marketing, organisation des entreprises et logistique.',
  },
  {
    id: 'INFORMATIQUE', code: 'INFORMATIQUE', nom: 'Informatique & Programmation', filiere: 'TECHNIQUES',
    description: 'Programmation, réseaux informatiques, bases de données et développement d\'applications.',
  },
  {
    id: 'ELECTRICITE', code: 'ELECTRICITE', nom: 'Électricité', filiere: 'TECHNIQUES',
    description: 'Installations électriques, électrotechnique, automatisme et maintenance industrielle.',
  },
  {
    id: 'ELECTRONIQUE', code: 'ELECTRONIQUE', nom: 'Électronique', filiere: 'TECHNIQUES',
    description: 'Circuits électroniques, télécommunications, maintenance d\'équipements électroniques.',
  },
  {
    id: 'MECANIQUE', code: 'MECANIQUE', nom: 'Mécanique Générale', filiere: 'TECHNIQUES',
    description: 'Mécaniques des machines, entretien des moteurs, technologie automobile et industrielle.',
  },
  {
    id: 'CONSTRUCTION', code: 'CONSTRUCTION', nom: 'Construction & Travaux Publics', filiere: 'TECHNIQUES',
    description: 'Génie civil, dessin technique, topographie et techniques de construction.',
  },
  {
    id: 'PETROCHIMIE', code: 'PETROCHIMIE', nom: 'Pétrochimie', filiere: 'TECHNIQUES',
    description: 'Industrie pétrolière, chimie des hydrocarbures et traitement des ressources naturelles.',
  },
  {
    id: 'ARTS_APPL', code: 'ARTS_APPL', nom: 'Arts Plastiques & Appliqués', filiere: 'TECHNIQUES',
    description: 'Beaux-arts, design graphique, arts décoratifs et patrimoine culturel.',
  },
  {
    id: 'COUPE_COUTURE', code: 'COUPE_COUTURE', nom: 'Coupe & Couture', filiere: 'TECHNIQUES',
    description: 'Modélisme, confection vestimentaire et stylisme textile.',
  },
  {
    id: 'ESTHETIQUE', code: 'ESTHETIQUE', nom: 'Esthétique & Coiffure', filiere: 'TECHNIQUES',
    description: 'Soins esthétiques, coiffure, maquillage et techniques de beauté.',
  },
  {
    id: 'HOTELLERIE', code: 'HOTELLERIE', nom: 'Hôtellerie & Tourisme', filiere: 'TECHNIQUES',
    description: 'Gestion hôtelière, restauration, accueil et développement touristique.',
  },
  {
    id: 'AGRO_VETO', code: 'AGRO_VETO', nom: 'Agronomie & Élevage', filiere: 'TECHNIQUES',
    description: 'Agriculture, élevage, vétérinaire auxiliaire et développement rural.',
  },

  // ── Humanités Professionnelles ──
  {
    id: 'NURSING', code: 'NURSING', nom: 'Nursing (Soins Infirmiers)', filiere: 'PROFESSIONNELLES',
    description: 'Formation d\'infirmiers auxiliaires : soins de santé, anatomie, hygiène et soins pratiques.',
  },
  {
    id: 'KINESITHERAPIE', code: 'KINESITHERAPIE', nom: 'Kinésithérapie', filiere: 'PROFESSIONNELLES',
    description: 'Rééducation physique, massothérapie et techniques de kinésithérapie.',
  },
  {
    id: 'PHARMACIE_AUX', code: 'PHARMACIE_AUX', nom: 'Pharmacie Auxiliaire', filiere: 'PROFESSIONNELLES',
    description: 'Préparation et distribution des médicaments, pharmacologie de base.',
  },
  {
    id: 'GENIE_CIVIL', code: 'GENIE_CIVIL', nom: 'Génie Civil', filiere: 'PROFESSIONNELLES',
    description: 'Travaux publics, topographie, dessin de plan et gestion des chantiers.',
  },
  {
    id: 'ARCHITECTURE', code: 'ARCHITECTURE', nom: 'Architecture', filiere: 'PROFESSIONNELLES',
    description: 'Conception architecturale, urbanisme et dessin d\'architecture.',
  },
];

// ─── Matières EPST — Référentiel Complet ─────────────────────────────────────

export const MATIERES_GENERALES: MatièreEPST[] = [
  { id: 'FR',    code: 'FR',    nom: 'Français',                         categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'MATH',  code: 'MATH',  nom: 'Mathématiques',                    categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'HIST',  code: 'HIST',  nom: 'Histoire',                         categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'GEO',   code: 'GEO',   nom: 'Géographie',                       categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'ECM',   code: 'ECM',   nom: 'Éducation Civique & Morale',       categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'ANGL',  code: 'ANGL',  nom: 'Anglais',                          categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'LING',  code: 'LING',  nom: 'Lingala / Kiswahili (Langue Nationale)', categorie: 'GENERALE', optionsApplicables: ['ALL'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'PHILO', code: 'PHILO', nom: 'Philosophie & Logique',            categorie: 'GENERALE',    optionsApplicables: ['ALL'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'EPS',   code: 'EPS',   nom: 'Éducation Physique & Sportive',    categorie: 'PRATIQUE',    optionsApplicables: ['ALL'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'REL',   code: 'REL',   nom: 'Religion / Éducation Morale',      categorie: 'RELIGIEUSE',  optionsApplicables: ['ALL'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
];

export const MATIERES_SPECIFIQUES: MatièreEPST[] = [
  // ── Math-Physique ──
  { id: 'ALG',       code: 'ALG',    nom: 'Algèbre & Analyse',                categorie: 'SPECIFIQUE', optionsApplicables: ['MATH_PHY'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'GEOM',      code: 'GEOM',   nom: 'Géométrie & Trigonométrie',        categorie: 'SPECIFIQUE', optionsApplicables: ['MATH_PHY'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'PHYS',      code: 'PHYS',   nom: 'Physique',                         categorie: 'SPECIFIQUE', optionsApplicables: ['MATH_PHY','BIO_CHIM'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'CHIM_MP',   code: 'CHIM',   nom: 'Chimie',                           categorie: 'SPECIFIQUE', optionsApplicables: ['MATH_PHY','BIO_CHIM'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Biologie-Chimie ──
  { id: 'BIO',       code: 'BIO',    nom: 'Biologie Générale',                categorie: 'SPECIFIQUE', optionsApplicables: ['BIO_CHIM','NURSING'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'BIOCELL',   code: 'BIOCELL',nom: 'Biologie Cellulaire',              categorie: 'SPECIFIQUE', optionsApplicables: ['BIO_CHIM'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'ECO_ENV',   code: 'ECO',    nom: 'Écologie & Environnement',         categorie: 'SPECIFIQUE', optionsApplicables: ['BIO_CHIM','AGRO_VETO'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'GEOL',      code: 'GEOL',   nom: 'Géologie',                         categorie: 'SPECIFIQUE', optionsApplicables: ['BIO_CHIM'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'MICROBIO',  code: 'MICRO',  nom: 'Microbiologie',                    categorie: 'SPECIFIQUE', optionsApplicables: ['BIO_CHIM','NURSING'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Latin-Philosophie ──
  { id: 'LATIN',     code: 'LAT',    nom: 'Latin',                            categorie: 'SPECIFIQUE', optionsApplicables: ['LAT_PHILO','LAT_GREC'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'GREC',      code: 'GREC',   nom: 'Grec Ancien',                      categorie: 'SPECIFIQUE', optionsApplicables: ['LAT_GREC'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'PHIL_APP',  code: 'PHIL',   nom: 'Philosophie Approfondie',          categorie: 'SPECIFIQUE', optionsApplicables: ['LAT_PHILO'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'LITT',      code: 'LITT',   nom: 'Littérature Française',            categorie: 'SPECIFIQUE', optionsApplicables: ['LAT_PHILO','LITT_MOD'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Pédagogie Générale / HPR ──
  { id: 'PEDA',      code: 'PEDA',   nom: 'Pédagogie Générale',               categorie: 'SPECIFIQUE', optionsApplicables: ['PEDA_GEN','HPR'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'PSYCHO',    code: 'PSYCHO', nom: "Psychologie de l'Enfant",          categorie: 'SPECIFIQUE', optionsApplicables: ['PEDA_GEN','HPR'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'DIDAC',     code: 'DIDAC',  nom: 'Didactique Générale',              categorie: 'SPECIFIQUE', optionsApplicables: ['PEDA_GEN','HPR'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'DIDAC_SP',  code: 'DIDSP',  nom: 'Didactiques Spéciales',            categorie: 'SPECIFIQUE', optionsApplicables: ['PEDA_GEN','HPR'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'LEG_SCOL',  code: 'LEG',    nom: 'Législation Scolaire',             categorie: 'SPECIFIQUE', optionsApplicables: ['PEDA_GEN','HPR'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'STAGE_PEDA',code: 'STAGE',  nom: 'Stage Pédagogique (Pratique)',     categorie: 'PRATIQUE',   optionsApplicables: ['PEDA_GEN','HPR'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── SSA ──
  { id: 'SOCIO',     code: 'SOCIO',  nom: 'Sociologie',                       categorie: 'SPECIFIQUE', optionsApplicables: ['SSA'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'DROIT',     code: 'DROIT',  nom: 'Droit',                            categorie: 'SPECIFIQUE', optionsApplicables: ['SSA','COMPTA','COMM_GEST'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'ECO_POL',   code: 'ECOPO',  nom: 'Économie Politique',               categorie: 'SPECIFIQUE', optionsApplicables: ['SSA','COMPTA','COMM_GEST','SECR_ADMIN'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'ADMIN',     code: 'ADMIN',  nom: 'Administration Publique',          categorie: 'SPECIFIQUE', optionsApplicables: ['SSA'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Comptabilité ──
  { id: 'COMPTA1',   code: 'CPT',    nom: 'Comptabilité Générale',            categorie: 'SPECIFIQUE', optionsApplicables: ['COMPTA'], coefficientDefaut: 5, maxScoreDefaut: 100, isActive: true },
  { id: 'FISC',      code: 'FISC',   nom: 'Fiscalité',                        categorie: 'SPECIFIQUE', optionsApplicables: ['COMPTA'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'AUDIT',     code: 'AUDIT',  nom: 'Audit & Contrôle de Gestion',      categorie: 'SPECIFIQUE', optionsApplicables: ['COMPTA'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'INFO_GEST', code: 'INFG',   nom: 'Informatique de Gestion',          categorie: 'SPECIFIQUE', optionsApplicables: ['COMPTA','SECR_ADMIN','COMM_GEST'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Secrétariat ──
  { id: 'DACTYLO',   code: 'DACT',   nom: 'Dactylographie & Bureautique',     categorie: 'SPECIFIQUE', optionsApplicables: ['SECR_ADMIN'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'CORR_COM',  code: 'CORR',   nom: 'Correspondance Commerciale',       categorie: 'SPECIFIQUE', optionsApplicables: ['SECR_ADMIN','COMM_GEST'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'ARCH',      code: 'ARCH',   nom: 'Archivistique',                    categorie: 'SPECIFIQUE', optionsApplicables: ['SECR_ADMIN'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Commerce & Gestion ──
  { id: 'MARKET',    code: 'MKT',    nom: 'Marketing',                        categorie: 'SPECIFIQUE', optionsApplicables: ['COMM_GEST'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'ORG_ENT',   code: 'ORG',    nom: 'Organisation des Entreprises',     categorie: 'SPECIFIQUE', optionsApplicables: ['COMM_GEST','COMPTA'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'LOGIST',    code: 'LOG',    nom: 'Logistique & Transport',           categorie: 'SPECIFIQUE', optionsApplicables: ['COMM_GEST'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Informatique ──
  { id: 'PROG',      code: 'PROG',   nom: 'Programmation (Python / Java)',    categorie: 'SPECIFIQUE', optionsApplicables: ['INFORMATIQUE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'RESEAUX',   code: 'RES',    nom: 'Réseaux Informatiques',            categorie: 'SPECIFIQUE', optionsApplicables: ['INFORMATIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'BD',        code: 'BD',     nom: 'Bases de Données',                 categorie: 'SPECIFIQUE', optionsApplicables: ['INFORMATIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'WEB',       code: 'WEB',    nom: 'Développement Web',                categorie: 'SPECIFIQUE', optionsApplicables: ['INFORMATIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Électricité ──
  { id: 'ELEC_TH',   code: 'ELTH',   nom: 'Électrotechnique Théorique',       categorie: 'SPECIFIQUE', optionsApplicables: ['ELECTRICITE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'ELEC_PR',   code: 'ELPR',   nom: 'Installations Électriques (TP)',   categorie: 'PRATIQUE',   optionsApplicables: ['ELECTRICITE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'AUTOM',     code: 'AUTO',   nom: 'Automatisme & Automatisation',     categorie: 'SPECIFIQUE', optionsApplicables: ['ELECTRICITE','ELECTRONIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Électronique ──
  { id: 'CIRC',      code: 'CIRC',   nom: 'Circuits Électroniques',           categorie: 'SPECIFIQUE', optionsApplicables: ['ELECTRONIQUE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'TELECOM',   code: 'TEL',    nom: 'Télécommunications',               categorie: 'SPECIFIQUE', optionsApplicables: ['ELECTRONIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'MAINT_EL',  code: 'MAEL',   nom: 'Maintenance Électronique (TP)',    categorie: 'PRATIQUE',   optionsApplicables: ['ELECTRONIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Mécanique ──
  { id: 'MECA_TH',   code: 'METH',   nom: 'Mécanique Théorique',              categorie: 'SPECIFIQUE', optionsApplicables: ['MECANIQUE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'MECA_PR',   code: 'MEPR',   nom: 'Atelier Mécanique (TP)',           categorie: 'PRATIQUE',   optionsApplicables: ['MECANIQUE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'AUTO_MOT',  code: 'AUTMOT', nom: 'Technologie Automobile',           categorie: 'SPECIFIQUE', optionsApplicables: ['MECANIQUE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Construction ──
  { id: 'DESSIN',    code: 'DTECH',  nom: 'Dessin Technique',                 categorie: 'SPECIFIQUE', optionsApplicables: ['CONSTRUCTION','GENIE_CIVIL','ARCHITECTURE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'TOPO',      code: 'TOPO',   nom: 'Topographie',                      categorie: 'SPECIFIQUE', optionsApplicables: ['CONSTRUCTION','GENIE_CIVIL'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'MATERI',    code: 'MAT',    nom: 'Matériaux de Construction',        categorie: 'SPECIFIQUE', optionsApplicables: ['CONSTRUCTION','GENIE_CIVIL'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'TRAV_PR',   code: 'TRVPR',  nom: 'Travaux Pratiques Chantier',       categorie: 'PRATIQUE',   optionsApplicables: ['CONSTRUCTION','GENIE_CIVIL'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Agronomie / Élevage ──
  { id: 'AGR_GEN',   code: 'AGR',    nom: 'Agronomie Générale',               categorie: 'SPECIFIQUE', optionsApplicables: ['AGRO_VETO'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'ELEV',      code: 'ELEV',   nom: 'Élevage',                          categorie: 'SPECIFIQUE', optionsApplicables: ['AGRO_VETO'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'VETO',      code: 'VETO',   nom: 'Soins Vétérinaires Élémentaires',  categorie: 'SPECIFIQUE', optionsApplicables: ['AGRO_VETO'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Nursing ──
  { id: 'ANAT',      code: 'ANAT',   nom: 'Anatomie & Physiologie',           categorie: 'SPECIFIQUE', optionsApplicables: ['NURSING','KINESITHERAPIE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'SOINS',     code: 'SOINS',  nom: 'Soins Infirmiers',                 categorie: 'SPECIFIQUE', optionsApplicables: ['NURSING'], coefficientDefaut: 5, maxScoreDefaut: 100, isActive: true },
  { id: 'SOINS_PR',  code: 'SPRQ',   nom: 'Soins Pratiques (Stage)',          categorie: 'PRATIQUE',   optionsApplicables: ['NURSING'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'PHARMA',    code: 'PHARM',  nom: 'Pharmacologie de Base',            categorie: 'SPECIFIQUE', optionsApplicables: ['NURSING','PHARMACIE_AUX'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'HYGI',      code: 'HYG',    nom: 'Hygiène & Santé Publique',         categorie: 'SPECIFIQUE', optionsApplicables: ['NURSING','KINESITHERAPIE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'PATH',      code: 'PATH',   nom: 'Pathologie Générale',              categorie: 'SPECIFIQUE', optionsApplicables: ['NURSING'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },

  // ── Kinésithérapie ──
  { id: 'KINE',      code: 'KINE',   nom: 'Kinésithérapie & Rééducation',     categorie: 'SPECIFIQUE', optionsApplicables: ['KINESITHERAPIE'], coefficientDefaut: 5, maxScoreDefaut: 100, isActive: true },
  { id: 'KINE_PR',   code: 'KNEPR',  nom: 'Massothérapie (Pratique)',         categorie: 'PRATIQUE',   optionsApplicables: ['KINESITHERAPIE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },

  // ── Pétrochimie ──
  { id: 'PETRO',     code: 'PET',    nom: 'Industrie Pétrolière',             categorie: 'SPECIFIQUE', optionsApplicables: ['PETROCHIMIE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'HYDROCARB', code: 'HC',     nom: 'Chimie des Hydrocarbures',         categorie: 'SPECIFIQUE', optionsApplicables: ['PETROCHIMIE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },

  // ── Arts Plastiques ──
  { id: 'ARTS_PR',   code: 'ART',    nom: 'Arts Plastiques (Pratique)',       categorie: 'PRATIQUE',   optionsApplicables: ['ARTS_APPL'], coefficientDefaut: 5, maxScoreDefaut: 100, isActive: true },
  { id: 'DESIGN',    code: 'DES',    nom: 'Design Graphique',                 categorie: 'SPECIFIQUE', optionsApplicables: ['ARTS_APPL'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'HIST_ART',  code: 'HARTO',  nom: "Histoire de l'Art",               categorie: 'SPECIFIQUE', optionsApplicables: ['ARTS_APPL'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Coupe & Couture ──
  { id: 'COUPE_PR',  code: 'CPR',    nom: 'Coupe (Pratique)',                 categorie: 'PRATIQUE',   optionsApplicables: ['COUPE_COUTURE'], coefficientDefaut: 5, maxScoreDefaut: 100, isActive: true },
  { id: 'MODEL',     code: 'MOD',    nom: 'Modélisme',                        categorie: 'SPECIFIQUE', optionsApplicables: ['COUPE_COUTURE'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'STYL',      code: 'STY',    nom: 'Stylisme Textile',                 categorie: 'SPECIFIQUE', optionsApplicables: ['COUPE_COUTURE'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },

  // ── Hôtellerie ──
  { id: 'HOTEL',     code: 'HTL',    nom: 'Gestion Hôtelière',                categorie: 'SPECIFIQUE', optionsApplicables: ['HOTELLERIE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'RESTAU',    code: 'REST',   nom: 'Restauration & Cuisine',           categorie: 'PRATIQUE',   optionsApplicables: ['HOTELLERIE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'TOUR',      code: 'TOU',    nom: 'Développement Touristique',        categorie: 'SPECIFIQUE', optionsApplicables: ['HOTELLERIE'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
];

export const MATIERES_PRIMAIRE: MatièreEPST[] = [
  { id: 'PR_FR',   code: 'FR',   nom: 'Français',                     categorie: 'GENERALE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_MATH', code: 'MATH', nom: 'Mathématiques',                categorie: 'GENERALE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 4, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_EVS',  code: 'EVS',  nom: 'Éveil aux Sciences',           categorie: 'GENERALE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_HIST', code: 'HG',   nom: 'Histoire-Géographie',          categorie: 'GENERALE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_ECM',  code: 'ECM',  nom: 'Éducation Civique & Morale',   categorie: 'GENERALE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_LING', code: 'LING', nom: 'Langue Nationale',             categorie: 'GENERALE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_EPS',  code: 'EPS',  nom: 'Éducation Physique & Sportive',categorie: 'PRATIQUE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_REL',  code: 'REL',  nom: 'Religion',                     categorie: 'RELIGIEUSE',  optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'PR_ART',  code: 'ART',  nom: 'Dessin & Travaux Manuels',     categorie: 'PRATIQUE',    optionsApplicables: ['PRIMAIRE'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
];

export const MATIERES_CTEB: MatièreEPST[] = [
  { id: 'CT_FR',   code: 'FR',   nom: 'Français',                     categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_MATH', code: 'MATH', nom: 'Mathématiques',                categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_BIO',  code: 'BIO',  nom: 'Sciences (Biologie)',          categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_PHYS', code: 'PHYS', nom: 'Sciences (Physique-Chimie)',   categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 3, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_HIST', code: 'HIST', nom: 'Histoire',                     categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_GEO',  code: 'GEO',  nom: 'Géographie',                   categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_ECM',  code: 'ECM',  nom: 'Éducation Civique & Morale',   categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_ANGL', code: 'ANGL', nom: 'Anglais',                      categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 2, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_LING', code: 'LING', nom: 'Langue Nationale',             categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_EPS',  code: 'EPS',  nom: 'Éducation Physique',           categorie: 'PRATIQUE',    optionsApplicables: ['CTEB'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_REL',  code: 'REL',  nom: 'Religion',                     categorie: 'RELIGIEUSE',  optionsApplicables: ['CTEB'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
  { id: 'CT_INFO', code: 'INFO', nom: "Initiation à l'Informatique",  categorie: 'GENERALE',    optionsApplicables: ['CTEB'], coefficientDefaut: 1, maxScoreDefaut: 100, isActive: true },
];

// Provinces officielles de la RDC
export const PROVINCES_RDC = [
  'Kinshasa','Kongo-Central','Kwango','Kwilu','Mai-Ndombe',
  'Kasaï','Kasaï-Central','Kasaï-Oriental','Lomami','Sankuru',
  'Maniema','Sud-Kivu','Nord-Kivu','Ituri',
  'Haut-Uélé','Tshopo','Bas-Uélé','Nord-Ubangi','Mongala','Sud-Ubangi',
  'Équateur','Tshuapa',
  'Tanganyika','Haut-Lomami','Lualaba','Haut-Katanga',
];

// ─── Fonctions Utilitaires ────────────────────────────────────────────────────

export function getMatieresPourCycle(cycleId: string): MatièreEPST[] {
  if (cycleId === 'PRIMAIRE') return MATIERES_PRIMAIRE;
  if (cycleId === 'CTEB') return MATIERES_CTEB;
  return MATIERES_GENERALES;
}

export function getMatieresPourOption(optionId: string): MatièreEPST[] {
  return [
    ...MATIERES_GENERALES,
    ...MATIERES_SPECIFIQUES.filter(m => m.optionsApplicables.includes(optionId)),
  ];
}

export function getNomOption(optionId: string): string {
  return OPTIONS_EPST.find(o => o.id === optionId)?.nom ?? optionId;
}
