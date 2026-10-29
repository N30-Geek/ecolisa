import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Clock, Users, BookOpen, CheckCircle, AlertCircle,
  GraduationCap, Bell, ArrowRight, School, RotateCcw
} from 'lucide-react';
import { LocalDatabaseService, UserSession } from '../../services/localDatabase';
import { Cote, ClasseScolaire, MembrePersonnel, ScheduleSlot } from '../../types';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';

interface TeacherDashboardProps {
  activeSchoolYear?: string;
  onNavigate?: (tab: string) => void;
}

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const toDayName = (d: Date) => {
  const i = d.getDay();
  return ['Dimanche', ...DAYS_OF_WEEK][i] || 'Lundi';
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ activeSchoolYear, onNavigate }) => {
  const { format } = useSchoolConfig();
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [currentStaff, setCurrentStaff] = useState<MembrePersonnel | null>(null);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [cotes, setCotes] = useState<Cote[]>([]);
  const [schoolYearName, setSchoolYearName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = LocalDatabaseService.getCurrentUser();
      setCurrentUser(user);
      const [staffList, cls, years, sched, allCotes] = await Promise.all([
        LocalDatabaseService.getStaff().catch(() => []),
        LocalDatabaseService.getClasses().catch(() => []),
        LocalDatabaseService.getSchoolYears().catch(() => []),
        LocalDatabaseService.getSchedules({ schoolYearId: activeSchoolYear }).catch(() => []),
        LocalDatabaseService.getCotes().catch(() => []),
      ]);

      const activeYear = (years || []).find(y => y.id === activeSchoolYear) || (years || []).find(y => y.statut === 'EN_COURS') || (years || [])[0];
      setSchoolYearName(activeYear?.nom || activeYear?.id || 'Année scolaire');

      let staff: MembrePersonnel | null = null;
      if (user) {
        const userFullName = (user.nom || '').toLowerCase().trim();
        staff = (staffList || []).find((s: MembrePersonnel) =>
          (s.email && s.email.toLowerCase() === user.email?.toLowerCase()) ||
          (userFullName &&
            (userFullName === `${(s.prenom || '').toLowerCase().trim()} ${(s.nom || '').toLowerCase().trim()}`.trim() ||
             userFullName === (s.nom || '').toLowerCase().trim()))
        ) || null;
      }
      setCurrentStaff(staff);
      setClasses(cls || []);

      const staffFullName = staff ? `${(staff.prenom || '').trim()} ${(staff.nom || '').trim()}`.toLowerCase().trim() : '';
      const staffLastName = staff ? (staff.nom || '').toLowerCase().trim() : '';
      const mySchedule = staff
        ? (sched || []).filter(s => {
            const sid = s.professeurId || '';
            const sname = (s.nomProfesseur || '').toLowerCase().trim();
            if (sid && sid === staff.id) return true;
            if (!sname) return false;
            return sname === staffFullName || sname.includes(staffLastName);
          })
        : [];
      setSchedules(mySchedule);

      const myCotes = staff
        ? (allCotes || []).filter(c => c.enseignantId === staff?.id || c.matiereId && (staff?.disciplines || staff?.coursAttribues || []).some(d => d.toLowerCase().includes(c.matiereId!.toLowerCase())))
        : [];
      setCotes(myCotes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSchoolYear]);

  const todayName = useMemo(() => toDayName(new Date()), []);

  const upcomingSchedules = useMemo(() => {
    return [...schedules]
      .filter(s => DAYS_OF_WEEK.includes(s.jour))
      .sort((a, b) => {
        const da = DAYS_OF_WEEK.indexOf(a.jour);
        const db = DAYS_OF_WEEK.indexOf(b.jour);
        if (da !== db) return da - db;
        return a.heureDebut.localeCompare(b.heureDebut);
      })
      .slice(0, 8);
  }, [schedules]);

  const todaySchedules = useMemo(() => {
    return schedules.filter(s => s.jour === todayName).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  }, [schedules, todayName]);

  const pendingCotes = useMemo(() => {
    return cotes.filter(c => !c.statut || c.statut === 'BROUILLON' || c.statut === 'SOUMIS');
  }, [cotes]);

  const pendingClassSubjectPairs = useMemo(() => {
    const map = new Map<string, { classeNom: string; matiereNom: string; count: number; statut: Cote['statut'] }>();
    pendingCotes.forEach(c => {
      const cls = classes.find(cl => cl.id === c.classeId);
      const key = `${c.classeId || ''}__${c.matiereId || ''}`;
      if (!map.has(key)) {
        map.set(key, { classeNom: cls?.nom || c.classeId || '—', matiereNom: c.matiereId || '—', count: 0, statut: c.statut });
      }
      const entry = map.get(key)!;
      entry.count++;
    });
    return Array.from(map.values());
  }, [pendingCotes, classes]);

  const fullName = `${currentStaff?.prenom || ''} ${currentStaff?.nom || ''}`.trim() || currentUser?.nom || 'Enseignant';

  const assignedClassNames = useMemo(() => {
    if (!currentStaff) return [] as string[];
    const names = new Set<string>();
    const parseClass = (value: string) => {
      const m = value.match(/\(([^)]+)\)$/);
      return m ? m[1].trim() : value.trim();
    };
    (currentStaff.classesAssignees || []).forEach(c => { if (c) names.add(parseClass(c)); });
    (currentStaff.classesTitularisees || []).forEach(c => { if (c) names.add(parseClass(c)); });
    if (currentStaff.classeTitulaireId) names.add(parseClass(currentStaff.classeTitulaireId));
    if (currentStaff.salleUniqueId) names.add(parseClass(currentStaff.salleUniqueId));
    (currentStaff.coursAttribues || currentStaff.disciplines || []).forEach(c => { if (c) names.add(parseClass(c)); });
    return Array.from(names);
  }, [currentStaff]);

  const assignedClasses = useMemo(() => {
    return (classes || []).filter(c =>
      assignedClassNames.some(n =>
        c.id.toLowerCase().trim() === n.toLowerCase() ||
        c.nom.toLowerCase().trim() === n.toLowerCase() ||
        c.nom.toLowerCase().includes(n.toLowerCase()) ||
        n.toLowerCase().includes(c.nom.toLowerCase())
      )
    );
  }, [classes, assignedClassNames]);

  const assignedStudents = useMemo(() => assignedClasses.reduce((sum, c) => sum + (c.nombreEleves || 0), 0), [assignedClasses]);

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Mon espace enseignant
          </h1>
          <p className="text-xs font-normal text-slate-500">Bienvenue, <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{fullName}</span> · {schoolYearName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Saisir cotes', icon: GraduationCap, nav: 'grades', primary: true },
            { label: 'Faire l\'appel', icon: Users, nav: 'pointage' },
            { label: 'Emploi du temps', icon: Calendar, nav: 'schedule' },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={() => onNavigate && onNavigate(btn.nav)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer border ${
                btn.primary
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'
              }`}
              style={{ background: btn.primary ? undefined : 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            >
              <btn.icon className="w-3.5 h-3.5" />
              <span className="capitalize">{btn.label}</span>
            </button>
          ))}
          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all duration-200 cursor-pointer border text-slate-600 dark:text-slate-300 hover:text-indigo-600"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            title="Actualiser"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="capitalize">Actualiser</span>
          </button>
        </div>
      </div>

      {/* Résumé chiffré */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Classes', value: assignedClasses.length, icon: School, color: '#6366f1' },
          { label: 'Élèves', value: assignedStudents, icon: Users, color: '#10b981' },
          { label: 'Cours programmés', value: schedules.length, icon: Calendar, color: '#0ea5e9' },
          { label: 'Cotes en attente', value: pendingClassSubjectPairs.length, icon: GraduationCap, color: '#f59e0b' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="rounded-2xl border p-3.5 flex items-center gap-3 transition-all duration-250 hover:shadow-md hover:-translate-y-0.5"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${stat.color}10`, color: stat.color }}>
              <stat.icon className="w-[18px] h-[18px]" />
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 capitalize">{stat.label}</p>
              <p className="text-xl font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Prochains cours */}
        <div
          className="rounded-2xl border p-4 space-y-3 transition-all duration-250 hover:shadow-md hover:-translate-y-0.5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2" style={{ color: 'var(--sidebar-active-text)' }}>
              <Calendar className="w-4 h-4" />
              <span className="text-[11px] font-medium capitalize">Emploi du temps</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>{upcomingSchedules.length} cours</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {upcomingSchedules.length === 0 ? (
              <p className="text-xs text-slate-500">Aucun cours programmé.</p>
            ) : (
              upcomingSchedules.map(s => (
                <div key={s.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-500/5 text-xs transition-colors hover:bg-slate-500/10">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.nomMatiere}</p>
                    <p className="text-slate-500">{s.nomClasse} · Salle {s.salle}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium" style={{ color: '#6366f1' }}>{s.heureDebut}</p>
                    <p className="text-[10px] text-slate-500">{s.jour}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('schedule')}
              className="w-full py-2 rounded-xl text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-700"
              style={{ boxShadow: '0 2px 6px rgba(99,102,241,0.20)' }}
            >
              Voir l'emploi du temps <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Appel du jour */}
        <div
          className="rounded-2xl border p-4 space-y-3 transition-all duration-250 hover:shadow-md hover:-translate-y-0.5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Users className="w-4 h-4" />
              <span className="text-[11px] font-medium capitalize">Appel du jour</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981' }}>{todayName}</span>
          </div>
          {todaySchedules.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun cours prévu aujourd'hui.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {todaySchedules.map(s => (
                <div key={s.id} className="p-2 rounded-xl text-xs space-y-1 transition-colors hover:bg-emerald-500/5" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.08)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.nomMatiere}</span>
                    <span className="font-mono font-medium text-emerald-600">{s.heureDebut} - {s.heureFin}</span>
                  </div>
                  <p className="text-slate-500">{s.nomClasse} · {s.salle}</p>
                </div>
              ))}
            </div>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('pointage')}
              className="w-full py-2 rounded-xl text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700"
              style={{ boxShadow: '0 2px 6px rgba(16,185,129,0.20)' }}
            >
              Faire l'appel <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Cotes en attente */}
        <div
          className="rounded-2xl border p-4 space-y-3 transition-all duration-250 hover:shadow-md hover:-translate-y-0.5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <GraduationCap className="w-4 h-4" />
              <span className="text-[11px] font-medium capitalize">Cotes en attente</span>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>{pendingClassSubjectPairs.length} cours</span>
          </div>
          {pendingClassSubjectPairs.length === 0 ? (
            <p className="text-xs text-slate-500">Toutes les cotes sont à jour.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingClassSubjectPairs.map((p, i) => (
                <div key={i} className="p-2 rounded-xl text-xs transition-colors hover:bg-amber-500/5" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.08)' }}>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{p.matiereNom}</p>
                  <p className="text-slate-500">{p.classeNom} · {p.count} cote(s)</p>
                </div>
              ))}
            </div>
          )}
          {onNavigate && (
            <button
              onClick={() => onNavigate('grades')}
              className="w-full py-2 rounded-xl text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer bg-amber-600 hover:bg-amber-700"
              style={{ boxShadow: '0 2px 6px rgba(245,158,11,0.20)' }}
            >
              Saisir les cotes <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Alertes / informations */}
      <div
        className="rounded-2xl border p-4 transition-all duration-250 hover:shadow-sm"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <h3 className="text-[11px] font-medium tracking-wide flex items-center gap-2 mb-3" style={{ color: 'var(--sidebar-active-text)' }}>
          <Bell className="w-4 h-4" /> Informations & rappels
        </h3>
        <ul className="space-y-2 text-xs font-normal text-slate-500 leading-relaxed">
          <li className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
            Les cotes doivent être soumises au titulaire avant validation par le Directeur des Études.
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            L'appel se fait dans le module Présences, limité à vos classes et à l'emploi du temps du jour.
          </li>
          <li className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
            L'emploi du temps peut être configuré avec les modèles officiels RDC (Maternelle, Primaire, Secondaire).
          </li>
        </ul>
      </div>
    </div>
  );
};
