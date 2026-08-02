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
import { mockStudents, mockClasses, mockCycles, mockSubjects, mockStaff } from '../../data/mockData';
import {
  Eleve,
  Discipline,
  ClasseScolaire,
  CycleScolaire,
  FraisAnnexeConfig,
  SalleConfig,
  CycleConfig,
  AnneeScolaireConfig
} from '../../types';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { LocalDatabaseService } from '../../services/localDatabase';
import { NATIONAL_EPST_OPTIONS } from '../onboarding/OnboardingWizard';

interface AcademicManagerProps {
  activeSubTab?: string;
}

const mockSchoolYears: AnneeScolaireConfig[] = [];

// ─── Composant de Pagination Réutilisable Haute Lisibilité ──────────────────
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
          ‹ Précédent
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
          Suivant ›
        </button>
      </div>
    </div>
  );
};

// ─── Shared UI ─────────────────────────────────────────────────────────────

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

// ─── PAGE DÉDIÉE DE CONSULTATION COMPLÈTE DE L'ÉLÈVE (AVEC BOUTON RETOUR) ──

const StudentDetailPage: React.FC<{ student: Eleve; onBack: () => void }> = ({ student, onBack }) => {
  const [tab, setTab] = useState<'identity' | 'parents' | 'grades' | 'attendance' | 'finance' | 'card'>('identity');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showFullFileModal, setShowFullFileModal] = useState(false);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRE SUPÉRIEURE AVEC BOUTON RETOUR & ACTIONS */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border shadow-xs transition-colors"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Retour à la Liste</span>
          </button>
          <div className="h-5 w-px hidden sm:block" style={{ background: 'var(--border)' }} />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Dossier Académique Officiel · EPST RDC
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFullFileModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40"
          >
            <FileText className="w-4 h-4 text-white" /> Exporter Dossier Complet (PDF / Word)
          </button>
          <button
            className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-500/10 transition-colors cursor-pointer"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <Printer className="w-3.5 h-3.5" /> Bulletin PDF
          </button>
          <button
            onClick={() => setShowCardModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/40 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-white" /> Aperçu Carte Recto/Verso
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
                  🗓️ Né(e) le {student.dateNaissance} ({student.lieuNaissance})
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
                        🩸 Groupe {student.groupeSanguin || 'O+'}
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
                  <span className="text-xs font-black text-slate-400">Total : N/A (0 cote)</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border p-6 text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune cote enregistrée</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Saisissez les notes dans le module Cotes & Bulletins.</p>
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
                    <p className="text-3xl font-black text-emerald-400">0</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">Jours de Présence</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20">
                    <p className="text-3xl font-black text-amber-400">0</p>
                    <p className="text-xs font-bold text-slate-300 mt-1">Absences Justifiées</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-red-500/10 border-red-500/20">
                    <p className="text-3xl font-black text-red-400">0</p>
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
                        <span>•</span>
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
                        {student.nomPere || student.nomParent || 'M. Jean-Baptiste Mukendi'}
                      </h4>
                      <p className="text-xs font-extrabold text-indigo-500">Père / Tuteur Principal Légal</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-500 border border-indigo-500/30">
                    {student.professionPere || 'Ingénieur BTP'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" /> WhatsApp / Tél :
                    </span>
                    <a href={`tel:${student.telephonePere || student.telephoneParent}`} className="font-mono font-black text-indigo-500 hover:underline text-xs">
                      {student.telephonePere || student.telephoneParent || '+243 81 555 0192'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Direct :
                    </span>
                    <a href={`mailto:${student.emailPere || student.emailParent}`} className="font-mono font-black text-indigo-500 hover:underline text-xs">
                      {student.emailPere || student.emailParent || 'j.mukendi@gmail.com'}
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
                        {student.nomMere || 'Mme Chantal Bakamba'}
                      </h4>
                      <p className="text-xs font-extrabold text-pink-500">Mère / Tuteur Secondaire</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-pink-500/15 text-pink-500 border border-pink-500/30">
                    {student.professionMere || 'Médecin Généraliste'}
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

interface StudentsTabProps {
  onOpenRegisterStudent?: () => void;
}

const StudentsTab: React.FC<StudentsTabProps> = ({ onOpenRegisterStudent }) => {
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classesList, setClassesList] = useState<ClasseScolaire[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Eleve | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [eleves, classes] = await Promise.all([
        LocalDatabaseService.getEleves(),
        LocalDatabaseService.getClasses()
      ]);
      setStudents(eleves);
      setClassesList(classes);
    };
    load();
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const match = !q || s.prenom.toLowerCase().includes(q)
        || s.nom.toLowerCase().includes(q)
        || (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q));
      const cls = !selectedClass || s.classId === selectedClass;
      return match && cls;
    });
  }, [students, search, selectedClass]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const classOptions = useMemo(() => [
    { value: '', label: `Toutes les classes (${classesList.length})` },
    ...classesList.map(cls => ({ value: cls.id, label: cls.nom })),
  ], [classesList]);

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
              onClick={() => onOpenRegisterStudent?.()}
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
    </div>
  );
};

// ─── ONGLET 2 : CLASSES & CYCLES AVEC PAGINATION & CREATION ───────────────

// ─── ONGLET 2 : CLASSES & CREATION MULTI-FRAYEURS (AVEC SALLES ET TITULAIRES) ───

interface ClassesTabProps {
  onOpenCreateClass?: () => void;
  onOpenManageRooms?: () => void;
}

const ClassesTab: React.FC<ClassesTabProps> = ({ onOpenCreateClass, onOpenManageRooms }) => {
  const [classesList, setClassesList] = useState<ClasseScolaire[]>(mockClasses);
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
        title="Classes, Promotions & Salles Physiques EPST"
        subtitle="Répertoire officiel des salles de classe et affectations des professeurs titulaires"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenManageRooms?.()}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center gap-1.5 hover:bg-slate-200 transition-all cursor-pointer shadow-2xs"
            >
              <School className="w-4 h-4 text-indigo-500" />
              <span>Gérer les Salles Physiques</span>
            </button>

            <button
              onClick={() => onOpenCreateClass?.()}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une Nouvelle Classe</span>
            </button>
          </div>
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
                <th className="py-3 px-4">Local / Salle Physique</th>
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
                      <span className="font-extrabold">{c.nom}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{c.salle}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{c.professeurTitulaire}</td>
                  <td className="py-3 px-4 font-medium">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60">
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

interface SubjectsTabProps {
  onOpenCreateSubject?: () => void;
}

const SubjectsTab: React.FC<SubjectsTabProps> = ({ onOpenCreateSubject }) => {
  const [subjectsList, setSubjectsList] = useState<Discipline[]>(mockSubjects);
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
          <button
            onClick={() => onOpenCreateSubject?.()}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Matière</span>
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

// ─── ONGLET 4 : GESTION DE L'ANNÉE SCOLAIRE ─────────────────────────────────────

interface SchoolYearsTabProps {
  onOpenCreateYear?: () => void;
}

const SchoolYearsTab: React.FC<SchoolYearsTabProps> = ({ onOpenCreateYear }) => {
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [editingYear, setEditingYear] = useState<AnneeScolaireConfig | null>(null);
  const [printYear, setPrintYear] = useState<AnneeScolaireConfig | null>(null);

  // Form states for editing year
  const [editNom, setEditNom] = useState('');
  const [editDebut, setEditDebut] = useState('');
  const [editFin, setEditFin] = useState('');
  const [editStatut, setEditStatut] = useState<'PLANIFIEE' | 'EN_COURS' | 'CLOTUREE'>('EN_COURS');
  const [editFraisInscription, setEditFraisInscription] = useState(0);
  const [editFraisConnexion, setEditFraisConnexion] = useState(0);
  const [editFraisReinscription, setEditFraisReinscription] = useState(0);
  const [editFraisCarte, setEditFraisCarte] = useState(0);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'frais' | 'cycles_salles' | 'periodes' | 'rapports'>('frais');

  const refreshYears = async () => {
    const list = await LocalDatabaseService.getSchoolYears();
    setYears(list);
    if (!selectedYearId && list.length > 0) {
      const active = list.find(y => y.statut === 'EN_COURS');
      setSelectedYearId(active?.id || list[0]?.id || '');
    }
    return list;
  };

  useEffect(() => { refreshYears(); }, []);

  const selectedYear = useMemo(() => {
    return years.find(y => y.id === selectedYearId) || years[0];
  }, [years, selectedYearId]);

  const handleDeleteYear = async (id: string) => {
    await LocalDatabaseService.deleteSchoolYear(id);
    const updated = await LocalDatabaseService.getSchoolYears();
    setYears(updated);
    if (selectedYearId === id) setSelectedYearId(updated.find(y => y.id !== id)?.id || '');
    setDeleteConfirmId(null);
  };

  const handleActivateYear = async (id: string) => {
    const list = await LocalDatabaseService.getSchoolYears();
    await Promise.all(list.map(y => {
      if (y.id === id) return LocalDatabaseService.updateSchoolYear(y.id, { statut: 'EN_COURS' });
      if (y.statut === 'EN_COURS') return LocalDatabaseService.updateSchoolYear(y.id, { statut: 'CLOTUREE' });
      return Promise.resolve();
    }));
    setYears(await LocalDatabaseService.getSchoolYears());
  };

  const fmt = (amount: number, devise?: string) =>
    amount > 0 ? `${amount.toLocaleString('fr-FR')} ${devise || 'USD'}` : null;

  const statutCls = (s: string) => {
    if (s === 'EN_COURS') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    if (s === 'CLOTUREE') return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  };

  const emptyCell = <span className="text-[10px] italic" style={{ color: 'var(--text-muted)' }}>—</span>;

  const openEditModal = (y: AnneeScolaireConfig) => {
    setEditingYear(y);
    setEditNom(y.nom || '');
    setEditDebut(y.debut || '');
    setEditFin(y.fin || '');
    setEditStatut(y.statut as any || 'EN_COURS');
    setEditFraisInscription(y.fraisInscription || 0);
    setEditFraisConnexion(y.fraisConnexion || 0);
    setEditFraisReinscription(y.fraisReinscription || 0);
    setEditFraisCarte(y.fraisCarte || 0);
  };

  const handleSaveEditYear = async () => {
    if (!editingYear) return;
    await LocalDatabaseService.updateSchoolYear(editingYear.id, {
      nom: editNom,
      debut: editDebut,
      fin: editFin,
      statut: editStatut,
      fraisInscription: editFraisInscription,
      fraisConnexion: editFraisConnexion,
      fraisReinscription: editFraisReinscription,
      fraisCarte: editFraisCarte
    });
    setEditingYear(null);
    refreshYears();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <SectionHeader
        title="Années Scolaires"
        subtitle="Structure pédagogique, tarification et périodes de chaque année"
        actions={
          <button
            onClick={() => onOpenCreateYear?.()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-2 cursor-pointer border border-indigo-400/40 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Nouvelle Année Scolaire
          </button>
        }
      />

      {/* LISTE COMPACTE */}
      {years.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center mx-auto border border-indigo-500/30">
            <Calendar className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Aucune Année Scolaire</h3>
            <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              Aucune année n'a été configurée. Créez votre première année pour commencer.
            </p>
          </div>
          <button
            onClick={() => onOpenCreateYear?.()}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Créer la première année
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          {/* EN-TÊTE TABLE */}
          <div
            className="grid grid-cols-12 px-4 py-2.5 border-b text-[10.5px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <span className="col-span-1">Statut</span>
            <span className="col-span-3">Année</span>
            <span className="col-span-3">Période</span>
            <span className="col-span-1">Elèves</span>
            <span className="col-span-1">Cycles</span>
            <span className="col-span-3 text-right">Actions</span>
          </div>

          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {years.map(y => {
              const isCurrent = y.statut === 'EN_COURS';
              const isSelected = selectedYearId === y.id;
              return (
                <div
                  key={y.id}
                  onClick={() => setSelectedYearId(y.id)}
                  className={`grid grid-cols-12 px-4 py-3 items-center cursor-pointer text-xs transition-all ${
                    isSelected ? 'bg-indigo-500/8 border-l-[3px] border-l-indigo-500' : 'hover:bg-slate-500/5'
                  }`}
                >
                  <div className="col-span-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${statutCls(y.statut)}`}>
                      {isCurrent ? 'Active' : y.statut === 'CLOTUREE' ? 'Clôturée' : 'Prévue'}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isCurrent ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <Calendar className={`w-3 h-3 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <span className="font-black" style={{ color: 'var(--text-primary)' }}>{y.nom}</span>
                  </div>
                  <div className="col-span-3" style={{ color: 'var(--text-secondary)' }}>
                    {y.debut && y.fin ? `${y.debut} → ${y.fin}` : emptyCell}
                  </div>
                  <div className="col-span-1" style={{ color: 'var(--text-primary)' }}>
                    {y.nombreElevesTotal > 0 ? `${y.nombreElevesTotal.toLocaleString('fr-FR')}` : emptyCell}
                  </div>
                  <div className="col-span-1" style={{ color: 'var(--text-secondary)' }}>
                    {y.cycles?.length > 0 ? y.cycles.length : emptyCell}
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    {!isCurrent && (
                      <button
                        onClick={() => handleActivateYear(y.id)}
                        className="px-2 py-1 rounded-lg text-[9.5px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer mr-1"
                      >
                        Activer
                      </button>
                    )}

                    {/* BOUTON 1 : IMPRIMER RAPPORT COMPLET */}
                    <button
                      onClick={() => setPrintYear(y)}
                      className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-indigo-500/15 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                      title="Imprimer le rapport complet de l'année"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {/* BOUTON 2 : MODIFIER L'ANNÉE */}
                    <button
                      onClick={() => openEditModal(y)}
                      className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all cursor-pointer"
                      title="Modifier l'année scolaire"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* BOUTON 3 : SUPPRIMER L'ANNÉE */}
                    {!isCurrent && (
                      <button
                        onClick={() => setDeleteConfirmId(y.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer"
                        title="Supprimer l'année scolaire"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PANNEAU DE DÉTAIL */}
      {selectedYear && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          {/* EN-TÊTE PANNEAU */}
          <div
            className="px-5 py-3.5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{selectedYear.nom}</h3>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                  {selectedYear.debut && selectedYear.fin ? `${selectedYear.debut} — ${selectedYear.fin}` : 'Période non définie'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
              {[{ id: 'frais', label: 'Frais & Tarifs', icon: CreditCard }, { id: 'cycles_salles', label: 'Cycles & Salles', icon: School }, { id: 'periodes', label: 'Périodes', icon: Calendar }, { id: 'rapports', label: 'Documents', icon: FileText }].map(t => {
                const TIcon = t.icon;
                const isActive = activeDetailTab === t.id as any;
                return (
                  <button key={t.id} onClick={() => setActiveDetailTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-500/10'}`}
                    style={isActive ? {} : { color: 'var(--text-secondary)' }}
                  >
                    <TIcon className="w-3.5 h-3.5" />{t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {/* ONGLET FRAIS */}
            {activeDetailTab === 'frais' && (
              <div className="space-y-4 animate-fade-in">
                {(selectedYear.fraisInscription > 0 || selectedYear.fraisConnexion > 0 || selectedYear.fraisReinscription > 0 || selectedYear.fraisCarte > 0) ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {selectedYear.fraisInscription > 0 && (
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Inscription</span>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{fmt(selectedYear.fraisInscription)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Frais principal à l'inscription</p>
                      </div>
                    )}
                    {selectedYear.fraisConnexion > 0 && (
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Connexion</span>
                        <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{fmt(selectedYear.fraisConnexion)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Inclus dans l'inscription</p>
                      </div>
                    )}
                    {selectedYear.fraisReinscription > 0 && (
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Réinscription</span>
                        <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{fmt(selectedYear.fraisReinscription)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Anciens élèves reconduits</p>
                      </div>
                    )}
                    {selectedYear.fraisCarte > 0 && (
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Carte Élève</span>
                        <p className="text-xl font-black text-amber-600 dark:text-amber-400">{fmt(selectedYear.fraisCarte)}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Badge QR Code EPST</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aucun frais configuré. Utilisez l'assistant pour définir la tarification.</p>
                  </div>
                )}
                {selectedYear.fraisAnnexes && selectedYear.fraisAnnexes.length > 0 && (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <div className="px-4 py-2.5 border-b text-[10.5px] font-bold uppercase tracking-wider" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                      Frais Annexes ({selectedYear.fraisAnnexes.length})
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                          <th className="px-4 py-2.5 text-left font-bold uppercase text-[10px] tracking-wider">Intitulé</th>
                          <th className="px-4 py-2.5 text-left font-bold uppercase text-[10px] tracking-wider">Type</th>
                          <th className="px-4 py-2.5 text-right font-bold uppercase text-[10px] tracking-wider">Montant</th>
                          <th className="px-4 py-2.5 text-right font-bold uppercase text-[10px] tracking-wider">Obligation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                        {selectedYear.fraisAnnexes.map(fa => (
                          <tr key={fa.id} className="hover:bg-slate-500/5">
                            <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--text-primary)' }}>{fa.intitule}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">{fa.typeFrais}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                              {fa.montant?.toLocaleString('fr-FR')} {fa.devise}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border ${
                                fa.obligatoire ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25' : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'
                              }`}>{fa.obligatoire ? 'Obligatoire' : 'Optionnel'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET CYCLES & SALLES */}
            {activeDetailTab === 'cycles_salles' && (
              <div className="space-y-4 animate-fade-in">
                {(!selectedYear.cycles?.length && !selectedYear.salles?.length) ? (
                  <div className="p-8 text-center rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <School className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun cycle ni salle physique configuré</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Les cycles (Maternelle, Primaire, Secondaire...) et leurs salles d'études physiques seront affichés ici dès leur création.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Cycles */}
                    {selectedYear.cycles && selectedYear.cycles.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          Cycles Scolaires Enregistrés ({selectedYear.cycles.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {selectedYear.cycles.map(cyc => (
                            <div key={cyc.id} className="p-3.5 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{cyc.nom}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">ACTIF</span>
                              </div>
                              <div className="flex justify-between text-[10.5px] pt-1 border-t" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                <span>{cyc.classesCount || 0} promotions</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{cyc.sallesCount || 0} salles</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Salles */}
                    {selectedYear.salles && selectedYear.salles.length > 0 && (
                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                        <div className="px-4 py-2.5 border-b text-[10.5px] font-bold uppercase tracking-wider" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                          Salles Physiques ({selectedYear.salles.length})
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3">
                          {selectedYear.salles.map(sal => (
                            <div key={sal.id} className="p-3 rounded-lg border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{sal.codeSalle}</span>
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 border border-slate-500/20">{sal.cycleCode}</span>
                              </div>
                              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{sal.nomSalle}</p>
                              <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Capacité : {sal.capacite} élèves</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ONGLET PÉRIODES */}
            {activeDetailTab === 'periodes' && (
              <div className="space-y-3 animate-fade-in">
                {selectedYear.periodes && selectedYear.periodes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedYear.periodes.map(per => (
                      <div key={per.id} className="p-4 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <div>
                          <h4 className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{per.nom}</h4>
                          <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{per.debut} → {per.fin}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[9.5px] font-bold border ${
                          per.type === 'EXAM' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        }`}>{per.type === 'EXAM' ? 'EXAMENS' : 'PÉRIODE'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <Calendar className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune période configurée</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Le découpage des semestres, trimestres et périodes d'examens apparaîtra ici une fois configuré.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET DOCUMENTS */}
            {activeDetailTab === 'rapports' && (() => {
              const docs = [];

              if (selectedYear.fraisInscription > 0 || (selectedYear.fraisAnnexes && selectedYear.fraisAnnexes.length > 0)) {
                docs.push({
                  title: 'PV Officiel d\'Ouverture & Grille Tarifaire',
                  code: `PV-EPST-${selectedYear.nom}-TARIF`,
                  desc: `Décision du conseil fixant les frais d'inscription et la grille des frais annexes pour l'année ${selectedYear.nom}.`
                });
              }

              if (selectedYear.salles && selectedYear.salles.length > 0) {
                docs.push({
                  title: 'Tableau des Capacités & Salles Physiques',
                  code: `PV-EPST-${selectedYear.nom}-SALLES`,
                  desc: `Rapport officiel d'occupation des ${selectedYear.salles.length} salles d'études physiques.`
                });
              }

              if (selectedYear.periodes && selectedYear.periodes.length > 0) {
                docs.push({
                  title: 'Calendrier Pédagogique Officiel EPST',
                  code: `CAL-EPST-${selectedYear.nom}`,
                  desc: `Découpage officiel en ${selectedYear.periodes.length} périodes et sessions d'examens.`
                });
              }

              if (docs.length === 0) {
                return (
                  <div className="p-8 text-center rounded-xl border space-y-2 animate-fade-in" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <FileText className="w-8 h-8 mx-auto text-slate-400" />
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Aucun document officiel généré</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Configurez la tarification, les salles physiques ou le calendrier de cette année scolaire pour générer les PV officiels.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in">
                  {docs.map((doc, idx) => (
                    <div key={idx} className="p-4 rounded-xl border flex items-start justify-between gap-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h4>
                        <span className="font-mono text-[9.5px] text-indigo-600 dark:text-indigo-400 font-bold block mt-0.5">{doc.code}</span>
                        <p className="text-[10.5px] mt-1" style={{ color: 'var(--text-muted)' }}>{doc.desc}</p>
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 1 : CONFIRMATION SUPPRESSION */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-4 text-center" style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Supprimer cette Année Scolaire ?</h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Cette action est irréversible et supprimera l'ensemble de sa configuration.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl border font-bold text-xs cursor-pointer hover:bg-slate-500/10" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Annuler</button>
              <button onClick={() => handleDeleteYear(deleteConfirmId)} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-md">Confirmer la suppression</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2 : MODIFIER L'ANNÉE SCOLAIRE */}
      {editingYear && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" onClick={() => setEditingYear(null)}>
          <div className="w-full max-w-xl rounded-2xl border p-6 space-y-5 shadow-2xl" style={{ background: 'var(--sidebar-popover-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600 text-white"><Edit3 className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-base font-extrabold">Modifier l'Année Scolaire {editingYear.nom}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Mise à jour des informations générales et des frais de base</p>
                </div>
              </div>
              <button onClick={() => setEditingYear(null)} className="p-1.5 rounded-lg hover:bg-slate-500/20 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Nom / Intitulé</label>
                  <input
                    type="text"
                    value={editNom}
                    onChange={e => setEditNom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-semibold"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Statut de l'Année</label>
                  <select
                    value={editStatut}
                    onChange={e => setEditStatut(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-semibold"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <option value="PLANIFIEE">PLANIFIÉE (À venir)</option>
                    <option value="EN_COURS">EN COURS (Active)</option>
                    <option value="CLOTUREE">CLÔTURÉE (Archivée)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Date Début</label>
                  <input
                    type="text"
                    value={editDebut}
                    onChange={e => setEditDebut(e.target.value)}
                    placeholder="Ex: 07 Septembre 2026"
                    className="w-full px-3 py-2 rounded-lg border text-xs font-semibold"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Date Fin</label>
                  <input
                    type="text"
                    value={editFin}
                    onChange={e => setEditFin(e.target.value)}
                    placeholder="Ex: 03 Juillet 2027"
                    className="w-full px-3 py-2 rounded-lg border text-xs font-semibold"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Tarification & Frais Principaux</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Frais d'Inscription</label>
                    <input
                      type="number"
                      value={editFraisInscription}
                      onChange={e => setEditFraisInscription(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-bold"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Frais de Connexion</label>
                    <input
                      type="number"
                      value={editFraisConnexion}
                      onChange={e => setEditFraisConnexion(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-bold"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Frais de Réinscription</label>
                    <input
                      type="number"
                      value={editFraisReinscription}
                      onChange={e => setEditFraisReinscription(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-bold"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-500 mb-1">Frais Carte Élève</label>
                    <input
                      type="number"
                      value={editFraisCarte}
                      onChange={e => setEditFraisCarte(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border text-xs font-bold"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setEditingYear(null)}
                className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEditYear}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 3 : IMPRESSION RAPPORT COMPLET DE L'ANNÉE */}
      {printYear && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setPrintYear(null)}>
          <div className="w-full max-w-3xl rounded-2xl border p-6 space-y-6 shadow-2xl bg-white text-slate-900 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* BOUTONS D'ACTION EN-TÊTE IMPRESSION */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">Aperçu Rapport Complet — Année {printYear.nom}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs shadow-md hover:bg-indigo-700 cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> Imprimer / Export PDF
                </button>
                <button
                  onClick={() => setPrintYear(null)}
                  className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* EN-TÊTE OFFICIEL DE RAPPORT */}
            <div className="text-center space-y-1 pb-4 border-b border-slate-200">
              <div className="flex justify-center items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg">É</div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900">ÉCOLISA PRO</span>
              </div>
              <h2 className="text-lg font-black uppercase tracking-wide text-indigo-950">
                RAPPORT SYNTHÈSE ET STRUCTURE D'ANNÉE SCOLAIRE {printYear.nom}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                République Démocratique du Congo · Ministère de l'Éducation Nationale et Nouvelle Citoyenneté (EPST)
              </p>
              <div className="pt-2 flex items-center justify-center gap-4 text-xs font-bold text-slate-700">
                <span>🗓️ Période : {printYear.debut || 'N/A'} au {printYear.fin || 'N/A'}</span>
                <span>•</span>
                <span>📌 Statut : {printYear.statut}</span>
                <span>•</span>
                <span>👥 Total Élèves : {printYear.nombreElevesTotal.toLocaleString('fr-FR')}</span>
              </div>
            </div>

            {/* SECTION 1 : TARIFICATION & FRAIS */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 border-b border-indigo-100 pb-1">
                1. Grille Tarifaire & Frais Approvisés
              </h4>
              <div className="grid grid-cols-4 gap-3 text-center text-xs">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Inscription</span>
                  <span className="font-black text-indigo-700 text-base">{printYear.fraisInscription ? `${printYear.fraisInscription} USD` : 'Non fixé'}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Connexion</span>
                  <span className="font-black text-emerald-700 text-base">{printYear.fraisConnexion ? `${printYear.fraisConnexion} USD` : 'Non fixé'}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Réinscription</span>
                  <span className="font-black text-indigo-700 text-base">{printYear.fraisReinscription ? `${printYear.fraisReinscription} USD` : 'Non fixé'}</span>
                </div>
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Carte Élève</span>
                  <span className="font-black text-amber-700 text-base">{printYear.fraisCarte ? `${printYear.fraisCarte} USD` : 'Non fixé'}</span>
                </div>
              </div>

              {printYear.fraisAnnexes && printYear.fraisAnnexes.length > 0 && (
                <div className="mt-2">
                  <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 font-bold text-[10px] uppercase text-slate-600">
                      <tr>
                        <th className="p-2 border-b">Libellé Frais Annexe</th>
                        <th className="p-2 border-b">Type</th>
                        <th className="p-2 border-b text-right">Montant</th>
                        <th className="p-2 border-b text-right">Obligation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {printYear.fraisAnnexes.map(fa => (
                        <tr key={fa.id}>
                          <td className="p-2 font-bold text-slate-900">{fa.intitule}</td>
                          <td className="p-2 text-slate-600">{fa.typeFrais}</td>
                          <td className="p-2 text-right font-black text-indigo-700">{fa.montant} {fa.devise}</td>
                          <td className="p-2 text-right font-bold text-slate-700">{fa.obligatoire ? 'Obligatoire' : 'Optionnel'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECTION 2 : CYCLES ET SALLES */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 border-b border-indigo-100 pb-1">
                2. Cycles Scolaires & Salles Physiques ({printYear.salles?.length || 0} salles)
              </h4>
              {printYear.salles && printYear.salles.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {printYear.salles.map(sal => (
                    <div key={sal.id} className="p-2 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-indigo-700 text-xs block">{sal.codeSalle}</span>
                        <span className="text-[11px] font-medium text-slate-800">{sal.nomSalle}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">{sal.capacite} élèves</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucune salle d'étude physique configurée pour cette année.</p>
              )}
            </div>

            {/* SECTION 3 : CALENDRIER DES PÉRIODES */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 border-b border-indigo-100 pb-1">
                3. Calendrier Pédagogique & Périodes d'Évaluation ({printYear.periodes?.length || 0} périodes)
              </h4>
              {printYear.periodes && printYear.periodes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {printYear.periodes.map(per => (
                    <div key={per.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <span className="font-bold text-slate-900">{per.nom}</span>
                      <span className="text-[10.5px] text-slate-600 font-semibold">{per.debut} → {per.fin}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">Aucune période ou trimestre configuré pour cette année.</p>
              )}
            </div>

            {/* FOOTER IMPRESSION */}
            <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Rapport généré le {new Date().toLocaleDateString('fr-FR')} via ÉCOLISA PRO</span>
              <span>Visa Direction / Secrétariat Général EPST</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
// ─── TEACHERS TAB ─────────────────────────────────────────────────────────

const TeachersTab: React.FC = () => (
  <div>
    <SectionHeader
      title="Corps Enseignant & Personnel"
      subtitle={`${mockStaff.length} membres du personnel · Année 2025-2026`}
      actions={
        <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer">
          <Plus className="w-4 h-4" /> Nouveau Dossier RH
        </button>
      }
    />

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {mockStaff.map(s => (
        <div
          key={s.id}
          className="rounded-2xl border shadow-md overflow-hidden hover:shadow-lg transition-shadow p-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-start gap-3">
            {s.avatarUrl ? (
              <img src={s.avatarUrl} alt={s.prenom} className="w-12 h-12 rounded-2xl object-cover border border-indigo-500/30 shadow-sm" />
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
              <Phone className="w-3.5 h-3.5" />
              <span>{s.telephone}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{s.email}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── SCHEDULE & GRADES PLACEHOLDERS ───────────────────────────────────────

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

// ─── MAIN MANAGER ─────────────────────────────────────────────────────────

// ─── FULL-PAGE CREATION WRAPPERS ───────────────────────────────────────────

const CreateSubjectPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [categorie, setCategorie] = useState('Sciences & Mathématiques');
  const [coefficient, setCoefficient] = useState(4);
  const [maxScore, setMaxScore] = useState(40);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !code.trim()) return;
    await LocalDatabaseService.addSubject({
      id: `sub-${Date.now()}`,
      code: code.toUpperCase(),
      nom,
      coefficient,
      maxScore,
      categorie
    } as any);
    onBack();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs hover:bg-slate-500/10 transition-all cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <ChevronLeft className="w-4 h-4" /> Retour aux Matières
        </button>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Ajouter une Matière EPST</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pondération et coefficient officiel</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 p-6 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Nom de la Matière *</label>
            <input type="text" required placeholder="ex: Mathématiques Générales" value={nom} onChange={e => setNom(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Code EPST *</label>
            <input type="text" required placeholder="ex: MATH" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 rounded-xl border font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Catégorie EPST RDC</label>
          <CustomSelect
            options={[
              { value: 'Sciences & Mathématiques', label: 'Sciences & Mathématiques (STEM)' },
              { value: 'Langues & Lettres', label: 'Langues, Français & Anglais' },
              { value: 'Commercial & OHADA', label: 'Commerciale, Comptabilité & Gestion' },
              { value: 'Sciences Humaines', label: 'Sciences Humaines, Histoire & Géo' },
              { value: 'Technologie & Arts', label: 'Technologie, Informatique & Métiers' },
            ]}
            value={categorie}
            onChange={setCategorie}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Coefficient</label>
            <input type="number" min={1} max={10} value={coefficient} onChange={e => setCoefficient(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Maximum Points</label>
            <input type="number" min={10} value={maxScore} onChange={e => setMaxScore(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Annuler</button>
          <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm cursor-pointer">Enregistrer la Matière</button>
        </div>
      </form>
    </div>
  );
};

const CreateClassPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [nom, setNom] = useState('');
  const [salle, setSalle] = useState('');
  const [titulaire, setTitulaire] = useState('');
  const [cycle, setCycle] = useState('PRIMAIRE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    await LocalDatabaseService.addClass({
      id: `cls-${Date.now()}`,
      cycleId: cycle,
      nom,
      salle,
      nombreEleves: 0,
      professeurTitulaire: titulaire || 'A affecter'
    } as any);
    onBack();
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs hover:bg-slate-500/10 transition-all cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <ChevronLeft className="w-4 h-4" /> Retour aux Classes
        </button>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white"><BookOpen className="w-4 h-4" /></div>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Créer une Nouvelle Classe</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Promotion scolaire avec affectation de titulaire</p>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 p-6 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Nom de la Classe *</label>
          <input type="text" required placeholder="ex: 4ème Primaire B" value={nom} onChange={e => setNom(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Cycle</label>
          <CustomSelect
            options={[
              { value: 'MATERNELLE', label: 'Cycle Maternelle' },
              { value: 'PRIMAIRE', label: 'Cycle Primaire' },
              { value: 'SECONDAIRE_CTEB', label: '7ème & 8ème CTEB' },
              { value: 'HUMANITES', label: 'Humanités Générales & Techniques' },
            ]}
            value={cycle}
            onChange={setCycle}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Salle Attribuée</label>
            <input type="text" placeholder="ex: Salle B-205" value={salle} onChange={e => setSalle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase" style={{ color: 'var(--text-primary)' }}>Professeur Titulaire</label>
            <input type="text" placeholder="ex: M. Jean Kabila" value={titulaire} onChange={e => setTitulaire(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <button type="button" onClick={onBack} className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-500/10 cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Annuler</button>
          <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm cursor-pointer">Créer la Classe</button>
        </div>
      </form>
    </div>
  );
};

const ManageRoomsPage: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="space-y-5 animate-fade-in">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs hover:bg-slate-500/10 transition-all cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
        <ChevronLeft className="w-4 h-4" /> Retour aux Classes
      </button>
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-indigo-600 text-white"><School className="w-4 h-4" /></div>
        <div>
          <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Gestion des Salles Physiques</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Locaux et attribution par cycle d'enseignement</p>
        </div>
      </div>
    </div>
    <div className="p-8 rounded-2xl border text-center" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      <School className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
      <h3 className="text-sm font-extrabold mb-1" style={{ color: 'var(--text-primary)' }}>Gestion des Salles via l'Année Scolaire</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Les salles physiques sont configurées lors de la création d'une année scolaire. Accédez à l'onglet "Année Scolaire" pour gérer les salles d'études.</p>
    </div>
  </div>
);

const CreateYearPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Étape 1 : Infos Générales
  const [nom, setNom] = useState('2026–2027');
  const [debut, setDebut] = useState('07 Septembre 2026');
  const [fin, setFin] = useState('03 Juillet 2027');
  const [statut, setStatut] = useState<'PLANIFIEE' | 'EN_COURS'>('PLANIFIEE');
  const [targetEleves, setTargetEleves] = useState(0);

  // Étape 2 : Configuration des frais par portée / variation
  const [porteeType, setPorteeType] = useState<'general' | 'cycle' | 'option' | 'classe'>('general');
  const [selectedPorteeVal, setSelectedPorteeVal] = useState('Général (Tous)');
  const [tempLibelle, setTempLibelle] = useState('');
  const [tempMontant, setTempMontant] = useState(0);
  const [tempPriorite, setTempPriorite] = useState('Priorité 1 — Exigible à l\'inscription');
  const [currentFraisItems, setCurrentFraisItems] = useState<{ id: string; libelle: string; montant: number; priorite: string }[]>([]);
  const [configuredFraisGroups, setConfiguredFraisGroups] = useState<{ id: string; porteeType: string; porteeVal: string; fraisList: { id: string; libelle: string; montant: number; priorite: string }[] }[]>([]);

  // Étape 3 : Salles & Classes par Cycle
  const [selectedCycle, setSelectedCycle] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES'>('PRIMAIRE');
  const [selectedOption, setSelectedOption] = useState('TRONC_COMMUN');
  const [tempClassName, setTempClassName] = useState('');
  const [tempRoomCode, setTempRoomCode] = useState('');
  const [tempRoomCapacity, setTempRoomCapacity] = useState(40);
  const [configuredClassesAndRooms, setConfiguredClassesAndRooms] = useState<{ id: string; cycleCode: string; optionCode: string; nomClasse: string; codeSalle: string; capacite: number }[]>([]);

  // Étape 4 : Découpage Evaluation par Cycle
  const [selectedCycleDecoupage, setSelectedCycleDecoupage] = useState<'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_CTEB' | 'HUMANITES'>('PRIMAIRE');
  const [decoupageType, setDecoupageType] = useState<'TRIMESTRES_SIMPLE' | 'TRIMESTRES_DECOUPES' | 'SEMESTRES_DECOUPES'>('TRIMESTRES_SIMPLE');
  const [configuredDecoupages, setConfiguredDecoupages] = useState<Record<string, 'TRIMESTRES_SIMPLE' | 'TRIMESTRES_DECOUPES' | 'SEMESTRES_DECOUPES'>>({});

  // Devise du système
  const systemCurrency = useMemo(() => {
    try {
      const cfg = JSON.parse(localStorage.getItem('ecolisa_school_config') || '{}');
      return cfg.devise || cfg.currency || 'USD';
    } catch { return 'USD'; }
  }, []);

  // Étape 2 : Ajouter un frais à la portée courante
  const handleAddFraisItem = () => {
    if (!tempLibelle.trim()) return;
    setCurrentFraisItems(prev => [
      ...prev,
      { id: `fi-${Date.now()}`, libelle: tempLibelle.trim(), montant: tempMontant, priorite: tempPriorite }
    ]);
    setTempLibelle('');
    setTempMontant(0);
  };

  // Étape 2 : Enregistrer la configuration de frais pour cette portée
  const handleSaveFraisGroup = () => {
    if (currentFraisItems.length === 0) return;
    setConfiguredFraisGroups(prev => [
      ...prev,
      {
        id: `fg-${Date.now()}`,
        porteeType,
        porteeVal: selectedPorteeVal,
        fraisList: currentFraisItems
      }
    ]);
    setCurrentFraisItems([]);
    setSelectedPorteeVal('');
  };

  // Étape 3 : Ajouter une classe et sa salle au cycle courant
  const handleAddClassAndRoom = () => {
    if (!tempClassName.trim() || !tempRoomCode.trim()) return;
    setConfiguredClassesAndRooms(prev => [
      ...prev,
      {
        id: `cr-${Date.now()}`,
        cycleCode: selectedCycle,
        optionCode: selectedCycle === 'HUMANITES' ? selectedOption : 'TRONC_COMMUN',
        nomClasse: tempClassName.trim(),
        codeSalle: tempRoomCode.toUpperCase().trim(),
        capacite: tempRoomCapacity
      }
    ]);
    setTempClassName('');
    setTempRoomCode('');
  };

  // Étape 4 : Assigner le découpage au cycle sélectionné
  const handleSaveDecoupage = () => {
    setConfiguredDecoupages(prev => ({
      ...prev,
      [selectedCycleDecoupage]: decoupageType
    }));
  };

  // Étape 5 : Persistance générale dans la base de données
  const handleCreateYear = async () => {
    // 1. Extraire les frais généraux pour peupler les champs de base de l'année scolaire
    const generalGroup = configuredFraisGroups.find(g => g.porteeType === 'general');
    const getFraisAmount = (name: string): number => {
      const match = generalGroup?.fraisList.find(f => f.libelle.toLowerCase().includes(name.toLowerCase()));
      return match ? match.montant : 0;
    };

    // 2. Transformer configuredFraisGroups en FraisAnnexeConfig[]
    const fraisAnnexes: FraisAnnexeConfig[] = [];
    configuredFraisGroups.forEach(g => {
      g.fraisList.forEach(f => {
        fraisAnnexes.push({
          id: f.id,
          intitule: `${f.libelle} (${g.porteeVal})`,
          montant: f.montant,
          devise: systemCurrency === 'CDF' ? 'CDF' : 'USD',
          obligatoire: true,
          typeFrais: f.libelle.toLowerCase().includes('inscription') ? 'INSCRIPTION' :
                     f.libelle.toLowerCase().includes('connexion') ? 'CONNEXION' :
                     f.libelle.toLowerCase().includes('carte') ? 'CARTE' : 'AUTRE',
          priorite: f.priorite,
          portee: g.porteeVal
        });
      });
    });

    // 3. Transformer configuredClassesAndRooms en cycles et salles configs
    const activeCycleCodes = Array.from(new Set([
      ...Object.keys(configuredDecoupages),
      ...configuredClassesAndRooms.map(cr => cr.cycleCode)
    ]));

    const cycles: CycleConfig[] = activeCycleCodes.map(c => {
      const classesForCycle = configuredClassesAndRooms.filter(cr => cr.cycleCode === c);
      return {
        id: `cy-${c}`,
        code: c as any,
        nom: c === 'MATERNELLE' ? 'Cycle Maternelle' :
             c === 'PRIMAIRE' ? 'Cycle Primaire' :
             c === 'SECONDAIRE_CTEB' ? '7ème & 8ème CTEB' : 'Humanités',
        actif: true,
        classesCount: classesForCycle.length,
        sallesCount: new Set(classesForCycle.map(cr => cr.codeSalle)).size
      };
    });

    const salles: SalleConfig[] = configuredClassesAndRooms.map(cr => ({
      id: `sa-${cr.id}`,
      codeSalle: cr.codeSalle,
      nomSalle: `Local ${cr.codeSalle} - ${cr.nomClasse}`,
      capacite: cr.capacite,
      cycleCode: cr.cycleCode as any
    }));

    // 4. Générer les périodes basées sur le découpage configuré
    const periodes: { id: string; nom: string; debut: string; fin: string; type: 'PERIOD' | 'EXAM' }[] = [];
    Object.entries(configuredDecoupages).forEach(([c, type]) => {
      const cycleLabel = c === 'PRIMAIRE' ? 'Primaire' : 'Secondaire';
      if (type === 'TRIMESTRES_SIMPLE') {
        periodes.push(
          { id: `p-${c}-t1`, nom: `1er Trimestre (${cycleLabel})`, debut: 'Septembre', fin: 'Décembre', type: 'PERIOD' },
          { id: `p-${c}-t2`, nom: `2ème Trimestre (${cycleLabel})`, debut: 'Janvier', fin: 'Mars', type: 'PERIOD' },
          { id: `p-${c}-t3`, nom: `3ème Trimestre (${cycleLabel})`, debut: 'Avril', fin: 'Juillet', type: 'PERIOD' }
        );
      } else if (type === 'TRIMESTRES_DECOUPES') {
        periodes.push(
          { id: `p-${c}-t1p1`, nom: `T1 - 1ère Période (${cycleLabel})`, debut: 'Septembre', fin: 'Octobre', type: 'PERIOD' },
          { id: `p-${c}-t1p2`, nom: `T1 - 2ème Période (${cycleLabel})`, debut: 'Novembre', fin: 'Décembre', type: 'PERIOD' },
          { id: `p-${c}-t1ex`, nom: `T1 - Examens (${cycleLabel})`, debut: 'Décembre', fin: 'Décembre', type: 'EXAM' },
          { id: `p-${c}-t2p3`, nom: `T2 - 3ème Période (${cycleLabel})`, debut: 'Janvier', fin: 'Février', type: 'PERIOD' },
          { id: `p-${c}-t2p4`, nom: `T2 - 4ème Période (${cycleLabel})`, debut: 'Février', fin: 'Mars', type: 'PERIOD' },
          { id: `p-${c}-t2ex`, nom: `T2 - Examens (${cycleLabel})`, debut: 'Mars', fin: 'Mars', type: 'EXAM' },
          { id: `p-${c}-t3ex`, nom: `T3 - Examens & Jurys (${cycleLabel})`, debut: 'Juin', fin: 'Juillet', type: 'EXAM' }
        );
      } else {
        periodes.push(
          { id: `p-${c}-s1p1`, nom: `S1 - 1ère Période (${cycleLabel})`, debut: 'Septembre', fin: 'Novembre', type: 'PERIOD' },
          { id: `p-${c}-s1p2`, nom: `S1 - 2ème Période (${cycleLabel})`, debut: 'Novembre', fin: 'Janvier', type: 'PERIOD' },
          { id: `p-${c}-s1ex`, nom: `S1 - Examens Semestriels (${cycleLabel})`, debut: 'Janvier', fin: 'Janvier', type: 'EXAM' },
          { id: `p-${c}-s2p3`, nom: `S2 - 3ème Période (${cycleLabel})`, debut: 'Février', fin: 'Avril', type: 'PERIOD' },
          { id: `p-${c}-s2p4`, nom: `S2 - 4ème Période (${cycleLabel})`, debut: 'Avril', fin: 'Juin', type: 'PERIOD' },
          { id: `p-${c}-s2ex`, nom: `S2 - Examens Finaux (${cycleLabel})`, debut: 'Juin', fin: 'Juillet', type: 'EXAM' }
        );
      }
    });

    const newYear: AnneeScolaireConfig = {
      id: `ay-${Date.now()}`,
      nom,
      statut,
      debut,
      fin,
      nombreElevesTotal: 0,
      fraisInscription: getFraisAmount('inscription') || getFraisAmount('minerval') || 0,
      fraisConnexion: getFraisAmount('connexion') || getFraisAmount('système') || 0,
      fraisReinscription: getFraisAmount('réinscription') || 0,
      fraisCarte: getFraisAmount('carte') || getFraisAmount('badge') || 0,
      fraisAnnexes,
      cycles,
      salles,
      semestres: [],
      periodes
    };

    // Sauvegarder dans SQLite via IPC
    await LocalDatabaseService.addSchoolYear(newYear);

    await Promise.all(configuredClassesAndRooms.map(cr =>
      LocalDatabaseService.addClass({
        id: `cls-${cr.id}`,
        cycleId: cr.cycleCode,
        schoolYearId: newYear.id,
        nom: cr.nomClasse,
        salle: cr.codeSalle,
        nombreEleves: 0,
        professeurTitulaire: 'A affecter'
      } as any)
    ));

    onBack();
  };

  const steps = [
    { n: 1, label: 'Général & Dates', icon: Calendar },
    { n: 2, label: 'Frais & Tarification', icon: CreditCard },
    { n: 3, label: 'Cycles, Classes & Salles', icon: School },
    { n: 4, label: 'Découpage Pédagogique', icon: Layers },
    { n: 5, label: 'Validation Finale', icon: CheckCircle2 },
  ] as const;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Barre supérieure */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs hover:bg-slate-500/10 transition-all cursor-pointer" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
          <ChevronLeft className="w-4 h-4" /> Retour aux Années Scolaires
        </button>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-600 text-white"><Sparkles className="w-4 h-4 text-amber-300" /></div>
          <div>
            <h2 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>Créer une Nouvelle Année Scolaire</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configuration complète · Devise active : <span className="font-black text-indigo-600 dark:text-indigo-400">{systemCurrency}</span></p>
          </div>
        </div>
      </div>

      {/* Stepper horizontal */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {steps.map(s => {
          const SIcon = s.icon;
          const isActive = wizardStep === s.n;
          const isDone = wizardStep > s.n;
          return (
            <button key={s.n} onClick={() => setWizardStep(s.n as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive ? 'bg-indigo-600 text-white' : isDone ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
              }`}>
              <SIcon className="w-3.5 h-3.5" />
              <span>{s.n}. {s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenu principal de l'assistant */}
      <div className="p-6 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>

        {/* ÉTAPE 1 : Infos Générales & Dates */}
        {wizardStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Intitulé de l'Année Scolaire *</label>
                <input type="text" required value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: 2026–2027"
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Objectif Prévisionnel d'Élèves</label>
                <input type="number" value={targetEleves} onChange={e => setTargetEleves(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Date de Rentrée *</label>
                <input type="text" required value={debut} onChange={e => setDebut(e.target.value)} placeholder="07 Septembre 2026"
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div className="space-y-1.5">
                <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Date de Clôture *</label>
                <input type="text" required value={fin} onChange={e => setFin(e.target.value)} placeholder="03 Juillet 2027"
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>Statut Initial *</label>
              <CustomSelect
                options={[
                  { value: 'PLANIFIEE', label: 'PLANIFIÉE — Préparation administrative' },
                  { value: 'EN_COURS', label: 'EN COURS — Année active immédiatement' },
                ]}
                value={statut}
                onChange={val => setStatut(val as any)}
              />
            </div>
          </div>
        )}

        {/* ÉTAPE 2 : Configuration des frais par portée / variation */}
        {wizardStep === 2 && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Configuration Modulaire des Frais</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sélectionnez d'abord la portée (Cycle, Option...) pour laquelle vous souhaitez définir des frais, puis configurez-les un par un. Ajoutez ensuite cette configuration pour passer aux autres variations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Formulaire de saisie courante */}
              <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider">1. Portée de la Variation</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Type de Portée</label>
                    <CustomSelect
                      options={[
                        { value: 'general', label: 'Général (Tous)' },
                        { value: 'cycle', label: 'Cycle' },
                        { value: 'option', label: 'Option Spécifique' },
                      ]}
                      value={porteeType}
                      onChange={val => {
                        setPorteeType(val as any);
                        setSelectedPorteeVal(val === 'general' ? 'Général (Tous)' : '');
                      }}
                    />
                  </div>

                  {porteeType === 'cycle' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Choix du Cycle</label>
                      <CustomSelect
                        options={[
                          { value: 'Cycle Maternelle', label: 'Maternelle' },
                          { value: 'Cycle Primaire', label: 'Primaire' },
                          { value: 'Cycle CTEB (7e/8e)', label: 'CTEB (7e/8e)' },
                          { value: 'Cycle Humanités', label: 'Humanités' },
                        ]}
                        value={selectedPorteeVal}
                        onChange={setSelectedPorteeVal}
                      />
                    </div>
                  )}

                  {porteeType === 'option' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Choix de l'Option</label>
                      <CustomSelect
                        options={[
                          { value: 'Option Math-Physique', label: 'Math-Physique' },
                          { value: 'Option Biologie-Chimie', label: 'Biologie-Chimie' },
                          { value: 'Option Commerciale & Gestion', label: 'Commerciale & Gestion' },
                          { value: 'Option Pédagogie Générale', label: 'Pédagogie Générale' },
                        ]}
                        value={selectedPorteeVal}
                        onChange={setSelectedPorteeVal}
                      />
                    </div>
                  )}

                  {porteeType === 'general' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Valeur</label>
                      <input type="text" readOnly value="Général (Tous)" className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/10 font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider">2. Ajouter des frais pour cette portée</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Libellé du frais</label>
                      <input type="text" placeholder="ex: Frais d'inscription" value={tempLibelle} onChange={e => setTempLibelle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Montant ({systemCurrency})</label>
                      <input type="number" min={0} value={tempMontant} onChange={e => setTempMontant(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Priorité</label>
                    <CustomSelect
                      options={[
                        { value: 'Priorité 1 — Exigible à l\'inscription', label: 'Priorité 1 — Exigible à l\'inscription' },
                        { value: 'Priorité 2 — Exigible au 1er mois', label: 'Priorité 2 — Exigible au 1er mois' },
                        { value: 'Priorité 3 — Exigible ultérieurement', label: 'Priorité 3 — Exigible ultérieurement' },
                      ]}
                      value={tempPriorite}
                      onChange={setTempPriorite}
                    />
                  </div>

                  <button type="button" onClick={handleAddFraisItem} className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                    <Plus className="w-4 h-4" /> Ajouter ce frais à la liste temporaire
                  </button>
                </div>

                {/* Liste temporaire pour la portée en cours */}
                {currentFraisItems.length > 0 && (
                  <div className="p-3.5 rounded-lg border space-y-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                    <p className="text-xs font-black uppercase text-slate-500">Frais définis pour : {selectedPorteeVal}</p>
                    <div className="space-y-1">
                      {currentFraisItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs py-1">
                          <span className="font-bold text-slate-600 dark:text-slate-300">{item.libelle} ({item.priorite})</span>
                          <span className="font-black text-indigo-600 dark:text-indigo-400">{item.montant} {systemCurrency}</span>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={handleSaveFraisGroup} className="w-full py-2 mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                      <Check className="w-4 h-4" /> Valider & Enregistrer cette Portée
                    </button>
                  </div>
                )}
              </div>

              {/* Récapitulatif des configurations de frais enregistrées */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Configurations de Frais Enregistrées ({configuredFraisGroups.length})</h3>
                {configuredFraisGroups.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Aucune configuration de portée enregistrée pour l'instant.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {configuredFraisGroups.map(g => (
                      <div key={g.id} className="p-4 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                            PORTÉE : {g.porteeVal}
                          </span>
                          <button onClick={() => setConfiguredFraisGroups(prev => prev.filter(x => x.id !== g.id))} className="text-rose-500 hover:bg-rose-500/15 p-1 rounded-md cursor-pointer">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                          {g.fraisList.map(f => (
                            <div key={f.id} className="flex justify-between items-center py-1.5">
                              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{f.libelle}</span>
                              <span className="font-black text-indigo-600 dark:text-indigo-400">{f.montant} {systemCurrency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 3 : Configuration des cycles, classes et salles */}
        {wizardStep === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-start gap-3">
              <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Saisie Itérative des Classes & Salles Physiques</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sélectionnez un cycle (et une option si applicable), puis créez progressivement chaque classe physique avec sa salle d'études et sa capacité maximale.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Formulaire de configuration */}
              <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider">1. Cibler le Cycle</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Cycle d'Enseignement</label>
                    <CustomSelect
                      options={[
                        { value: 'MATERNELLE', label: 'Cycle Maternelle' },
                        { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                        { value: 'SECONDAIRE_CTEB', label: '7ème & 8ème CTEB' },
                        { value: 'HUMANITES', label: 'Secondaire / Humanités' },
                      ]}
                      value={selectedCycle}
                      onChange={val => setSelectedCycle(val as any)}
                    />
                  </div>

                  {selectedCycle === 'HUMANITES' ? (
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Option / Section</label>
                      <CustomSelect
                        options={[
                          { value: 'Math-Physique', label: 'Mathématique-Physique' },
                          { value: 'Biologie-Chimie', label: 'Biologie-Chimie' },
                          { value: 'Commerciale', label: 'Commerciale & Gestion' },
                          { value: 'Pédagogie', label: 'Pédagogie Générale' },
                          { value: 'Littéraire', label: 'Littéraire & Langues' },
                        ]}
                        value={selectedOption}
                        onChange={setSelectedOption}
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Option</label>
                      <input type="text" readOnly value="Tronc commun" className="w-full px-3 py-2 rounded-lg border text-xs bg-slate-500/10 font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase text-indigo-500 tracking-wider">2. Ajouter des classes et salles</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Nom de la Classe</label>
                      <input type="text" placeholder="ex: 5ème Primaire A ou 3ème Commerciale A" value={tempClassName} onChange={e => setTempClassName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Code de la Salle Physique</label>
                      <input type="text" placeholder="ex: Salle B-102" value={tempRoomCode} onChange={e => setTempRoomCode(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Capacité max élèves</label>
                      <input type="number" min={1} value={tempRoomCapacity} onChange={e => setTempRoomCapacity(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border font-black text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <button type="button" onClick={handleAddClassAndRoom} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                    <Plus className="w-4 h-4" /> Ajouter cette classe et salle physique
                  </button>
                </div>
              </div>

              {/* Récapitulatif des classes configurées */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Classes & Salles enregistrées ({configuredClassesAndRooms.length})</h3>
                {configuredClassesAndRooms.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Aucune salle ou classe configurée pour le moment.</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {configuredClassesAndRooms.map(cr => (
                      <div key={cr.id} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <div>
                          <p className="font-extrabold" style={{ color: 'var(--text-primary)' }}>{cr.nomClasse}</p>
                          <div className="flex gap-2 items-center text-[10.5px] mt-0.5 text-slate-500">
                            <span>Cycle: {cr.cycleCode}</span>
                            <span>· Salle: {cr.codeSalle} (max: {cr.capacite})</span>
                            {cr.optionCode !== 'TRONC_COMMUN' && <span className="text-indigo-500">· {cr.optionCode}</span>}
                          </div>
                        </div>
                        <button onClick={() => setConfiguredClassesAndRooms(prev => prev.filter(x => x.id !== cr.id))} className="text-rose-500 hover:bg-rose-500/15 p-1 rounded-md cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 4 : Découpage Pédagogique spécifique selon cycle */}
        {wizardStep === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 rounded-xl border bg-indigo-500/10 border-indigo-500/25 flex items-start gap-3">
              <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Découpage & Évaluations par Cycle (RDC EPST)</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Au Primaire en RDC, les élèves sont évalués par trimestres simples. Au Secondaire, 7e/8e EB et Humanités, chaque trimestre comprend des périodes d'interrogation et un examen périodique.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Formulaire */}
              <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="space-y-1">
                  <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>1. Sélectionnez le Cycle</label>
                  <CustomSelect
                    options={[
                      { value: 'MATERNELLE', label: 'Cycle Maternelle' },
                      { value: 'PRIMAIRE', label: 'Cycle Primaire' },
                      { value: 'SECONDAIRE_CTEB', label: '7ème & 8ème CTEB' },
                      { value: 'HUMANITES', label: 'Secondaire / Humanités' },
                    ]}
                    value={selectedCycleDecoupage}
                    onChange={val => {
                      setSelectedCycleDecoupage(val as any);
                      // Auto-select recommendations based on cycle
                      if (val === 'PRIMAIRE' || val === 'MATERNELLE') {
                        setDecoupageType('TRIMESTRES_SIMPLE');
                      } else {
                        setDecoupageType('TRIMESTRES_DECOUPES');
                      }
                    }}
                  />
                </div>

                <div className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <label className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>2. Modèle d'évaluation conseillé</label>
                  <div className="space-y-2">
                    {[
                      { val: 'TRIMESTRES_SIMPLE', label: 'Trimestres simples (Sans sous-périodes)', desc: '3 évaluations trimestrielles directes (Recommandé pour Primaire & Maternelle)' },
                      { val: 'TRIMESTRES_DECOUPES', label: 'Trimestres découpés en périodes', desc: 'Trimestre 1 & 2 divisés en 2 Périodes + Examens (Recommandé pour Secondaire & CTEB)' },
                      { val: 'SEMESTRES_DECOUPES', label: '2 Semestres découpés en périodes', desc: '2 grands semestres divisés chacun en 2 Périodes + Examens' },
                    ].map(o => (
                      <div key={o.val} onClick={() => setDecoupageType(o.val as any)}
                        className={`p-3 rounded-xl border cursor-pointer text-left transition-all ${decoupageType === o.val ? 'bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/30' : 'hover:bg-slate-500/5 opacity-80'}`}
                        style={decoupageType === o.val ? {} : { borderColor: 'var(--border)' }}>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{o.label}</p>
                        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">{o.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={handleSaveDecoupage} className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                  <Check className="w-4 h-4" /> Enregistrer le Découpage pour ce Cycle
                </button>
              </div>

              {/* Récapitulatif du découpage */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Configurations de découpage par cycle</h3>
                <div className="p-4 rounded-xl border divide-y divide-slate-200 dark:divide-slate-800 space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  {Object.entries(configuredDecoupages).map(([cycle, type]) => (
                    <div key={cycle} className="flex justify-between items-center py-2 text-xs">
                      <div>
                        <p className="font-extrabold" style={{ color: 'var(--text-primary)' }}>
                          {cycle === 'MATERNELLE' ? 'Maternelle' : cycle === 'PRIMAIRE' ? 'Primaire' : cycle === 'SECONDAIRE_CTEB' ? 'CTEB (7e/8e)' : 'Humanités'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {type === 'TRIMESTRES_SIMPLE' ? 'Trimestres simples' : type === 'TRIMESTRES_DECOUPES' ? 'Trimestres découpés en périodes' : 'Semestres découpés'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                        ACTIF
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 5 : Validation Finale & Persistance générale */}
        {wizardStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center py-4 space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Validation Générale & Création de l'Année Scolaire</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Toutes les configurations sont prêtes à être sauvegardées définitivement dans la base de données.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h4 className="font-extrabold uppercase text-indigo-500">Général & Dates</h4>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Libellé :</span> Année {nom}</p>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Période :</span> du {debut} au {fin}</p>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Objectif :</span> {targetEleves} élèves</p>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Statut initial :</span> {statut}</p>
              </div>

              <div className="p-4 rounded-xl border space-y-2 text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h4 className="font-extrabold uppercase text-indigo-500">Statistiques de Structure</h4>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Rubriques de frais configurées :</span> {configuredFraisGroups.reduce((acc, g) => acc + g.fraisList.length, 0)}</p>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Classes d'études configurées :</span> {configuredClassesAndRooms.length}</p>
                <p style={{ color: 'var(--text-primary)' }}><span className="font-bold">Salles physiques attribuées :</span> {new Set(configuredClassesAndRooms.map(cr => cr.codeSalle)).size}</p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <button type="button" onClick={handleCreateYear}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all border border-emerald-500/40">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>Créer & Enregistrer l'Année Scolaire</span>
              </button>
            </div>
          </div>
        )}

        {/* Boutons de navigation globale */}
        {wizardStep < 5 && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button type="button" onClick={() => wizardStep > 1 && setWizardStep(prev => (prev - 1) as any)} disabled={wizardStep === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg border font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-500/10 cursor-pointer transition-all"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <ChevronLeft className="w-4 h-4" /> Précédent
            </button>
            <button type="button" onClick={() => setWizardStep(prev => (prev + 1) as any)}
              className="flex items-center gap-1 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-sm">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


// ─── MAIN MANAGER ─────────────────────────────────────────────────────────

type CreationView = 'none' | 'register_student' | 'create_class' | 'manage_rooms' | 'create_subject' | 'create_year';

export const AcademicManager: React.FC<AcademicManagerProps> = ({ activeSubTab = 'students' }) => {
  const [localTab, setLocalTab] = useState(activeSubTab);
  const [creationView, setCreationView] = useState<CreationView>('none');

  React.useEffect(() => {
    setLocalTab(activeSubTab);
    setCreationView('none');
  }, [activeSubTab]);

  // ── FULL-PAGE CREATION VIEWS ──
  if (creationView === 'create_subject') {
    return <div className="p-4 sm:p-6 animate-fade-in"><CreateSubjectPage onBack={() => setCreationView('none')} /></div>;
  }
  if (creationView === 'create_year') {
    return <div className="p-4 sm:p-6 animate-fade-in"><CreateYearPage onBack={() => setCreationView('none')} /></div>;
  }
  if (creationView === 'create_class') {
    return <div className="p-4 sm:p-6 animate-fade-in"><CreateClassPage onBack={() => setCreationView('none')} /></div>;
  }
  if (creationView === 'manage_rooms') {
    return <div className="p-4 sm:p-6 animate-fade-in"><ManageRoomsPage onBack={() => setCreationView('none')} /></div>;
  }
  if (creationView === 'register_student') {
    // availableClasses sera chargé de façon async dans StudentRegistrationModal
    const classesList: { id: string; nom: string }[] = [];
    return (
      <div className="p-4 sm:p-6 animate-fade-in">
        <StudentRegistrationModal
          inline
          onClose={() => setCreationView('none')}
          onRegister={() => setCreationView('none')}
          availableClasses={classesList}
        />
      </div>
    );
  }

  const renderTab = () => {
    switch (localTab) {
      case 'students': return <StudentsTab onOpenRegisterStudent={() => setCreationView('register_student')} />;
      case 'classes':  return <ClassesTab onOpenCreateClass={() => setCreationView('create_class')} onOpenManageRooms={() => setCreationView('manage_rooms')} />;
      case 'subjects': return <SubjectsTab onOpenCreateSubject={() => setCreationView('create_subject')} />;
      case 'years':    return <SchoolYearsTab onOpenCreateYear={() => setCreationView('create_year')} />;
      case 'teachers': return <TeachersTab />;
      case 'schedule': return <ScheduleTab />;
      case 'grades':   return <GradesTab />;
      default:         return <StudentsTab onOpenRegisterStudent={() => setCreationView('register_student')} />;
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="animate-fade-in" key={localTab}>
        {renderTab()}
      </div>
    </div>
  );
};

