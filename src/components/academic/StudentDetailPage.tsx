import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Users,
  Phone,
  Mail,
  MapPin,
  Heart,
  BadgeAlert,
  ShieldCheck,
  ArrowLeft,
  FileText,
  Printer,
  Eye,
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
  FileSpreadsheet,
  BadgeCheck,
  FolderOpen
} from 'lucide-react';
import { Eleve, ClasseScolaire, DocumentScolaire, FactureEleve, TransactionPaiement, Cote } from '../../types';
import { IdCardRenderer } from './IdCardRenderer';
import { StudentIdCardModal } from './StudentIdCardModal';
import { StudentFullFileModal } from './StudentFullFileModal';
import { StudentDocumentsModal } from './StudentDocumentsModal';
import { LocalDatabaseService } from '../../services/localDatabase';
import { formatCurrency } from '../../utils/currency';

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
  const [activeLeftTab, setActiveLeftTab] = useState<'identity' | 'finance' | 'grades' | 'medical' | 'discipline'>('identity');
  const [cardFace, setCardFace] = useState<'front' | 'back'>('front');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showFullFileModal, setShowFullFileModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);

  // État des données réelles chargées depuis SQLite
  const [documents, setDocuments] = useState<DocumentScolaire[]>([]);
  const [invoices, setInvoices] = useState<FactureEleve[]>([]);
  const [payments, setPayments] = useState<TransactionPaiement[]>([]);
  const [cotes, setCotes] = useState<Cote[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Chargement des données réelles de l'élève depuis SQLite
  const loadStudentData = async () => {
    setLoadingData(true);
    try {
      const [docList, invList, payList, coteList] = await Promise.all([
        LocalDatabaseService.getStudentDocuments(student.id).catch(() => []),
        LocalDatabaseService.getInvoices().then(all => (all || []).filter(inv => inv.studentId === student.id || inv.eleveId === student.id)).catch(() => []),
        LocalDatabaseService.getPayments().then(all => (all || []).filter(p => p.registrationNumber === student.registrationNumber || p.nomEleve.toLowerCase().includes(student.nom.toLowerCase()))).catch(() => []),
        LocalDatabaseService.getCotes({ eleveId: student.id }).catch(() => []),
      ]);
      setDocuments(docList || []);
      setInvoices(invList || []);
      setPayments(payList || []);
      setCotes(coteList || []);
    } catch (err) {
      console.error('[StudentDetailPage] Erreur chargement :', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [student.id]);

  // Calcul réel du résumé financier
  const financialSummary = useMemo(() => {
    const totalDue = invoices.reduce((sum, inv) => sum + (inv.montantTotal || 0), 0);
    const totalPaid = payments.reduce((sum, p) => sum + (p.montantPaye || 0), 0);
    const balance = Math.max(0, totalDue - totalPaid);
    const isSolvable = totalDue > 0 ? balance <= 0 : true;
    return { totalDue, totalPaid, balance, isSolvable };
  }, [invoices, payments]);

  // Calcul réel des cotes et pourcentage
  const totalPointsObtained = useMemo(() => cotes.reduce((acc, c) => acc + (c.score || 0), 0), [cotes]);
  const totalPointsMax = useMemo(() => cotes.reduce((acc, c) => acc + (c.maxScore || 20), 0), [cotes]);
  const percentage = useMemo(() => totalPointsMax > 0 ? Math.round((totalPointsObtained / totalPointsMax) * 100) : 0, [totalPointsObtained, totalPointsMax]);

  return (
    <div className="space-y-6 animate-fade-in select-none">
      {/* ── BARRE DE NAVIGATION & ACTION HEADER ── */}
      <div
        className="p-4 rounded-2xl border-0 shadow-lg shadow-indigo-500/5 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Retour à la Liste</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {student.prenom} {student.nom} {student.postnom}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                {student.statut}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Matricule : <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{student.registrationNumber}</span> · Classe : <span className="font-bold text-slate-700 dark:text-slate-200">{student.nomClasse}</span>
            </p>
          </div>
        </div>

        {/* Boutons d'Action Rapides */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowCardModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
          >
            <QrCode className="w-4 h-4 text-indigo-500 icon-animated" />
            <span>Carte QR</span>
          </button>

          <button
            onClick={() => setShowDocsModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
          >
            <FileCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 icon-animated" />
            <span>Gestion du Dossier & Scans</span>
          </button>

          <button
            onClick={() => setShowFullFileModal(true)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--bg-sunken)', color: 'var(--text-primary)' }}
          >
            <FileText className="w-4 h-4 text-indigo-500 icon-animated" />
            <span>Dossier PDF</span>
          </button>

          <button
            onClick={() => setShowCardModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/25 flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-white" />
            <span>Bulletin Trimestriel</span>
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(student)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow-md active:scale-[0.97] transition-all duration-200 cursor-pointer bg-amber-500/15 text-amber-700 dark:text-amber-300"
            >
              <span>Éditer la Fiche</span>
            </button>
          )}
        </div>
      </div>

      {/* ── DISPOSITION EN 2 COLONNES (SPLIT LAYOUT 7 / 5) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── COLONNE GAUCHE (7/12) : SUB-TABS ÉLÈVE, FINANCES, NOTES, MÉDICAL ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* BARRE DES SOUS-ONGLETS GAUCHE */}
          <div
            className="p-1.5 rounded-2xl border-0 shadow-md flex items-center gap-1.5 overflow-x-auto sidebar-scroll"
            style={{ background: 'var(--bg-surface)' }}
          >
            {[
              { id: 'identity', label: 'Identité & État Civil', icon: User },
              { id: 'finance', label: 'Finances & Frais', icon: DollarSign },
              { id: 'grades', label: 'Cotes & Matières', icon: Award },
              { id: 'medical', label: 'Fiche Médicale', icon: Heart },
              { id: 'discipline', label: 'Assiduité', icon: ShieldCheck },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveLeftTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-200 shrink-0 cursor-pointer ${
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

          {/* ── SOUS-ONGLET 1 : IDENTITÉ & ÉTAT CIVIL ── */}
          {activeLeftTab === 'identity' && (
            <div className="space-y-6">
              {/* Carte État Civil */}
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-4" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <User className="w-4.5 h-4.5" /> Fiche Officielle d'État Civil
                  </h3>
                  <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                    Certifié Établissement
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Nom (Patronyme) :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.nom}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Postnom :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.postnom || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Prénom :</span>
                    <span className="font-black text-sm text-indigo-500">{student.prenom}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Sexe & Genre :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.sexe === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Date de Naissance :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.dateNaissance || 'Non renseignée'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Lieu de Naissance :</span>
                    <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{student.lieuNaissance || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Nationalité :</span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{student.nationalite || 'Congolaise (RDC)'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Statut Scolaire :</span>
                    <span className="font-black text-sm text-emerald-500">{student.statut}</span>
                  </div>
                </div>
              </div>

              {/* Carte Origine Géographique RDC */}
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-4" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <MapPin className="w-4.5 h-4.5" /> Origine Géographique & Découpage EPST RDC
                  </h3>
                  <span className="text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                    26 Provinces
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Province de Résidence :</span>
                    <span className="font-black text-indigo-500">{student.province || 'Non spécifiée'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Province d'Origine :</span>
                    <span className="font-black text-indigo-500">{student.provinceOrigine || 'Non spécifiée'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Territoire / Commune :</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{student.territoireCommune || 'Non renseigné'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/40">
                    <span className="font-bold text-slate-400">Chefferie / Secteur :</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">{student.chefferieSecteur || 'Non renseigné'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">Adresse Physique de Résidence Exacte</p>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{student.adressePhysique || 'Non renseignée'}</p>
                </div>
              </div>
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

                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase shadow-xs ${
                    financialSummary.isSolvable
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}>
                    {financialSummary.isSolvable ? 'Élève Solvable' : 'Solde en Attente'}
                  </span>
                </div>

                {/* KPI Financiers */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Dû</span>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">{financialSummary.totalDue} $</p>
                  </div>

                  <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                    <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Payé</span>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{financialSummary.totalPaid} $</p>
                  </div>

                  <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                    <span className="text-[10px] font-bold uppercase text-rose-500">Reste à Payer</span>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400">{financialSummary.balance} $</p>
                  </div>
                </div>

                {/* Historique des Reçus de Paiement */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Historique des Reçus de Paiements</h4>
                  {payments.length === 0 ? (
                    <p className="p-4 text-xs text-center text-slate-400 rounded-xl" style={{ background: 'var(--bg-sunken)' }}>
                      Aucun reçu de paiement enregistré pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((r, i) => (
                        <div key={r.id || i} className="p-3 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-sunken)' }}>
                          <div className="space-y-0.5">
                            <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.numeroRecu || r.reference || `REC-${i + 1}`} · <span className="font-sans text-slate-500 dark:text-slate-400">{r.dateCreation}</span></p>
                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Règlement Frais Scolaires</p>
                            <p className="text-[10.5px] text-slate-400">Mode : {r.moyenPaiement || 'CASH'}</p>
                          </div>
                          <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">{r.montantPaye} {r.devise || '$'}</span>
                        </div>
                      ))}
                    </div>
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
                      <Award className="w-4.5 h-4.5" /> Relevé des Cotes & Trimestre 1
                    </h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Pondération et bulletins selon les normes du Secrétariat Général EPST RDC
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-500/10 text-right shrink-0">
                    <p className="text-[10px] font-bold text-indigo-500 uppercase">Moyenne Générale</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{percentage} % <span className="text-xs font-bold">({totalPointsObtained}/{totalPointsMax})</span></p>
                  </div>
                </div>

                {/* Tableau des Cotes */}
                {cotes.length === 0 ? (
                  <div className="p-8 text-center rounded-xl" style={{ background: 'var(--bg-sunken)' }}>
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
                        {cotes.map((c, i) => (
                          <tr key={c.id || i} className="hover:bg-slate-500/5 transition-colors">
                            <td className="p-3">
                              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{c.titre || c.matiereId}</p>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{c.score} / {c.maxScore || 20}</td>
                            <td className="p-3 text-center font-mono text-slate-500">{c.periode || 'P1'}</td>
                            <td className="p-3 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                                {c.score >= (c.maxScore * 0.7) ? 'Satisfaisant' : 'À améliorer'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SOUS-ONGLET 4 : FICHE MÉDICALE & INFIRMERIE ── */}
          {activeLeftTab === 'medical' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-4" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-rose-500 flex items-center gap-2">
                    <Heart className="w-4.5 h-4.5" /> Fiche d'Urgence Médicale Infirmerie
                  </h3>
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                    Groupe Sanguin : {student.groupeSanguin || 'Non renseigné'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-rose-500/10 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                      <BadgeAlert className="w-4 h-4" /> Allergies Connues
                    </div>
                    <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
                      {student.allergies || 'Aucune allergie majeure signalée'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4" /> Antécédents Médicaux
                    </div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                      {student.informationsMedicales || 'Aucun antécédent médical signalé'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SOUS-ONGLET 5 : ASSIDUITÉ & DISCIPLINE ── */}
          {activeLeftTab === 'discipline' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl border-0 shadow-md space-y-4" style={{ background: 'var(--bg-surface)' }}>
                <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5" /> Assiduité & Registre de Présence
                </h3>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Taux de Présence</span>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">100 %</p>
                  </div>

                  <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Absences Justifiées</span>
                    <p className="text-xl font-black text-indigo-500">0 Jour</p>
                  </div>

                  <div className="p-4 rounded-xl space-y-1" style={{ background: 'var(--bg-sunken)' }}>
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
            className="p-5 rounded-2xl border-0 shadow-lg shadow-indigo-500/5 space-y-4"
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
              <div className="flex items-center gap-1 p-1 rounded-xl shadow-xs" style={{ background: 'var(--bg-sunken)' }}>
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

            {/* Rendu Live de la Carte */}
            <div className="flex justify-center p-2 rounded-xl" style={{ background: 'var(--bg-sunken)' }}>
              <div className="transform scale-90 sm:scale-95 origin-center transition-transform">
                <IdCardRenderer
                  student={student}
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
            className="p-5 rounded-2xl border-0 shadow-lg shadow-indigo-500/5 space-y-4"
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
              <div className="p-6 text-center rounded-xl space-y-2" style={{ background: 'var(--bg-sunken)' }}>
                <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Aucun document scanné ou déposé pour cet élève.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl flex items-center justify-between text-xs" style={{ background: 'var(--bg-sunken)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{doc.originalName || doc.fileName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR') : '—'}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black shrink-0 bg-emerald-500/15 text-emerald-600">
                      Déposé
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowDocsModal(true)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer mt-3"
            >
              <FileCheck className="w-4 h-4 text-white" />
              <span>Gérer & Numériser les Pièces (Camera / PDF)</span>
            </button>
          </div>

          {/* 👨‍👩‍👧 SECTION 3 BAS DROITE : TUTEURS LÉGAUX & CONTACTS PARENTS */}
          <div
            className="p-5 rounded-2xl border-0 shadow-lg shadow-indigo-500/5 space-y-4"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4.5 h-4.5 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                  Tuteurs Légaux & Contacts Famille
                </h3>
              </div>
            </div>

            <div className="space-y-4">
              {/* Père / Tuteur Principal */}
              <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--bg-sunken)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                      {student.nomPere || student.nomParent || 'Non renseigné'}
                    </h4>
                    <p className="text-[10.5px] font-bold text-indigo-500">Père / Tuteur Principal</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600">
                    {student.professionPere || 'Profession N/A'}
                  </span>
                </div>

                <div className="pt-1 space-y-1 font-mono text-xs">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                    <Phone className="w-3.5 h-3.5" />
                    {student.telephonePere || student.telephoneParent ? (
                      <a href={`tel:${student.telephonePere || student.telephoneParent}`}>{student.telephonePere || student.telephoneParent}</a>
                    ) : (
                      <span>Non renseigné</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Mère / Tuteur Secondaire */}
              <div className="p-3.5 rounded-xl space-y-2" style={{ background: 'var(--bg-sunken)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                      {student.nomMere || 'Non renseignée'}
                    </h4>
                    <p className="text-[10.5px] font-bold text-pink-500">Mère / Tuteur Secondaire</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/15 text-pink-600">
                    {student.professionMere || 'Profession N/A'}
                  </span>
                </div>

                <div className="pt-1 space-y-1 font-mono text-xs">
                  <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 font-bold">
                    <Phone className="w-3.5 h-3.5" />
                    {student.telephoneMere ? (
                      <a href={`tel:${student.telephoneMere}`}>{student.telephoneMere}</a>
                    ) : (
                      <span>Non renseigné</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  );
};
