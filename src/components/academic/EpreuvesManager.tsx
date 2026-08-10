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
import type { ClasseScolaire, Discipline, MembrePersonnel, Eleve, Cote } from '../../types';
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

export interface EpreuveModel {
  id: string;
  titre: string;
  type: 'INTERROGATION' | 'EXAMEN' | 'EXERCICE_CONTROLE' | 'DEVOIR' | 'TRAVAIL_PRATIQUE';
  cible: 'PERIODE' | 'EXAMEN';
  periode: 'P1' | 'P2' | 'EX1' | 'P3' | 'P4' | 'EX2';
  cycleId: string;
  classeId: string;
  nomClasse: string;
  matiereId: string;
  nomMatiere: string;
  professeurId: string;
  nomProfesseur: string;
  dateEpreuve: string;
  maxPoints: number;
  statut: 'PROGRAMMEE' | 'EN_COURS' | 'CORRIGEE' | 'PUBLIEE';
  remarques?: string;
}

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
      const [cls, subs, stf, std] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getStaff(),
        LocalDatabaseService.getEleves(),
      ]);
      setClasses(cls);
      setSubjects(subs);
      setTeachers(stf);
      setStudents(std);
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

  // FILTRAGE DES ÉPREUVES SELON TOUS LES CRITÈRES
  const filteredEpreuves = useMemo(() => {
    return epreuves.filter(ep => {
      if (selectedCycle !== 'ALL' && ep.cycleId !== selectedCycle) return false;
      if (selectedClassId !== 'ALL' && ep.classeId !== selectedClassId) return false;
      if (selectedSubjectId !== 'ALL' && ep.matiereId !== selectedSubjectId) return false;
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
  }, [epreuves, selectedCycle, selectedClassId, selectedSubjectId, selectedType, selectedCible, selectedPeriode, search]);

  const { paginated: paginatedEpreuves, ...epreuvesPagination } = usePagination(filteredEpreuves, { defaultPageSize: 8 });

  // STATISTIQUES DES ÉPREUVES
  const stats = useMemo(() => {
    const total = filteredEpreuves.length;
    const examens = filteredEpreuves.filter(e => e.type === 'EXAMEN').length;
    const publiees = filteredEpreuves.filter(e => e.statut === 'PUBLIEE').length;
    const enAttente = filteredEpreuves.filter(e => e.statut === 'PROGRAMMEE').length;

    return { total, examens, publiees, enAttente };
  }, [filteredEpreuves]);

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
      professeurId: teachers[0]?.id || '',
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

  const handleSaveEpreuve = () => {
    if (!formData.titre.trim()) return alert('Veuillez saisir un titre pour l\'épreuve.');
    if (!formData.classeId) return alert('Veuillez sélectionner une classe.');
    if (!formData.matiereId) return alert('Veuillez sélectionner un cours.');

    const targetClass = classes.find(c => c.id === formData.classeId);
    const targetSub = subjects.find(s => s.id === formData.matiereId);
    const targetProf = teachers.find(t => t.id === formData.professeurId);

    const newEp: EpreuveModel = {
      id: editingEpreuve ? editingEpreuve.id : uuid(),
      titre: formData.titre,
      type: formData.type,
      cible: formData.cible,
      periode: formData.periode,
      cycleId: targetClass?.cycleId || formData.cycleId,
      classeId: formData.classeId,
      nomClasse: targetClass?.nom || 'Classe',
      matiereId: formData.matiereId,
      nomMatiere: targetSub?.nom || 'Matière',
      professeurId: formData.professeurId,
      nomProfesseur: targetProf ? `${targetProf.prenom} ${targetProf.nom}` : 'Professeur',
      dateEpreuve: formData.dateEpreuve,
      maxPoints: formData.maxPoints,
      statut: formData.statut,
      remarques: formData.remarques,
    };

    if (editingEpreuve) {
      setEpreuves(epreuves.map(e => e.id === editingEpreuve.id ? newEp : e));
    } else {
      setEpreuves([newEp, ...epreuves]);
    }
    setShowAddModal(false);
  };

  const handleDeleteEpreuve = (id: string) => {
    if (!window.confirm('Supprimer cette épreuve de la base de données ?')) return;
    setEpreuves(epreuves.filter(e => e.id !== id));
  };

  // SAISIE ET ENREGISTREMENT DIRECT DES COTES POUR L'ÉPREUVE SELECTIONNÉE
  const handleOpenGrading = (ep: EpreuveModel) => {
    setGradingEpreuve(ep);
    const classStudents = students.filter(s => s.classId === ep.classeId);
    const initialScores: Record<string, number> = {};
    classStudents.forEach(st => {
      initialScores[st.id] = Math.round(ep.maxPoints * 0.7); // Par défaut score fictif
    });
    setQuickScores(initialScores);
    setShowGradingModal(true);
  };

  const handleSaveQuickScores = async () => {
    if (!gradingEpreuve) return;
    setSavingScores(true);
    try {
      const classStudents = students.filter(s => s.classId === gradingEpreuve.classeId);
      for (const st of classStudents) {
        const scoreVal = quickScores[st.id] || 0;
        const newCote: Cote = {
          id: uuid(),
          eleveId: st.id,
          matiereId: gradingEpreuve.matiereId,
          score: scoreVal,
          maxScore: gradingEpreuve.maxPoints,
          periode: gradingEpreuve.periode,
          type: gradingEpreuve.cible === 'EXAMEN' ? 'EXAMEN' : 'INTERROGATION',
          dateCote: gradingEpreuve.dateEpreuve,
          classeId: gradingEpreuve.classeId,
        };
        await LocalDatabaseService.addCote(newCote);
      }

      // Marquer l'épreuve comme PUBLIÉE
      setEpreuves(epreuves.map(e => e.id === gradingEpreuve.id ? { ...e, statut: 'PUBLIEE' } : e));
      setShowGradingModal(false);
      alert('Toutes les cotes de l\'épreuve ont été enregistrées avec succès dans la base de données !');
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
        return { label: 'Résultats Publiés', style: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40' };
      case 'CORRIGEE':
        return { label: 'Corrigée & Prête', style: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/40' };
      case 'EN_COURS':
        return { label: 'En Passation', style: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40' };
      default:
        return { label: 'Programmée', style: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/40' };
    }
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
              Gestion des Épreuves & Examens EPST RDC
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Planification des interrogations, exercices de contrôle, travaux pratiques & compositions semestrielles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" /> Imprimer Répertoire (PDF)
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" /> Créer une Épreuve
          </button>
        </div>
      </div>

      {/* KPI STATISTIQUES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <p className="text-[10px] text-slate-400 font-bold uppercase">En Attente</p>
            <p className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{stats.enAttente}</p>
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
      </div>

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
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenGrading(ep)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer"
                            title="Saisir / Modifier les cotes des élèves"
                          >
                            <ClipboardList className="w-3.5 h-3.5" /> Saisir Cotes
                          </button>
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
                      onChange={(v) => setFormData({ ...formData, classeId: v })}
                      options={classes.map(c => ({ value: c.id, label: c.nom }))}
                      placeholder="Sélectionner la classe..."
                    />
                  </div>

                  <div>
                    <label className="font-bold mb-1 block">Discipline / Cours</label>
                    <CustomSelect
                      value={formData.matiereId}
                      onChange={(v) => setFormData({ ...formData, matiereId: v })}
                      options={filteredSubjects.map(s => ({ value: s.id, label: s.nom }))}
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
                      { value: 'EN_COURS', label: 'En Passation' },
                      { value: 'CORRIGEE', label: 'Corrigée' },
                      { value: 'PUBLIEE', label: 'Résultats Publiés' },
                    ]}
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
                              placeholder="0"
                              className="w-20 px-3 py-1.5 rounded-xl border text-center font-mono font-black text-sm bg-slate-500/10"
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
                <button
                  onClick={handleSaveQuickScores}
                  disabled={savingScores}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {savingScores ? 'Enregistrement...' : 'Enregistrer & Publier les Cotes'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
