import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Download,
  Clock,
  Plus,
  X,
  Check,
  Grid,
  List,
  Filter,
  Sparkles,
  Award,
  AlertCircle,
  Tag,
  BookOpen,
  Search,
  ArrowRight,
  ExternalLink,
  Share2,
  CalendarDays,
  CheckCircle2,
  Timer,
  SlidersHorizontal,
  Bookmark,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

export interface CalendarEventData {
  id: string;
  titre: string;
  subtitre?: string;
  dateDebut: string;
  dateFin?: string;
  categorie: string;
  publicCible?: 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_EXETAT';
  highlight?: boolean;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const OFFICIAL_RDC_EVENTS: CalendarEventData[] = [
  {
    id: 'rdc-1',
    titre: 'Rentrée Scolaire Nationale 2026–2027',
    subtitre: 'Reprise officielle des cours sur toute l\'étendue de la République Démocratique du Congo',
    dateDebut: '2026-09-01',
    categorie: 'RENTRÉE_CLÔTURE',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'rdc-2',
    titre: 'Interrogations & Examens 1ère Période',
    subtitre: 'Contrôles continus et clôture pédagogique de la 1ère période',
    dateDebut: '2026-11-20',
    dateFin: '2026-11-27',
    categorie: 'EXAMENS_JURY',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-3',
    titre: 'Vacances du 1er Trimestre (Noël & Nouvel An)',
    subtitre: 'Congés scolaires de fin d\'année civile pour tous les cycles',
    dateDebut: '2026-12-19',
    dateFin: '2027-01-04',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-4',
    titre: 'Journée des Martyrs de l\'Indépendance',
    subtitre: 'Jour férié légal chômé et payé en République Démocratique du Congo',
    dateDebut: '2027-01-04',
    categorie: 'FÉRIÉ',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-5',
    titre: 'Journées des Héros Nationaux (Kabila & Lumumba)',
    subtitre: 'Commémoration nationale officielle des héros de la nation',
    dateDebut: '2027-01-16',
    dateFin: '2027-01-17',
    categorie: 'FÉRIÉ',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-6',
    titre: 'Examens du 1er Semestre (Toutes Promotions)',
    subtitre: 'Évaluations semestrielles obligatoires & délibérations des jurys',
    dateDebut: '2027-02-15',
    dateFin: '2027-02-23',
    categorie: 'EXAMENS_JURY',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'rdc-7',
    titre: 'Congé de Détente du 1er Semestre',
    subtitre: 'Interruption pédagogique de mi-parcours après délibérations',
    dateDebut: '2027-02-24',
    dateFin: '2027-02-28',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-8',
    titre: 'Journée Internationale des Droits de la Femme',
    subtitre: 'Jour férié national en hommage aux femmes',
    dateDebut: '2027-03-08',
    categorie: 'FÉRIÉ',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-9',
    titre: 'Vacances de Pâques (2ème Trimestre)',
    subtitre: 'Congés scolaires de mi-année entre le 2ème et le 3ème trimestre',
    dateDebut: '2027-04-03',
    dateFin: '2027-04-19',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-10',
    titre: 'Épreuves Hors-Session EXETAT (Dissertation & Pratique)',
    subtitre: 'Dissertation, Jury pratique et épreuves orales de français (Terminale)',
    dateDebut: '2027-05-10',
    dateFin: '2027-05-15',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'rdc-11',
    titre: 'Test National de Sélection et d\'Orientation (TENASOSP)',
    subtitre: 'Évaluation obligatoire d\'orientation des élèves de 8ème Année CTEB',
    dateDebut: '2027-05-27',
    dateFin: '2027-05-28',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
  },
  {
    id: 'rdc-12',
    titre: 'Évaluation Nationale de Fin d\'Études Primaires (ENAFEP)',
    subtitre: 'Certificat national de fin d\'études primaires (6ème Primaire)',
    dateDebut: '2027-06-03',
    dateFin: '2027-06-04',
    categorie: 'EXAMENS_JURY',
    publicCible: 'PRIMAIRE',
    highlight: true,
  },
  {
    id: 'rdc-13',
    titre: 'Session Ordinaire de l\'Examen d\'État (EXETAT 2027)',
    subtitre: '4 journées nationales d\'épreuves standardisées écrites pour les finalistes',
    dateDebut: '2027-06-21',
    dateFin: '2027-06-24',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'rdc-14',
    titre: 'Clôture de l\'Année Scolaire & Proclamation des Résultats',
    subtitre: 'Remise solennelle des bulletins, palmarès et proclamation générale',
    dateDebut: '2027-07-02',
    categorie: 'RENTRÉE_CLÔTURE',
    publicCible: 'TOUS',
    highlight: true,
  },
];

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
  if (diff === 1) return { label: 'Demain', type: 'UPCOMING', diffDays: 1 };
  if (diff <= 30) return { label: `Dans ${diff} jours`, type: 'UPCOMING', diffDays: diff };
  const diffMonths = Math.round(diff / 30);
  return { label: `Dans ~${diffMonths} mois`, type: 'UPCOMING', diffDays: diff };
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isBetween = (date: Date, start: Date, end: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
};

export const categoryInfo = (cat: string) => {
  if (cat === 'EXAMENS_JURY') {
    return {
      label: 'Examens & Jury',
      bg: 'bg-indigo-500/12 dark:bg-indigo-500/20',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-500/30',
      dot: 'bg-indigo-500',
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
    gradient: 'from-slate-500 to-slate-600',
    glow: 'rgba(100, 116, 139, 0.12)',
  };
};

interface SchoolCalendarProps {
  events?: CalendarEventData[];
  defaultYear?: number;
  onAddEvent?: (ev: CalendarEventData) => void;
}

export const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ events = [], defaultYear, onAddEvent }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => {
    if (defaultYear) return new Date(defaultYear, 8, 1);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [localEvents, setLocalEvents] = useState<CalendarEventData[]>([]);
  const [catFilter, setCatFilter] = useState<string>('TOUS');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'timeline'>('list');
  const [activeEventDetail, setActiveEventDetail] = useState<CalendarEventData | null>(null);

  const allEvents = useMemo(() => {
    const base = events.length > 0 ? events : OFFICIAL_RDC_EVENTS;
    const merged = [...base, ...localEvents];
    const map = new Map<string, CalendarEventData>();
    for (const ev of merged) if (ev.id) map.set(ev.id, ev);
    return Array.from(map.values());
  }, [events, localEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents
      .filter(ev => {
        if (catFilter !== 'TOUS' && ev.categorie !== catFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = ev.titre.toLowerCase().includes(q);
          const matchSub = (ev.subtitre || '').toLowerCase().includes(q);
          const matchDate = ev.dateDebut.includes(q) || (ev.dateFin || '').includes(q);
          if (!matchTitle && !matchSub && !matchDate) return false;
        }
        if (statusFilter !== 'ALL') {
          const st = getEventStatus(ev.dateDebut, ev.dateFin);
          if (statusFilter === 'UPCOMING' && st.type !== 'UPCOMING') return false;
          if (statusFilter === 'CURRENT' && st.type !== 'CURRENT') return false;
          if (statusFilter === 'PAST' && st.type !== 'PAST') return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = parseAnyDate(a.dateDebut)?.getTime() || 0;
        const db = parseAnyDate(b.dateDebut)?.getTime() || 0;
        return da - db;
      });
  }, [allEvents, catFilter, searchQuery, statusFilter]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days: Date[] = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, -startOffset + i + 1);
      list.push(d);
    }
    for (let i = 1; i <= daysInMonth; i++) list.push(new Date(year, month, i));
    const remaining = (7 - (list.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) list.push(new Date(year, month + 1, i));
    return list;
  }, [year, month, startOffset, daysInMonth]);

  const eventsForDay = (date: Date) => {
    return allEvents.filter((ev) => {
      const start = parseAnyDate(ev.dateDebut);
      if (!start) return false;
      const end = ev.dateFin ? parseAnyDate(ev.dateFin) : start;
      if (!end) return isBetween(date, start, start);
      return isBetween(date, start, end);
    });
  };

  const selectedEvents = selectedDate ? eventsForDay(selectedDate) : [];

  const upcomingEvents = useMemo(() => {
    const fromToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return allEvents
      .map((ev) => ({ ev, start: parseAnyDate(ev.dateDebut) }))
      .filter((x): x is { ev: CalendarEventData; start: Date } => !!x.start && x.start >= fromToday)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 6)
      .map((x) => x.ev);
  }, [allEvents, today]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleExportPDF = () => {
    const element = document.getElementById('school-calendar-print-section');
    if (!element) {
      window.print();
      return;
    }
    try {
      import('html2pdf.js').then((html2pdfModule) => {
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const opt = {
          margin: 8,
          filename: `Calendrier_Scolaire_ECOLISA_${year}_${year + 1}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'landscape' as const },
        };
        html2pdf().set(opt).from(element).save();
      }).catch(() => {
        window.print();
      });
    } catch {
      window.print();
    }
  };

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    titre: '',
    subtitre: '',
    dateDebut: '',
    dateFin: '',
    categorie: 'EXAMENS_JURY',
    publicCible: 'TOUS' as 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_EXETAT',
  });

  const openModal = (date: Date) => {
    setModalDate(date);
    setForm({
      titre: '',
      subtitre: '',
      dateDebut: toISODate(date),
      dateFin: toISODate(date),
      categorie: 'EXAMENS_JURY',
      publicCible: 'TOUS',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalDate(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.dateDebut) return;
    const newEvent: CalendarEventData = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      titre: form.titre.trim(),
      subtitre: form.subtitre.trim() || undefined,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin || undefined,
      categorie: form.categorie,
      publicCible: form.publicCible,
    };
    if (onAddEvent) {
      onAddEvent(newEvent);
    } else {
      await LocalDatabaseService.addSchoolEvent(newEvent as any);
    }
    setLocalEvents(prev => [...prev, newEvent]);
    if (modalDate) setSelectedDate(modalDate);
    closeModal();
  };

  const CATEGORY_TABS = [
    { id: 'TOUS', label: 'Toutes les Échéances' },
    { id: 'EXAMENS_JURY', label: 'Examens & Jury' },
    { id: 'VACANCES', label: 'Vacances & Congés' },
    { id: 'FÉRIÉ', label: 'Jours Fériés RDC' },
    { id: 'RENTRÉE_CLÔTURE', label: 'Rentrée / Clôture' },
  ];

  return (
    <div
      id="school-calendar-print-section"
      className="p-4 sm:p-6 rounded-2xl border space-y-4 animate-fade-in transition-all"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--elevation-1)',
      }}
    >
      {/* ═══ HEADER OFFICIEL RDC ET CONTRÔLES ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shrink-0 shadow-xs">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Calendrier Scolaire Officiel RDC {year}–{year + 1}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                MINEDU-NC RDC
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Programme Officiel Actif
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Arrêté N° MINEDU-NC/CABMINETAT/0059/2026 · 192 jours (Maternelle) / 222 jours (Primaire & Secondaire)
            </p>
          </div>
        </div>

        {/* Boutons d'Action & Bascule de Vue */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Mode */}
          <div className="flex items-center p-1 rounded-xl border bg-slate-500/5 shadow-xs" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Liste Échéances</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grille Mensuelle</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openModal(today)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Ajouter Événement</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl border font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:bg-slate-500/10 no-print"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            title="Exporter le calendrier en PDF"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* ═══ BARRE DE RECHERCHE & FILTRES RAPIDES ═══ */}
      <div className="p-3.5 rounded-2xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher un examen, une session, une vacance..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 sidebar-scroll">
            {[
              { id: 'ALL', label: 'Tout le calendrier' },
              { id: 'UPCOMING', label: 'À venir' },
              { id: 'CURRENT', label: 'En cours' },
              { id: 'PAST', label: 'Échues' },
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-500/10'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catégories Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t sidebar-scroll" style={{ borderColor: 'var(--border)' }}>
          {CATEGORY_TABS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCatFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${
                catFilter === f.id
                  ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                  : 'hover:bg-slate-500/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-[11px] font-bold text-slate-400 ml-auto whitespace-nowrap">
            {filteredEvents.length} échéance{filteredEvents.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ═══ VUE 1 : LISTE DES ÉCHÉANCES INTERACTIVE & MODERNE ═══ */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {filteredEvents.map(ev => {
                const cInfo = categoryInfo(ev.categorie);
                const sDate = parseAnyDate(ev.dateDebut);
                const status = getEventStatus(ev.dateDebut, ev.dateFin);

                const getCategoryIcon = () => {
                  if (ev.categorie === 'EXAMENS_JURY') return <BookOpen className="w-3 h-3 shrink-0" />;
                  if (ev.categorie === 'VACANCES') return <Sparkles className="w-3 h-3 shrink-0 text-amber-500" />;
                  if (ev.categorie === 'FÉRIÉ') return <Award className="w-3 h-3 shrink-0 text-rose-500" />;
                  if (ev.categorie === 'RENTRÉE_CLÔTURE') return <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500" />;
                  return <Tag className="w-3 h-3 shrink-0" />;
                };

                return (
                  <div
                    key={ev.id}
                    onClick={() => setActiveEventDetail(ev)}
                    className="animate-fade-in p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer select-none"
                    style={{
                      background: 'var(--bg-surface)',
                      borderColor: 'var(--border)',
                      boxShadow: 'var(--elevation-1)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.boxShadow = 'var(--elevation-3)';
                      e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.boxShadow = 'var(--elevation-1)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Top glowing aura */}
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none blur-2xl opacity-50 group-hover:opacity-90 transition-opacity"
                      style={{ background: cInfo.glow }}
                    />

                    <div className="relative z-10">
                      {/* Top bar: Category Chip + Public Target Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${cInfo.bg} ${cInfo.text} ${cInfo.border}`}>
                          {getCategoryIcon()}
                          <span>{cInfo.label}</span>
                        </span>

                        {ev.publicCible && ev.publicCible !== 'TOUS' && (
                          <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 shrink-0">
                            {ev.publicCible === 'SECONDAIRE_EXETAT' ? 'Secondaire / EXETAT' : ev.publicCible}
                          </span>
                        )}
                      </div>

                      {/* Card Body: Calendar Tear-off Badge + Title/Subtitle */}
                      <div className="flex items-start gap-3.5 my-1">
                        {/* Calendar Tear-off Badge */}
                        <div
                          className="w-13 rounded-2xl overflow-hidden border shrink-0 shadow-sm flex flex-col items-center transition-transform duration-300 group-hover:scale-105"
                          style={{ borderColor: 'var(--border)' }}
                        >
                          <div className={`w-full py-1 text-center text-[9px] font-black uppercase tracking-wider text-white bg-gradient-to-r ${cInfo.gradient}`}>
                            {sDate ? MONTHS_FR[sDate.getMonth()].slice(0, 3) : '—'}
                          </div>
                          <div className="w-full py-1.5 text-center text-lg font-black tracking-tight leading-none" style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}>
                            {sDate ? sDate.getDate() : '—'}
                          </div>
                        </div>

                        {/* Title & Subtitle */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-black tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {ev.titre}
                          </h4>
                          {ev.subtitre && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">
                              {ev.subtitre}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer: Date Range + Countdown + Action Arrow */}
                    <div className="relative z-10 pt-3.5 mt-3.5 border-t flex items-center justify-between text-xs font-bold" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0 pr-2">
                        <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{formatFrenchDateRange(ev.dateDebut, ev.dateFin)}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Countdown Tag */}
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                            status.type === 'CURRENT'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 animate-pulse'
                              : status.diffDays > 0 && status.diffDays <= 30
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : status.type === 'UPCOMING'
                              ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25'
                              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          }`}
                        >
                          {status.label}
                        </span>

                        {/* Interactive Arrow Capsule */}
                        <div className="w-6 h-6 rounded-lg bg-slate-500/10 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-500 dark:text-slate-400 transition-all duration-200">
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 border rounded-2xl" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucune échéance ne correspond à vos filtres</p>
              <p className="text-xs text-slate-400">Essayez de modifier votre recherche ou la catégorie sélectionnée.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ VUE 2 : VRAIE GRILLE DE CALENDRIER MENSUEL ═══ */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {/* Header Navigation Mois */}
          <div className="flex items-center justify-between p-3 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl border flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                title="Mois précédent"
                style={{ borderColor: 'var(--border)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                className="px-4 py-1.5 rounded-xl border text-xs font-black min-w-[150px] text-center"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {MONTHS_FR[month]} {year}
              </div>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl border flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                title="Mois suivant"
                style={{ borderColor: 'var(--border)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleToday}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold border hover:bg-indigo-500/10 transition-all cursor-pointer text-indigo-600 dark:text-indigo-400 shadow-xs"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
            >
              Aller à Aujourd'hui
            </button>
          </div>

          <div
            className="border rounded-2xl overflow-hidden shadow-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            {/* Jours de la Semaine Header */}
            <div
              className="grid grid-cols-7 text-center py-2.5 text-[11px] font-black uppercase tracking-wider border-b"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              {WEEKDAYS_SHORT.map(d => (
                <div key={d} className={d === 'Sam' || d === 'Dim' ? 'text-rose-500' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Grille des Jours */}
            <div className="grid grid-cols-7" style={{ background: 'var(--bg-surface)' }}>
              {days.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === month;
                const isToday = sameDay(date, today);
                const dayEvents = eventsForDay(date);
                const isSelected = selectedDate ? sameDay(date, selectedDate) : false;
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    onDoubleClick={() => openModal(date)}
                    className={`relative min-h-[105px] sm:min-h-[115px] p-2 border-b border-r text-left flex flex-col justify-between transition-all cursor-pointer group select-none ${
                      isCurrentMonth ? '' : 'opacity-35 bg-slate-500/[0.02]'
                    } ${
                      isSelected
                        ? 'bg-indigo-500/10 ring-2 ring-inset ring-indigo-500'
                        : 'hover:bg-indigo-500/5'
                    } ${isWeekend && isCurrentMonth ? 'bg-amber-500/[0.015]' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Numéro du jour */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-indigo-600'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9.5px] font-bold text-slate-400">
                          {dayEvents.length} évt
                        </span>
                      )}
                    </div>

                    {/* Liste des Événements dans la Case */}
                    <div className="space-y-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => {
                        const cInfo = categoryInfo(ev.categorie);
                        return (
                          <div
                            key={ev.id}
                            onClick={e => {
                              e.stopPropagation();
                              setActiveEventDetail(ev);
                            }}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate border flex items-center gap-1 cursor-pointer hover:scale-[1.02] transition-transform ${cInfo.bg} ${cInfo.text} ${cInfo.border}`}
                            title={ev.titre}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cInfo.dot} shrink-0`} />
                            <span className="truncate">{ev.titre}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="px-1.5 py-0.2 rounded text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 text-center">
                          +{dayEvents.length - 2} autre(s)
                        </div>
                      )}
                    </div>

                    <div className="h-0.5" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ DIALOGUE MODAL DE DÉTAIL D'UN ÉVÉNEMENT ═══ */}
      {activeEventDetail && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-scale-in"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header with category gradient */}
            {(() => {
              const cInfo = categoryInfo(activeEventDetail.categorie);
              const sDate = parseAnyDate(activeEventDetail.dateDebut);
              const status = getEventStatus(activeEventDetail.dateDebut, activeEventDetail.dateFin);

              return (
                <div>
                  <div className={`p-5 text-white bg-gradient-to-r ${cInfo.gradient} relative`}>
                    <button
                      type="button"
                      onClick={() => setActiveEventDetail(null)}
                      className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30 inline-block mb-2">
                      {cInfo.label}
                    </span>

                    <h3 className="text-base font-black tracking-tight text-white leading-snug">
                      {activeEventDetail.titre}
                    </h3>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Description */}
                    {activeEventDetail.subtitre && (
                      <div className="p-3 rounded-xl border text-xs leading-relaxed" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                        {activeEventDetail.subtitre}
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Date & Période</span>
                        <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                          {formatFrenchDateRange(activeEventDetail.dateDebut, activeEventDetail.dateFin)}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Statut Échéance</span>
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border ${
                          status.type === 'CURRENT'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : status.type === 'UPCOMING'
                            ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Public Cible</span>
                        <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                          {activeEventDetail.publicCible ? activeEventDetail.publicCible.replace('_', ' ') : 'Tous les cycles'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Source & Référence</span>
                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          Arrêté MINEDU-NC RDC
                        </p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => setActiveEventDetail(null)}
                        className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-500/10 cursor-pointer"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ═══ MODAL AJOUT D'ÉVÉNEMENT ═══ */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                    Programmer un Événement Scolaire
                  </h3>
                  <p className="text-[10.5px] text-slate-400">Calendrier officiel EPST / Établissement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-500/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Intitulé de l'Événement <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.titre}
                  onChange={e => setForm(prev => ({ ...prev, titre: e.target.value }))}
                  placeholder="Ex : Examen de Mathématiques / Délibération"
                  required
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Description / Remarques
                </label>
                <input
                  type="text"
                  value={form.subtitre}
                  onChange={e => setForm(prev => ({ ...prev, subtitre: e.target.value }))}
                  placeholder="Détail des classes ou des salles concernées..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomDatePicker
                  label="Date de début"
                  value={form.dateDebut}
                  onChange={val => setForm(prev => ({ ...prev, dateDebut: val }))}
                  className="w-full"
                />
                <CustomDatePicker
                  label="Date de fin"
                  value={form.dateFin}
                  onChange={val => setForm(prev => ({ ...prev, dateFin: val }))}
                  alignRight
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Catégorie
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'EXAMENS_JURY', label: 'Examens / Jury' },
                      { value: 'VACANCES', label: 'Vacances / Congés' },
                      { value: 'FÉRIÉ', label: 'Jour Férié RDC' },
                      { value: 'RENTRÉE_CLÔTURE', label: 'Rentrée / Clôture' },
                      { value: 'AUTRE', label: 'Autre Activité' },
                    ]}
                    value={form.categorie}
                    onChange={val => setForm(prev => ({ ...prev, categorie: val }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Public Cible
                  </label>
                  <CustomSelect
                    options={[
                      { value: 'TOUS', label: 'Tous les Cycles' },
                      { value: 'MATERNELLE', label: 'Maternelle Uniquement' },
                      { value: 'PRIMAIRE', label: 'Primaire Uniquement' },
                      { value: 'SECONDAIRE_EXETAT', label: 'Secondaire / EXETAT' },
                    ]}
                    value={form.publicCible}
                    onChange={val => setForm(prev => ({ ...prev, publicCible: val as any }))}
                  />
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer l'Événement</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
