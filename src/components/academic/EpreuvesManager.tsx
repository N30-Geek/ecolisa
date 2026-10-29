import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
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
  FileText,
  BarChart3,
  GraduationCap,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Eye,
  User,
  ArrowRight,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { ClasseScolaire, Discipline, MembrePersonnel, Eleve, Cote, EpreuveScolaire } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

const uuid = () => {
  if (typeof window !== 'undefined' && (window as any).crypto?.randomUUID) {
    return (window as any).crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export type EpreuveModel = EpreuveScolaire;

const DEFAULT_EPREUVES: EpreuveModel[] = [];

export const EpreuvesManager: React.FC = () => {
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [subjects, setSubjects] = useState<Discipline[]>([]);
  const [teachers, setTeachers] = useState<MembrePersonnel[]>([]);
  const [students, setStudents] = useState<Eleve[]>([]);
  const [epreuves, setEpreuves] = useState<EpreuveModel[]>(DEFAULT_EPREUVES);
  const [loading, setLoading] = useState(true);

  // ── FILTRES EN 3 CASCADES ──
  const [selectedCycle, setSelectedCycle] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedCible, setSelectedCible] = useState<string>('ALL');
  const [selectedPeriode, setSelectedPeriode] = useState<string>('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedOption, setSelectedOption] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('ALL');
  const [selectedRegister, setSelectedRegister] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState(LocalDatabaseService.getCurrentUser());
  const [currentStaff, setCurrentStaff] = useState<MembrePersonnel | null>(null);
  const [allCotes, setAllCotes] = useState<Cote[]>([]);
  const [search, setSearch] = useState<string>('');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [editingEpreuve, setEditingEpreuve] = useState<EpreuveModel | null>(null);
  const [gradingEpreuve, setGradingEpreuve] = useState<EpreuveModel | null>(null);

  // Formulaire Épreuve
  const [formData, setFormData] = useState({
    titre: '',
    type: 'INTERROGATION' as EpreuveModel['type'],
    cible: 'PERIODE' as EpreuveModel['cible'],
    periode: 'P1' as EpreuveModel['periode'],
    cycleId: 'PRIMAIRE',
    classeId: '',
    matiereId: '',
    professeurId: '',
    dateEpreuve: new Date().toISOString().split('T')[0],
    maxPoints: 20,
    statut: 'PROGRAMMEE' as EpreuveModel['statut'],
    remarques: '',
  });

  // Cotes de la modale de cotation rapide
  const [quickScores, setQuickScores] = useState<Record<string, number>>({});
  const [savingScores, setSavingScores] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cls, subs, stf, std, savedEpreuves, cotes, assignedClasses] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getEpreuves(),
        LocalDatabaseService.getCotes(),
        LocalDatabaseService.getCurrentUserAssignedClasses(),
      ]);
      const user = LocalDatabaseService.getCurrentUser();
      const userEmail = user?.email?.toLowerCase();
      const userName = user?.nom?.toLowerCase().trim();
      const staff = stf.find(member =>
        (userEmail && member.email?.toLowerCase() === userEmail) ||
        (userName && `${member.prenom} ${member.nom}`.toLowerCase().trim() === userName)
      ) || null;
      const allowedClasses = assignedClasses === null ? cls : cls.filter(c => assignedClasses.some(name => {
        const assigned = name.toLowerCase().trim();
        const className = c.nom.toLowerCase().trim();
        return assigned === className || assigned.includes(className) || className.includes(assigned);
      }));
      const allowedClassIds = new Set(allowedClasses.map(c => c.id));
      setCurrentUser(user);
      setCurrentStaff(staff);
      setClasses(allowedClasses);
      setSubjects(subs);
      setTeachers(stf);
      setStudents(assignedClasses === null ? std : std.filter(student => student.classId && allowedClassIds.has(student.classId)));
      setEpreuves(savedEpreuves);
      setAllCotes(cotes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1. FILTRAGE CASCADANT DES CLASSES PAR CYCLE
  const filteredClasses = useMemo(() => {
    if (selectedCycle === 'ALL') return classes;
    return classes.filter(c => c.cycleId === selectedCycle || c.nom.toUpperCase().includes(selectedCycle));
  }, [classes, selectedCycle]);

  // 2. FILTRAGE CASCADANT DES COURS PAR CLASSE SELECTIONNEE
  const filteredSubjects = useMemo(() => {
    if (selectedClassId === 'ALL') return subjects;
    const currentCls = classes.find(c => c.id === selectedClassId);
    if (!currentCls) return subjects;

    return subjects.filter(s => {
      if ((s as any).cycleCode && (s as any).cycleCode !== currentCls.cycleId) return false;
      if ((s as any).optionCode && (s as any).optionCode !== currentCls.optionCode) return false;
      return true;
    });
  }, [subjects, classes, selectedClassId]);

  const isTeacherView = currentUser?.role === 'ENSEIGNANT' || currentUser?.role === 'TITULAIRE';
  const isAdminView = !isTeacherView;

  const formSubjects = useMemo(() => {
    const targetClass = classes.find(c => c.id === formData.classeId);
    return subjects.filter(subject => {
      if (targetClass && subject.cycleCode && subject.cycleCode !== targetClass.cycleId) return false;
      if (targetClass?.optionCode && subject.optionCode && subject.optionCode !== 'TRONC_COMMUN' && subject.optionCode !== targetClass.optionCode) return false;
      if (isTeacherView && currentStaff?.disciplines?.length) {
        const assigned = currentStaff.disciplines.map(value => value.toLowerCase().trim());
        return assigned.includes(subject.id.toLowerCase()) || assigned.includes(subject.nom.toLowerCase().trim());
      }
      return true;
    });
  }, [classes, formData.classeId, subjects, isTeacherView, currentStaff]);

  // DÉDUCTION AUTOMATIQUE DU PROFESSEUR TITULAIRE LORS DE LA SÉLECTION D'UN COURS
  useEffect(() => {
    if (formData.matiereId && formData.classeId) {
      const sub = subjects.find(s => s.id === formData.matiereId);
      if (sub && (sub as any).professeurId) {
        setFormData(prev => ({ ...prev, professeurId: (sub as any).professeurId }));
      }
    }
  }, [formData.matiereId, formData.classeId, subjects]);

  // AUTO-CALCUL DU MAX POINTS SELON SI C'EST UNE PÉRIODE OU EXAMEN
  useEffect(() => {
    if (formData.cible === 'EXAMEN') {
      const sub = subjects.find(s => s.id === formData.matiereId);
      const defaultExamMax = sub ? (sub.maxExamen || sub.maxScore * 2) : 40;
      setFormData(prev => ({ ...prev, maxPoints: defaultExamMax }));
    } else {
      const sub = subjects.find(s => s.id === formData.matiereId);
      const defaultPeriodMax = sub ? sub.maxScore : 20;
      setFormData(prev => ({ ...prev, maxPoints: defaultPeriodMax }));
    }
  }, [formData.cible, formData.matiereId, subjects]);

  const optionValues = useMemo(() => Array.from(new Set(classes.map(c => c.optionCode).filter(Boolean) as string[])), [classes]);
  const roomValues = useMemo(() => Array.from(new Set(classes.flatMap(c => [c.salle, ...(c.salles || [])]).filter(Boolean))), [classes]);

  // FILTRAGE DES ÉPREUVES SELON TOUS LES CRITÈRES
  const filteredEpreuves = useMemo(() => {
    return epreuves.filter(ep => {
      const epClass = classes.find(c => c.id === ep.classeId);
      if (isTeacherView && (!currentStaff || ep.professeurId !== currentStaff.id)) return false;
      if (selectedCycle !== 'ALL' && ep.cycleId !== selectedCycle) return false;
      if (selectedClassId !== 'ALL' && ep.classeId !== selectedClassId) return false;
      if (selectedSubjectId !== 'ALL' && ep.matiereId !== selectedSubjectId) return false;
      if (selectedTeacherId !== 'ALL' && ep.professeurId !== selectedTeacherId) return false;
      if (selectedStatus !== 'ALL' && ep.statut !== selectedStatus) return false;
      if (selectedOption !== 'ALL' && ep.optionCode !== selectedOption) return false;
      if (selectedRoom !== 'ALL' && epClass?.salle !== selectedRoom && !(epClass?.salles || []).includes(selectedRoom)) return false;
      if (selectedRegister === 'INTEGRE' && !ep.integreeRegistre) return false;
      if (selectedRegister === 'NON_INTEGRE' && ep.integreeRegistre) return false;
      if (selectedType !== 'ALL' && ep.type !== selectedType) return false;
      if (selectedCible !== 'ALL' && ep.cible !== selectedCible) return false;
      if (selectedPeriode !== 'ALL' && ep.periode !== selectedPeriode) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          ep.titre.toLowerCase().includes(q) ||
          ep.nomMatiere.toLowerCase().includes(q) ||
          ep.nomClasse.toLowerCase().includes(q) ||
          ep.nomProfesseur.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [epreuves, classes, isTeacherView, currentStaff, selectedCycle, selectedClassId, selectedSubjectId, selectedTeacherId, selectedStatus, selectedOption, selectedRoom, selectedRegister, selectedType, selectedCible, selectedPeriode, search]);

  const { paginated: paginatedEpreuves, ...epreuvesPagination } = usePagination(filteredEpreuves, { defaultPageSize: 8 });

  const performanceBreakdown = useMemo(() => {
    const summarize = (keyOf: (ep: EpreuveModel) => string, labelOf: (ep: EpreuveModel) => string) => {
      const groups = new Map<string, { label: string; scores: number[]; evaluations: number }>();
      filteredEpreuves.forEach(ep => {
        const key = keyOf(ep);
        const scores = allCotes
          .filter(cote => cote.evaluationId === ep.id && cote.maxScore > 0)
          .map(cote => (cote.score / cote.maxScore) * 100);
        const group = groups.get(key) || { label: labelOf(ep), scores: [], evaluations: 0 };
        group.scores.push(...scores);
        group.evaluations += 1;
        groups.set(key, group);
      });
      return Array.from(groups.values())
        .map(group => ({
          ...group,
          average: group.scores.length ? group.scores.reduce((sum, score) => sum + score, 0) / group.scores.length : 0,
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 5);
    };
    return {
      classes: summarize(ep => ep.classeId, ep => ep.nomClasse),
      teachers: summarize(ep => ep.professeurId || ep.nomProfesseur, ep => ep.nomProfesseur),
    };
  }, [filteredEpreuves, allCotes]);

  // STATISTIQUES DES ÉPREUVES
  const stats = useMemo(() => {
    const total = filteredEpreuves.length;
    const examens = filteredEpreuves.filter(e => e.type === 'EXAMEN').length;
    const publiees = filteredEpreuves.filter(e => e.statut === 'PUBLIEE').length;
    const enAttente = filteredEpreuves.filter(e => e.statut === 'PROGRAMMEE' || e.statut === 'CORRIGEE').length;
    const evaluationIds = new Set(filteredEpreuves.map(ep => ep.id));
    const relatedCotes = allCotes.filter(cote => cote.evaluationId && evaluationIds.has(cote.evaluationId));
    const performance = relatedCotes.length
      ? relatedCotes.reduce((sum, cote) => sum + (cote.maxScore > 0 ? (cote.score / cote.maxScore) * 100 : 0), 0) / relatedCotes.length
      : 0;

    return { total, examens, publiees, enAttente, performance };
  }, [filteredEpreuves, allCotes]);

  const handleOpenAdd = () => {
    setEditingEpreuve(null);
    setFormData({
      titre: '',
      type: 'INTERROGATION',
      cible: 'PERIODE',
      periode: 'P1',
      cycleId: selectedCycle !== 'ALL' ? selectedCycle : 'PRIMAIRE',
      classeId: selectedClassId !== 'ALL' ? selectedClassId : (classes[0]?.id || ''),
      matiereId: selectedSubjectId !== 'ALL' ? selectedSubjectId : (subjects[0]?.id || ''),
      professeurId: isTeacherView ? (currentStaff?.id || '') : (teachers[0]?.id || ''),
      dateEpreuve: new Date().toISOString().split('T')[0],
      maxPoints: 20,
      statut: 'PROGRAMMEE',
      remarques: '',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (ep: EpreuveModel) => {
    setEditingEpreuve(ep);
    setFormData({
      titre: ep.titre,
      type: ep.type,
      cible: ep.cible,
      periode: ep.periode,
      cycleId: ep.cycleId,
      classeId: ep.classeId,
      matiereId: ep.matiereId,
      professeurId: ep.professeurId,
      dateEpreuve: ep.dateEpreuve,
      maxPoints: ep.maxPoints,
      statut: ep.statut,
      remarques: ep.remarques || '',
    });
    setShowAddModal(true);
  };

  const handleSaveEpreuve = async () => {
    if (!formData.titre.trim()) return alert('Veuillez saisir un titre pour l\'épreuve.');
    if (!formData.classeId) return alert('Veuillez sélectionner une classe.');
    if (!formData.matiereId) return alert('Veuillez sélectionner un cours.');
    if (!formData.professeurId) return alert('Veuillez sélectionner le professeur responsable.');

    const targetClass = classes.find(c => c.id === formData.classeId);
    const targetSub = subjects.find(s => s.id === formData.matiereId);
    const targetProf = teachers.find(t => t.id === formData.professeurId);
    const duplicate = epreuves.some(ep =>
      ep.id !== editingEpreuve?.id &&
      ep.classeId === formData.classeId &&
      ep.matiereId === formData.matiereId &&
      ep.periode === formData.periode &&
      ep.dateEpreuve === formData.dateEpreuve &&
      ep.titre.trim().toLowerCase() === formData.titre.trim().toLowerCase()
    );
    if (duplicate) return alert('Une épreuve identique existe déjà pour cette classe, ce cours, cette période et cette date.');

    const newEp: EpreuveModel = {
      id: editingEpreuve ? editingEpreuve.id : uuid(),
      titre: formData.titre,
      type: formData.type,
      cible: formData.cible,
      periode: formData.periode,
      cycleId: targetClass?.cycleId || formData.cycleId,
      classeId: formData.classeId,
      nomClasse: targetClass?.nom || 'Classe',
      optionCode: targetClass?.optionCode,
      schoolYearId: targetClass?.schoolYearId,
      matiereId: formData.matiereId,
      nomMatiere: targetSub?.nom || 'Matière',
      professeurId: formData.professeurId,
      nomProfesseur: targetProf ? `${targetProf.prenom} ${targetProf.nom}` : 'Professeur',
      dateEpreuve: formData.dateEpreuve,
      maxPoints: formData.maxPoints,
      statut: formData.statut,
      validationStatut: editingEpreuve?.validationStatut || 'EN_ATTENTE',
      integreeRegistre: editingEpreuve?.integreeRegistre || false,
      remarques: formData.remarques,
    };

    if (editingEpreuve) {
      const saved = await LocalDatabaseService.updateEpreuve(editingEpreuve.id, newEp);
      if (saved) setEpreuves(epreuves.map(e => e.id === editingEpreuve.id ? saved : e));
    } else {
      const saved = await LocalDatabaseService.addEpreuve(newEp);
      if (saved) setEpreuves([saved, ...epreuves]);
    }
    setShowAddModal(false);
  };

  const handleDeleteEpreuve = async (id: string) => {
    if (!window.confirm('Supprimer cette épreuve et toutes les cotes qui lui sont liées ?')) return;
    const linkedCotes = await LocalDatabaseService.getCotes({ evaluationId: id });
    await Promise.all(linkedCotes.map(cote => LocalDatabaseService.deleteCote(cote.id)));
    await LocalDatabaseService.deleteEpreuve(id);
    setAllCotes(prev => prev.filter(cote => cote.evaluationId !== id));
    setEpreuves(epreuves.filter(e => e.id !== id));
  };

  // SAISIE ET ENREGISTREMENT DIRECT DES COTES POUR L'ÉPREUVE SELECTIONNÉE
  const handleOpenGrading = async (ep: EpreuveModel) => {
    const examDate = new Date(`${ep.dateEpreuve}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(examDate.getTime()) && examDate > today) {
      alert(`Cette épreuve est programmée pour le ${examDate.toLocaleDateString('fr-CD')}. La correction n'est pas encore disponible.`);
      return;
    }
    setGradingEpreuve(ep);
    const existing = await LocalDatabaseService.getCotes({ evaluationId: ep.id });
    setQuickScores(Object.fromEntries(existing.map(cote => [cote.eleveId, cote.score])));
    setShowGradingModal(true);
  };

  const handleSaveQuickScores = async () => {
    if (!gradingEpreuve) return;
    setSavingScores(true);
    try {
      const classStudents = students.filter(s => s.classId === gradingEpreuve.classeId);
      const existingCotes = await LocalDatabaseService.getCotes({ evaluationId: gradingEpreuve.id });
      for (const st of classStudents) {
        const scoreVal = quickScores[st.id];
        if (scoreVal === undefined || scoreVal === null) continue;
        const existing = existingCotes.find(cote => cote.eleveId === st.id);
        const cote: Cote = {
          id: existing?.id || uuid(),
          evaluationId: gradingEpreuve.id,
          eleveId: st.id,
          anneeScolaireId: gradingEpreuve.schoolYearId,
          matiereId: gradingEpreuve.matiereId,
          classeId: gradingEpreuve.classeId,
          optionCode: gradingEpreuve.optionCode,
          enseignantId: gradingEpreuve.professeurId,
          score: Math.min(Math.max(scoreVal, 0), gradingEpreuve.maxPoints),
          maxScore: gradingEpreuve.maxPoints,
          periode: gradingEpreuve.periode,
          type: gradingEpreuve.cible === 'EXAMEN'
            ? 'EXAMEN'
            : gradingEpreuve.type === 'TRAVAIL_PRATIQUE' ? 'PRATIQUE' : gradingEpreuve.type,
          dateCote: gradingEpreuve.dateEpreuve,
          titre: gradingEpreuve.titre,
          statut: 'SOUMIS',
        };
        if (existing) await LocalDatabaseService.updateCote(existing.id, cote);
        else await LocalDatabaseService.addCote(cote);
      }

      const corrected = await LocalDatabaseService.updateEpreuve(gradingEpreuve.id, {
        statut: 'CORRIGEE',
        validationStatut: 'EN_ATTENTE',
        integreeRegistre: false,
      });
      if (corrected) setEpreuves(epreuves.map(e => e.id === gradingEpreuve.id ? corrected : e));
      setShowGradingModal(false);
      alert('Les résultats ont été enregistrés et transmis pour validation avant intégration au registre de cotation.');
    } catch (e) {
      console.error(e);
      alert('Erreur lors de l\'enregistrement des cotes.');
    } finally {
      setSavingScores(false);
    }
  };

  const getTypeBadge = (type: EpreuveModel['type']) => {
    switch (type) {
      case 'EXAMEN':
        return { label: 'Examen Officiel', style: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' };
      case 'INTERROGATION':
        return { label: 'Interrogation', style: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' };
      case 'EXERCICE_CONTROLE':
        return { label: 'Exercice Contrôle', style: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' };
      case 'DEVOIR':
        return { label: 'Devoir Maison', style: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' };
      default:
        return { label: 'Travail Pratique TP', style: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' };
    }
  };

  const getStatutBadge = (statut: EpreuveModel['statut']) => {
    switch (statut) {
      case 'PUBLIEE':
        return { label: 'Validée · Au registre', style: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40' };
      case 'CORRIGEE':
        return { label: 'À valider', style: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40' };
      case 'EN_COURS':
        return { label: 'En passation', style: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40' };
      default:
        return { label: 'Programmée', style: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40' };
    }
  };

  const handleValidation = async (ep: EpreuveModel, approved: boolean) => {
    if (!isAdminView) return;
    const now = new Date().toISOString();
    const userName = currentUser?.nom || 'Administration';
    const updated = await LocalDatabaseService.updateEpreuve(ep.id, approved ? {
      statut: 'PUBLIEE',
      validationStatut: 'VALIDEE',
      valideParId: currentUser?.id,
      valideParNom: userName,
      valideLe: now,
      integreeRegistre: true,
    } : {
      statut: 'CORRIGEE',
      validationStatut: 'REJETEE',
      valideParId: currentUser?.id,
      valideParNom: userName,
      valideLe: now,
      integreeRegistre: false,
    });
    const evaluationCotes = await LocalDatabaseService.getCotes({ evaluationId: ep.id });
    await Promise.all(evaluationCotes.map(cote => LocalDatabaseService.updateCote(cote.id, {
      statut: approved ? 'VALIDE_DE' : 'REJETE_DE',
      valideDELe: approved ? now : undefined,
      valideParDEId: approved ? currentUser?.id : undefined,
    })));
    if (updated) setEpreuves(prev => prev.map(item => item.id === ep.id ? updated : item));
    setAllCotes(await LocalDatabaseService.getCotes());
  };

  const handleExportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = (autoTableModule as any).default || autoTableModule;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Répertoire des évaluations et épreuves', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CD')} · ${filteredEpreuves.length} élément(s)`, 14, 23);
    autoTable(doc, {
      startY: 29,
      head: [['Épreuve', 'Classe / Option', 'Cours', 'Professeur', 'Date', 'Période', 'Barème', 'Statut', 'Registre']],
      body: filteredEpreuves.map(ep => [
        ep.titre,
        `${ep.nomClasse}${ep.optionCode && ep.optionCode !== 'TRONC_COMMUN' ? ` · ${ep.optionCode}` : ''}`,
        ep.nomMatiere,
        ep.nomProfesseur,
        ep.dateEpreuve,
        ep.periode,
        `${ep.maxPoints} pts`,
        getStatutBadge(ep.statut).label,
        ep.integreeRegistre ? 'Intégrée' : 'Non intégrée',
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [67, 56, 202], textColor: 255 },
    });
    doc.save(`Repertoire_Evaluations_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BANNIÈRE EN-TÊTE DU MODULE */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {isTeacherView ? 'Mes Évaluations & Épreuves' : 'Pilotage des Évaluations & Épreuves'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isTeacherView
                ? 'Planifiez vos épreuves, saisissez les résultats et transmettez-les pour validation.'
                : 'Suivez les épreuves par classe, salle, option, cours et professeur jusqu’au registre de cotation.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" /> Exporter en PDF
          </button>
          <button
            onClick={handleOpenAdd}
            disabled={isTeacherView && !currentStaff}
            title={isTeacherView && !currentStaff ? 'Aucun dossier enseignant lié à ce compte.' : undefined}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Créer une Épreuve
          </button>
        </div>
      </div>

      {/* KPI STATISTIQUES */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Épreuves</p>
            <p className="text-base font-black font-mono" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Examens Officiels</p>
            <p className="text-base font-black font-mono text-rose-600 dark:text-rose-400">{stats.examens}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Cotes Publiées</p>
            <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.publiees}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">À traiter</p>
            <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{stats.enAttente}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border flex items-center gap-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Performance</p>
            <p className="text-base font-black font-mono text-violet-600 dark:text-violet-400">{stats.performance.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* PANNEAU DE FILTRAGE CASCADANT EN 3 NIVEAUX ET RECHERCHE */}
      <div
        className="p-4 rounded-2xl border space-y-3 shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {/* Cascade 1: Cycle */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">1. Cycle Scolaire</label>
            <CustomSelect
              value={selectedCycle}
              onChange={(v) => { setSelectedCycle(v); setSelectedClassId('ALL'); }}
              options={[
                { value: 'ALL', label: 'Tous les Cycles' },
                { value: 'MATERNELLE', label: 'Cycle Maternelle' },
                { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                { value: 'SECONDAIRE_CTEB', label: 'Cycle CTEB (7è/8è)' },
                { value: 'HUMANITES', label: 'Cycle Humanités' },
              ]}
            />
          </div>

          {/* Cascade 2: Classe */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">2. Classe / Option</label>
            <CustomSelect
              value={selectedClassId}
              onChange={(v) => { setSelectedClassId(v); setSelectedSubjectId('ALL'); }}
              options={[
                { value: 'ALL', label: 'Toutes les classes' },
                ...filteredClasses.map(c => ({ value: c.id, label: c.nom }))
              ]}
            />
          </div>

          {/* Cascade 3: Cours */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">3. Discipline / Cours</label>
            <CustomSelect
              value={selectedSubjectId}
              onChange={(v) => setSelectedSubjectId(v)}
              options={[
                { value: 'ALL', label: 'Tous les cours' },
                ...filteredSubjects.map(s => ({ value: s.id, label: s.nom }))
              ]}
            />
          </div>

          {/* Type d'épreuve */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Type Épreuve</label>
            <CustomSelect
              value={selectedType}
              onChange={(v) => setSelectedType(v)}
              options={[
                { value: 'ALL', label: 'Tous les types' },
                { value: 'INTERROGATION', label: 'Interrogation' },
                { value: 'EXAMEN', label: 'Examen' },
                { value: 'EXERCICE_CONTROLE', label: 'Exercice Contrôle' },
                { value: 'DEVOIR', label: 'Devoir Maison' },
                { value: 'TRAVAIL_PRATIQUE', label: 'Travail Pratique TP' },
              ]}
            />
          </div>

          {/* Cible Période ou Examen */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Pour (Cible)</label>
            <CustomSelect
              value={selectedCible}
              onChange={(v) => setSelectedCible(v)}
              options={[
                { value: 'ALL', label: 'Période & Examen' },
                { value: 'PERIODE', label: 'Pour Période' },
                { value: 'EXAMEN', label: 'Pour Examen' },
              ]}
            />
          </div>

          {/* Recherche Intitulé avec Bouton X */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Recherche</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 rounded-xl border text-xs bg-slate-500/10 focus:outline-none focus:border-indigo-500 font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            <label className="text-[11px] font-bold text-slate-500 mb-1 block">Période</label>
            <CustomSelect value={selectedPeriode} onChange={setSelectedPeriode} options={[
              { value: 'ALL', label: 'Toutes les périodes' },
              { value: 'P1', label: '1ère Période' }, { value: 'P2', label: '2ème Période' },
              { value: 'EX1', label: 'Examen S1' }, { value: 'P3', label: '3ème Période' },
              { value: 'P4', label: '4ème Période' }, { value: 'EX2', label: 'Examen S2' },
            ]} />
          </div>
          {isAdminView && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Professeur</label>
                <CustomSelect value={selectedTeacherId} onChange={setSelectedTeacherId} searchable options={[
                  { value: 'ALL', label: 'Tous les professeurs' },
                  ...teachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom}` })),
                ]} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Option</label>
                <CustomSelect value={selectedOption} onChange={setSelectedOption} options={[
                  { value: 'ALL', label: 'Toutes les options' },
                  ...optionValues.map(option => ({ value: option, label: option })),
                ]} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Salle</label>
                <CustomSelect value={selectedRoom} onChange={setSelectedRoom} options={[
                  { value: 'ALL', label: 'Toutes les salles' },
                  ...roomValues.map(room => ({ value: room, label: room })),
                ]} />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Suivi administratif</label>
                <CustomSelect value={selectedRegister !== 'ALL' ? selectedRegister : selectedStatus} onChange={(value) => {
                  if (value === 'INTEGRE' || value === 'NON_INTEGRE') { setSelectedRegister(value); setSelectedStatus('ALL'); }
                  else { setSelectedStatus(value); setSelectedRegister('ALL'); }
                }} options={[
                  { value: 'ALL', label: 'Tous les états' },
                  { value: 'PROGRAMMEE', label: 'Programmées' },
                  { value: 'CORRIGEE', label: 'En attente de validation' },
                  { value: 'PUBLIEE', label: 'Validées' },
                  { value: 'INTEGRE', label: 'Intégrées au registre' },
                  { value: 'NON_INTEGRE', label: 'Non intégrées' },
                ]} />
              </div>
            </>
          )}
        </div>
      </div>

      {isAdminView && (performanceBreakdown.classes.length > 0 || performanceBreakdown.teachers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Performance par classe', rows: performanceBreakdown.classes, icon: GraduationCap },
            { title: 'Performance par professeur', rows: performanceBreakdown.teachers, icon: User },
          ].map(({ title, rows, icon: AnalysisIcon }) => (
            <div key={title} className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
                <AnalysisIcon className="w-4 h-4 text-indigo-500" /> {title}
              </h3>
              <div className="space-y-3">
                {rows.map(row => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between gap-3 text-xs mb-1">
                      <span className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{row.label}</span>
                      <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{row.average.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-500/10 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(row.average, 100)}%` }} />
                    </div>
                    <p className="text-[9px] text-slate-400 mt-1">{row.evaluations} évaluation{row.evaluations > 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLEAU RÉPERTOIRE DES ÉPREUVES */}
      <div
        className="rounded-2xl border shadow-xs overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            Répertoire des Épreuves et Examens · {filteredEpreuves.length} résultat(s)
          </h3>
          <span className="text-xs text-slate-400 font-medium">Normes Évaluation EPST RDC</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase tracking-wider text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <th className="p-3.5">Titre de l'Épreuve</th>
                <th className="p-3.5">Type & Cible</th>
                <th className="p-3.5">Classe & Cours</th>
                <th className="p-3.5">Enseignant Titulaire</th>
                <th className="p-3.5 text-center">Date & Période</th>
                <th className="p-3.5 text-center">Max Points</th>
                <th className="p-3.5 text-center">Statut</th>
                <th className="p-3.5 text-right">Actions & Cotation</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedEpreuves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <p className="font-bold mb-2">Aucune épreuve trouvée selon ces critères.</p>
                    <button
                      onClick={handleOpenAdd}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Créer une Nouvelle Épreuve
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedEpreuves.map((ep) => {
                  const typeBadge = getTypeBadge(ep.type);
                  const statutBadge = getStatutBadge(ep.statut);

                  return (
                    <tr key={ep.id} className="hover:bg-slate-500/5 transition-colors">
                      <td className="p-3.5 font-black text-xs" style={{ color: 'var(--text-primary)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block font-bold">{ep.titre}</span>
                            {ep.remarques && <span className="text-[10px] text-slate-400 font-normal">{ep.remarques}</span>}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge.style}`}>
                          {typeBadge.label}
                        </span>
                        <span className="block text-[9.5px] font-mono text-slate-400 mt-0.5">
                          Pour {ep.cible} ({ep.periode})
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block text-xs">{ep.nomClasse}</span>
                        {ep.optionCode && ep.optionCode !== 'TRONC_COMMUN' && <span className="block text-[9.5px] text-violet-500 font-semibold">Option : {ep.optionCode}</span>}
                        <span className="text-[10.5px] text-indigo-500 font-medium">{ep.nomMatiere}</span>
                      </td>

                      <td className="p-3.5 font-medium text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{ep.nomProfesseur}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-mono text-xs">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{ep.dateEpreuve}</div>
                        <span className="text-[9.5px] text-slate-400">{ep.periode}</span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">
                        / {ep.maxPoints} pts
                      </td>

                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statutBadge.style}`}>
                          {statutBadge.label}
                        </span>
                        {ep.valideParNom && <span className="block mt-1 text-[9px] text-slate-400">par {ep.valideParNom}</span>}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenGrading(ep)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer"
                            title={isAdminView ? 'Consulter les résultats des élèves' : 'Saisir ou modifier les résultats'}
                          >
                            <ClipboardList className="w-3.5 h-3.5" /> {isAdminView ? 'Résultats' : 'Saisir'}
                          </button>
                          {isAdminView && ep.statut === 'CORRIGEE' && (
                            <>
                              <button
                                onClick={() => handleValidation(ep, true)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1"
                                title="Valider et intégrer au registre de cotation"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Valider
                              </button>
                              <button
                                onClick={() => handleValidation(ep, false)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-500"
                                title="Rejeter et retourner au professeur"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenEdit(ep)}
                            className="p-1.5 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-indigo-500 cursor-pointer"
                            title="Modifier l'épreuve"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEpreuve(ep.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={epreuvesPagination.page}
          totalPages={epreuvesPagination.totalPages}
          total={epreuvesPagination.total}
          pageSize={epreuvesPagination.pageSize}
          start={epreuvesPagination.start}
          end={epreuvesPagination.end}
          onPageChange={epreuvesPagination.setPage}
          onPageSizeChange={epreuvesPagination.setPageSize}
        />
      </div>

      {/* MODALE DE CRÉATION / ÉDITION D'UNE ÉPREUVE */}
      {showAddModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-500" />
                  <span>{editingEpreuve ? 'Modifier l\'Épreuve' : 'Nouvelle Épreuve ou Examen'}</span>
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold mb-1 block">Titre / Intitulé de l'Épreuve</label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    placeholder="ex: Interrogation n°1 de Grammaire ou Examen Semestre 1"
                    className="w-full px-3 py-2 rounded-xl border font-bold bg-slate-500/10 focus:outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Type d'Épreuve</label>
                    <CustomSelect
                      value={formData.type}
                      onChange={(v) => setFormData({ ...formData, type: v as any })}
                      options={[
                        { value: 'INTERROGATION', label: 'Interrogation Ecrite/Orale' },
                        { value: 'EXAMEN', label: 'Examen Officiel' },
                        { value: 'EXERCICE_CONTROLE', label: 'Exercice de Contrôle' },
                        { value: 'DEVOIR', label: 'Devoir à Domicile' },
                        { value: 'TRAVAIL_PRATIQUE', label: 'Travail Pratique (TP)' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="font-bold mb-1 block">Cible Évaluation ("Pour")</label>
                    <CustomSelect
                      value={formData.cible}
                      onChange={(v) => setFormData({ ...formData, cible: v as any })}
                      options={[
                        { value: 'PERIODE', label: 'Pour Période' },
                        { value: 'EXAMEN', label: 'Pour Examen' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Classe / Promotion</label>
                    <CustomSelect
                      value={formData.classeId}
                      onChange={(v) => setFormData({ ...formData, classeId: v, matiereId: '' })}
                      options={classes.map(c => ({ value: c.id, label: c.nom }))}
                      placeholder="Sélectionner la classe..."
                    />
                  </div>

                  <div>
                    <label className="font-bold mb-1 block">Discipline / Cours</label>
                    <CustomSelect
                      value={formData.matiereId}
                      onChange={(v) => setFormData({ ...formData, matiereId: v })}
                      options={formSubjects.map(s => ({ value: s.id, label: s.nom }))}
                      placeholder="Sélectionner le cours..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Période Concernée</label>
                    <CustomSelect
                      value={formData.periode}
                      onChange={(v) => setFormData({ ...formData, periode: v as any })}
                      options={[
                        { value: 'P1', label: '1ère Période (P1)' },
                        { value: 'P2', label: '2ème Période (P2)' },
                        { value: 'EX1', label: 'Examen 1er Semestre (EX1)' },
                        { value: 'P3', label: '3ème Période (P3)' },
                        { value: 'P4', label: '4ème Période (P4)' },
                        { value: 'EX2', label: 'Examen 2ème Semestre (EX2)' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="font-bold mb-1 block">Date de Passation</label>
                    <CustomDatePicker
                      value={formData.dateEpreuve}
                      onChange={(v) => setFormData({ ...formData, dateEpreuve: v })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold mb-1 block">Enseignant Titulaire</label>
                    <CustomSelect
                      value={formData.professeurId}
                      onChange={(v) => setFormData({ ...formData, professeurId: v })}
                      options={teachers.map(t => ({ value: t.id, label: `${t.prenom} ${t.nom}` }))}
                      disabled={isTeacherView}
                    />
                  </div>

                  <div>
                    <label className="font-bold mb-1 block">Barème Max / points</label>
                    <NumberInput
                      value={formData.maxPoints}
                      onChange={v => setFormData({ ...formData, maxPoints: v || 20 })}
                      min={1}
                      placeholder="Max points"
                      className="w-full px-3 py-2 rounded-xl border font-mono font-bold bg-slate-500/10"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold mb-1 block">Statut de l'Épreuve</label>
                  <CustomSelect
                    value={formData.statut}
                    onChange={(v) => setFormData({ ...formData, statut: v as any })}
                    options={[
                      { value: 'PROGRAMMEE', label: 'Programmée (En attente)' },
                      { value: 'EN_COURS', label: 'En passation' },
                    ]}
                    disabled={editingEpreuve?.statut === 'CORRIGEE' || editingEpreuve?.statut === 'PUBLIEE'}
                  />
                </div>

                <div>
                  <label className="font-bold mb-1 block">Remarques & Instructions</label>
                  <textarea
                    value={formData.remarques}
                    onChange={(e) => setFormData({ ...formData, remarques: e.target.value })}
                    placeholder="Instructions particulières pour les élèves..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border font-medium bg-slate-500/10 focus:outline-none"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveEpreuve}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  Enregistrer l'Épreuve
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* MODALE DE SAISIE ET ENREGISTREMENT EN DIRECT DES COTES */}
      {showGradingModal && gradingEpreuve &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in"
            onClick={() => setShowGradingModal(false)}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="font-black text-base">Saisie des Cotes : {gradingEpreuve.titre}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Classe : {gradingEpreuve.nomClasse} · Cours : {gradingEpreuve.nomMatiere} · Max : {gradingEpreuve.maxPoints} pts
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowGradingModal(false)} className="p-1 rounded-lg hover:bg-slate-500/20 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* LISTE DES ÉLÈVES AVEC INPUT DE COTE */}
              <div className="space-y-2 max-h-80 overflow-y-auto p-2 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border)' }}>
                {students.filter(s => s.classId === gradingEpreuve.classeId).length === 0 ? (
                  <p className="p-6 text-center text-slate-400 font-bold text-xs">Aucun élève inscrit dans cette classe.</p>
                ) : (
                  students.filter(s => s.classId === gradingEpreuve.classeId).map((st, idx) => {
                    const currentVal = quickScores[st.id] ?? 0;
                    const pct = Math.round((currentVal / gradingEpreuve.maxPoints) * 100);

                    return (
                      <div
                        key={st.id}
                        className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-slate-500/10"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-indigo-600/15 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-xs block" style={{ color: 'var(--text-primary)' }}>{st.prenom} {st.nom}</span>
                            <span className="text-[10px] text-slate-400">Matricule: {st.registrationNumber || (st as any).matricule || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={`text-xs font-black font-mono ${pct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                              {pct}%
                            </span>
                            <span className="block text-[9px] text-slate-400">{pct >= 50 ? 'Satisfaisant' : 'Insuffisant'}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <NumberInput
                              value={currentVal}
                              onChange={v => setQuickScores({ ...quickScores, [st.id]: Math.min(gradingEpreuve.maxPoints, Math.max(0, v)) })}
                              min={0}
                              max={gradingEpreuve.maxPoints}
                              disabled={isAdminView}
                              placeholder="0"
                              className="w-20 px-3 py-1.5 rounded-xl border text-center font-mono font-black text-sm bg-slate-500/10 disabled:opacity-70"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                            />
                            <span className="font-mono text-xs font-bold text-slate-400">/ {gradingEpreuve.maxPoints}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setShowGradingModal(false)}
                  className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Annuler
                </button>
                {!isAdminView && (
                  <button
                    onClick={handleSaveQuickScores}
                    disabled={savingScores}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    {savingScores ? 'Enregistrement...' : 'Enregistrer et transmettre pour validation'}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
