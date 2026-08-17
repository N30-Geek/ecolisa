import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookOpen,
  School,
  Award,
  Check,
  Plus,
  Clock,
  ShieldCheck,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Baby,
  GraduationCap,
  Trash2,
  Tag,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { MembrePersonnel, ClasseScolaire, RôleSystème } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { LocalDatabaseService } from '../../services/localDatabase';

interface TeacherAffectationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: MembrePersonnel;
  onSaveSuccess?: (updated: MembrePersonnel) => void;
}

// ── Catalogue par Défaut des Matières EPST RDC ─────────────────────────────────
const MATIERES_EPST_SECONDAIRE = [
  'Mathématiques',
  'Physique Appliquée',
  'Chimie Organique & Minérale',
  'Biologie & SVT',
  'Français (Grammaire & Littérature)',
  'Anglais Technique & Littéraire',
  'Histoire de la RDC & Générale',
  'Géographie & Environnement',
  'Informatique & TIC',
  'Éducation Civique & Morale',
  'Latin & Antiquités',
  'Philosophie & Éthique',
  'Pédagogie & Didactique',
  'Psychologie de l’Enfant',
  'Comptabilité Générale',
  'Économie & Gestion d’Entreprise',
  'Droit & Législation Scolaire',
  'Dessin Technique & Croquis',
  'Éducation Physique & Sport (EPS)',
];

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'ENSEIGNANT', label: 'Enseignant / Professeur' },
  { value: 'TITULAIRE', label: 'Enseignant Titulaire de Classe' },
  { value: 'PREFET_DIRECTEUR', label: 'Préfet des Études / Directeur' },
  { value: 'DIRECTEUR_ETUDES', label: 'Directeur des Études (DE)' },
  { value: 'DIRECTEUR_DISCIPLINE', label: 'Directeur de Discipline' },
  { value: 'COMPTABLE', label: 'Comptable Intendant' },
  { value: 'SECRETAIRE', label: 'Secrétaire Administrateur' },
  { value: 'INTENDANT', label: 'Intendant Matériel & Caisse' },
];

export const TeacherAffectationModal: React.FC<TeacherAffectationModalProps> = ({
  isOpen,
  onClose,
  teacher,
  onSaveSuccess,
}) => {
  const [cycle, setCycle] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE'>('SECONDAIRE');
  const [classesList, setClassesList] = useState<ClasseScolaire[]>([]);
  const [dbSubjects, setDbSubjects] = useState<string[]>([]);
  const [allStaffList, setAllStaffList] = useState<MembrePersonnel[]>([]);

  // State du formulaire
  const [salleUnique, setSalleUnique] = useState<string>('');
  
  // Multi-titularisation pour l'enseignant (Un seul titulaire par classe/option au niveau école)
  const [selectedTitularClasses, setSelectedTitularClasses] = useState<string[]>([]);
  const [selectedTitularToAdd, setSelectedTitularToAdd] = useState<string>('');

  // Classes & Promotions assignées
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedClassToAdd, setSelectedClassToAdd] = useState<string>('');

  // Cours & Matières attribués
  const [selectedCours, setSelectedCours] = useState<string[]>([]);
  const [targetClassForSubject, setTargetClassForSubject] = useState<string>('TOUTES');
  const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState<string>('');
  const [customCourseInput, setCustomCourseInput] = useState<string>('');

  const [volumeHoraire, setVolumeHoraire] = useState<number>(18);
  const [systemRole, setSystemRole] = useState<RôleSystème>('ENSEIGNANT');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialisation à l'ouverture
  useEffect(() => {
    if (!isOpen || !teacher) return;

    const cycleP = teacher.cyclePrincipal || 'SECONDAIRE';
    if (cycleP === 'MATERNELLE') setCycle('MATERNELLE');
    else if (cycleP === 'PRIMAIRE') setCycle('PRIMAIRE');
    else setCycle('SECONDAIRE');

    setSalleUnique(teacher.salleUniqueId || teacher.classeTitulaireId || '');
    
    // Charger les classes titularisées
    const initTituls: string[] = teacher.classesTitularisees || (teacher.classeTitulaireId ? [teacher.classeTitulaireId] : []);
    setSelectedTitularClasses(Array.from(new Set(initTituls.filter(Boolean))));

    setSelectedClasses(teacher.classesAssignees || []);
    setSelectedCours(teacher.coursAttribues || teacher.disciplines || []);
    setVolumeHoraire(teacher.volumeHoraireHebdo || 18);
    setSystemRole((teacher.role as RôleSystème) || (initTituls.length > 0 ? 'TITULAIRE' : 'ENSEIGNANT'));
    setErrorMsg(null);
    setSuccessMsg(null);

    // Charger les données SQLite
    Promise.all([
      LocalDatabaseService.getClasses(),
      LocalDatabaseService.getSubjects(),
      LocalDatabaseService.getStaff(),
    ])
      .then(([cls, subs, stf]) => {
        setClassesList(cls || []);
        if (subs && subs.length > 0) {
          const names = Array.from(new Set(subs.map(s => s.nom)));
          setDbSubjects(names);
        }
        setAllStaffList(stf || []);
      })
      .catch(() => {
        setClassesList([]);
        setDbSubjects([]);
        setAllStaffList([]);
      });
  }, [isOpen, teacher]);

  // Carte des titulaires actuels par classe dans l'école (hors enseignant courant)
  const existingTitularsByClass = useMemo(() => {
    const map: Record<string, { staffId: string; staffName: string }> = {};
    allStaffList.forEach(s => {
      if (s.id === teacher.id) return;
      const tituls: string[] = s.classesTitularisees || (s.classeTitulaireId ? [s.classeTitulaireId] : []);
      tituls.forEach(cls => {
        if (cls) {
          map[cls.trim().toLowerCase()] = {
            staffId: s.id,
            staffName: `${s.prenom} ${s.nom}`.trim(),
          };
        }
      });
    });
    return map;
  }, [allStaffList, teacher.id]);

  // Si le cycle change pour Maternelle ou Primaire -> Titulaire unique de salle
  const handleCycleChange = (newCycle: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE') => {
    setCycle(newCycle);
    if (newCycle === 'MATERNELLE' || newCycle === 'PRIMAIRE') {
      setVolumeHoraire(25);
      if (newCycle === 'PRIMAIRE') {
        setSelectedCours([
          'Français (Lecture, Écriture & Grammaire)',
          'Mathématiques / Calcul & Géométrie',
          'Éveil Scientifique & Milieu',
          'Éducation Civique & Morale',
          'Calligraphie, Dessin & Travaux Manuels',
          'Éducation Physique & Santé',
        ]);
      } else {
        setSelectedCours([
          'Activités d’Éveil & Psychomotricité',
          'Langage & Communication Oral',
          'Sensorialité & Formes',
          'Dessin, Coloriage & Découpage',
          'Chants & Rondes',
        ]);
      }
    } else {
      setVolumeHoraire(18);
    }
  };

  // ── 1. GESTION DES TITULARISATIONS (UN SEUL TITULAIRE PAR CLASSE, MULTI-TITULARISATION PAR PROF) ──
  
  // Liste des options de titularisation à ajouter dans la liste déroulante CustomSelect
  const titularOptionsForSelect: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: '', label: '-- Sélectionner une classe/option à titulariser --' }
    ];
    
    classesList.forEach(cls => {
      const isAlreadyAdded = selectedTitularClasses.includes(cls.nom);
      if (!isAlreadyAdded) {
        const existing = existingTitularsByClass[cls.nom.trim().toLowerCase()];
        opts.push({
          value: cls.nom,
          label: existing
            ? `${cls.nom} (Titulaire actuel : ${existing.staffName})`
            : `${cls.nom} (Disponible)`,
          badge: existing ? `Titulaire : ${existing.staffName}` : 'Disponible'
        });
      }
    });
    return opts;
  }, [classesList, selectedTitularClasses, existingTitularsByClass]);

  // Ajout d'une titularisation depuis la liste déroulante
  const handleAddTitularClass = (clsNom: string) => {
    if (!clsNom) return;
    setSelectedTitularToAdd(clsNom);
    
    if (!selectedTitularClasses.includes(clsNom)) {
      setSelectedTitularClasses(prev => [...prev, clsNom]);
      // S'assurer également que cette classe est dans les classes assignées
      if (!selectedClasses.includes(clsNom)) {
        setSelectedClasses(prev => [...prev, clsNom]);
      }
      // Mettre à jour le rôle système vers TITULAIRE si nécessaire
      setSystemRole('TITULAIRE');
    }
    setTimeout(() => setSelectedTitularToAdd(''), 100);
  };

  // Retrait d'une titularisation
  const handleRemoveTitularClass = (clsNom: string) => {
    setSelectedTitularClasses(prev => {
      const next = prev.filter(c => c !== clsNom);
      if (next.length === 0 && systemRole === 'TITULAIRE') {
        setSystemRole('ENSEIGNANT');
      }
      return next;
    });
  };

  // ── 2. GESTION DES PROMOTIONS ET CLASSES ASSIGNÉES (LISTE DÉROULANTE CUSTOMSELECT) ──
  
  // Options de classes disponibles pour la liste déroulante
  const availableClassOptionsForSelect: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: '', label: '-- Choisir une classe/promotion dans la liste --' }
    ];
    classesList.forEach(cls => {
      if (!selectedClasses.includes(cls.nom)) {
        opts.push({
          value: cls.nom,
          label: `Classe : ${cls.nom} (${cls.salle || 'Salle principale'})`
        });
      }
    });
    return opts;
  }, [classesList, selectedClasses]);

  // Ajout d'une classe assignée via la liste déroulante
  const handleAddClassFromSelect = (clsNom: string) => {
    if (!clsNom) return;
    setSelectedClassToAdd(clsNom);

    if (!selectedClasses.includes(clsNom)) {
      setSelectedClasses(prev => [...prev, clsNom]);
    }
    setTimeout(() => setSelectedClassToAdd(''), 100);
  };

  // Retrait d'une classe assignée
  const handleRemoveClass = (clsNom: string) => {
    setSelectedClasses(prev => prev.filter(c => c !== clsNom));
    // Retirer également de la titularisation si elle y était
    if (selectedTitularClasses.includes(clsNom)) {
      handleRemoveTitularClass(clsNom);
    }
  };

  // Basculer l'assignation d'une classe via badge
  const toggleClassAssignment = (className: string) => {
    if (selectedClasses.includes(className)) {
      handleRemoveClass(className);
    } else {
      handleAddClassFromSelect(className);
    }
  };

  // ── 3. GESTION SÉQUENTIELLE DES MATIÈRES (CLASSE ➔ MATIÈRE) ──
  
  const classOptionsForSubject: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [
      { value: 'TOUTES', label: 'Toutes les classes / Enseignement Général' }
    ];
    selectedClasses.forEach(c => {
      opts.push({ value: c, label: `Classe : ${c}` });
    });
    if (selectedClasses.length === 0) {
      classesList.forEach(cls => {
        opts.push({ value: cls.nom, label: `Classe : ${cls.nom}` });
      });
    }
    return opts;
  }, [selectedClasses, classesList]);

  const subjectOptionsAvailable: SelectOption[] = useMemo(() => {
    const allSubjects = Array.from(new Set([...MATIERES_EPST_SECONDAIRE, ...dbSubjects]));
    const opts: SelectOption[] = [
      { value: '', label: '-- Choisir la matière à affecter --' }
    ];
    allSubjects.forEach(s => {
      const formatted = targetClassForSubject !== 'TOUTES'
        ? `${s} (${targetClassForSubject})`
        : s;

      const isAlreadyAdded = selectedCours.includes(formatted) || selectedCours.includes(s);
      if (!isAlreadyAdded) {
        opts.push({ value: s, label: s });
      }
    });
    return opts;
  }, [dbSubjects, selectedCours, targetClassForSubject]);

  const handleSelectSubjectToAdd = (subjectName: string) => {
    if (!subjectName) return;
    setSelectedSubjectToAdd(subjectName);

    const formatted = targetClassForSubject !== 'TOUTES'
      ? `${subjectName} (${targetClassForSubject})`
      : subjectName;

    if (!selectedCours.includes(formatted)) {
      setSelectedCours(prev => [...prev, formatted]);
      if (targetClassForSubject !== 'TOUTES' && !selectedClasses.includes(targetClassForSubject)) {
        setSelectedClasses(prev => [...prev, targetClassForSubject]);
      }
    }
    setTimeout(() => setSelectedSubjectToAdd(''), 100);
  };

  const addCustomCourse = () => {
    const trimmed = customCourseInput.trim();
    if (!trimmed) return;

    const formatted = targetClassForSubject !== 'TOUTES'
      ? `${trimmed} (${targetClassForSubject})`
      : trimmed;

    if (!selectedCours.includes(formatted)) {
      setSelectedCours(prev => [...prev, formatted]);
    }
    setCustomCourseInput('');
  };

  const removeCourse = (courseToRemove: string) => {
    setSelectedCours(prev => prev.filter(c => c !== courseToRemove));
  };

  // ── OPTIONS DE SALLE UNIQUE (MATERNELLE / PRIMAIRE 1ÈRE À 6ÈMÉ ANNEE) ──
  const salleUniqueOptions: SelectOption[] = useMemo(() => {
    const defaultList = cycle === 'MATERNELLE'
      ? [
          '1ère Maternelle (Petite Section)',
          '2ème Maternelle (Moyenne Section)',
          '3ème Maternelle (Grande Section)'
        ]
      : [
          '1ère Année Primaire A', '1ère Année Primaire B',
          '2ème Année Primaire A', '2ème Année Primaire B',
          '3ème Année Primaire A', '3ème Année Primaire B',
          '4ème Année Primaire A', '4ème Année Primaire B',
          '5ème Année Primaire A', '5ème Année Primaire B',
          '6ème Année Primaire A', '6ème Année Primaire B'
        ];
    
    const dbNames = classesList.map(c => c.nom);
    const combined = Array.from(new Set([...defaultList, ...dbNames]));
    
    return [
      { value: '', label: `-- Choisir la classe de ${cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire (1ère à 6ème)'} --` },
      ...combined.map(nom => ({
        value: nom,
        label: `Classe : ${nom}`
      }))
    ];
  }, [cycle, classesList]);

  // ── SOUMISSION ET ENREGISTREMENT (AVEC RÈGLE D'UNICITÉ DU TITULAIRE PAR CLASSE) ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const isPrimaryOrMaternelle = cycle === 'MATERNELLE' || cycle === 'PRIMAIRE';
      const finalTituls = isPrimaryOrMaternelle
        ? (salleUnique ? [salleUnique] : [])
        : selectedTitularClasses;
      
      const primaryTitular = finalTituls[0] || '';
      const isTitular = isPrimaryOrMaternelle ? (salleUnique ? true : false) : finalTituls.length > 0;

      // Règle d'unicité : Si l'une des classes titularisées appartenait à un autre prof, lui retirer la titularisation sans bloquer
      for (const clsNom of finalTituls) {
        try {
          const clsLower = clsNom.trim().toLowerCase();
          const existing = existingTitularsByClass[clsLower];
          if (existing && existing.staffId !== teacher.id) {
            const otherStaff = allStaffList.find(s => s.id === existing.staffId);
            if (otherStaff) {
              const updatedOtherTituls = (otherStaff.classesTitularisees || []).filter(
                c => c.trim().toLowerCase() !== clsLower
              );
              await LocalDatabaseService.updateStaff(otherStaff.id, {
                classesTitularisees: updatedOtherTituls,
                classeTitulaireId: updatedOtherTituls[0] || '',
                estTitulaire: updatedOtherTituls.length > 0,
              });
            }
          }
        } catch (subErr) {
          console.warn('[TeacherAffectationModal] Avertissement désaffectation ancien titulaire :', subErr);
        }
      }

      const updates: Partial<MembrePersonnel> = {
        cyclePrincipal: cycle === 'MATERNELLE' ? 'MATERNELLE' : cycle === 'PRIMAIRE' ? 'PRIMAIRE' : 'SECONDAIRE',
        salleUniqueId: isPrimaryOrMaternelle ? salleUnique : undefined,
        estTitulaire: isTitular,
        classeTitulaireId: primaryTitular,
        classesTitularisees: finalTituls,
        optionTitulaireCode: primaryTitular,
        classesAssignees: isPrimaryOrMaternelle ? (salleUnique ? [salleUnique] : []) : selectedClasses,
        coursAttribues: selectedCours,
        disciplines: selectedCours,
        volumeHoraireHebdo: volumeHoraire,
        role: systemRole as any,
      };

      const updated = await LocalDatabaseService.updateStaff(teacher.id, updates);
      const mergedTeacher = { ...teacher, ...updates, ...(updated || {}) };

      setSuccessMsg("Les affectations et titularisations ont été enregistrées avec succès.");
      if (onSaveSuccess) onSaveSuccess(mergedTeacher);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('[TeacherAffectationModal] Erreur de sauvegarde :', err);
      setErrorMsg(err?.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* EN-TÊTE MODALE */}
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span>Affectations & Titularisations Enseignant</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {teacher.prenom} {teacher.nom} · Matricule : {teacher.numeroMatriculeEPST || teacher.matricule || 'Non attribué'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORMULAIRE INTERACTIF */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── 1. CHOIX DU CYCLE PÉDAGOGIQUE EPST ── */}
          <div className="space-y-2">
            <label className="block font-black text-slate-400 uppercase tracking-wider text-[10.5px]">
              1. Cycle d'Enseignement Principal (Régime EPST)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'MATERNELLE', label: 'Maternelle (Éveil)', icon: Baby },
                { id: 'PRIMAIRE', label: 'Primaire (Éd. de Base)', icon: School },
                { id: 'SECONDAIRE', label: 'Secondaire & Humanités', icon: GraduationCap },
              ].map(c => {
                const active = cycle === c.id;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCycleChange(c.id as any)}
                    className={`p-3.5 rounded-2xl border text-center font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 border-indigo-500 scale-[1.02]'
                        : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'
                    }`}
                    style={!active ? { background: 'var(--bg-sunken)', borderColor: 'var(--border)' } : undefined}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-indigo-500'}`} />
                    <span className="text-xs font-black">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. CAS PRIMAIRE / MATERNELLE : SALLE ET TITULARISATION UNIQUE ── */}
          {(cycle === 'MATERNELLE' || cycle === 'PRIMAIRE') && (
            <div className="space-y-4 animate-fade-in p-5 rounded-2xl border bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                    Titularisation Unique de Salle ({cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'})
                  </h3>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                    En Primaire et Maternelle, l'enseignant prend en charge <strong>toutes les matières et activités</strong> de sa salle et en est le <strong>titulaire exclusif</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block font-black text-slate-700 dark:text-slate-200">
                  Sélectionner la Salle de Classe Titularisée :
                </label>
                <CustomSelect
                  options={salleUniqueOptions}
                  value={salleUnique}
                  onChange={setSalleUnique}
                  placeholder={`Sélectionner une classe de ${cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire (1ère à 6ème)'}...`}
                  searchable
                  creatable
                />
              </div>

              <div className="p-3 rounded-xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-between">
                <span>Régime Pédagogique : Titulaire de Salle Exclusif (25 Heures / Semaine)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
          )}

          {/* ── 3. CAS SECONDAIRE & HUMANITÉS : TITULARISATION MULTIPLE & UNICITÉ PAR CLASSE ── */}
          {cycle === 'SECONDAIRE' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* LOGIQUE DE TITULARISATION OPTIMISÉE (LISTE DÉROULANTE + MULTI-TITULARISATION) */}
              <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="text-xs font-black uppercase text-indigo-500 flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" /> 2. Titularisation de Classe ou d'Option
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Règle EPST : <strong>Un seul titulaire par classe</strong>, mais un enseignant peut titulariser <strong>plusieurs classes</strong>.
                    </p>
                  </div>
                  {selectedTitularClasses.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      ★ {selectedTitularClasses.length} classe(s) titularisée(s)
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block font-black text-slate-400 uppercase text-[10px]">
                    Sélectionner une classe/option à titulariser (via liste déroulante) :
                  </label>
                  <CustomSelect
                    options={titularOptionsForSelect}
                    value={selectedTitularToAdd}
                    onChange={handleAddTitularClass}
                    placeholder="Sélectionner une classe/option à titulariser..."
                    searchable
                  />
                </div>

                {/* BADGES DES CLASSES TITULARISÉES AVEC BOUTON DE SUPPRESSION ROUGE OPTIMISÉ */}
                {selectedTitularClasses.length > 0 && (
                  <div className="pt-2 space-y-2">
                    <label className="block font-black text-amber-500 uppercase text-[10px]">
                      Classes Titularisées pour cet Enseignant ({selectedTitularClasses.length}) :
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedTitularClasses.map(clsNom => {
                        const existing = existingTitularsByClass[clsNom.trim().toLowerCase()];
                        return (
                          <div
                            key={clsNom}
                            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/35 shadow-xs"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{clsNom}</span>
                            
                            {/* Avertissement de remplacement de titulaire */}
                            {existing && (
                              <span className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-500" />
                                <span>Ex-{existing.staffName}</span>
                              </span>
                            )}

                            {/* Bouton de retrait optimisé */}
                            <button
                              type="button"
                              onClick={() => handleRemoveTitularClass(clsNom)}
                              title={`Retirer la titularisation de "${clsNom}"`}
                              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 active:scale-90 transition-all cursor-pointer ml-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* AFFECTATION DES PROMOTIONS ET CLASSES (LISTE DÉROULANTE CUSTOMSELECT + BOUTONS) */}
              <div className="space-y-3 p-5 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <School className="w-4 h-4 text-indigo-500" /> 3. Promotions & Classes Intervenues / Attribuées
                  </h3>
                  <span className="text-[10.5px] font-bold text-slate-400">
                    Sélection via Liste Déroulante ou Puces
                  </span>
                </div>

                {/* SÉLECTEUR DE CLASSE PAR LISTE DÉROULANTE CUSTOMSELECT */}
                <div className="space-y-2">
                  <label className="block font-black text-slate-400 uppercase text-[10px]">
                    Sélectionner une classe à ajouter dans la liste déroulante :
                  </label>
                  <CustomSelect
                    options={availableClassOptionsForSelect}
                    value={selectedClassToAdd}
                    onChange={handleAddClassFromSelect}
                    placeholder="Choisir une classe/promotion..."
                    searchable
                  />
                </div>

                {/* BADGES DES CLASSES ASSIGNÉES AVEC BOUTON DE SUPPRESSION OPTIMISÉ */}
                <div className="pt-2 space-y-2">
                  <label className="block font-black text-slate-400 uppercase text-[10px]">
                    Classes Actuellement Attribuées ({selectedClasses.length}) :
                  </label>

                  {selectedClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {selectedClasses.map(clsNom => (
                        <div
                          key={clsNom}
                          className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 shadow-xs"
                        >
                          <School className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{clsNom}</span>
                          
                          {/* Bouton de suppression de la classe */}
                          <button
                            type="button"
                            onClick={() => handleRemoveClass(clsNom)}
                            title={`Retirer la classe "${clsNom}"`}
                            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 active:scale-90 transition-all cursor-pointer ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed text-center text-slate-400 font-semibold" style={{ borderColor: 'var(--border)' }}>
                      Aucune classe assignée pour l'instant. Choisissez une classe dans la liste déroulante ci-dessus.
                    </div>
                  )}
                </div>
              </div>

              {/* AFFECTATION SÉQUENTIELLE PAR LISTES DÉROULANTES (CLASSE ➔ MATIÈRE) */}
              <div className="space-y-4 p-5 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-500" /> 4. Sélection & Affectation des Matières par Classe
                  </h3>
                  <span className="text-[10.5px] font-bold text-slate-400">
                    Sélecteur séquentiel (Classe ➔ Matière)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* 1ÈRE LISTE DÉROULANTE : SELECTION CLASSE CIBLE */}
                  <div>
                    <label className="block font-black text-slate-400 uppercase text-[10px] mb-1">
                      Étape A : Sélectionner la Classe Cible
                    </label>
                    <CustomSelect
                      options={classOptionsForSubject}
                      value={targetClassForSubject}
                      onChange={setTargetClassForSubject}
                      placeholder="Sélectionner la classe..."
                    />
                  </div>

                  {/* 2ÈMED LISTE DÉROULANTE : SELECTION MATIERE À AFFECTER */}
                  <div>
                    <label className="block font-black text-slate-400 uppercase text-[10px] mb-1">
                      Étape B : Sélectionner la Matière à Ajouter
                    </label>
                    <CustomSelect
                      options={subjectOptionsAvailable}
                      value={selectedSubjectToAdd}
                      onChange={handleSelectSubjectToAdd}
                      placeholder="Sélectionner la matière..."
                      searchable
                    />
                  </div>
                </div>

                {/* Saisie rapide de matière personnalisée */}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={customCourseInput}
                    onChange={e => setCustomCourseInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCourse(); } }}
                    placeholder="Ou saisir une matière sur-mesure (ex: Dessin Industriel)..."
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={addCustomCourse}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Ajouter</span>
                  </button>
                </div>

                {/* OPTIMISATION DES BADGES ET DU BOUTON D'ANNULATION DES MATIÈRES */}
                <div className="pt-2">
                  <label className="block font-black text-slate-400 uppercase text-[10px] mb-2">
                    Matières Pédagogiques Attribuées ({selectedCours.length}) :
                  </label>

                  {selectedCours.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {selectedCours.map(coursName => (
                        <div
                          key={coursName}
                          className="group relative flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 shadow-xs transition-all hover:border-indigo-500/50"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{coursName}</span>
                          
                          {/* Bouton d'annulation optimisé avec icône de suppression rouge au survol */}
                          <button
                            type="button"
                            onClick={() => removeCourse(coursName)}
                            title={`Retirer la matière "${coursName}"`}
                            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 active:scale-90 transition-all cursor-pointer ml-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-dashed text-center text-slate-400 font-semibold" style={{ borderColor: 'var(--border)' }}>
                      Aucune matière affectée pour l'instant. Utilisez les deux listes déroulantes ci-dessus pour ajouter des cours.
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* ── 4. VOLUME HORAIRE HEBDOMADAIRE & RÔLE SYSTÈME ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="block font-black text-slate-400 uppercase tracking-wider text-[10.5px] mb-1.5">
                Volume Horaire Hebdomadaire (Heures / Semaine)
              </label>
              <NumberInput
                value={volumeHoraire}
                onChange={setVolumeHoraire}
                min={1}
                max={40}
              />
            </div>

            <div>
              <label className="block font-black text-slate-400 uppercase tracking-wider text-[10.5px] mb-1.5">
                Rôle Système & Autorisations
              </label>
              <CustomSelect
                options={ROLE_OPTIONS}
                value={systemRole}
                onChange={(val) => setSystemRole(val as RôleSystème)}
              />
            </div>
          </div>

          {/* BOUTONS D'ACTION DU PIED DE PAGE */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4.5 h-4.5 text-white" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer l\'Affectation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
