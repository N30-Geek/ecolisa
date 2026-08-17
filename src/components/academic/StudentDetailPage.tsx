import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Heart,
  BadgeAlert,
  ShieldCheck,
  ArrowLeft,
  FileText,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  BookOpen,
  DollarSign,
  Plus,
  Download,
  Calendar,
  Sparkles,
  QrCode,
  FileCheck,
  Check,
  X,
  Building2,
  FolderOpen,
  ZoomIn,
  Edit3,
  TrendingUp,
  Activity,
  FileSpreadsheet,
  Eye,
  Receipt
} from 'lucide-react';
import { Eleve, DocumentScolaire, FactureEleve, TransactionPaiement, Cote, TypeFraisScolaire } from '../../types';
import { RDCEleveCardTemplate } from './RDCEleveCardTemplate';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import { StudentDocumentsModal } from './StudentDocumentsModal';
import { PhotoLightboxModal } from '../common/PhotoLightboxModal';
import { ReceiptModal } from '../finance/ReceiptModal';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { getInvoiceTotal, getPaymentAmount, getStudentTotalDue, round2, getPaymentAllocationsSummary } from '../../utils/financeCalculations';
import { Pagination } from '../common/Pagination';
import { usePagination } from '../../hooks/usePagination';

interface StudentDetailPageProps {
  student: Eleve;
  onBack: () => void;
  onEdit?: (student: Eleve) => void;
}

export const StudentDetailPage: React.FC<StudentDetailPageProps> = ({
  student,
  onBack,
  onEdit,
}) => {
  const { config: schoolConfig, currency } = useSchoolConfig();
  const [activeLeftTab, setActiveLeftTab] = useState<'identity' | 'finance' | 'grades' | 'discipline'>('identity');
  const [cardFace, setCardFace] = useState<'front' | 'back'>('front');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showFullFileModal, setShowFullFileModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // État des données réelles chargées depuis SQLite
  const [documents, setDocuments] = useState<DocumentScolaire[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [cotes, setCotes] = useState<Cote[]>([]);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Modal de reçu interactif
  const [selectedPayment, setSelectedPayment] = useState<TransactionPaiement | null>(null);

  // Chargement des données réelles de l'élève depuis SQLite
  const loadStudentData = async () => {
    setLoadingData(true);
    try {
      const [docList, invList, payList, coteList, ftList] = await Promise.all([
        LocalDatabaseService.getStudentDocuments(student.id).catch(() => []),
        LocalDatabaseService.getInvoices().then(all => (all || []).filter(inv => inv.eleveId === student.id || inv.studentId === student.id || inv.studentId === student.registrationNumber)).catch(() => []),
        LocalDatabaseService.getPayments().then(all => (all || []).filter(p =>
          p.eleveId === student.id ||
          p.studentId === student.id ||
          p.studentId === student.registrationNumber ||
          p.registrationNumber === student.registrationNumber
        )).catch(() => []),
        LocalDatabaseService.getCotes({ eleveId: student.id }).catch(() => []),
        LocalDatabaseService.getFeeTypes().catch(() => []),
      ]);
      setDocuments(docList || []);
      setInvoices(invList || []);
      setPayments(payList || []);
      setCotes(coteList || []);
      setFeeTypes(ftList || []);
    } catch (err) {
      console.error('[StudentDetailPage] Erreur chargement :', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [student.id]);

  // Auto-refresh quand la fenêtre reprend le focus ou quand le reçu est fermé
  useEffect(() => {
    const onFocus = () => loadStudentData();
    const onVisibility = () => { if (document.visibilityState === 'visible') loadStudentData(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [student.id]);

  // Pagination
  const paymentsPagination = usePagination(payments, { defaultPageSize: 5 });
  const cotesPagination = usePagination(cotes, { defaultPageSize: 5 });
  const documentsPagination = usePagination(documents, { defaultPageSize: 5 });

  // Calcul réel du résumé financier (dédoublonné par frais/tranche)
  const financialSummary = useMemo(() => {
    const totalDue = getStudentTotalDue(invoices, currency);
    const totalPaid = payments.reduce((sum, p) => sum + getPaymentAmount(p, currency), 0);
    let net = round2(totalDue - totalPaid);
    const isCredit = net < -0.10;
    const balance = isCredit ? net : Math.max(0, net);
    const isSolvable = totalDue > 0.001 && net <= 0.10;
    return { totalDue, totalPaid, balance, isSolvable, isCredit };
  }, [invoices, payments, currency]);

  // Calcul réel des cotes et pourcentage
  const totalPointsObtained = useMemo(() => cotes.reduce((acc, c) => acc + (c.score || 0), 0), [cotes]);
  const totalPointsMax = useMemo(() => cotes.reduce((acc, c) => acc + (c.maxScore || 20), 0), [cotes]);
  const percentage = useMemo(() => totalPointsMax > 0 ? Math.round((totalPointsObtained / totalPointsMax) * 100) : 0, [totalPointsObtained, totalPointsMax]);

  const initials = `${(student.prenom?.[0] || '').toUpperCase()}${(student.nom?.[0] || '').toUpperCase()}`;

  return (
    <div className="space-y-6 animate-fade-in select-none pb-12">
      {/* ── BARRE SUPÉRIEURE DE BANNIÈRE HÉROS ── */}
      <div
        className="p-5 rounded-2xl border-0 shadow-md transition-all duration-300 space-y-5"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer shrink-0"
              title="Retour à la liste des élèves"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Retour</span>
            </button>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="flex items-center gap-4">
              <div
                className="relative group shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 border-indigo-500/30 hover:border-indigo-600 shadow-md transition-all active:scale-95"
                onClick={() => setShowPhotoModal(true)}
                title="Cliquer pour voir la photo en grand format HD"
              >
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt={student.prenom}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div
                    className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-white font-black text-xl group-hover:scale-105 transition-transform duration-300"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                  >
                    {initials}
                  </div>
                )}

                <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all duration-200">
                  <ZoomIn className="w-5 h-5 text-indigo-300 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest uppercase mt-0.5 text-indigo-100">Agrandir</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    {student.prenom} {student.nom} {student.postnom || ''}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {student.statut || 'ACTIF'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Matricule : <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.registrationNumber}</span> · Classe : <span className="font-bold text-slate-700 dark:text-slate-200">{student.nomClasse}</span>{student.salle ? <> · Salle : <span className="font-bold text-slate-700 dark:text-slate-200">{student.salle}</span></> : null}
                </p>
              </div>
            </div>
          </div>

          {/* Boutons d'Action Rapides Structurés */}
          <div className="flex flex-wrap items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(student)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-extrabold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer"
              >
                <Edit3 className="w-4 h-4 text-white" />
                <span>Éditer la Fiche</span>
              </button>
            )}

            <button
              onClick={() => setShowFullFileModal(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer border"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              <span>Dossier Complet (PDF/Word)</span>
            </button>

            <button
              onClick={() => setShowDocsModal(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
            >
              <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Pièces & Scans</span>
            </button>

            <button
              onClick={() => setShowCardModal(true)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer border"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <QrCode className="w-4 h-4 text-indigo-500" />
              <span>Carte QR</span>
            </button>
          </div>
        </div>

        {/* CARDS DE KPI SYNTHÈSE RAPIDE ÉLÈVE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Moyenne Générale</span>
              <Award className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {cotes.length > 0 ? `${percentage} %` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">{cotes.length} cote(s) enregistrée(s)</p>
          </div>

          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Statut Financier</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className={`text-xl font-black ${
              financialSummary.isCredit ? 'text-sky-600 dark:text-sky-400' :
              financialSummary.isSolvable ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
            }`}>
              {financialSummary.isCredit ? `-${formatCurrency(Math.abs(financialSummary.balance), currency)}` :
               financialSummary.isSolvable ? 'Solvable' : formatCurrency(financialSummary.balance, currency)}
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">{financialSummary.isCredit ? 'Crédit / Trop-perçu' : financialSummary.isSolvable ? 'Règlements à jour' : 'Solde restant dû'}</p>
          </div>

          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Taux de Présence</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">100 %</p>
            <p className="text-[10px] text-slate-400 font-semibold">Assiduité modèle</p>
          </div>

          <div className="p-3.5 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">Coffre-fort Pièces</span>
              <FolderOpen className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-xl font-black text-sky-600 dark:text-sky-400">{documents.length}</p>
            <p className="text-[10px] text-slate-400 font-semibold">Fichiers numérisés</p>
          </div>
        </div>
      </div>

      {/* ── DISPOSITION EN 2 COLONNES (SPLIT LAYOUT 7 / 5) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── COLONNE GAUCHE (7/12) : SUB-TABS ÉLÈVE, FINANCES, NOTES, MÉDICAL ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* BARRE DES SOUS-ONGLETS GAUCHE */}
          <div
            className="p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto sidebar-scroll shadow-xs"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            {[
              { id: 'identity', label: 'Identité, Dossier & Santé', icon: User },
              { id: 'finance', label: 'Finances & Frais', icon: DollarSign },
              { id: 'grades', label: 'Cotes & Matières', icon: Award },
              { id: 'discipline', label: 'Assiduité & Discipline', icon: ShieldCheck },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveLeftTab(t.id as any)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 cursor-pointer ${
                  activeLeftTab === t.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
                }`}
              >
                <t.icon className={`w-4 h-4 ${activeLeftTab === t.id ? 'text-white' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── SOUS-ONGLET 1 : IDENTITÉ, DOSSIER & SANTÉ ── */}
          {activeLeftTab === 'identity' && (
            <div
              className="p-6 rounded-2xl border-0 shadow-md space-y-6 animate-fade-in"
              style={{ background: 'var(--bg-surface)' }}
            >
              {/* En-tête du Cadre Master */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4 gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Fiche d'Identité, Origine & Profil Médical
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Registre national certifié EPST RDC · État civil, origine géographique et santé
                    </p>
                  </div>
                </div>

                <span className="text-[10.5px] font-bold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 self-start sm:self-auto shrink-0 border border-indigo-500/30">
                  Dossier Certifié EPST
                </span>
              </div>

              {/* SECTION 1 : ÉTAT CIVIL & IDENTITÉ OFFICIELLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <User className="w-4 h-4" /> 1. État Civil & Identité Officielle
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-slate-400">Section 01</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs p-4 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Nom (Patronyme) :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.nom}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Postnom :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.postnom || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Prénom :</span>
                    <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{student.prenom}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Sexe & Genre :</span>
                    <span className="font-black text-xs" style={{ color: 'var(--text-primary)' }}>{student.sexe === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Date de Naissance :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.dateNaissance || 'Non renseignée'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Lieu de Naissance :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.lieuNaissance || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Nationalité :</span>
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{student.nationalite || 'Congolaise (RDC)'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Statut Scolaire :</span>
                    <span className="font-black text-xs text-emerald-500">{student.statut}</span>
                  </div>
                </div>
              </div>

              {/* SÉPARATEUR DE SECTION */}
              <div className="border-t border-slate-100 dark:border-slate-800/60" />

              {/* SECTION 2 : ORIGINE GÉOGRAPHIQUE & DÉCOUPAGE EPST RDC */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> 2. Origine Géographique & Résidence
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-slate-400">Section 02</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs p-4 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Province de Résidence :</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{student.province || 'Kinshasa'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Province d'Origine :</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">{student.provinceOrigine || 'Kinshasa'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Territoire / Commune :</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{student.territoireCommune || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Chefferie / Secteur :</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{student.chefferieSecteur || 'Non renseigné'}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2 pt-1">
                    <span className="font-bold text-slate-400 block text-[11px] mb-1">Adresse Physique Précise :</span>
                    <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 p-2.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                      {student.adressePhysique || 'Non renseignée'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SÉPARATEUR DE SECTION */}
              <div className="border-t border-slate-100 dark:border-slate-800/60" />

              {/* SECTION 3 : PROFIL MÉDICAL & DOSSIER INFIRMERIE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> 3. Profil Médical & Fiche Santé
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    Infirmerie
                  </span>
                </div>

                <div className="p-4 rounded-xl space-y-3 border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5" /> Groupe Sanguin
                        </span>
                        <span className="font-black text-sm text-rose-600 dark:text-rose-400">{student.groupeSanguin || 'O+'}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                          <BadgeAlert className="w-3.5 h-3.5" /> Allergies Connues
                        </span>
                        <span className="font-extrabold text-xs text-amber-700 dark:text-amber-300">
                          {student.allergies || 'Aucune allergie majeure'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {student.informationsMedicales && (
                    <div className="p-3 rounded-lg border border-slate-200/50 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block text-[11px]">Antécédents Médicaux & Précautions :</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{student.informationsMedicales}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 4 : CONTACTS & TUTEURS */}
              <div className="border-t border-slate-100 dark:border-slate-800/60" />
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> 4. Contacts, Parents & Tuteurs
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                    <p className="font-black text-indigo-900 text-[11px]">Père</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.nomPere || 'Non renseigné'}</p>
                    {student.professionPere && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Profession: <strong>{student.professionPere}</strong></p>}
                    {student.telephonePere && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Tél: <strong className="font-mono text-indigo-700 dark:text-indigo-400">{student.telephonePere}</strong></p>}
                    {student.emailPere && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Email: <strong className="font-mono">{student.emailPere}</strong></p>}
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                    <p className="font-black text-pink-900 text-[11px]">Mère</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.nomMere || 'Non renseignée'}</p>
                    {student.professionMere && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Profession: <strong>{student.professionMere}</strong></p>}
                    {student.telephoneMere && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Tél: <strong className="font-mono text-pink-700 dark:text-pink-400">{student.telephoneMere}</strong></p>}
                    {student.emailMere && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Email: <strong className="font-mono">{student.emailMere}</strong></p>}
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
                    <p className="font-black text-amber-900 text-[11px]">Tuteur / Autre Contact</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.nomTuteur || 'Non renseigné'}</p>
                    {student.professionTuteur && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Profession: <strong>{student.professionTuteur}</strong></p>}
                    {student.telephoneTuteur && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Tél: <strong className="font-mono text-amber-700 dark:text-amber-400">{student.telephoneTuteur}</strong></p>}
                    {student.adresseTuteur && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Adresse: <strong>{student.adresseTuteur}</strong></p>}
                  </div>

                  <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 space-y-1.5 col-span-1 sm:col-span-2">
                    <p className="font-black text-rose-900 text-[11px]">Contact en Cas d'Urgence</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{student.nomReferentUrgence || 'Non renseigné'}</p>
                    {student.relationReferentUrgence && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Lien: <strong>{student.relationReferentUrgence}</strong></p>}
                    {student.telephoneReferentUrgence && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Tél: <strong className="font-mono text-rose-700 dark:text-rose-400">{student.telephoneReferentUrgence}</strong></p>}
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-1.5 col-span-1 sm:col-span-2">
                    <p className="font-black text-slate-900 text-[11px]">Contact de l'Élève</p>
                    {student.telephoneEleve && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Tél: <strong className="font-mono text-indigo-700 dark:text-indigo-400">{student.telephoneEleve}</strong></p>}
                    {student.emailEleve && <p className="text-slate-600 dark:text-slate-400 text-[11px]">Email: <strong className="font-mono">{student.emailEleve}</strong></p>}
                  </div>
                </div>
              </div>

              {/* SECTION 5 : DOSSIER COMPLÉMENTAIRE */}
              <div className="border-t border-slate-100 dark:border-slate-800/60" />
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" /> 5. Dossier Complémentaire & Options Scolaires
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs p-4 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">N° Acte de Naissance :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.numeroActeNaissance || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">École d'Origine :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.ecoleOrigine || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Religion :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                      {student.religion === 'AUTRE' ? (student.religionAutre || '—') : (student.religion || '—')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Langue Maternelle :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.langueMaternelle || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Langue d'Instruction :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.langueInstruction || student.langue || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Régime :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.regime || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Groupement / Village :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.groupement || '—'} / {student.village || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Handicap / Aptitudes :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{[student.handicap, student.aptitudes].filter(Boolean).join(' / ') || 'Aucun'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Vaccinations :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.vaccinations || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Médecin Traitant :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.medecinTraitant || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Assurance Santé :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.assuranceSante || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">N° Carte Santé :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.numeroCarteSante || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Transport Scolaire :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.transportScolaire || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Cantine / Internat :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                      {student.cantine ? 'Cantine ' : ''}{student.internat ? 'Internat ' : ''}{!student.cantine && !student.internat ? '—' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Boursier :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.boursier ? 'Oui' : 'Non'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-800/40">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Aide Sociale :</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{student.aideSociale ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
              </div>

              {/* SÉPARATEUR SI NOTES DISPONIBLES */}
              {student.description && (
                <>
                  <div className="border-t border-slate-100 dark:border-slate-800/60" />
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> 4. Observations & Notes Psychopédagogiques
                    </h4>
                    <div className="p-4 rounded-xl text-xs space-y-1 border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {student.description}
                      </p>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

          {/* ── SOUS-ONGLET 2 : SITUATION FINANCIÈRE & FRAIS SCOLAIRES ── */}
          {activeLeftTab === 'finance' && (
            <div className="space-y-6">
              {/* Carte Résumé Financier */}
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-5" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <DollarSign className="w-4.5 h-4.5" /> Compte & Frais Scolaires Élève
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Suivi en temps réel des règlements de minerval et frais annexes
                    </p>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-xs border ${
                    financialSummary.isSolvable
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}>
                    {financialSummary.isSolvable ? 'Élève Solvable' : 'Solde en Attente'}
                  </span>
                </div>

                {/* KPI Financiers */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Dû</span>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">{formatCurrency(financialSummary.totalDue, currency)}</p>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Payé</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(financialSummary.totalPaid, currency)}</p>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold uppercase text-rose-500">{financialSummary.isCredit ? 'Crédit' : 'Reste à Payer'}</span>
                    <p className={`text-lg font-black ${financialSummary.isCredit ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}>{formatCurrency(financialSummary.balance, currency)}</p>
                  </div>
                </div>

                {/* Historique des Reçus de Paiement */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Historique des Reçus de Paiements</h4>
                  {payments.length === 0 ? (
                    <p className="p-4 text-xs text-center text-slate-400 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                      Aucun reçu de paiement enregistré pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paymentsPagination.paginated.map((r, i) => {
                        const relatedInvoice = invoices.find(inv => inv.id === r.invoiceId);
                        const summaries = getPaymentAllocationsSummary(r, feeTypes, relatedInvoice);
                        const paymentLabel = summaries.length === 1
                          ? `${summaries[0].label}${summaries[0].isPartial ? ' (partiel)' : ''}`
                          : summaries
                              .slice(0, 2)
                              .map(s => `${s.label}${s.isPartial ? ' (partiel)' : ''}`)
                              .join(' + ') +
                            (summaries.length > 2 ? ` + ${summaries.length - 2} autre(s)` : '');

                        return (
                          <button
                            key={r.id || i}
                            type="button"
                            onClick={() => setSelectedPayment(r)}
                            className="w-full p-3 rounded-xl border flex items-center justify-between text-xs hover:bg-slate-500/5 active:scale-[0.99] transition-all cursor-pointer text-left group"
                            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">{r.numeroRecu || r.reference || `REC-${i + 1}`} · <span className="font-sans text-slate-500 dark:text-slate-400">{r.dateCreation}</span></p>
                              <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{paymentLabel}</p>
                              <p className="text-[10.5px] text-slate-400">Mode : {r.moyenPaiement || 'CASH'}</p>
                            </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{formatCurrency(getPaymentAmount(r, currency), currency)}</span>
                            <span
                              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              title="Voir le reçu"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </button>
                      )})}
                    </div>
                  )}
                  {payments.length > 0 && (
                    <Pagination
                      currentPage={paymentsPagination.page}
                      totalPages={paymentsPagination.totalPages}
                      total={paymentsPagination.total}
                      pageSize={paymentsPagination.pageSize}
                      start={paymentsPagination.start}
                      end={paymentsPagination.end}
                      onPageChange={paymentsPagination.setPage}
                      onPageSizeChange={paymentsPagination.setPageSize}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SOUS-ONGLET 3 : RELEVÉ DES COTES & NOTES PAR MATIÈRE ── */}
          {activeLeftTab === 'grades' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-5" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <Award className="w-4.5 h-4.5" /> Relevé des Cotes & Bulletin Pédagogique
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Pondération et bulletins selon les normes du Secrétariat Général EPST RDC
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-right shrink-0">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Moyenne Générale</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{percentage} % <span className="text-xs font-bold">({totalPointsObtained}/{totalPointsMax})</span></p>
                  </div>
                </div>

                {/* Tableau des Cotes */}
                {cotes.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <Award className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">Aucune cote ou note saisie pour l'élève pour le moment.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b uppercase text-[10px] font-bold text-slate-400" style={{ background: 'var(--bg-sunken)' }}>
                          <th className="p-3">Matière / Discipline</th>
                          <th className="p-3 text-center">Note / Maxima</th>
                          <th className="p-3 text-center">Période</th>
                          <th className="p-3 text-right">Appréciation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {cotesPagination.paginated.map((c, i) => (
                          <tr key={c.id || i} className="hover:bg-slate-500/5 transition-colors">
                            <td className="p-3">
                              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.titre || c.matiereId}</p>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.score} / {c.maxScore || 20}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{c.periode || 'P1'}</td>
                            <td className="p-3 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                {c.score >= (c.maxScore * 0.7) ? 'Satisfaisant' : 'À améliorer'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {cotes.length > 0 && (
                      <Pagination
                        currentPage={cotesPagination.page}
                        totalPages={cotesPagination.totalPages}
                        total={cotesPagination.total}
                        pageSize={cotesPagination.pageSize}
                        start={cotesPagination.start}
                        end={cotesPagination.end}
                        onPageChange={cotesPagination.setPage}
                        onPageSizeChange={cotesPagination.setPageSize}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SOUS-ONGLET 4 : ASSIDUITÉ & DISCIPLINE ── */}
          {activeLeftTab === 'discipline' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-4" style={{ background: 'var(--bg-surface)' }}>
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5" /> Assiduité & Registre de Présence
                </h3>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Taux de Présence</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">100 %</p>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Absences Justifiées</span>
                    <p className="text-xl font-black text-indigo-500">0 Jour</p>
                  </div>

                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Retards</span>
                    <p className="text-xl font-black text-amber-500">0 Retard</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── COLONNE DROITE (5/12) : CARTE D'ÉLÈVE LIVE, DOSSIERS SCOLAIRES & PARENTS ── */}
        <div className="lg:col-span-5 space-y-6">

          {/* 🎴 SECTION 1 HAUT DROITE : RENDU LIVE CARTE D'ÉLÈVE QR RECTO / VERSO */}
          <div
            className="p-5 rounded-2xl border-0 shadow-md space-y-4"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Carte d'Élève Officielle EPST
                </h3>
              </div>

              {/* Toggle Recto / Verso */}
              <div className="flex items-center gap-1 p-1 rounded-xl shadow-xs border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setCardFace('front')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    cardFace === 'front' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Recto
                </button>
                <button
                  onClick={() => setCardFace('back')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                    cardFace === 'back' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  Verso
                </button>
              </div>
            </div>

            {/* Rendu Live de la Carte HD Haute Lisibilité */}
            <div className="flex items-center justify-center p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner overflow-x-auto" style={{ background: 'var(--bg-sunken)' }}>
              <div className="transform scale-100 sm:scale-[1.02] origin-center transition-transform py-1">
                <RDCEleveCardTemplate
                  student={student}
                  schoolConfig={schoolConfig}
                  face={cardFace}
                />
              </div>
            </div>

            <button
              onClick={() => setShowCardModal(true)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Aperçu HD & Impression Carte QR</span>
            </button>
          </div>

          {/* 📂 SECTION 2 MILIEU DROITE : GESTION DES DOSSIERS & PIÈCES SCOLAIRES */}
          <div
            className="p-5 rounded-2xl border-0 shadow-md space-y-4"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Pièces & Documents Scolaires
                </h3>
              </div>
              <span className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400">
                {documents.length} Document(s)
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-center rounded-xl space-y-2 border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Aucun document scanné ou déposé pour cet élève.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documentsPagination.paginated.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{doc.originalName || doc.fileName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black shrink-0 bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      Déposé
                    </span>
                  </div>
                ))}
              </div>
            )}
            {documents.length > 0 && (
              <Pagination
                currentPage={documentsPagination.page}
                totalPages={documentsPagination.totalPages}
                total={documentsPagination.total}
                pageSize={documentsPagination.pageSize}
                start={documentsPagination.start}
                end={documentsPagination.end}
                onPageChange={documentsPagination.setPage}
                onPageSizeChange={documentsPagination.setPageSize}
              />
            )}

            <button
              onClick={() => setShowDocsModal(true)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer mt-3"
            >
              <FileCheck className="w-4 h-4 text-white" />
              <span>Gérer & Numériser les Pièces (Camera / PDF)</span>
            </button>
          </div>

        </div>

      </div>

      {/* MODALES CARTE & DOSSIER COMPLET & NUMÉRISATION */}
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
        onClose={() => {
          setShowDocsModal(false);
          loadStudentData(); // Recharger les documents en direct si modifiés
        }}
        student={student}
        mode="student"
      />

      {/* MODALE LIGHTBOX PHOTO ÉLÈVE EN GRAND */}
      <PhotoLightboxModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        photoUrl={student.photoUrl}
        title={`${student.prenom} ${student.nom} ${student.postnom || ''}`}
        subtitle={`Matricule : ${student.registrationNumber} · Classe : ${student.nomClasse}${student.salle ? ` · Salle : ${student.salle}` : ''}`}
        badge={student.statut}
      />
      {/* MODALE DE REÇU INTERACTIVE DEPUIS L'HISTORIQUE */}
      {selectedPayment && (
        <ReceiptModal
          isOpen={!!selectedPayment}
          onClose={() => { setSelectedPayment(null); loadStudentData(); }}
          payment={selectedPayment}
          invoice={invoices.find(inv => inv.id === selectedPayment.invoiceId)}
          feeTypes={feeTypes}
        />
      )}
    </div>
  );
};
