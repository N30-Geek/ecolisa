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
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { Cote, ClasseScolaire, Discipline, Eleve, TypeEvaluation } from '../../types';
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

const PERIODS = [
  '1ère Période',
  '2ème Période',
  'Examen 1er Semestre',
  '3ème Période',
  '4ème Période',
  'Examen 2ème Semestre',
];

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── SELECTIONS EN CASCADE PAR ÉTAPES ──
  // 1. Cycle
  const [selectedCycle, setSelectedCycle] = useState<string>('ALL');
  // 2. Classe
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  // 3. Salle Physique
  const [selectedSalle, setSelectedSalle] = useState<string>('ALL');
  // 4. Cours / Matière
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');
  // 5. Épreuve / Examen / Période
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1ère Période');

  // Recherche Élève
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Matrice de saisie des cotes: eleveId -> score
  const [scoresMap, setScoresMap] = useState<Record<string, number>>({});
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
      const [cls, subs, allSt, cots] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSubjects(),
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getCotes(),
      ]);
      setClasses(cls);
      setSubjects(subs);
      setStudents(allSt);
      setAllCotes(cots);

      if (cls.length > 0 && !selectedClassId) {
        setSelectedClassId(cls[0].id);
      }
    } catch (e) {
      console.error("Erreur chargement cotes:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // 3. FILTRAGE RIGOUREUX DES MATIÈRES / COURS ENSEIGNÉS DANS CETTE CLASSE ET SALLE
  const availableSubjects = useMemo(() => {
    if (!currentClassObj) return subjects;

    return subjects.filter(s => {
      // Filtrage par Cycle (ex: MATERNELLE, PRIMAIRE, CTEB, HUMANITES)
      if (s.cycleCode && s.cycleCode !== currentClassObj.cycleId) {
        return false;
      }
      // Filtrage par Option/Section (ex: Commerciale, Secrétariat, Scientifique)
      if (
        s.optionCode &&
        s.optionCode !== 'TRONC_COMMUN' &&
        currentClassObj.optionCode &&
        s.optionCode !== currentClassObj.optionCode
      ) {
        return false;
      }
      return true;
    });
  }, [subjects, currentClassObj]);

  // Si la liste des matières disponibles change, réinitialiser la matière si elle n'y figure plus
  useEffect(() => {
    if (availableSubjects.length > 0 && selectedSubjectId !== 'ALL') {
      const isValid = availableSubjects.some(s => s.id === selectedSubjectId);
      if (!isValid) {
        setSelectedSubjectId('ALL');
      }
    }
  }, [availableSubjects]);

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

  // 5. MAX POINTS SELON L'ÉVALUATION ET LA MATIÈRE
  const currentMaxScore = useMemo(() => {
    const isExam = selectedPeriod.toLowerCase().includes('examen');
    if (currentSubject) {
      return isExam ? (currentSubject.maxExamen || currentSubject.maxScore * 2) : currentSubject.maxScore;
    }
    return isExam ? 40 : 20;
  }, [currentSubject, selectedPeriod]);

  // Synchronisation des cotes existantes
  useEffect(() => {
    if (!selectedClassId) return;
    const scores: Record<string, number> = {};
    for (const c of allCotes) {
      if (
        c.classeId === selectedClassId &&
        c.periode === selectedPeriod &&
        (selectedSubjectId === 'ALL' || c.matiereId === selectedSubjectId)
      ) {
        if (c.eleveId && c.score !== undefined) {
          scores[c.eleveId] = c.score;
        }
      }
    }
    setScoresMap(scores);
  }, [selectedClassId, selectedPeriod, selectedSubjectId, allCotes]);

  // FILTRAGE PAR RECHERCHE ET PAGINATION
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return classStudents;
    const q = searchQuery.toLowerCase();
    return classStudents.filter(e =>
      `${e.prenom} ${e.nom} ${e.postnom || ''} ${e.registrationNumber}`.toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  const { paginated: paginatedStudents, ...studentsPagination } = usePagination(filteredStudents, { defaultPageSize: 10 });

  // STATISTIQUES EN TEMPS RÉEL
  const stats = useMemo(() => {
    const totalCount = classStudents.length;
    let sumScores = 0;
    let ratedCount = 0;
    let passCount = 0;
    let maxObtained = 0;

    classStudents.forEach(st => {
      const val = scoresMap[st.id];
      if (val !== undefined && val !== null && !isNaN(val)) {
        sumScores += val;
        ratedCount++;
        if (val > maxObtained) maxObtained = val;
        const pct = currentMaxScore > 0 ? (val / currentMaxScore) * 100 : 0;
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
  }, [classStudents, scoresMap, currentMaxScore]);

  // Saisie de cote avec contrôle de la valeur max
  const handleScoreInput = (eleveId: string, inputVal: number) => {
    let val = inputVal;
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > currentMaxScore) val = currentMaxScore;

    setScoresMap(prev => ({
      ...prev,
      [eleveId]: val,
    }));
  };

  // Enregistrement dans SQLite
  const handleSaveGrades = async () => {
    if (!selectedClassId) return alert('Veuillez choisir une classe.');
    setSaving(true);
    try {
      const cotesToSave: Partial<Cote>[] = [];
      const isExam = selectedPeriod.toLowerCase().includes('examen');

      for (const student of classStudents) {
        const scoreVal = scoresMap[student.id];
        if (scoreVal !== undefined && scoreVal !== null) {
          cotesToSave.push({
            id: uuid(),
            eleveId: student.id,
            classeId: selectedClassId,
            matiereId: selectedSubjectId === 'ALL' ? (availableSubjects[0]?.id || '') : selectedSubjectId,
            periode: selectedPeriod,
            type: isExam ? 'EXAMEN' : 'INTERROGATION',
            score: scoreVal,
            maxScore: currentMaxScore,
            dateCote: new Date().toISOString().split('T')[0],
            titre: `${currentSubject?.nom || 'Matière'} - ${selectedPeriod}`,
          });
        }
      }

      for (const c of cotesToSave) {
        await LocalDatabaseService.addCote(c as Cote);
      }
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
        <div className="flex rounded-xl p-1 border gap-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Grille de Cotation
          </button>
          <button
            onClick={() => setActiveTab('bulletins')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'bulletins' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" /> Bulletins EPST RDC
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
                    { value: 'ALL', label: 'Toutes les matières enseignées' },
                    ...availableSubjects.map(s => ({ value: s.id, label: `${s.nom} (Max ${s.maxScore} pts)` }))
                  ]}
                />
              </div>

              {/* 5. ÉPREUVE / PÉRIODE / EXAMEN */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-black">5</span>
                  Période / Épreuve EPST
                </label>
                <CustomSelect
                  value={selectedPeriod}
                  onChange={(v) => setSelectedPeriod(v)}
                  options={PERIODS.map(p => ({ value: p, label: p }))}
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
                  <span>Barème Max: </span>
                  <strong className="font-mono text-sm">{currentMaxScore} pts</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintableModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Procès-Verbal (PV)
                </button>
                <button
                  onClick={handleSaveGrades}
                  disabled={saving}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer ${
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
                      <Save className="w-4 h-4" /> Enregistrer les Cotes
                    </>
                  )}
                </button>
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
                <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{stats.average} / {currentMaxScore}</p>
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
                Grille de Saisie · {currentClassObj?.nom || 'Classe'} · {selectedSalle !== 'ALL' ? `Salle: ${selectedSalle}` : 'Toutes les salles'} · {selectedPeriod}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                Saisie avec validation <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-white font-mono text-[10px]">Entrée</kbd>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b text-[11px] font-black uppercase text-slate-500" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                    <th className="p-3 w-12 text-center">N°</th>
                    <th className="p-3 min-w-[200px]">Élève (Nom & Prénoms)</th>
                    <th className="p-3 w-36">Matricule EPST</th>
                    <th className="p-3 w-20 text-center">Sexe</th>
                    <th className="p-3 w-40 text-center bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-x" style={{ borderColor: 'var(--border)' }}>
                      Cote Obtenue (Max {currentMaxScore})
                    </th>
                    <th className="p-3 w-24 text-center">% Pct</th>
                    <th className="p-3 w-32 text-center">Mention</th>
                    <th className="p-3 min-w-[180px]">Remarques / Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border)' }}>
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-400">
                        Aucun élève trouvé pour la salle et le filtre sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student, index) => {
                      const rawVal = scoresMap[student.id];
                      const hasScore = rawVal !== undefined && rawVal !== null;
                      const numScore = hasScore ? Number(rawVal) : 0;
                      const pct = currentMaxScore > 0 && hasScore ? (numScore / currentMaxScore) * 100 : 0;
                      const mention = getMention(pct);
                      const absoluteIndex = (studentsPagination.page - 1) * studentsPagination.pageSize + index + 1;

                      return (
                        <tr key={student.id} className="hover:bg-slate-500/5 transition-colors">
                          {/* N° */}
                          <td className="p-3 text-center font-mono font-bold text-slate-400">{absoluteIndex}</td>

                          {/* NOM & PRÉNOMS */}
                          <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                                {student.prenom[0]}{student.nom[0]}
                              </div>
                              <div className="truncate">
                                <div>{student.nom} {student.postnom} {student.prenom}</div>
                              </div>
                            </div>
                          </td>

                          {/* MATRICULE */}
                          <td className="p-3 font-mono text-[11px] text-slate-500">{student.registrationNumber}</td>

                          {/* SEXE */}
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${student.sexe === 'M' ? 'bg-blue-500/15 text-blue-500' : 'bg-pink-500/15 text-pink-500'}`}>
                              {student.sexe}
                            </span>
                          </td>

                          {/* CHAMP DE SAISIE DE COTE */}
                          <td className="p-2 text-center border-x bg-indigo-500/5" style={{ borderColor: 'var(--border)' }}>
                            <div className="flex items-center justify-center gap-1">
                              <NumberInput
                                value={hasScore ? rawVal : 0}
                                onChange={v => handleScoreInput(student.id, v)}
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
                                max={currentMaxScore}
                                placeholder="0"
                                className="w-20 text-center py-1.5 rounded-xl border text-sm font-black font-mono bg-white dark:bg-slate-900 shadow-2xs"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                              />
                              <span className="text-xs font-mono text-slate-400 font-bold">/ {currentMaxScore}</span>
                            </div>
                          </td>

                          {/* POURCENTAGE (%) */}
                          <td className="p-3 text-center font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {hasScore ? `${pct.toFixed(1)}%` : '-'}
                          </td>

                          {/* MENTION */}
                          <td className="p-3 text-center">
                            {hasScore ? (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${mention.color}`}>
                                {mention.code} ({mention.label.split(' ')[0]})
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">En attente</span>
                            )}
                          </td>

                          {/* REMARQUES */}
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Observation..."
                              value={remarksMap[student.id] || ''}
                              onChange={(e) => setRemarksMap({ ...remarksMap, [student.id]: e.target.value })}
                              className="w-full px-2.5 py-1 rounded-lg border text-xs bg-slate-500/10 focus:outline-none"
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
          <div
            className="p-6 rounded-2xl border space-y-4 shadow-xs"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Impression des Bulletins Scolaires RDC</h3>
                <p className="text-xs text-slate-400">Générez et imprimez les bulletins officiels conformes EPST RDC</p>
              </div>

              <div className="w-64">
                <CustomSelect
                  value={selectedClassId}
                  onChange={(v) => setSelectedClassId(v)}
                  options={classes.map(c => ({ value: c.id, label: `${c.nom} (${c.cycleId || 'EPST'})` }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {classStudents.map(student => (
                <div
                  key={student.id}
                  className="p-4 rounded-xl border flex items-center justify-between gap-3 shadow-2xs hover:shadow-md transition-all"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                      {student.prenom} {student.nom}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-mono">Matricule: {student.registrationNumber}</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStudentForBulletin(student);
                      setBulletinModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Award className="w-3.5 h-3.5" /> Bulletin PDF
                  </button>
                </div>
              ))}
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
          disciplineName={selectedSubjectId === 'ALL' ? 'Toutes les Disciplines' : subjects.find(s => s.id === selectedSubjectId)?.nom || 'Discipline'}
          students={classStudents}
          fullGradesMap={{ [selectedSubjectId]: scoresMap }}
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
