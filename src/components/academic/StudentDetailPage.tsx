import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  Award,
  BadgeAlert,
  Check,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  Archive,
  FolderOpen,
  Heart,
  Mail,
  MapPin,
  Phone,
  Printer,
  QrCode,
  RotateCw,
  School,
  ShieldCheck,
  User,
  Users,
  X,
  ZoomIn,
  Pencil,
} from 'lucide-react';
import { Eleve, FactureEleve, TransactionPaiement, DocumentScolaire, AnneeScolaireConfig } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { SchoolConfig } from '../onboarding/OnboardingWizard';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { convertCurrency, formatCurrency } from '../../utils/currency';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import { StudentDocumentsModal } from './StudentDocumentsModal';
import { StudentRegistrationModal } from './StudentRegistrationModal';
import { IdCardRenderer } from './IdCardRenderer';

const statusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIF:     { label: 'Actif',     cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' },
    TRANSFERE: { label: 'Transféré', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' },
    FINALISTE: { label: 'Finaliste', cls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' },
    EXCLU:     { label: 'Exclu',     cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' },
    NON_PAYE:  { label: 'Non Payé',  cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' },
    PARTIEL:   { label: 'Partiel',   cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' },
    PAYE:      { label: 'Payé',      cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' },
  };
  const s = map[statut] || { label: statut, cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30' };
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${s.cls}`}>{s.label}</span>;
};

const pillStyle = {
  background: 'var(--bg-sunken)',
  borderColor: 'var(--border)',
  color: 'var(--text-secondary)',
};

const cardStyle = {
  background: 'var(--bg-surface)',
  borderColor: 'var(--border)',
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 20px -6px rgba(15, 23, 42, 0.06)',
};

const formatBytes = (bytes = 0) => {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface StudentDetailPageProps {
  student: Eleve;
  onBack: () => void;
  onStudentUpdated?: (updated: Eleve) => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({ student, onBack, onStudentUpdated }) => {
  const { currency: displayCurrency, exchangeRate } = useSchoolConfig();
  const [tab, setTab] = useState<'identity' | 'grades' | 'attendance' | 'finance' | 'card'>('identity');
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardPreviewFace, setCardPreviewFace] = useState<'front' | 'back'>('front');
  const [showFullFileModal, setShowFullFileModal] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [schoolYears, setSchoolYears] = useState<AnneeScolaireConfig[]>([]);
  const [documents, setDocuments] = useState<DocumentScolaire[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [allInvoices, allPayments, config, years] = await Promise.all([
          LocalDatabaseService.getInvoices(),
          LocalDatabaseService.getPayments(),
          LocalDatabaseService.getConfig('school_config'),
          LocalDatabaseService.getSchoolYears(),
        ]);
        if (!mounted) return;
        const studentInvoices = allInvoices.filter(inv => inv.studentId === student.id);
        const studentPayments = allPayments.filter(p =>
          p.registrationNumber === student.registrationNumber ||
          studentInvoices.some(inv => inv.id === p.invoiceId)
        );
        setInvoices(studentInvoices);
        setPayments(studentPayments);
        setSchoolConfig(config);
        setSchoolYears(years);
      } catch (err) {
        console.error('[StudentDetailPage] Erreur chargement données :', err);
      } finally {
        if (mounted) setLoadingFinance(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [student.id, student.registrationNumber]);

  const loadStudentDocs = async () => {
    setLoadingDocs(true);
    try {
      const docs = await LocalDatabaseService.getStudentDocuments(student.id);
      setDocuments(docs);
    } catch (err) {
      console.error('[StudentDetailPage] Erreur chargement documents :', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadStudentDocs();
  }, [student.id]);

  const financeStats = useMemo(() => {
    const totalDue = invoices.reduce((sum, inv) => sum + convertCurrency(inv.montantTotal || 0, ((inv as any).devise || 'USD'), displayCurrency, exchangeRate), 0);
    const totalPaidOnInvoices = invoices.reduce((sum, inv) => sum + convertCurrency(inv.montantPaye || 0, ((inv as any).devise || 'USD'), displayCurrency, exchangeRate), 0);
    const totalPaidFromPayments = payments.reduce((sum, p) => sum + convertCurrency(p.montantPaye || 0, ((p as any).devise || 'USD'), displayCurrency, exchangeRate), 0);
    const totalPaid = Math.max(totalPaidOnInvoices, totalPaidFromPayments);
    const balance = Math.max(0, totalDue - totalPaid);
    const percent = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;
    return { totalDue, totalPaid, balance, percent };
  }, [invoices, payments, displayCurrency, exchangeRate]);

  const fmt = (n: number) => formatCurrency(n, displayCurrency, displayCurrency, exchangeRate);

  const allSettled = financeStats.totalDue > 0 && financeStats.balance <= 0;
  const hasFinanceData = financeStats.totalDue > 0 || payments.length > 0;
  const financeStatus = useMemo(() => {
    if (!hasFinanceData) return 'NON_PAYE';
    if (allSettled) return 'PAYE';
    if (financeStats.totalPaid > 0) return 'PARTIEL';
    return 'NON_PAYE';
  }, [hasFinanceData, allSettled, financeStats.totalPaid]);

  const initials = `${student.prenom[0] || ''}${student.nom[0] || ''}`;
  const schoolName = schoolConfig?.schoolName || 'Établissement Scolaire';
  const activeYear = useMemo(() => schoolYears.find(y => y.id === student.schoolYearId)?.nom || '—', [schoolYears, student.schoolYearId]);

  const Photo = ({ size = 'md', onClick, clickable = true }: { size?: 'sm' | 'md' | 'lg'; onClick?: () => void; clickable?: boolean }) => {
    const dims = size === 'lg' ? 'w-24 h-24' : size === 'md' ? 'w-20 h-20' : 'w-9 h-9';
    const textSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-xs';
    const ring = clickable ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500/40' : '';
    if (student.photoUrl) {
      return (
        <div className={`relative shrink-0 ${dims} ${ring} rounded-2xl overflow-hidden transition-all`} onClick={onClick}>
          <img
            src={student.photoUrl}
            alt={`${student.prenom} ${student.nom}`}
            className={`${dims} object-cover border-2 border-slate-200 dark:border-slate-700 rounded-2xl`}
          />
          {clickable && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20 transition-opacity rounded-2xl">
              <ZoomIn className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
      );
    }
    return (
      <div
        onClick={onClick}
        className={`${dims} rounded-2xl flex items-center justify-center text-white ${textSize} font-black shrink-0 transition-all ${ring}`}
        style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
      >
        {initials}
      </div>
    );
  };

  const DetailRow = ({ label, value, accent = false }: { label: string; value: React.ReactNode; accent?: boolean }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-700/50">
      <span className="font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">{label}</span>
      <span className={`font-black text-sm ${accent ? 'text-indigo-600 dark:text-indigo-400' : ''}`} style={{ color: accent ? undefined : 'var(--text-primary)' }}>
        {value || '—'}
      </span>
    </div>
  );

  if (showEditStudent) {
    return (
      <StudentRegistrationModal
        initialStudent={student}
        onBack={() => setShowEditStudent(false)}
        onUpdate={(updated) => {
          setShowEditStudent(false);
          onStudentUpdated?.(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRE SUPÉRIEURE AVEC BOUTON RETOUR & ACTIONS */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border transition-colors"
        style={cardStyle}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40"
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
            onClick={() => setShowEditStudent(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/40"
          >
            <Pencil className="w-4 h-4 text-white" /> Modifier Dossier Élève
          </button>
          <button
            onClick={() => setShowFullFileModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40"
          >
            <FileText className="w-4 h-4 text-white" /> Exporter Dossier Complet
          </button>
          <button
            onClick={() => setShowCardModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/40 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-white" /> Carte Élève QR
          </button>
        </div>
      </div>

      {/* CARTE D'ENTÊTE PROFIL ÉLÈVE */}
      <div
        className="p-5 rounded-2xl border relative overflow-hidden transition-colors"
        style={cardStyle}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Photo size="lg" onClick={() => setShowPhoto(true)} />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {student.prenom} {student.nom} {student.postnom}
                </h1>
                {statusBadge(student.statut)}
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Classe: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{student.nomClasse}</span>
                {' · '}
                Sexe: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{student.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
              </p>
              <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                <span className="font-mono text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                  Matricule EPST: {student.registrationNumber}
                </span>
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md border" style={pillStyle}>
                  Né(e) le {student.dateNaissance} ({student.lieuNaissance})
                </span>
              </div>
            </div>
          </div>

          {/* BADGES CÔTÉ DROIT : SITUATION FINANCIÈRE RÉELLE */}
          <div className="flex items-stretch gap-3 flex-wrap sm:flex-nowrap shrink-0 w-full lg:w-auto">
            <div
              className={`flex-1 lg:flex-none flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${
                hasFinanceData
                  ? allSettled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-slate-500/10 border-slate-500/20'
              }`}
            >
              <div className={`p-2 rounded-lg text-white shrink-0 flex items-center justify-center ${hasFinanceData ? (allSettled ? 'bg-emerald-600' : 'bg-amber-500') : 'bg-slate-500'}`}>
                <CreditCard className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="space-y-0.5">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${hasFinanceData ? (allSettled ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300') : 'text-slate-600 dark:text-slate-300'}`}>
                  Situation Financière
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {hasFinanceData ? `${fmt(financeStats.totalPaid)} / ${fmt(financeStats.totalDue)}` : 'Aucune facture'}
                  </span>
                  {hasFinanceData && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black text-white ${allSettled ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                      {financeStats.percent}%{allSettled ? ' SOLDÉ' : ''}
                    </span>
                  )}
                  {statusBadge(financeStatus)}
                </div>
              </div>
            </div>

            <div
              className={`flex-1 lg:flex-none flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${
                hasFinanceData && financeStats.balance > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
              }`}
            >
              <div className="text-right space-y-0.5">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${hasFinanceData && financeStats.balance > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                  Solde Restant dû
                </p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {hasFinanceData ? fmt(financeStats.balance) : '—'}
                </p>
                <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  {hasFinanceData ? (financeStats.balance === 0 ? 'Compte à jour' : `${payments.length} paiement${payments.length > 1 ? 's' : ''} reçu${payments.length > 1 ? 's' : ''}`) : 'Aucune donnée financière'}
                </p>
              </div>
              <div className={`p-2 rounded-lg text-white shrink-0 flex items-center justify-center ${hasFinanceData && financeStats.balance > 0 ? 'bg-rose-500' : 'bg-emerald-600'}`}>
                <Check className="w-4.5 h-4.5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GRILLE PRINCIPALE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none">

        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

          {/* BARRE D'ONGLETS */}
          <div
            className="flex items-center gap-2 p-1.5 rounded-2xl border shadow-sm overflow-x-auto sidebar-scroll"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
          >
            {[
              { id: 'identity', label: 'Identité & Origine RDC', icon: User },
              { id: 'grades', label: 'Cotes & Performance', icon: ClipboardListIcon },
              { id: 'attendance', label: 'Assiduité & Présences', icon: Clock },
              { id: 'finance', label: 'Finance & Paiements', icon: CreditCard },
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
                      : 'text-slate-500 dark:text-slate-400 hover:text-white hover:bg-slate-500/10'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* CONTENU VARIABLE */}
          <div
            className="p-6 rounded-3xl border"
            style={cardStyle}
          >

            {/* 1. IDENTITÉ, ORIGINE RDC & SANTÉ */}
            {tab === 'identity' && (
              <div className="space-y-8 animate-fade-in">
                {/* FICHE MÉDICALE */}
                <div className="space-y-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20 font-black">
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
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">
                        Groupe {student.groupeSanguin || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3 text-xs">
                    <div className="space-y-1 py-2">
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black uppercase tracking-wider">
                        <BadgeAlert className="w-3.5 h-3.5" /> Allergies Connues
                      </div>
                      <p className="text-sm font-black text-rose-700 dark:text-rose-300">
                        {student.allergies || 'Aucune allergie signalée'}
                      </p>
                    </div>

                    <div className="space-y-1 py-2">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5" /> Antécédents & Aptitude
                      </div>
                      <p className="text-sm font-extrabold text-amber-800 dark:text-amber-200">
                        {student.informationsMedicales || 'Non renseigné'}
                      </p>
                    </div>

                    <div className="space-y-1 py-2">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider">
                        <Phone className="w-3.5 h-3.5" /> Téléphone Urgence
                      </div>
                      <p className="text-sm font-mono font-black text-indigo-700 dark:text-indigo-300">
                        {student.telephoneParent || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ÉTAT CIVIL */}
                <div className="py-4 space-y-6 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <User className="w-4.5 h-4.5" /> Fiche Officielle d'État Civil & Naissance
                    </h3>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-500">
                      Dossier Certifié
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-xs">
                    <DetailRow label="Nom (Patronyme)" value={student.nom} />
                    <DetailRow label="Postnom" value={student.postnom} />
                    <DetailRow label="Prénom" value={student.prenom} accent />
                    <DetailRow label="Sexe & Genre" value={student.sexe === 'M' ? 'Masculin (M)' : 'Féminin (F)'} />
                    <DetailRow label="Date de Naissance" value={student.dateNaissance} />
                    <DetailRow label="Lieu de Naissance" value={student.lieuNaissance} />
                    <DetailRow label="Nationalité" value={student.nationalite} accent />
                    <DetailRow label="Statut Scolaire" value={statusBadge(student.statut)} />
                  </div>
                </div>

                {/* ORIGINE GÉOGRAPHIQUE */}
                <div className="py-4 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5" /> Origine Géographique & Découpage Territorial EPST RDC
                    </h3>
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-500">
                      26 Provinces RDC
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-xs">
                    <DetailRow label="Province Actuelle (Résidence)" value={student.province} accent />
                    <DetailRow label="Province d'Origine" value={student.provinceOrigine} accent />
                    <DetailRow label="Territoire / Commune" value={student.territoireCommune} />
                    <DetailRow label="Chefferie / Secteur" value={student.chefferieSecteur} />
                    <DetailRow label="Groupement" value={student.groupement} />
                    <DetailRow label="Village" value={student.village} />
                  </div>

                  <div className="space-y-1 py-2 border-t border-slate-100 dark:border-slate-700/50">
                    <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adresse Physique de Résidence Exacte</p>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{student.adressePhysique || '—'}</p>
                  </div>
                </div>

                {student.notesPsychopedagogiques && (
                  <div className="p-5 rounded-3xl border bg-indigo-500/10 border-indigo-500/20 space-y-2" style={{ boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 6px 20px -6px rgba(15, 23, 42, 0.04)' }}>
                    <p className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      Observations & Diagnostic Psychopédagogique
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
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <Award className="w-4 h-4" /> Relevé des Cotes & Notes
                  </h3>
                  <span className="text-xs font-black text-slate-500 dark:text-slate-400">Aucune cote enregistrée</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border p-6 text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Aucune cote enregistrée</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Saisissez les notes dans le module Cotes & Bulletins pour obtenir la moyenne réelle.</p>
                </div>
              </div>
            )}

            {/* 3. ASSIDUITÉ */}
            {tab === 'attendance' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Registre de Présences & Bilan Disciplinaire
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-500/20" style={{ boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 6px 20px -6px rgba(15, 23, 42, 0.04)' }}>
                    <p className="text-3xl font-black text-emerald-500">0</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Jours de Présence</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-amber-500/10 border-amber-500/20" style={{ boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 6px 20px -6px rgba(15, 23, 42, 0.04)' }}>
                    <p className="text-3xl font-black text-amber-500">0</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Absences Justifiées</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-rose-500/10 border-rose-500/20" style={{ boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 6px 20px -6px rgba(15, 23, 42, 0.04)' }}>
                    <p className="text-3xl font-black text-rose-500">0</p>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Absence Injustifiée</p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FINANCE & PAIEMENTS */}
            {tab === 'finance' && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border" style={cardStyle}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total dû</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                      {loadingFinance ? '…' : fmt(financeStats.totalDue)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border" style={cardStyle}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total payé</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {loadingFinance ? '…' : fmt(financeStats.totalPaid)}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border" style={cardStyle}>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Reste à payer</p>
                    <p className={`text-xl font-black mt-1 ${financeStats.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {loadingFinance ? '…' : fmt(financeStats.balance)}
                    </p>
                  </div>
                </div>

                {loadingFinance ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Chargement des données financières…</p>
                  </div>
                ) : hasFinanceData ? (
                  <>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-500 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Factures de Scolarité
                      </h4>
                      <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                              <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400">N° Facture</th>
                              <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400">Année</th>
                              <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400 text-right">Montant</th>
                              <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400 text-right">Payé</th>
                              <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400 text-center">Statut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                            {invoices.map(inv => (
                              <tr key={inv.id} className="hover:bg-slate-500/5 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{inv.numeroFacture}</td>
                                <td className="py-3 px-4">{inv.anneeScolaire}</td>
                                <td className="py-3 px-4 text-right font-black">{formatCurrency(inv.montantTotal, displayCurrency, ((inv as any).devise || 'USD'), exchangeRate)}</td>
                                <td className="py-3 px-4 text-right font-black">{formatCurrency(inv.montantPaye || 0, displayCurrency, ((inv as any).devise || 'USD'), exchangeRate)}</td>
                                <td className="py-3 px-4 text-center">{statusBadge(inv.statut)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {payments.length > 0 && (
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Paiements Reçus
                        </h4>
                        <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                                <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400">Date</th>
                                <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400">Mode</th>
                                <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400">Référence</th>
                                <th className="py-3 px-4 font-black text-slate-500 dark:text-slate-400 text-right">Montant</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                              {payments.map(p => (
                                <tr key={p.id} className="hover:bg-slate-500/5 transition-colors">
                                  <td className="py-3 px-4">{p.dateCreation}</td>
                                  <td className="py-3 px-4">{p.moyenPaiement}</td>
                                  <td className="py-3 px-4 font-mono">{p.reference}</td>
                                  <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(p.montantPaye, displayCurrency, ((p as any).devise || 'USD'), exchangeRate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-8 text-center rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucune facture ni paiement enregistré</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Les données financières s'afficheront ici dès qu'une facture sera créée.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* COLONNE DROITE */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">

          {/* CARTE QR */}
          <div
            className="p-5 rounded-3xl border space-y-4 relative overflow-hidden"
            style={cardStyle}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-500" /> Carte d'Élève Officielle
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                {activeYear}
              </span>
            </div>

            <div className="rounded-2xl border overflow-hidden relative flex items-center justify-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)', height: '280px' }}>
              <div
                className="flex items-center justify-center transition-transform"
                style={{ transform: `scale(${schoolConfig?.cardCustomization?.cardLayout === 'landscape' ? 0.48 : 0.52})` }}
              >
                <IdCardRenderer student={student} schoolConfig={schoolConfig} face={cardPreviewFace} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <button
                onClick={() => setCardPreviewFace('front')}
                className={`px-2.5 py-1.5 text-[10px] font-black flex items-center gap-1.5 transition-all ${cardPreviewFace === 'front' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}
              >
                <Eye className="w-3.5 h-3.5" /> Recto
              </button>
              <button
                onClick={() => setCardPreviewFace('back')}
                className={`px-2.5 py-1.5 text-[10px] font-black flex items-center gap-1.5 transition-all ${cardPreviewFace === 'back' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}
              >
                <RotateCw className="w-3.5 h-3.5" /> Verso
              </button>
              </div>
              <button
                onClick={() => setShowCardModal(true)}
                className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-400/40"
              >
                <Printer className="w-4 h-4 text-white" /> Aperçu plein écran / PDF / PNG
              </button>
            </div>
          </div>

          {/* DOCUMENTS */}
          <div className="p-5 rounded-3xl border space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Dossier Documents Scolaires
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                {documents.length} fichier{documents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {documents.length === 0 && !loadingDocs && (
              <div className="p-8 text-center rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <FileCheck className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucun document scolaire numérisé</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Joignez ici l'acte de naissance, les bulletins et les pièces justificatives.</p>
              </div>
            )}

            {loadingDocs && (
              <div className="p-6 text-center rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chargement des documents...</p>
              </div>
            )}

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.slice(0, 3).map(doc => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {doc.isArchive ? (
                      <Archive className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text-primary)' }} title={doc.originalName}>{doc.originalName}</p>
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {formatBytes(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
                {documents.length > 3 && (
                  <p className="text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    + {documents.length - 3} autre{documents.length - 3 !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={() => setShowDocsModal(true)}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              {documents.length === 0 ? 'Ajouter un document' : 'Gérer le dossier'}
            </button>
          </div>

          {/* PARENTS */}
          <div className="p-6 rounded-3xl border space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-500" /> Tuteurs Légaux & Contacts Famille
              </h3>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Communication Directe
              </span>
            </div>

            <div className="space-y-5 divide-y divide-slate-200/50 dark:divide-slate-800">
              {/* PÈRE */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {student.nomPere || student.nomParent || '—'}
                      </h4>
                      <p className="text-xs font-extrabold text-indigo-500">Père / Tuteur Principal Légal</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                    {student.professionPere || '—'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-1">
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" /> WhatsApp / Tél :
                    </span>
                    <a href={`tel:${student.telephonePere || student.telephoneParent}`} className="font-mono font-black text-indigo-600 dark:text-indigo-400 hover:underline text-xs">
                      {student.telephonePere || student.telephoneParent || '—'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Direct :
                    </span>
                    <a href={`mailto:${student.emailPere || student.emailParent}`} className="font-mono font-black text-indigo-600 dark:text-indigo-400 hover:underline text-xs">
                      {student.emailPere || student.emailParent || '—'}
                    </a>
                  </div>
                </div>
              </div>

              {/* MÈRE */}
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-pink-600 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
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
                      {student.telephoneMere || '—'}
                    </a>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl hover:bg-slate-500/5 transition-all">
                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-pink-500" /> Email Direct :
                    </span>
                    <a href={`mailto:${student.emailMere}`} className="font-mono font-black text-pink-500 hover:underline text-xs">
                      {student.emailMere || '—'}
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
                  {student.adressePhysique || '—'}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showPhoto && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowPhoto(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button
              onClick={() => setShowPhoto(false)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={`${student.prenom} ${student.nom}`}
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <div
                className="w-64 h-64 rounded-3xl flex items-center justify-center text-white text-6xl font-black"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
              >
                {initials}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

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

      <StudentDocumentsModal
        isOpen={showDocsModal}
        onClose={() => { setShowDocsModal(false); loadStudentDocs(); }}
        student={student}
      />
    </div>
  );
};

// Icône ClipboardList n'est pas importée par nom condensé dans certains bundles
const ClipboardListIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);
