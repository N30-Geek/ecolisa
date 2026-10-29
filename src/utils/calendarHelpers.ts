export interface CalendarEventData {
  id: string;
  titre: string;
  subtitre?: string;
  dateDebut: string;
  dateFin?: string;
  categorie: string;
  publicCible?: 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE' | 'SECONDAIRE_EXETAT';
  highlight?: boolean;
}

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const categoryInfo = (cat: string) => {
  if (cat === 'EXAMENS_JURY') {
    return {
      label: 'Examens & Jury',
      bg: 'bg-indigo-500/12 dark:bg-indigo-500/20',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-500/30',
      dot: 'bg-indigo-500',
      hex: '#6366f1',
      gradient: 'from-indigo-500 to-indigo-600',
      glow: 'rgba(99, 102, 241, 0.12)',
    };
  }
  if (cat === 'VACANCES') {
    return {
      label: 'Vacances & Congés',
      bg: 'bg-amber-500/12 dark:bg-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
      hex: '#f59e0b',
      gradient: 'from-amber-500 to-amber-600',
      glow: 'rgba(245, 158, 11, 0.12)',
    };
  }
  if (cat === 'FÉRIÉ') {
    return {
      label: 'Jour Férié RDC',
      bg: 'bg-rose-500/12 dark:bg-rose-500/20',
      text: 'text-rose-700 dark:text-rose-300',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
      hex: '#ef4444',
      gradient: 'from-rose-500 to-rose-600',
      glow: 'rgba(239, 68, 68, 0.12)',
    };
  }
  if (cat === 'RENTRÉE_CLÔTURE') {
    return {
      label: 'Rentrée / Clôture',
      bg: 'bg-emerald-500/12 dark:bg-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-500',
      hex: '#10b981',
      gradient: 'from-emerald-500 to-emerald-600',
      glow: 'rgba(16, 185, 129, 0.12)',
    };
  }
  return {
    label: 'Autre Activité',
    bg: 'bg-slate-500/12 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/30',
    dot: 'bg-slate-500',
    hex: '#64748b',
    gradient: 'from-slate-500 to-slate-600',
    glow: 'rgba(100, 116, 139, 0.12)',
  };
};

export const parseAnyDate = (d?: string): Date | null => {
  if (!d) return null;
  const iso = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(date.getTime()) ? null : date;
  }
  const fr = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fr) {
    const date = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(d);
  return isNaN(fallback.getTime()) ? null : fallback;
};

export const formatFrenchDate = (dStr: string): string => {
  const d = parseAnyDate(dStr);
  if (!d) return dStr;
  const day = d.getDate();
  const month = MONTHS_FR[d.getMonth()];
  const year = d.getFullYear();
  return `${day === 1 ? '1er' : day} ${month} ${year}`;
};

export const formatFrenchDateRange = (startStr: string, endStr?: string): string => {
  const s = parseAnyDate(startStr);
  if (!s) return startStr;
  if (!endStr || endStr === startStr) return formatFrenchDate(startStr);
  const e = parseAnyDate(endStr);
  if (!e) return formatFrenchDate(startStr);

  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `Du ${s.getDate() === 1 ? '1er' : s.getDate()} au ${e.getDate()} ${MONTHS_FR[s.getMonth()]} ${s.getFullYear()}`;
  }
  return `Du ${s.getDate()} ${MONTHS_FR[s.getMonth()]} au ${e.getDate()} ${MONTHS_FR[e.getMonth()]} ${e.getFullYear()}`;
};

export const getEventStatus = (startStr: string, endStr?: string) => {
  const today = new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const sDate = parseAnyDate(startStr);
  if (!sDate) return { label: 'Date indéfinie', type: 'UNKNOWN', diffDays: 0 };
  const s = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate()).getTime();
  const eDate = endStr ? parseAnyDate(endStr) : sDate;
  const e = eDate ? new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate()).getTime() : s;

  if (t >= s && t <= e) {
    return { label: 'En cours aujourd\'hui', type: 'CURRENT', diffDays: 0 };
  }
  if (t > e) {
    const diff = Math.round((t - e) / (1000 * 60 * 60 * 24));
    return { label: `Échu (il y a ${diff} j)`, type: 'PAST', diffDays: -diff };
  }
  const diff = Math.round((s - t) / (1000 * 60 * 60 * 24));
  if (diff <= 30) return { label: `Dans ${diff} jour${diff > 1 ? 's' : ''}`, type: 'UPCOMING', diffDays: diff };
  return { label: 'À venir', type: 'UPCOMING', diffDays: diff };
};

export const isBetween = (date: Date, start: Date, end: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
};
