import React, { useState, useMemo } from 'react';
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
  Flag
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
import { mockEvents, mockFacultyUpdates } from '../../data/mockData';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

// ── Props du Dashboard Exécutif ────────────────────────────────────────────
interface ExecutiveDashboardProps {
  onNavigate?: (tab: string) => void;
  onOpenRegistration?: () => void;
}

// ── Tooltip personnalisé Recharts 100% Adaptatif Mode Clair & Sombre ───────
const CustomTooltip = ({ active, payload, label }: any) => {
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
              : `$${entry.value}k`}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Carte KPI Épurée Évoluée ───────────────────────────────────
interface KpiCardProps {
  label: string;
  sublabel: string;
  value: string;
  trend: string;
  trendUp?: boolean;
  trendNeutral?: boolean;
  icon: React.ElementType;
  delay?: number;
  onViewDetails?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
  label, sublabel, value, trend, trendUp, trendNeutral, icon: Icon, delay = 0, onViewDetails,
}) => (
  <div
    className="animate-fade-in p-4 rounded-xl border shadow-xs transition-all relative overflow-hidden group flex flex-col justify-between"
    style={{
      animationDelay: `${delay}ms`,
      background: 'var(--bg-surface)',
      borderColor: 'var(--border)',
    }}
  >
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            {label}
          </span>
          <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">
            {sublabel}
          </span>
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>

      <div className="mt-3">
        <div className="text-2xl font-black tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
          {value}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-md ${
              trendNeutral
                ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                : trendUp
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
            }`}
          >
            {!trendNeutral && (trendUp
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            )}
            {trend}
          </span>
        </div>
      </div>
    </div>

    {onViewDetails && (
      <button
        onClick={onViewDetails}
        className="mt-3 pt-2 border-t w-full flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer group/btn"
        style={{ borderColor: 'var(--border)' }}
      >
        <span>Consulter l'intégralité</span>
        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
      </button>
    )}
  </div>
);

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

const mockRdcSchoolCalendar: CalendarEventData[] = [
  {
    id: 'rentree-2026',
    titre: 'Rentrée Scolaire Nationale 2026–2027',
    subtitre: 'Ouverture officielle de l’année scolaire sur toute l’étendue de la RDC',
    dateDebut: 'Mardi 01 Septembre 2026',
    categorie: 'RENTRÉE_CLÔTURE',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'cloture-2027',
    titre: 'Clôture de l’Année Scolaire 2026–2027',
    subtitre: 'Proclamation des résultats et remise officielle des bulletins & certificats',
    dateDebut: 'Vendredi 02 Juillet 2027',
    categorie: 'RENTRÉE_CLÔTURE',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'exetat-prelim',
    titre: 'EXETAT — Épreuve Préliminaire (Candidats Libres)',
    subtitre: 'Examen d’État — Session préliminaire',
    dateDebut: 'Samedi 13 Février 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'exetat-hors-session-dissert',
    titre: 'EXETAT — Hors Session : Dissertation',
    subtitre: 'Épreuve écrite de rédaction / dissertation pour les humanités',
    dateDebut: 'Lundi 03 Mai 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'exetat-pratique-tech',
    titre: 'EXETAT — Épreuves Pratiques / Options Techniques',
    subtitre: 'Session pratique des filières techniques (7 jours effectifs)',
    dateDebut: 'Lundi 10 Mai 2027',
    dateFin: 'Mardi 18 Mai 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
  },
  {
    id: 'tenasosp-2027',
    titre: 'TENASOSP 2027 (Test National de Sélection)',
    subtitre: 'Sélection et orientation scolaire et professionnelle (8ème CTEB)',
    dateDebut: 'Jeudi 03 Juin 2027',
    dateFin: 'Vendredi 04 Juin 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'enafep-2027',
    titre: 'ENAFEP 2027 (Examen National de Fin d’Études Primaires)',
    subtitre: 'Évaluation nationale pour l’obtention du certificat d’études primaires (6ème Primaire)',
    dateDebut: 'Mardi 08 Juin 2027',
    dateFin: 'Mercredi 09 Juin 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'PRIMAIRE',
    highlight: true,
  },
  {
    id: 'exetat-session-ordinaire',
    titre: 'EXETAT 2027 — Session Ordinaire (4 Jours)',
    subtitre: 'Épreuves générales écrites de la session ordinaire de l’Examen d’État',
    dateDebut: 'Lundi 21 Juin 2027',
    dateFin: 'Jeudi 24 Juin 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'SECONDAIRE_EXETAT',
    highlight: true,
  },
  {
    id: 'examens-s1',
    titre: 'Examens du 1er Semestre / 1er Trimestre',
    subtitre: 'Évaluations semestrielles (8 jours)',
    dateDebut: 'Mardi 09 Février 2027',
    dateFin: 'Mercredi 17 Février 2027',
    categorie: 'EXAMENS_JURY',
    publicCible: 'TOUS',
  },
  {
    id: 'conge-detente-t1',
    titre: 'Congé de Détente du 1er Trimestre',
    subtitre: 'Pause pédagogique (3 jours)',
    dateDebut: 'Jeudi 05 Novembre 2026',
    dateFin: 'Samedi 07 Novembre 2026',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  {
    id: 'vacances-noel-s1',
    titre: 'Vacances du 1er Semestre (Noël & Nouvel An)',
    subtitre: 'Grande pause de fin d’année (13 jours) — Reprise le Lundi 11 Janvier 2027',
    dateDebut: 'Mercredi 23 Décembre 2026',
    dateFin: 'Samedi 09 Janvier 2027',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
    highlight: true,
  },
  {
    id: 'vacances-s2',
    titre: 'Vacances du 2ème Semestre (Pâques)',
    subtitre: 'Congé de Pâques (12 jours) — Reprise le Lundi 05 Avril 2027',
    dateDebut: 'Lundi 22 Mars 2027',
    dateFin: 'Samedi 03 Avril 2027',
    categorie: 'VACANCES',
    publicCible: 'TOUS',
  },
  { id: 'ferie-noel', titre: 'Fête de la Nativité (Noël)', dateDebut: 'Vendredi 25 Décembre 2026', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-an', titre: 'Fête du Nouvel An', dateDebut: 'Vendredi 01 Janvier 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-martyrs', titre: 'Martyrs de l’Indépendance', dateDebut: 'Lundi 04 Janvier 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-kabila', titre: 'Hommage à Mzée Laurent-Désiré Kabila', dateDebut: 'Samedi 16 Janvier 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-lumumba', titre: 'Hommage au Héros National P.E. Lumumba', dateDebut: 'Dimanche 17 Janvier 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-kimbangu', titre: 'Journée Simon Kimbangu & Conscience Africaine', dateDebut: 'Mardi 06 Avril 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-travail', titre: 'Fête du Travail', dateDebut: 'Samedi 01 Mai 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-fardc', titre: 'Journée des Forces Armées (FARDC)', dateDebut: 'Lundi 17 Mai 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS' },
  { id: 'ferie-independance', titre: 'Fête de l’Indépendance de la RDC 🇨🇩', dateDebut: 'Mercredi 30 Juin 2027', categorie: 'FÉRIÉ', publicCible: 'TOUS', highlight: true },
];

const RdcOfficialSchoolCalendar: React.FC = () => {
  const [catFilter, setCatFilter] = useState<string>('TOUS');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
    return mockRdcSchoolCalendar.filter(ev => {
      const matchCat = catFilter === 'TOUS' || ev.categorie === catFilter;
      const matchSearch = !searchTerm || ev.titre.toLowerCase().includes(searchTerm.toLowerCase()) || (ev.subtitre && ev.subtitre.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [catFilter, searchTerm]);

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
        {filteredEvents.map(ev => {
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
    </div>
  );
};

// ── SECTION SPÉCIFIQUE : PRÉSENCE DU JOUR PAR CATÉGORIE ET CYCLE EPST ─────────
interface CycleAttendanceData {
  id: string;
  nom: string;
  code: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE';
  isPresentInSchool: boolean;
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
    effectifTotal: 0,
    presentsTotal: 0,
    fillesTotal: 0,
    fillesPresents: 0,
    garconsTotal: 0,
    garconsPresents: 0,
  },
];

const DailyAttendanceByCategory: React.FC<{ selectedCycleFilter: string }> = ({ selectedCycleFilter }) => {
  const activeCycles = useMemo(() => {
    return mockDailyAttendance.filter(c => {
      if (!c.isPresentInSchool) return false;
      if (selectedCycleFilter === 'ALL') return true;
      return c.code === selectedCycleFilter;
    });
  }, [selectedCycleFilter]);

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
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Assiduité Globale: {pctGlobal}% ({totals.presentsTotal.toLocaleString()} / {totals.effectifTotal.toLocaleString()})
          </span>
        </div>
      </div>

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
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{pctFilles}%</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>{totals.fillesPresents.toLocaleString()} présentes</span>
              <span>sur {totals.fillesTotal.toLocaleString()} inscrites</span>
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
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{pctGarcons}%</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span>{totals.garconsPresents.toLocaleString()} présents</span>
              <span>sur {totals.garconsTotal.toLocaleString()} inscrits</span>
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
          {activeCycles.map((c) => {
            const pctCycle = Math.round((c.presentsTotal / c.effectifTotal) * 1000) / 10;
            const pctF = Math.round((c.fillesPresents / c.fillesTotal) * 1000) / 10;
            const pctG = Math.round((c.garconsPresents / c.garconsTotal) * 1000) / 10;

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
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    {pctCycle}%
                  </span>
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
                    <p className="font-bold text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.fillesPresents.toLocaleString()} <span className="text-[10px] text-indigo-600 dark:text-indigo-400">({pctF}%)</span></p>
                  </div>

                  <div className="p-2 rounded-lg border border-slate-500/15 bg-slate-500/5">
                    <p className="font-bold text-[10px] uppercase text-slate-500 dark:text-slate-400">Garçons</p>
                    <p className="font-bold text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.garconsPresents.toLocaleString()} <span className="text-[10px] text-indigo-600 dark:text-indigo-400">({pctG}%)</span></p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
  { value: 'MATERNELLE', label: 'Cycle Maternelle', icon: GraduationCap, badge: '1 250 élèves' },
  { value: 'PRIMAIRE', label: 'Cycle Primaire', icon: School, badge: '5 800 élèves' },
  { value: 'SECONDAIRE', label: 'Secondaire & Humanités', icon: Award, badge: '7 245 élèves' },
];

const maternelleOptions: SelectOption[] = [
  { value: 'ALL', label: 'Toutes les Sections Maternelle', icon: GraduationCap },
  { value: 'PS', label: 'Petite Section (3 ans)', icon: GraduationCap, badge: '350 élèves' },
  { value: 'MS', label: 'Moyenne Section (4 ans)', icon: GraduationCap, badge: '420 élèves' },
  { value: 'GS', label: 'Grande Section (5 ans)', icon: GraduationCap, badge: '480 élèves' },
];

const primaireOptions: SelectOption[] = [
  { value: 'ALL', label: 'Toutes les Classes Primaire', icon: School },
  { value: 'DEG_ELEM', label: '1ère & 2ème Primaire', icon: School, badge: '1 900 élèves' },
  { value: 'DEG_MOY',  label: '3ème & 4ème Primaire', icon: School, badge: '2 000 élèves' },
  { value: 'DEG_TERM', label: '5ème & 6ème Primaire', icon: School, badge: '1 900 élèves' },
];

const secondaireOptions: SelectOption[] = [
  { value: 'ALL', label: 'Toutes les Options Humanités', icon: BookOpen },
  { value: 'MATH_PHYS', label: 'Mathématique-Physique', icon: BookOpen, badge: 'STEM' },
  { value: 'BIO_CHIMIE', label: 'Biologie-Chimie', icon: BookOpen, badge: 'SVT' },
  { value: 'COMMERCE', label: 'Commerciale & Gestion', icon: DollarSign, badge: 'GESTION' },
  { value: 'PEDAGOGIE', label: 'Pédagogie Générale', icon: Users, badge: 'EDU' },
];

const periodOptions: SelectOption[] = [
  { value: '2025_2026', label: 'Année Scolaire 2025–2026', icon: Calendar },
  { value: 'S1', label: '1er Semestre (S1)', icon: Calendar, badge: 'EN COURS' },
  { value: 'S2', label: '2ème Semestre (S2)', icon: Calendar },
  { value: 'T1', label: '1er Trimestre', icon: Clock },
];

// ── Dashboard Exécutif Épuré Haute Visibilité Mode Clair & Sombre ──
export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate, onOpenRegistration }) => {
  const [activeSubTab, setActiveSubTab] = useState<'executive' | 'calendar' | 'pedagogy' | 'finances' | 'viescolaire'>('executive');
  const [chartMode, setChartMode] = useState<'BOTH' | 'COTES' | 'PRESENCE'>('BOTH');
  const [actualites, setActualites] = useState(mockFacultyUpdates);

  // ÉTATS DES FILTRES MULTI-CRITÈRES INTELLIGENTS
  const [selectedCycleFilter, setSelectedCycleFilter] = useState<string>('ALL');
  const [selectedOptionFilter, setSelectedOptionFilter] = useState<string>('ALL');
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('2025_2026');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('2025-09-01');

  // GESTION DU CHANGEMENT DE CYCLE
  const handleCycleChange = (cycle: string) => {
    setSelectedCycleFilter(cycle);
    setSelectedOptionFilter('ALL');
  };

  const subSelectOptions = useMemo(() => {
    if (selectedCycleFilter === 'MATERNELLE') return maternelleOptions;
    if (selectedCycleFilter === 'PRIMAIRE') return primaireOptions;
    return secondaireOptions;
  }, [selectedCycleFilter]);

  const subSelectPlaceholder = useMemo(() => {
    if (selectedCycleFilter === 'MATERNELLE') return 'Section Maternelle';
    if (selectedCycleFilter === 'PRIMAIRE') return 'Niveau Primaire';
    return 'Option / Filière';
  }, [selectedCycleFilter]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCycleFilter !== 'ALL') count++;
    if (selectedOptionFilter !== 'ALL') count++;
    if (selectedPeriodFilter !== '2025_2026') count++;
    return count;
  }, [selectedCycleFilter, selectedOptionFilter, selectedPeriodFilter]);

  const rawDonneesPerformance = [
    { mois: 'Sept', moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Oct',  moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Nov',  moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Déc',  moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Jan',  moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Mar',  moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Mai',  moyenneCotes: 0, tauxPresence: 0 },
    { mois: 'Jul',  moyenneCotes: 0, tauxPresence: 0 },
  ];

  const rawDonneesFinancieres = [
    { trimestre: 'T1', encaisse: 0, objectif: 0 },
    { trimestre: 'T2', encaisse: 0, objectif: 0 },
    { trimestre: 'T3', encaisse: 0, objectif: 0 },
    { trimestre: 'T4', encaisse: 0, objectif: 0 },
    { trimestre: "T1'26", encaisse: 0, objectif: 0 },
  ];

  const donneesPerformance = useMemo(() => {
    return rawDonneesPerformance;
  }, []);

  const donneesFinancieres = useMemo(() => {
    return rawDonneesFinancieres;
  }, []);

  const donneesCycle = [
    { name: 'Maternelle', value: 0, pct: '0%', color: '#6366f1' },
    { name: 'Primaire', value: 0, pct: '0%', color: '#10b981' },
    { name: 'Humanités', value: 0, pct: '0%', color: '#818cf8' },
  ];

  const approuverConge = (id: string) => {
    setActualites(prev => prev.map(fu => fu.id === id ? { ...fu, necessiteApprobation: false } : fu));
  };

  const kpis: KpiCardProps[] = useMemo(() => {
    return [
      {
        label: 'Effectif Total Élèves',
        sublabel: 'Registre vierge (0 inscrit)',
        value: '0',
        trend: '0 inscrit',
        trendNeutral: true,
        icon: GraduationCap,
        delay: 0,
        onViewDetails: () => onNavigate && onNavigate('students'),
      },
      {
        label: 'Recettes Perçues',
        sublabel: 'Minerval & frais encaissés',
        value: '$0',
        trend: '$0 encaissé',
        trendNeutral: true,
        icon: DollarSign,
        delay: 60,
        onViewDetails: () => onNavigate && onNavigate('invoices'),
      },
      {
        label: 'Présence Enseignants',
        sublabel: 'Taux aujourd’hui',
        value: '0.0%',
        trend: '0 présent',
        trendNeutral: true,
        icon: UserCheck,
        delay: 120,
        onViewDetails: () => onNavigate && onNavigate('attendance'),
      },
      {
        label: 'Taux de Réussite',
        sublabel: 'Moyenne générale école',
        value: '0.0%',
        trend: '0 évaluation',
        trendNeutral: true,
        icon: Award,
        delay: 180,
        onViewDetails: () => onNavigate && onNavigate('grades'),
      },
    ];
  }, [onNavigate]);

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
              Pilotage Établissement — EPST RDC
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Synchro Active
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <span>Bonjour, Bienvenue sur ECOLISA PRO</span>
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            Suivez en temps réel les effectifs, les performances académiques et la situation financière de votre établissement.
          </p>
        </div>

        {/* BOUTONS D'ACTION ÉPURÉS */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
        </div>
      </div>

      {/* ===== BARRE DE FILTRAGE MULTI-CRITÈRES INTELLIGENTE ===== */}
      <div
        className="p-3 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in relative z-20 transition-colors"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Filtres Adaptatifs EPST</h3>
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-600 text-white shadow-xs">
                  {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Adaptation dynamique selon le cycle sélectionné</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CustomSelect
            options={cycleOptions}
            value={selectedCycleFilter}
            onChange={handleCycleChange}
            placeholder="Cycle EPST"
          />

          <CustomSelect
            options={subSelectOptions}
            value={selectedOptionFilter}
            onChange={setSelectedOptionFilter}
            placeholder={subSelectPlaceholder}
          />

          <CustomSelect
            options={periodOptions}
            value={selectedPeriodFilter}
            onChange={setSelectedPeriodFilter}
            placeholder="Période Scolaire"
          />

          <CustomDatePicker
            value={selectedDateFilter}
            onChange={setSelectedDateFilter}
            alignRight={true}
          />

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setSelectedCycleFilter('ALL');
                setSelectedOptionFilter('ALL');
                setSelectedPeriodFilter('2025_2026');
                setSelectedDateFilter('2025-09-01');
              }}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* ===== BARRE D'ONGLETS DU DASHBOARD ===== */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl shadow-xs overflow-x-auto sidebar-scroll" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
        {[
          { id: 'executive', label: 'Synthèse Exécutive', icon: Activity },
          { id: 'calendar', label: 'Calendrier EPST 2026–2027', icon: Calendar },
          { id: 'pedagogy', label: 'Pédagogie & Performances', icon: GraduationCap },
          { id: 'finances', label: 'Finances & Recouvrement', icon: DollarSign },
          { id: 'viescolaire', label: 'Vie Scolaire & Présences', icon: Scale },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'hover:bg-slate-500/10'
              }`}
              style={{
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <TabIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-600 dark:text-indigo-400'}`} />
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

                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={donneesPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />
                      <XAxis dataKey="mois" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis hide domain={[40, 100]} />
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
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Moyenne générale (81.4%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Assiduité globale (94.2%)</span>
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
                    +12.8%
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
                    { label: "Frais d'Études (Minerval)", val: '$8.4M', color: '#6366f1', icon: GraduationCap },
                    { label: 'Subventions & Donateurs', val: '$3.2M', color: '#10b981', icon: Award },
                    { label: 'Impayés en Recouvrement', val: '-$0.8M', color: '#ef4444', icon: AlertCircle },
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

                <div className="space-y-3">
                  {actualites.map((fu) => (
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

                        {fu.necessiteApprobation && (
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              onClick={() => approuverConge(fu.id)}
                              className="px-2.5 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" /> Valider
                            </button>
                            <button
                              onClick={() => approuverConge(fu.id)}
                              className="px-2.5 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer"
                            >
                              <X className="w-3 h-3" /> Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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

                <div className="space-y-2.5">
                  {mockEvents.map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <div className="rounded-lg p-1 text-center min-w-[38px] shrink-0 border shadow-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <div className="text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {ev.dateJour.split(' ')[1]}
                        </div>
                        <div className="text-[12px] font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                          {ev.dateJour.split(' ')[0]}
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

      {/* ===== ONGLET 2 : CALENDRIER SCOLAIRE RDC 2026-2027 ===== */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-4 animate-fade-in">
          <RdcOfficialSchoolCalendar />
        </div>
      )}

      {/* ===== ONGLET 3 : PÉDAGOGIE & PERFORMANCES ===== */}
      {activeSubTab === 'pedagogy' && (
        <div className="space-y-4 animate-fade-in">
          {/* SECTION PRÉSENCES DU JOUR PAR CATÉGORIE INTEGRÉE DANS PÉDAGOGIE */}
          <DailyAttendanceByCategory selectedCycleFilter={selectedCycleFilter} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

            {/* Distribution des Élèves par Cycle EPST */}
            <div
              className="lg:col-span-6 p-5 rounded-2xl shadow-xs flex flex-col justify-between border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                    Distribution des Élèves par Cycle EPST
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    Total: 14 295
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Répartition des effectifs selon le filtre actif ({selectedCycleFilter})</p>

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
                    <span className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>0</span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Élève</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                  {donneesCycle.map(dc => (
                    <div key={dc.name} className="p-2 rounded-xl border shadow-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ background: dc.color }} />
                        <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{dc.name}</span>
                      </div>
                      <p className="text-xs font-bold flex items-center justify-center gap-1">
                        <span style={{ color: dc.color }}>{dc.value}</span>
                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                          ({dc.pct})
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('students')}
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Accéder au répertoire global des élèves</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Progression des Cours & Palmarès des Classes */}
            <div
              className="lg:col-span-6 p-5 rounded-2xl shadow-xs flex flex-col justify-between space-y-4 border transition-colors"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
                  Avancement des Programmes & Palmarès
                </h3>

                <div className="space-y-3 mt-3">
                  {[
                    { filiere: 'Mathématique-Physique (6ème CT)', pct: 88 },
                    { filiere: 'Biologie-Chimie (5ème Bio)', pct: 82 },
                    { filiere: 'Commerciale & Gestion (4ème Com)', pct: 91 },
                    { filiere: 'Pédagogie Générale (3ème Péd)', pct: 85 },
                  ].map((prog, i) => (
                    <div key={i} className="p-2.5 rounded-xl space-y-1.5" style={{ background: 'var(--bg-sunken)' }}>
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span style={{ color: 'var(--text-primary)' }}>{prog.filiere}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{prog.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-500/15">
                        <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${prog.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => onNavigate && onNavigate('classes')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Voir le palmarès des 48 classes</span>
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('documents')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 text-xs font-bold flex items-center gap-1 hover:bg-indigo-500/25 transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exporter PV EPST</span>
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
              { label: 'Total Encaissements Minerval', val: '$0', sub: '0% des objectifs annuels' },
              { label: 'Reste à Recouvrer (Impayés)', val: '$0', sub: '0 dossier en retard' },
              { label: 'Solde en Caisse & Banques', val: '$0', sub: 'Comptabilité vierge' },
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
                  {[
                    { mode: 'Mobile Money (M-Pesa Kinshasa)', mont: '$0', pct: 0, icon: Smartphone },
                    { mode: 'Airtel Money RDC', mont: '$0', pct: 0, icon: Smartphone },
                    { mode: 'Virement Banque (Equity BCDC)', mont: '$0', pct: 0, icon: CreditCard },
                    { mode: 'Caisse Espèces École', mont: '$0', pct: 0, icon: DollarSign },
                  ].map((m, i) => (
                    <div key={i} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--bg-sunken)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <m.icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{m.mode}</span>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{m.mont} ({m.pct}%)</span>
                    </div>
                  ))}
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
                <div className="p-4 rounded-xl border text-center space-y-1 mt-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucun Impayé Enregistré</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Toutes les factures et minervals sont en ordre.</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate && onNavigate('invoices')}
                className="mt-4 pt-3 border-t w-full flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                <span>Registre des impayés (0)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ONGLET 4 : VIE SCOLAIRE, PRÉSENCES & DISCIPLINE ===== */}
      {activeSubTab === 'viescolaire' && (
        <div className="space-y-4 animate-fade-in">
          {/* SECTION PRÉSENCE DU JOUR PAR CATÉGORIE DEPLACÉE ICI DANS VIE SCOLAIRE */}
          <DailyAttendanceByCategory selectedCycleFilter={selectedCycleFilter} />

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
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">0 fiche ce mois</span>
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
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/25">0 sanction</span>
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
