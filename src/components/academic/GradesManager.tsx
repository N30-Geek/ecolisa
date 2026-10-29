import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Award,
  Calendar,
  Download,
  Edit3,
  GraduationCap,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
  TrendingUp,
  FileText,
  Printer,
  Sparkles,
  Calculator,
  Layers,
  CheckCircle2,
  Filter,
  Check,
  RotateCcw,
  BookOpen,
  FileSpreadsheet,
  HelpCircle,
  BarChart3,
  UserCheck,
  Home,
  ChevronRight,
  ChevronLeft,
  Send,
} from 'lucide-react';
import { LocalDatabaseService, UserSession } from '../../services/localDatabase';
import type { AnneeScolaireConfig, Cote, ClasseScolaire, Discipline, Eleve, MembrePersonnel, StatutCote, TypeEvaluation } from '../../types';
import { normalizeNiveau, EPST_SECTIONS_OPTIONS, getCoursesForContext } from '../../data/referentielEpstData';
import {
  getAllowedOptionsForClass,
  getAvailableSubjectsForContext,
  getMissingEpstCoursesForContext,
  dedupeClassesByName,
} from '../../utils/academicContext';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { PrintableGradeSheetModal } from './PrintableGradeSheetModal';
import { BulletinCTBEModal } from './BulletinCTBEModal';
import { EpreuvesManagerModal, EpreuveItem } from './EpreuvesManagerModal';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const CYCLES_LIST = [
  { value: 'ALL', label: 'Tous les Cycles Scolaires' },
  { value: 'MATERNELLE', label: 'Cycle Maternelle / Éveil (Petite, Moyenne, Grande Section)' },
  { value: 'PRIMAIRE', label: 'Cycle Primaire (1ère à 6ème Année)' },
  { value: 'SECONDAIRE_CTEB', label: 'Cycle CTEB (7ème & 8ème Éducation de Base)' },
  { value: 'HUMANITES', label: 'Cycle Humanités (Générales & Techniques)' },
];

interface PeriodDef { value: string; label: string; isExam?: boolean }

// La structure des périodes de cotation dépend du cycle : la Maternelle
// fonctionne en 3 trimestres (sans examen), tandis que le Primaire, le CTEB
// et les Humanités fonctionnent en 2 semestres de 2 périodes + 1 examen chacun.
const PERIODS_MATERNELLE: PeriodDef[] = [
  { value: 'T1', label: '1er Trimestre' },
  { value: 'T2', label: '2ème Trimestre' },
  { value: 'T3', label: '3ème Trimestre' },
];
const PERIODS_DEFAULT: PeriodDef[] = [
  { value: 'P1', label: '1ère Période' },
  { value: 'P2', label: '2ème Période' },
  { value: 'EX1', label: 'Examen 1er Semestre', isExam: true },
  { value: 'P3', label: '3ème Période' },
  { value: 'P4', label: '4ème Période' },
  { value: 'EX2', label: 'Examen 2ème Semestre', isExam: true },
];

const isMaternelleCycle = (cycleId?: string) => (cycleId || '').toUpperCase() === 'MATERNELLE';
const getPeriodsForCycle = (cycleId?: string): PeriodDef[] => isMaternelleCycle(cycleId) ? PERIODS_MATERNELLE : PERIODS_DEFAULT;

const parseCalendarDate = (value: string | undefined, schoolYearStart: string): Date | null => {
  if (!value) return null;
  const isoDate = new Date(value);
  if (!Number.isNaN(isoDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(value)) return isoDate;
  const numeric = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (numeric) return new Date(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]));
  const months: Record<string, number> = { jan: 0, fev: 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, aou: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const match = text.match(/(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (!match) return null;
  const month = months[match[2].slice(0, 3)];
  if (month === undefined) return null;
  const explicitYear = match[3] ? Number(match[3]) : null;
  const startYearMatch = schoolYearStart.match(/(20\d{2})/);
  const parsedStart = new Date(schoolYearStart);
  const startYear = startYearMatch
    ? Number(startYearMatch[1])
    : !Number.isNaN(parsedStart.getTime()) ? parsedStart.getFullYear() : new Date().getFullYear();
  const year = explicitYear ?? (month >= 7 ? startYear : startYear + 1);
  return new Date(year, month, Number(match[1]));
};

const getMention = (pct: number) => {
  if (pct >= 90) return { code: 'PGD', label: 'Plus Grande Distinction', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
  if (pct >= 80) return { code: 'GD', label: 'Grande Distinction', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
  if (pct >= 70) return { code: 'D', label: 'Distinction', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' };
  if (pct >= 60) return { code: 'S', label: 'Satisfaction', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' };
  if (pct >= 50) return { code: 'P', label: 'Passable', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' };
  return { code: 'A', label: 'Ajourné / Insuffisant', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' };
};

interface GradesManagerProps {
  activeSchoolYear?: string;
}

export const GradesManager: React.FC<GradesManagerProps> = ({ activeSchoolYear }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'bulletins'>('matrix');
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [allCotes, setAllCotes] = useState<Cote[]>([]);
  const [epreuvesList, setEpreuvesList] = useState<EpreuveItem[]>([]);
  const [schoolYear, setSchoolYear] = useState<AnneeScolaireConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Workflow cotes
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [currentStaff, setCurrentStaff] = useState<MembrePersonnel | null>(null);

  // ── SELECTIONS EN CASCADE PAR ÉTAPES ──
  // 1. Cycle
  const [selectedCycle, setSelectedCycle] = useState<string>('ALL');
  // 2. Classe
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  // 3. Salle Physique
  const [selectedSalle, setSelectedSalle] = useState<string>('ALL');
  // 4. Cours / Matière
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  // Option locale de la classe (décroche du DB si l'update fail)
  const [selectedClassOption, setSelectedClassOption] = useState<string>('');

  // Clés de contexte déjà provisionnées automatiquement
  const seededContexts = useRef(new Set<string>());

  // Recherche Élève
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Grille complète de saisie des cotes pour le cours sélectionné :
  // code de période (P1, P2, EX1, P3, P4, EX2) -> eleveId -> score
  const [scoresByPeriod, setScoresByPeriod] = useState<Record<string, Record<string, number>>>({});
  const [editedScoreCells, setEditedScoreCells] = useState<Set<string>>(new Set());
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  // Modales
  const [printableModalOpen, setPrintableModalOpen] = useState(false);
  const [bulletinModalOpen, setBulletinModalOpen] = useState(false);
  const [epreuvesModalOpen, setEpreuvesModalOpen] = useState(false);
  const [selectedStudentForBulletin, setSelectedStudentForBulletin] = useState<Eleve | null>(null);

  // Charger les données SQLite
  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, subs, allSt, cots, staffList, schoolYears] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getCotes(),
        LocalDatabaseService.getStaff().catch(() => []),
        LocalDatabaseService.getSchoolYears(),
      ]);
      setSchoolYear(
        schoolYears.find(year => year.id === activeSchoolYear || year.nom === activeSchoolYear) ||
        schoolYears.find(year => year.statut === 'EN_COURS') ||
        null
      );

      const user = LocalDatabaseService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        const userFullName = (user.nom || '').toLowerCase().trim();
        const match = (staffList || []).find((s: MembrePersonnel) =>
          (s.email && s.email.toLowerCase() === user.email?.toLowerCase()) ||
          (userFullName &&
            (userFullName === `${(s.prenom || '').toLowerCase().trim()} ${(s.nom || '').toLowerCase().trim()}`.trim() ||
             userFullName === (s.nom || '').toLowerCase().trim()))
        );
        setCurrentStaff(match || null);
      }

      const userAssigned = await LocalDatabaseService.getCurrentUserAssignedClasses();

      let filteredCls = cls || [];
      let filteredSt = allSt || [];

      if (userAssigned !== null) {
        // Enseignant / Titulaire : Filtrage strict par classes assignées
        filteredCls = (cls || []).filter(c =>
          userAssigned.some(ac =>
            ac.toLowerCase().trim() === c.nom.toLowerCase().trim() ||
            c.nom.toLowerCase().includes(ac.toLowerCase().trim()) ||
            ac.toLowerCase().includes(c.nom.toLowerCase().trim())
          )
        );
        filteredSt = (allSt || []).filter(s => {
          const sc = (s.nomClasse || (s as any).classe || (s as any).salle || '').toLowerCase().trim();
          return userAssigned.some(ac => {
            const acLower = ac.toLowerCase().trim();
            return sc === acLower || sc.includes(acLower) || acLower.includes(sc);
          });
        });
      }

      setClasses(dedupeClassesByName(filteredCls));
      setSubjects(subs || []);
      setStudents(filteredSt);
      setAllCotes(cots || []);

      if (filteredCls.length > 0) {
        setSelectedClassId(prev => (prev && filteredCls.some(c => c.id === prev) ? prev : filteredCls[0].id));
      }
    } catch (e) {
      console.error("Erreur chargement cotes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolYear]);

  // 1. FILTRAGE DES CLASSES PAR CYCLE SELECTIONNE
  const filteredClasses = useMemo(() => {
    if (selectedCycle === 'ALL') return classes;
    return classes.filter(c => c.cycleId === selectedCycle || c.nom.toUpperCase().includes(selectedCycle));
  }, [classes, selectedCycle]);

  // Si le cycle change et la classe actuelle n'appartient plus à ce cycle, sélectionner automatiquement la 1ère
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const isValid = filteredClasses.some(c => c.id === selectedClassId);
      if (!isValid) {
        setSelectedClassId(filteredClasses[0].id);
      }
    } else {
      setSelectedClassId('');
    }
  }, [filteredClasses]);

  // Objet classe actuellement sélectionnée
  const currentClassObj = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);

  // Synchronise l'option locale au chargement / changement de classe
  useEffect(() => {
    if (!currentClassObj) {
      setSelectedClassOption('');
      return;
    }
    const opt = currentClassObj.optionCode;
    setSelectedClassOption(opt && opt !== 'TRONC_COMMUN' ? opt : '');
  }, [currentClassObj?.id]);

  // Mise à jour de l'option pour les classes d'Humanités
  const handleClassOptionChange = async (optionCode: string) => {
    if (!currentClassObj || !currentClassObj.id) return;
    try {
      const updated = await LocalDatabaseService.updateClass(currentClassObj.id, { optionCode });
      if (updated) {
        setClasses(prev => prev.map(c => (c.id === currentClassObj.id ? updated : c)));
      }
    } catch (err) {
      console.error('[GradesManager] Erreur mise à jour option de classe :', err);
    }
  };

  // 2. SALLES PHYSIQUES DISPONIBLES POUR LA CLASSE SELECTIONNEE
  const salleOptions = useMemo(() => {
    if (!currentClassObj) return [{ value: 'ALL', label: 'Toutes les salles' }];
    const mainSalle = currentClassObj.salle || 'Salle Principale';
    const otherSalles = currentClassObj.salles || [];
    const setS = new Set([mainSalle, ...otherSalles]);

    return [
      { value: 'ALL', label: `Toutes les salles (${setS.size})` },
      ...Array.from(setS).map(s => ({ value: s, label: `Local / ${s}` }))
    ];
  }, [currentClassObj]);

  const isTeacherUser = currentUser?.role === 'ENSEIGNANT' || currentUser?.role === 'TITULAIRE';

  // 3. FILTRAGE RIGOUREUX DES MATIÈRES / COURS ENSEIGNÉS DANS CETTE CLASSE ET SALLE
  const availableSubjects = useMemo(() => {
    if (!currentClassObj) return subjects;
    return getAvailableSubjectsForContext(
      subjects,
      currentClassObj,
      selectedClassOption,
      isTeacherUser ? currentStaff : null,
      classes
    );
  }, [subjects, currentClassObj, selectedClassOption, currentUser, currentStaff, classes]);

  // Si la liste des matières disponibles change, réinitialiser la matière si elle n'y figure plus
  useEffect(() => {
    if (availableSubjects.length > 0 && selectedSubjectId !== 'ALL') {
      const isValid = availableSubjects.some(s => s.id === selectedSubjectId);
      if (!isValid) {
        setSelectedSubjectId('ALL');
      }
    }
  }, [availableSubjects]);

  // Auto-chargement des cours officiels EPST manquants pour le contexte.
  // On complète même si certains cours existent déjà : c'est indispensable pour
  // la Maternelle, dont les 12 activités officielles doivent toutes être
  // présentes dans la liste de cotation.
  useEffect(() => {
    if (loading || !currentClassObj) return;

    const classCycle = currentClassObj.cycleId;
    const classNiveau = normalizeNiveau(currentClassObj.nom);
    const isHumanite = (classCycle || '').toUpperCase() === 'HUMANITES';
    const activeOption = isHumanite ? selectedClassOption : (currentClassObj.optionCode || 'TRONC_COMMUN');

    if (isHumanite && !activeOption) return;

    const key = `${classCycle}-${activeOption}-${classNiveau || ''}`;
    if (seededContexts.current.has(key)) return;

    const missing = getMissingEpstCoursesForContext(subjects, currentClassObj, activeOption);
    if (missing.length === 0) {
      seededContexts.current.add(key);
      return;
    }

    (async () => {
      try {
        for (const c of missing) {
          await LocalDatabaseService.addSubject({
            id: `epst-${c.code.toLowerCase()}`,
            code: c.code,
            nom: c.nom,
            categorie: c.categorie,
            maxScore: c.maxScore,
            maxExamen: c.maxExamen,
            maxSemestre: c.maxSemestre,
            maxAnnuel: c.maxAnnuel,
            coefficient: c.coefficient,
            volumeHoraire: c.volumeHoraire,
            cycleCode: c.cycleCode,
            optionCode: c.optionCode || 'TRONC_COMMUN',
            niveau: c.niveau,
            groupeMaternelle: c.groupeMaternelle,
            isOptionMajora: c.isOptionMajora,
            ordre: c.ordre,
          } as Discipline);
        }
        seededContexts.current.add(key);
        await loadData();
      } catch (err) {
        console.error('[GradesManager] Erreur auto-chargement EPST :', err);
      }
    })();
  }, [loading, currentClassObj, availableSubjects, subjects, selectedClassOption]);

  // Matière sélectionnée actuelle
  const currentSubject = useMemo(() => {
    return subjects.find(s => s.id === selectedSubjectId);
  }, [subjects, selectedSubjectId]);

  // 4. ÉLÈVES FILTRÉS POUR LA CLASSE ET LA SALLE SÉLECTIONNÉES
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    let list = students.filter(e => e.classId === selectedClassId || (currentClassObj && e.nomClasse === currentClassObj.nom));
    if (selectedSalle !== 'ALL') {
      list = list.filter(e => (e as any).salle === selectedSalle || (e as any).salleCode === selectedSalle);
    }
    return list;
  }, [selectedClassId, selectedSalle, students, currentClassObj]);

  // Structure des périodes de cotation adaptée au cycle de la classe
  // sélectionnée : 3 trimestres (Maternelle) ou 2 semestres de 2 périodes +
  // 1 examen (Primaire, CTEB, Humanités).
  const activePeriods = useMemo(() => getPeriodsForCycle(currentClassObj?.cycleId), [currentClassObj]);
  const activePeriodCodes = useMemo(() => activePeriods.map(p => p.value), [activePeriods]);
  const isMaternelle = isMaternelleCycle(currentClassObj?.cycleId);

  const periodStartDates = useMemo(() => {
    const result: Record<string, Date | null> = {};
    const configured = schoolYear?.periodes || [];
    const indexByCode: Record<string, number> = isMaternelle
      ? { T1: 0, T2: 1, T3: 2 }
      : { P1: 0, P2: 1, EX1: 1, P3: 2, P4: 3, EX2: 3 };
    activePeriodCodes.forEach(code => {
      const index = indexByCode[code];
      const period = configured[index];
      result[code] = parseCalendarDate(period?.debut, `${schoolYear?.debut || ''} ${schoolYear?.nom || ''}`);
    });
    return result;
  }, [activePeriodCodes, isMaternelle, schoolYear]);

  const isPeriodOpen = (periodCode: string) => {
    if (!schoolYear) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstPeriodCode = activePeriodCodes[0];
    if (periodCode === firstPeriodCode) return true;
    const start = periodStartDates[periodCode];
    if (!start) return false;
    return today >= start;
  };
  const hasOpenPeriods = activePeriodCodes.some(isPeriodOpen);

  // MAX POINTS PAR COLONNE DE PÉRIODE, SELON LA MATIÈRE SÉLECTIONNÉE
  // (avec valeurs de repli défensives pour éviter tout NaN si la matière n'a
  // pas de maxScore/maxExamen défini).
  const maxScoreForPeriod = (periodCode: string): number => {
    const isExam = activePeriods.find(p => p.value === periodCode)?.isExam || false;
    const baseMax = (currentSubject?.maxScore && !isNaN(currentSubject.maxScore)) ? currentSubject.maxScore : 20;
    if (currentSubject) {
      const examMax = (currentSubject.maxExamen && !isNaN(currentSubject.maxExamen)) ? currentSubject.maxExamen : baseMax * 2;
      return isExam ? examMax : baseMax;
    }
    return isExam ? 40 : 20;
  };

  // Synchronisation des cotes existantes : on charge toutes les périodes du
  // cycle en une fois pour afficher la grille complète (comme la fiche de
  // cotation papier), au lieu de ne montrer qu'une seule période à la fois.
  useEffect(() => {
    if (!selectedClassId || selectedSubjectId === 'ALL') {
      setScoresByPeriod({});
      return;
    }
    const byPeriod: Record<string, Record<string, number>> = {};
    const automatic = new Map<string, Cote[]>();
    const manual = new Map<string, Cote>();
    activePeriodCodes.forEach(code => { byPeriod[code] = {}; });
    for (const cote of allCotes) {
      if (
        cote.classeId !== selectedClassId ||
        cote.matiereId !== selectedSubjectId ||
        !activePeriodCodes.includes(cote.periode) ||
        !cote.eleveId
      ) continue;
      const key = `${cote.periode}:${cote.eleveId}`;
      if (cote.evaluationId && cote.statut === 'VALIDE_DE') automatic.set(key, [...(automatic.get(key) || []), cote]);
      else if (!cote.evaluationId && !manual.has(key)) manual.set(key, cote);
    }
    activePeriodCodes.forEach(periodCode => {
      classStudents.forEach(student => {
        const key = `${periodCode}:${student.id}`;
        const manualCote = manual.get(key);
        if (manualCote) {
          byPeriod[periodCode][student.id] = manualCote.score;
          return;
        }
        const evaluations = automatic.get(key) || [];
        const totalMax = evaluations.reduce((sum, cote) => sum + Math.max(cote.maxScore || 0, 0), 0);
        if (totalMax > 0) {
          const totalScore = evaluations.reduce((sum, cote) => sum + Math.max(cote.score || 0, 0), 0);
          byPeriod[periodCode][student.id] = Number(((totalScore / totalMax) * maxScoreForPeriod(periodCode)).toFixed(2));
        }
      });
    });
    setScoresByPeriod(byPeriod);
  }, [selectedClassId, selectedSubjectId, allCotes, activePeriodCodes, classStudents, currentSubject]);

  // FILTRAGE PAR RECHERCHE ET PAGINATION
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(e =>
      `${e.prenom} ${e.nom} ${e.postnom || ''} ${e.registrationNumber}`.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  const { paginated: paginatedStudents, ...studentsPagination } = usePagination(filteredStudents, { defaultPageSize: 10 });

  // Totaux d'un élève pour la matière sélectionnée.
  // - Cycles à 2 semestres : T.S1 (P1+P2+EX1), T.S2 (P3+P4+EX2), T.GE = T.S1+T.S2.
  // - Maternelle (3 trimestres) : T.GE = T1+T2+T3, pas de sous-total semestriel.
  const getStudentTotals = (studentId: string) => {
    const val = (code: string) => scoresByPeriod[code]?.[studentId];

    if (isMaternelle) {
      const t1 = val('T1'), t2 = val('T2'), t3 = val('T3');
      const has = t1 !== undefined || t2 !== undefined || t3 !== undefined;
      const tge = has ? (t1 || 0) + (t2 || 0) + (t3 || 0) : undefined;
      return { t1, t2, t3, tge };
    }

    const p1 = val('P1'), p2 = val('P2'), ex1 = val('EX1');
    const p3 = val('P3'), p4 = val('P4'), ex2 = val('EX2');
    const hasS1 = p1 !== undefined || p2 !== undefined || ex1 !== undefined;
    const hasS2 = p3 !== undefined || p4 !== undefined || ex2 !== undefined;
    const ts1 = hasS1 ? (p1 || 0) + (p2 || 0) + (ex1 || 0) : undefined;
    const ts2 = hasS2 ? (p3 || 0) + (p4 || 0) + (ex2 || 0) : undefined;
    const tge = (hasS1 || hasS2) ? (ts1 || 0) + (ts2 || 0) : undefined;
    return { p1, p2, ex1, ts1, p3, p4, ex2, ts2, tge };
  };

  // Maximum annuel (T.GE) pour la matière sélectionnée : somme des maxima de
  // toutes les colonnes actives pour le cycle de la classe.
  const maxAnnuel = useMemo(() => {
    return activePeriodCodes.reduce((sum, code) => sum + maxScoreForPeriod(code), 0);
  }, [currentSubject, activePeriodCodes]);

  // STATISTIQUES EN TEMPS RÉEL (basées sur le total général annuel T.GE)
  const stats = useMemo(() => {
    const totalCount = classStudents.length;
    let sumScores = 0;
    let ratedCount = 0;
    let passCount = 0;
    let maxObtained = 0;

    classStudents.forEach(st => {
      const { tge } = getStudentTotals(st.id);
      if (tge !== undefined && !isNaN(tge)) {
        sumScores += tge;
        ratedCount++;
        if (tge > maxObtained) maxObtained = tge;
        const pct = maxAnnuel > 0 ? (tge / maxAnnuel) * 100 : 0;
        if (pct >= 50) passCount++;
      }
    });

    const average = ratedCount > 0 ? sumScores / ratedCount : 0;
    const successRate = ratedCount > 0 ? Math.round((passCount / ratedCount) * 100) : 0;

    return {
      totalCount,
      ratedCount,
      average: Math.round(average * 10) / 10,
      successRate,
      maxObtained,
    };
  }, [classStudents, scoresByPeriod, maxAnnuel]);

  // Statut du workflow pour la sélection actuelle (classe + matière)
  const workflowStatus = useMemo<Cote['statut']>(() => {
    const cotes = allCotes.filter(c =>
      c.classeId === selectedClassId &&
      c.matiereId === selectedSubjectId &&
      activePeriodCodes.includes(c.periode)
    );
    if (!cotes.length) return undefined;
    const set = new Set(cotes.map(c => c.statut || 'BROUILLON'));
    if (set.size === 1) return Array.from(set)[0];
    // Si plusieurs statuts, retourne le plus avancé
    const order: StatutCote[] = ['BROUILLON', 'SOUMIS', 'VALIDE_TITULAIRE', 'VALIDE_DE', 'REJETE_TITULAIRE', 'REJETE_DE'];
    for (const s of order) if (set.has(s)) return s;
    return 'BROUILLON';
  }, [allCotes, selectedClassId, selectedSubjectId, activePeriodCodes]);

  const userRole = currentUser?.role;
  const canSubmit = userRole === 'ENSEIGNANT' && (workflowStatus === 'BROUILLON' || !workflowStatus);
  const canValidateTitulaire = userRole === 'TITULAIRE' && (workflowStatus === 'SOUMIS');
  const canRejectTitulaire = userRole === 'TITULAIRE' && (workflowStatus === 'SOUMIS' || workflowStatus === 'BROUILLON');
  const canValidateDE = (userRole === 'DIRECTEUR_ETUDES' || userRole === 'PREFET_DIRECTEUR' || userRole === 'DIRECTEUR_ECOLE' || userRole === 'PROMOTEUR_ADMIN') && (workflowStatus === 'VALIDE_TITULAIRE');
  const canRejectDE = (userRole === 'DIRECTEUR_ETUDES' || userRole === 'PREFET_DIRECTEUR' || userRole === 'DIRECTEUR_ECOLE' || userRole === 'PROMOTEUR_ADMIN') && (workflowStatus === 'VALIDE_TITULAIRE' || workflowStatus === 'SOUMIS');
  const canModifyScores = !workflowStatus || workflowStatus === 'BROUILLON' || workflowStatus === 'REJETE_TITULAIRE' || workflowStatus === 'REJETE_DE';

  const statusLabel: Record<string, string> = {
    BROUILLON: 'Brouillon',
    SOUMIS: 'Soumis au titulaire',
    VALIDE_TITULAIRE: 'Validé par le titulaire',
    REJETE_TITULAIRE: 'Rejeté par le titulaire',
    VALIDE_DE: 'Validé par le Directeur des Études',
    REJETE_DE: 'Rejeté par le DE',
  };

  // Saisie de cote avec contrôle de la valeur max, pour une colonne de période donnée
  const handleScoreInput = (periodCode: string, eleveId: string, inputVal: number) => {
    if (!isPeriodOpen(periodCode)) return;
    let val = inputVal;
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    const max = maxScoreForPeriod(periodCode);
    if (val > max) val = max;

    setScoresByPeriod(prev => ({
      ...prev,
      [periodCode]: { ...(prev[periodCode] || {}), [eleveId]: val },
    }));
    setEditedScoreCells(prev => new Set(prev).add(`${periodCode}:${eleveId}`));
  };

  // Enregistrement dans SQLite : upsert pour chaque période renseignée de
  // chaque élève, afin de ne jamais dupliquer une cote déjà existante.
  const handleSaveGrades = async (nextStatus?: StatutCote) => {
    if (!selectedClassId) return alert('Veuillez choisir une classe.');
    if (selectedSubjectId === 'ALL') return alert('Veuillez choisir un cours / une discipline.');
    setSaving(true);
    try {
      const now = new Date().toISOString();
      for (const student of classStudents) {
        for (const periodCode of activePeriodCodes) {
          if (!isPeriodOpen(periodCode)) continue;
          const scoreVal = scoresByPeriod[periodCode]?.[student.id];
          if (scoreVal === undefined || scoreVal === null) continue;

          const existing = allCotes.find(c =>
            !c.evaluationId &&
            c.eleveId === student.id &&
            c.classeId === selectedClassId &&
            c.matiereId === selectedSubjectId &&
            c.periode === periodCode
          );
          if (!existing && !editedScoreCells.has(`${periodCode}:${student.id}`)) continue;

          const payload: Partial<Cote> = {
            eleveId: student.id,
            classeId: selectedClassId,
            matiereId: selectedSubjectId,
            anneeScolaireId: currentClassObj?.schoolYearId || schoolYear?.id,
            optionCode: currentClassObj?.optionCode,
            enseignantId: currentStaff?.id,
            periode: periodCode,
            type: (activePeriods.find(p => p.value === periodCode)?.isExam ? 'EXAMEN' : 'INTERROGATION') as TypeEvaluation,
            score: scoreVal,
            maxScore: maxScoreForPeriod(periodCode),
            dateCote: now.split('T')[0],
            titre: `${currentSubject?.nom || 'Matière'} - ${activePeriods.find(p => p.value === periodCode)?.label || periodCode}`,
            statut: nextStatus || 'BROUILLON',
          };

          if (nextStatus === 'SOUMIS' && !existing?.soumisLe) payload.soumisLe = now;

          if (existing) {
            await LocalDatabaseService.updateCote(existing.id, payload);
          } else {
            await LocalDatabaseService.addCote({ id: uuid(), ...payload } as Cote);
          }
        }
      }
      if (nextStatus) {
        const contextCotes = await LocalDatabaseService.getCotes({ classeId: selectedClassId, matiereId: selectedSubjectId });
        await Promise.all(
          contextCotes
            .filter(cote => activePeriodCodes.includes(cote.periode) && isPeriodOpen(cote.periode))
            .map(cote => LocalDatabaseService.updateCote(cote.id, {
              statut: nextStatus,
              soumisLe: nextStatus === 'SOUMIS' ? (cote.soumisLe || now) : cote.soumisLe,
            }))
        );
      }
      setEditedScoreCells(new Set());
      await loadData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde des cotes.');
    } finally {
      setSaving(false);
    }
  };

  // ── WORKFLOW COTES → TITULAIRE → DIRECTEUR DES ÉTUDES ──
  const handleWorkflowAction = async (action: 'SOUMIS' | 'VALIDE_TITULAIRE' | 'REJETE_TITULAIRE' | 'VALIDE_DE' | 'REJETE_DE') => {
    if (!selectedClassId || selectedSubjectId === 'ALL') return alert('Veuillez choisir une classe et une matière.');

    const targetCotes = allCotes.filter(c =>
      c.classeId === selectedClassId &&
      c.matiereId === selectedSubjectId &&
      activePeriodCodes.includes(c.periode)
    );
    if (targetCotes.length === 0) return alert('Aucune cote enregistrée pour ce cours.');

    const now = new Date().toISOString();
    const updates: Partial<Cote> = { statut: action };
    if (action === 'SOUMIS') updates.soumisLe = now;
    if (action === 'VALIDE_TITULAIRE') {
      updates.valideTitulaireLe = now;
      updates.valideParTitulaireId = currentStaff?.id;
    }
    if (action === 'REJETE_TITULAIRE') {
      updates.commentaireValidation = `Rejeté par le titulaire le ${now}`;
    }
    if (action === 'VALIDE_DE') {
      updates.valideDELe = now;
      updates.valideParDEId = currentStaff?.id;
    }
    if (action === 'REJETE_DE') {
      updates.commentaireValidation = `Rejeté par le DE le ${now}`;
    }

    setSaving(true);
    try {
      for (const c of targetCotes) {
        await LocalDatabaseService.updateCote(c.id, updates);
      }
      await loadData();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Erreur lors du changement de statut.');
    } finally {
      setSaving(false);
    }
  };

  // ── BULLETINS : moyenne générale annuelle et classement par élève ──
  // Calcule le total général annuel (toutes disciplines confondues) et le
  // maximum correspondant pour un élève, à partir de toutes ses cotes de la
  // classe sélectionnée. Fonctionne pour tous les cycles (Maternelle en
  // trimestres, ou Primaire/CTEB/Humanités en semestres) puisqu'on se base
  // directement sur le maximum annuel déjà calculé par matière (Discipline.maxAnnuel).
  const ALL_KNOWN_PERIOD_CODES = useMemo(
    () => new Set([...PERIODS_MATERNELLE, ...PERIODS_DEFAULT].map(p => p.value)),
    []
  );
  const getAnnualSummaryForStudent = (studentId: string) => {
    const cotesEleve = allCotes.filter(c => c.eleveId === studentId && c.classeId === selectedClassId);
    const byMatiere = new Map<string, number>();
    cotesEleve.forEach(c => {
      if (!c.matiereId || !ALL_KNOWN_PERIOD_CODES.has(c.periode) || c.score === undefined) return;
      byMatiere.set(c.matiereId, (byMatiere.get(c.matiereId) || 0) + c.score);
    });

    let totalObtenu = 0;
    let totalMax = 0;
    let matieresNotees = 0;

    byMatiere.forEach((sumScore, matiereId) => {
      const subject = subjects.find(s => s.id === matiereId);
      const maxScore = subject?.maxScore || 20;
      const maxAnnuelMatiere = subject?.maxAnnuel || (isMaternelleCycle(subject?.cycleCode) ? maxScore * 3 : maxScore * 8);
      totalObtenu += sumScore;
      totalMax += maxAnnuelMatiere;
      matieresNotees++;
    });

    return { totalObtenu, totalMax, matieresNotees, pct: totalMax > 0 ? (totalObtenu / totalMax) * 100 : 0 };
  };

  // Classement de la classe (par pourcentage général décroissant)
  const bulletinRows = useMemo(() => {
    const rows = classStudents.map(st => ({ student: st, summary: getAnnualSummaryForStudent(st.id) }));
    const ranked = [...rows]
      .filter(r => r.summary.matieresNotees > 0)
      .sort((a, b) => b.summary.pct - a.summary.pct);
    const rankMap = new Map(ranked.map((r, i) => [r.student.id, i + 1]));
    return rows
      .map(r => ({ ...r, rang: rankMap.get(r.student.id) || null }))
      .sort((a, b) => (a.rang || 999) - (b.rang || 999));
  }, [classStudents, allCotes, subjects, selectedClassId]);

  const filteredBulletinRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return bulletinRows;
    return bulletinRows.filter(({ student }) =>
      `${student.nom} ${student.postnom || ''} ${student.prenom} ${student.registrationNumber || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [bulletinRows, searchQuery]);

  const bulletinStats = useMemo(() => {
    const completed = bulletinRows.filter(row => row.summary.matieresNotees > 0);
    const successful = completed.filter(row => row.summary.pct >= 50);
    return {
      total: bulletinRows.length,
      completed: completed.length,
      average: completed.length ? completed.reduce((sum, row) => sum + row.summary.pct, 0) / completed.length : 0,
      successRate: completed.length ? (successful.length / completed.length) * 100 : 0,
    };
  }, [bulletinRows]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRE EN-TÊTE DU MODULE */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Cotes, Grilles & Bulletins EPST RDC
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sélection en cascade (Cycle → Classe → Salle → Cours → Épreuve) & Calculs automatiques
            </p>
          </div>
        </div>

        {/* SWAP ONGLET */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 min-w-full sm:min-w-[360px]" style={{ background: 'var(--bg-sunken)' }}>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`min-h-11 px-4 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-600'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="text-left leading-tight">Saisir les cotes</span>
          </button>
          <button
            onClick={() => setActiveTab('bulletins')}
            className={`min-h-11 px-4 rounded-xl text-xs font-black transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'bulletins' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-indigo-500/10 hover:text-indigo-600'
            }`}
          >
            <Award className="w-4 h-4" />
            <span className="text-left leading-tight">Consulter les bulletins</span>
          </button>
        </div>
      </div>

      {activeTab === 'matrix' && (
        <div className="space-y-5">
          {/* PANNEAU DE SÉLECTION EN CASCADE COMPLET (5 ÉTAPES) */}
          <div
            className="p-5 rounded-2xl border space-y-4 shadow-xs"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                <Filter className="w-4 h-4" />
                <span>Sélection en Cascade par Étapes (Cycle → Classe → Salle → Cours → Épreuve)</span>
              </div>
              <button
                onClick={() => setEpreuvesModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Gérer les Épreuves / Examens
              </button>
            </div>

            {/* SÉLECTEURS EN CASCADE EN GRILLE RESPONSIVE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. CYCLE */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">1</span>
                  Cycle Scolaire
                </label>
                <CustomSelect
                  value={selectedCycle}
                  onChange={(v) => setSelectedCycle(v)}
                  options={CYCLES_LIST}
                />
              </div>

              {/* 2. CLASSE / PROMOTION */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">2</span>
                  Classe / Promotion
                </label>
                <CustomSelect
                  value={selectedClassId}
                  onChange={(v) => setSelectedClassId(v)}
                  options={filteredClasses.map(c => ({ value: c.id, label: `${c.nom}` }))}
                  placeholder="Sélectionner une classe..."
                />
              </div>

              {/* 3. SALLE PHYSIQUE / LOCAL */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">3</span>
                  Salle / Local
                </label>
                <CustomSelect
                  value={selectedSalle}
                  onChange={(v) => setSelectedSalle(v)}
                  options={salleOptions}
                />
              </div>

              {/* 3b. OPTION (obligatoire pour les Humanités) */}
              {currentClassObj?.cycleId?.toUpperCase() === 'HUMANITES' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-black">3b</span>
                    Option / Section
                  </label>
                  <CustomSelect
                    value={selectedClassOption}
                    onChange={(v) => {
                      if (v) {
                        setSelectedClassOption(v);
                        handleClassOptionChange(v);
                      }
                    }}
                    options={[
                      { value: '', label: '— Choisir une option —' },
                      ...getAllowedOptionsForClass(currentClassObj, classes, isTeacherUser ? currentStaff : null)
                    ]}
                    placeholder="Sélectionner l'option..."
                  />
                  {!selectedClassOption && (
                    <p className="text-[10px] text-rose-500 mt-1">Choisir une option pour voir les cours.</p>
                  )}
                </div>
              )}

              {/* 4. COURS / MATIÈRE (FILTRÉ DYNAMIQUEMENT) */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">4</span>
                  Cours / Discipline ({availableSubjects.length})
                </label>
                <CustomSelect
                  value={selectedSubjectId}
                  onChange={(v) => setSelectedSubjectId(v)}
                  options={[
                    { value: 'ALL', label: 'Sélectionner un cours...' },
                    ...availableSubjects.map(s => ({ value: s.id, label: `${s.nom} (Max ${s.maxScore} pts)` }))
                  ]}
                />
              </div>
            </div>

            {/* BARRE D'ACTIONS ET RECHERCHE ÉLÈVE STYLISÉE */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Recherche élève (Nom, matricule)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 rounded-xl border text-xs bg-slate-500/10 focus:outline-none focus:border-indigo-500 font-medium"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
                  <span>Total Général Annuel Max: </span>
                  <strong className="font-mono text-sm">{maxAnnuel} pts</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {workflowStatus && (
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                    workflowStatus === 'VALIDE_DE' ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' :
                    workflowStatus === 'VALIDE_TITULAIRE' ? 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' :
                    workflowStatus === 'SOUMIS' ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
                    workflowStatus?.startsWith('REJETE') ? 'bg-rose-500/15 text-rose-700 border-rose-500/30' :
                    'bg-slate-500/15 text-slate-700 border-slate-500/30'
                  }`}>
                    {statusLabel[workflowStatus] || workflowStatus}
                  </span>
                )}

                <button
                  onClick={() => setPrintableModalOpen(true)}
                  disabled={selectedSubjectId === 'ALL' || isMaternelle}
                  title={isMaternelle ? 'La fiche imprimable Semestre I/II ne s\'applique pas au cycle Maternelle (trimestres)' : undefined}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" /> Fiche de Cotation (PDF)
                </button>

                <button
                  onClick={() => handleSaveGrades()}
                  disabled={saving || selectedSubjectId === 'ALL' || !canModifyScores || !hasOpenPeriods}
                  title={!hasOpenPeriods
                    ? 'La saisie sera disponible au début de la première période du calendrier scolaire.'
                    : !canModifyScores ? 'Ces cotes ne peuvent plus être modifiées dans l\'état actuel du workflow.' : undefined}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    saveSuccess
                      ? 'bg-emerald-600'
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                  }`}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" /> Enregistré !
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> Enregistrer
                    </>
                  )}
                </button>

                {canSubmit && (
                  <button
                    onClick={() => handleSaveGrades('SOUMIS')}
                    disabled={saving || selectedSubjectId === 'ALL'}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" /> Soumettre au titulaire
                  </button>
                )}

                {canValidateTitulaire && (
                  <button
                    onClick={() => handleWorkflowAction('VALIDE_TITULAIRE')}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Valider (titulaire)
                  </button>
                )}

                {canRejectTitulaire && (
                  <button
                    onClick={() => handleWorkflowAction('REJETE_TITULAIRE')}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Rejeter
                  </button>
                )}

                {canValidateDE && (
                  <button
                    onClick={() => handleWorkflowAction('VALIDE_DE')}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Valider définitivement (DE)
                  </button>
                )}

                {canRejectDE && (
                  <button
                    onClick={() => handleWorkflowAction('REJETE_DE')}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Rejeter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* INDICATEURS DE PERFORMANCE DE LA SALLE */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Effectif Salle</p>
                <p className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{stats.totalCount} élèves</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Élèves Cotés</p>
                <p className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{stats.ratedCount} / {stats.totalCount}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Moyenne Classe</p>
                <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.average} / {maxAnnuel}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Taux Réussite</p>
                <p className="text-base font-black font-mono text-purple-600 dark:text-purple-400">{stats.successRate}%</p>
              </div>
            </div>
          </div>

          {/* TABLEAU RÉPARTITION ET SAISIE DES COTES */}
          <div
            className="rounded-2xl border overflow-hidden shadow-xs"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
              <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                Fiche de Cotation · {currentClassObj?.nom || 'Classe'} · {selectedSalle !== 'ALL' ? `Salle: ${selectedSalle}` : 'Toutes les salles'} · {currentSubject?.nom || 'Aucun cours sélectionné'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {activePeriodCodes.some(code => !isPeriodOpen(code)) && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    Périodes futures verrouillées selon le calendrier
                  </span>
                )}
                <span className="text-xs text-slate-400 font-medium">
                  Saisie avec validation <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-white font-mono text-[10px]">Entrée</kbd>
                </span>
              </div>
            </div>

            {selectedSubjectId === 'ALL' ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                Sélectionnez un cours / une discipline (étape 4) pour afficher la fiche de cotation complète.
              </div>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {isMaternelle ? (
                    <tr className="border-b text-[10px] font-black uppercase text-slate-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                      <th className="p-2 w-10 text-center align-bottom">N°</th>
                      <th className="p-2 min-w-[180px] align-bottom">Élève (Nom &amp; Prénoms)</th>
                      <th className="p-2 w-20 text-center border-x bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" style={{ borderColor: 'var(--border)' }}>T1 <span className="font-mono text-slate-400">/{maxScoreForPeriod('T1')}</span></th>
                      <th className="p-2 w-20 text-center bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">T2 <span className="font-mono text-slate-400">/{maxScoreForPeriod('T2')}</span></th>
                      <th className="p-2 w-20 text-center bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">T3 <span className="font-mono text-slate-400">/{maxScoreForPeriod('T3')}</span></th>
                      <th className="p-2 w-16 text-center align-bottom bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">T.GE</th>
                      <th className="p-2 w-24 text-center align-bottom">Mention</th>
                      <th className="p-2 min-w-[140px] align-bottom">Observations</th>
                    </tr>
                  ) : (
                  <>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                    <th rowSpan={2} className="p-2 w-10 text-center align-bottom">N°</th>
                    <th rowSpan={2} className="p-2 min-w-[180px] align-bottom">Élève (Nom &amp; Prénoms)</th>
                    <th colSpan={3} className="p-2 text-center border-x bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" style={{ borderColor: 'var(--border)' }}>1er Semestre</th>
                    <th rowSpan={2} className="p-2 w-16 text-center align-bottom bg-indigo-500/20 text-indigo-800 dark:text-indigo-200">T.S1</th>
                    <th colSpan={3} className="p-2 text-center border-x bg-violet-500/10 text-violet-700 dark:text-violet-300" style={{ borderColor: 'var(--border)' }}>2ème Semestre</th>
                    <th rowSpan={2} className="p-2 w-16 text-center align-bottom bg-violet-500/20 text-violet-800 dark:text-violet-200">T.S2</th>
                    <th rowSpan={2} className="p-2 w-16 text-center align-bottom bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">T.GE</th>
                    <th rowSpan={2} className="p-2 w-24 text-center align-bottom">Mention</th>
                    <th rowSpan={2} className="p-2 min-w-[140px] align-bottom">Observations</th>
                  </tr>
                  <tr className="border-b text-[10px] font-black uppercase text-slate-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                    <th className="p-2 w-16 text-center border-x" style={{ borderColor: 'var(--border)' }}>P1 <span className="font-mono text-slate-400">/{maxScoreForPeriod('P1')}</span></th>
                    <th className="p-2 w-16 text-center">P2 <span className="font-mono text-slate-400">/{maxScoreForPeriod('P2')}</span></th>
                    <th className="p-2 w-16 text-center">Exam <span className="font-mono text-slate-400">/{maxScoreForPeriod('EX1')}</span></th>
                    <th className="p-2 w-16 text-center border-x" style={{ borderColor: 'var(--border)' }}>P3 <span className="font-mono text-slate-400">/{maxScoreForPeriod('P3')}</span></th>
                    <th className="p-2 w-16 text-center">P4 <span className="font-mono text-slate-400">/{maxScoreForPeriod('P4')}</span></th>
                    <th className="p-2 w-16 text-center">Exam <span className="font-mono text-slate-400">/{maxScoreForPeriod('EX2')}</span></th>
                  </tr>
                  </>
                  )}
                </thead>
                <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border)' }}>
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-slate-400">
                        Aucun élève trouvé pour la salle et le filtre sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student, index) => {
                      const totals = getStudentTotals(student.id);
                      const pct = maxAnnuel > 0 && totals.tge !== undefined ? (totals.tge / maxAnnuel) * 100 : 0;
                      const mention = totals.tge !== undefined ? getMention(pct) : null;
                      const absoluteIndex = (studentsPagination.page - 1) * studentsPagination.pageSize + index + 1;

                      const renderScoreCell = (periodCode: string, value: number | undefined, borderX?: boolean) => (
                        <td className={`p-1 text-center ${borderX ? 'border-x' : ''}`} style={borderX ? { borderColor: 'var(--border)' } : undefined}>
                          <NumberInput
                            value={value !== undefined ? value : 0}
                            onChange={v => handleScoreInput(periodCode, student.id, v)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]'));
                                const currentIndex = inputs.indexOf(e.currentTarget);
                                if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
                                  inputs[currentIndex + 1].focus();
                                  inputs[currentIndex + 1].select();
                                }
                              }
                            }}
                            min={0}
                            max={maxScoreForPeriod(periodCode)}
                            disabled={!canModifyScores || !isPeriodOpen(periodCode)}
                            title={!isPeriodOpen(periodCode) && periodStartDates[periodCode]
                              ? `Saisie disponible à partir du ${periodStartDates[periodCode]!.toLocaleDateString('fr-CD')}`
                              : undefined}
                            placeholder="0"
                            className={`w-14 text-center py-1 rounded-lg border text-xs font-black font-mono bg-white dark:bg-slate-900 shadow-2xs ${!canModifyScores || !isPeriodOpen(periodCode) ? 'opacity-45 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''}`}
                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                        </td>
                      );

                      return (
                        <tr key={student.id} className="hover:bg-slate-500/5 transition-colors">
                          {/* N° */}
                          <td className="p-2 text-center font-mono font-bold text-slate-400">{absoluteIndex}</td>

                          {/* NOM & PRÉNOMS */}
                          <td className="p-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                                {student.prenom[0]}{student.nom[0]}
                              </div>
                              <div className="truncate">
                                <div>{student.nom} {student.postnom} {student.prenom}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{student.registrationNumber}</div>
                              </div>
                            </div>
                          </td>

                          {isMaternelle ? (
                            <>
                              {renderScoreCell('T1', (totals as any).t1, true)}
                              {renderScoreCell('T2', (totals as any).t2)}
                              {renderScoreCell('T3', (totals as any).t3)}
                            </>
                          ) : (
                            <>
                              {/* SEMESTRE 1 : P1, P2, EX1 */}
                              {renderScoreCell('P1', (totals as any).p1, true)}
                              {renderScoreCell('P2', (totals as any).p2)}
                              {renderScoreCell('EX1', (totals as any).ex1)}

                              {/* T.S1 */}
                              <td className="p-2 text-center font-mono font-black bg-indigo-500/5 text-indigo-700 dark:text-indigo-300">
                                {(totals as any).ts1 !== undefined ? (totals as any).ts1.toFixed(1) : '-'}
                              </td>

                              {/* SEMESTRE 2 : P3, P4, EX2 */}
                              {renderScoreCell('P3', (totals as any).p3, true)}
                              {renderScoreCell('P4', (totals as any).p4)}
                              {renderScoreCell('EX2', (totals as any).ex2)}

                              {/* T.S2 */}
                              <td className="p-2 text-center font-mono font-black bg-violet-500/5 text-violet-700 dark:text-violet-300">
                                {(totals as any).ts2 !== undefined ? (totals as any).ts2.toFixed(1) : '-'}
                              </td>
                            </>
                          )}

                          {/* T.GE */}
                          <td className="p-2 text-center font-mono font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            {totals.tge !== undefined ? totals.tge.toFixed(1) : '-'}
                          </td>

                          {/* MENTION */}
                          <td className="p-2 text-center">
                            {mention ? (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${mention.color}`}>
                                {mention.code}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </td>

                          {/* REMARQUES */}
                          <td className="p-1">
                            <input
                              type="text"
                              placeholder="Observation..."
                              value={remarksMap[student.id] || ''}
                              onChange={(e) => setRemarksMap({ ...remarksMap, [student.id]: e.target.value })}
                              className="w-full px-2 py-1 rounded-lg border text-xs bg-slate-500/10 focus:outline-none"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            )}

            {/* PAGINATION ÉLÈVES */}
            <Pagination
              currentPage={studentsPagination.page}
              totalPages={studentsPagination.totalPages}
              total={studentsPagination.total}
              pageSize={studentsPagination.pageSize}
              start={studentsPagination.start}
              end={studentsPagination.end}
              onPageChange={studentsPagination.setPage}
              onPageSizeChange={studentsPagination.setPageSize}
            />
          </div>
        </div>
      )}

      {/* ================= ONGLET BULLETINS EPST RDC ================= */}
      {activeTab === 'bulletins' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl shadow-xs space-y-4" style={{ background: 'var(--bg-surface)' }}>
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Bulletins scolaires officiels</h3>
                </div>
                <p className="text-xs text-slate-400">Sélectionnez le contexte, contrôlez les résultats puis ouvrez le bulletin de l’élève.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[520px]">
                <div>
                  <label className="block mb-1 text-[11px] font-bold text-slate-500">1. Cycle scolaire</label>
                  <CustomSelect value={selectedCycle} onChange={setSelectedCycle} options={CYCLES_LIST} />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-bold text-slate-500">2. Classe / promotion</label>
                  <CustomSelect
                    value={selectedClassId}
                    onChange={setSelectedClassId}
                    options={filteredClasses.map(c => ({ value: c.id, label: `${c.nom} (${c.cycleId || 'EPST'})` }))}
                    placeholder="Sélectionner une classe..."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Élèves', value: bulletinStats.total, icon: Users, tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
                { label: 'Bulletins calculés', value: `${bulletinStats.completed}/${bulletinStats.total}`, icon: FileText, tone: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
                { label: 'Moyenne de classe', value: `${bulletinStats.average.toFixed(1)}%`, icon: BarChart3, tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                { label: 'Taux de réussite', value: `${bulletinStats.successRate.toFixed(1)}%`, icon: TrendingUp, tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
              ].map(({ label, value, icon: StatIcon, tone }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--bg-sunken)' }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}>
                    <StatIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 truncate">{label}</p>
                    <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou matricule..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-9 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-indigo-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-400">{filteredBulletinRows.length} élève{filteredBulletinRows.length > 1 ? 's' : ''} affiché{filteredBulletinRows.length > 1 ? 's' : ''}</p>
            </div>

            <div className="overflow-x-auto rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-black uppercase text-slate-500" style={{ background: 'var(--bg-sunken)' }}>
                    <th className="p-3 w-16 text-center">Rang</th>
                    <th className="p-3 min-w-[220px]">Élève</th>
                    <th className="p-3 w-36">Matricule</th>
                    <th className="p-3 w-36 text-center">Résultat annuel</th>
                    <th className="p-3 w-32 text-center">Mention</th>
                    <th className="p-3 w-36 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border)' }}>
                  {filteredBulletinRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        {searchQuery ? 'Aucun élève ne correspond à la recherche.' : 'Aucun élève dans cette classe.'}
                      </td>
                    </tr>
                  ) : filteredBulletinRows.map(({ student, summary, rang }) => {
                    const mention = getMention(summary.pct);
                    return (
                      <tr key={student.id} className="hover:bg-indigo-500/5 transition-colors">
                        <td className="p-3 text-center font-mono font-black text-slate-500">{rang ? `${rang}${rang === 1 ? 'er' : 'ème'}` : '—'}</td>
                        <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                              {student.prenom[0]}{student.nom[0]}
                            </div>
                            <div className="truncate">{student.nom} {student.postnom} {student.prenom}</div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">{student.registrationNumber || '—'}</td>
                        <td className="p-3 text-center">
                          <p className="font-mono font-black text-indigo-600 dark:text-indigo-400">{summary.matieresNotees > 0 ? `${summary.pct.toFixed(1)}%` : '—'}</p>
                          <p className="text-[10px] text-slate-400">{summary.matieresNotees > 0 ? `${summary.totalObtenu.toFixed(1)} / ${summary.totalMax} pts` : 'Non calculé'}</p>
                        </td>
                        <td className="p-3 text-center">
                          {summary.matieresNotees > 0 ? <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black ${mention.color}`}>{mention.label}</span> : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => { setSelectedStudentForBulletin(student); setBulletinModalOpen(true); }}
                            disabled={summary.matieresNotees === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <FileText className="w-3.5 h-3.5" /> Ouvrir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'IMPRESSION PROCES-VERBAL */}
      {printableModalOpen && (
        <PrintableGradeSheetModal
          isOpen={printableModalOpen}
          onClose={() => setPrintableModalOpen(false)}
          className={currentClassObj?.nom || 'Classe'}
          disciplineName={currentSubject?.nom || 'Sélectionnez un cours'}
          students={classStudents}
          fullGradesMap={Object.fromEntries(
            classStudents.map(st => [
              st.id,
              activePeriodCodes.reduce((acc, code) => {
                const v = scoresByPeriod[code]?.[st.id];
                if (v !== undefined) acc[code] = v;
                return acc;
              }, {} as Record<string, number>),
            ])
          )}
          maxima={{
            P1: maxScoreForPeriod('P1'),
            P2: maxScoreForPeriod('P2'),
            EX1: maxScoreForPeriod('EX1'),
            P3: maxScoreForPeriod('P3'),
            P4: maxScoreForPeriod('P4'),
            EX2: maxScoreForPeriod('EX2'),
          }}
        />
      )}

      {/* MODALE GESTIONNAIRE D'ÉPREUVES */}
      {epreuvesModalOpen && (
        <EpreuvesManagerModal
          isOpen={epreuvesModalOpen}
          onClose={() => setEpreuvesModalOpen(false)}
          epreuves={epreuvesList}
          onSaveEpreuves={(newList) => setEpreuvesList(newList)}
          selectedClassName={currentClassObj?.nom || 'Classe'}
          selectedDisciplineName={currentSubject?.nom || 'Matière'}
        />
      )}

      {/* MODALE BULLETIN CTBE / EPST RDC */}
      {bulletinModalOpen && selectedStudentForBulletin && (
        <BulletinCTBEModal
          isOpen={bulletinModalOpen}
          onClose={() => setBulletinModalOpen(false)}
          student={selectedStudentForBulletin}
        />
      )}
    </div>
  );
};
