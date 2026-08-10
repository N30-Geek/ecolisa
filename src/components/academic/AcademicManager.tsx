import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CustomSelect } from '../common/CustomSelect';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  ClipboardList,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  BadgeAlert,
  TrendingUp,
  TrendingDown,
  Mail,
  Phone,
  MapPin,
  User,
  Star,
  Clock,
  BarChart2,
  FileText,
  Printer,
  Award,
  Layers,
  Sparkles,
  School,
  Lock,
  CheckCircle2,
  ArrowLeft,
  MoreVertical,
  QrCode,
  ShieldCheck,
  CreditCard,
  Heart,
  FileCheck
} from 'lucide-react';
import { Eleve, Discipline, ClasseScolaire, CycleScolaire, MembrePersonnel } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { ClassesPromotionsManager } from './ClassesPromotionsManager';
import { StudentsManager } from './StudentsManager';
import { SchoolYearsTab } from './SchoolYearsTab';
import { SubjectsManager } from './SubjectsManager';
import { ScheduleManager } from './ScheduleManager';
import { GradesManager } from './GradesManager';
import { TeacherManager } from '../administration/TeacherManager';

interface AcademicManagerProps {
  activeSubTab?: string;
  activeSchoolYear?: string;
}

// â”€â”€â”€ Modèle Année Scolaire â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€â”€ Modèle Année Scolaire & Tarification Complexe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface FraisAnnexeConfig {
  id: string;
  intitule: string;
  montant: number;
  devise: 'USD' | 'CDF';
  obligatoire: boolean;
  typeFrais: 'INSCRIPTION' | 'REINSCRIPTION' | 'CONNEXION' | 'CARTE' | 'KIT' | 'AUTRE';
}

export interface SalleConfig {
  id: string;
  codeSalle: string;
  nomSalle: string;
  capacite: number;
  cycleCode: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
}

export interface CycleConfig {
  id: string;
  code: 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES';
  nom: string;
  actif: boolean;
  classesCount: number;
  sallesCount: number;
}

interface AnneeScolaireConfig {
  id: string;
  nom: string;
  statut: 'EN_COURS' | 'CLOTUREE' | 'PLANIFIEE';
  debut: string;
  fin: string;
  nombreElevesTotal: number;
  fraisInscription: number;
  fraisConnexion: number;
  fraisReinscription: number;
  fraisCarte: number;
  fraisAnnexes: FraisAnnexeConfig[];
  cycles: CycleConfig[];
  salles: SalleConfig[];
  semestres: { id: string; nom: string; statut: string; fin: string }[];
  periodes: { id: string; nom: string; debut: string; fin: string; type: 'PERIOD' | 'EXAM' }[];
}

// ——— Composant de Pagination Réutilisable Haute Lisibilité —————————————————————
interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PaginationBar: React.FC<PaginationBarProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const pageSizeOptions = [
    { value: '5', label: '5 par page' },
    { value: '10', label: '10 par page' },
    { value: '25', label: '25 par page' },
    { value: '50', label: '50 par page' },
  ];

  return (
    <div
      className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Afficher :</span>
        <CustomSelect
          options={pageSizeOptions}
          value={String(pageSize)}
          onChange={(val) => {
            onPageSizeChange(Number(val));
            onPageChange(1);
          }}
          className="w-32"
        />
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          {startItem} – {endItem} sur {totalItems} éléments
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-3 py-1.5 rounded-xl border font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          ¹ Précédent
        </button>

        <span className="px-3 py-1.5 font-black text-indigo-500">
          Page {currentPage} / {totalPages}
        </span>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-3 py-1.5 rounded-xl border font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          Suivant º
        </button>
      </div>
    </div>
  );
};

// â”€â”€â”€ Shared UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div>
      <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const statusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIF:     { label: 'Actif',     cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    TRANSFERE: { label: 'Transféré', cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    FINALISTE: { label: 'Finaliste', cls: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' },
    EXCLU:     { label: 'Exclu',     cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
  };
  const s = map[statut] || { label: statut, cls: 'bg-slate-500/15 text-slate-400 border border-slate-500/30' };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${s.cls}`}>{s.label}</span>;
};

// â”€â”€â”€ PAGE DÉDIÉE DE CONSULTATION COMPLÈTE DE L'ÉLÈVE (AVEC BOUTON RETOUR) â”€â”€

const StudentDetailPage: React.FC<{ student: Eleve; onBack: () => void }> = ({ student, onBack }) => {
  const [tab, setTab] = useState<'identity' | 'parents' | 'grades' | 'attendance' | 'finance' | 'card'>('identity');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showFullFileModal, setShowFullFileModal] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRE SUPÉRIEURE AVEC BOUTON RETOUR & ACTIONS */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border-0 shadow-md shadow-indigo-500/5 transition-all duration-300"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Retour à la Liste</span>
          </button>
          <div className="h-5 w-px hidden sm:block bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Dossier Académique Officiel · EPST RDC
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowFullFileModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/25 hover:shadow-lg flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-white" /> Exporter Dossier Complet
          </button>
          <button
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-500/10 active:scale-[0.97] transition-all duration-200 cursor-pointer shadow-xs"
            style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
          >
            <Printer className="w-4 h-4 text-indigo-500" /> Bulletin PDF
          </button>
          <button
            onClick={() => setShowCardModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-white" /> Aperçu Carte Recto/Verso
          </button>
        </div>
      </div>

      {/* CARTE D'ENTÊTE PROFIL ÉLÈVE */}
      <div
        className="p-5 rounded-2xl border shadow-xs relative overflow-hidden transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.prenom} className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0" />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-xs shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
              >
                {student.prenom[0]}{student.nom[0]}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {student.prenom} {student.nom} {student.postnom}
                </h1>
                {statusBadge(student.statut)}
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Classe: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{student.nomClasse}</span> · Sexe: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{student.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
              </p>
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <span className="font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                  📋 Matricule EPST: {student.registrationNumber}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  ðŸ—“ï¸ Né(e) le {student.dateNaissance} ({student.lieuNaissance})
                </span>
              </div>
            </div>
          </div>

          {/* BADGES CÔTÉ DROIT : SITUATION FINANCIÈRE & MOYENNE GÉNÉRALE */}
          <div className="flex items-stretch gap-3 flex-wrap sm:flex-nowrap shrink-0 w-full lg:w-auto">
            {/* BADGE SITUATION FINANCIÈRE */}
            <div className="flex-1 lg:flex-none flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-emerald-500/10 border-emerald-500/20">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 flex items-center justify-center">
                <CreditCard className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-300 tracking-wider">Situation Financière</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">$280 / $280</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">100% SOLDÉ</span>
                </div>
              </div>
            </div>

            {/* BADGE MOYENNE GÉNÉRALE */}
            <div className="flex-1 lg:flex-none flex items-center gap-3 px-3.5 py-2.5 rounded-xl border bg-indigo-500/10 border-indigo-500/20">
              <div className="text-right space-y-0.5">
                <p className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">Moyenne Générale S1</p>
                <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">81.4 %</p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">Rang : 3ème / 32 élèves</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 flex items-center justify-center">
                <Award className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRILLE PRINCIPALE SPLITTÉE EN DEUX PARTIES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none">

        {/* ========================================================================= */}
        {/* COLONNE GAUCHE (LA PLUS LARGE - 8 COLS) : INFORMATIONS ET DOSSIER GLOBAL   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

          {/* BARRE D'ONGLETS DU DOSSIER ÉLÈVE */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl border shadow-sm overflow-x-auto sidebar-scroll" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            {[
              { id: 'identity', label: 'Identité & Origine RDC', icon: User },
              { id: 'grades', label: 'Cotes & Performance', icon: ClipboardList },
              { id: 'attendance', label: 'Assiduité & Présences', icon: Clock },
            ].map(t => {
              const TabIcon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-500/10'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTENU VARIABLE DE LA COLONNE GAUCHE SELON L'ONGLET */}
          <div className="p-6 rounded-3xl border shadow-md" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

            {/* 1. IDENTITÉ, ORIGINE RDC & SANTÉ */}
            {tab === 'identity' && (
              <div className="space-y-8 animate-fade-in">
                {/* FICHE HAUTE VISIBILITÉ MÉDICALE */}
                <div
                  className="p-6 rounded-3xl border shadow-lg space-y-4 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.06), rgba(245,158,11,0.06))',
                    borderColor: 'rgba(239,68,68,0.3)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 font-black">
                        <Heart className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          Fiche d'Urgence Médicale & Santé Infirmerie
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                          Informations vitales accessibles aux secouristes et à la direction scolaire
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">Rhésus :</span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-md">
                        ðŸ©¸ Groupe {student.groupeSanguin || 'O+'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-wider">
                        <BadgeAlert className="w-4 h-4" /> Allergies Connues
                      </div>
                      <p className="text-sm font-black text-rose-700 dark:text-rose-300">
                        {student.allergies || 'Aucune allergie majeure signalée'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4" /> Antécédents & Aptitude
                      </div>
                      <p className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                        {student.informationsMedicales || 'Aptitude physique excellente (Vaccins à jour)'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border bg-indigo-500/10 border-indigo-500/30 space-y-1.5">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-wider">
                        <Phone className="w-4 h-4" /> Téléphone Urgence
                      </div>
                      <p className="text-sm font-mono font-black text-indigo-700 dark:text-indigo-300">
                        {student.telephoneParent || '+243 81 555 0192'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* TABLEAU SPÉCIFIQUE DE L'ÉTAT CIVIL */}
                <div className="p-6 rounded-3xl border space-y-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <User className="w-4.5 h-4.5" /> Fiche Officielle d'État Civil & Naissance
                    </h3>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                      Dossier Établissement Certifié
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nom (Patronyme) :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.nom}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Postnom :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.postnom || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Prénom :</span>
                      <span className="font-black text-sm text-indigo-500">{student.prenom}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sexe & Genre :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.sexe === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date de Naissance :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.dateNaissance}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lieu de Naissance :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.lieuNaissance}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nationalité :</span>
                      <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{student.nationalite || 'Congolaise (RDC)'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Statut Scolaire :</span>
                      <span className="font-black text-sm text-emerald-500">{student.statut}</span>
                    </div>
                  </div>
                </div>

                {/* TABLEAU D'ORIGINE GÉOGRAPHIQUE & DÉCOUPAGE RDC */}
                <div className="p-6 rounded-3xl border space-y-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5" /> Origine Géographique & Découpage Territorial EPST RDC
                    </h3>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                      26 Provinces RDC
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-xs">
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Province Actuelle (Résidence) :</span>
                      <span className="font-black text-sm text-indigo-500">{student.province || 'Kinshasa'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Province d'Origine :</span>
                      <span className="font-black text-sm text-indigo-500">{student.provinceOrigine || 'Kasaï-Central'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Territoire / Commune :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.territoireCommune || 'Commune de la Gombe'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chefferie / Secteur :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.chefferieSecteur || 'Secteur de Tshibata'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Groupement :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.groupement || 'Groupement Bena-Tshadi'}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Village :</span>
                      <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.village || 'Village Mukendi-Ville'}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border bg-slate-500/5 space-y-1" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adresse Physique de Résidence Exacte</p>
                    <p className="text-sm font-black text-indigo-500">{student.adressePhysique || 'N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa'}</p>
                  </div>
                </div>

                {student.notesPsychopedagogiques && (
                  <div className="p-5 rounded-3xl border bg-indigo-500/10 border-indigo-500/20 space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      📋 Observations & Diagnostic Psychopédagogique
                    </p>
                    <p className="text-xs leading-relaxed font-bold" style={{ color: 'var(--text-primary)' }}>
                      {student.notesPsychopedagogiques}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 2. COTES & PERFORMANCE */}
            {tab === 'grades' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Relevé des Cotes & Notes du 1er Semestre (S1)
                  </h3>
                  <span className="text-xs font-black text-emerald-400">Total : 81.4% (Très Bien)</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <th className="p-3">Discipline / Cours</th>
                        <th className="p-3">Coeff. EPST</th>
                        <th className="p-3">Interrogation</th>
                        <th className="p-3">Examen</th>
                        <th className="p-3 text-right">Moyenne %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {([] as any[]).map((sub: any) => (
                        <tr key={sub.id} className="hover:bg-slate-500/5">
                          <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{sub.nom}</td>
                          <td className="p-3 font-black text-indigo-400">Coeff. {sub.coefficient}</td>
                          <td className="p-3 font-extrabold text-slate-300">17 / 20</td>
                          <td className="p-3 font-extrabold text-slate-300">34 / 40</td>
                          <td className="p-3 text-right font-black text-emerald-400 text-sm">85 %</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. ASSIDUITÉ & PRÉSENCES */}
            {tab === 'attendance' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Registre de Présences & Bilan Disciplinaire
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/20">
                    <p className="text-3xl font-black text-emerald-400">142</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">Jours de Présence</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20">
                    <p className="text-3xl font-black text-amber-400">3</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">Absences Justifiées</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-red-500/10 border-red-500/20">
                    <p className="text-3xl font-black text-red-400">1</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">Absence Injustifiée</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLONNE DROITE (4 COLS) : CARTE QR CODE, DOCUMENTS & CONTACTS PARENTS      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">

          {/* 1. APERÇU DE LA CARTE D'ÉLÈVE QR CODE OFFICIELLE */}
          <div className="p-5 rounded-3xl border shadow-lg space-y-4 relative overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-500" /> Carte d'Élève Officielle (QR Code)
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                Active 2025–2026
              </span>
            </div>

            {/* DESIGN BADGE ÉLÈVE VIP HAUTE DÉFINITION */}
            <div
              onClick={() => setShowCardModal(true)}
              className="p-5 rounded-3xl border shadow-xl relative overflow-hidden text-left bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-500/40 space-y-4 cursor-pointer hover:border-indigo-400 transition-all group"
            >
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                <div className="flex items-center gap-2">
                  <School className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-tight text-indigo-200">CS SAINT-MICHEL EPST RDC</h4>
                    <p className="text-[9px] text-slate-400">Carte Identité Scolaire Certifiée</p>
                  </div>
                </div>
                <Award className="w-5 h-5 text-amber-400 shrink-0" />
              </div>

              <div className="flex items-center gap-3">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.prenom} className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-400 shadow-md shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-md shrink-0">
                    {student.prenom[0]}{student.nom[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm font-black tracking-tight leading-tight truncate group-hover:text-indigo-300 transition-colors">
                    {student.prenom} {student.nom}
                  </p>
                  <p className="text-xs font-bold text-indigo-300">{student.nomClasse}</p>
                  <p className="text-[10px] text-slate-300 font-mono">Né(e): {student.dateNaissance}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-500/30 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Matricule EPST</p>
                  <p className="text-xs font-black font-mono text-indigo-300">{student.registrationNumber}</p>
                </div>
                <div className="p-1 rounded-lg bg-white shrink-0 shadow-md">
                  <QrCode className="w-7 h-7 text-slate-950" />
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowCardModal(true)}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-400/40"
            >
              <Eye className="w-4 h-4 text-white" /> Aperçu HD Recto / Verso & Impression EPST
            </button>
          </div>

          {/* 2. DOSSIER DES DOCUMENTS SCOLAIRES NUMÉRISÉS (COPIE DE SES DOCUMENTS) */}
          <div className="p-5 rounded-3xl border shadow-lg space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Dossier Documents Scolaires (Pièces Jointes)
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                5 Fichiers
              </span>
            </div>

            <div className="space-y-2.5">
              {[
                { title: "Copie Acte de Naissance Légalisé", size: "1.4 Mo", format: "PDF", status: "Validé EPST", date: "12 Sept 2025" },
                { title: "Certificat d'Études Primaires (TENAFEP)", size: "850 Ko", format: "PDF", status: "Certifié", date: "10 Sept 2025" },
                { title: "Bulletin Officiel de la 6ème Année", size: "2.1 Mo", format: "PDF", status: "Scellé", date: "05 Sept 2025" },
                { title: "Fiche Médicale d'Infirmerie Signée", size: "620 Ko", format: "PDF", status: "Conforme", date: "02 Sept 2025" },
                { title: "Attestation de Fréquentation & Reçu", size: "410 Ko", format: "PDF", status: "Archivé", date: "01 Sept 2025" },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-3 hover:border-indigo-500/40 transition-all group cursor-pointer"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center shrink-0 font-bold">
                      <FileCheck className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate group-hover:text-indigo-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span className="font-mono">{doc.size}</span>
                        <span>¢</span>
                        <span>{doc.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9.5px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      {doc.status}
                    </span>
                    <button className="p-1.5 rounded-lg bg-slate-500/10 hover:bg-indigo-500 hover:text-white transition-colors cursor-pointer" title="Télécharger la copie">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-2.5 rounded-2xl border border-dashed border-indigo-500/40 text-indigo-500 hover:bg-indigo-500/10 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer">
              <Plus className="w-4 h-4" /> Joindre un Nouveau Document Scolaire (PDF/Image)
            </button>
          </div>

          {/* 3. INFORMATIONS DES PARENTS & TUTEURS LÉGAUX */}
          <div className="p-6 rounded-3xl border shadow-lg space-y-5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-500" /> Tuteurs Légaux & Contacts Famille
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                Communication Directe
              </span>
            </div>

            <div className="space-y-5 divide-y divide-slate-200/50 dark:divide-slate-800">
              {/* PÈRE */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {student.nomPere || student.nomParent || '—'}
                      </h4>
                      <p className="text-xs font-extrabold text-indigo-500">Père / Tuteur Principal Légal</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                    {student.professionPere || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" /> WhatsApp / Tél :
                    </span>
                    <a href={`tel:${student.telephonePere || student.telephoneParent}`} className="font-mono font-black text-indigo-500 hover:underline text-xs">
                      {student.telephonePere || student.telephoneParent || '—'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Direct :
                    </span>
                    <a href={`mailto:${student.emailPere || student.emailParent}`} className="font-mono font-black text-indigo-500 hover:underline text-xs">
                      {student.emailPere || student.emailParent || '—'}
                    </a>
                  </div>
                </div>
              </div>

              {/* MÈRE */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {student.nomMere || '—'}
                      </h4>
                      <p className="text-xs font-extrabold text-pink-500">Mère / Tuteur Secondaire</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-pink-500/15 text-pink-500 border border-pink-500/30">
                    {student.professionMere || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-pink-500" /> WhatsApp / Tél :
                    </span>
                    <a href={`tel:${student.telephoneMere}`} className="font-mono font-black text-pink-500 hover:underline text-xs">
                      {student.telephoneMere || '+243 99 444 8812'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-pink-500" /> Email Direct :
                    </span>
                    <a href={`mailto:${student.emailMere}`} className="font-mono font-black text-pink-500 hover:underline text-xs">
                      {student.emailMere || 'c.bakamba@yahoo.fr'}
                    </a>
                  </div>
                </div>
              </div>

              {/* ADRESSE DOMICILE FAMILIAL */}
              <div className="pt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-500 tracking-wider">
                  <MapPin className="w-4 h-4 text-indigo-500" /> Domicile Familial Officiel
                </div>
                <p className="text-xs font-extrabold leading-relaxed pl-6" style={{ color: 'var(--text-primary)' }}>
                  {student.adressePhysique || 'N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa'}
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      <StudentIdCardModal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        student={student}
      />

      <StudentFullFileModal
        isOpen={showFullFileModal}
        onClose={() => setShowFullFileModal(false)}
        student={student}
      />
    </div>
  );
};

// â”€â”€â”€ ONGLET 1 : ÉLÈVES & INSCRIPTIONS AVEC PAGINATION & FICHE COMPLÈTE DÉDIÉE â”€â”€

const StudentsTab: React.FC = () => {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Eleve | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const match = !q || s.prenom.toLowerCase().includes(q)
        || s.nom.toLowerCase().includes(q)
        || s.registrationNumber.toLowerCase().includes(q);
      const cls = !selectedClass || s.classId === selectedClass;
      return match && cls;
    });
  }, [students, search, selectedClass]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const classOptions = useMemo(() => [
    { value: '', label: 'Toutes les classes' },
  ], []);

  const handleRegisterNewStudent = (newStudent: Eleve) => {
    setStudents(prev => [newStudent, ...prev]);
    setShowRegisterModal(false);
  };

  // Si un élève est sélectionné, on affiche la PAGE DÉDIÉE DE L'ÉLÈVE
  if (selectedStudent) {
    return (
      <StudentDetailPage
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* En-tête de section */}
      <SectionHeader
        title="Élèves & Inscriptions Scolaires"
        subtitle={`${students.length} élèves inscrits · Année Scolaire 2025–2026`}
        actions={
          <>
            <button
              className="px-3.5 py-2 rounded-lg border font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Exporter Liste EPST</span>
            </button>
            <button
              onClick={() => setShowRegisterModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer border border-indigo-500/40"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Nouveau Dossier Élève (Wizard)</span>
            </button>
          </>
        }
      />

      {/* Cartes KPI Élèves */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Total Élèves Inscrits', val: `${students.length}`, color: '#6366f1', icon: GraduationCap },
          { label: 'Statut Actif', val: `${students.filter(s => s.statut === 'ACTIF').length}`, color: '#10b981', icon: Check },
          { label: 'Filles (Parité EPST)', val: `${students.filter(s => s.sexe === 'F').length}`, color: '#ec4899', icon: Users },
          { label: 'Finalistes Exetat', val: '136', color: '#8b5cf6', icon: Star },
        ].map((s, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border shadow-xs flex items-center gap-3.5 transition-all hover:brightness-105"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs"
              style={{ background: `${s.color}15` }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-xl font-black leading-none" style={{ color: 'var(--text-primary)' }}>{s.val}</p>
              <p className="text-[11px] font-bold uppercase tracking-wider mt-1.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de Filtrage & Recherche Intelligente */}
      <div
        className="p-3.5 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3 transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher par nom, postnom, matricule..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-3.5 py-2 text-xs rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        <CustomSelect
          options={classOptions}
          value={selectedClass}
          onChange={val => { setSelectedClass(val); setCurrentPage(1); }}
          className="w-full sm:w-64"
        />
      </div>

      {/* Table Paginée des Élèves Redessinée Haute Visibilité */}
      <div
        className="rounded-2xl border shadow-xs overflow-hidden transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr
                className="border-b uppercase tracking-wider text-[10.5px] font-bold transition-colors"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <th className="py-3.5 px-4">Élève & Photo</th>
                <th className="py-3.5 px-4">Matricule EPST</th>
                <th className="py-3.5 px-4">Classe</th>
                <th className="py-3.5 px-4">Sexe</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4">Parent / Contact</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedStudents.map(s => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-500/5 transition-colors group"
                >
                  {/* Nom & Photo */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt={s.prenom}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-500/20 shadow-xs shrink-0"
                        />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 shadow-xs"
                          style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                        >
                          {s.prenom[0]}{s.nom[0]}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                          {s.prenom} {s.nom}
                        </p>
                        <p className="text-[10.5px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                          {s.postnom || '—'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Matricule EPST */}
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                      {s.registrationNumber}
                    </span>
                  </td>

                  {/* Classe */}
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                      {s.nomClasse}
                    </span>
                  </td>

                  {/* Sexe */}
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border ${
                        s.sexe === 'M'
                          ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {s.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    </span>
                  </td>

                  {/* Statut */}
                  <td className="py-3.5 px-4">
                    {statusBadge(s.statut)}
                  </td>

                  {/* Parent / Contact */}
                  <td className="py-3.5 px-4">
                    <div>
                      <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {s.nomParent}
                      </p>
                      <p className="text-[10.5px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        {s.telephoneParent}
                      </p>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right relative">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-500/40"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Voir la fiche</span>
                      </button>

                      {/* Bouton Options 3 points */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenActionMenuId(openActionMenuId === s.id ? null : s.id)}
                          className="p-1.5 rounded-lg border text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-colors cursor-pointer"
                          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                          title="Options de l'élève"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openActionMenuId === s.id && (
                          <div
                            className="absolute right-0 top-full mt-1 w-52 rounded-xl border shadow-xl z-50 p-1.5 space-y-0.5 text-left animate-scale-in"
                            style={{
                              background: 'var(--sidebar-popover-bg)',
                              borderColor: 'var(--sidebar-popover-border)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <button
                              onClick={() => { setSelectedStudent(s); setOpenActionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Voir la Fiche Élève</span>
                            </button>
                            <button
                              onClick={() => { setSelectedStudent(s); setOpenActionMenuId(null); }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Imprimer Carte QR</span>
                            </button>
                            <button
                              onClick={() => setOpenActionMenuId(null)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Bulletin Trimestriel</span>
                            </button>
                            <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                            <button
                              onClick={() => {
                                setStudents(students.filter(st => st.id !== s.id));
                                setOpenActionMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Supprimer l'Élève</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <GraduationCap className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-400 font-bold text-sm">Aucun élève ne correspond à votre recherche.</p>
          </div>
        )}

        {/* Contrôles de Pagination Paginée */}
        <PaginationBar
          totalItems={filtered.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Onboarding Wizard Inscription Élève */}
      {showRegisterModal && (
        <StudentRegistrationModal
          onBack={() => setShowRegisterModal(false)}
          onRegister={handleRegisterNewStudent}
                  />
      )}
    </div>
  );
};

// â”€â”€â”€ ONGLET 2 : CLASSES & CYCLES AVEC PAGINATION & CREATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ClassesTab: React.FC = () => {
  const [classesList, setClassesList] = useState<ClasseScolaire[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredClasses = useMemo(() => {
    return classesList.filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.salle.toLowerCase().includes(search.toLowerCase()));
  }, [classesList, search]);

  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Classes, Promotions & Structures EPST"
        subtitle="Répertoire officiel des salles de classe et affectations des titulaires"
        actions={
          <button className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40">
            <Plus className="w-4 h-4" /> Créer une Nouvelle Classe
          </button>
        }
      />

      <div className="flex items-center gap-3 p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Filtrer par nom de classe, salle ou titulaire..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                <th className="py-3 px-4">Classe / Promotion</th>
                <th className="py-3 px-4">Local / Salle</th>
                <th className="py-3 px-4">Professeur Titulaire</th>
                <th className="py-3 px-4">Effectif Inscrit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedClasses.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-xs text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{c.nom}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-500 dark:text-slate-400">{c.salle}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{c.professeurTitulaire}</td>
                  <td className="py-3 px-4 font-medium">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60">
                      {c.nombreEleves} élèves
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          totalItems={filteredClasses.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

// â”€â”€â”€ ONGLET 3 : MATIÈRES, DISCIPLINES & COEFFICIENTS EPST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SubjectsTab: React.FC = () => {
  const [subjectsList, setSubjectsList] = useState<Discipline[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredSubjects = useMemo(() => {
    return subjectsList.filter(s => !search || s.nom.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));
  }, [subjectsList, search]);

  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubjects.slice(start, start + pageSize);
  }, [filteredSubjects, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Matières, Disciplines & Coefficients EPST"
        subtitle="Pondérations et maxima officiels du programme national de l'EPST RDC"
        actions={
          <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer">
            <Plus className="w-4 h-4" /> Ajouter une Matière
          </button>
        }
      />

      <div className="flex items-center gap-3 p-3 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher une discipline (ex: Mathématiques, Physique, Français)..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border font-bold focus:outline-none focus:border-indigo-500"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      <div className="rounded-2xl border shadow-md overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b uppercase tracking-wider text-[10px] font-black text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <th className="p-3.5">Discipline / Matière</th>
                <th className="p-3.5">Code EPST</th>
                <th className="p-3.5">Catégorie</th>
                <th className="p-3.5">Coefficient EPST</th>
                <th className="p-3.5">Maximum Notes</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {paginatedSubjects.map(s => (
                <tr key={s.id} className="hover:bg-slate-500/5 transition-colors">
                  <td className="p-3.5 font-black text-xs" style={{ color: 'var(--text-primary)' }}>{s.nom}</td>
                  <td className="p-3.5 font-mono text-indigo-400 font-bold">{s.code}</td>
                  <td className="p-3.5 font-bold text-slate-400">{s.categorie}</td>
                  <td className="p-3.5 font-black">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Coeff. {s.coefficient}
                    </span>
                  </td>
                  <td className="p-3.5 font-black" style={{ color: 'var(--text-primary)' }}>/ {s.maxScore} pts</td>
                  <td className="p-3.5 text-right">
                    <button className="p-1.5 rounded-xl hover:bg-slate-500/20 text-slate-400 hover:text-white cursor-pointer">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PaginationBar
          totalItems={filteredSubjects.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};

// â”€â”€â”€ ONGLET 4 : GESTION DE L'ANNÉE SCOLAIRE, STATISTIQUES & RAPPORTS EPST â”€â”€

// â”€â”€â”€ ONGLET 4 : GESTION DE L'ANNÉE SCOLAIRE, TARIFICATION & STRUCTURE EPST â”€â”€

const LegacySchoolYearsTab: React.FC = () => {
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'frais' | 'cycles_salles' | 'periodes' | 'rapports'>('frais');

  // â”€â”€ ÉTATS DU FORMULAIRE ONBOARDING MULTI-ÉTAPES (CREATION ANNÉE SCOLAIRE) â”€â”€
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [newNom, setNewNom] = useState('2026–2027');
  const [newDebut, setNewDebut] = useState('07 Septembre 2026');
  const [newFin, setNewFin] = useState('03 Juillet 2027');
  const [newStatut, setNewStatut] = useState<'PLANIFIEE' | 'EN_COURS'>('PLANIFIEE');
  const [newTargetEleves, setNewTargetEleves] = useState<number>(15000);

  // Tarification
  const [newFraisInscription, setNewFraisInscription] = useState<number>(50);
  const [newFraisConnexion, setNewFraisConnexion] = useState<number>(15);
  const [newFraisReinscription, setNewFraisReinscription] = useState<number>(30);
  const [newFraisCarte, setNewFraisCarte] = useState<number>(10);
  const [newFraisAnnexes, setNewFraisAnnexes] = useState<FraisAnnexeConfig[]>([
    { id: 'fa-new-1', intitule: 'Kit Scolaire & Uniforme Officiel', montant: 25, devise: 'USD', obligatoire: true, typeFrais: 'KIT' },
    { id: 'fa-new-2', intitule: 'Assurance Scolaire & Infirmerie', montant: 10, devise: 'USD', obligatoire: true, typeFrais: 'AUTRE' },
  ]);

  // Champs temporaires pour ajout d'un frais annexe
  const [tempIntituleFrais, setTempIntituleFrais] = useState('');
  const [tempMontantFrais, setTempMontantFrais] = useState<number>(15);
  const [tempTypeFrais, setTempTypeFrais] = useState<'INSCRIPTION' | 'REINSCRIPTION' | 'CONNEXION' | 'CARTE' | 'KIT' | 'AUTRE'>('AUTRE');

  // Cycles & Salles
  const [newActiveCycles, setNewActiveCycles] = useState<Record<string, boolean>>({
    MATERNELLE: true,
    PRIMAIRE: true,
    SECONDAIRE_CTEB: true,
    HUMANITES: true,
  });

  const [newSalles, setNewSalles] = useState<SalleConfig[]>([
    { id: 'sal-new-1', codeSalle: 'M-101', nomSalle: 'Salle Petite Section Maternelle', capacite: 35, cycleCode: 'MATERNELLE' },
    { id: 'sal-new-2', codeSalle: 'P-201', nomSalle: 'Salle 1ère Primaire A', capacite: 45, cycleCode: 'PRIMAIRE' },
    { id: 'sal-new-3', codeSalle: 'C-301', nomSalle: 'Salle 7ème CTEB A', capacite: 40, cycleCode: 'SECONDAIRE_CTEB' },
    { id: 'sal-new-4', codeSalle: 'H-401', nomSalle: 'Labo Math-Physique 1ère H', capacite: 40, cycleCode: 'HUMANITES' },
  ]);

  // Champs temporaires pour ajout d'une salle
  const [tempCodeSalle, setTempCodeSalle] = useState('');
  const [tempNomSalle, setTempNomSalle] = useState('');
  const [tempCapaciteSalle, setTempCapaciteSalle] = useState<number>(40);
  const [tempCycleSalle, setTempCycleSalle] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES'>('HUMANITES');

  // Découpage Pédagogique
  const [newStructure, setNewStructure] = useState<'SEMESTRES' | 'TRIMESTRES'>('SEMESTRES');

  const selectedYear = useMemo(() => {
    return years.find(y => y.id === selectedYearId) || years[0];
  }, [years, selectedYearId]);

  // Ajouter un frais annexe
  const handleAddFraisAnnexe = () => {
    if (!tempIntituleFrais.trim()) return;
    const newFraisItem: FraisAnnexeConfig = {
      id: `fa-${Date.now()}`,
      intitule: tempIntituleFrais.trim(),
      montant: tempMontantFrais,
      devise: 'USD',
      obligatoire: true,
      typeFrais: tempTypeFrais,
    };
    setNewFraisAnnexes(prev => [...prev, newFraisItem]);
    setTempIntituleFrais('');
    setTempMontantFrais(15);
  };

  const handleRemoveFraisAnnexe = (id: string) => {
    setNewFraisAnnexes(prev => prev.filter(f => f.id !== id));
  };

  // Ajouter une salle
  const handleAddSalle = () => {
    if (!tempNomSalle.trim() || !tempCodeSalle.trim()) return;
    const newSalleItem: SalleConfig = {
      id: `sal-${Date.now()}`,
      codeSalle: tempCodeSalle.trim().toUpperCase(),
      nomSalle: tempNomSalle.trim(),
      capacite: tempCapaciteSalle,
      cycleCode: tempCycleSalle,
    };
    setNewSalles(prev => [...prev, newSalleItem]);
    setTempCodeSalle('');
    setTempNomSalle('');
    setTempCapaciteSalle(40);
  };

  const handleRemoveSalle = (id: string) => {
    setNewSalles(prev => prev.filter(s => s.id !== id));
  };

  // Enregistrement final du Wizard Onboarding
  const handleCompleteWizard = (e: React.FormEvent) => {
    e.preventDefault();
    const createdCycles: CycleConfig[] = [
      { id: `c-1-${Date.now()}`, code: 'MATERNELLE', nom: 'Cycle Maternelle (3–5 ans)', actif: newActiveCycles.MATERNELLE, classesCount: 6, sallesCount: newSalles.filter(s => s.cycleCode === 'MATERNELLE').length },
      { id: `c-2-${Date.now()}`, code: 'PRIMAIRE', nom: 'Cycle Primaire (1ère–6ème)', actif: newActiveCycles.PRIMAIRE, classesCount: 18, sallesCount: newSalles.filter(s => s.cycleCode === 'PRIMAIRE').length },
      { id: `c-3-${Date.now()}`, code: 'SECONDAIRE_CTEB', nom: 'Cycle Terminal d’Éducation de Base (7ème–8ème CTEB)', actif: newActiveCycles.SECONDAIRE_CTEB, classesCount: 8, sallesCount: newSalles.filter(s => s.cycleCode === 'SECONDAIRE_CTEB').length },
      { id: `c-4-${Date.now()}`, code: 'HUMANITES', nom: 'Humanités Générales & Techniques (1ère–4ème H)', actif: newActiveCycles.HUMANITES, classesCount: 16, sallesCount: newSalles.filter(s => s.cycleCode === 'HUMANITES').length },
    ];

    const newYear: AnneeScolaireConfig = {
      id: `ay-${Date.now()}`,
      nom: newNom,
      statut: newStatut,
      debut: newDebut,
      fin: newFin,
      nombreElevesTotal: newTargetEleves,
      fraisInscription: newFraisInscription,
      fraisConnexion: newFraisConnexion,
      fraisReinscription: newFraisReinscription,
      fraisCarte: newFraisCarte,
      fraisAnnexes: newFraisAnnexes,
      cycles: createdCycles,
      salles: newSalles,
      semestres: newStructure === 'SEMESTRES' ? [
        { id: `s1-${Date.now()}`, nom: '1er Semestre (S1)', statut: 'PLANIFIE', fin: '17 Février' },
        { id: `s2-${Date.now()}`, nom: '2ème Semestre (S2)', statut: 'PLANIFIE', fin: '03 Juillet' },
      ] : [
        { id: `t1-${Date.now()}`, nom: '1er Trimestre (T1)', statut: 'PLANIFIE', fin: '30 Novembre' },
        { id: `t2-${Date.now()}`, nom: '2ème Trimestre (T2)', statut: 'PLANIFIE', fin: '28 Février' },
        { id: `t3-${Date.now()}`, nom: '3ème Trimestre (T3)', statut: 'PLANIFIE', fin: '03 Juillet' },
      ],
      periodes: [
        { id: `p1-${Date.now()}`, nom: '1ère Période', debut: newDebut.split(' ')[0] + ' Sept', fin: '04 Nov', type: 'PERIOD' },
        { id: `p2-${Date.now()}`, nom: '2ème Période & Examens S1', debut: '09 Nov', fin: '17 Fév', type: 'EXAM' },
        { id: `p3-${Date.now()}`, nom: '3ème Période', debut: '22 Fév', fin: '24 Avr', type: 'PERIOD' },
        { id: `p4-${Date.now()}`, nom: '4ème Période & EXETAT', debut: '26 Avr', fin: newFin.split(' ')[0] + ' Jul', type: 'EXAM' },
      ],
    };

    setYears(prev => [newYear, ...prev]);
    setSelectedYearId(newYear.id);
    setShowCreateModal(false);
    setWizardStep(1);
  };

  const handleDeleteYear = (id: string) => {
    setYears(prev => prev.filter(y => y.id !== id));
    if (selectedYearId === id) {
      setSelectedYearId(years.find(y => y.id !== id)?.id || '');
    }
    setDeleteConfirmId(null);
  };

  const handleActivateYear = (id: string) => {
    setYears(prev => prev.map(y => ({
      ...y,
      statut: y.id === id ? 'EN_COURS' : y.statut === 'EN_COURS' ? 'CLOTUREE' : y.statut
    })));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <SectionHeader
        title="Gestion de l'Année Scolaire, Tarification & Structuration EPST"
        subtitle="Configuration des frais d'inscription, frais de connexion, attribution des salles d'études et découpage des périodes"
        actions={
          <button
            onClick={() => { setWizardStep(1); setShowCreateModal(true); }}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer border border-indigo-400/40"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Onboarding : Créer une Nouvelle Année</span>
          </button>
        }
      />

      {/* LISTE DES CARTES DES ANNÉES SCOLAIRES (SELECTION & ACTIONS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {years.map(y => {
          const isCurrent = y.statut === 'EN_COURS';
          const isSelected = selectedYearId === y.id;
          return (
            <div
              key={y.id}
              onClick={() => setSelectedYearId(y.id)}
              className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between space-y-4 transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-500/10'
                  : 'hover:border-indigo-500/40'
              }`}
              style={{
                background: 'var(--bg-surface)',
                borderColor: isSelected ? '#6366f1' : 'var(--border)'
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Année {y.nom}
                      </h3>
                      <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                        {y.debut} — {y.fin}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    isCurrent
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : y.statut === 'CLOTUREE'
                      ? 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  }`}>
                    {isCurrent ? 'EN COURS' : y.statut}
                  </span>
                </div>

                {/* Badges Synthèse des Frais Majeurs */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center text-[10.5px]" style={{ borderColor: 'var(--border)' }}>
                  <div className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Inscription</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">${y.fraisInscription}</span>
                  </div>
                  <div className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Connexion</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">${y.fraisConnexion}</span>
                  </div>
                  <div className="p-1.5 rounded-lg border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[9.5px] font-bold block text-slate-500 dark:text-slate-400">Réinscription</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">${y.fraisReinscription}</span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Salles d'études créées:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{y.salles ? y.salles.length : 4} salles</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Structure Périodique:</span>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{y.semestres.length} Semestres</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">ðŸ‘¥ {y.nombreElevesTotal.toLocaleString()} élèves</span>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {!isCurrent && (
                    <button
                      onClick={() => handleActivateYear(y.id)}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                    >
                      Activer
                    </button>
                  )}

                  {!isCurrent && (
                    <button
                      onClick={() => setDeleteConfirmId(y.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition-all cursor-pointer"
                      title="Supprimer l'année scolaire"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION DÉTIAL DE L'ANNÉE SCOLAIRE SÉLECTIONNÉE AVEC 4 SOUS-ONGLETS */}
      {selectedYear && (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Configuration & Structure — Année Scolaire {selectedYear.nom}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  {selectedYear.statut}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Consultez et gérez la grille tarifaire, la liste des salles physiques et le calendrier pédagogique.
              </p>
            </div>

            {/* Barre des 4 Sous-onglets de Détail */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              {[
                { id: 'frais', label: 'Tarification & Frais', icon: CreditCard },
                { id: 'cycles_salles', label: 'Cycles & Salles', icon: School },
                { id: 'periodes', label: 'Périodes & Examens', icon: Calendar },
                { id: 'rapports', label: 'Documents & PV', icon: FileText },
              ].map(t => {
                const TIcon = t.icon;
                const isActive = activeDetailTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveDetailTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <TIcon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENU DU SOUS-ONGLET SÉLECTIONNÉ */}
          {activeDetailTab === 'frais' && (
            <div className="space-y-4 animate-fade-in">


              {/* TABLEAU DES FRAIS ANNEXES & OPTIONNELS */}
              <div className="p-4 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Frais Annexes Approuvés par le Comité Gestionnaire ({selectedYear.fraisAnnexes ? selectedYear.fraisAnnexes.length : 0})
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b uppercase tracking-wider text-[10px] font-bold text-slate-500 dark:text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <th className="p-3">Intitulé du Frais</th>
                        <th className="p-3">Type de Frais</th>
                        <th className="p-3">Montant Fixé</th>
                        <th className="p-3">Statut Obligation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                      {(selectedYear.fraisAnnexes || []).map(fa => (
                        <tr key={fa.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{fa.intitule}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                              {fa.typeFrais}
                            </span>
                          </td>
                          <td className="p-3 font-black text-indigo-600 dark:text-indigo-400">${fa.montant} {fa.devise}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                              {fa.obligatoire ? 'OBLIGATOIRE' : 'OPTIONNEL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'cycles_salles' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {(selectedYear.cycles || []).map(cyc => (
                  <div key={cyc.id} className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cyc.nom}</h4>
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                        ACTIF
                      </span>
                    </div>
                    <div className="pt-2 border-t flex justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400" style={{ borderColor: 'var(--border)' }}>
                      <span>{cyc.classesCount} promotions</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{cyc.sallesCount || 4} salles physiques</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* LISTE DES SALLES D'ÉTUDES PHYSIQUES ATTRIBUÉES */}
              <div className="p-4 rounded-2xl border shadow-xs space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Répertoire des Salles Physiques d'Études ({selectedYear.salles ? selectedYear.salles.length : 0})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(selectedYear.salles || []).map(sal => (
                    <div key={sal.id} className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{sal.codeSalle}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                          {sal.cycleCode}
                        </span>
                      </div>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{sal.nomSalle}</p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">Capacité max : {sal.capacite} élèves</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === 'periodes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(selectedYear.periodes || []).map(per => (
                  <div key={per.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{per.nom}</h4>
                      <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400">Intervalle : {per.debut} au {per.fin}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                      per.type === 'EXAM' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}>
                      {per.type === 'EXAM' ? 'EXAMENS' : 'PÉRIODE NORMALE'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeDetailTab === 'rapports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
              {[
                { title: 'PV Officiel d’Ouverture & Grille Tarifaire', code: 'PV-EPST-2026-TARIF', desc: 'Décision du conseil d’administration fixant les frais d’inscription, connexion et carte élève.' },
                { title: 'Tableau des Capacités & Salles Physiques', code: 'PV-EPST-2026-SALLES', desc: 'Rapport d’occupation des locaux d’études et quota par classe.' },
              ].map((doc, idx) => (
                <div key={idx} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h4>
                    <span className="font-mono text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">{doc.code}</span>
                    <p className="text-[10.5px] mt-1 text-slate-500 dark:text-slate-400">{doc.desc}</p>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ MODAL ONBOARDING MULTI-ÉTAPES (AGRANDI MAX-W-5XL) POUR CRÉER UNE ANNÉE â”€â”€ */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-5xl rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]"
            style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* EN-TÊTE DU WIZARD */}
            <div className="p-5 border-b flex items-center justify-between shrink-0" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>Assistant d'Onboarding — Année Scolaire</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      Étape {wizardStep} sur 5
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Configuration intégrale : Général, Tarification Inscription/Connexion, Cycles & Salles physiques.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1.5 rounded-xl hover:bg-slate-500/20 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STEPPER BAR D'AVANCEMENT */}
            <div className="px-6 py-3 border-b overflow-x-auto sidebar-scroll shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between min-w-[650px] gap-2">
                {[
                  { step: 1, label: '1. Général & Dates', icon: Calendar },
                  { step: 2, label: '2. Tarification & Frais', icon: CreditCard },
                  { step: 3, label: '3. Cycles & Salles', icon: School },
                  { step: 4, label: '4. Périodes EPST', icon: Layers },
                  { step: 5, label: '5. Validation', icon: CheckCircle2 },
                ].map(s => {
                  const SIcon = s.icon;
                  const isActive = wizardStep === s.step;
                  const isDone = wizardStep > s.step;
                  return (
                    <button
                      key={s.step}
                      onClick={() => setWizardStep(s.step)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
                      }`}
                    >
                      <SIcon className="w-3.5 h-3.5" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CORPS DU FORMULAIRE WIZARD (CONTENU DYNAMIQUE SELON STEP) */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">

              {/* ÉTAPE 1 : INFORMATIONS GÉNÉRALES */}
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Définissez l'intitulé officiel de l'année scolaire et le calendrier de rentrée/clôture publié par le Ministère EPST RDC.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Intitulé de l'Année Scolaire *</label>
                      <input
                        type="text"
                        required
                        placeholder="ex: 2026–2027"
                        value={newNom}
                        onChange={e => setNewNom(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Objectif Prévisionnel d'Élèves</label>
                      <input
                        type="number"
                        value={newTargetEleves}
                        onChange={e => setNewTargetEleves(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Date de Début (Rentrée Scolaire) *</label>
                      <input
                        type="text"
                        required
                        placeholder="07 Septembre 2026"
                        value={newDebut}
                        onChange={e => setNewDebut(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Date de Clôture Officielle *</label>
                      <input
                        type="text"
                        required
                        placeholder="03 Juillet 2027"
                        value={newFin}
                        onChange={e => setNewFin(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-lg border font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Statut Initial de l'Année *</label>
                    <CustomSelect
                      options={[
                        { value: 'PLANIFIEE', label: 'PLANIFIÉE — Préparation administrative (Prochaine année)' },
                        { value: 'EN_COURS', label: 'EN COURS — Basculer immédiatement comme année active' },
                      ]}
                      value={newStatut}
                      onChange={val => setNewStatut(val as any)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 : TARIFICATION & FRAIS D'INSCRIPTION / CONNEXION */}
              {wizardStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Fixez les frais d'inscription obligatoire, les frais de connexion/plateforme système et ajoutez d'autres frais annexes (frais de carte, kit scolaire, etc.).
                    </p>
                  </div>

                  {/* 4 CHAMPS DE FRAIS MAJEURS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block">Frais d'Inscription ($)</label>
                      <input
                        type="number"
                        value={newFraisInscription}
                        onChange={e => setNewFraisInscription(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-emerald-600 dark:text-emerald-400 block">Frais de Connexion Syst. ($)</label>
                      <input
                        type="number"
                        value={newFraisConnexion}
                        onChange={e => setNewFraisConnexion(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-indigo-600 dark:text-indigo-400 block">Frais de Réinscription ($)</label>
                      <input
                        type="number"
                        value={newFraisReinscription}
                        onChange={e => setNewFraisReinscription(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <label className="font-bold text-xs text-amber-600 dark:text-amber-400 block">Frais Carte d'Élève ($)</label>
                      <input
                        type="number"
                        value={newFraisCarte}
                        onChange={e => setNewFraisCarte(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {/* FORMULAIRE D'AJOUT D'UN FRAIS ANNEXE PERSONNALISÉ */}
                  <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ajouter un Frais Annexe / Optionnel</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Intitulé (ex: Kit Uniforme)"
                        value={tempIntituleFrais}
                        onChange={e => setTempIntituleFrais(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="number"
                        placeholder="Montant en $"
                        value={tempMontantFrais}
                        onChange={e => setTempMontantFrais(Number(e.target.value))}
                        className="px-3 py-1.5 text-xs rounded-lg border font-black"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <CustomSelect
                        options={[
                          { value: 'KIT', label: 'Kit Scolaire & Uniforme' },
                          { value: 'CONNEXION', label: 'Frais informatique' },
                          { value: 'AUTRE', label: 'Autre frais annexe' },
                        ]}
                        value={tempTypeFrais}
                        onChange={val => setTempTypeFrais(val as any)}
                      />
                      <button
                        type="button"
                        onClick={handleAddFraisAnnexe}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Ajouter
                      </button>
                    </div>

                    {/* LISTE DES FRAIS ANNEXES AJOUTÉS */}
                    <div className="space-y-1.5 pt-2">
                      {newFraisAnnexes.map(fa => (
                        <div key={fa.id} className="p-2.5 rounded-lg border flex items-center justify-between text-xs font-medium" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                          <div>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{fa.intitule}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-2">({fa.typeFrais})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-indigo-600 dark:text-indigo-400">${fa.montant} {fa.devise}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFraisAnnexe(fa.id)}
                              className="text-rose-500 hover:text-rose-700 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 : CYCLES SCOLAIRES & CONFIGURATION DES SALLES PHYSIQUES */}
              {wizardStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-center gap-3">
                    <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Sélectionnez les cycles scolaires actifs pour cette année et créez les salles physiques d'études nécessaires à l'attribution des classes.
                    </p>
                  </div>

                  {/* SÉLECTION DES CYCLES ACTIFS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { code: 'MATERNELLE', label: 'Cycle Maternelle (3–5 ans)' },
                      { code: 'PRIMAIRE', label: 'Cycle Primaire (1ère–6ème)' },
                      { code: 'SECONDAIRE_CTEB', label: 'CTEB (7ème–8ème Base)' },
                      { code: 'HUMANITES', label: 'Humanités & Techniques' },
                    ].map(cyc => (
                      <label
                        key={cyc.code}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                          newActiveCycles[cyc.code]
                            ? 'border-indigo-500 bg-indigo-500/10 font-bold'
                            : 'opacity-60'
                        }`}
                        style={{ background: 'var(--bg-sunken)', borderColor: newActiveCycles[cyc.code] ? '#6366f1' : 'var(--border)' }}
                      >
                        <input
                          type="checkbox"
                          checked={!!newActiveCycles[cyc.code]}
                          onChange={e => setNewActiveCycles(prev => ({ ...prev, [cyc.code]: e.target.checked }))}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cyc.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* FORMULAIRE D'AJOUT D'UNE SALLE PHYSIQUE */}
                  <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Créer une Salle Physique d'Études dans un Cycle</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                      <input
                        type="text"
                        placeholder="Code salle (ex: H-401)"
                        value={tempCodeSalle}
                        onChange={e => setTempCodeSalle(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-mono font-bold"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="text"
                        placeholder="Nom salle (ex: Labo Math A)"
                        value={tempNomSalle}
                        onChange={e => setTempNomSalle(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <input
                        type="number"
                        placeholder="Capacité max"
                        value={tempCapaciteSalle}
                        onChange={e => setTempCapaciteSalle(Number(e.target.value))}
                        className="px-3 py-1.5 text-xs rounded-lg border font-bold"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                      <CustomSelect
                        options={[
                          { value: 'MATERNELLE', label: 'Maternelle' },
                          { value: 'PRIMAIRE', label: 'Primaire' },
                          { value: 'SECONDAIRE_CTEB', label: '7-8 CTEB' },
                          { value: 'HUMANITES', label: 'Humanités' },
                        ]}
                        value={tempCycleSalle}
                        onChange={val => setTempCycleSalle(val as any)}
                      />
                      <button
                        type="button"
                        onClick={handleAddSalle}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Créer Salle
                      </button>
                    </div>

                    {/* LISTE DES SALLES CRÉÉES */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2">
                      {newSalles.map(s => (
                        <div key={s.id} className="p-2.5 rounded-lg border flex items-center justify-between text-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                          <div>
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold mr-2">{s.codeSalle}</span>
                            <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{s.nomSalle}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">{s.cycleCode} · Capacité: {s.capacite} élèves</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSalle(s.id)}
                            className="text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 4 : DÉCOUPAGE PÉDAGOGIQUE & PÉRIODES */}
              {wizardStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/25 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Configurez la structure périodique (Semestres S1 & S2 ou Trimestres T1, T2 & T3) et validez le calendrier des examens.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Structure Globale du Calendrier *</label>
                    <CustomSelect
                      options={[
                        { value: 'SEMESTRES', label: '2 Semestres (S1 & S2) — Standard EPST RDC' },
                        { value: 'TRIMESTRES', label: '3 Trimestres (T1, T2 & T3)' },
                      ]}
                      value={newStructure}
                      onChange={val => setNewStructure(val as any)}
                      className="w-full"
                    />
                  </div>

                  <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Découpage Récapitulatif des 4 Périodes EPST</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-semibold">
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>1ère Période : Septembre – Novembre</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Cours & Interros</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>2ème Période & Examens S1 : Novembre – Février</span>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Examens S1</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>3ème Période : Février – Avril</span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Cours & Interros</span>
                      </div>
                      <div className="p-2.5 rounded-lg border bg-slate-500/5 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span>4ème Période & EXETAT : Avril – Juillet</span>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">EXETAT & Clôture</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ÉTAPE 5 : RÉCAPITULATIF & VALIDATION */}
              {wizardStep === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/25 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Vérifiez les paramètres de la nouvelle année scolaire avant confirmation et enregistrement final.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Année & Dates</h4>
                      <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Année Scolaire {newNom}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Période : {newDebut} — {newFin}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Statut initial : <span className="font-bold text-indigo-600 dark:text-indigo-400">{newStatut}</span></p>
                    </div>

                    <div className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Tarification Fixée</h4>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Inscription : ${newFraisInscription} · Connexion : ${newFraisConnexion}</p>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Réinscription : ${newFraisReinscription} · Carte : ${newFraisCarte}</p>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400">{newFraisAnnexes.length} frais annexes configurés</p>
                    </div>

                    <div className="p-4 rounded-xl border space-y-2 md:col-span-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Salles Physiques d'Études ({newSalles.length})</h4>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {newSalles.map(s => (
                          <span key={s.id} className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                            {s.codeSalle} — {s.nomSalle} ({s.capacite} pl)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* PIED DE PAGE & BOUTONS DE NAVIGATION STEPPER */}
            <div className="p-4 border-t flex items-center justify-between shrink-0" style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}>
              <button
                type="button"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-1 hover:bg-slate-500/10 disabled:opacity-40 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border text-xs font-bold hover:bg-slate-500/10 transition-all cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Annuler
                </button>

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => Math.min(5, prev + 1))}
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                  >
                    <span>Suivant</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteWizard}
                    className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Créer l'Année Scolaire</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* CONFIRMATION DE SUPPRESSION D'ANNÉE SCOLAIRE */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in select-none" onClick={() => setDeleteConfirmId(null)}>
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border p-6 space-y-4 text-center"
            style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Supprimer cette Année Scolaire ?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Êtes-vous sûr de vouloir supprimer l'année scolaire sélectionnée ? Cette action archivée est irréversible.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/20 cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteYear(deleteConfirmId)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// â”€â”€â”€ TEACHERS TAB â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// ─── TEACHERS TAB ─────────────────────────────────────────────────────────────

const TeachersTab: React.FC = () => {
  const [staffList, setStaffList] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    LocalDatabaseService.getStaff()
      .then(res => setStaffList(res || []))
      .catch(() => setStaffList([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Corps Enseignant & Personnel"
        subtitle={`${staffList.length} membres du personnel enregistrés`}
        actions={
          <button className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition-all cursor-pointer">
            <Plus className="w-4 h-4" /> Nouveau Dossier RH
          </button>
        }
      />

      {loading ? (
        <div className="p-8 text-center rounded-2xl border-0 shadow-md" style={{ background: 'var(--bg-surface)' }}>
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400 font-bold">Chargement du personnel...</p>
        </div>
      ) : staffList.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border-0 shadow-md space-y-3" style={{ background: 'var(--bg-surface)' }}>
          <Users className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Aucun membre du personnel enregistré</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Créez des dossiers pour les enseignants, administratifs et agents de l'établissement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map(s => (
            <div
              key={s.id}
              className="rounded-2xl border-0 shadow-md hover:shadow-xl transition-all p-5"
              style={{ background: 'var(--bg-surface)' }}
            >
              <div className="flex items-start gap-3">
                {s.avatarUrl ? (
                  <img src={s.avatarUrl} alt={s.prenom} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                ) : (
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #818cf8)' }}
                  >
                    {s.prenom[0]}{s.nom[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.prenom} {s.nom}</h3>
                  <p className="text-xs text-slate-400 font-semibold">{s.role}</p>
                  <div className="mt-1.5">{statusBadge(s.statut)}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs font-medium">
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{s.telephone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="truncate">{s.email}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// â”€â”€â”€ SCHEDULE & GRADES PLACEHOLDERS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ScheduleTab: React.FC = () => (
  <div className="p-8 text-center rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <Calendar className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
    <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Emplois du Temps & Planning des Cours</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
      Gestionnaire de grilles d'emplois du temps hebdomadaires par classe et enseignant titulaire.
    </p>
  </div>
);

const GradesTab: React.FC = () => (
  <div className="p-8 text-center rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <ClipboardList className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
    <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Cotes & PV d'Examens EPST RDC</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
      Saisie des cotes d'interrogations, compositions et génération des bulletins scolaires trimestriels.
    </p>
  </div>
);

// â”€â”€â”€ MAIN MANAGER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AcademicManager: React.FC<AcademicManagerProps> = ({ activeSubTab = 'students', activeSchoolYear }) => {
  const tabs = [
    { id: 'students', label: 'Élèves & Inscriptions', icon: GraduationCap },
    { id: 'classes', label: 'Classes & Local', icon: BookOpen },
    { id: 'subjects', label: 'Matières & Coefficients', icon: Layers },
    { id: 'years', label: 'Année Scolaire & Périodes', icon: Calendar },
    { id: 'teachers', label: 'Enseignants & Personnel', icon: Users },
    { id: 'schedule', label: 'Emploi du Temps', icon: Calendar },
    { id: 'grades', label: 'Cotes & Bulletins', icon: ClipboardList },
  ];

  const [localTab, setLocalTab] = useState(activeSubTab);

  React.useEffect(() => {
    setLocalTab(activeSubTab);
  }, [activeSubTab]);

  const renderTab = () => {
    switch (localTab) {
      case 'students': return <StudentsManager activeSchoolYear={activeSchoolYear} />;
      case 'classes':  return <ClassesPromotionsManager activeSchoolYear={activeSchoolYear} onNavigateToStudents={(clsId) => setLocalTab('students')} />;
      case 'subjects': return <SubjectsManager activeSchoolYear={activeSchoolYear} />;
      case 'years':    return <SchoolYearsTab activeSchoolYear={activeSchoolYear} />;
      case 'teachers': return <TeacherManager activeSchoolYear={activeSchoolYear} />;
      case 'schedule': return <ScheduleManager activeSchoolYear={activeSchoolYear} />;
      case 'grades':   return <GradesManager activeSchoolYear={activeSchoolYear} />;
      default:         return <StudentsManager activeSchoolYear={activeSchoolYear} />;
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Content */}
      <div className="animate-fade-in" key={localTab}>
        {renderTab()}
      </div>
    </div>
  );
};

