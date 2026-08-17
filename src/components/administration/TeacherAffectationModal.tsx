import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X, BookOpen, School, Award, Check, Plus, Clock, ShieldCheck,
  AlertCircle, UserCheck, CheckCircle2, Sparkles, Baby, GraduationCap,
  Trash2, Layers, AlertTriangle, Briefcase, Users, FileText,
  ChevronRight, Info,
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

// ── Catalogue matières EPST RDC ─────────────────────────────────────────────
const MATIERES_EPST_SECONDAIRE: string[] = [
  'Mathématiques', 'Physique Appliquée', 'Chimie Organique & Minérale',
  'Biologie & Sciences de la Vie (SVT)', 'Français (Grammaire & Littérature)',
  'Anglais Technique & Littéraire', 'Histoire de la RDC & Générale',
  'Géographie & Environnement', 'Informatique & TIC',
  'Éducation Civique & Morale (ECM)', 'Latin & Antiquités',
  'Philosophie & Éthique', 'Pédagogie & Didactique',
  'Psychologie de l\'Enfant & Adolescent', 'Comptabilité Générale',
  'Économie & Gestion d\'Entreprise', 'Droit & Législation Scolaire',
  'Dessin Technique & Croquis', 'Éducation Physique & Sport (EPS)',
  'Religion (Morale Chrétienne)', 'Langue Nationale (Lingala / Swahili)',
];

// Niveaux secondaire EPST RDC
const NIVEAUX_SECONDAIRE: string[] = [
  '7ème CTEB (1ère Secondaire)',
  '8ème CTEB (2ème Secondaire)',
  '1ère Humanités',
  '2ème Humanités',
  '3ème Humanités',
  '4ème Humanités',
];

// ── Rôles admin disponibles ───────────────────────────────────────────────────
const ROLES_ADMIN: SelectOption[] = [
  { value: 'PREFET',      label: 'Préfet des Études / Dir. Établissement', icon: ShieldCheck },
  { value: 'DE',          label: 'Directeur des Études (DE)', icon: ShieldCheck },
  { value: 'SURVEILLANT', label: 'Directeur de Discipline / Surveillant', icon: ShieldCheck },
  { value: 'COMPTABLE',   label: 'Comptable & Intendant Général', icon: Briefcase },
  { value: 'ADMIN',       label: 'Secrétaire / Admin Général', icon: FileText },
];

// Entrée affectation : Matière × Classe
interface CourseEntry {
  matiere: string;
  classe: string; // 'TOUTES' ou nom de classe spécifique
}

// ── Détection du mode (ADMIN / ENSEIGNANT) ────────────────────────────────────
type ModalMode = 'ADMIN' | 'ENSEIGNANT';
function detectMode(teacher: MembrePersonnel): ModalMode {
  const adminRoles = ['PREFET', 'DE', 'SURVEILLANT', 'COMPTABLE', 'ADMIN', 'PROMOTEUR_ADMIN', 'PREFET_DIRECTEUR', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE', 'COMPTABLE_INTENDANT', 'SECRETAIRE', 'INTENDANT'];
  return adminRoles.includes(teacher.role || '') ? 'ADMIN' : 'ENSEIGNANT';
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

  // ── Mode ADMIN ────────────────────────────────────────────────────────────
  const [adminRole, setAdminRole] = useState<string>('PREFET');
  const [adminDepartement, setAdminDepartement] = useState<string>('');
  const [adminResponsabilites, setAdminResponsabilites] = useState<string>('');

  // ── Mode ENSEIGNANT (Maternelle/Primaire) ─────────────────────────────────
  const [salleUnique, setSalleUnique] = useState<string>('');

  // ── Mode ENSEIGNANT (Secondaire) ─────────────────────────────────────────
  // Titularisation : une liste de noms de classes
  const [titularClasses, setTitularClasses] = useState<string[]>([]);
  const [addTitularValue, setAddTitularValue] = useState<string>('');

  // Affectations matières : liste d'entrées { matiere, classe }
  const [courseEntries, setCourseEntries] = useState<CourseEntry[]>([]);
  const [selClasse, setSelClasse] = useState<string>('TOUTES');
  const [selMatiere, setSelMatiere] = useState<string>('');
  const [customCourse, setCustomCourse] = useState<string>('');

  // Volume horaire
  const [volumeHoraire, setVolumeHoraire] = useState<number>(18);

  // UI
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ── Initialisation à l'ouverture ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !teacher) return;

    const detectedMode = detectMode(teacher);
    setMode(detectedMode);

    // ADMIN
    setAdminRole(teacher.role || 'PREFET');
    setAdminDepartement((teacher as any).departement || '');
    setAdminResponsabilites((teacher as any).responsabilites || '');

    // ENSEIGNANT cycle
    const cp = teacher.cyclePrincipal || 'SECONDAIRE';
    if (cp === 'MATERNELLE') setCycle('MATERNELLE');
    else if (cp === 'PRIMAIRE') setCycle('PRIMAIRE');
    else setCycle('SECONDAIRE');

    setSalleUnique(teacher.salleUniqueId || teacher.classeTitulaireId || '');

    const initTituls: string[] = teacher.classesTitularisees || (teacher.classeTitulaireId ? [teacher.classeTitulaireId] : []);
    setTitularClasses(Array.from(new Set(initTituls.filter(Boolean))));

    // Restaurer les affectations précédentes
    const prevEntries: CourseEntry[] = [];
    const prevCours: string[] = teacher.coursAttribues || teacher.disciplines || [];
    prevCours.forEach(c => {
      // Format: "Matière (Classe)" ou "Matière"
      const match = c.match(/^(.+?)\s+\((.+?)\)$/);
      if (match) {
        prevEntries.push({ matiere: match[1].trim(), classe: match[2].trim() });
      } else {
        prevEntries.push({ matiere: c.trim(), classe: 'TOUTES' });
      }
    });
    setCourseEntries(prevEntries);

    setVolumeHoraire(teacher.volumeHoraireHebdo || 18);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelMatiere('');
    setSelClasse('TOUTES');
    setAddTitularValue('');

    // Charger données SQLite
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
    }).catch(() => {
      setClassesList([]);
      setDbSubjects([]);
      setAllStaffList([]);
    });
  }, [isOpen, teacher]);

  // ── Carte d'occupation des titulaires (hors moi) ──────────────────────────
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

  // ── Carte d'occupation des matières par classe (hors moi) ─────────────────
  // map[classe_lower][matiere_lower] = staffName
  const subjectClassMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    allStaffList.forEach(s => {
      if (s.id === teacher.id) return;
      const cours: string[] = s.coursAttribues || s.disciplines || [];
      cours.forEach(c => {
        const match = c.match(/^(.+?)\s+\((.+?)\)$/);
        let matiere = '';
        let classe = 'TOUTES';
        if (match) { matiere = match[1].trim().toLowerCase(); classe = match[2].trim().toLowerCase(); }
        else { matiere = c.trim().toLowerCase(); }

        if (classe !== 'toutes') {
          if (!map[classe]) map[classe] = {};
          if (!map[classe][matiere]) map[classe][matiere] = `${s.prenom} ${s.nom}`.trim();
        }
      });
    });
    return map;
  }, [allStaffList, teacher.id]);

  // ── Options listes déroulantes ────────────────────────────────────────────
  const allClassNames: string[] = useMemo(() => {
    return Array.from(new Set(classesList.map(c => c.nom)));
  }, [classesList]);

  const salleUniqueOptions: SelectOption[] = useMemo(() => {
    const defaults = cycle === 'MATERNELLE'
      ? ['1ère Maternelle (Petite Section)', '2ème Maternelle (Moyenne Section)', '3ème Maternelle (Grande Section)']
      : ['1ère Année Primaire A', '1ère Année Primaire B', '2ème Année Primaire A', '2ème Année Primaire B',
         '3ème Année Primaire A', '3ème Année Primaire B', '4ème Année Primaire A', '4ème Année Primaire B',
         '5ème Année Primaire A', '5ème Année Primaire B', '6ème Année Primaire A', '6ème Année Primaire B'];
    const combined = Array.from(new Set([...defaults, ...allClassNames]));
    return [
      { value: '', label: `— Choisir la classe ${cycle === 'MATERNELLE' ? 'de Maternelle' : 'Primaire (1ère→6ème)'} —` },
      ...combined.map(n => ({ value: n, label: n })),
    ];
  }, [cycle, allClassNames]);

  const titularOptions: SelectOption[] = useMemo(() => {
    const secondary = Array.from(new Set([...NIVEAUX_SECONDAIRE, ...allClassNames]));
    return [
      { value: '', label: '— Sélectionner une classe à titulariser —' },
      ...secondary
        .filter(n => !titularClasses.includes(n))
        .map(n => {
          const existing = titularMap[n.trim().toLowerCase()];
          return {
            value: n,
            label: existing ? `${n}  ⚠ Titulaire: ${existing.name}` : `${n}  ✓ Disponible`,
          };
        }),
    ];
  }, [allClassNames, titularClasses, titularMap]);

  const classeForSubjectOptions: SelectOption[] = useMemo(() => {
    const secondary = Array.from(new Set([...NIVEAUX_SECONDAIRE, ...allClassNames]));
    return [
      { value: 'TOUTES', label: 'Toutes les classes (Enseignement Général)' },
      ...secondary.map(n => ({ value: n, label: n })),
    ];
  }, [allClassNames]);

  const matiereOptions: SelectOption[] = useMemo(() => {
    const all = Array.from(new Set([...MATIERES_EPST_SECONDAIRE, ...dbSubjects]));
    const used = courseEntries.filter(e => e.classe === selClasse || selClasse === 'TOUTES').map(e => e.matiere.toLowerCase());
    const result: SelectOption[] = [{ value: '', label: '— Sélectionner la matière à affecter —' }];
    all.forEach(m => {
      if (used.includes(m.toLowerCase())) return;
      let suffix = '';
      if (selClasse !== 'TOUTES') {
        const conflict = subjectClassMap[selClasse.toLowerCase()]?.[m.toLowerCase()];
        if (conflict) suffix = `  ⚠ Prof: ${conflict}`;
      }
      result.push({ value: m, label: `${m}${suffix}` });
    });
    return result;
  }, [dbSubjects, courseEntries, selClasse, subjectClassMap]);

  // ── Gestion Titularisation (secondaire) ──────────────────────────────────
  const addTitularClass = (cls: string) => {
    if (!cls || titularClasses.includes(cls)) return;
    setTitularClasses(prev => [...prev, cls]);
    setAddTitularValue('');
  };
  const removeTitularClass = (cls: string) => setTitularClasses(prev => prev.filter(c => c !== cls));

  // ── Gestion Matières ──────────────────────────────────────────────────────
  const addCourseEntry = (matiere: string) => {
    if (!matiere) return;

    // Vérification d'unicité : si on sélectionne une classe spécifique
    if (selClasse !== 'TOUTES') {
      const conflict = subjectClassMap[selClasse.toLowerCase()]?.[matiere.toLowerCase()];
      if (conflict) {
        setErrorMsg(`⚠ "${matiere}" est déjà enseigné en "${selClasse}" par ${conflict}. Un seul prof par matière/classe.`);
        setTimeout(() => setErrorMsg(null), 5000);
        setSelMatiere('');
        return;
      }
      // Doublon dans la liste actuelle
      const alreadyHere = courseEntries.find(e => e.matiere.toLowerCase() === matiere.toLowerCase() && e.classe === selClasse);
      if (alreadyHere) { setSelMatiere(''); return; }
    }

    setCourseEntries(prev => [...prev, { matiere, classe: selClasse }]);
    setSelMatiere('');
  };

  const addCustomEntry = () => {
    const trimmed = customCourse.trim();
    if (!trimmed) return;
    addCourseEntry(trimmed);
    setCustomCourse('');
  };

  const removeCourseEntry = (idx: number) => {
    setCourseEntries(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Soumission ────────────────────────────────────────────────────────────
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

        // Formatter les cours
        const coursFormatted = courseEntries.map(e =>
          e.classe !== 'TOUTES' ? `${e.matiere} (${e.classe})` : e.matiere
        );

        // Dés-titulariser ancien titulaire si conflit
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
      setSuccessMsg('Affectations enregistrées avec succès dans la base de données.');
      if (onSaveSuccess) onSaveSuccess(merged as MembrePersonnel);
      setTimeout(() => onClose(), 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isAdminRole = mode === 'ADMIN';

  return createPortal(
    <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in select-none">
      <div
        className="w-full max-w-3xl max-h-[94vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* ── EN-TÊTE ── */}
        <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Contrat & Affectations Officielles
                <Sparkles className="inline ml-2 w-4 h-4 text-amber-500" />
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {teacher.prenom} {teacher.nom} · {teacher.numeroMatriculeEPST || teacher.matricule || 'Matricule non attribué'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-500/10 transition-colors cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── FORMULAIRE ── */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* ALERTES */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ── SÉLECTEUR DE MODE ── */}
          <div>
            <label className="block font-black uppercase tracking-wider text-[10.5px] mb-2" style={{ color: 'var(--text-secondary)' }}>
              Type de Poste / Régime de Travail
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'ENSEIGNANT', label: 'Enseignant / Pédagogique', icon: GraduationCap, desc: 'Maternelle, Primaire, Secondaire' },
                { id: 'ADMIN', label: 'Personnel Administratif', icon: Briefcase, desc: 'Préfet, Comptable, Secrétaire, DD...' },
              ] as const).map(m => {
                const active = mode === m.id;
                const Icon = m.icon;
                return (
                  <button key={m.id} type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-4 rounded-2xl border text-left font-bold transition-all cursor-pointer flex items-start gap-3 ${
                      active ? 'bg-indigo-600 text-white shadow-md border-indigo-500' : 'hover:bg-slate-500/10 text-slate-500'
                    }`}
                    style={!active ? { background: 'var(--bg-sunken)', borderColor: 'var(--border)' } : undefined}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-white' : 'text-indigo-500'}`} />
                    <div>
                      <p className={`text-xs font-black ${active ? 'text-white' : ''}`}>{m.label}</p>
                      <p className={`text-[10.5px] font-medium mt-0.5 ${active ? 'text-white/70' : 'text-slate-400'}`}>{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              MODE ADMIN
          ═══════════════════════════════════════════════════════════ */}
          {isAdminRole && (
            <div className="space-y-5 animate-fade-in">
              {/* Info */}
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-violet-500/20 shrink-0">
                  <Briefcase className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="font-black text-violet-600 dark:text-violet-400 text-xs">Poste Administratif — Règles EPST</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed font-medium">
                    Le personnel admin n'enseigne pas de matières scolaires. Définissez son rôle officiel et ses responsabilités institutionnelles.
                  </p>
                </div>
              </div>

              {/* Rôle admin */}
              <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h3 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Rôle Officiel & Autorité
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {ROLES_ADMIN.map(r => {
                    const active = adminRole === r.value;
                    const Icon = r.icon as React.ElementType;
                    return (
                      <button key={r.value} type="button"
                        onClick={() => setAdminRole(r.value)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                            : 'hover:bg-slate-500/10 border-transparent'
                        }`}
                        style={!active ? { borderColor: 'var(--border)', background: 'var(--bg-surface)' } : undefined}
                      >
                        {active
                          ? <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        }
                        <span className={active ? 'text-white font-black' : ''}>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Département & Responsabilités */}
              <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h3 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Département & Responsabilités
                </h3>
                <div>
                  <label className="block font-black text-[10px] uppercase text-slate-400 mb-1.5">
                    Département / Service Rattaché
                  </label>
                  <input
                    type="text"
                    value={adminDepartement}
                    onChange={e => setAdminDepartement(e.target.value)}
                    placeholder="ex: Direction Générale, Comptabilité & Finances, Secrétariat..."
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block font-black text-[10px] uppercase text-slate-400 mb-1.5">
                    Responsabilités & Missions
                  </label>
                  <textarea
                    value={adminResponsabilites}
                    onChange={e => setAdminResponsabilites(e.target.value)}
                    placeholder="Décrire les responsabilités principales du poste (gestion des finances, discipline, administration des inscriptions, etc.)..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold border outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none leading-relaxed"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MODE ENSEIGNANT
          ═══════════════════════════════════════════════════════════ */}
          {!isAdminRole && (
            <div className="space-y-6 animate-fade-in">

              {/* 1. Cycle pédagogique */}
              <div className="space-y-2">
                <label className="block font-black uppercase tracking-wider text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>
                  Cycle Pédagogique Principal (Régime EPST RDC)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: 'MATERNELLE', label: 'Maternelle', sub: 'Éveil (1ère→3ème)', icon: Baby },
                    { id: 'PRIMAIRE',   label: 'Primaire',   sub: 'Éd. de Base (1→6)', icon: School },
                    { id: 'SECONDAIRE', label: 'Secondaire', sub: '7è CTEB → 4è Hum.', icon: GraduationCap },
                  ] as const).map(c => {
                    const active = cycle === c.id;
                    const Icon = c.icon;
                    return (
                      <button key={c.id} type="button"
                        onClick={() => {
                          setCycle(c.id);
                          if (c.id !== 'SECONDAIRE') setVolumeHoraire(25);
                          else setVolumeHoraire(18);
                        }}
                        className={`p-4 rounded-2xl border text-center font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          active ? 'bg-indigo-600 text-white shadow-md border-indigo-500 scale-[1.02]'
                                 : 'hover:bg-slate-500/10 text-slate-500'
                        }`}
                        style={!active ? { background: 'var(--bg-sunken)', borderColor: 'var(--border)' } : undefined}
                      >
                        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-indigo-500'}`} />
                        <span className="text-xs font-black">{c.label}</span>
                        <span className={`text-[10px] font-medium ${active ? 'text-white/70' : 'text-slate-400'}`}>{c.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── CAS MATERNELLE / PRIMAIRE ─────────────────────────── */}
              {(cycle === 'MATERNELLE' || cycle === 'PRIMAIRE') && (
                <div className="p-5 rounded-2xl border space-y-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/25 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 shrink-0">
                      <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase">
                        Titulaire Exclusif de Salle — {cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed font-medium">
                        En {cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}, l'enseignant prend en charge{' '}
                        <strong>toutes les matières</strong> de sa salle et en est le <strong>seul titulaire</strong> (régime EPST).
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block font-black text-[10px] uppercase text-slate-400">
                      Salle de Classe Titularisée :
                    </label>
                    <CustomSelect
                      options={salleUniqueOptions}
                      value={salleUnique}
                      onChange={setSalleUnique}
                      placeholder={`Sélectionner une classe de ${cycle === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}...`}
                      searchable
                      creatable
                    />
                  </div>

                  {salleUnique && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] flex items-center justify-between">
                      <span>✓ Titulaire de <strong>{salleUnique}</strong> · {cycle === 'MATERNELLE' ? '25h' : '25h'} / semaine</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  )}

                  {/* Volume horaire */}
                  <div>
                    <label className="block font-black text-[10px] uppercase text-slate-400 mb-1.5">Volume Horaire / Semaine</label>
                    <NumberInput value={volumeHoraire} onChange={setVolumeHoraire} min={1} max={40} />
                  </div>
                </div>
              )}

              {/* ── CAS SECONDAIRE ───────────────────────────────────── */}
              {cycle === 'SECONDAIRE' && (
                <div className="space-y-5 animate-fade-in">

                  {/* A. Titularisation */}
                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                      <h3 className="text-[10.5px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Titularisation de Classe
                      </h3>
                      <div className="flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-semibold">Un seul titulaire par classe</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black text-[10px] uppercase text-slate-400">
                        Ajouter une classe à titulariser :
                      </label>
                      <CustomSelect
                        options={titularOptions}
                        value={addTitularValue}
                        onChange={v => { if (v) addTitularClass(v); setAddTitularValue(''); }}
                        placeholder="Sélectionner 7è CTEB, 1ère Hum., etc."
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
                                <span className="text-[10px] bg-rose-500/15 text-rose-500 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Ex-{conflict.name}
                                </span>
                              )}
                              <button type="button" onClick={() => removeTitularClass(cls)}
                                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 active:scale-90 transition-all cursor-pointer ml-1">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic font-medium">
                        Aucune titularisation — l'enseignant intervient sans responsabilité de classe titulaire.
                      </p>
                    )}
                  </div>

                  {/* B. Affectation Matières × Classe */}
                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                      <h3 className="text-[10.5px] font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Affectation Cours par Classe
                      </h3>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {courseEntries.length} Affectation(s)
                      </span>
                    </div>

                    {/* Légende règle */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold leading-relaxed">
                        <strong>Règle EPST :</strong> Une matière ne peut être enseignée que par <strong>un seul professeur</strong> par classe. Les conflits seront signalés en rouge.
                      </p>
                    </div>

                    {/* Sélecteur séquentiel : Classe → Matière */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-black text-[10px] uppercase text-slate-400 mb-1.5">
                          Étape 1 — Classe Cible
                        </label>
                        <CustomSelect
                          options={classeForSubjectOptions}
                          value={selClasse}
                          onChange={setSelClasse}
                          placeholder="Sélectionner la classe..."
                        />
                      </div>
                      <div>
                        <label className="block font-black text-[10px] uppercase text-slate-400 mb-1.5">
                          Étape 2 — Matière à Affecter
                        </label>
                        <CustomSelect
                          options={matiereOptions}
                          value={selMatiere}
                          onChange={v => { if (v) addCourseEntry(v); }}
                          placeholder="Sélectionner la matière..."
                          searchable
                        />
                      </div>
                    </div>

                    {/* Saisie matière personnalisée */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={customCourse}
                        onChange={e => setCustomCourse(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomEntry(); } }}
                        placeholder="Ou saisir une matière sur-mesure (ex: Dessin Industriel)..."
                        className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <button type="button" onClick={addCustomEntry}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                    </div>

                    {/* Tableau d'affectations */}
                    {courseEntries.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <label className="block font-black text-[10px] uppercase text-slate-400">
                          Affectations Confirmées ({courseEntries.length}) :
                        </label>
                        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ background: 'var(--bg-sunken)' }}>
                                <th className="text-left px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Matière / Cours</th>
                                <th className="text-left px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Classe(s)</th>
                                <th className="w-10 px-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {courseEntries.map((entry, idx) => {
                                const conflictInOthers = entry.classe !== 'TOUTES'
                                  ? subjectClassMap[entry.classe.toLowerCase()]?.[entry.matiere.toLowerCase()]
                                  : null;
                                return (
                                  <tr key={idx} className="border-t" style={{ borderColor: 'var(--border)' }}>
                                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>
                                      <span className="flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                        {entry.matiere}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {entry.classe === 'TOUTES' ? (
                                        <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-500 font-bold text-[10px]">Toutes les classes</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-black text-[10px] border border-indigo-500/20">
                                          {entry.classe}
                                        </span>
                                      )}
                                      {conflictInOthers && (
                                        <span className="ml-2 text-[10px] text-rose-500 font-bold flex items-center gap-1 inline-flex">
                                          <AlertTriangle className="w-3 h-3" /> {conflictInOthers}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2.5">
                                      <button type="button" onClick={() => removeCourseEntry(idx)}
                                        title="Retirer cette affectation"
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-500 transition-all cursor-pointer">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed text-center text-slate-400 font-semibold" style={{ borderColor: 'var(--border)' }}>
                        Aucune affectation encore. Utilisez le sélecteur Classe → Matière ci-dessus.
                      </div>
                    )}
                  </div>

                  {/* Volume Horaire */}
                  <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <label className="block font-black text-[10px] uppercase tracking-wider text-slate-400 mb-2">
                      <Clock className="inline w-3.5 h-3.5 mr-1" />
                      Volume Horaire Hebdomadaire (Heures / Semaine)
                    </label>
                    <NumberInput value={volumeHoraire} onChange={setVolumeHoraire} min={1} max={40} />
                    <p className="text-[11px] text-slate-400 mt-2 font-medium">
                      Norme EPST : Secondaire ≈ 18h/semaine pour un prof à temps plein.
                    </p>
                  </div>

                </div>
              )}
            </div>
          )}

          {/* ── BOUTONS D'ACTION ── */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl border font-bold text-xs hover:bg-slate-500/10 transition-colors cursor-pointer"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer les Affectations'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
