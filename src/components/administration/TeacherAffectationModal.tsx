import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, BookOpen, School, Award, Check, Plus, Minus, Clock, ShieldCheck,
  AlertCircle, UserCheck, CheckCircle2, Sparkles, Baby, GraduationCap,
  Trash2, Layers, AlertTriangle, Briefcase, Users, FileText,
  ChevronRight, Info, Filter, Search, CheckSquare, Square,
  Zap, ArrowRight, CornerDownRight, BarChart3, HelpCircle
} from 'lucide-react';
import { MembrePersonnel, ClasseScolaire } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { LocalDatabaseService } from '../../services/localDatabase';

interface TeacherAffectationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: MembrePersonnel;
  onSaveSuccess?: (updated: MembrePersonnel) => void;
}

// ── PROGRAMME OFFICIEL EPST RDC PAR NIVEAU & OPTION ─────────────────────────

interface SubjectDefinition {
  nom: string;
  categorie: 'SCIENCES' | 'LANGUES' | 'HUMAINES' | 'TECHNIQUE' | 'PEDAGOGIE' | 'GENERAL' | 'EVEIL';
  isMajeure?: boolean;
}

const PROGRAMME_EPST_PAR_NIVEAU: Record<string, SubjectDefinition[]> = {
  // ── MATERNELLE ──
  MATERNELLE: [
    { nom: "Activités d'Éveil & Psychomotricité", categorie: 'EVEIL', isMajeure: true },
    { nom: 'Langage & Communication Orale', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Sensorialité, Formes & Couleurs', categorie: 'EVEIL', isMajeure: true },
    { nom: 'Dessin, Coloriage & Découpage', categorie: 'EVEIL' },
    { nom: 'Chants, Rondes & Éducation Musicale', categorie: 'EVEIL' },
    { nom: 'Initiation aux Premières Notions Mathématiques', categorie: 'SCIENCES' },
  ],

  // ── PRIMAIRE ──
  PRIMAIRE: [
    { nom: 'Français (Lecture, Écriture & Grammaire)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Mathématiques (Calcul, Numération & Géométrie)', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Éveil Scientifique & Milieu', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Éducation Civique & Morale (ECM)', categorie: 'HUMAINES' },
    { nom: 'Histoire & Géographie de la RDC', categorie: 'HUMAINES' },
    { nom: 'Calligraphie & Travaux Manuels', categorie: 'GENERAL' },
    { nom: 'Éducation Physique & Sportive (EPS)', categorie: 'GENERAL' },
    { nom: 'Langue Nationale (Lingala / Swahili / Tshiluba / Kikongo)', categorie: 'LANGUES' },
  ],

  // ── 7ème & 8ème Éducation de Base / CTEB (Tronc Commun) ──
  CTEB_7_8: [
    { nom: 'Mathématiques (Algèbre & Géométrie)', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Français (Grammaire, Textes & Orthographe)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Sciences Physiques (Physique & Chimie)', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Sciences de la Vie et de la Terre (SVT)', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Anglais Général', categorie: 'LANGUES' },
    { nom: 'Histoire de la RDC & Générale', categorie: 'HUMAINES' },
    { nom: 'Géographie Physique & Économique', categorie: 'HUMAINES' },
    { nom: 'Éducation Civique & Morale (ECM)', categorie: 'HUMAINES' },
    { nom: 'Éducation à la Vie (EDVIE)', categorie: 'HUMAINES' },
    { nom: 'Technologie, Informatique & TIC', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Dessin Artistique & Technique', categorie: 'TECHNIQUE' },
    { nom: 'Éducation Physique & Sport (EPS)', categorie: 'GENERAL' },
  ],

  // ── HUMANITÉS SCIENTIFIQUES ──
  SCIENTIFIQUE: [
    { nom: 'Algèbre & Analyse Mathématique', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Physique Appliquée & Mécanique', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Chimie Générale, Minérale & Organique', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Biologie Générale, Cytologie & Génétique', categorie: 'SCIENCES', isMajeure: true },
    { nom: "Géométrie dans l'Espace & Trigonométrie", categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Dessin Scientifique & Croquis', categorie: 'TECHNIQUE' },
    { nom: 'Géologie & Minéralogie', categorie: 'SCIENCES' },
    { nom: 'Informatique Scientifique & Programmation', categorie: 'TECHNIQUE' },
    { nom: 'Français (Dissertation & Littérature)', categorie: 'LANGUES' },
    { nom: 'Anglais Scientifique & Technique', categorie: 'LANGUES' },
    { nom: 'Philosophie & Logique', categorie: 'HUMAINES' },
    { nom: 'Histoire & Géographie', categorie: 'HUMAINES' },
  ],

  // ── HUMANITÉS COMMERCIALES & GESTION ──
  COMMERCIALE: [
    { nom: 'Comptabilité Générale & Analytique', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Mathématiques Financières & Commerciales', categorie: 'SCIENCES', isMajeure: true },
    { nom: 'Documents du Commerce (DOCOM)', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Informatique de Gestion (Tableurs & ERP)', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Fiscalité & Législation Financière', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Droit Commercial, Civil & des Sociétés', categorie: 'HUMAINES', isMajeure: true },
    { nom: 'Économie Générale & Monétaire', categorie: 'HUMAINES', isMajeure: true },
    { nom: 'Correspondance Commerciale & Admin. (CCA)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Anglais Commercial & des Affaires', categorie: 'LANGUES' },
    { nom: 'Français Général & Rédaction', categorie: 'LANGUES' },
    { nom: 'Mathématiques Générales', categorie: 'SCIENCES' },
    { nom: 'Entreprenariat & Gestion des PME', categorie: 'TECHNIQUE' },
  ],

  // ── HUMANITÉS SECRÉTARIAT & ADMINISTRATION ──
  SECRETARIAT: [
    { nom: 'Sténographie & Prise Rapide', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Organisation de Bureau & Déontologie', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'CCA Française (Rédaction Administrative)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'CCA Anglaise (Commercial Correspondence)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Informatique Bureautique & Traitement Texte', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Comptabilité Générale', categorie: 'TECHNIQUE' },
    { nom: 'Droit Administratif, Civil & du Travail', categorie: 'HUMAINES' },
    { nom: 'Fiscalité', categorie: 'TECHNIQUE' },
    { nom: 'Statistiques Appliquées au Secrétariat', categorie: 'SCIENCES' },
    { nom: 'Français Général', categorie: 'LANGUES' },
    { nom: 'Entreprenariat & Projets de Bureau', categorie: 'TECHNIQUE' },
  ],

  // ── HUMANITÉS LITTÉRAIRES (LATIN-PHILO) ──
  LITTERAIRE: [
    { nom: 'Latin (Grammaire, Textes & Auteurs)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Philosophie, Logique & Éthique', categorie: 'HUMAINES', isMajeure: true },
    { nom: 'Français (Littérature, Dissertation & Textes)', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Anglais Littéraire & Conversation', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Histoire Universelle & de la RDC', categorie: 'HUMAINES', isMajeure: true },
    { nom: 'Géographie Humaine & Économique', categorie: 'HUMAINES' },
    { nom: 'Grec & Antiquités Classiques', categorie: 'LANGUES' },
    { nom: 'Mathématiques Générales', categorie: 'SCIENCES' },
    { nom: 'Sciences Générales & Biologie', categorie: 'SCIENCES' },
    { nom: 'Éducation Civique & Morale (ECM)', categorie: 'HUMAINES' },
  ],

  // ── HUMANITÉS PÉDAGOGIQUES ──
  PEDAGOGIQUE: [
    { nom: "Pédagogie Générale & Théories de l'Apprentissage", categorie: 'PEDAGOGIE', isMajeure: true },
    { nom: 'Didactique Spéciale & Pratiques de Classe', categorie: 'PEDAGOGIE', isMajeure: true },
    { nom: "Psychologie de l'Enfant & de l'Adolescent", categorie: 'PEDAGOGIE', isMajeure: true },
    { nom: 'Histoire de la Pédagogie & Doctrines', categorie: 'PEDAGOGIE' },
    { nom: 'Législation & Déontologie Scolaire', categorie: 'PEDAGOGIE' },
    { nom: 'Français Pédagogique & Grammaire', categorie: 'LANGUES', isMajeure: true },
    { nom: 'Mathématiques pour Enseignants', categorie: 'SCIENCES' },
    { nom: 'Éveil Scientifique & Milieu', categorie: 'SCIENCES' },
    { nom: 'Dessin & Calligraphie Didactique', categorie: 'GENERAL' },
    { nom: 'Éducation Physique & Sport (EPS)', categorie: 'GENERAL' },
  ],

  // ── HUMANITÉS TECHNIQUES & INDUSTRIELLES ──
  TECHNIQUE: [
    { nom: 'Électricité Générale & Schémas', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Mécanique Générale & Moteurs', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Dessin Industriel & Conception', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Construction Bâtiment & Travaux Publics', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Électronique & Systèmes Numériques', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Informatique Industrielle & Réseaux', categorie: 'TECHNIQUE', isMajeure: true },
    { nom: 'Technologie des Matériaux & Sécurité', categorie: 'TECHNIQUE' },
    { nom: 'Mathématiques Appliquées', categorie: 'SCIENCES' },
    { nom: 'Physique & Chimie Industrielle', categorie: 'SCIENCES' },
    { nom: 'Français & Anglais Technique', categorie: 'LANGUES' },
  ],
};

// ── Rôles admin disponibles ───────────────────────────────────────────────────
const ROLES_ADMIN: SelectOption[] = [
  { value: 'PREFET',      label: 'Préfet des Études / Dir. Établissement', icon: ShieldCheck },
  { value: 'DE',          label: 'Directeur des Études (DE)', icon: ShieldCheck },
  { value: 'SURVEILLANT', label: 'Directeur de Discipline / Surveillant', icon: ShieldCheck },
  { value: 'COMPTABLE',   label: 'Comptable & Intendant Général', icon: Briefcase },
  { value: 'ADMIN',       label: 'Secrétaire / Admin Général', icon: FileText },
];

interface CourseEntry {
  matiere: string;
  classe: string;
}

type ModalMode = 'ADMIN' | 'ENSEIGNANT';
function detectMode(teacher: MembrePersonnel): ModalMode {
  const adminRoles = [
    'PREFET', 'DE', 'SURVEILLANT', 'COMPTABLE', 'ADMIN', 'PROMOTEUR_ADMIN',
    'PREFET_DIRECTEUR', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE',
    'COMPTABLE_INTENDANT', 'SECRETAIRE', 'INTENDANT'
  ];
  return adminRoles.includes(teacher.role || '') ? 'ADMIN' : 'ENSEIGNANT';
}

/**
 * Déduit la clé de programme EPST à partir du nom d'une classe.
 */
function detectClassCurriculum(className: string): string {
  const lower = (className || '').toLowerCase();

  if (lower.includes('mat') || lower.includes('maternelle') || lower.includes('creche')) {
    return 'MATERNELLE';
  }
  if (lower.includes('prim') || lower.includes('primaire')) {
    return 'PRIMAIRE';
  }
  if (lower.includes('7') || lower.includes('8') || lower.includes('cteb') || lower.includes('eb') || lower.includes('base')) {
    return 'CTEB_7_8';
  }
  if (lower.includes('scient') || lower.includes('sc') || lower.includes('bio') || lower.includes('math')) {
    return 'SCIENTIFIQUE';
  }
  if (lower.includes('com') || lower.includes('gest') || lower.includes('gestion') || lower.includes('cg')) {
    return 'COMMERCIALE';
  }
  if (lower.includes('sec') || lower.includes('secret') || lower.includes('admin')) {
    return 'SECRETARIAT';
  }
  if (lower.includes('lat') || lower.includes('phil') || lower.includes('litt') || lower.includes('lp')) {
    return 'LITTERAIRE';
  }
  if (lower.includes('ped') || lower.includes('pédag') || lower.includes('peda')) {
    return 'PEDAGOGIQUE';
  }
  if (lower.includes('tech') || lower.includes('elec') || lower.includes('mec') || lower.includes('bat')) {
    return 'TECHNIQUE';
  }

  return 'CTEB_7_8';
}

export const TeacherAffectationModal: React.FC<TeacherAffectationModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onSaveSuccess,
}) => {
  const [mode, setMode] = useState<ModalMode>('ENSEIGNANT');
  const [cycle, setCycle] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE'>('SECONDAIRE');
  const [classesList, setClassesList] = useState<ClasseScolaire[]>([]);
  const [dbSubjects, setDbSubjects] = useState<string[]>([]);
  const [allStaffList, setAllStaffList] = useState<MembrePersonnel[]>([]);

  // Mode ADMIN
  const [adminRole, setAdminRole] = useState<string>('PREFET');
  const [adminDepartement, setAdminDepartement] = useState<string>('');
  const [adminResponsabilites, setAdminResponsabilites] = useState<string>('');

  // Mode ENSEIGNANT (Maternelle/Primaire)
  const [salleUnique, setSalleUnique] = useState<string>('');

  // Mode ENSEIGNANT (Secondaire)
  const [titularClasses, setTitularClasses] = useState<string[]>([]);
  const [addTitularValue, setAddTitularValue] = useState<string>('');

  // Affectations de cours
  const [courseEntries, setCourseEntries] = useState<CourseEntry[]>([]);
  const [selClasse, setSelClasse] = useState<string>('TOUTES');
  const [selCategoryFilter, setSelCategoryFilter] = useState<string>('ALL');
  const [searchSubjectTerm, setSearchSubjectTerm] = useState<string>('');
  const [customCourse, setCustomCourse] = useState<string>('');

  // Volume horaire
  const [volumeHoraire, setVolumeHoraire] = useState<number>(18);

  // Notifications & États
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Initialisation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !teacher) return;

    const detectedMode = detectMode(teacher);
    setMode(detectedMode);

    // ADMIN
    setAdminRole(teacher.role || 'PREFET');
    setAdminDepartement((teacher as any).departement || teacher.personnelEnCharge || '');
    setAdminResponsabilites((teacher as any).responsabilites || teacher.notesBiographiques || '');

    // CYCLE
    const cp = teacher.cyclePrincipal || 'SECONDAIRE';
    if (cp === 'MATERNELLE') setCycle('MATERNELLE');
    else if (cp === 'PRIMAIRE') setCycle('PRIMAIRE');
    else setCycle('SECONDAIRE');

    setSalleUnique(teacher.salleUniqueId || teacher.classeTitulaireId || '');

    const initTituls: string[] = teacher.classesTitularisees || (teacher.classeTitulaireId ? [teacher.classeTitulaireId] : []);
    setTitularClasses(Array.from(new Set(initTituls.filter(Boolean))));

    // Cours existants
    const prevEntries: CourseEntry[] = [];
    const prevCours: string[] = teacher.coursAttribues || teacher.disciplines || [];
    prevCours.forEach(c => {
      const match = c.match(/^(.+?)\s+\((.+?)\)$/);
      if (match) {
        prevEntries.push({ matiere: match[1].trim(), classe: match[2].trim() });
      } else {
        prevEntries.push({ matiere: c.trim(), classe: 'TOUTES' });
      }
    });
    setCourseEntries(prevEntries);

    setVolumeHoraire(teacher.volumeHoraireHebdo || (cp === 'SECONDAIRE' ? 18 : 25));
    setErrorMsg(null);
    setSuccessMsg(null);
    setSearchSubjectTerm('');
    setSelCategoryFilter('ALL');
    setCustomCourse('');
    setAddTitularValue('');

    // Charger les classes et les matières depuis la base SQLite
    Promise.all([
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getSubjects(),
      LocalDatabaseService.getStaff(),
    ]).then(([cls, subs, stf]) => {
      setClassesList(cls || []);
      if (subs && subs.length > 0) {
        setDbSubjects(Array.from(new Set(subs.map(s => s.nom))));
      }
      setAllStaffList(stf || []);

      // Si aucune classe n'est sélectionnée, initialiser intelligemment avec la 1ère classe du cycle
      if (cls && cls.length > 0) {
        const matchingClass = cls.find(c => {
          const cat = detectClassCurriculum(c.nom);
          return cp === 'SECONDAIRE' ? (cat !== 'MATERNELLE' && cat !== 'PRIMAIRE') : cat === cp;
        });
        if (matchingClass) {
          setSelClasse(matchingClass.nom);
        } else {
          setSelClasse('TOUTES');
        }
      }
    }).catch(() => {
      setClassesList([]);
      setDbSubjects([]);
      setAllStaffList([]);
    });
  }, [isOpen, teacher]);

  // ── Cartographie de la Titularisation existante (hors agent courant) ───────
  const titularMap = useMemo(() => {
    const map: Record<string, { id: string; name: string }> = {};
    allStaffList.forEach(s => {
      if (s.id === teacher.id) return;
      const tituls: string[] = s.classesTitularisees || (s.classeTitulaireId ? [s.classeTitulaireId] : []);
      tituls.forEach(c => {
        if (c) map[c.trim().toLowerCase()] = { id: s.id, name: `${s.prenom} ${s.nom}`.trim() };
      });
    });
    return map;
  }, [allStaffList, teacher.id]);

  // ── Cartographie Matière × Classe occupée par d'autres profs ──────────────
  // map[classe_lower][matiere_lower] = "Prof. Prenom Nom"
  const subjectClassMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    allStaffList.forEach(s => {
      if (s.id === teacher.id) return;
      const cours: string[] = s.coursAttribues || s.disciplines || [];
      cours.forEach(c => {
        const match = c.match(/^(.+?)\s+\((.+?)\)$/);
        let matiere = '';
        let classe = 'TOUTES';
        if (match) {
          matiere = match[1].trim().toLowerCase();
          classe = match[2].trim().toLowerCase();
        } else {
          matiere = c.trim().toLowerCase();
        }

        if (classe !== 'toutes') {
          if (!map[classe]) map[classe] = {};
          if (!map[classe][matiere]) map[classe][matiere] = `${s.prenom} ${s.nom}`.trim();
        }
      });
    });
    return map;
  }, [allStaffList, teacher.id]);

  // ── Classes disponibles selon le cycle sélectionné ─────────────────────────
  const filteredClassesByCycle = useMemo(() => {
    if (cycle === 'MATERNELLE') {
      const dbMat = classesList.filter(c => detectClassCurriculum(c.nom) === 'MATERNELLE').map(c => c.nom);
      const defaults = ['1ère Maternelle (Petite Section)', '2ème Maternelle (Moyenne Section)', '3ème Maternelle (Grande Section)'];
      return Array.from(new Set([...dbMat, ...defaults]));
    }
    if (cycle === 'PRIMAIRE') {
      const dbPrim = classesList.filter(c => detectClassCurriculum(c.nom) === 'PRIMAIRE').map(c => c.nom);
      const defaults = [
        '1ère Année Primaire A', '1ère Année Primaire B',
        '2ème Année Primaire A', '2ème Année Primaire B',
        '3ème Année Primaire A', '3ème Année Primaire B',
        '4ème Année Primaire A', '4ème Année Primaire B',
        '5ème Année Primaire A', '5ème Année Primaire B',
        '6ème Année Primaire A', '6ème Année Primaire B',
      ];
      return Array.from(new Set([...dbPrim, ...defaults]));
    }
    // SECONDAIRE
    const dbSec = classesList.filter(c => {
      const cat = detectClassCurriculum(c.nom);
      return cat !== 'MATERNELLE' && cat !== 'PRIMAIRE';
    }).map(c => c.nom);

    const defaults = [
      '7ème Année Éducation de Base A (CTEB)', '7ème Année Éducation de Base B (CTEB)',
      '8ème Année Éducation de Base A (CTEB)', '8ème Année Éducation de Base B (CTEB)',
      '1ère Année Scientifique (3ème Sec.)', '2ème Année Scientifique (4ème Sec.)',
      '3ème Année Scientifique (5ème Sec.)', '4ème Année Scientifique EXETAT (6ème Sec.)',
      '1ère Commerciale & Gestion', '2ème Commerciale & Gestion',
      '3ème Commerciale & Gestion', '4ème Commerciale & Gestion EXETAT',
      '1ère Littéraire (Latin-Philo)', '2ème Littéraire (Latin-Philo)',
      '3ème Littéraire (Latin-Philo)', '4ème Littéraire EXETAT',
      '1ère Pédagogie Générale', '2ème Pédagogie Générale',
      '3ème Pédagogie Générale', '4ème Pédagogie Générale EXETAT',
      '1ère Technique Industrielle', '2ème Technique Industrielle',
      '3ème Technique Industrielle', '4ème Technique Industrielle EXETAT',
    ];
    return Array.from(new Set([...dbSec, ...defaults]));
  }, [cycle, classesList]);

  // Options pour le sélecteur de classe pour affectation
  const classeSelectOptions: SelectOption[] = useMemo(() => {
    return [
      { value: 'TOUTES', label: '🌐 Toutes les classes du cycle (Transversal / Général)' },
      ...filteredClassesByCycle.map(c => ({
        value: c,
        label: `🏫 ${c}`,
      })),
    ];
  }, [filteredClassesByCycle]);

  // Options pour la titularisation secondaire
  const titularOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: '— Sélectionner une classe à titulariser —' },
      ...filteredClassesByCycle
        .filter(c => !titularClasses.includes(c))
        .map(c => {
          const occ = titularMap[c.trim().toLowerCase()];
          return {
            value: c,
            label: occ ? `⚠ ${c} (Actuel Titulaire: ${occ.name})` : `✓ ${c} (Disponible)`,
          };
        }),
    ];
  }, [filteredClassesByCycle, titularClasses, titularMap]);

  // Options pour la salle unique (Maternelle/Primaire)
  const salleUniqueOptions: SelectOption[] = useMemo(() => {
    return [
      { value: '', label: `— Choisir la salle de ${cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'} —` },
      ...filteredClassesByCycle.map(c => ({ value: c, label: `🏫 ${c}` })),
    ];
  }, [cycle, filteredClassesByCycle]);

  // ── Matières Intelligentes suggérées selon la classe sélectionnée ──────────
  const suggestedCurriculumSubjects = useMemo(() => {
    let curriculumKey = 'CTEB_7_8';
    if (cycle === 'MATERNELLE') curriculumKey = 'MATERNELLE';
    else if (cycle === 'PRIMAIRE') curriculumKey = 'PRIMAIRE';
    else if (selClasse !== 'TOUTES') {
      curriculumKey = detectClassCurriculum(selClasse);
    } else {
      curriculumKey = 'CTEB_7_8';
    }

    const officialList = PROGRAMME_EPST_PAR_NIVEAU[curriculumKey] || PROGRAMME_EPST_PAR_NIVEAU['CTEB_7_8'];
    const officialNames = new Set(officialList.map(s => s.nom.toLowerCase()));

    // Ajouter les matières de la base SQLite non présentes
    const extraDb = dbSubjects
      .filter(s => !officialNames.has(s.toLowerCase()))
      .map(s => ({ nom: s, categorie: 'GENERAL' as const, isMajeure: false }));

    const combined: SubjectDefinition[] = [...officialList, ...extraDb];

    // Filtrer par recherche textuelle
    let list = combined;
    if (searchSubjectTerm.trim()) {
      const q = searchSubjectTerm.toLowerCase();
      list = list.filter(s => s.nom.toLowerCase().includes(q));
    }

    // Filtrer par catégorie
    if (selCategoryFilter !== 'ALL') {
      list = list.filter(s => s.categorie === selCategoryFilter);
    }

    return list;
  }, [cycle, selClasse, dbSubjects, searchSubjectTerm, selCategoryFilter]);

  // ── Actions Titularisation ────────────────────────────────────────────────
  const addTitularClass = (cls: string) => {
    if (!cls || titularClasses.includes(cls)) return;
    setTitularClasses(prev => [...prev, cls]);
    setAddTitularValue('');
  };

  const removeTitularClass = (cls: string) => {
    setTitularClasses(prev => prev.filter(c => c !== cls));
  };

  // ── Actions Affectation de Cours ──────────────────────────────────────────
  const isSubjectAssignedHere = (matiere: string, targetClasse: string) => {
    return courseEntries.some(
      e => e.matiere.toLowerCase() === matiere.toLowerCase() && (e.classe === targetClasse || e.classe === 'TOUTES')
    );
  };

  const getSubjectConflict = (matiere: string, targetClasse: string): string | null => {
    if (targetClasse === 'TOUTES') return null;
    return subjectClassMap[targetClasse.toLowerCase()]?.[matiere.toLowerCase()] || null;
  };

  const toggleSubjectForSelectedClass = (matiere: string) => {
    const conflict = getSubjectConflict(matiere, selClasse);
    if (conflict) {
      setErrorMsg(`⚠ Ce cours est déjà attribué à ${conflict} pour la classe "${selClasse}". Règle EPST : 1 seul professeur par matière.`);
      setTimeout(() => setErrorMsg(null), 4500);
      return;
    }

    const alreadyIdx = courseEntries.findIndex(
      e => e.matiere.toLowerCase() === matiere.toLowerCase() && e.classe === selClasse
    );

    if (alreadyIdx !== -1) {
      setCourseEntries(prev => prev.filter((_, i) => i !== alreadyIdx));
    } else {
      setCourseEntries(prev => [...prev, { matiere, classe: selClasse }]);
    }
  };

  const addAllAvailableSubjectsForCurrentClass = () => {
    const toAdd: CourseEntry[] = [];
    suggestedCurriculumSubjects.forEach(s => {
      const conflict = getSubjectConflict(s.nom, selClasse);
      const already = isSubjectAssignedHere(s.nom, selClasse);
      if (!conflict && !already) {
        toAdd.push({ matiere: s.nom, classe: selClasse });
      }
    });

    if (toAdd.length === 0) {
      setErrorMsg("Toutes les matières de cette catégorie sont déjà attribuées ou en conflit.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setCourseEntries(prev => [...prev, ...toAdd]);
    setSuccessMsg(`✓ ${toAdd.length} matière(s) affectée(s) en 1 clic pour ${selClasse === 'TOUTES' ? 'le tronc commun' : selClasse}.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const addCustomSubject = () => {
    const trimmed = customCourse.trim();
    if (!trimmed) return;
    toggleSubjectForSelectedClass(trimmed);
    setCustomCourse('');
  };

  const removeCourseEntry = (idx: number) => {
    setCourseEntries(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Soumission Formulaire ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let updates: Partial<MembrePersonnel>;

      if (mode === 'ADMIN') {
        updates = {
          role: adminRole as any,
          cyclePrincipal: undefined,
          estTitulaire: false,
          classesTitularisees: [],
          classeTitulaireId: '',
          salleUniqueId: '',
          classesAssignees: [],
          coursAttribues: [],
          disciplines: [],
          volumeHoraireHebdo: 0,
          personnelEnCharge: adminDepartement,
          notesBiographiques: adminResponsabilites || (teacher.notesBiographiques || ''),
        };
      } else {
        const isPrimMat = cycle === 'MATERNELLE' || cycle === 'PRIMAIRE';

        const coursFormatted = courseEntries.map(e =>
          e.classe !== 'TOUTES' ? `${e.matiere} (${e.classe})` : e.matiere
        );

        // Dé-titulariser proprement tout ancien titulaire conflictuel
        if (!isPrimMat) {
          for (const clsNom of titularClasses) {
            const existing = titularMap[clsNom.trim().toLowerCase()];
            if (existing && existing.id !== teacher.id) {
              const other = allStaffList.find(s => s.id === existing.id);
              if (other) {
                await LocalDatabaseService.updateStaff(other.id, {
                  classesTitularisees: (other.classesTitularisees || []).filter(
                    c => c.trim().toLowerCase() !== clsNom.trim().toLowerCase()
                  ),
                  classeTitulaireId: '',
                  estTitulaire: false,
                });
              }
            }
          }
        }

        const finalTituls = isPrimMat ? (salleUnique ? [salleUnique] : []) : titularClasses;
        const finalClasses = isPrimMat
          ? (salleUnique ? [salleUnique] : [])
          : Array.from(new Set(courseEntries.filter(e => e.classe !== 'TOUTES').map(e => e.classe)));

        updates = {
          cyclePrincipal: cycle,
          salleUniqueId: isPrimMat ? salleUnique : undefined,
          estTitulaire: finalTituls.length > 0,
          classeTitulaireId: finalTituls[0] || '',
          classesTitularisees: finalTituls,
          optionTitulaireCode: finalTituls[0] || '',
          classesAssignees: finalClasses,
          coursAttribues: coursFormatted,
          disciplines: coursFormatted,
          volumeHoraireHebdo: volumeHoraire,
        };
      }

      const updated = await LocalDatabaseService.updateStaff(teacher.id, updates);
      const merged = { ...teacher, ...updates, ...(updated || {}) };

      setSuccessMsg('Affectations enregistrées avec succès.');
      if (onSaveSuccess) onSaveSuccess(merged as MembrePersonnel);
      setTimeout(() => onClose(), 650);
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = mode === 'ADMIN';
  const isPrimMat = cycle === 'MATERNELLE' || cycle === 'PRIMAIRE';

  return createPortal(
    <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-scale-in"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* ── HEADER MODERNE ── */}
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Portail Intelligent d'Affectations & Charges EPST
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                  OFFICIEL RDC
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {teacher.prenom} {teacher.nom} · Matricule: <span className="font-mono text-indigo-600 dark:text-indigo-400">{teacher.numeroMatriculeEPST || teacher.matricule || 'Non attribué'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── FORMULAIRE SCROLLABLE ── */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* ALERTES ERREUR / SUCCÈS */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold flex items-start gap-2.5 animate-fade-in shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-2.5 animate-fade-in shadow-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── SÉLECTEUR DE CORPS (ENSEIGNANT vs ADMIN) ── */}
          <div>
            <label className="block font-black uppercase tracking-wider text-[10.5px] mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              1. Corps Institutionnel & Statut
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'ENSEIGNANT', label: 'Corps Enseignant & Pédagogique', desc: 'Maternelle, Primaire, Secondaire (CTEB & Humanités)', icon: GraduationCap },
                { id: 'ADMIN', label: 'Personnel Administratif & Direction', desc: 'Préfet, Directeur des Études, Surveillant, Comptable, Secrétaire', icon: Briefcase },
              ].map(m => {
                const active = mode === m.id;
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id as ModalMode)}
                    className={`p-4 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-start gap-3.5 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md border-indigo-500 scale-[1.01]'
                        : 'hover:bg-slate-500/10 text-slate-500'
                    }`}
                    style={!active ? { background: 'var(--bg-sunken)', borderColor: 'var(--border)' } : undefined}
                  >
                    <div className={`p-2.5 rounded-xl ${active ? 'bg-white/20 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`text-xs font-black ${active ? 'text-white' : ''}`}>{m.label}</p>
                      <p className={`text-[10.5px] font-medium mt-0.5 ${active ? 'text-white/80' : 'text-slate-400'}`}>{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              A. VUE ADMIN
          ═══════════════════════════════════════════════════════════ */}
          {isAdmin && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-violet-600 dark:text-violet-400 text-xs">Régime Administratif EPST</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium leading-relaxed">
                    Le personnel administratif assume des fonctions régaliennes de gestion, de direction ou d'intendance générale sans attribution directe de cours scolaires.
                  </p>
                </div>
              </div>

              {/* Rôle */}
              <div className="p-5 rounded-2xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h3 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Attribution du Rôle de Direction
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ROLES_ADMIN.map(r => {
                    const active = adminRole === r.value;
                    const Icon = r.icon as React.ElementType;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setAdminRole(r.value)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                          active ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' : 'hover:bg-slate-500/10'
                        }`}
                        style={!active ? { borderColor: 'var(--border)', background: 'var(--bg-surface)' } : undefined}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-indigo-500'}`} />
                        <span className={active ? 'text-white font-black' : ''}>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Département & Responsabilités */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <label className="block font-black text-[10.5px] uppercase text-slate-400">
                    Département / Service Rattaché
                  </label>
                  <input
                    type="text"
                    value={adminDepartement}
                    onChange={e => setAdminDepartement(e.target.value)}
                    placeholder="Ex: Direction Générale, Intendance, Secrétariat..."
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="p-5 rounded-2xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <label className="block font-black text-[10.5px] uppercase text-slate-400">
                    Missions & Responsabilités Principales
                  </label>
                  <textarea
                    value={adminResponsabilites}
                    onChange={e => setAdminResponsabilites(e.target.value)}
                    rows={3}
                    placeholder="Supervision pédagogique, tenue des registres, gestion financière..."
                    className="w-full px-4 py-2 rounded-xl text-xs font-medium border outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              B. VUE ENSEIGNANT (DYNAMIQUE PAR CYCLE)
          ═══════════════════════════════════════════════════════════ */}
          {!isAdmin && (
            <div className="space-y-6 animate-fade-in">

              {/* SÉLECTEUR DE CYCLE DYNAMIQUE */}
              <div>
                <label className="block font-black uppercase tracking-wider text-[10.5px] mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                  2. Cycle Pédagogique Principal (Régime EPST RDC)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'MATERNELLE', label: 'Maternelle', sub: 'Éveil Préscolaire (1ère→3ème)', icon: Baby, color: 'text-amber-500' },
                    { id: 'PRIMAIRE', label: 'Primaire', sub: 'Éducation de Base (1ère→6ème)', icon: School, color: 'text-emerald-500' },
                    { id: 'SECONDAIRE', label: 'Secondaire', sub: '7è CTEB ➔ 4è Humanités', icon: GraduationCap, color: 'text-indigo-500' },
                  ].map(c => {
                    const active = cycle === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCycle(c.id as any);
                          if (c.id === 'SECONDAIRE') {
                            setVolumeHoraire(18);
                          } else {
                            setVolumeHoraire(25);
                          }
                          setSelClasse('TOUTES');
                        }}
                        className={`p-4 rounded-2xl border text-center font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-md border-indigo-500 scale-[1.02]'
                            : 'hover:bg-slate-500/10 text-slate-500'
                        }`}
                        style={!active ? { background: 'var(--bg-sunken)', borderColor: 'var(--border)' } : undefined}
                      >
                        <Icon className={`w-5 h-5 ${active ? 'text-white' : c.color}`} />
                        <span className="text-xs font-black">{c.label}</span>
                        <span className={`text-[10px] font-medium ${active ? 'text-white/80' : 'text-slate-400'}`}>{c.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── 1. CAS MATERNELLE / PRIMAIRE (TITULAIRE UNIQUE DE SALLE) ── */}
              {isPrimMat && (
                <div className="p-5 rounded-2xl border space-y-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/25 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 shrink-0 text-emerald-600 dark:text-emerald-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">
                        Titulaire Exclusif de Salle — {cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed font-medium">
                        En régime {cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}, l'enseignant prend en charge{' '}
                        <strong>l'intégralité des matières</strong> de sa salle de classe et en assure la titularisation exclusive.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-black text-[10px] uppercase text-slate-400">
                      Sélectionner la Salle de Classe Attribuée :
                    </label>
                    <CustomSelect
                      options={salleUniqueOptions}
                      value={salleUnique}
                      onChange={setSalleUnique}
                      placeholder={`Choisir une salle de ${cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}...`}
                      searchable
                      creatable
                    />
                  </div>

                  {salleUnique && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-between">
                      <span>✓ Salle attribuée : <strong>{salleUnique}</strong> · Régime titulaire unique complet</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>
                  )}

                  {/* Matières pédagogiques incluses d'office */}
                  <div className="pt-2">
                    <p className="font-black uppercase text-[10px] text-slate-400 mb-2">
                      Matières EPST intégrées d'office au programme de cette salle :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(PROGRAMME_EPST_PAR_NIVEAU[cycle] || []).map(m => (
                        <span key={m.nom} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500" /> {m.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 2. CAS SECONDAIRE (INTELLIGENT PAR NIVEAU & MATIÈRE) ── */}
              {!isPrimMat && (
                <div className="space-y-6 animate-fade-in">

                  {/* A. Titularisation de promotion */}
                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                      <h3 className="text-[10.5px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                        <Award className="w-4 h-4" /> 3. Titularisation de Classe (Optionnel au Secondaire)
                      </h3>
                      <span className="text-[10px] text-slate-400 font-semibold">1 titulaire par classe</span>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black text-[10px] uppercase text-slate-400">
                        Ajouter une classe dont l'enseignant est le titulaire :
                      </label>
                      <CustomSelect
                        options={titularOptions}
                        value={addTitularValue}
                        onChange={v => { if (v) addTitularClass(v); setAddTitularValue(''); }}
                        placeholder="Choisir 7è CTEB, 1ère Scientifique, 4è Commerciale..."
                        searchable
                      />
                    </div>

                    {titularClasses.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {titularClasses.map(cls => {
                          const conflict = titularMap[cls.trim().toLowerCase()];
                          return (
                            <div key={cls} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black shadow-xs">
                              <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{cls}</span>
                              {conflict && (
                                <span className="text-[9.5px] bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Remplace {conflict.name}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeTitularClass(cls)}
                                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 active:scale-90 transition-all cursor-pointer ml-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic font-medium">
                        Aucune titularisation — Enseignant intervenant sur ses matières.
                      </p>
                    )}
                  </div>

                  {/* B. Moteur d'affectation dynamique Matières × Classes */}
                  <div className="p-5 rounded-2xl border space-y-5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <h3 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" /> 4. Affectation Intelligente des Cours
                        </h3>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Sélectionnez la classe cible pour charger automatiquement les matières officielles du programme EPST RDC.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {courseEntries.length} Cours Affecté(s)
                        </span>
                      </div>
                    </div>

                    {/* Sélecteur de classe dynamique */}
                    <div>
                      <label className="block font-black text-[10px] uppercase text-slate-400 mb-1.5">
                        Étape 1 : Classe ou Promotion Cible
                      </label>
                      <CustomSelect
                        options={classeSelectOptions}
                        value={selClasse}
                        onChange={setSelClasse}
                        placeholder="Sélectionner la classe..."
                        searchable
                      />
                    </div>

                    {/* Filtres & Recherche de Matières */}
                    <div className="space-y-3 p-4 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Filter className="w-3.5 h-3.5 text-slate-400" />
                          {[
                            { id: 'ALL', label: 'Toutes' },
                            { id: 'SCIENCES', label: 'Sciences & Math' },
                            { id: 'LANGUES', label: 'Langues' },
                            { id: 'HUMAINES', label: 'Sc. Humaines' },
                            { id: 'TECHNIQUE', label: 'Technique / Gestion' },
                          ].map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setSelCategoryFilter(f.id)}
                              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black transition-all cursor-pointer ${
                                selCategoryFilter === f.id
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:bg-slate-500/10'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={addAllAvailableSubjectsForCurrentClass}
                          className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 text-[10.5px] font-black hover:bg-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> Affecter toutes les disponibles
                        </button>
                      </div>

                      {/* Barre de recherche matière */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchSubjectTerm}
                          onChange={e => setSearchSubjectTerm(e.target.value)}
                          placeholder="Rechercher une matière du programme (ex: Algèbre, Chimie, Sténographie)..."
                          className="w-full pl-8 pr-4 py-2 rounded-lg text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      {/* Grille des Matières Dynamiques avec état Disponible / Conflit / Affecté */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
                        {suggestedCurriculumSubjects.map(sub => {
                          const conflict = getSubjectConflict(sub.nom, selClasse);
                          const isAssigned = isSubjectAssignedHere(sub.nom, selClasse);

                          return (
                            <div
                              key={sub.nom}
                              onClick={() => toggleSubjectForSelectedClass(sub.nom)}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer text-xs ${
                                isAssigned
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                                  : conflict
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 opacity-80'
                                  : 'hover:border-indigo-500/50 hover:bg-indigo-500/5'
                              }`}
                              style={!isAssigned && !conflict ? { background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' } : undefined}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isAssigned ? (
                                  <CheckSquare className="w-4 h-4 text-white shrink-0" />
                                ) : conflict ? (
                                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <div className="truncate">
                                  <p className="font-black truncate">{sub.nom}</p>
                                  <p className={`text-[9.5px] truncate ${isAssigned ? 'text-white/80' : 'text-slate-400'}`}>
                                    {conflict
                                      ? `Occupé par ${conflict}`
                                      : sub.isMajeure
                                      ? 'Branche Majeure de l’Option'
                                      : 'Matière Officielle EPST'}
                                  </p>
                                </div>
                              </div>

                              {isAssigned ? (
                                <span className="text-[10px] font-black bg-white/20 text-white px-2 py-0.5 rounded-md shrink-0">
                                  Affecté ✓
                                </span>
                              ) : conflict ? (
                                <span className="text-[9.5px] font-bold bg-rose-500/20 text-rose-500 px-1.5 py-0.5 rounded-md shrink-0">
                                  Conflit
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
                                  + Ajouter
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Saisie sur-mesure si besoin */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customCourse}
                        onChange={e => setCustomCourse(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubject(); } }}
                        placeholder="Ou saisir un cours spécifique hors programme (ex: Laboratoire de Physique Appliquée)..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <button
                        type="button"
                        onClick={addCustomSubject}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                    </div>

                    {/* Tableau récapitulatif des cours affectés */}
                    {courseEntries.length > 0 ? (
                      <div className="space-y-2 pt-2">
                        <label className="block font-black text-[10px] uppercase text-slate-400">
                          Cours Confirmés pour cet Enseignant ({courseEntries.length}) :
                        </label>
                        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ background: 'var(--bg-sunken)' }}>
                                <th className="text-left px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Matière / Discipline</th>
                                <th className="text-left px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Classe Attribuée</th>
                                <th className="w-10 px-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseEntries.map((entry, idx) => (
                                <tr key={idx} className="border-t" style={{ borderColor: 'var(--border)' }}>
                                  <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>
                                    <span className="flex items-center gap-2">
                                      <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                      {entry.matiere}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    {entry.classe === 'TOUTES' ? (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-500 font-bold text-[10px]">
                                        Toutes les classes
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-black text-[10px] border border-indigo-500/20">
                                        {entry.classe}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => removeCourseEntry(idx)}
                                      title="Retirer cette affectation"
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed text-center text-slate-400 font-semibold" style={{ borderColor: 'var(--border)' }}>
                        Aucune affectation enregistrée. Sélectionnez une classe et cochez les matières souhaitées ci-dessus.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Volume Horaire & Jauge Hebdomadaire (Design Haute Fidélité) ── */}
              {(() => {
                const normeEpst = isPrimMat ? 25 : 18;
                const ratio = Math.min(100, Math.round((volumeHoraire / normeEpst) * 100));
                const isSurplus = volumeHoraire > normeEpst;
                const isPlein = volumeHoraire === normeEpst;

                return (
                  <div
                    className="p-5 sm:p-6 rounded-2xl border space-y-4 shadow-xs transition-all"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                  >
                    {/* Header du widget */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <label className="block font-black text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Volume Horaire Hebdomadaire
                          </label>
                          <p className="text-[10.5px] font-semibold text-slate-400">
                            Norme EPST : <strong className="text-slate-700 dark:text-slate-200">{normeEpst}h / semaine</strong> pour un temps plein ({isPrimMat ? 'Primaire/Maternelle' : 'Secondaire'})
                          </p>
                        </div>
                      </div>

                      {/* Badge récapitulatif mois */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
                          <Zap className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{volumeHoraire * 4} h / mois</span>
                        </span>
                      </div>
                    </div>

                    {/* Contrôle principal : Stepper + Input stylé + Presets */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
                      {/* Stepper interactif */}
                      <div className="lg:col-span-5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setVolumeHoraire(v => Math.max(1, v - 1))}
                          className="w-10 h-10 rounded-xl border flex items-center justify-center font-black text-sm transition-all hover:bg-slate-500/10 active:scale-95 cursor-pointer shrink-0"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          title="Diminuer d'une heure"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="relative flex-1">
                          <NumberInput
                            value={volumeHoraire}
                            onChange={v => setVolumeHoraire(Math.max(1, Math.min(50, v || 1)))}
                            min={1}
                            max={50}
                            integer
                            className="w-full text-center px-4 py-2 rounded-xl text-base font-black border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                            style={{
                              background: 'var(--bg-surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <span className="absolute right-3 top-2.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                            h / sem.
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setVolumeHoraire(v => Math.min(50, v + 1))}
                          className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-black text-sm transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
                          title="Augmenter d'une heure"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Boutons Presets rapides */}
                      <div className="lg:col-span-7 flex items-center gap-1.5 flex-wrap">
                        {[
                          { val: 12, label: '12h (Partiel)' },
                          { val: 18, label: '18h (Sec. Plein)' },
                          { val: 20, label: '20h' },
                          { val: 25, label: '25h (Prim./Mat.)' },
                          { val: 30, label: '30h (Lourd)' },
                        ].map(p => {
                          const isCurrent = volumeHoraire === p.val;
                          return (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => setVolumeHoraire(p.val)}
                              className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-black transition-all cursor-pointer border ${
                                isCurrent
                                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                                  : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'
                              }`}
                              style={!isCurrent ? { background: 'var(--bg-surface)', borderColor: 'var(--border)' } : undefined}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Jauge visuelle EPST */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10.5px] font-bold">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          Taux de charge hebdomadaire :
                          <strong className={isSurplus ? 'text-amber-500' : isPlein ? 'text-emerald-500' : 'text-indigo-500'}>
                            {ratio}% ({volumeHoraire}h sur {normeEpst}h)
                          </strong>
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          isSurplus
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : isPlein
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                        }`}>
                          {isSurplus ? '⚡ Charge Renforcée / Heures Supp.' : isPlein ? '✓ Temps Plein Standard' : '⏱️ Charge Partielle'}
                        </span>
                      </div>

                      {/* Barre de progression */}
                      <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700/60 p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isSurplus
                              ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-500'
                              : isPlein
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (volumeHoraire / (normeEpst * 1.5)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* ── FOOTER D'ACTIONS ── */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border font-bold text-xs hover:bg-slate-500/10 transition-colors cursor-pointer"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer les Affectations'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
