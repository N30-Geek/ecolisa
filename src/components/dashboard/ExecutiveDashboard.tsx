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
  CheckCircle,
  X,
  Filter,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Search,
  FileText,
  Flag,
  Banknote,
  Plus,
  Wallet,
  Receipt,
  Settings,
  FileSpreadsheet,
  Briefcase,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  BookMarked,
  Bus,
  Utensils,
  Lock
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
import { CalendarExportModal } from './CalendarExportModal';
import { CalendarEventData } from '../../utils/calendarHelpers';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

import { RôleSystème } from '../../types';
import { hasTabAccess, ROLE_DETAILS, normalizeAccessCycle } from '../../utils/permissions';

// ── Props du Dashboard Exécutif ────────────────────────────────────────────
interface ExecutiveDashboardProps {
  onNavigate?: (tab: string) => void;
  onOpenRegistration?: () => void;
  activeSchoolYear?: string;
  userRole?: RôleSystème;
}

// ── Tooltip personnalisé Recharts 100% Adaptatif Mode Clair & Sombre ───────
const CustomTooltip = ({ active, payload, label }: any) => {
  const { format } = useSchoolConfig();
  if (!active || !payload?.length) return null;
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
  const colorMap: Record<string, string> = {
    indigo: '#6366f1',
    emerald: '#10b981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    violet: '#8b5cf6',
    sky: '#0ea5e9',
  };
  const color = colorMap[iconColor] || colorMap.indigo;

  return (
    <div
      className="animate-fade-in p-4 rounded-2xl border transition-all duration-250 relative overflow-hidden group flex flex-col justify-between cursor-default"
      style={{
        animationDelay: `${delay}ms`,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px -6px rgba(0,0,0,0.08), 0 4px 12px -4px rgba(0,0,0,0.04)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.25)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      <div className="relative z-10">
        {/* Header: Label & Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-0.5">
            <span className="text-[10px] font-semibold tracking-wide block text-slate-500 dark:text-slate-400 truncate">
              {label}
            </span>
            <span className="text-[11px] font-medium block text-slate-400 dark:text-slate-500 truncate">
              {sublabel}
            </span>
          </div>

          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-250 group-hover:scale-105"
            style={{ background: `${color}10`, color }}
          >
            <Icon className="w-[18px] h-[18px]" />
          </div>
        </div>

        {/* Value and Trend */}
        <div className="mt-3">
          <div className="text-2xl font-bold tracking-tight leading-none tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {value}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border"
              style={{
                background: trendNeutral ? 'rgba(100,116,139,0.08)' : trendUp ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                borderColor: trendNeutral ? 'rgba(100,116,139,0.18)' : trendUp ? 'rgba(16,185,129,0.18)' : 'rgba(244,63,94,0.18)',
                color: trendNeutral ? '#64748b' : trendUp ? '#059669' : '#e11d48',
              }}
            >
              {!trendNeutral && (trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
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
          className="relative z-10 mt-3 pt-2.5 border-t w-full flex items-center justify-between text-[11px] font-medium transition-all duration-200 cursor-pointer group/btn select-none"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <span className="group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400 transition-colors">
            Détails
          </span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
        </button>
      )}
    </div>
  );
};

// ── COMPOSANT CALENDRIER SCOLAIRE OFFICIEL RDC 2026-2027 (MINEDU-NC) ──────────
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

  const [showExportModal, setShowExportModal] = useState(false);
  const handleExportPDF = () => setShowExportModal(true);

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
                  {ev.publicCible && ev.publicCible !== 'TOUS' && (
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

      {showExportModal && (
        <CalendarExportModal
          events={allEvents}
          title="Calendrier Scolaire Officiel RDC"
          subtitle="MINEDU-NC / Programme national 2026-2027"
          anneeScolaire="2026-2027"
          onClose={() => setShowExportModal(false)}
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

  // Les enseignants et titulaires ne voient que la pédagogie, pas les finances
  const isTeacherRole = userRole === 'ENSEIGNANT' || userRole === 'TITULAIRE';

  // Accès aux vues et données financières selon le rôle
  const canSeeAdvancedFinance = userRole === 'PROMOTEUR_ADMIN' || ROLE_DETAILS[userRole]?.canManageFinance;
  const canSeeFinancialActivity = userRole === 'PROMOTEUR_ADMIN' || hasTabAccess(userRole, 'invoices') || hasTabAccess(userRole, 'cash');

  // Cycles accessibles au compte connecté (promoteur/admin = null = tout)
  const currentUser = LocalDatabaseService.getCurrentUser();
  const accessibleCycles = useMemo<string[] | null>(() => {
    if (!currentUser || currentUser.role === 'PROMOTEUR_ADMIN') return null;
    const cycles = new Set<string>();
    (currentUser.cyclesAssignes || []).forEach(c => {
      const normalized = normalizeAccessCycle(c);
      if (normalized) cycles.add(normalized);
    });
    if (currentUser.cycle) {
      const normalized = normalizeAccessCycle(currentUser.cycle);
      if (normalized) cycles.add(normalized);
    }
    return Array.from(cycles);
  }, [currentUser?.id, currentUser?.cycle, currentUser?.cyclesAssignes?.join(',')]);

  const accessibleCycleOptions = useMemo<SelectOption[]>(() => {
    if (accessibleCycles === null) return cycleOptions;
    return [
      { value: 'ALL', label: 'Tous les cycles', icon: School },
      ...cycleOptions.filter(c => c.value !== 'ALL' && accessibleCycles.includes(c.value)),
    ];
  }, [accessibleCycles]);


  const [activeSubTab, setActiveSubTab] = useState<'executive' | 'calendar' | 'pedagogy' | 'finances'>(
    isTeacherRole ? 'pedagogy' : 'executive'
  );

  const availableSubTabs = useMemo(() => {
    const tabs: Array<{ id: 'executive' | 'calendar' | 'pedagogy' | 'finances'; label: string; icon: React.ElementType }> = [];

    // Les enseignants n'ont pas accès à la synthèse exécutive (données financières globales)
    if (!isTeacherRole) {
      tabs.push({ id: 'executive', label: 'Synthèse Exécutive', icon: Activity });
    }

    tabs.push({ id: 'calendar', label: 'Calendrier EPST 2026–2027', icon: Calendar });

    if (hasTabAccess(userRole, 'grades') || hasTabAccess(userRole, 'classes') || userRole === 'PROMOTEUR_ADMIN') {
      tabs.push({ id: 'pedagogy', label: isTeacherRole ? 'Mes Cours & Classes' : 'Pédagogie & Performances', icon: GraduationCap });
    }

    // Les finances avancées (tableau de bord financier) sont réservées aux rôles financiers
    if (!isTeacherRole && canSeeAdvancedFinance) {
      tabs.push({ id: 'finances', label: 'Finances & Recouvrement', icon: DollarSign });
    }

    return tabs;
  }, [userRole, isTeacherRole, canSeeAdvancedFinance]);

  useEffect(() => {
    const subtab = sessionStorage.getItem('ecolisa_dashboard_subtab');
    if (subtab && availableSubTabs.some(t => t.id === subtab)) {
      setActiveSubTab(subtab as any);
    }
    sessionStorage.removeItem('ecolisa_dashboard_subtab');
  }, [availableSubTabs]);

  useEffect(() => {
    if (!availableSubTabs.some(t => t.id === activeSubTab)) {
      setActiveSubTab(isTeacherRole ? 'pedagogy' : 'executive');
    }
  }, [availableSubTabs, activeSubTab, isTeacherRole]);

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
    
    // Rafraîchissement périodique (1 minute) uniquement quand l'onglet est visible
    const interval = setInterval(() => {
      if (!document.hidden && mounted) load();
    }, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedSchoolYearId]);

  // ÉTATS DES FILTRES MULTI-CRITÈRES INTELLIGENTS
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>('ALL');
  const [selectedOptionFilter, setSelectedOptionFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('FULL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filtres du graphique de performance
  const [perfCategory, setPerfCategory] = useState<string>('MOYENNE');
  const [perfClasse, setPerfClasse] = useState<string>('ALL');
  const [perfSalle, setPerfSalle] = useState<string>('ALL');

  // Valeurs par défaut utilisées pour le badge "filtres actifs" et la réinitialisation
  const defaultSchoolYearId = activeYearId;
  const defaultPeriodKey = 'FULL';
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredData = useMemo<DashboardData>(
    () => filterDashboardData(data, selectedCycleFilter, selectedOptionFilter),
    [data, selectedCycleFilter, selectedOptionFilter]
  );

  const stats = useMemo<DashboardStats>(() => computeDashboardStats(filteredData, displayCurrency, currencies), [filteredData, displayCurrency, currencies]);

  const filteredRecentActivity = useMemo(() => {
    // Les paiements/encaissements ne sont visibles que par les rôles habilités aux finances
    if (!isTeacherRole && canSeeFinancialActivity) return stats.recentActivity;
    return stats.recentActivity.filter(a => !a.id.startsWith('pay-'));
  }, [stats.recentActivity, isTeacherRole, canSeeFinancialActivity]);

  const { paginated: paginatedRecentActivity, ...recentActivityPagination } = usePagination(filteredRecentActivity, { defaultPageSize: 10 });

  const { paginated: paginatedUpcomingEvents, ...upcomingEventsPagination } = usePagination(stats.upcomingEvents, { defaultPageSize: 5 });
  const { paginated: paginatedTopUnpaid, ...topUnpaidPagination } = usePagination(stats.topUnpaidInvoices, { defaultPageSize: 5 });

  // ALERTES RÉELLES DU DASHBOARD
  const dashboardAlerts = useMemo(() => {
    const alerts: { id: string; type: 'warning' | 'danger' | 'info'; title: string; desc: string; action?: string; onClick?: () => void }[] = [];

    if (canSeeFinancialActivity && stats.topUnpaidInvoices.length > 0) {
      const totalUnpaid = stats.topUnpaidInvoices.reduce((sum, inv) => sum + inv.montant, 0);
      alerts.push({
        id: 'unpaid',
        type: 'danger',
        title: `${stats.topUnpaidInvoices.length} impayé${stats.topUnpaidInvoices.length > 1 ? 's' : ''}`,
        desc: `Total restant à recouvrer : ${format(totalUnpaid)}`,
        action: 'Factures',
        onClick: () => onNavigate && onNavigate('invoices'),
      });
    }

    if (stats.presenceRate > 0 && stats.presenceRate < 80) {
      alerts.push({
        id: 'presence',
        type: 'warning',
        title: 'Présence faible',
        desc: `Taux d'assiduité du jour à ${stats.presenceRate}%`,
        action: 'Pointage',
        onClick: () => onNavigate && onNavigate('pointage'),
      });
    }

    if (stats.averageScore === 0 && stats.totalStudents > 0) {
      alerts.push({
        id: 'nocotes',
        type: 'info',
        title: 'Cotes à saisir',
        desc: 'Aucune cote n\'a encore été enregistrée.',
        action: 'Cotes',
        onClick: () => onNavigate && onNavigate('grades'),
      });
    }

    if (stats.totalStudents === 0) {
      alerts.push({
        id: 'nostudents',
        type: 'warning',
        title: 'Aucun élève inscrit',
        desc: 'Commencez par inscrire un élève pour cette année.',
        action: 'Inscription',
        onClick: () => onOpenRegistration ? onOpenRegistration() : onNavigate && onNavigate('students'),
      });
    }

    if (filteredData.students.some(s => s.statut === 'EXCLU' || s.statut === 'TRANSFERE')) {
      const count = filteredData.students.filter(s => s.statut === 'EXCLU' || s.statut === 'TRANSFERE').length;
      alerts.push({
        id: 'inactifs',
        type: 'warning',
        title: `${count} élève${count > 1 ? 's' : ''} à suivre`,
        desc: 'Des élèves sont marqués exclus ou transférés.',
        action: 'Élèves',
        onClick: () => onNavigate && onNavigate('students'),
      });
    }

    return alerts;
  }, [stats, filteredData.students, format, onNavigate, onOpenRegistration, canSeeFinancialActivity]);

  // Repli si le cycle sélectionné n'est plus accessible (changement de compte)
  useEffect(() => {
    if (selectedCycleFilter === 'ALL') return;
    if (!accessibleCycleOptions.some(o => o.value === selectedCycleFilter)) {
      setSelectedCycleFilter('ALL');
    }
  }, [selectedCycleFilter, accessibleCycleOptions]);

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

  const periodFilterQuarters: Record<string, string[]> = {
    FULL: ['T1', 'T2', 'T3', 'T4'],
    S1: ['T1', 'T2'],
    S2: ['T3', 'T4'],
    T1: ['T1'],
    T2: ['T2'],
    T3: ['T3'],
    T4: ['T4'],
  };

  const performanceClasseOptions = useMemo<SelectOption[]>(() => {
    const all = [{ value: 'ALL', label: 'Toutes les classes', icon: School }];
    const classes = [...data.classes]
      .sort((a, b) => a.nom.localeCompare(b.nom))
      .map(c => ({ value: c.id, label: c.nom, icon: School }));
    return [...all, ...classes];
  }, [data.classes]);

  const performanceSalleOptions = useMemo<SelectOption[]>(() => {
    const all = [{ value: 'ALL', label: 'Toutes les salles', icon: Users }];
    const salles = Array.from(new Set(data.classes.flatMap(c => [c.salle, ...(c.salles || [])]).filter(Boolean)))
      .sort()
      .map(s => ({ value: s as string, label: s as string, icon: Users }));
    return [...all, ...salles];
  }, [data.classes]);

  const performanceCategoryOptions: SelectOption[] = [
    { value: 'MOYENNE', label: 'Moyenne générale', icon: Award },
    { value: 'REUSSITE', label: 'Taux de réussite', icon: CheckCircle },
    { value: 'PRESENCE', label: 'Assiduité', icon: UserCheck },
  ];

  const donneesPerformance = useMemo(() => {
    const selectedDate = new Date(`${selectedDateFilter}T00:00:00`);
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const classById = new Map(filteredData.classes.map(c => [c.id, c]));
    const studentById = new Map(filteredData.students.map(s => [s.id, s]));

    const getClassFor = (record: any) => {
      if (record.classeId) return classById.get(record.classeId);
      const student = studentById.get(record.eleveId);
      if (student?.classId) return classById.get(student.classId);
      if (student?.nomClasse) return filteredData.classes.find(c => c.nom === student.nomClasse);
      return undefined;
    };

    const matchCote = (c: any) => {
      const cls = getClassFor(c);
      const classId = cls?.id || c.classeId;
      if (perfClasse !== 'ALL' && classId !== perfClasse) return false;
      if (perfSalle !== 'ALL' && cls) {
        if (cls.salle !== perfSalle && !(cls.salles || []).includes(perfSalle)) return false;
      }
      return true;
    };
    const matchPresence = (p: any) => {
      const cls = getClassFor(p);
      const classId = cls?.id || p.classeId;
      if (perfClasse !== 'ALL' && classId !== perfClasse) return false;
      if (perfSalle !== 'ALL' && cls) {
        if (cls.salle !== perfSalle && !(cls.salles || []).includes(perfSalle)) return false;
      }
      return true;
    };

    const dailyMap = new Map<string, { cotes: number[]; presences: any[] }>();
    filteredData.cotes.filter(matchCote).forEach(c => {
      const date = c.dateCote;
      if (!date) return;
      const entry = dailyMap.get(date) || { cotes: [], presences: [] };
      entry.cotes.push((c.score / (c.maxScore || 100)) * 100);
      dailyMap.set(date, entry);
    });
    filteredData.presences.filter(matchPresence).forEach(p => {
      const date = p.dateJour;
      if (!date) return;
      const entry = dailyMap.get(date) || { cotes: [], presences: [] };
      entry.presences.push(p);
      dailyMap.set(date, entry);
    });

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const point = dailyMap.get(date) || { cotes: [], presences: [] };
      const moyenneCotes = point.cotes.length > 0 ? Math.round((point.cotes.reduce((s, v) => s + v, 0) / point.cotes.length) * 10) / 10 : 0;
      const tauxPresence = point.presences.length > 0
        ? Math.round((point.presences.filter((p: any) => p.statut === 'PRESENT' || p.statut === 'RETARD' || p.statut === 'JUSTIFIE').length / point.presences.length) * 1000) / 10
        : 0;
      const tauxReussite = point.cotes.length > 0
        ? Math.round((point.cotes.filter(v => v >= 50).length / point.cotes.length) * 1000) / 10
        : 0;
      return {
        mois: String(day).padStart(2, '0'),
        date,
        moyenneCotes,
        tauxPresence,
        tauxReussite,
      };
    });
  }, [filteredData.cotes, filteredData.presences, filteredData.classes, filteredData.students, selectedDateFilter, perfClasse, perfSalle]);

  const donneesCycle = useMemo(() => {
    const total = Math.max(1, stats.totalStudents);
    const secondaire = new Set(['SECONDAIRE', 'HUMANITES', 'CTEB']);
    let items = stats.studentsByCycle.map((c) => ({ ...c, pct: `${Math.round((c.value / total) * 100)}%` }));

    // Filtrer par les cycles accessibles à l'utilisateur (sauf promoteur/admin)
    if (accessibleCycles !== null) {
      items = items.filter((c) =>
        accessibleCycles.includes(c.code) ||
        (c.code === 'SECONDAIRE' && accessibleCycles.some((ac) => secondaire.has(ac)))
      );
    }

    if (selectedCycleFilter !== 'ALL') {
      items = items.filter((c) => c.code === selectedCycleFilter || (selectedCycleFilter === 'SECONDAIRE' && secondaire.has(c.code)));
    }
    return items;
  }, [stats.studentsByCycle, stats.totalStudents, selectedCycleFilter, accessibleCycles]);

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
      case 'DIRECTEUR_ECOLE':
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

    if (userRole === 'PREFET_DIRECTEUR' || userRole === 'DIRECTEUR_ECOLE' || userRole === 'DIRECTEUR_ETUDES' || userRole === 'CENSEUR') {
      const hasPointage = stats.presenceRate > 0 || (stats.attendanceByCycle || []).some(c => c.hasPointage);
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
          sublabel: hasPointage ? 'Assiduité répertoriée aujourd\'hui' : 'Aucun pointage enregistré',
          value: hasPointage ? `${stats.presenceRate.toFixed(1)}%` : '—',
          trend: hasPointage ? (stats.presenceRate >= 85 ? 'Excellente présence' : 'Absences à suivre') : 'Pointage en attente',
          trendUp: hasPointage && stats.presenceRate >= 85,
          trendNeutral: !hasPointage,
          icon: UserCheck,
          iconColor: hasPointage ? 'emerald' : 'amber',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('pointage'),
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
      const hasPointage = stats.presenceRate > 0 || (stats.attendanceByCycle || []).some(c => c.hasPointage);
      const assiduite = hasPointage ? stats.presenceRate : 0;
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
          sublabel: hasPointage ? 'Présence générale des élèves' : 'Aucun pointage enregistré',
          value: hasPointage ? `${assiduite.toFixed(1)}%` : '—',
          trend: hasPointage ? (assiduite >= 90 ? 'Excellente assiduité' : 'Vigilance requise') : 'Pointage en attente',
          trendUp: hasPointage && assiduite >= 90,
          trendNeutral: !hasPointage,
          icon: UserCheck,
          iconColor: hasPointage ? 'emerald' : 'amber',
          delay: 60,
          onViewDetails: () => onNavigate && onNavigate('pointage'),
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
          label: 'Effectif Actif Scolarisé',
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
      const hasPointage = stats.presenceRate > 0 || (stats.attendanceByCycle || []).some(c => c.hasPointage);
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
          sublabel: hasPointage ? 'Assiduité de l’enfant aux cours' : 'Aucun pointage enregistré',
          value: hasPointage ? `${stats.presenceRate.toFixed(1)}%` : '—',
          trend: hasPointage ? (stats.presenceRate >= 90 ? 'Présence régulière' : 'Absences à suivre') : 'Pointage en attente',
          trendUp: hasPointage && stats.presenceRate >= 90,
          trendNeutral: !hasPointage,
          icon: UserCheck,
          iconColor: hasPointage ? 'emerald' : 'amber',
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
          sublabel: stats.presenceRate > 0 ? 'Assiduité des élèves' : 'Aucun pointage enregistré',
          value: stats.presenceRate > 0 ? `${stats.presenceRate.toFixed(1)}%` : '—',
          trend: stats.presenceRate > 0 ? 'Présence en classe' : 'Pointage en attente',
          trendUp: stats.presenceRate > 0,
          trendNeutral: stats.presenceRate === 0,
          icon: UserCheck,
          iconColor: stats.presenceRate > 0 ? 'emerald' : 'amber',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('pointage'),
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
          sublabel: stats.presenceRate > 0 ? 'Assiduité dans vos cours' : 'Aucun pointage enregistré',
          value: stats.presenceRate > 0 ? `${stats.presenceRate.toFixed(1)}%` : '—',
          trend: stats.presenceRate > 0 ? 'Présence en classe' : 'Pointage en attente',
          trendUp: stats.presenceRate > 0,
          trendNeutral: stats.presenceRate === 0,
          icon: UserCheck,
          iconColor: stats.presenceRate > 0 ? 'emerald' : 'amber',
          delay: 120,
          onViewDetails: () => onNavigate && onNavigate('pointage'),
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

  /* ── Barre d'accès rapides adaptée au rôle ─────────────────────────────── */
  const quickActions = useMemo(() => {
    const actions: any[] = [];

    const add = (id: string, label: string, icon: any, nav: string, primary = false) => {
      if (hasTabAccess(userRole, id as any)) {
        actions.push({ id, label, icon, onClick: () => (id === 'students' && onOpenRegistration ? onOpenRegistration() : onNavigate && onNavigate(nav)), primary });
      }
    };

    if (userRole === 'PROMOTEUR_ADMIN') {
      add('students', 'Inscrire élève', UserPlus, 'students', true);
      add('teachers', 'Personnel', Users, 'teachers');
      add('invoices', 'Paiement', CreditCard, 'invoices');
      add('fees', 'Frais scolaires', Banknote, 'fees');
      add('reports', 'Rapports', FileSpreadsheet, 'reports');
      add('settings', 'Paramètres', Settings, 'settings');
    } else if (userRole === 'COMPTABLE' || userRole === 'INTENDANT') {
      add('invoices', 'Saisir paiement', CreditCard, 'invoices', true);
      add('cash', 'Caisse', Wallet, 'cash');
      add('reports', 'Rapports', FileSpreadsheet, 'reports');
      add('expenses', 'Dépenses', Receipt, 'expenses');
    } else if (['PREFET_DIRECTEUR', 'DIRECTEUR_ECOLE', 'DIRECTEUR_ETUDES', 'CENSEUR'].includes(userRole || '')) {
      add('students', 'Inscrire élève', UserPlus, 'students', true);
      add('grades', 'Cotes & bulletins', ClipboardCheck, 'grades');
      add('deliberation', 'Délibérations', Scale, 'deliberation');
      add('schedule', 'Emploi du temps', CalendarDays, 'schedule');
      add('teachers', 'Personnel', Users, 'teachers');
    } else if (userRole === 'SECRETAIRE') {
      add('students', 'Inscrire élève', UserPlus, 'students', true);
      add('documents', 'Documents', FileText, 'documents');
      add('years', 'Années scolaires', Calendar, 'years');
    } else if (userRole === 'DIRECTEUR_DISCIPLINE') {
      add('discipline', 'Discipline', ShieldCheck, 'discipline', true);
      add('pointage', 'Absences', CalendarCheck, 'pointage');
      add('students', 'Dossiers élèves', UserCheck, 'students');
    } else if (userRole === 'TITULAIRE' || userRole === 'ENSEIGNANT') {
      add('grades', 'Saisir cotes', ClipboardCheck, 'grades', true);
      add('pointage', 'Faire l\'appel', UserCheck, 'pointage');
      add('schedule', 'Emploi du temps', CalendarDays, 'schedule');
      add('students', 'Mes élèves', Users, 'students');
    } else if (userRole === 'PARENT_ELEVE') {
      add('invoices', 'Paiements', CreditCard, 'invoices', true);
      add('grades', 'Bulletins', Award, 'grades');
      add('students', 'Mes enfants', Users, 'students');
    }

    return [{ id: 'refresh', label: 'Actualiser', icon: RotateCcw, onClick: refreshData, primary: false }, ...actions];
  }, [userRole, onNavigate, onOpenRegistration, refreshData]);

  return (
    <div className="space-y-4 w-full px-1 py-1 pb-8">

      {/* ===== BANNIÈRE D'ACCUEIL SOBRE & ÉLÉGANTE ===== */}
      <div
        className="animate-fade-in p-4 sm:p-5 rounded-2xl border relative overflow-hidden flex flex-col xl:flex-row xl:items-start justify-between gap-4 transition-all"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium tracking-wide text-slate-600 dark:text-slate-300 border flex items-center gap-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <ShieldCheck className="w-3 h-3" style={{ color: 'var(--sidebar-active-text)' }} />
              {roleHeader.badge}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Synchro Active
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>{roleHeader.title}</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed font-normal">
            {roleHeader.desc}
          </p>
          {!data.loading && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {[
                { label: `${stats.totalStudents} élève${stats.totalStudents > 1 ? 's' : ''}`, color: '#6366f1', hidden: false },
                { label: `${stats.totalClasses} classe${stats.totalClasses > 1 ? 's' : ''}`, color: '#10b981', hidden: false },
                { label: `${stats.totalStaff} personnel${stats.totalStaff > 1 ? 's' : ''}`, color: '#8b5cf6', hidden: isTeacherRole },
                { label: `${stats.recoveryRate}% recouvrement`, color: stats.recoveryRate > 50 ? '#10b981' : '#f59e0b', hidden: isTeacherRole || !canSeeAdvancedFinance },
              ].filter(item => !item.hidden).map((item) => (
                <span
                  key={item.label}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium border"
                  style={{
                    background: `${item.color}10`,
                    borderColor: `${item.color}20`,
                    color: item.color,
                  }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* BOUTONS D'ACCÈS RAPIDE ADAPTÉS AU RÔLE */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {quickActions.map((action) => {
            const ActionIcon = action.icon;
            const isRefresh = action.id === 'refresh';
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={isRefresh && data.loading}
                className={`group relative px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer border overflow-hidden active:scale-[0.96] hover:-translate-y-0.5 ${
                  action.primary
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600'
                    : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
                style={{
                  background: action.primary ? undefined : 'var(--bg-surface)',
                  borderColor: action.primary ? undefined : 'var(--border)',
                  boxShadow: 'var(--elevation-1)',
                }}
                title={action.label}
              >
                <span
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: action.primary ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.06)' }}
                />
                <ActionIcon className={`w-3.5 h-3.5 relative z-10 ${isRefresh && data.loading ? 'animate-spin' : ''}`} />
                <span className="capitalize relative z-10">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== BARRE DE FILTRAGE MULTI-CRITÈRES INTELLIGENTE ===== */}
      <div
        className="p-2.5 rounded-lg flex flex-col xl:flex-row xl:items-center justify-between gap-2 animate-fade-in relative z-20 transition-all border"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors"
            style={{
              background: activeFilterCount > 0 ? 'rgba(99,102,241,0.08)' : 'var(--bg-sunken)',
              borderColor: activeFilterCount > 0 ? 'rgba(99,102,241,0.25)' : 'var(--border)',
            }}
          >
            <Filter className="w-4 h-4" style={{ color: 'var(--sidebar-active-text)' }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[11px] font-medium tracking-wide capitalize" style={{ color: 'var(--text-primary)' }}>Filtres adaptatifs EPST</h3>
              {activeFilterCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium text-white" style={{ background: '#6366f1' }}>
                  {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9.5px] font-medium text-slate-500 border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  Par défaut
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Adaptation dynamique selon le cycle et l'option sélectionnés</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto min-w-[170px]">
            <CustomSelect
              options={schoolYearOptions}
              value={selectedSchoolYearId}
              onChange={setSelectedSchoolYearId}
              placeholder="Année Scolaire"
            />
          </div>

          <div className="w-full sm:w-auto min-w-[160px]">
            <CustomSelect
              options={accessibleCycleOptions}
              value={selectedCycleFilter}
              onChange={handleCycleChange}
              placeholder="Cycle"
            />
          </div>

          <div className="w-full sm:w-auto min-w-[160px]">
            <CustomSelect
              options={subSelectOptions}
              value={selectedOptionFilter}
              onChange={setSelectedOptionFilter}
              placeholder={subSelectPlaceholder}
              disabled={subSelectOptions.length <= 1}
            />
          </div>

          <div className="w-full sm:w-auto min-w-[160px]">
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
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: '#e11d48',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title="Réinitialiser tous les filtres"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="capitalize">Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* ===== BARRE D'ONGLETS DU DASHBOARD (Material 3 Segmented Control) ===== */}
      <div
        className="flex items-center gap-1 p-1.5 rounded-2xl overflow-x-auto sidebar-scroll border transition-all"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {availableSubTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeSubTab === tab.id;
          const tabColors: Record<string, string> = {
            executive: '#6366f1',
            calendar: '#10b981',
            pedagogy: '#f59e0b',
            finances: '#ef4444',
          };
          const color = tabColors[tab.id] || '#6366f1';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer select-none active:scale-[0.98] ${
                isActive
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300'
              }`}
              style={{
                background: isActive ? color : 'transparent',
                boxShadow: isActive ? `0 3px 8px -2px ${color}40` : undefined,
              }}
            >
              <TabIcon className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-white' : ''}`} style={{ color: isActive ? '#fff' : color }} />
              <span className="capitalize">{tab.label}</span>
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

            {/* Performances des élèves (pleine largeur) */}
            <div
              className="lg:col-span-12 p-4 rounded-xl animate-fade-in flex flex-col justify-between border transition-all"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div>
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Performance des élèves
                    </h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Évolution de la moyenne générale sur le mois sélectionné
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CustomSelect
                      options={performanceCategoryOptions}
                      value={perfCategory}
                      onChange={setPerfCategory}
                      placeholder="Catégorie"
                      className="w-full sm:w-auto min-w-[150px]"
                    />
                    <CustomSelect
                      options={accessibleCycleOptions}
                      value={selectedCycleFilter}
                      onChange={handleCycleChange}
                      placeholder="Cycle"
                      className="w-full sm:w-auto min-w-[150px]"
                    />
                    <CustomSelect
                      options={subSelectOptions}
                      value={selectedOptionFilter}
                      onChange={setSelectedOptionFilter}
                      placeholder={subSelectPlaceholder}
                      disabled={subSelectOptions.length <= 1}
                      className="w-full sm:w-auto min-w-[150px]"
                    />
                    <CustomSelect
                      options={performanceClasseOptions}
                      value={perfClasse}
                      onChange={setPerfClasse}
                      placeholder="Classe"
                      className="w-full sm:w-auto min-w-[150px]"
                    />
                    <CustomSelect
                      options={performanceSalleOptions}
                      value={perfSalle}
                      onChange={setPerfSalle}
                      placeholder="Salle"
                      className="w-full sm:w-auto min-w-[150px]"
                    />
                  </div>
                </div>

                {/* Message d'information si aucune cote enregistrée */}
                {stats.averageScore === 0 && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/08 border flex items-center justify-between text-xs" style={{ borderColor: 'rgba(245,158,11,0.20)', color: '#b45309' }}>
                    <span className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      Aucune cote n'a encore été saisie dans le registre. La moyenne générale est à 0%.
                    </span>
                    <button
                      onClick={() => onNavigate && onNavigate('grades')}
                      className="px-2.5 py-1 rounded-md bg-amber-500/12 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-medium transition-all shrink-0 cursor-pointer"
                    >
                      Saisir des cotes
                    </button>
                  </div>
                )}

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={donneesPerformance} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={`grad-${perfCategory}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1'} stopOpacity={0.30} />
                          <stop offset="95%" stopColor={perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1'} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.10)" vertical={false} />
                      <XAxis dataKey="mois" interval={2} stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
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
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1'}20`, strokeWidth: 1 }} />
                      <Area
                        type="monotone"
                        dataKey={perfCategory === 'PRESENCE' ? 'tauxPresence' : perfCategory === 'REUSSITE' ? 'tauxReussite' : 'moyenneCotes'}
                        name={perfCategory === 'PRESENCE' ? 'Assiduité' : perfCategory === 'REUSSITE' ? 'Taux de réussite' : 'Moyenne générale'}
                        stroke={perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1'}
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill={`url(#grad-${perfCategory})`}
                        dot={{ r: 3, fill: perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: perfCategory === 'PRESENCE' ? '#10b981' : perfCategory === 'REUSSITE' ? '#f59e0b' : '#6366f1' }} />
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {perfCategory === 'PRESENCE' ? `Assiduité globale (${stats.presenceRate}%)` : perfCategory === 'REUSSITE' ? `Taux de réussite (${donneesPerformance.filter(d => d.tauxReussite > 0).length > 0 ? Math.round((donneesPerformance.reduce((s, d) => s + d.tauxReussite, 0) / Math.max(1, donneesPerformance.filter(d => d.tauxReussite > 0).length))) : 0}%)` : `Moyenne générale (${stats.averageScore}%)`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate && onNavigate('grades')}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] hover:shadow-md"
                  style={{
                    background: 'var(--bg-surface)',
                    color: '#6366f1',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--elevation-1)',
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="capitalize">Registre des cotes</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section Inférieure : 3 Colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Alertes du tableau de bord */}
            <div
              className="p-4 rounded-xl flex flex-col justify-between border transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.08)' }}>
                      <Bell className="w-3.5 h-3.5" style={{ color: '#f43f5e' }} />
                    </div>
                    <h3 className="font-medium text-[13px]" style={{ color: 'var(--text-primary)' }}>Alertes</h3>
                  </div>
                  {dashboardAlerts.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white" style={{ background: '#f43f5e' }}>
                      {dashboardAlerts.length}
                    </span>
                  )}
                </div>

                {dashboardAlerts.length === 0 ? (
                  <div className="p-3 rounded-lg border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Aucune alerte</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tous les registres sont en ordre.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dashboardAlerts.slice(0, 4).map((alert) => {
                      const color = alert.type === 'danger' ? '#f43f5e' : alert.type === 'warning' ? '#f59e0b' : '#6366f1';
                      return (
                        <button
                          key={alert.id}
                          onClick={alert.onClick}
                          className="w-full text-left p-2 rounded-lg border transition-all hover:-translate-y-0.5 active:scale-[0.98]"
                          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate" style={{ color }}>{alert.title}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug truncate">{alert.desc}</p>
                            </div>
                            {alert.action && (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0" style={{ background: `${color}10`, color }}>{alert.action}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate && onNavigate('audit')}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-[11px] font-medium transition-colors cursor-pointer hover:text-indigo-600"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <span>Journal d'activités</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Activité Récente */}
            <div
              className="p-4 rounded-xl flex flex-col justify-between border transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <Activity className="w-3.5 h-3.5" style={{ color: '#6366f1' }} />
                    </div>
                    <h3 className="font-medium text-[13px]" style={{ color: 'var(--text-primary)' }}>
                      {isTeacherRole ? 'Activité pédagogique' : 'Activité récente'}
                    </h3>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                    En direct
                  </span>
                </div>

                {filteredRecentActivity.length === 0 ? (
                  <div className="p-3 rounded-lg border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune Activité Récente</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isTeacherRole
                        ? 'Aucune activité pédagogique enregistrée. Commencez par encoder des cotes ou faire l\'appel.'
                        : 'Aucune activité enregistrée pour cette année scolaire.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paginatedRecentActivity.map((fu) => (
                      <div key={fu.id} className="flex items-start gap-2">
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
                {filteredRecentActivity.length > 0 && (
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
                onClick={() => onNavigate && onNavigate('audit')}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-[11px] font-medium transition-colors cursor-pointer hover:text-indigo-600"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <span>{isTeacherRole ? 'Mes activités pédagogiques' : 'Journal d\'activités complet'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Événements EPST */}
            <div
              className="p-4 rounded-xl flex flex-col justify-between border transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.08)' }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                    </div>
                    <h3 className="font-medium text-[13px]" style={{ color: 'var(--text-primary)' }}>Agenda scolaire</h3>
                  </div>
                  {stats.upcomingEvents.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                      {stats.upcomingEvents.length}
                    </span>
                  )}
                </div>

                {stats.upcomingEvents.length === 0 ? (
                  <div className="p-4 rounded-lg border text-center space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Aucun événement planifié</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">L'agenda de l'année scolaire est vide.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {paginatedUpcomingEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-2.5">
                        <div className="rounded-lg p-1 text-center min-w-[38px] shrink-0 border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <div className="text-[8px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {ev.dateJour.split(' ')[1] || ''}
                          </div>
                          <div className="text-[12px] font-semibold leading-tight" style={{ color: '#6366f1' }}>
                            {ev.dateJour.split(' ')[0] || ev.dateJour}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <h4 className="text-[11.5px] font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>{ev.titre}</h4>
                          <p className="text-[9.5px] mt-0.5 flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3" style={{ color: '#6366f1' }} />
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
                onClick={() => {
                  try {
                    sessionStorage.setItem('ecolisa_dashboard_subtab', 'calendar');
                  } catch {}
                  onNavigate && onNavigate('dashboard');
                }}
                className="mt-3 pt-2.5 border-t w-full flex items-center justify-between text-[11px] font-medium transition-colors cursor-pointer hover:text-emerald-600"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
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
          <SchoolCalendar events={data.schoolEvents} />
        </div>
      )}

      {/* ===== ONGLET 3 : PÉDAGOGIE & PERFORMANCES ===== */}
      {activeSubTab === 'pedagogy' && (
        <div className="space-y-4 animate-fade-in">

          {/* ── PANNEAU ENSEIGNANT : Espace Pédagogique Personnalisé ── */}
          {isTeacherRole && (
            <div className="space-y-4">
              {/* Bannière Enseignant */}
              <div
                className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)',
                  borderColor: 'rgba(99,102,241,0.2)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Espace Pédagogique — Professeur
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Accès rapide à vos classes, cotes, appels et emplois du temps
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" />
                    {stats.totalClasses} classe{stats.totalClasses > 1 ? 's' : ''} assignée{stats.totalClasses > 1 ? 's' : ''}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 flex items-center gap-1.5">
                    <UserCheck className="w-3 h-3" />
                    {stats.totalStudents} élève{stats.totalStudents > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Actions Rapides Enseignant — 4 cartes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    icon: ClipboardCheck,
                    iconBg: '#6366f1',
                    title: 'Encoder les Cotes',
                    desc: 'Interrogations, examens, travaux pratiques',
                    action: () => onNavigate && onNavigate('grades'),
                    badge: `${stats.averageScore}% moy.`,
                    badgeColor: stats.averageScore >= 60 ? 'emerald' : 'amber',
                  },
                  {
                    icon: UserCheck,
                    iconBg: '#10b981',
                    title: 'Faire l\'Appel',
                    desc: 'Présences, absences et retards du jour',
                    action: () => onNavigate && onNavigate('apprenants'),
                    badge: `${stats.presenceRate}% assiduité`,
                    badgeColor: stats.presenceRate >= 85 ? 'emerald' : 'amber',
                  },
                  {
                    icon: Calendar,
                    iconBg: '#8b5cf6',
                    title: 'Emploi du Temps',
                    desc: 'Horaires, salles et cours programmés',
                    action: () => onNavigate && onNavigate('schedule'),
                    badge: `${stats.upcomingEvents.length} événement${stats.upcomingEvents.length !== 1 ? 's' : ''}`,
                    badgeColor: 'indigo',
                  },
                  {
                    icon: Award,
                    iconBg: '#f59e0b',
                    title: 'Mes Évaluations',
                    desc: 'Contrôles et examens à corriger',
                    action: () => onNavigate && onNavigate('examens'),
                    badge: 'Planification',
                    badgeColor: 'amber',
                  },
                ].map((card) => {
                  const CardIcon = card.icon;
                  return (
                    <button
                      key={card.title}
                      onClick={card.action}
                      className="p-3 rounded-xl border text-left flex flex-col gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                      style={{
                        background: 'var(--bg-surface)',
                        borderColor: 'var(--border)',
                        boxShadow: 'var(--elevation-1)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${card.iconBg}20` }}
                        >
                          <CardIcon className="w-4 h-4" style={{ color: card.iconBg }} />
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black bg-${card.badgeColor}-500/15 text-${card.badgeColor}-700 dark:text-${card.badgeColor}-300 border border-${card.badgeColor}-500/25`}>
                          {card.badge}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>{card.title}</p>
                        <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">{card.desc}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
                        <span>Accéder</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Palmarès Classes Assignées */}
              <div
                className="p-4 rounded-2xl border transition-all hover:shadow-lg"
                style={{
                  background: 'var(--bg-surface)',
                  borderColor: 'var(--border)',
                  boxShadow: 'var(--elevation-2)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Mes Classes & Effectifs
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Classes sous votre responsabilité pédagogique
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {filteredData.classes.length} Classe(s)
                  </span>
                </div>

                {filteredData.classes.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredData.classes.slice(0, 8).map(cls => {
                      const classStudents = filteredData.students.filter(s => s.classId === cls.id || s.nomClasse === cls.nom);
                      const girls = classStudents.filter(s => s.sexe === 'F').length;
                      const boys = classStudents.length - girls;
                      return (
                        <div
                          key={cls.id}
                          className="p-2 rounded-lg border flex items-center justify-between gap-2 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 border" style={{ background: 'var(--bg-surface)', color: '#6366f1', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
                              {cls.nom.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{cls.nom}</p>
                              <p className="text-[10.5px] text-slate-400 font-medium">
                                {cls.salle || 'Salle'} · {cls.optionCode || 'Tronc Commun'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 block">{classStudents.length} élève{classStudents.length > 1 ? 's' : ''}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{girls}F / {boys}M</span>
                            </div>
                            <button
                              onClick={() => onNavigate && onNavigate('grades')}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Cotes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-500">Aucune classe assignée pour le moment</p>
                    <p className="text-[11px] text-slate-400">Contactez votre direction pour votre affectation de classes</p>
                  </div>
                )}

                <div className="pt-3.5 mt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={() => onNavigate && onNavigate('classes')}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir toutes mes classes</span>
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate('grades')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-white" />
                    <span>Encoder des Cotes</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── VUE ADMIN/DIRECTION : Distribution par Cycle + Palmarès ── */}
          {!isTeacherRole && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Distribution des Élèves par Cycle EPST */}
            <div
              className="lg:col-span-5 p-4 rounded-2xl flex flex-col justify-between border transition-all hover:shadow-lg"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Distribution par Cycle EPST
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Répartition des effectifs par cycle actif
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-black border"
                    style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.22)' }}
                  >
                    {cycleTotal.toLocaleString()} Élèves
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 mt-3">
                  {/* Graphique Donut */}
                  <div className="h-48 w-48 shrink-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={donneesCycle}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={74}
                          paddingAngle={3}
                        >
                          {donneesCycle.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>{cycleTotal.toLocaleString()}</span>
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Élèves</span>
                    </div>
                  </div>

                  {/* Légende détaillée */}
                  <div className="flex-1 w-full space-y-2">
                    {donneesCycle.map(dc => (
                      <div
                        key={dc.name}
                        className="flex items-center gap-2.5 p-2 rounded-lg border transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}
                      >
                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: dc.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{dc.name}</span>
                            <span className="text-[10px] font-black" style={{ color: dc.color }}>{dc.pct}</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-500/10 overflow-hidden mt-1.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: dc.pct, background: dc.color }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-black shrink-0" style={{ color: 'var(--text-primary)' }}>{dc.value}</span>
                      </div>
                    ))}
                  </div>
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

            {/* Palmarès & Effectifs par Promotion */}
            <div
              className="lg:col-span-7 p-4 rounded-2xl flex flex-col justify-between border transition-all hover:shadow-lg"
              style={{
                background: 'var(--bg-surface)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--elevation-2)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Palmarès & Effectifs par Promotion
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Synthèse des effectifs par classe
                    </p>
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-full text-[10px] font-black border"
                    style={{ background: 'rgba(16,185,129,0.10)', color: '#10b981', borderColor: 'rgba(16,185,129,0.22)' }}
                  >
                    {filteredData.classes.length} Promotion{filteredData.classes.length > 1 ? 's' : ''}
                  </span>
                </div>

                {filteredData.classes.length > 0 ? (
                  <div className="space-y-1.5 mt-3 max-h-[320px] overflow-y-auto sidebar-scroll pr-1">
                    {filteredData.classes
                      .map(cls => {
                        const classStudents = filteredData.students.filter(s => s.classId === cls.id || s.nomClasse === cls.nom);
                        const girls = classStudents.filter(s => s.sexe === 'F').length;
                        const boys = classStudents.length - girls;
                        return { cls, classStudents, girls, boys };
                      })
                      .sort((a, b) => b.classStudents.length - a.classStudents.length)
                      .map(({ cls, classStudents, girls, boys }, index) => {
                        const totalStudents = filteredData.students.length;
                        const pct = totalStudents > 0 ? Math.round((classStudents.length / totalStudents) * 1000) / 10 : 0;
                        const hasStudents = classStudents.length > 0;

                        return (
                          <div
                            key={cls.id}
                            className="group p-2 rounded-lg border flex items-center justify-between gap-2 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                            style={{
                              background: 'var(--bg-surface)',
                              borderColor: 'var(--border)',
                              boxShadow: 'var(--elevation-1)',
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 border"
                                style={{ background: 'var(--bg-surface)', color: '#6366f1', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}
                              >
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black truncate" style={{ color: 'var(--text-primary)' }}>{cls.nom}</p>
                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                  {cls.salle || 'Salle'} · {cls.optionCode || 'Tronc Commun'}
                                </p>
                                <div className="w-20 h-1 rounded-full bg-slate-500/10 overflow-hidden mt-1.5">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, background: '#6366f1' }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{classStudents.length} <span className="text-[10px] font-medium text-slate-400">élèves</span></span>
                                <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                  <span className="text-[10px] font-medium text-pink-500">{girls}F</span>
                                  <span className="text-[10px] text-slate-300">·</span>
                                  <span className="text-[10px] font-medium text-indigo-500">{boys}M</span>
                                </div>
                              </div>
                              <span
                                className="px-2 py-0.5 rounded-md text-[10px] font-black border"
                                style={{
                                  background: hasStudents ? 'rgba(16,185,129,0.10)' : 'rgba(148,163,184,0.10)',
                                  color: hasStudents ? '#10b981' : 'var(--text-muted)',
                                  borderColor: hasStudents ? 'rgba(16,185,129,0.22)' : 'var(--border)',
                                }}
                              >
                                {hasStudents ? 'Actif' : 'En attente'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-2">
                    <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
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
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Award className="w-3.5 h-3.5 text-white" />
                  <span>Palmarès & Cotes</span>
                </button>
              </div>
            </div>

          </div>
          )}

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
                color: '#10b981',
                icon: Banknote,
                nav: 'invoices',
              },
              {
                label: 'Reste à Recouvrer (Impayés)',
                val: format(stats.totalUnpaid),
                sub: `${filteredData.invoices.filter((inv) => getInvoiceRemaining(inv, filteredData.payments, displayCurrency) > 0.001).length} dossier(s) en retard`,
                color: '#ef4444',
                icon: AlertCircle,
                nav: 'invoices',
              },
              {
                label: 'Solde en Caisse & Banques',
                val: format(stats.cashBalance),
                sub: stats.totalExpenses > 0 ? `Dépenses: ${format(stats.totalExpenses)}` : 'Comptabilité vierge',
                color: '#6366f1',
                icon: Wallet,
                nav: 'cash',
              },
            ].map((f, i) => {
              const FinIcon = f.icon;
              return (
                <div
                  key={i}
                  className="p-4 rounded-2xl flex flex-col justify-between border transition-all hover:shadow-md active:scale-[0.99]"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-2)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                      <p className="text-2xl font-black mt-1.5" style={{ color: 'var(--text-primary)' }}>{f.val}</p>
                      <p className="text-[10.5px] mt-1 font-medium" style={{ color: f.color }}>{f.sub}</p>
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{ background: 'var(--bg-surface)', borderColor: `${f.color}30`, color: f.color }}
                    >
                      <FinIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate && onNavigate(f.nav)}
                    className="mt-4 pt-3 border-t text-[10.5px] font-bold flex items-center justify-between cursor-pointer transition-colors hover:opacity-80"
                    style={{ borderColor: 'var(--border)', color: f.color }}
                  >
                    <span>Détail complet</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div
              className="p-4 rounded-2xl flex flex-col justify-between border transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-2)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: '#6366f1' }}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>Encaissements par Canal</h3>
                </div>
                <div className="space-y-1.5 mt-2.5">
                  {stats.paymentMethods.length > 0 ? stats.paymentMethods.map((m, i) => {
                    const Icon = m.method.includes('Caisse') ? DollarSign : m.method.includes('Carte') || m.method.includes('Banque') ? CreditCard : Smartphone;
                    const canalColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];
                    const color = canalColors[i % canalColors.length];
                    return (
                      <div
                        key={i}
                        className="p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border" style={{ background: 'var(--bg-surface)', borderColor: `${color}30`, color }}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{m.method}</span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{format(m.amount)}</p>
                          <p className="text-[10px] font-medium" style={{ color }}>{m.pct}%</p>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 p-2">Aucun encaissement enregistré.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('invoices')}
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Toutes les transactions</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className="p-4 rounded-2xl flex flex-col justify-between border transition-all"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>Impayés Prioritaires</h3>
                </div>
                {stats.topUnpaidInvoices.length > 0 ? (
                  <div className="space-y-1.5 mt-2.5">
                    {paginatedTopUnpaid.map((inv, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg border flex items-center justify-between gap-2 transition-all hover:shadow-sm"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black shrink-0" style={{ background: 'rgba(239,68,68,0.10)', color: '#ef4444' }}>
                            {i + 1}
                          </div>
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{inv.nomEleve}</span>
                        </div>
                        <span className="text-xs font-black" style={{ color: '#ef4444' }}>{format(inv.montant)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border text-center space-y-1 mt-2.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucun Impayé Enregistré</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Toutes les factures sont en ordre.</p>
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
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Registre des impayés ({stats.topUnpaidInvoices.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
