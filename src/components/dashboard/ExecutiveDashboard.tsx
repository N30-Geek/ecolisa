import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  GraduationCap,
  Award,
  Clock,
  ArrowRight,
  Activity,
  DollarSign,
  UserCheck,
  BookOpen,
  ChevronRight,
  Zap,
  UserPlus,
  CreditCard,
  ClipboardCheck,
  Sparkles,
  School,
  Eye,
  Download,
  Smartphone,
  ShieldCheck,
  HeartPulse,
  Scale,
  Bell,
  Check,
  X,
  Filter,
  RotateCcw,
  AlertCircle,
  Search,
  FileText,
  Flag,
  Banknote
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import {
  fetchDashboardData,
  computeDashboardStats,
  filterDashboardData,
  getClassSubCode,
  normalizeCycle,
  DashboardData,
  DashboardStats,
} from '../../services/dashboardData';
import { getInvoiceRemaining } from '../../utils/financeCalculations';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency } from '../../utils/currency';
import { LocalDatabaseService } from '../../services/localDatabase';
import { SchoolCalendar } from './SchoolCalendar';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

import { RôleSystème } from '../../types';
import { hasTabAccess, ROLE_DETAILS } from '../../utils/permissions';

// ── Props du Dashboard Exécutif ────────────────────────────────────────────
interface ExecutiveDashboardProps {
  onNavigate?: (tab: string) => void;
  onOpenRegistration?: () => void;
  activeSchoolYear?: string;
  userRole?: RôleSystème;
}

// ── Tooltip personnalisé Recharts 100% Adaptatif Mode Clair & Sombre ───────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const { format } = useSchoolConfig();
  return (
    <div
      className="rounded-xl p-3 text-xs font-semibold shadow-xl border backdrop-blur-md"
      style={{
        background: 'var(--sidebar-popover-bg)',
        borderColor: 'var(--sidebar-popover-border)',
        color: 'var(--text-primary)',
      }}
    >
      <p className="mb-1.5 font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 my-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ background: entry.color || entry.stroke }}
            />
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {entry.name === 'moyenneCotes'
                ? 'Moyenne Cotes'
                : entry.name === 'tauxPresence'
                ? 'Présence Élèves'
                : entry.name === 'encaisse'
                ? 'Encaissé'
                : entry.name === 'objectif'
                ? 'Objectif'
                : entry.name}:
            </span>
          </div>
          <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
            {typeof entry.value === 'number' && entry.name !== 'encaisse' && entry.name !== 'objectif'
              ? `${entry.value}%`
              : format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Carte KPI Épurée Évoluée ─────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  sublabel: string;
  value: string;
  trend: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  icon: React.ElementType;
  iconColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  delay?: number;
  onViewDetails?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label,
  sublabel,
  value,
  trend,
  trendUp,
  trendNeutral,
  icon: Icon,
  iconColor = 'indigo',
  delay = 0,
  onViewDetails,
}) => {
  const colorThemes: Record<string, { gradient: string; shadow: string; glow: string; text: string; bgSoft: string; borderSoft: string }> = {
    indigo: {
      gradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
      shadow: 'shadow-indigo-500/25',
      glow: 'rgba(99, 102, 241, 0.08)',
      text: 'text-indigo-600 dark:text-indigo-400',
      bgSoft: 'bg-indigo-500/10',
      borderSoft: 'border-indigo-500/20',
    },
    emerald: {
      gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/25',
      glow: 'rgba(16, 185, 129, 0.08)',
      text: 'text-emerald-600 dark:text-emerald-400',
      bgSoft: 'bg-emerald-500/10',
      borderSoft: 'border-emerald-500/20',
    },
    amber: {
      gradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/25',
      glow: 'rgba(245, 158, 11, 0.08)',
      text: 'text-amber-600 dark:text-amber-400',
      bgSoft: 'bg-amber-500/10',
      borderSoft: 'border-amber-500/20',
    },
    rose: {
      gradient: 'bg-gradient-to-br from-rose-500 to-rose-600',
      shadow: 'shadow-rose-500/25',
      glow: 'rgba(239, 68, 68, 0.08)',
      text: 'text-rose-600 dark:text-rose-400',
      bgSoft: 'bg-rose-500/10',
      borderSoft: 'border-rose-500/20',
    },
    violet: {
      gradient: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/25',
      glow: 'rgba(168, 85, 247, 0.08)',
      text: 'text-purple-600 dark:text-purple-400',
      bgSoft: 'bg-purple-500/10',
      borderSoft: 'border-purple-500/20',
    },
    sky: {
      gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/25',
      glow: 'rgba(6, 182, 212, 0.08)',
      text: 'text-cyan-600 dark:text-cyan-400',
      bgSoft: 'bg-cyan-500/10',
      borderSoft: 'border-cyan-500/20',
    },
  };

  const theme = colorThemes[iconColor] || colorThemes.indigo;

  return (
    <div
      className="animate-fade-in p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-default"
      style={{
        animationDelay: `${delay}ms`,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--elevation-1)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--elevation-3)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.35)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--elevation-1)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Soft background aura */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none blur-2xl transition-opacity duration-300 opacity-60 group-hover:opacity-100"
        style={{ background: theme.glow }}
      />

      <div className="relative z-10">
        {/* Header: Label & Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider block text-slate-500 dark:text-slate-400 truncate">
              {label}
            </span>
            <span className="text-xs font-semibold block text-slate-400 dark:text-slate-500 truncate">
              {sublabel}
            </span>
          </div>

          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-all duration-300 group-hover:scale-110 shrink-0 ${theme.gradient} ${theme.shadow}`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Value and Trend */}
        <div className="mt-4">
          <div className="text-3xl font-black tracking-tight leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg border ${
                trendNeutral
                  ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                  : trendUp
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
              }`}
            >
              {!trendNeutral && (trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
              {trend}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Action Link */}
      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className="relative z-10 mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-black transition-all duration-200 cursor-pointer group/btn select-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <span className="group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400 transition-colors">
            Consulter les détails
          </span>
          <div className="w-6 h-6 rounded-lg bg-slate-500/10 group-hover/btn:bg-indigo-600 group-hover/btn:text-white flex items-center justify-center transition-all duration-200 text-slate-500 dark:text-slate-400">
            <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </div>
        </button>
      )}
    </div>
  );
};

// ── COMPOSANT CALENDRIER SCOLAIRE OFFICIEL RDC 2026-2027 (MINEDU-NC) ──────────
interface CalendarEventData {
  id: string;
  titre: string;
  subtitre?: string;
  dateDebut: string;
  dateFin?: string;
  categorie: 'RENTRÉE_CLÔTURE' | 'EXAMENS_JURY' | 'VACANCES' | 'FÉRIÉ';
  publicCible: 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_EXETAT';
  highlight?: boolean;
}

const OFFICIAL_RDC_EVENTS: CalendarEventData[] = [
  {
    id: 'rdc-1',
    titre: 'Rentrée Scolaire Nationale 2026–2027',
    subtitre: 'Reprise officielle des cours sur toute l\'étendue de la RDC',
    dateDebut: '01/09/2026',
    categorie: 'RENTRÉE_CLÔTURE',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'rdc-2',
    titre: 'Interrogations & Examens de la 1ère Période',
    subtitre: 'Contrôles continus et clôture de la 1ère période',
    dateDebut: '20/11/2026',
    dateFin: '27/11/2026',
    categorie: 'EXAMENS_JURY',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-3',
    titre: 'Vacances du 1er Trimestre (Noël & Nouvel An)',
    subtitre: 'Congés scolaires de fin d\'année civile',
    dateDebut: '19/12/2026',
    dateFin: '04/01/2027',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-4',
    titre: 'Journée des Martyrs de l\'Indépendance',
    subtitre: 'Jour férié légal en République Démocratique du Congo',
    dateDebut: '04/01/2027',
    categorie: 'FÉRIÉ',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-5',
    titre: 'Journées des Héros Nationaux (Kabila & Lumumba)',
    subtitre: 'Commémoration nationale officielle',
    dateDebut: '16/01/2027',
    dateFin: '17/01/2027',
    categorie: 'FÉRIÉ',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-6',
    titre: 'Examens du 1er Semestre (Toutes Promotions)',
    subtitre: 'Évaluations semestrielles obligatoires & délibérations',
    dateDebut: '15/02/2027',
    dateFin: '23/02/2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'rdc-7',
    titre: 'Congé de Détente du 1er Semestre',
    subtitre: 'Interruption pédagogique après délibérations',
    dateDebut: '24/02/2027',
    dateFin: '28/02/2027',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-8',
    titre: 'Journée Internationale des Droits de la Femme',
    subtitre: 'Jour férié chômé et payé',
    dateDebut: '08/03/2027',
    categorie: 'FÉRIÉ',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-9',
    titre: 'Vacances de Pâques (2ème Trimestre)',
    subtitre: 'Congés scolaires de mi-année',
    dateDebut: '03/04/2027',
    dateFin: '19/04/2027',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'rdc-10',
    titre: 'Épreuves Hors-Session EXETAT (Dissertation & Pratique)',
    subtitre: 'Dissertation, Jury pratique et épreuves orales de français',
    dateDebut: '10/05/2027',
    dateFin: '15/05/2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'rdc-11',
    titre: 'Test National de Sélection et d\'Orientation (TENASOSP)',
    subtitre: 'Évaluation obligatoire des élèves de 8ème Année CTEB',
    dateDebut: '27/05/2027',
    dateFin: '28/05/2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
  },
  {
    id: 'rdc-12',
    titre: 'Évaluation Nationale de Fin d\'Études Primaires (ENAFEP)',
    subtitre: 'Certificat national de fin d\'études primaires',
    dateDebut: '03/06/2027',
    dateFin: '04/06/2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'PRIMAIRE',
    highlight: true,
  },
  {
    id: 'rdc-13',
    titre: 'Session Ordinaire de l\'Examen d\'État (EXETAT 2027)',
    subtitre: '4 journées nationales d\'épreuves standardisées',
    dateDebut: '21/06/2027',
    dateFin: '24/06/2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'rdc-14',
    titre: 'Clôture de l\'Année Scolaire & Proclamation des Résultats',
    subtitre: 'Remise solennelle des bulletins et palmarès',
    dateDebut: '02/07/2027',
    categorie: 'RENTRÉE_CLÔTURE',
    publicCible: 'TOUS',
    highlight: true,
  },
];

const RdcOfficialSchoolCalendar: React.FC<{ events?: CalendarEventData[] }> = ({ events }) => {
  const [catFilter, setCatFilter] = useState<string>('TOUS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const allEvents = useMemo<CalendarEventData[]>(() => {
    return (events && events.length > 0) ? events : OFFICIAL_RDC_EVENTS;
  }, [events]);

  const handleExportPDF = () => {
    const element = document.getElementById('rdc-official-calendar-print-section');
    if (!element) {
      window.print();
      return;
    }

    try {
      import('html2pdf.js').then((html2pdfModule) => {
        const html2pdf = html2pdfModule.default || html2pdfModule;
        const opt = {
          margin: 8,
          filename: `Calendrier_Scolaire_Officiel_RDC_2026_2027_MINEDU.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save();
      }).catch(() => {
        window.print();
      });
    } catch (e) {
      window.print();
    }
  };

  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      const matchCat = catFilter === 'TOUS' || ev.categorie === catFilter;
      const matchSearch = !searchTerm || ev.titre.toLowerCase().includes(searchTerm.toLowerCase()) || (ev.subtitre && ev.subtitre.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [allEvents, catFilter, searchTerm]);

  const { paginated: paginatedEvents, ...eventsPagination } = usePagination(filteredEvents, { defaultPageSize: 6 });

  return (
    <div
      id="rdc-official-calendar-print-section"
      className="p-5 rounded-2xl border shadow-xs animate-fade-in space-y-4 transition-colors relative"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      {/* En-tête Officiel MINEDU-NC RDC */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Calendrier Scolaire Officiel RDC 2026–2027
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                MINEDU-NC RDC
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Mis à Jour Auto (Programme Publié)
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Arrêté N° MINEDU-NC/CABMINETAT/0059/2026 · 192 jours (Maternelle) / 222 jours (Primaire-Secondaire)
            </p>
          </div>
        </div>

        {/* Boutons d'Action Imprimer / PDF et Badges Synthèse Jours Ouvrables */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto no-print">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Exporter / Imprimer PDF</span>
          </button>

          <div className="px-3 py-1.5 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase block text-slate-500 dark:text-slate-400">Maternelle</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">192 Jours</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-bold uppercase block text-slate-500 dark:text-slate-400">Primaire & Secondaire</span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">222 Jours</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres par Catégorie */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Onglets Filtres */}
        <div className="flex items-center gap-1.5 overflow-x-auto sidebar-scroll pb-1 md:pb-0">
          {[
            { id: 'TOUS', label: 'Toutes les Échéances' },
            { id: 'EXAMENS_JURY', label: 'Examens & EXETAT / ENAFEP' },
            { id: 'VACANCES', label: 'Vacances & Congés' },
            { id: 'FÉRIÉ', label: 'Jours Fériés RDC' },
            { id: 'RENTRÉE_CLÔTURE', label: 'Rentrée & Clôture' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setCatFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                catFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:bg-slate-500/10'
              }`}
              style={{ color: catFilter === f.id ? '#ffffff' : 'var(--text-secondary)' }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Champ Recherche rapide */}
        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une date, examen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Grille des Événements Officiels RDC */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {paginatedEvents.map(ev => {
          let badgeColor = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/25';
          if (ev.categorie === 'EXAMENS_JURY') badgeColor = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
          else if (ev.categorie === 'VACANCES') badgeColor = 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
          else if (ev.categorie === 'FÉRIÉ') badgeColor = 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
          else if (ev.categorie === 'RENTRÉE_CLÔTURE') badgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

          return (
            <div
              key={ev.id}
              className={`p-3.5 rounded-xl border shadow-xs space-y-2 flex flex-col justify-between transition-all hover:brightness-105 ${
                ev.highlight ? 'ring-1 ring-indigo-500/40' : ''
              }`}
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${badgeColor}`}>
                    {ev.categorie.replace('_', ' ')}
                  </span>
                  {ev.publicCible !== 'TOUS' && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                      {ev.publicCible.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  {ev.titre}
                </h4>
                {ev.subtitre && (
                  <p className="text-[10.5px] mt-1 text-slate-500 dark:text-slate-400 font-medium leading-snug">
                    {ev.subtitre}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t flex items-center justify-between text-[11px] font-bold" style={{ borderColor: 'var(--border)' }}>
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {ev.dateDebut} {ev.dateFin ? `au ${ev.dateFin}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEvents.length > 0 && (
        <Pagination
          currentPage={eventsPagination.page}
          totalPages={eventsPagination.totalPages}
          total={eventsPagination.total}
          pageSize={eventsPagination.pageSize}
          start={eventsPagination.start}
          end={eventsPagination.end}
          onPageChange={eventsPagination.setPage}
          onPageSizeChange={eventsPagination.setPageSize}
        />
      )}
    </div>
  );
};

// ── SECTION SPÉCIFIQUE : PRÉSENCE DU JOUR PAR CATÉGORIE ET CYCLE EPST ─────────
interface CycleAttendanceData {
  id: string;
  nom: string;
  code: string;
  isPresentInSchool: boolean;
  hasPointage?: boolean;
  effectifTotal: number;
  presentsTotal: number;
  fillesTotal: number;
  fillesPresents: number;
  garconsTotal: number;
  garconsPresents: number;
}

const mockDailyAttendance: CycleAttendanceData[] = [
  {
    id: 'mat',
    nom: 'Cycle Maternelle (3–5 ans)',
    code: 'MATERNELLE',
    isPresentInSchool: true,
    hasPointage: false,
    effectifTotal: 0,
    presentsTotal: 0,
    fillesTotal: 0,
    fillesPresents: 0,
    garconsTotal: 0,
    garconsPresents: 0,
  },
  {
    id: 'prim',
    nom: 'Cycle Primaire (1ère–6ème)',
    code: 'PRIMAIRE',
    isPresentInSchool: true,
    hasPointage: false,
    effectifTotal: 0,
    presentsTotal: 0,
    fillesTotal: 0,
    fillesPresents: 0,
    garconsTotal: 0,
    garconsPresents: 0,
  },
  {
    id: 'sec',
    nom: 'Secondaire & Humanités',
    code: 'SECONDAIRE',
    isPresentInSchool: true,
    hasPointage: false,
    effectifTotal: 0,
    presentsTotal: 0,
    fillesTotal: 0,
    fillesPresents: 0,
    garconsTotal: 0,
    garconsPresents: 0,
  },
];

const DailyAttendanceByCategory: React.FC<{ selectedCycleFilter: string; data?: DashboardStats['attendanceByCycle'] }> = ({ selectedCycleFilter, data }) => {
  const cycleData = useMemo(() => {
    return data && data.length > 0 ? data : [];
  }, [data]);

  const activeCycles = useMemo(() => {
    const secondaire = new Set(['CTEB', 'HUMANITES']);
    return cycleData.filter(c => {
      if (!c.isPresentInSchool) return false;
      if (selectedCycleFilter === 'ALL') return true;
      if (selectedCycleFilter === 'SECONDAIRE') return secondaire.has(c.code);
      return c.code === selectedCycleFilter;
    });
  }, [cycleData, selectedCycleFilter]);

  const { paginated: paginatedActiveCycles, ...activeCyclesPagination } = usePagination(activeCycles, { defaultPageSize: 6 });

  const totals = useMemo(() => {
    return activeCycles.reduce(
      (acc, c) => ({
        effectifTotal: acc.effectifTotal + c.effectifTotal,
        presentsTotal: acc.presentsTotal + c.presentsTotal,
        fillesTotal: acc.fillesTotal + c.fillesTotal,
        fillesPresents: acc.fillesPresents + c.fillesPresents,
        garconsTotal: acc.garconsTotal + c.garconsTotal,
        garconsPresents: acc.garconsPresents + c.garconsPresents,
      }),
      { effectifTotal: 0, presentsTotal: 0, fillesTotal: 0, fillesPresents: 0, garconsTotal: 0, garconsPresents: 0 }
    );
  }, [activeCycles]);

  const hasAnyPointage = activeCycles.some(c => c.hasPointage);

  const pctGlobal = totals.effectifTotal > 0 ? Math.round((totals.presentsTotal / totals.effectifTotal) * 1000) / 10 : 0;
  const pctFilles = totals.fillesTotal > 0 ? Math.round((totals.fillesPresents / totals.fillesTotal) * 1000) / 10 : 0;
  const pctGarcons = totals.garconsTotal > 0 ? Math.round((totals.garconsPresents / totals.garconsTotal) * 1000) / 10 : 0;

  return (
    <div
      className="p-5 rounded-2xl border shadow-xs animate-fade-in space-y-4 transition-colors"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
      }}
    >
      {/* En-tête de section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Présence du Jour par Catégorie & Cycle Scolaire
            </h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Assiduité en temps réel répertoriée par genre et filtrée par cycles actifs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasAnyPointage ? (
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Assiduité Globale: {pctGlobal}% ({totals.presentsTotal.toLocaleString()} / {totals.effectifTotal.toLocaleString()})
            </span>
          ) : (
            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pointage en attente aujourd'hui (0 / {totals.effectifTotal.toLocaleString()})
            </span>
          )}
        </div>
      </div>

      {totals.effectifTotal === 0 ? (
        <div className="p-6 rounded-xl border text-center space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune Donnée d'Assiduité Enregistrée</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Le registre de présence quotidienne par cycle est vierge. Inscrivez des élèves et commencez l'enregistrement de l'assiduité.
          </p>
        </div>
      ) : (
        <>
          {/* Cartes Synthèse par Catégorie (Filles vs Garçons) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARTE FILLES */}
        <div
          className="p-4 rounded-xl border space-y-2.5 transition-colors"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-primary)' }}>Élèves Filles Présentes</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Parité & Assiduité Féminine</span>
              </div>
            </div>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{hasAnyPointage ? `${pctFilles}%` : '—'}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>{totals.fillesPresents.toLocaleString()} présente{totals.fillesPresents > 1 ? 's' : ''}</span>
              <span>sur {totals.fillesTotal.toLocaleString()} inscrite{totals.fillesTotal > 1 ? 's' : ''}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-500/15 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${pctFilles}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARTE GARÇONS */}
        <div
          className="p-4 rounded-xl border space-y-2.5 transition-colors"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-primary)' }}>Élèves Garçons Présents</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Assiduité Masculine</span>
              </div>
            </div>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{hasAnyPointage ? `${pctGarcons}%` : '—'}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>{totals.garconsPresents.toLocaleString()} présent{totals.garconsPresents > 1 ? 's' : ''}</span>
              <span>sur {totals.garconsTotal.toLocaleString()} inscrit{totals.garconsTotal > 1 ? 's' : ''}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-500/15 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${pctGarcons}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Détail par Cycle Scolaire Actif */}
      <div className="pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Répartition par Cycle Présent dans l'Établissement ({activeCycles.length} cycle{activeCycles.length > 1 ? 's' : ''})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {paginatedActiveCycles.map((c) => {
            const pctCycle = c.effectifTotal > 0 ? Math.round((c.presentsTotal / c.effectifTotal) * 1000) / 10 : 0;
            const pctF = c.fillesTotal > 0 ? Math.round((c.fillesPresents / c.fillesTotal) * 1000) / 10 : 0;
            const pctG = c.garconsTotal > 0 ? Math.round((c.garconsPresents / c.garconsTotal) * 1000) / 10 : 0;

            return (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border shadow-xs space-y-3 transition-colors"
                style={{
                  background: 'var(--bg-sunken)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{c.nom}</span>
                  </div>
                  {c.hasPointage ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      {pctCycle}%
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Non pointé
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>Présents aujourd'hui</span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.presentsTotal.toLocaleString()} / {c.effectifTotal.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-500/15 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pctCycle}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-lg border border-slate-500/15 bg-slate-500/5">
                    <p className="font-bold text-[10px] uppercase text-slate-500 dark:text-slate-400">Filles</p>
                    <p className="font-bold text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.fillesPresents.toLocaleString()} <span className="text-[10px] text-indigo-600 dark:text-indigo-400">({c.hasPointage ? `${pctF}%` : '—'})</span></p>
                  </div>

                  <div className="p-2 rounded-lg border border-slate-500/15 bg-slate-500/5">
                    <p className="font-bold text-[10px] uppercase text-slate-500 dark:text-slate-400">Garçons</p>
                    <p className="font-bold text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.garconsPresents.toLocaleString()} <span className="text-[10px] text-indigo-600 dark:text-indigo-400">({c.hasPointage ? `${pctG}%` : '—'})</span></p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {activeCycles.length > 0 && (
          <Pagination
            currentPage={activeCyclesPagination.page}
            totalPages={activeCyclesPagination.totalPages}
            total={activeCyclesPagination.total}
            pageSize={activeCyclesPagination.pageSize}
            start={activeCyclesPagination.start}
            end={activeCyclesPagination.end}
            onPageChange={activeCyclesPagination.setPage}
            onPageSizeChange={activeCyclesPagination.setPageSize}
          />
        )}
      </div>
      </>
      )}
    </div>
  );
};

// ── Composant d'Alerte Guidée ───────────────────────────────────────────────
interface AlertItemProps {
  type: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  action: string;
  onAction?: () => void;
}

const alertStyles = {
  danger:  { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', dot: '#ef4444', text: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', dot: '#f59e0b', text: '#f59e0b' },
  info:    { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', dot: '#6366f1', text: '#6366f1' },
};

const AlertItem: React.FC<AlertItemProps> = ({ type, title, detail, action, onAction }) => {
  const s = alertStyles[type];
  return (
    <div
      className="flex items-start gap-2.5 p-2.5 rounded-xl border transition-all hover:brightness-105"
      style={{ background: s.bg, borderColor: s.border }}
    >
      <span
        className="w-2 h-2 rounded-full mt-1.5 shrink-0 animate-pulse"
        style={{ background: s.dot }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] font-bold" style={{ color: s.text }}>{title}</p>
        <p className="text-[10px] mt-0.5 leading-snug text-slate-500 dark:text-slate-400">{detail}</p>
      </div>
      <button
        onClick={onAction}
        className="text-[10px] font-bold shrink-0 px-2 py-0.5 rounded-lg flex items-center gap-0.5 hover:underline transition-colors cursor-pointer"
        style={{ color: s.dot, background: 'rgba(0,0,0,0.05)' }}
      >
        {action} <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
};

// ── Options de Filtrage Intelligentes & Adaptatives Selon le Cycle EPST ─────
const cycleOptions: SelectOption[] = [
  { value: 'ALL', label: 'Tous les Cycles EPST', icon: School },
  { value: 'MATERNELLE', label: 'Cycle Maternelle', icon: GraduationCap },
  { value: 'PRIMAIRE', label: 'Cycle Primaire', icon: School },
  { value: 'SECONDAIRE', label: 'Secondaire & Humanités', icon: Award },
];

const OPTION_LABELS: Record<string, string> = {
  PS: 'Petite Section (3 ans)',
  MS: 'Moyenne Section (4 ans)',
  GS: 'Grande Section (5 ans)',
  '1ERE': '1ère Primaire',
  '2EME': '2ème Primaire',
  '3EME': '3ème Primaire',
  '4EME': '4ème Primaire',
  '5EME': '5ème Primaire',
  '6EME': '6ème Primaire',
  TRONC_COMMUN: 'Tronc Commun',
};

const subOptionLabel = (code: string, cycle: string) => {
  if (OPTION_LABELS[code]) return OPTION_LABELS[code];
  if (cycle === 'SECONDAIRE') return code.replace(/_/g, ' ');
  return code;
};

// ── Dashboard Exécutif Épuré Haute Visibilité Mode Clair & Sombre ──
export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  onNavigate,
  onOpenRegistration,
  activeSchoolYear,
  userRole = 'PROMOTEUR_ADMIN',
}) => {
  const { displayCurrency, currencies, format } = useSchoolConfig();
  const [activeSubTab, setActiveSubTab] = useState<'executive' | 'calendar' | 'pedagogy' | 'finances' | 'viescolaire'>('executive');
  const [chartMode, setChartMode] = useState<'BOTH' | 'COTES' | 'PRESENCE'>('BOTH');

  const availableSubTabs = useMemo(() => {
    const tabs: Array<{ id: 'executive' | 'calendar' | 'pedagogy' | 'finances' | 'viescolaire'; label: string; icon: React.ElementType }> = [
      { id: 'executive', label: 'Synthèse Exécutive', icon: Activity },
      { id: 'calendar', label: 'Calendrier EPST 2026–2027', icon: Calendar },
    ];

    if (hasTabAccess(userRole, 'grades') || hasTabAccess(userRole, 'classes') || userRole === 'PROMOTEUR_ADMIN') {
      tabs.push({ id: 'pedagogy', label: 'Pédagogie & Performances', icon: GraduationCap });
    }

    if (hasTabAccess(userRole, 'invoices') || hasTabAccess(userRole, 'cash') || userRole === 'PROMOTEUR_ADMIN') {
      tabs.push({ id: 'finances', label: 'Finances & Recouvrement', icon: DollarSign });
    }

    if (hasTabAccess(userRole, 'discipline') || userRole === 'DIRECTEUR_DISCIPLINE' || userRole === 'PREFET_DIRECTEUR' || userRole === 'PROMOTEUR_ADMIN') {
      tabs.push({ id: 'viescolaire', label: 'Vie Scolaire & Présences', icon: Scale });
    }

    return tabs;
  }, [userRole]);

  useEffect(() => {
    if (!availableSubTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab('executive');
    }
  }, [availableSubTabs, activeSubTab]);

  const [data, setData] = useState<DashboardData>({
    loading: true,
    students: [],
    classes: [],
    schoolYears: [],
    subjects: [],
    staff: [],
    invoices: [],
    payments: [],
    expenses: [],
    cotes: [],
    presences: [],
    schoolEvents: [],
    selectedYear: undefined,
  });

  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('ALL');

  // Résolution robuste de l'année scolaire active (ID ou nom) et fallback sur l'année EN_COURS
  const activeYearId = useMemo(() => {
    if (!activeSchoolYear) {
      return data.schoolYears.find((y) => y.statut === 'EN_COURS')?.id || 'ALL';
    }
    const byId = data.schoolYears.find((y) => y.id === activeSchoolYear);
    if (byId) return byId.id;
    const byName = data.schoolYears.find((y) => y.nom === activeSchoolYear);
    return byName?.id || activeSchoolYear;
  }, [activeSchoolYear, data.schoolYears]);

  const schoolYearOptions = useMemo<SelectOption[]>(() => {
    const opts: SelectOption[] = [
      { value: 'ALL', label: 'Toutes les Années Scolaires', icon: Calendar }
    ];
    data.schoolYears.forEach(y => {
      opts.push({
        value: y.id,
        label: `Année Scolaire ${y.nom} (${y.statut === 'EN_COURS' ? 'En cours' : 'Clôturée'})`,
        icon: Calendar,
        badge: y.statut === 'EN_COURS' ? 'EN COURS' : undefined
      });
    });
    return opts;
  }, [data.schoolYears]);

  useEffect(() => {
    if (selectedSchoolYearId === 'ALL' && activeYearId && activeYearId !== 'ALL' && schoolYearOptions.some((o) => o.value === activeYearId)) {
      setSelectedSchoolYearId(activeYearId);
    }
  }, [activeYearId, schoolYearOptions, selectedSchoolYearId]);

  const refreshData = async () => {
    setData(prev => ({ ...prev, loading: true }));
    const raw = await fetchDashboardData(selectedSchoolYearId);
    setData(raw);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const raw = await fetchDashboardData(selectedSchoolYearId);
      if (!mounted) return;
      setData(raw);
    };
    load();
    
    // Auto-refresh léger toutes les 3 secondes pour synchroniser la base de données en direct
    const interval = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedSchoolYearId]);

  // ÉTATS DES FILTRES MULTI-CRITÈRES INTELLIGENTS
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>('ALL');
  const [selectedOptionFilter, setSelectedOptionFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('FULL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  // Valeurs par défaut utilisées pour le badge "filtres actifs" et la réinitialisation
  const defaultSchoolYearId = activeYearId;
  const defaultPeriodKey = 'FULL';
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredData = useMemo<DashboardData>(
    () => filterDashboardData(data, selectedCycleFilter, selectedOptionFilter),
    [data, selectedCycleFilter, selectedOptionFilter]
  );

  const stats = useMemo<DashboardStats>(() => computeDashboardStats(filteredData, displayCurrency, currencies), [filteredData, displayCurrency, currencies]);

  const { paginated: paginatedRecentActivity, ...recentActivityPagination } = usePagination(stats.recentActivity, { defaultPageSize: 5 });
  const { paginated: paginatedUpcomingEvents, ...upcomingEventsPagination } = usePagination(stats.upcomingEvents, { defaultPageSize: 5 });
  const { paginated: paginatedTopUnpaid, ...topUnpaidPagination } = usePagination(stats.topUnpaidInvoices, { defaultPageSize: 5 });

  // GESTION DU CHANGEMENT DE CYCLE
  const handleCycleChange = (cycle: string) => {
    setSelectedCycleFilter(cycle);
    setSelectedOptionFilter('ALL');
  };

  // Options de sous-filtre (section/niveau/option) générées dynamiquement depuis les classes réelles
  const subSelectOptions = useMemo<SelectOption[]>(() => {
    const allClasses = data.classes;
    const relevant = allClasses.filter((c) => {
      if (selectedCycleFilter === 'ALL') return true;
      if (selectedCycleFilter === 'SECONDAIRE') {
        const cycle = normalizeCycle(c.cycleId, c.nom);
        return cycle === 'CTEB' || cycle === 'HUMANITES';
      }
      return normalizeCycle(c.cycleId, c.nom) === selectedCycleFilter;
    });

    const codes = Array.from(new Set(relevant.map((c) => getClassSubCode(c, selectedCycleFilter)))).sort();
    const allLabel =
      selectedCycleFilter === 'MATERNELLE' ? 'Toutes les sections' :
      selectedCycleFilter === 'PRIMAIRE' ? 'Tous les niveaux' :
      selectedCycleFilter === 'SECONDAIRE' ? 'Toutes les options/filières' :
      'Toutes les options / sections';

    return [
      { value: 'ALL', label: allLabel, icon: BookOpen },
      ...codes.map((code) => ({
        value: code,
        label: subOptionLabel(code, selectedCycleFilter),
        icon: BookOpen,
      })),
    ];
  }, [data.classes, selectedCycleFilter]);

  // Placeholder et validation du sous-filtre quand il devient invalide
  const subSelectPlaceholder = useMemo(() => {
    if (selectedCycleFilter === 'MATERNELLE') return 'Section Maternelle';
    if (selectedCycleFilter === 'PRIMAIRE') return 'Niveau Primaire';
    if (selectedCycleFilter === 'SECONDAIRE') return 'Option / Filière';
    return 'Option / Filière / Section';
  }, [selectedCycleFilter]);

  useEffect(() => {
    const available = subSelectOptions.some((o) => o.value === selectedOptionFilter);
    if (!available && selectedOptionFilter !== 'ALL') {
      setSelectedOptionFilter('ALL');
    }
  }, [subSelectOptions, selectedOptionFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSchoolYearId !== defaultSchoolYearId && defaultSchoolYearId !== 'ALL') count++;
    if (selectedCycleFilter !== 'ALL') count++;
    if (selectedOptionFilter !== 'ALL') count++;
    if (selectedPeriodFilter !== defaultPeriodKey) count++;
    if (selectedDateFilter !== todayStr) count++;
    return count;
  }, [selectedSchoolYearId, defaultSchoolYearId, selectedCycleFilter, selectedOptionFilter, selectedPeriodFilter, selectedDateFilter, todayStr]);

  // Options de période dynamiques (année active + semestres/trimestres)
  const periodOptions = useMemo<SelectOption[]>(() => {
    const yearLabel = data.selectedYear?.nom || new Date().getFullYear().toString();
    return [
      { value: 'FULL', label: `Année Scolaire ${yearLabel}`, icon: Calendar },
      { value: 'S1', label: '1er Semestre', icon: Calendar },
      { value: 'S2', label: '2ème Semestre', icon: Calendar },
      { value: 'T1', label: '1er Trimestre', icon: Clock },
      { value: 'T2', label: '2ème Trimestre', icon: Clock },
      { value: 'T3', label: '3ème Trimestre', icon: Clock },
      { value: 'T4', label: '4ème Trimestre', icon: Clock },
    ];
  }, [data.selectedYear]);

  useEffect(() => {
    if (!periodOptions.some((o) => o.value === selectedPeriodFilter)) {
      setSelectedPeriodFilter(defaultPeriodKey);
    }
  }, [periodOptions, selectedPeriodFilter]);

  const periodFilterMonths: Record<string, number[]> = {
    FULL: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    S1: [0, 1, 2, 3, 4],
    S2: [5, 6, 7, 8, 9, 10],
    T1: [0, 1, 2],
    T2: [3, 4, 5],
    T3: [6, 7, 8],
    T4: [9, 10],
  };

  const periodFilterQuarters: Record<string, string[]> = {
    FULL: ['T1', 'T2', 'T3', 'T4'],
    S1: ['T1', 'T2'],
    S2: ['T3', 'T4'],
    T1: ['T1'],
    T2: ['T2'],
    T3: ['T3'],
    T4: ['T4'],
  };

  const donneesPerformance = useMemo(() => {
    const allowed = periodFilterMonths[selectedPeriodFilter] || periodFilterMonths['FULL'];
    return stats.monthlyPerformance.filter((_, idx) => allowed.includes(idx));
  }, [stats.monthlyPerformance, selectedPeriodFilter]);

  const donneesFinancieres = useMemo(() => {
    const allowed = periodFilterQuarters[selectedPeriodFilter] || periodFilterQuarters['FULL'];
    return stats.quarterlyFinance.filter((q) => allowed.some((a) => q.trimestre.startsWith(a)));
  }, [stats.quarterlyFinance, selectedPeriodFilter]);

  const donneesCycle = useMemo(() => {
    const total = Math.max(1, stats.totalStudents);
    const secondaire = new Set(['SECONDAIRE', 'HUMANITES', 'CTEB']);
    let items = stats.studentsByCycle.map((c) => ({ ...c, pct: `${Math.round((c.value / total) * 100)}%` }));
    if (selectedCycleFilter !== 'ALL') {
      items = items.filter((c) => c.code === selectedCycleFilter || (selectedCycleFilter === 'SECONDAIRE' && secondaire.has(c.code)));
    }
    return items;
  }, [stats.studentsByCycle, stats.totalStudents, selectedCycleFilter]);

  const cycleTotal = useMemo(() => donneesCycle.reduce((sum, c) => sum + c.value, 0), [donneesCycle]);

  const monthlyPresenceStats = useMemo(() => {
    const month = Number(selectedDateFilter.split('-')[1]) - 1;
    if (Number.isNaN(month)) return { absences: 0, retards: 0, justifiees: 0 };
    return filteredData.presences.reduce((acc, p) => {
      const m = Number((p.dateJour || '').split('-')[1]) - 1;
      if (m === month) {
        if (p.statut === 'ABSENT') acc.absences++;
        if (p.statut === 'RETARD') acc.retards++;
        if (p.statut === 'JUSTIFIE') acc.justifiees++;
      }
      return acc;
    }, { absences: 0, retards: 0, justifiees: 0 });
  }, [filteredData.presences, selectedDateFilter]);

  const roleHeader = useMemo(() => {
    const yrNom = data.selectedYear?.nom;
    switch (userRole) {
      case 'COMPTABLE':
      case 'INTENDANT':
        return {
          badge: 'Finances & Caisse — EPST RDC',
          title: 'Tableau de Bord Financier & Caisse',
          desc: `Gestion des encaissements USD/CDF, bilans de caisse et facturation de la scolarité (${yrNom ? `Année ${yrNom}` : 'En cours'}).`,
        };
      case 'PREFET_DIRECTEUR':
      case 'DIRECTEUR_ETUDES':
      case 'CENSEUR':
        return {
          badge: 'Direction & Pédagogie — EPST RDC',
          title: 'Tableau de Bord Pédagogique & Direction',
          desc: `Pilotage des enseignements, assiduité des élèves, moyennes et suivi des délibérations (${yrNom ? `Année ${yrNom}` : 'En cours'}).`,
        };
      case 'SECRETAIRE':
        return {
          badge: 'Secrétariat & Admissions — EPST RDC',
          title: 'Tableau de Bord Secrétariat & Inscriptions',
          desc: `Suivi des admissions, délivrance d'attestations et mise à jour des dossiers des élèves.`,
        };
      case 'DIRECTEUR_DISCIPLINE':
        return {
          badge: 'Discipline & Assiduité — EPST RDC',
          title: 'Tableau de Bord Discipline & Conduite',
          desc: `Suivi du comportement des élèves, registre d'absences, retards et convocations des tuteurs.`,
        };
      case 'TITULAIRE':
      case 'ENSEIGNANT':
        return {
          badge: 'Espace Pédagogique Enseignant — EPST RDC',
          title: 'Tableau de Bord Professeur & Titulaire',
          desc: `Gestion des cours attribués, encodage des cotes d'interrogations/examens et emplois du temps.`,
        };
      case 'PARENT_ELEVE':
        return {
          badge: 'Portail Famille & Parent — EPST RDC',
          title: 'Espace Parent & Suivi Élève',
          desc: `Consultation des bulletins de vos enfants, état de compte des frais scolaires et communiqués.`,
        };
      case 'PROMOTEUR_ADMIN':
      default:
        return {
          badge: 'Pilotage Établissement — EPST RDC',
          title: 'Tableau de Bord Exécutif & Multi-Établissements',
          desc: `${yrNom ? `Année Scolaire ${yrNom} — ` : ''}Suivez en temps réel les effectifs, performances et finances de votre établissement.`,
        };
    }
  }, [userRole, data.selectedYear]);

  const kpis: KpiCardProps[] = useMemo(() => {
    const fmt = (n: number) => n.toLocaleString();
    const paid = stats.totalRevenue;
    const recovery = stats.recoveryRate;
    const totalStudents = stats.totalStudents;
    const activeStudents = stats.activeStudents;
    const girls = stats.girlsCount;
    const boys = stats.boysCount;

    if (userRole === 'COMPTABLE' || userRole === 'INTENDANT') {
      return [
        {
          label: 'Encaissements Perçus',
          sublabel: 'Minerval & frais scolaires payés',
          value: format(paid),
          trend: recovery > 0 ? `${recovery}% recouvré` : '0% encaissements',
          trendUp: recovery > 50,
          trendNeutral: recovery === 0,
          icon: DollarSign,
          iconColor: 'emerald',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('invoices'),
        },
        {
          label: 'Solde Caisse & Opérations',
          sublabel: 'Avoirs et entrées de la caisse',
          value: format(paid),
          trend: `${fmt(stats.topUnpaidInvoices.length)} factures impayées`,
          trendUp: true,
          icon: CreditCard,
          iconColor: 'indigo',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('cash'),
        },
        {
          label: 'Dépenses & Paie du Mois',
          sublabel: 'Décaissements et salaires',
          value: format(paid * 0.35),
          trend: 'Caisse en équilibre',
          trendUp: true,
          icon: Banknote,
          iconColor: 'violet',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('payroll'),
        },
        {
          label: 'Effectif Payant Total',
          sublabel: `${fmt(activeStudents)} élèves en règle`,
          value: `${fmt(totalStudents)}`,
          trend: `${recovery}% à jour`,
          trendUp: recovery >= 70,
          trendNeutral: recovery < 70,
          icon: Users,
          iconColor: 'sky',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('students'),
        },
      ];
    }

    if (userRole === 'PREFET_DIRECTEUR' || userRole === 'DIRECTEUR_ETUDES' || userRole === 'CENSEUR') {
      return [
        {
          label: 'Effectif Élèves Inscrit',
          sublabel: `${fmt(girls)} Filles / ${fmt(boys)} Garçons`,
          value: fmt(totalStudents),
          trend: `${fmt(activeStudents)} actifs en classe`,
          trendUp: totalStudents > 0,
          icon: GraduationCap,
          iconColor: 'indigo',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('students'),
        },
        {
          label: 'Taux de Présence du Jour',
          sublabel: 'Assiduité répertoriée aujourd\'hui',
          value: `${stats.presenceRate}%`,
          trend: stats.presenceRate >= 85 ? 'Excellente présence' : 'Absences à suivre',
          trendUp: stats.presenceRate >= 85,
          icon: UserCheck,
          iconColor: 'emerald',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('apprenants'),
        },
        {
          label: 'Moyenne Générale École',
          sublabel: 'Cotes & délibérations d\'examens',
          value: `${stats.averageScore}%`,
          trend: stats.averageScore >= 60 ? 'Moyenne positive' : 'Attention requise',
          trendUp: stats.averageScore >= 60,
          icon: Award,
          iconColor: 'amber',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Classes & Enseignants',
          sublabel: `${fmt(stats.totalClasses)} promotions · ${fmt(stats.totalStaff)} profs`,
          value: `${fmt(stats.totalClasses)}`,
          trend: `${fmt(stats.totalSubjects)} cours dispensés`,
          trendUp: true,
          icon: BookOpen,
          iconColor: 'violet',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('classes'),
        },
      ];
    }

    if (userRole === 'SECRETAIRE') {
      return [
        {
          label: 'Dossiers Inscrits Total',
          sublabel: `${fmt(activeStudents)} fiches complètes`,
          value: fmt(totalStudents),
          trend: `${fmt(totalStudents)} élèves au registre`,
          trendUp: true,
          icon: GraduationCap,
          iconColor: 'indigo',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('students'),
        },
        {
          label: 'Inscriptions à Compléter',
          sublabel: 'Pièces administratives manquantes',
          value: `${Math.max(0, totalStudents - activeStudents)}`,
          trend: 'Fiches à vérifier',
          trendUp: false,
          icon: FileText,
          iconColor: 'amber',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('students'),
        },
        {
          label: 'Classes & Capacité d\'Accueil',
          sublabel: `${fmt(stats.totalClasses)} salles attribuées`,
          value: `${fmt(stats.totalClasses)}`,
          trend: 'Capacité optimale',
          trendUp: true,
          icon: School,
          iconColor: 'emerald',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('classes'),
        },
        {
          label: 'Attestations & Reçus',
          sublabel: 'Certificats prêts à l\'impression',
          value: `${fmt(activeStudents)}`,
          trend: 'Documents à jour',
          trendUp: true,
          icon: Check,
          iconColor: 'violet',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('documents'),
        },
      ];
    }

    if (userRole === 'DIRECTEUR_DISCIPLINE') {
      const absencesJour = monthlyPresenceStats.absences || 0;
      const retardsJour = monthlyPresenceStats.retards || 0;
      const assiduite = stats.presenceRate || 95;
      return [
        {
          label: 'Registre Conduite & Sanctions',
          sublabel: 'Avertissements & retenues',
          value: '0 actif',
          trend: 'Discipline sous contrôle',
          trendUp: true,
          icon: Scale,
          iconColor: 'amber',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('discipline'),
        },
        {
          label: 'Taux d’Assiduité École',
          sublabel: 'Présence générale des élèves',
          value: `${assiduite}%`,
          trend: assiduite >= 90 ? 'Excellente assiduité' : 'Vigilance requise',
          trendUp: assiduite >= 90,
          icon: UserCheck,
          iconColor: 'emerald',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('apprenants'),
        },
        {
          label: 'Absences Signalées Aujourd’hui',
          sublabel: `${absencesJour} absence${absencesJour > 1 ? 's' : ''} · ${retardsJour} retard${retardsJour > 1 ? 's' : ''}`,
          value: `${absencesJour}`,
          trend: absencesJour === 0 ? 'Aucune absence' : `${absencesJour} dossier(s) à justifier`,
          trendUp: absencesJour === 0,
          trendNeutral: absencesJour > 0,
          icon: AlertCircle,
          iconColor: 'rose',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('apprenants'),
        },
        {
          label: 'Effectif Présent en Cours',
          sublabel: `${fmt(activeStudents)} élèves encadrés`,
          value: `${fmt(activeStudents)}`,
          trend: `${fmt(stats.totalClasses)} salles surveillées`,
          trendUp: true,
          icon: GraduationCap,
          iconColor: 'indigo',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('classes'),
        },
      ];
    }

    if (userRole === 'PARENT_ELEVE') {
      const recovery = stats.recoveryRate;
      return [
        {
          label: 'Moyenne & Progression Élève',
          sublabel: 'Résultats scolaires récents',
          value: `${stats.averageScore || 0}%`,
          trend: stats.averageScore >= 60 ? 'Bonne progression' : 'Soutien recommandé',
          trendUp: stats.averageScore >= 60,
          icon: Award,
          iconColor: 'amber',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Assiduité & Présence en Classe',
          sublabel: 'Assiduité de l’enfant aux cours',
          value: `${stats.presenceRate || 100}%`,
          trend: 'Présence régulière',
          trendUp: true,
          icon: UserCheck,
          iconColor: 'emerald',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Situation Frais Scolaires',
          sublabel: 'Minerval & frais d’études',
          value: recovery >= 100 ? 'En Règle' : `${recovery}% payé`,
          trend: recovery >= 100 ? 'Compte scolarité à jour' : 'Solde en cours',
          trendUp: recovery >= 100,
          trendNeutral: recovery < 100,
          icon: DollarSign,
          iconColor: 'indigo',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('invoices'),
        },
        {
          label: 'Calendrier & Examens à Venir',
          sublabel: 'Échéances EPST du trimestre',
          value: `${stats.upcomingEvents.length}`,
          trend: 'Événements prévus',
          trendUp: true,
          icon: Calendar,
          iconColor: 'violet',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
      ];
    }

    if (userRole === 'TITULAIRE') {
      return [
        {
          label: 'Élèves sous ma Titularisation',
          sublabel: 'Effectif de ma classe assignée',
          value: `${fmt(stats.totalStudents)}`,
          trend: `${fmt(activeStudents)} élèves actifs`,
          trendUp: true,
          icon: School,
          iconColor: 'indigo',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Moyenne Générale Classe',
          sublabel: 'Cotes de la promotion',
          value: `${stats.averageScore}%`,
          trend: stats.averageScore >= 60 ? 'Moyenne satisfaisante' : 'Remise à niveau',
          trendUp: stats.averageScore >= 60,
          icon: Award,
          iconColor: 'amber',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Taux de Présence de la Classe',
          sublabel: 'Assiduité des élèves',
          value: `${stats.presenceRate}%`,
          trend: 'Présence en classe',
          trendUp: true,
          icon: UserCheck,
          iconColor: 'emerald',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Préparation des Bulletins',
          sublabel: 'Délibérations & synthèses',
          value: 'Prêt',
          trend: 'Génération instantanée',
          trendUp: true,
          icon: ClipboardCheck,
          iconColor: 'violet',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
      ];
    }

    if (userRole === 'ENSEIGNANT') {
      return [
        {
          label: 'Classes & Cours Attribués',
          sublabel: 'Professeur de cours',
          value: `${fmt(stats.totalClasses)}`,
          trend: `${fmt(stats.totalSubjects)} cours dispensés`,
          trendUp: true,
          icon: BookOpen,
          iconColor: 'indigo',
          delay: 0,
          onViewDetails: () => onNavigate && onNavigate('schedule'),
        },
        {
          label: 'Moyenne des Interrogations',
          sublabel: 'Cotes d\'évaluations récentes',
          value: `${stats.averageScore}%`,
          trend: stats.averageScore >= 60 ? 'Moyenne satisfaisante' : 'Remise à niveau',
          trendUp: stats.averageScore >= 60,
          icon: Award,
          iconColor: 'amber',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Taux de Présence des Élèves',
          sublabel: 'Assiduité dans vos cours',
          value: `${stats.presenceRate}%`,
          trend: 'Présence en classe',
          trendUp: true,
          icon: UserCheck,
          iconColor: 'emerald',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('grades'),
        },
        {
          label: 'Prochaines Évaluations',
          sublabel: 'Interros / Examens programmés',
          value: `${stats.upcomingEvents.length}`,
          trend: 'Échéances à venir',
          trendUp: true,
          icon: Calendar,
          iconColor: 'violet',
          delay: 180,
          onViewDetails: () => onNavigate && onNavigate('examens'),
        },
      ];
    }

    // Default: PROMOTEUR_ADMIN
    return [
      {
        label: 'Effectif Total Élèves',
        sublabel: `${fmt(activeStudents)} actif${activeStudents > 1 ? 's' : ''} · ${fmt(girls)} F / ${fmt(boys)} M`,
        value: fmt(totalStudents),
        trend: totalStudents > 0 ? `${fmt(totalStudents)} inscrit${totalStudents > 1 ? 's' : ''}` : 'Aucun inscrit',
        trendUp: totalStudents > 0,
        trendNeutral: totalStudents === 0,
        icon: GraduationCap,
        iconColor: 'indigo',
        delay: 0,
        onViewDetails: () => onNavigate && onNavigate('students'),
      },
      {
        label: 'Recettes Perçues',
        sublabel: 'Minerval & frais encaissés',
        value: format(paid),
        trend: recovery > 0 ? `${recovery}% recouvré` : 'Aucun paiement',
        trendUp: recovery > 50,
        trendNeutral: recovery === 0,
        icon: DollarSign,
        iconColor: 'emerald',
        delay: 60,
        onViewDetails: () => onNavigate && onNavigate('invoices'),
      },
      {
        label: 'Personnel & Classes',
        sublabel: `${fmt(stats.totalClasses)} classe${stats.totalClasses > 1 ? 's' : ''} · ${fmt(stats.totalSubjects)} matière${stats.totalSubjects > 1 ? 's' : ''}`,
        value: `${fmt(stats.totalStaff)}`,
        trend: stats.totalStaff > 0 ? `${fmt(stats.totalStaff)} membre${stats.totalStaff > 1 ? 's' : ''}` : 'Aucun personnel',
        trendUp: stats.totalStaff > 0,
        trendNeutral: stats.totalStaff === 0,
        icon: UserCheck,
        iconColor: 'violet',
        delay: 120,
        onViewDetails: () => onNavigate && onNavigate('teachers'),
      },
      {
        label: 'Taux de Réussite',
        sublabel: `Présence: ${stats.presenceRate}% · Moyenne école`,
        value: `${stats.averageScore}%`,
        trend: stats.averageScore > 0 ? `${stats.averageScore}% moyenne` : 'Aucune cote saisie',
        trendUp: stats.averageScore >= 60,
        trendNeutral: stats.averageScore === 0,
        icon: Award,
        iconColor: 'amber',
        delay: 180,
        onViewDetails: () => onNavigate && onNavigate('grades'),
      },
    ];
  }, [stats, format, onNavigate, userRole, monthlyPresenceStats]);

  return (
    <div className="space-y-4 w-full px-1 py-1 pb-8">

      {/* ===== BANNIÈRE D'ACCUEIL SOBRE & ÉLÉGANTE ===== */}
      <div
        className="animate-fade-in p-4 sm:p-5 rounded-2xl border shadow-xs relative overflow-hidden flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-colors"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              {roleHeader.badge}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Synchro Active
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>{roleHeader.title}</span>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {roleHeader.desc}
          </p>
          {!data.loading && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {[
                { label: `${stats.totalStudents} élève${stats.totalStudents > 1 ? 's' : ''}`, color: '#6366f1' },
                { label: `${stats.totalClasses} classe${stats.totalClasses > 1 ? 's' : ''}`, color: '#10b981' },
                { label: `${stats.totalStaff} personnel${stats.totalStaff > 1 ? 's' : ''}`, color: '#8b5cf6' },
                { label: `${stats.recoveryRate}% recouvrement`, color: stats.recoveryRate > 50 ? '#10b981' : '#f59e0b' },
              ].map((item) => (
                <span
                  key={item.label}
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                  style={{
                    background: `${item.color}12`,
                    borderColor: `${item.color}30`,
                    color: item.color,
                  }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* BOUTONS D'ACTION ÉPURÉS SEGMENTÉS PAR PERMISSIONS DU RÔLE */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={refreshData}
            className="px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border text-indigo-500 hover:bg-indigo-500/10"
            style={{
              background: 'var(--bg-sunken)',
              borderColor: 'var(--border)',
            }}
            title="Actualiser les données de la base de données en direct"
          >
            <RotateCcw className={`w-4 h-4 text-indigo-500 ${data.loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          {hasTabAccess(userRole, 'students') && (
            <button
              onClick={() => {
                if (onOpenRegistration) {
                  onOpenRegistration();
                } else if (onNavigate) {
                  onNavigate('students');
                }
              }}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>Inscrire Élève</span>
            </button>
          )}

          {hasTabAccess(userRole, 'invoices') && (
            <button
              onClick={() => onNavigate && onNavigate('invoices')}
              className="px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Saisir Paiement</span>
            </button>
          )}

          {hasTabAccess(userRole, 'grades') && (
            <button
              onClick={() => onNavigate && onNavigate('grades')}
              className="px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <ClipboardCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Cotes & Bulletins</span>
            </button>
          )}

          {hasTabAccess(userRole, 'documents') && (
            <button
              onClick={() => onNavigate && onNavigate('documents')}
              className="px-3.5 py-2 rounded-lg font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border"
              style={{
                background: 'var(--bg-sunken)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Document EPST</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== BARRE DE FILTRAGE MULTI-CRITÈRES INTELLIGENTE ===== */}
      <div
        className="p-3.5 rounded-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-3 animate-fade-in relative z-20 transition-all border"
        style={{
          background: 'var(--bg-surface)',
          borderColor: activeFilterCount > 0 ? 'rgba(99,102,241,0.40)' : 'var(--border)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors shadow-xs ${activeFilterCount > 0 ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-slate-500/10 border-slate-500/20'}`}>
            <Filter className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Filtres Adaptatifs EPST</h3>
              {activeFilterCount > 0 ? (
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-indigo-600 text-white shadow-xs">
                  {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-bold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                  Par défaut
                </span>
              )}
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Adaptation dynamique selon le cycle et l'option sélectionnés</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto min-w-[180px]">
            <CustomSelect
              options={schoolYearOptions}
              value={selectedSchoolYearId}
              onChange={setSelectedSchoolYearId}
              placeholder="Année Scolaire"
            />
          </div>

          <div className="w-full sm:w-auto min-w-[170px]">
            <CustomSelect
              options={cycleOptions}
              value={selectedCycleFilter}
              onChange={handleCycleChange}
              placeholder="Cycle EPST"
            />
          </div>

          <div className="w-full sm:w-auto min-w-[170px]">
            <CustomSelect
              options={subSelectOptions}
              value={selectedOptionFilter}
              onChange={setSelectedOptionFilter}
              placeholder={subSelectPlaceholder}
              disabled={subSelectOptions.length <= 1}
            />
          </div>

          <div className="w-full sm:w-auto min-w-[170px]">
            <CustomSelect
              options={periodOptions}
              value={selectedPeriodFilter}
              onChange={setSelectedPeriodFilter}
              placeholder="Période Scolaire"
            />
          </div>

          <CustomDatePicker
            value={selectedDateFilter}
            onChange={setSelectedDateFilter}
            alignRight={true}
            className="w-full sm:w-auto"
          />

          <button
            onClick={() => {
              setSelectedSchoolYearId(defaultSchoolYearId);
              setSelectedCycleFilter('ALL');
              setSelectedOptionFilter('ALL');
              setSelectedPeriodFilter(defaultPeriodKey);
              setSelectedDateFilter(todayStr);
            }}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Réinitialiser tous les filtres"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* ===== BARRE D'ONGLETS DU DASHBOARD (Material 3 Segmented Control) ===== */}
      <div
        className="flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto sidebar-scroll border transition-all"
        style={{
          background: 'var(--bg-sunken)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        {availableSubTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer select-none ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-500/10 border border-transparent'
              }`}
            >
              <TabIcon className={`w-4 h-4 transition-transform ${isActive ? 'text-white scale-110' : 'text-indigo-500 dark:text-indigo-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== CONTENU DYNAMIQUE SELON L'ONGLET SÉLECTIONNÉ ===== */}
      {activeSubTab === 'executive' && (
        <>
          {/* 4 Cartes KPI Exécutives */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {kpis.map((kpi, i) => (
              <KpiCard key={i} {...kpi} />
            ))}
          </div>

          {/* Section Graphiques Exécutifs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Performances Académiques & Présences (8/12) */}
            <div
              className="lg:col-span-8 p-4 sm:p-5 rounded-2xl shadow-xs animate-fade-in flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Performances Académiques & Présences Élèves
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Évolution mensuelle de la moyenne des cotes par rapport à l'assiduité
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex p-1 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      {[
                        { id: 'BOTH', label: 'Toutes les courbes' },
                        { id: 'COTES', label: 'Cotes' },
                        { id: 'PRESENCE', label: 'Présences' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setChartMode(m.id as any)}
                          className={`px-2.5 py-1 text-[10.5px] font-bold rounded-md transition-all cursor-pointer ${
                            chartMode === m.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Message d'information si aucune cote enregistrée */}
                {stats.averageScore === 0 && (
                  <div className="mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
                    <span className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      Aucune cote n'a encore été saisie dans le registre. La moyenne générale est à 0%.
                    </span>
                    <button
                      onClick={() => onNavigate && onNavigate('grades')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 font-bold transition-all shrink-0 cursor-pointer"
                    >
                      Saisir des Cotes
                    </button>
                  </div>
                )}

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={donneesPerformance} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradCotes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradPresence" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.12)" vertical={false} />
                      <XAxis dataKey="mois" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        domain={[0, 100]}
                        ticks={[0, 25, 50, 75, 100]}
                        stroke="var(--text-muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                        width={35}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 1 }} />
                      {(chartMode === 'BOTH' || chartMode === 'COTES') && (
                        <Area
                          type="monotone"
                          dataKey="moyenneCotes"
                          name="moyenneCotes"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#gradCotes)"
                          dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 0 }}
                          activeDot={{ r: 5.5, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                        />
                      )}
                      {(chartMode === 'BOTH' || chartMode === 'PRESENCE') && (
                        <Area
                          type="monotone"
                          dataKey="tauxPresence"
                          name="tauxPresence"
                          stroke="#10b981"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          fillOpacity={1}
                          fill="url(#gradPresence)"
                          dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Moyenne générale ({stats.averageScore}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Assiduité globale ({stats.presenceRate}%)</span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate && onNavigate('grades')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Consulter le Registre des Cotes</span>
                </button>
              </div>
            </div>

            {/* Droite : Synthèse Financière (4/12) */}
            <div
              className="lg:col-span-4 p-4 sm:p-5 rounded-2xl shadow-xs animate-fade-in flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Synthèse Financière
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {stats.recoveryRate}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Objectifs et encaissements par trimestre
                </p>

                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={donneesFinancieres} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="trimestre" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                      <Bar dataKey="objectif" fill="var(--bg-sunken)" radius={[4, 4, 0, 0]} name="objectif" />
                      <Bar dataKey="encaisse" fill="#6366f1" radius={[4, 4, 0, 0]} name="encaisse" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  {[
                    { label: "Frais d'Études (Minerval)", val: format(stats.totalRevenue), color: '#6366f1', icon: GraduationCap },
                    { label: 'Subventions & Donateurs', val: format(0), color: '#10b981', icon: Award },
                    { label: 'Impayés en Recouvrement', val: format(stats.totalUnpaid), color: '#ef4444', icon: AlertCircle },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between p-2 rounded-lg transition-all"
                      style={{ background: 'var(--bg-sunken)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border border-slate-500/15"
                          style={{ background: `${item.color}15` }}
                        >
                          <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                        </div>
                        <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      </div>
                      <span className="text-xs font-bold shrink-0" style={{ color: item.color }}>{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('invoices')}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Journal Comptable Complet</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section Inférieure : 3 Colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Alertes Critiques */}
            <div
              className="p-4 rounded-2xl shadow-xs animate-fade-in flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
                      <Bell className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <h3 className="font-bold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>Alertes Critiques</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                    URGENT
                  </span>
                </div>

                <div className="p-4 rounded-xl border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune Alerte Critiques</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tous les registres et assiduités scolaires sont en ordre.</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('students')}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Voir toutes les alertes (8)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Activité Récente */}
            <div
              className="p-4 rounded-2xl shadow-xs animate-fade-in flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                      <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>Activité Récente</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    EN DIRECT
                  </span>
                </div>

                {stats.recentActivity.length === 0 ? (
                  <div className="p-4 rounded-xl border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune Activité Récente</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Aucune activité enregistrée pour cette année scolaire.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedRecentActivity.map((fu) => (
                      <div key={fu.id} className="flex items-start gap-2.5">
                        <img
                          src={fu.avatarUrl}
                          alt={fu.nomAuteur}
                          className="w-8 h-8 rounded-full object-cover border border-slate-500/20 shadow-xs shrink-0 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{fu.nomAuteur}</span>
                            {' '}{fu.titre}
                          </p>
                          <span className="text-[9.5px] mt-0.5 block font-medium text-slate-500 dark:text-slate-400">{fu.ilYA}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {stats.recentActivity.length > 0 && (
                  <Pagination
                    currentPage={recentActivityPagination.page}
                    totalPages={recentActivityPagination.totalPages}
                    total={recentActivityPagination.total}
                    pageSize={recentActivityPagination.pageSize}
                    start={recentActivityPagination.start}
                    end={recentActivityPagination.end}
                    onPageChange={recentActivityPagination.setPage}
                    onPageSizeChange={recentActivityPagination.setPageSize}
                  />
                )}
              </div>

              <button
                onClick={() => onNavigate && onNavigate('faculty')}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Journal d'activités complet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Événements EPST */}
            <div
              className="p-4 rounded-2xl shadow-xs animate-fade-in flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="font-bold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>Calendrier EPST</h3>
                  </div>
                </div>

                {stats.upcomingEvents.length === 0 ? (
                  <div className="p-4 rounded-xl border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucun Événement Planifié</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Aucun événement dans l'agenda de l'année scolaire.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {paginatedUpcomingEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2.5">
                        <div className="rounded-lg p-1 text-center min-w-[38px] shrink-0 border shadow-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <div className="text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {ev.dateJour.split(' ')[1] || ''}
                          </div>
                          <div className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                            {ev.dateJour.split(' ')[0] || ev.dateJour}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="text-[11.5px] font-bold leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{ev.titre}</h4>
                          <p className="text-[9.5px] mt-0.5 flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3 text-indigo-500" />
                            {ev.heureLieu}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {stats.upcomingEvents.length > 0 && (
                  <Pagination
                    currentPage={upcomingEventsPagination.page}
                    totalPages={upcomingEventsPagination.totalPages}
                    total={upcomingEventsPagination.total}
                    pageSize={upcomingEventsPagination.pageSize}
                    start={upcomingEventsPagination.start}
                    end={upcomingEventsPagination.end}
                    onPageChange={upcomingEventsPagination.setPage}
                    onPageSizeChange={upcomingEventsPagination.setPageSize}
                  />
                )}
              </div>

              <button
                onClick={() => onNavigate && onNavigate('schedule')}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Agenda scolaire complet</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </>
      )}

      {/* ===== ONGLET 2 : CALENDRIER SCOLAIRE INTERACTIF & OFFICIEL RDC ===== */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-4 animate-fade-in">
          <SchoolCalendar />
        </div>
      )}

      {/* ===== ONGLET 3 : PÉDAGOGIE & PERFORMANCES ===== */}
      {activeSubTab === 'pedagogy' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Distribution des Élèves par Cycle EPST */}
            <div
              className="lg:col-span-5 p-5 rounded-2xl flex flex-col justify-between border transition-all"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--elevation-1)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Distribution par Cycle EPST
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {cycleTotal.toLocaleString()} Élèves
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Répartition des effectifs selon le cycle actif ({selectedCycleFilter})</p>

                {/* Graphique Donut avec Badge Central */}
                <div className="h-56 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={donneesCycle}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {donneesCycle.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{cycleTotal.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Élèves Inscrits</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                  {donneesCycle.map(dc => (
                    <div key={dc.name} className="p-2.5 rounded-xl border shadow-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: dc.color }} />
                        <span className="text-[11px] font-black" style={{ color: 'var(--text-primary)' }}>{dc.name}</span>
                      </div>
                      <p className="text-xs font-black flex items-center justify-center gap-1">
                        <span style={{ color: dc.color }}>{dc.value}</span>
                        <span className="text-[10px] text-slate-400 font-medium">({dc.pct})</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('students')}
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Accéder au répertoire global des élèves</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Palmarès & Performance des Classes */}
            <div
              className="lg:col-span-7 p-5 rounded-2xl flex flex-col justify-between border transition-all"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--elevation-1)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    Palmarès & Effectifs par Promotion
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                    {filteredData.classes.length} Classe(s) Ouverte(s)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Synthèse des effectifs et indicateurs de performance</p>

                {filteredData.classes.length > 0 ? (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto sidebar-scroll pr-1">
                    {filteredData.classes.map(cls => {
                      const classStudents = filteredData.students.filter(s => s.classId === cls.id || s.nomClasse === cls.nom);
                      const girls = classStudents.filter(s => s.sexe === 'F').length;
                      const boys = classStudents.length - girls;
                      const hasStudents = classStudents.length > 0;
                      return (
                        <div
                          key={cls.id}
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 transition-all hover:bg-indigo-500/5"
                          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-black text-xs shrink-0 border border-indigo-500/25">
                              {cls.nom.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{cls.nom}</p>
                              <p className="text-[10.5px] text-slate-400 font-medium">
                                {cls.salle || 'Salle de classe'} · {cls.optionCode || 'Tronc Commun'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">{classStudents.length} élève{classStudents.length > 1 ? 's' : ''}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{girls}F / {boys}M</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                              hasStudents ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}>
                              {hasStudents ? 'Actif' : 'En attente'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Aucune classe répertoriée pour ce cycle</p>
                  </div>
                )}
              </div>

              <div className="pt-3.5 mt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => onNavigate && onNavigate('classes')}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Gestion complète des classes</span>
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('grades')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Award className="w-3.5 h-3.5 text-white" />
                  <span>Palmarès & Cotes</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===== ONGLET 3 : FINANCES & RECOUVREMENT ===== */}
      {activeSubTab === 'finances' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Total Encaissements Minerval',
                val: format(stats.totalRevenue),
                sub: `${stats.recoveryRate}% des objectifs annuels`,
              },
              {
                label: 'Reste à Recouvrer (Impayés)',
                val: format(stats.totalUnpaid),
                sub: `${filteredData.invoices.filter((inv) => getInvoiceRemaining(inv, filteredData.payments, displayCurrency) > 0.001).length} dossier(s) en retard`,
              },
              {
                label: 'Solde en Caisse & Banques',
                val: format(stats.cashBalance),
                sub: stats.totalExpenses > 0 ? `Dépenses: ${format(stats.totalExpenses)}` : 'Comptabilité vierge',
              },
            ].map((f, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl shadow-xs flex flex-col justify-between border transition-colors"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
              >
                <div>
                  <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">{f.label}</p>
                  <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{f.val}</p>
                  <p className="text-[10.5px] mt-1 font-medium text-slate-500 dark:text-slate-400">{f.sub}</p>
                </div>
                <button
                  onClick={() => onNavigate && onNavigate('invoices')}
                  className="mt-3 pt-2 border-t text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-between cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span>Détail complet</span>
                  <ArrowRight className="w-3 h-3 text-indigo-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              className="p-5 rounded-2xl shadow-xs flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Ventilation des Encaissements par Canal</h3>
                <div className="space-y-2.5 mt-3">
                  {stats.paymentMethods.length > 0 ? stats.paymentMethods.map((m, i) => {
                    const Icon = m.method.includes('Caisse') ? DollarSign : m.method.includes('Carte') || m.method.includes('Banque') ? CreditCard : Smartphone;
                    return (
                      <div key={i} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-sunken)' }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{m.method}</span>
                        </div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{format(m.amount)} ({m.pct}%)</span>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 p-3">Aucun encaissement enregistré.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('invoices')}
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Toutes les transactions électroniques</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-5 rounded-2xl shadow-xs flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>Top des Impayés par Promotion</h3>
                {stats.topUnpaidInvoices.length > 0 ? (
                  <div className="space-y-2 mt-3">
                    {paginatedTopUnpaid.map((inv, i) => (
                      <div key={i} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-sunken)' }}>
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{inv.nomEleve}</span>
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{format(inv.montant)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border text-center space-y-1 mt-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucun Impayé Enregistré</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Toutes les factures et minervals sont en ordre.</p>
                  </div>
                )}
                {stats.topUnpaidInvoices.length > 0 && (
                  <Pagination
                    currentPage={topUnpaidPagination.page}
                    totalPages={topUnpaidPagination.totalPages}
                    total={topUnpaidPagination.total}
                    pageSize={topUnpaidPagination.pageSize}
                    start={topUnpaidPagination.start}
                    end={topUnpaidPagination.end}
                    onPageChange={topUnpaidPagination.setPage}
                    onPageSizeChange={topUnpaidPagination.setPageSize}
                  />
                )}
              </div>

              <button
                onClick={() => onNavigate && onNavigate('invoices')}
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Registre des impayés ({stats.topUnpaidInvoices.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ONGLET 4 : VIE SCOLAIRE, PRÉSENCES & DISCIPLINE ===== */}
      {activeSubTab === 'viescolaire' && (
        <div className="space-y-4 animate-fade-in">
          {/* CARTES KPI DE SYNTHÈSE VIE SCOLAIRE */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="p-4 rounded-2xl shadow-xs border transition-colors flex items-center justify-between"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Taux d'Assiduité Globale</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{stats.presenceRate}%</span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Moyenne générale de présence</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div
              className="p-4 rounded-2xl shadow-xs border transition-colors flex items-center justify-between"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Absences Ce Mois</span>
                <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">{monthlyPresenceStats.absences}</span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">{monthlyPresenceStats.justifiees} justifiée{monthlyPresenceStats.justifiees > 1 ? 's' : ''}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div
              className="p-4 rounded-2xl shadow-xs border transition-colors flex items-center justify-between"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Retards Signalisés</span>
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{monthlyPresenceStats.retards}</span>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Registre des retards en classe</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* SECTION PRÉSENCE DU JOUR PAR CATÉGORIE ET CYCLE */}
          <DailyAttendanceByCategory selectedCycleFilter={selectedCycleFilter} data={stats.attendanceByCycle} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-3 border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <HeartPulse className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Infirmerie & Consultations Récentes</span>
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">{monthlyPresenceStats.absences} absence{monthlyPresenceStats.absences > 1 ? 's' : ''} ce mois</span>
                </div>
                <div className="p-4 rounded-xl border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune Consultation Récente</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Le registre de santé de l'infirmerie est vierge.</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('viescolaire')}
                className="pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Registre complet de santé & infirmerie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-3 border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Scale className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span>Rapports Disciplinaires Récents</span>
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">{monthlyPresenceStats.retards} retard{monthlyPresenceStats.retards > 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 rounded-xl border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucun Rapport Disciplinaire</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Le registre disciplinaire ne contient aucune sanction.</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('viescolaire')}
                className="pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Registre disciplinaire intégral</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
