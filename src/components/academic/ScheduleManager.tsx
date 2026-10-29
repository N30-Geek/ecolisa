import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Edit3,
  Trash2,
  Printer,
  Download,
  Users,
  BookOpen,
  Filter,
  CheckCircle2,
  X,
  Sparkles,
  Layers,
  Sun,
  Sunset,
  Moon,
  Settings,
  Coffee,
  School,
  GraduationCap,
  Award,
  Zap,
  MapPin,
  User,
  ArrowUpDown,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { ClasseScolaire, Discipline, MembrePersonnel, ScheduleSlot, HoraireCreneau, RôleSystème } from '../../types';
import { UserSession } from '../../services/localDatabase';
import { CustomSelect } from '../common/CustomSelect';
import { normalizeNiveau, getCoursesForContext } from '../../data/referentielEpstData';
import {
  getAvailableSubjectsForContext,
  getMissingEpstCoursesForContext,
  getAllowedOptionsForClass,
  isTeacherAllowedForSubject,
  dedupeClassesByName,
} from '../../utils/academicContext';
import { ScheduleExportModal } from './ScheduleExportModal';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// ── MODÈLES OFFICIELS RDC ───────────────────────────────────────────────

// Secondaire / CTEB / Humanités : 6 heures de 45 min avec UNE SEULE pause
const SLOTS_MATIN_SECOND: HoraireCreneau[] = [
  { id: 'sec-m1', debut: '07:30', fin: '08:15', label: '1ère Heure (07h30 - 08h15)' },
  { id: 'sec-m2', debut: '08:15', fin: '09:00', label: '2ème Heure (08h15 - 09h00)' },
  { id: 'sec-m3', debut: '09:00', fin: '09:45', label: '3ème Heure (09h00 - 09h45)' },
  { id: 'sec-m-b1', debut: '09:45', fin: '10:00', label: '🔔 Récréation (09h45 - 10h00)', isBreak: true, breakType: 'PAUSE_1' },
  { id: 'sec-m4', debut: '10:00', fin: '10:45', label: '4ème Heure (10h00 - 10h45)' },
  { id: 'sec-m5', debut: '10:45', fin: '11:30', label: '5ème Heure (10h45 - 11h30)' },
  { id: 'sec-m6', debut: '11:30', fin: '12:15', label: '6ème Heure (11h30 - 12h15)' },
];

const SLOTS_APRES_MIDI_SECOND: HoraireCreneau[] = [
  { id: 'sec-a1', debut: '12:30', fin: '13:15', label: '1ère Heure (12h30 - 13h15)' },
  { id: 'sec-a2', debut: '13:15', fin: '14:00', label: '2ème Heure (13h15 - 14h00)' },
  { id: 'sec-a3', debut: '14:00', fin: '14:45', label: '3ème Heure (14h00 - 14h45)' },
  { id: 'sec-a-b1', debut: '14:45', fin: '15:00', label: '🔔 Récréation (14h45 - 15h00)', isBreak: true, breakType: 'PAUSE_1' },
  { id: 'sec-a4', debut: '15:00', fin: '15:45', label: '4ème Heure (15h00 - 15h45)' },
  { id: 'sec-a5', debut: '15:45', fin: '16:30', label: '5ème Heure (15h45 - 16h30)' },
  { id: 'sec-a6', debut: '16:30', fin: '17:15', label: '6ème Heure (16h30 - 17h15)' },
];

// Primaire : 8h00 - 12h15 avec DEUX pauses (5 heures de 45 min)
const SLOTS_PRIMAIRE: HoraireCreneau[] = [
  { id: 'prim-1', debut: '08:00', fin: '08:45', label: '1ère Heure (08h00 - 08h45)' },
  { id: 'prim-2', debut: '08:45', fin: '09:30', label: '2ème Heure (08h45 - 09h30)' },
  { id: 'prim-b1', debut: '09:30', fin: '09:45', label: '☕ 1ère Pause (09h30 - 09h45)', isBreak: true, breakType: 'PAUSE_1' },
  { id: 'prim-3', debut: '09:45', fin: '10:30', label: '3ème Heure (09h45 - 10h30)' },
  { id: 'prim-4', debut: '10:30', fin: '11:15', label: '4ème Heure (10h30 - 11h15)' },
  { id: 'prim-b2', debut: '11:15', fin: '11:30', label: '🎈 2ème Pause (11h15 - 11h30)', isBreak: true, breakType: 'PAUSE_2' },
  { id: 'prim-5', debut: '11:30', fin: '12:15', label: '5ème Heure (11h30 - 12h15)' },
];

// Maternelle : 8h00 ou 9h00 avec TROIS pauses, activités de 30 min
const SLOTS_MATERNELLE: HoraireCreneau[] = [
  { id: 'mat-1', debut: '08:00', fin: '08:30', label: '1ère Activité (08h00 - 08h30)' },
  { id: 'mat-2', debut: '08:30', fin: '09:00', label: '2ème Activité (08h30 - 09h00)' },
  { id: 'mat-b1', debut: '09:00', fin: '09:15', label: '☕ 1ère Pause - Goûter (09h00 - 09h15)', isBreak: true, breakType: 'PAUSE_1' },
  { id: 'mat-3', debut: '09:15', fin: '09:45', label: '3ème Activité (09h15 - 09h45)' },
  { id: 'mat-b2', debut: '09:45', fin: '10:15', label: '🎈 2ème Pause - Jeux (09h45 - 10h15)', isBreak: true, breakType: 'PAUSE_2' },
  { id: 'mat-4', debut: '10:15', fin: '10:45', label: '4ème Activité (10h15 - 10h45)' },
  { id: 'mat-b3', debut: '10:45', fin: '11:00', label: '🍼 3ème Pause - Repos (10h45 - 11h00)', isBreak: true, breakType: 'PAUSE_3' },
  { id: 'mat-5', debut: '11:00', fin: '11:30', label: '5ème Activité / Conte (11h00 - 11h30)' },
];

const SLOTS_MATERNELLE_9H: HoraireCreneau[] = [
  { id: 'mat9-1', debut: '09:00', fin: '09:30', label: '1ère Activité (09h00 - 09h30)' },
  { id: 'mat9-2', debut: '09:30', fin: '10:00', label: '2ème Activité (09h30 - 10h00)' },
  { id: 'mat9-b1', debut: '10:00', fin: '10:15', label: '☕ 1ère Pause - Goûter (10h00 - 10h15)', isBreak: true, breakType: 'PAUSE_1' },
  { id: 'mat9-3', debut: '10:15', fin: '10:45', label: '3ème Activité (10h15 - 10h45)' },
  { id: 'mat9-b2', debut: '10:45', fin: '11:15', label: '🎈 2ème Pause - Jeux (10h45 - 11h15)', isBreak: true, breakType: 'PAUSE_2' },
  { id: 'mat9-4', debut: '11:15', fin: '11:45', label: '4ème Activité (11h15 - 11h45)' },
  { id: 'mat9-b3', debut: '11:45', fin: '12:00', label: '🍼 3ème Pause - Repos (11h45 - 12h00)', isBreak: true, breakType: 'PAUSE_3' },
  { id: 'mat9-5', debut: '12:00', fin: '12:30', label: '5ème Activité / Conte (12h00 - 12h30)' },
];

// Alias généraux conservés pour compatibilité (secondaire par défaut)
const SLOTS_MATIN = SLOTS_MATIN_SECOND;
const SLOTS_APRES_MIDI = SLOTS_APRES_MIDI_SECOND;

interface ScheduleManagerProps {
  activeSchoolYear?: string;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({ activeSchoolYear }) => {
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [teachers, setTeachers] = useState<MembrePersonnel[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [currentStaff, setCurrentStaff] = useState<MembrePersonnel | null>(null);
  const [loading, setLoading] = useState(true);

  // ── MODES DE FILTRAGE AVANCÉS ──
  // Mode d'affichage principal : CLASS (Par Classe), TEACHER (Par Enseignant), ROOM (Par Salle), SUBJECT (Par Matière)
  const [viewMode, setViewMode] = useState<'CLASS' | 'TEACHER' | 'ROOM' | 'SUBJECT'>('CLASS');

  // Filtres
  const [vacation, setVacation] = useState<'MATIN' | 'APRES_MIDI' | 'SOIR' | 'SUR_MESURE'>('MATIN');
  const [selectedCycle, setSelectedCycle] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedRoomName, setSelectedRoomName] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedDay, setSelectedDay] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tranches Horaires Actives pour la Vacation choisie (Totalement modifiables par l'utilisateur)
  const [customTimeSlots, setCustomTimeSlots] = useState<Record<string, HoraireCreneau[]>>({
    MATIN: SLOTS_MATIN,
    APRES_MIDI: SLOTS_APRES_MIDI,
    SOIR: SLOTS_APRES_MIDI,
    SUR_MESURE: SLOTS_MATERNELLE,
  });

  const seededContexts = useRef(new Set<string>());

  const isTeacher = currentUser?.role === 'ENSEIGNANT' || currentUser?.role === 'TITULAIRE';
  const isReadOnly = isTeacher;

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);

  const [formData, setFormData] = useState({
    jour: 'Lundi' as any,
    heureDebut: '07:30',
    heureFin: '08:20',
    classeId: '',
    matiereId: '',
    professeurId: '',
    salle: '',
  });

  // Pour la modale d'ajout/édition d'une tranche horaire sur mesure
  const [editingTimeSlotId, setEditingTimeSlotId] = useState<string | null>(null);
  const [newSlotTime, setNewSlotTime] = useState({
    debut: '07:30',
    fin: '08:20',
    label: '',
    isBreak: false,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const user = LocalDatabaseService.getCurrentUser();
      setCurrentUser(user);

      const [cls, subs, stf, userAssigned, savedSlots, savedTimeSlots] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getCurrentUserAssignedClasses(),
        LocalDatabaseService.getSchedules({ schoolYearId: activeSchoolYear }),
        LocalDatabaseService.getScheduleTimeSlots({ schoolYearId: activeSchoolYear }),
      ]);

      // Identifier le staff connecté
      let staff: MembrePersonnel | null = null;
      if (user) {
        const userFullName = (user.nom || '').toLowerCase().trim();
        staff = (stf || []).find((s: MembrePersonnel) =>
          (s.email && s.email.toLowerCase() === user.email?.toLowerCase()) ||
          (userFullName &&
            (userFullName === `${(s.prenom || '').toLowerCase().trim()} ${(s.nom || '').toLowerCase().trim()}`.trim() ||
             userFullName === (s.nom || '').toLowerCase().trim()))
        ) || null;
      }
      setCurrentStaff(staff);

      let filteredCls = cls || [];
      if (userAssigned !== null) {
        filteredCls = (cls || []).filter(c =>
          userAssigned.some(ac =>
            ac.toLowerCase().trim() === c.nom.toLowerCase().trim() ||
            c.nom.toLowerCase().includes(ac.toLowerCase().trim()) ||
            ac.toLowerCase().includes(c.nom.toLowerCase().trim())
          )
        );
      }

      setClasses(dedupeClassesByName(filteredCls));
      setSubjects(subs || []);
      setTeachers(stf || []);

      // Enseignant connecté : ne voit que SON emploi du temps
      const isTeacher = user?.role === 'ENSEIGNANT' || user?.role === 'TITULAIRE';
      if (isTeacher && staff) {
        setViewMode('TEACHER');
        setSelectedTeacherId(staff.id);
        setSlots((savedSlots || []).filter(s =>
          s.professeurId === staff.id ||
          (s.nomProfesseur || '').toLowerCase().includes((staff.nom || '').toLowerCase())
        ));
      } else {
        setSlots(savedSlots || []);
      }

      // Default time slots if none saved
      const grouped: Record<string, HoraireCreneau[]> = {
        MATIN: SLOTS_MATIN,
        APRES_MIDI: SLOTS_APRES_MIDI,
        SOIR: SLOTS_APRES_MIDI,
        SUR_MESURE: SLOTS_MATERNELLE,
      };
      if (savedTimeSlots && savedTimeSlots.length > 0) {
        for (const ts of savedTimeSlots) {
          if (!ts.vacation) continue;
          if (!grouped[ts.vacation]) grouped[ts.vacation] = [];
          grouped[ts.vacation].push(ts);
        }
      }
      setCustomTimeSlots(grouped);

      if (filteredCls.length > 0) {
        setSelectedClassId(prev => (prev && filteredCls.some(c => c.id === prev) ? prev : filteredCls[0].id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolYear]);

  // FILTRAGE DES CLASSES PAR CYCLE
  const filteredClasses = useMemo(() => {
    if (selectedCycle === 'ALL') return classes;
    return classes.filter(c => c.cycleId === selectedCycle || c.nom.toUpperCase().includes(selectedCycle));
  }, [classes, selectedCycle]);

  // AUTO-SELECTION DE LA 1ÈRE CLASSE
  useEffect(() => {
    if (filteredClasses.length > 0) {
      const isValid = filteredClasses.some(c => c.id === selectedClassId);
      if (!isValid) {
        setSelectedClassId(filteredClasses[0].id);
      }
    }
  }, [filteredClasses]);

  const currentClassObj = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const modalClassObj = useMemo(() => classes.find(c => c.id === (formData.classeId || selectedClassId)), [classes, formData.classeId, selectedClassId]);

  // Matières filtrées selon le contexte (classe / option / cycle)
  const availableModalSubjects = useMemo(() => {
    if (!modalClassObj) return subjects;
    return getAvailableSubjectsForContext(
      subjects,
      modalClassObj,
      modalClassObj.optionCode || 'TRONC_COMMUN',
      null,
      classes
    );
  }, [subjects, modalClassObj, classes]);

  // Auto-chargement des cours EPST si aucun n'est disponible pour cette classe / option
  useEffect(() => {
    if (!modalClassObj || availableModalSubjects.length > 0) return;
    const classCycle = modalClassObj.cycleId;
    const activeOption = (classCycle || '').toUpperCase() === 'HUMANITES'
      ? (modalClassObj.optionCode || 'TRONC_COMMUN')
      : (modalClassObj.optionCode || 'TRONC_COMMUN');

    const key = `${classCycle}-${activeOption}-${normalizeNiveau(modalClassObj.nom) || ''}`;
    if (seededContexts.current.has(key)) return;

    const missing = getMissingEpstCoursesForContext(subjects, modalClassObj, activeOption);
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
          } as any);
        }
        seededContexts.current.add(key);
        const fresh = await LocalDatabaseService.getSubjects();
        setSubjects(fresh || []);
      } catch (err) {
        console.error('[ScheduleManager] Erreur auto-chargement EPST :', err);
      }
    })();
  }, [modalClassObj, availableModalSubjects, subjects]);

  // Enseignants pertinents selon la classe et/ou matière sélectionnées
  const relevantTeachers = useMemo(() => {
    const selectedSub = subjects.find(s => s.id === formData.matiereId);
    const targetCl = modalClassObj || classes[0];

    if (selectedSub && targetCl) {
      if (selectedSub.enseignantId) {
        const assigned = teachers.find(t => t.id === selectedSub.enseignantId);
        return assigned ? [assigned] : teachers;
      }
      return teachers.filter(t => isTeacherAllowedForSubject(t, selectedSub, targetCl, classes));
    }

    if (targetCl) {
      const className = (targetCl.nom || '').toLowerCase();
      return teachers.filter(t =>
        (t.coursAttribues || []).some(c => c.toLowerCase().includes(className) || className.includes(c.toLowerCase())) ||
        (t.classesAssignees || []).some(c => c.toLowerCase().includes(className) || className.includes(c.toLowerCase())) ||
        (t.classesTitularisees || []).some(c => c.toLowerCase().includes(className) || className.includes(c.toLowerCase())) ||
        (t.classeTitulaireId || '').toLowerCase().includes(className) || className.includes((t.classeTitulaireId || '').toLowerCase()) ||
        (t.disciplines || []).some(d => targetCl.nom?.toLowerCase().includes(d.toLowerCase()))
      );
    }

    return teachers;
  }, [teachers, subjects, formData.matiereId, modalClassObj, classes]);

  // Salles physiques uniques disponibles
  const availableRooms = useMemo(() => {
    const roomSet = new Set<string>();
    classes.forEach(c => {
      if (c.salle) roomSet.add(c.salle);
      if (c.salles) c.salles.forEach(s => roomSet.add(s));
    });
    slots.forEach(s => {
      if (s.salle) roomSet.add(s.salle);
    });
    return Array.from(roomSet);
  }, [classes, slots]);

  // Obtenir la liste des tranches horaires pour la vacation actuelle (triées chronologiquement)
  const activeTimeSlots = useMemo(() => {
    const currentList = customTimeSlots[vacation] || SLOTS_MATIN;
    return [...currentList].sort((a, b) => a.debut.localeCompare(b.debut));
  }, [customTimeSlots, vacation]);

  // ── FILTRAGE AVANCÉ DES CRÉNEAUX SELON LE MODE ET LES RECHERCHES ──
  const classSlots = useMemo(() => {
    return slots.filter(s => {
      if (s.vacation !== vacation) return false;

      // Filtre selon le mode de vue principal
      if (viewMode === 'CLASS' && selectedClassId && s.classeId !== selectedClassId) {
        return false;
      }
      if (viewMode === 'TEACHER' && selectedTeacherId !== 'ALL' && s.professeurId !== selectedTeacherId) {
        return false;
      }
      if (viewMode === 'ROOM' && selectedRoomName !== 'ALL' && s.salle !== selectedRoomName) {
        return false;
      }
      if (viewMode === 'SUBJECT' && selectedSubjectId !== 'ALL' && s.matiereId !== selectedSubjectId) {
        return false;
      }

      // Filtre Recherche textuelle globale
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          s.nomMatiere.toLowerCase().includes(q) ||
          s.nomProfesseur.toLowerCase().includes(q) ||
          s.nomClasse.toLowerCase().includes(q) ||
          s.salle.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [slots, vacation, viewMode, selectedClassId, selectedTeacherId, selectedRoomName, selectedSubjectId, searchQuery]);

  // STATISTIQUES DE L'EMPLOI DU TEMPS
  const scheduleStats = useMemo(() => {
    const totalSlots = classSlots.length;
    const courseHours = classSlots.length * 0.85; // Heures de cours effectives
    const uniqueSubjects = new Set(classSlots.map(s => s.matiereId)).size;
    const uniqueTeachers = new Set(classSlots.map(s => s.professeurId).filter(Boolean)).size;

    return {
      totalSlots,
      courseHours: Math.round(courseHours * 10) / 10,
      uniqueSubjects,
      uniqueTeachers,
    };
  }, [classSlots]);

  // OUVRIR LA MODALE SUR UNE CELLULE SPÉCIFIQUE
  const handleOpenAddForCell = (day: string, timeStart: string, timeEnd: string) => {
    setEditingSlot(null);
    const targetCl = currentClassObj || classes[0];
    setFormData({
      jour: day as any,
      heureDebut: timeStart,
      heureFin: timeEnd,
      classeId: targetCl?.id || '',
      matiereId: '',
      professeurId: '',
      salle: targetCl?.salle || 'Salle B-06',
    });
    setShowModal(true);
  };

  const autoPickTeacherForSubject = (subject: Discipline | undefined, targetClass: ClasseScolaire | undefined) => {
    if (!subject) return '';
    if (subject.enseignantId) return subject.enseignantId;
    const className = (targetClass?.nom || '').toLowerCase();
    const subName = subject.nom.toLowerCase();
    const found = teachers.find(t =>
      (t.id === subject.enseignantId) ||
      (t.disciplines || []).some(d => d.toLowerCase().includes(subName) || subName.includes(d.toLowerCase())) ||
      (t.coursAttribues || []).some(c => c.toLowerCase().includes(subName) || subName.includes(c.toLowerCase()))
    );
    if (found) return found.id;
    return '';
  };

  const handleMatiereChange = (matiereId: string) => {
    const selectedSub = subjects.find(s => s.id === matiereId);
    const targetCl = classes.find(c => c.id === (formData.classeId || selectedClassId)) || classes[0];
    const autoProfId = autoPickTeacherForSubject(selectedSub, targetCl);
    setFormData(prev => ({
      ...prev,
      matiereId,
      professeurId: autoProfId || prev.professeurId,
      salle: prev.salle || targetCl?.salle || currentClassObj?.salle || 'Salle B-06',
    }));
  };

  const handleOpenAdd = () => {
    const firstCourseTime = activeTimeSlots.find(t => !t.isBreak) || activeTimeSlots[0];
    handleOpenAddForCell('Lundi', firstCourseTime?.debut || '07:30', firstCourseTime?.fin || '08:20');
  };

  const handleSaveSlot = async () => {
    if (!formData.classeId && viewMode === 'CLASS') return alert('Veuillez choisir une classe.');
    const targetClassId = formData.classeId || selectedClassId || (classes[0]?.id || 'cls-1');
    const targetClassName = classes.find(c => c.id === targetClassId)?.nom || 'Classe';

    const selectedSub = subjects.find(s => s.id === formData.matiereId);
    const selectedProf = teachers.find(t => t.id === formData.professeurId);

    const newSlot: ScheduleSlot = {
      id: editingSlot ? editingSlot.id : uuid(),
      schoolYearId: activeSchoolYear,
      classeId: targetClassId,
      nomClasse: targetClassName,
      vacation: vacation,
      jour: formData.jour,
      heureDebut: formData.heureDebut,
      heureFin: formData.heureFin,
      matiereId: formData.matiereId,
      nomMatiere: selectedSub?.nom || 'Discipline',
      professeurId: formData.professeurId,
      nomProfesseur: selectedProf ? `${selectedProf.prenom} ${selectedProf.nom}` : 'Enseignant',
      salle: formData.salle || modalClassObj?.salle || currentClassObj?.salle || 'Salle principale',
      couleurBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300',
    };

    try {
      const saved = await LocalDatabaseService.addSchedule(newSlot);
      if (saved) {
        if (editingSlot) {
          setSlots(slots.map(s => s.id === editingSlot.id ? saved : s));
        } else {
          setSlots([...slots, saved]);
        }
      }
    } catch (e) {
      console.error('[ScheduleManager] Erreur sauvegarde créneau :', e);
      alert('Erreur lors de la sauvegarde du créneau.');
      return;
    }
    setShowModal(false);
  };

  const handleDeleteSlot = async (id: string) => {
    if (!window.confirm('Supprimer ce créneau d\'emploi du temps ?')) return;
    try {
      await LocalDatabaseService.deleteSchedule(id);
      setSlots(slots.filter(s => s.id !== id));
    } catch (e) {
      console.error('[ScheduleManager] Erreur suppression créneau :', e);
      alert('Erreur lors de la suppression.');
    }
  };

  // AJOUTER OU MODIFIER UNE TRANCHE HORAIRE / PAUSE SOIS-MÊME
  const handleSaveCustomTimeSlot = async () => {
    if (!newSlotTime.debut || !newSlotTime.fin) return alert('Veuillez entrer l\'heure de début et de fin.');
    const labelText = newSlotTime.label || (newSlotTime.isBreak ? `☕ Pause (${newSlotTime.debut} - ${newSlotTime.fin})` : `Heure (${newSlotTime.debut} - ${newSlotTime.fin})`);

    const updated: HoraireCreneau = {
      id: editingTimeSlotId || uuid(),
      schoolYearId: activeSchoolYear,
      vacation,
      debut: newSlotTime.debut,
      fin: newSlotTime.fin,
      label: labelText,
      isBreak: newSlotTime.isBreak,
      breakType: newSlotTime.isBreak ? 'PAUSE_1' : undefined,
      ordre: 0,
    };

    try {
      await LocalDatabaseService.addScheduleTimeSlot(updated);
      if (editingTimeSlotId) {
        setCustomTimeSlots(prev => ({
          ...prev,
          [vacation]: (prev[vacation] || []).map(t =>
            t.id === editingTimeSlotId ? updated : t
          )
        }));
        setEditingTimeSlotId(null);
      } else {
        setCustomTimeSlots(prev => ({
          ...prev,
          [vacation]: [...(prev[vacation] || []), updated]
        }));
      }
    } catch (e) {
      console.error('[ScheduleManager] Erreur sauvegarde tranche :', e);
      alert('Erreur lors de la sauvegarde de la tranche horaire.');
    }

    setNewSlotTime({ debut: '12:00', fin: '12:45', label: '', isBreak: false });
  };

  const handleEditTimeSlot = (ts: HoraireCreneau) => {
    setEditingTimeSlotId(ts.id);
    setNewSlotTime({
      debut: ts.debut,
      fin: ts.fin,
      label: ts.label,
      isBreak: !!ts.isBreak,
    });
  };

  const syncTimeSlots = async (list: HoraireCreneau[], targetVacation: typeof vacation) => {
    try {
      const existing = await LocalDatabaseService.getScheduleTimeSlots({ schoolYearId: activeSchoolYear, vacation: targetVacation });
      for (const e of existing) {
        if (!list.some(l => l.id === e.id)) {
          await LocalDatabaseService.deleteScheduleTimeSlot(e.id);
        }
      }
      for (const l of list) {
        await LocalDatabaseService.addScheduleTimeSlot({ ...l, schoolYearId: activeSchoolYear, vacation: targetVacation });
      }
    } catch (e) {
      console.error('[ScheduleManager] Erreur synchronisation tranches :', e);
    }
  };

  const handleRemoveCustomTimeSlot = async (id: string) => {
    const next = customTimeSlots[vacation].filter(t => t.id !== id);
    setCustomTimeSlots(prev => ({ ...prev, [vacation]: next }));
    await syncTimeSlots(next, vacation);
  };

  const handleApplyPreset = async (preset: 'SECONDAIRE' | 'PRIMAIRE' | 'MATERNELLE' | 'MATERNELLE_9H') => {
    let presetList: HoraireCreneau[] = [];
    if (preset === 'SECONDAIRE') {
      if (vacation === 'MATIN') presetList = SLOTS_MATIN_SECOND;
      else if (vacation === 'APRES_MIDI' || vacation === 'SOIR') presetList = SLOTS_APRES_MIDI_SECOND;
      else presetList = SLOTS_MATIN_SECOND;
    } else if (preset === 'PRIMAIRE') {
      presetList = SLOTS_PRIMAIRE;
    } else if (preset === 'MATERNELLE') {
      presetList = SLOTS_MATERNELLE;
    } else if (preset === 'MATERNELLE_9H') {
      presetList = SLOTS_MATERNELLE_9H;
    }

    presetList = presetList.map(ts => ({ ...ts, schoolYearId: activeSchoolYear, vacation }));
    setCustomTimeSlots(prev => ({ ...prev, [vacation]: presetList }));
    await syncTimeSlots(presetList, vacation);
  };

  const handleExportPDF = () => setShowExportModal(true);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRE EN-TÊTE DU MODULE */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Emplois du Temps & Plannings Hebdomadaires
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contrôle intégral des heures & pauses, filtrages avancés (Classe, Prof, Salle)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isReadOnly && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-500/20"
            >
              <Settings className="w-4 h-4 text-indigo-500" /> Configurer Heures & Pauses
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Exporter / Imprimer Planning
          </button>

          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Nouveau Créneau
            </button>
          )}
        </div>
      </div>

      {/* CARTES INDICATEURS / KPIS DE L'EMPLOI DU TEMPS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Volume Horaire</p>
            <p className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{scheduleStats.courseHours} hrs/sem</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Matières Enseignées</p>
            <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{scheduleStats.uniqueSubjects} cours</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Profs Intervenants</p>
            <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{scheduleStats.uniqueTeachers} profs</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Pauses Configuées</p>
            <p className="text-base font-black font-mono text-purple-600 dark:text-purple-400">{activeTimeSlots.filter(t => t.isBreak).length} pauses</p>
          </div>
        </div>
      </div>

      {/* SÉLECTEUR DU MODE D'AFFICHAGE & FILTRAGE AVANCÉ */}
      <div
        className="p-4 rounded-2xl border space-y-4 shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* SWAP DES MODES DE VUE PRINCIPAUX (CLASSE vs ENSEIGNANT vs SALLE vs DISCIPLINE) */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
          {!isReadOnly ? (
            <div className="flex rounded-xl p-1 border gap-1 bg-slate-500/10" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setViewMode('CLASS')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'CLASS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <School className="w-4 h-4" /> Vue par Classe
              </button>
              <button
                onClick={() => setViewMode('TEACHER')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'TEACHER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" /> Vue par Enseignant
              </button>
              <button
                onClick={() => setViewMode('ROOM')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'ROOM' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-4 h-4" /> Vue par Salle / Local
              </button>
              <button
                onClick={() => setViewMode('SUBJECT')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'SUBJECT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Vue par Discipline
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20">
              <User className="w-4 h-4" /> Mon emploi du temps (lecture seule)
            </div>
          )}

          {/* SÉLECTION DE VACATION */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 shrink-0">Vacation :</span>
            <button
              onClick={() => setVacation('MATIN')}
              className={`px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                vacation === 'MATIN' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-200" /> Matin
            </button>
            <button
              onClick={() => setVacation('APRES_MIDI')}
              className={`px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                vacation === 'APRES_MIDI' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Sunset className="w-3.5 h-3.5 text-indigo-200" /> Après-Midi
            </button>
            <button
              onClick={() => setVacation('SUR_MESURE')}
              className={`px-3 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                vacation === 'SUR_MESURE' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-purple-200" /> Sur Mesure
            </button>
          </div>
        </div>

        {/* FILTRES DYNAMIQUES SELON LE MODE SÉLECTIONNÉ */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Cible selon le mode */}
          {viewMode === 'CLASS' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Classe / Promotion</label>
              <CustomSelect
                value={selectedClassId}
                onChange={(v) => setSelectedClassId(v)}
                options={filteredClasses.map(c => ({ value: c.id, label: `${c.nom} (Salle: ${c.salle || 'N/A'})` }))}
                placeholder="Sélectionner une classe..."
              />
            </div>
          )}

          {viewMode === 'TEACHER' && !isReadOnly && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Professeur / Enseignant</label>
              <CustomSelect
                value={selectedTeacherId}
                onChange={(v) => setSelectedTeacherId(v)}
                options={[
                  { value: 'ALL', label: 'Tous les professeurs' },
                  ...teachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom} (${t.role})` }))
                ]}
              />
            </div>
          )}

          {viewMode === 'TEACHER' && isReadOnly && currentStaff && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Enseignant</label>
              <div className="px-3 py-2 rounded-xl border bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-bold" style={{ borderColor: 'var(--border)' }}>
                {currentStaff.prenom} {currentStaff.nom}
              </div>
            </div>
          )}

          {viewMode === 'ROOM' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Salle Physique / Local</label>
              <CustomSelect
                value={selectedRoomName}
                onChange={(v) => setSelectedRoomName(v)}
                options={[
                  { value: 'ALL', label: 'Toutes les salles' },
                  ...availableRooms.map(r => ({ value: r, label: `Local / ${r}` }))
                ]}
              />
            </div>
          )}

          {viewMode === 'SUBJECT' && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Matière / Discipline</label>
              <CustomSelect
                value={selectedSubjectId}
                onChange={(v) => setSelectedSubjectId(v)}
                options={[
                  { value: 'ALL', label: 'Toutes les matières' },
                  ...subjects.map(s => ({ value: s.id, label: s.nom }))
                ]}
              />
            </div>
          )}

          {/* Cycle */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Cycle Scolaire</label>
            <CustomSelect
              value={selectedCycle}
              onChange={(v) => setSelectedCycle(v)}
              options={[
                { value: 'ALL', label: 'Tous les Cycles' },
                { value: 'MATERNELLE', label: 'Cycle Maternelle' },
                { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                { value: 'SECONDAIRE_CTEB', label: 'Cycle CTEB (7è / 8è EB)' },
                { value: 'HUMANITES', label: 'Cycle Humanités' },
              ]}
            />
          </div>

          {/* Jour */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Jour de la Semaine</label>
            <CustomSelect
              value={selectedDay}
              onChange={(v) => setSelectedDay(v)}
              options={[
                { value: 'ALL', label: 'Toute la Semaine (Grille Complète)' },
                ...DAYS_OF_WEEK.map(d => ({ value: d, label: d }))
              ]}
            />
          </div>

          {/* Recherche textuelle rapide avec bouton X */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Recherche Filtre</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Recherche Prof, Salle, Cours..."
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
          </div>
        </div>
      </div>

      {/* GRILLE HEBDOMADAIRE INTERACTIVE D'EMPLOI DU TEMPS */}
      <div
        className="rounded-2xl border overflow-hidden shadow-xs"
        id="schedule-print-section"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <h3 className="font-black text-xs uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>
              Planning Hebdomadaire · {viewMode === 'CLASS' ? (currentClassObj?.nom || 'Classe') : viewMode === 'TEACHER' ? `Prof: ${teachers.find(t => t.id === selectedTeacherId)?.nom || 'Tous'}` : viewMode === 'ROOM' ? `Salle: ${selectedRoomName}` : `Matière: ${subjects.find(s => s.id === selectedSubjectId)?.nom || 'Toutes'}`} · {vacation === 'MATIN' ? 'Équipe Matin' : 'Équipe Après-Midi'}
            </span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {activeTimeSlots.filter(t => t.isBreak).length} Pauses configurées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b text-[11px] font-black uppercase text-slate-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                <th className="p-3 w-44 text-center border-r" style={{ borderColor: 'var(--border)' }}>Tranche Horaire</th>
                {(selectedDay === 'ALL' ? DAYS_OF_WEEK : [selectedDay]).map(day => (
                  <th key={day} className="p-3 text-center border-r font-black text-indigo-600 dark:text-indigo-400" style={{ borderColor: 'var(--border)' }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border)' }}>
              {activeTimeSlots.map((slotTime, idx) => {
                if (slotTime.isBreak) {
                  return (
                    <tr key={idx} className="bg-amber-500/10 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border-y" style={{ borderColor: 'var(--border)' }}>
                      <td className="p-3 text-center font-mono font-black border-r" style={{ borderColor: 'var(--border)' }}>
                        {slotTime.debut} - {slotTime.fin}
                      </td>
                      <td colSpan={selectedDay === 'ALL' ? DAYS_OF_WEEK.length : 1} className="p-3 text-center tracking-wider text-xs font-black uppercase flex items-center justify-center gap-2">
                        <Coffee className="w-4 h-4 text-amber-500" />
                        <span>{slotTime.label}</span>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                    {/* TRANCHE HORAIRE */}
                    <td className="p-3 text-center font-mono font-bold text-slate-500 border-r" style={{ borderColor: 'var(--border)' }}>
                      <div>{slotTime.debut} - {slotTime.fin}</div>
                      <span className="text-[9px] text-slate-400 font-normal">{slotTime.label}</span>
                    </td>

                    {/* JOURS DE LA SEMAINE */}
                    {(selectedDay === 'ALL' ? DAYS_OF_WEEK : [selectedDay]).map(day => {
                      const matchingSlot = classSlots.find(s => s.jour === day && s.heureDebut === slotTime.debut);

                      return (
                        <td key={day} className="p-2 border-r align-top" style={{ borderColor: 'var(--border)' }}>
                          {matchingSlot ? (
                            <div className={`p-2.5 rounded-xl border space-y-1 relative group ${matchingSlot.couleurBg || 'bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-300'}`}>
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-xs tracking-tight truncate block">{matchingSlot.nomMatiere}</span>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => handleDeleteSlot(matchingSlot.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[10.5px] opacity-80 font-medium truncate flex items-center gap-1">
                                <User className="w-3 h-3 text-indigo-500" />
                                <span>{matchingSlot.nomProfesseur}</span>
                              </p>
                              <div className="flex items-center justify-between text-[9.5px] opacity-75 font-mono pt-0.5">
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-amber-500" />
                                  <span>{matchingSlot.salle}</span>
                                </span>
                                <span>{matchingSlot.heureDebut}</span>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`h-16 rounded-xl border border-dashed flex items-center justify-center text-slate-400 opacity-40 ${isReadOnly ? '' : 'hover:opacity-100 hover:bg-indigo-500/10 cursor-pointer'}`}
                              style={{ borderColor: 'var(--border)' }}
                              onClick={!isReadOnly ? () => handleOpenAddForCell(day, slotTime.debut, slotTime.fin) : undefined}
                              title={isReadOnly ? 'Créneau libre' : 'Cliquer pour ajouter un cours'}
                            >
                              {!isReadOnly && <Plus className="w-4 h-4" />}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE DE CONFIGURATION DES HEURES ET PAUSES (CONTRÔLE INTÉGRAL PAR L'UTILISATEUR) */}
      {showConfigModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setShowConfigModal(false)}
          >
            <div
              className="w-full max-w-xl rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-black text-base">Contrôle des Horaires & Pauses</h3>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-400 font-medium">
                  Définissez vous-même les tranches d'heures de cours et insérez les heures de pause pour la vacation <strong className="text-indigo-400">{vacation}</strong>.
                </p>

                {/* BOUTONS PRÉRÉGLAGES OFFICIELS RDC */}
                <div className="flex items-center gap-2 pt-1 pb-2 flex-wrap">
                  <span className="font-bold text-slate-500 text-[11px]">Modèles officiels RDC :</span>
                  <button
                    onClick={() => handleApplyPreset('SECONDAIRE')}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-bold text-[10.5px] cursor-pointer"
                  >
                    ⚡ Secondaire (45 min · 1 pause)
                  </button>
                  <button
                    onClick={() => handleApplyPreset('PRIMAIRE')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-bold text-[10.5px] cursor-pointer"
                  >
                    ⚡ Primaire (08h-12h15 · 2 pauses)
                  </button>
                  <button
                    onClick={() => handleApplyPreset('MATERNELLE')}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-300 font-bold text-[10.5px] cursor-pointer"
                  >
                    ⚡ Maternelle 8h (3 pauses)
                  </button>
                  <button
                    onClick={() => handleApplyPreset('MATERNELLE_9H')}
                    className="px-2.5 py-1 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-300 font-bold text-[10.5px] cursor-pointer"
                  >
                    ⚡ Maternelle 9h (3 pauses)
                  </button>
                </div>

                {/* LISTE DES TRANCHES DÉFINIES AVEC BOUTON D'ÉDITION DIRECTE */}
                <div className="space-y-2 max-h-60 overflow-y-auto p-2 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border)' }}>
                  {activeTimeSlots.map(ts => (
                    <div
                      key={ts.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between font-mono text-xs ${
                        ts.isBreak ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold' : 'bg-slate-500/10 border-slate-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm">{ts.debut} - {ts.fin}</span>
                        <span>· {ts.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditTimeSlot(ts)}
                          className="p-1 rounded text-indigo-500 hover:bg-indigo-500/20 cursor-pointer"
                          title="Modifier cette tranche"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveCustomTimeSlot(ts.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FORMULAIRE D'AJOUT / ÉDITION D'UNE TRANCHE HORAIRE / PAUSE */}
                <div className="p-4 rounded-xl border space-y-3 bg-slate-500/5" style={{ borderColor: 'var(--border)' }}>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-500">
                    {editingTimeSlotId ? 'Modifier la Tranche Horaire' : 'Définir une Nouvelle Tranche Horaire / Pause'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold mb-1 block">Heure Début (ex: 07:30)</label>
                      <input
                        type="text"
                        value={newSlotTime.debut}
                        onChange={(e) => setNewSlotTime({ ...newSlotTime, debut: e.target.value })}
                        placeholder="07:30"
                        className="w-full px-3 py-1.5 rounded-xl border font-mono font-bold bg-slate-500/10 focus:outline-none"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="font-bold mb-1 block">Heure Fin (ex: 08:20)</label>
                      <input
                        type="text"
                        value={newSlotTime.fin}
                        onChange={(e) => setNewSlotTime({ ...newSlotTime, fin: e.target.value })}
                        placeholder="08:20"
                        className="w-full px-3 py-2 rounded-xl border font-mono font-bold bg-slate-500/10 focus:outline-none"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold mb-1 block">Intitulé / Libellé de l'heure</label>
                    <input
                      type="text"
                      value={newSlotTime.label}
                      onChange={(e) => setNewSlotTime({ ...newSlotTime, label: e.target.value })}
                      placeholder="ex: 1ère Heure de Math ou 2ème Pause Récréation"
                      className="w-full px-3 py-2 rounded-xl border font-medium bg-slate-500/10 focus:outline-none"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="chk-break"
                      checked={newSlotTime.isBreak}
                      onChange={(e) => setNewSlotTime({ ...newSlotTime, isBreak: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="chk-break" className="font-bold text-amber-600 dark:text-amber-400 cursor-pointer">
                      Marquer comme Pause / Récréation (Détente)
                    </label>
                  </div>

                  <button
                    onClick={handleSaveCustomTimeSlot}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> {editingTimeSlotId ? 'Mettre à jour la Tranche' : 'Ajouter la Tranche Horaire'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Fermer & Appliquer
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODALE D'AJOUT / ÉDITION DE CRÉNEAU HORAIRE COURS */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setShowModal(false)}
          >
            <div
              className="w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4"
              style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-black text-base">Ajouter un Créneau Horaire</h3>
                <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold mb-1 block">Classe / Promotion</label>
                  <CustomSelect
                    value={formData.classeId}
                    onChange={(v) => {
                      const cl = classes.find(c => c.id === v);
                      setFormData(prev => ({
                        ...prev,
                        classeId: v,
                        matiereId: '',
                        professeurId: '',
                        salle: prev.salle || cl?.salle || currentClassObj?.salle || 'Salle B-06',
                      }));
                    }}
                    options={classes.map(c => ({ value: c.id, label: c.nom }))}
                    placeholder="Sélectionner une classe..."
                  />
                </div>

                <div>
                  <label className="font-bold mb-1 block">Jour de la Semaine</label>
                  <CustomSelect
                    value={formData.jour}
                    onChange={(v) => setFormData({ ...formData, jour: v as any })}
                    options={DAYS_OF_WEEK.map(d => ({ value: d, label: d }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Heure Début</label>
                    <CustomSelect
                      value={formData.heureDebut}
                      onChange={(v) => setFormData({ ...formData, heureDebut: v })}
                      options={activeTimeSlots.filter(t => !t.isBreak).map(t => ({ value: t.debut, label: t.debut }))}
                    />
                  </div>
                  <div>
                    <label className="font-bold mb-1 block">Heure Fin</label>
                    <CustomSelect
                      value={formData.heureFin}
                      onChange={(v) => setFormData({ ...formData, heureFin: v })}
                      options={activeTimeSlots.filter(t => !t.isBreak).map(t => ({ value: t.fin, label: t.fin }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold mb-1 flex items-center gap-1">
                    <span className="font-bold">Cours / Matière</span>
                    <span className="text-[10px] text-slate-500">({availableModalSubjects.length} trouvé(s) pour {modalClassObj?.nom || 'cette classe'})</span>
                  </label>
                  <CustomSelect
                    value={formData.matiereId}
                    onChange={handleMatiereChange}
                    options={[
                      { value: '', label: '— Choisir un cours —' },
                      ...availableModalSubjects.map(s => ({ value: s.id, label: `${s.nom} (Max ${s.maxScore} pts)` }))
                    ]}
                    placeholder="Choisir le cours..."
                  />
                </div>

                <div>
                  <label className="font-bold mb-1 block">Enseignant / Professeur Titulaire</label>
                  <CustomSelect
                    value={formData.professeurId}
                    onChange={(v) => setFormData({ ...formData, professeurId: v })}
                    options={[
                      { value: '', label: '— Choisir un enseignant —' },
                      ...relevantTeachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom} (${t.role})` }))
                    ]}
                    placeholder="Sélectionner l'enseignant..."
                  />
                </div>

                <div>
                  <label className="font-bold mb-1 block">Salle / Local d'Étude</label>
                  <input
                    type="text"
                    value={formData.salle}
                    onChange={(e) => setFormData({ ...formData, salle: e.target.value })}
                    placeholder="ex: Salle B-06 ou Labo Info"
                    className="w-full px-3 py-2 rounded-xl border font-medium bg-slate-500/10 focus:outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveSlot}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Enregistrer le Créneau
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <ScheduleExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        slots={slots}
        classes={classes}
        teachers={teachers}
        subjects={subjects}
        timeSlots={customTimeSlots[vacation] || activeTimeSlots}
        activeSchoolYear={activeSchoolYear}
        currentUser={currentUser}
        currentStaff={currentStaff}
      />
    </div>
  );
};
