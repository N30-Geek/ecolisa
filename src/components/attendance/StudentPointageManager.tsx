import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Users2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  CalendarCheck,
  X,
} from 'lucide-react';
import { LocalDatabaseService, UserSession } from '../../services/localDatabase';
import { Eleve, ClasseScolaire, Presence, SessionPointage, StatutPresence, MembrePersonnel } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';

const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const SESSION_OPTIONS: SelectOption[] = [
  { value: 'JOURNEE', label: 'Journée complète' },
  { value: 'MATIN', label: 'Matin' },
  { value: 'APRES_MIDI', label: 'Après-midi' },
];

const STATUS_CYCLE: (StatutPresence | null)[] = [null, 'PRESENT', 'ABSENT', 'RETARD', 'JUSTIFIE'];

const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const toISODate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

interface StudentPointageManagerProps {
  activeSchoolYear?: string;
  activeSchoolYearId?: string;
  currentUser?: UserSession | null;
}

export const StudentPointageManager: React.FC<StudentPointageManagerProps> = ({ activeSchoolYear, activeSchoolYearId, currentUser }) => {
  const [monthDate, setMonthDate] = useState<Date>(new Date());
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [session, setSession] = useState<SessionPointage>('JOURNEE');
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [yearId, setYearId] = useState<string>(activeSchoolYearId || '');
  const [staffMember, setStaffMember] = useState<MembrePersonnel | null>(null);
  const [allowedClassIds, setAllowedClassIds] = useState<Set<string> | null>(null);
  const [justificationModal, setJustificationModal] = useState<{
    eleveId: string;
    date: string;
    currentStatus: StatutPresence | null;
  } | null>(null);
  const [justificationText, setJustificationText] = useState('');

  const pointePar = useMemo(() => currentUser?.nom || currentUser?.email || 'Système', [currentUser]);

  const isRestrictedUser = useMemo(() => {
    return currentUser?.role === 'TITULAIRE' || currentUser?.role === 'ENSEIGNANT';
  }, [currentUser]);

  useEffect(() => {
    const load = async () => {
      const [cls, yrs, staffList] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSchoolYears(),
        LocalDatabaseService.getStaff().catch(() => []),
      ]);
      const allClasses = cls || [];
      setClasses(allClasses);
      const active = yrs.find((y) => y.statut === 'EN_COURS') || yrs[0];
      if (active) setYearId(active.id);

      if (currentUser?.role === 'TITULAIRE' || currentUser?.role === 'ENSEIGNANT') {
        const fullName = currentUser.nom?.toLowerCase().trim() || '';
        const match = (staffList || []).find((s) =>
          (s.email && s.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
          (fullName && `${(s.prenom || '').toLowerCase()} ${(s.nom || '').toLowerCase()}`.trim() === fullName)
        );
        if (match) {
          setStaffMember(match);
          // Résoudre les classes autorisées (id, nom, ou matière via coursAttribues)
          const allowedIds = new Set<string>();
          const classByName = new Map<string, ClasseScolaire>();
          allClasses.forEach(c => {
            if (c.id) classByName.set(c.id.toLowerCase().trim(), c);
            if (c.nom) classByName.set(c.nom.toLowerCase().trim(), c);
          });

          const resolveClass = (value: string) => {
            if (!value) return undefined;
            const v = value.trim().toLowerCase();
            return classByName.get(v) || allClasses.find(c => c.nom.toLowerCase().trim() === v || c.id.toLowerCase().trim() === v);
          };

          [match.classeTitulaireId, ...(match.classesTitularisees || []), ...(match.classesAssignees || [])]
            .filter((v): v is string => !!v)
            .forEach(v => {
              const cls = resolveClass(v);
              if (cls) allowedIds.add(cls.id);
            });

          // Extraire les classes des cours (format "Matière (Classe)")
          (match.coursAttribues || match.disciplines || []).forEach(c => {
            const m = c.match(/^(.+?)\s+\((.+?)\)$/);
            const clsName = m ? m[2].trim() : c.trim();
            const cls = resolveClass(clsName);
            if (cls) allowedIds.add(cls.id);
          });

          // Ajouter les classes issues de l'emploi du temps
          try {
            const schedule = await LocalDatabaseService.getSchedules({ teacherId: match.id });
            schedule.forEach(s => {
              if (s.classeId) allowedIds.add(s.classeId);
              const cls = allClasses.find(c => c.nom === s.nomClasse);
              if (cls) allowedIds.add(cls.id);
            });
          } catch (e) {}

          setAllowedClassIds(allowedIds);
          const firstAllowed = allClasses.find((c) => allowedIds.has(c.id));
          setSelectedClasseId(firstAllowed?.id || '');
        } else {
          setSelectedClasseId('');
        }
      } else if (allClasses.length && !selectedClasseId) {
        setSelectedClasseId(allClasses[0].id);
      }
    };
    load();
  }, []);

  const days = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const res: { day: number; date: string; label: string }[] = [];
    const dayNames = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, month, d);
      res.push({
        day: d,
        date: toISODate(date),
        label: dayNames[date.getDay()],
      });
    }
    return res;
  }, [monthDate]);

  const loadPresences = async () => {
    if (!selectedClasseId || !yearId) return;
    setLoading(true);
    try {
      const dateDebut = days[0]?.date;
      const dateFin = days[days.length - 1]?.date;
      const all = await LocalDatabaseService.getPresences({
        classeId: selectedClasseId,
        anneeScolaireId: yearId,
        dateDebut,
        dateFin,
        session,
      });
      setPresences(all || []);
      const sts = await LocalDatabaseService.getEleves();
      const classStudents = (sts || []).filter((e) => e.classId === selectedClasseId || e.nomClasse === classes.find((c) => c.id === selectedClasseId)?.nom);
      setStudents(classStudents.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
    } catch (e) {
      console.warn('[StudentPointageManager] Erreur chargement :', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPresences();
  }, [selectedClasseId, session, monthDate, yearId]);

  const presenceMap = useMemo(() => {
    const map = new Map<string, Presence>();
    presences.forEach((p) => {
      if (!p.eleveId || !p.dateJour) return;
      map.set(`${p.eleveId}__${p.dateJour}`, p);
    });
    return map;
  }, [presences]);

  const getStatus = (eleveId: string, date: string) => presenceMap.get(`${eleveId}__${date}`)?.statut || null;

  const toggleStatus = async (eleveId: string, date: string, current: StatutPresence | null) => {
    const idx = STATUS_CYCLE.indexOf(current);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    const existing = presenceMap.get(`${eleveId}__${date}`);

    // Si on passe à JUSTIFIE, ouvrir le modal de justification
    if (next === 'JUSTIFIE') {
      setJustificationModal({ eleveId, date, currentStatus: current });
      setJustificationText(existing?.motif || '');
      return;
    }

    setSaving(true);
    try {
      if (next === null && existing) {
        // Supprimer l'enregistrement existant
        await LocalDatabaseService.deletePresence(existing.id);
        setPresences((prev) => prev.filter((x) => x.id !== existing.id));
      } else {
        const p: Presence = {
          id: existing?.id || uuid(),
          eleveId,
          anneeScolaireId: yearId,
          classeId: selectedClasseId,
          dateJour: date,
          session,
          statut: next as StatutPresence,
          pointePar,
        };
        const saved = await LocalDatabaseService.addPresence(p);
        if (saved) {
          setPresences((prev) => {
            const rest = prev.filter((x) => x.id !== saved.id);
            return [...rest, saved];
          });
        }
      }
    } catch (e) {
      console.warn('[StudentPointageManager] Erreur pointage :', e);
    } finally {
      setSaving(false);
    }
  };

  const saveWithJustification = async () => {
    if (!justificationModal) return;
    const { eleveId, date } = justificationModal;
    const existing = presenceMap.get(`${eleveId}__${date}`);
    setSaving(true);
    try {
      const p: Presence = {
        id: existing?.id || uuid(),
        eleveId,
        anneeScolaireId: yearId,
        classeId: selectedClasseId,
        dateJour: date,
        session,
        statut: 'JUSTIFIE',
        motif: justificationText,
        pointePar,
      };
      const saved = await LocalDatabaseService.addPresence(p);
      if (saved) {
        setPresences((prev) => {
          const rest = prev.filter((x) => x.id !== saved.id);
          return [...rest, saved];
        });
      }
      setJustificationModal(null);
      setJustificationText('');
    } catch (e) {
      console.warn('[StudentPointageManager] Erreur sauvegarde justification :', e);
    } finally {
      setSaving(false);
    }
  };

  const cancelJustification = () => {
    setJustificationModal(null);
    setJustificationText('');
  };

  const markDayAllPresent = async (date: string) => {
    setSaving(true);
    try {
      const toSave: Presence[] = students
        .filter((s) => !presenceMap.has(`${s.id}__${date}`))
        .map((s) => ({
          id: uuid(),
          eleveId: s.id,
          anneeScolaireId: yearId,
          classeId: selectedClasseId,
          dateJour: date,
          session,
          statut: 'PRESENT',
          pointePar,
        }));
      const saved = await LocalDatabaseService.bulkAddPresences(toSave);
      setPresences((prev) => {
        const rest = prev.filter((p) => p.dateJour !== date);
        return [...rest, ...saved];
      });
    } catch (e) {
      console.warn('[StudentPointageManager] Erreur markDayAllPresent :', e);
    } finally {
      setSaving(false);
    }
  };

  const fillMonthWithPresent = async () => {
    if (!students.length || !days.length) return;
    setSaving(true);
    try {
      const toSave: Presence[] = [];
      days.forEach((d) => {
        students.forEach((s) => {
          if (!presenceMap.has(`${s.id}__${d.date}`)) {
            toSave.push({
              id: uuid(),
              eleveId: s.id,
              anneeScolaireId: yearId,
              classeId: selectedClasseId,
              dateJour: d.date,
              session,
              statut: 'PRESENT',
              pointePar,
            });
          }
        });
      });
      const saved = await LocalDatabaseService.bulkAddPresences(toSave);
      setPresences((prev) => {
        const ids = new Set(saved.map((s) => s.id));
        const rest = prev.filter((p) => !ids.has(p.id));
        return [...rest, ...saved];
      });
    } catch (e) {
      console.warn('[StudentPointageManager] Erreur fillMonthWithPresent :', e);
    } finally {
      setSaving(false);
    }
  };

  const totals = useMemo(() => {
    const byStudent = new Map<string, { A: number; R: number; J: number }>();
    students.forEach((s) => byStudent.set(s.id, { A: 0, R: 0, J: 0 }));
    presences.forEach((p) => {
      const t = byStudent.get(p.eleveId) || { A: 0, R: 0, J: 0 };
      if (p.statut === 'ABSENT') t.A++;
      if (p.statut === 'RETARD') t.R++;
      if (p.statut === 'JUSTIFIE') t.J++;
      byStudent.set(p.eleveId, t);
    });
    return byStudent;
  }, [presences, students]);

  const dayStats = useMemo(() => {
    const res: Record<string, { present: number; absent: number; retard: number; justifie: number }> = {};
    days.forEach((d) => {
      res[d.date] = { present: 0, absent: 0, retard: 0, justifie: 0 };
    });
    // Compter uniquement les présences réelles enregistrées
    presences.forEach((p) => {
      if (!p.dateJour || !res[p.dateJour]) return;
      if (p.statut === 'PRESENT') res[p.dateJour].present++;
      else if (p.statut === 'ABSENT') res[p.dateJour].absent++;
      else if (p.statut === 'RETARD') res[p.dateJour].retard++;
      else if (p.statut === 'JUSTIFIE') res[p.dateJour].justifie++;
    });
    return res;
  }, [days, presences]);

  const classOptions: SelectOption[] = useMemo(() => {
    const visible = isRestrictedUser && allowedClassIds
      ? classes.filter((c) => allowedClassIds.has(c.id))
      : classes;
    return [
      { value: '', label: '— Sélectionner une classe —' },
      ...visible.map((c) => ({ value: c.id, label: c.nom })),
    ];
  }, [classes, allowedClassIds, isRestrictedUser]);

  const navMonth = (delta: number) => {
    setMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const statusCell = (st: StatutPresence | null) => {
    if (st === null) {
      return 'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black cursor-pointer transition-all border border-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:bg-slate-800';
    }
    const base = 'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black cursor-pointer transition-all border';
    if (st === 'PRESENT') return `${base} bg-emerald-100/50 border-transparent text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300`;
    if (st === 'ABSENT') return `${base} bg-rose-100 border-rose-300 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300`;
    if (st === 'RETARD') return `${base} bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300`;
    return `${base} bg-sky-100 border-sky-300 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300`;
  };

  const statusText = (st: StatutPresence | null) => (st === null || st === 'PRESENT' ? '' : st[0]);

  if (!yearId) {
    return (
      <div className="p-6 text-center text-slate-500">
        Aucune année scolaire active. Veuillez d'abord créer une année scolaire.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* HEADER */}
      <div
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              Pointage des Élèves
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grille mensuelle — cliquez sur une case pour changer le statut (vide → présent → absent → retard → justifié)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <button onClick={() => navMonth(-1)} className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-black min-w-[110px] text-center" style={{ color: 'var(--text-primary)' }}>
              {monthDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => navMonth(1)} className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-slate-700/50 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <CustomSelect
            value={selectedClasseId}
            onChange={setSelectedClasseId}
            options={classOptions}
            placeholder="Classe"
            className="w-52"
          />

          <CustomSelect
            value={session}
            onChange={(v) => setSession(v as SessionPointage)}
            options={SESSION_OPTIONS}
            placeholder="Session"
            className="w-44"
          />

          <button
            type="button"
            disabled={saving || !selectedClasseId}
            onClick={fillMonthWithPresent}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-2 cursor-pointer transition-all"
            title="Marquer toutes les cellules vides comme PRÉSENT pour tout le mois"
          >
            <CalendarCheck className="w-4 h-4" />
            Tout marquer présent
          </button>
        </div>
      </div>

      {/* LÉGENDE ET STATS */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded border border-slate-200 dark:border-slate-700 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Non pointé</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-300 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Présent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-rose-100 dark:bg-rose-900/30 border border-rose-300 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Absent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/30 border border-amber-300 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Retard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-sky-100 dark:bg-sky-900/30 border border-sky-300 inline-block" />
          <span className="text-slate-500 dark:text-slate-400">Justifié</span>
        </div>
        {selectedClasseId && (
          <div className="ml-auto flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Users2 className="w-4 h-4" />
            <span className="font-bold">{students.length}</span> élève{students.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center text-sm text-slate-500 py-6">
          Chargement...
        </div>
      )}

      {/* GRILLE */}
      {selectedClasseId && !loading && (
        <div className="rounded-2xl border overflow-hidden shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs">
              <thead>
                <tr style={{ background: 'var(--bg-sunken)' }}>
                  <th className="sticky left-0 z-10 min-w-[140px] px-3 py-2 text-left font-black border-r" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    Nom de l'élève
                  </th>
                  {days.map((d) => (
                    <th key={d.date} className="min-w-[34px] px-0.5 py-2 text-center font-black border-r" style={{ borderColor: 'var(--border)' }}>
                      <div>{d.label}</div>
                      <div className={d.label === 'Di' || d.label === 'Sa' ? 'text-rose-500' : ''}>{d.day}</div>
                    </th>
                  ))}
                  <th className="min-w-[40px] px-1 py-2 text-center font-black text-rose-600 border-r" style={{ borderColor: 'var(--border)' }}>A</th>
                  <th className="min-w-[40px] px-1 py-2 text-center font-black text-amber-600 border-r" style={{ borderColor: 'var(--border)' }}>R</th>
                  <th className="min-w-[40px] px-1 py-2 text-center font-black text-sky-600" style={{ borderColor: 'var(--border)' }}>J</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const t = totals.get(s.id) || { A: 0, R: 0, J: 0 };
                  return (
                    <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-slate-500/5'}>
                      <td className="sticky left-0 z-10 px-3 py-2 font-semibold border-r" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                        <div className="truncate max-w-[130px]">{[s.nom, s.postnom, s.prenom].filter(Boolean).join(' ')}</div>
                      </td>
                      {days.map((d) => {
                        const st = getStatus(s.id, d.date);
                        return (
                          <td key={`${s.id}-${d.date}`} className="px-0.5 py-1 text-center border-r" style={{ borderColor: 'var(--border)' }}>
                            <button
                              disabled={saving}
                              onClick={() => toggleStatus(s.id, d.date, st)}
                              className={statusCell(st)}
                              title={`${d.date} — ${st}`}
                            >
                              {statusText(st)}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-1 py-2 text-center font-black text-rose-600 border-r" style={{ borderColor: 'var(--border)' }}>{t.A}</td>
                      <td className="px-1 py-2 text-center font-black text-amber-600 border-r" style={{ borderColor: 'var(--border)' }}>{t.R}</td>
                      <td className="px-1 py-2 text-center font-black text-sky-600" style={{ borderColor: 'var(--border)' }}>{t.J}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {students.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              Aucun élève dans cette classe.
            </div>
          )}
        </div>
      )}

      {/* STATS JOURNALIÈRES */}
      {selectedClasseId && students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries({
            'Présents': { count: Object.values(dayStats).reduce((a, d) => a + d.present, 0), color: 'emerald' },
            'Absents': { count: Object.values(dayStats).reduce((a, d) => a + d.absent, 0), color: 'rose' },
            'Retards': { count: Object.values(dayStats).reduce((a, d) => a + d.retard, 0), color: 'amber' },
            'Justifiés': { count: Object.values(dayStats).reduce((a, d) => a + d.justifie, 0), color: 'sky' },
          }).map(([label, { count, color }]) => (
            <div
              key={label}
              className={`p-4 rounded-xl border bg-${color}-50/50 dark:bg-${color}-900/10`}
              style={{ borderColor: `var(--${color}-500)` }}
            >
              <div className={`text-xs font-black text-${color}-600 dark:text-${color}-400`}>{label}</div>
              <div className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {!selectedClasseId && !loading && (
        <div className="p-10 text-center text-slate-500 rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          Sélectionnez une classe pour afficher la grille de pointage.
        </div>
      )}

      {/* MODAL DE JUSTIFICATION */}
      {justificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className="rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <button
              onClick={cancelJustification}
              className="absolute top-4 right-4 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text-primary)' }}>
              Justification de l'absence
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Élève : {students.find((s) => s.id === justificationModal.eleveId)?.nom} {students.find((s) => s.id === justificationModal.eleveId)?.postnom}
              <br />
              Date : {justificationModal.date}
            </p>
            <textarea
              value={justificationText}
              onChange={(e) => setJustificationText(e.target.value)}
              placeholder="Entrez la justification (maladie, rendez-vous, etc.)"
              className="w-full p-3 rounded-lg border text-sm resize-none"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={cancelJustification}
                disabled={saving}
                className="px-4 py-2 rounded-lg border text-sm font-black hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveWithJustification}
                disabled={saving || !justificationText.trim()}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-black cursor-pointer"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
