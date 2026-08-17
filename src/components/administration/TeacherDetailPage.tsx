import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Pencil, FileText, QrCode, User, BookOpen, Clock, DollarSign,
  Folder, Phone, Mail, MapPin, Calendar, Hash, Award, Check, RotateCw, Eye, EyeOff, ShieldCheck, Download, School, Printer, Lock, Key, ZoomIn, ZoomOut, X,
  UserPlus, MessageSquare, KeyRound, AlertCircle, ShieldAlert, Briefcase, Users, UserCheck, GraduationCap, Baby, Layers, Zap, CheckCircle2, TrendingUp
} from 'lucide-react';
import { MembrePersonnel, DocumentScolaire, UserAccount, FichePaie } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency } from '../../utils/currency';
import { TeacherIdCardModal } from './TeacherIdCardModal';
import { TeacherIdCardRenderer } from './TeacherIdCardRenderer';
import { StaffDocumentsModal } from './StaffDocumentsModal';
import { TeacherFullFileModal } from './TeacherFullFileModal';
import { TeacherAffectationModal } from './TeacherAffectationModal';
import { UserFormModal, getRoleInfo } from './UsersManager';

const formatBytes = (bytes = 0) => {
  if (bytes === 0) return '0 o';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface TeacherDetailPageProps {
  teacher: MembrePersonnel;
  onBack: () => void;
  onEdit: (teacher: MembrePersonnel) => void;
  onUpdate?: (teacher: MembrePersonnel) => void;
}

const statusBadge = (statut: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIF: { label: 'Actif', cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' },
    EN_CONGE: { label: 'En congé', cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' },
    SUSPENDU: { label: 'Suspendu', cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' },
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
};

const gradeLabel: Record<string, string> = {
  DOCTEUR: 'Docteur (PhD)', DES: 'DES / Master', LICENCIE: 'Licencié (L2)',
  AGREGE: 'Agrégé EPST', GRADUAT: 'Gradué (L1)', AUTRE: 'Autre',
};

const roleLabel: Record<string, string> = {
  ENSEIGNANT: 'Enseignant / Professeur', COMPTABLE: 'Comptable / Intendant',
  PREFET: 'Préfet des Études', SURVEILLANT: 'Directeur de Discipline',
  DE: 'Directeur des Études', ADMIN: 'Personnel Administratif',
  PROMOTEUR_ADMIN: 'Promoteur & Admin',
};

export const TeacherDetailPage: React.FC<TeacherDetailPageProps> = ({
  teacher: initialTeacher,
  onBack,
  onEdit,
  onUpdate,
}) => {
  const [teacher, setTeacher] = useState<MembrePersonnel>(initialTeacher);
  const { config, currency } = useSchoolConfig();
  const [activeTab, setActiveTab] = useState<'identity' | 'classes' | 'payroll' | 'documents'>('identity');
  const [cardPreviewFace, setCardPreviewFace] = useState<'front' | 'back'>('front');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [fullFileModalOpen, setFullFileModalOpen] = useState(false);
  const [affectationModalOpen, setAffectationModalOpen] = useState(false);
  // États Documents & Fiches de Paie
  const [staffDocs, setStaffDocs] = useState<DocumentScolaire[]>([]);
  const [staffFiches, setStaffFiches] = useState<FichePaie[]>([]);
  
  // États Compte Utilisateur Lié
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [userAccountLoading, setUserAccountLoading] = useState(true);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [allStaff, setAllStaff] = useState<MembrePersonnel[]>([]);

  // États Zoom Avatar Lightbox & Authentification Mot de passe
  const [zoomAvatarOpen, setZoomAvatarOpen] = useState(false);
  const [avatarZoomScale, setAvatarZoomScale] = useState(1);
  const [isPasswordRevealed, setIsPasswordRevealed] = useState(false);
  const [authAdminModalOpen, setAuthAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  const [adminAuthSubmitting, setAdminAuthSubmitting] = useState(false);
  const [showTypedAdminPassword, setShowTypedAdminPassword] = useState(false);

  // Synchronisation avec les props
  useEffect(() => {
    setTeacher(initialTeacher);
  }, [initialTeacher]);

  const loadData = async () => {
    setUserAccountLoading(true);
    try {
      const [acc, users, staff, docs, fiches] = await Promise.all([
        LocalDatabaseService.getUserByStaff(teacher),
        LocalDatabaseService.getUsers(),
        LocalDatabaseService.getStaff().catch(() => []),
        LocalDatabaseService.getStaffDocuments(teacher.id).catch(() => []),
        LocalDatabaseService.getFichesPaie({ staffId: teacher.id }).catch(() => []),
      ]);
      setUserAccount(acc);
      setAllUsers(users);
      setAllStaff(staff);
      setStaffDocs(docs || []);
      setStaffFiches(fiches || []);
      
      const fresh = staff.find(s => s.id === teacher.id);
      if (fresh) setTeacher(fresh);
    } finally {
      setUserAccountLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teacher.id, docsModalOpen, activeTab]);

  const handleVerifyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPasswordInput.trim()) {
      setAdminAuthError('Veuillez saisir votre mot de passe ou PIN d’administration.');
      return;
    }
    setAdminAuthSubmitting(true);
    setAdminAuthError(null);
    try {
      const isValid = await LocalDatabaseService.verifyAdminPassword(adminPasswordInput);
      if (isValid) {
        setIsPasswordRevealed(true);
        setAuthAdminModalOpen(false);
        setAdminPasswordInput('');
      } else {
        setAdminAuthError('Mot de passe ou PIN Administrateur incorrect. Accès refusé.');
      }
    } catch (err) {
      setAdminAuthError('Erreur de vérification du mot de passe admin.');
    } finally {
      setAdminAuthSubmitting(false);
    }
  };

  const isTauxHoraire = teacher.modeRemuneration === 'TAUX_HORAIRE' || teacher.modeRemuneration === 'MIXTE';
  const volumeHebdo = teacher.volumeHoraireHebdo || 18;
  const heuresMois = teacher.heuresPresteesMois || volumeHebdo * 4;
  const tauxBase = teacher.tauxHoraireBase || 6.5;
  const salaireEstime = isTauxHoraire ? tauxBase * heuresMois : (teacher.salaireBase || 0);

  const defaultTauxParNiveau: Record<string, number> = {
    '7ème CTEB': teacher.tauxHoraireParNiveau?.['7ème CTEB'] || Math.round(tauxBase * 0.9),
    '8ème CTEB': teacher.tauxHoraireParNiveau?.['8ème CTEB'] || Math.round(tauxBase * 0.9),
    '1ère Humanités': teacher.tauxHoraireParNiveau?.['1ère Humanités'] || tauxBase,
    '2ème Humanités': teacher.tauxHoraireParNiveau?.['2ème Humanités'] || tauxBase,
    '3ème Humanités': teacher.tauxHoraireParNiveau?.['3ème Humanités'] || Math.round(tauxBase * 1.1),
    '4ème Humanités': teacher.tauxHoraireParNiveau?.['4ème Humanités'] || Math.round(tauxBase * 1.2),
  };

  const initials = `${(teacher.prenom?.[0] || '').toUpperCase()}${(teacher.nom?.[0] || '').toUpperCase()}`;

  return (
    <div className="space-y-6 animate-fade-in pb-16 select-none">
      {/* ── BARRE SUPÉRIEURE (HEADER) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-xs hover:bg-slate-500/10"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <ArrowLeft className="w-4 h-4 text-indigo-500" />
            <span>Retour à la Liste</span>
          </button>

          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            Dossier Personnel Officiel · EPST RDC
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAffectationModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-md shadow-indigo-500/25 cursor-pointer transition-all hover:bg-indigo-700 active:scale-95 border border-indigo-400/30"
            style={{ background: '#6366f1' }}
          >
            <BookOpen className="w-4 h-4 text-white" />
            <span>Affecter Cours & Titularisation</span>
          </button>

          <button
            onClick={() => onEdit(teacher)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-amber-500/20 cursor-pointer transition-all hover:bg-amber-600 active:scale-95"
            style={{ background: '#f59e0b' }}
          >
            <Pencil className="w-4 h-4 text-white" />
            <span>
              {teacher.role === 'ENSEIGNANT' ? 'Modifier Dossier Enseignant'
                : (teacher.role === 'PROMOTEUR_ADMIN' || teacher.role === 'ADMIN') ? 'Modifier Dossier Admin'
                : (teacher.role === 'COMPTABLE' || teacher.role === 'INTENDANT') ? 'Modifier Dossier Intendance'
                : (teacher.role === 'PREFET' || teacher.role === 'PREFET_DIRECTEUR' || teacher.role === 'DE' || teacher.role === 'DIRECTEUR_ETUDES') ? 'Modifier Dossier Direction'
                : 'Modifier Dossier Personnel'}
            </span>
          </button>

          <button
            onClick={() => setFullFileModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-indigo-500/25 cursor-pointer transition-all hover:bg-indigo-700 active:scale-95"
            style={{ background: '#4f46e5' }}
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Fiche Officielle (PDF)</span>
          </button>

          <button
            onClick={() => setCardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-md shadow-emerald-500/25 cursor-pointer transition-all hover:bg-emerald-700 active:scale-95"
            style={{ background: '#10b981' }}
          >
            <QrCode className="w-4 h-4 text-white" />
            <span>Carte Enseignant QR</span>
          </button>
        </div>
      </div>

      {/* ── BANNIÈRE PROFIL EXÉCUTIVE ── */}
      <div className="rounded-2xl border p-6 shadow-md" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Gauche : Avatar & Infos Clés */}
          <div className="flex items-center gap-5 min-w-0">
            {teacher.avatarUrl ? (
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => { setAvatarZoomScale(1); setZoomAvatarOpen(true); }}
                title="Cliquer pour agrandir la photo de profil"
              >
                <img
                  src={teacher.avatarUrl}
                  alt={`${teacher.prenom} ${teacher.nom}`}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-slate-950/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ZoomIn className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            ) : (
              <div
                className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg shadow-indigo-500/30"
              >
                {initials}
              </div>
            )}

            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {teacher.prenom} {teacher.postnom ? `${teacher.postnom} ` : ''}{teacher.nom}
                </h1>
                {statusBadge(teacher.statut)}
              </div>

              <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 flex-wrap">
                <span>{roleLabel[teacher.role] || teacher.role}</span>
                {teacher.grade && (
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10.5px]">
                    {gradeLabel[teacher.grade] || teacher.grade}
                  </span>
                )}
                {teacher.typeContrat && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10.5px]">
                    {teacher.typeContrat}
                  </span>
                )}
              </p>

              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                <span className="px-2.5 py-0.5 rounded-md border font-mono font-bold" style={pillStyle}>
                  Matricule EPST : {teacher.numeroMatriculeEPST || 'Non attribué'}
                </span>
                <span>Né(e) le {teacher.dateNaissance || '—'} ({teacher.lieuNaissance || 'RDC'})</span>
              </div>
            </div>
          </div>

          {/* Droite : Widget Rémunération & Mode de Paie */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="rounded-2xl p-4 border flex items-center gap-3 min-w-[200px]" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">RÉMUNÉRATION</p>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  {isTauxHoraire ? 'Au Taux Horaire' : 'Salaire Fixe CDI'}
                </p>
                <p className="text-[10.5px] font-semibold text-slate-400">
                  {isTauxHoraire ? `${formatCurrency(tauxBase, currency, teacher.devise)} / heure` : `${formatCurrency(teacher.salaireBase || 0, currency, teacher.devise)} / mois`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-4 border flex items-center gap-3 min-w-[200px]" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.20)' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">PAIE ESTIMÉE MOIS</p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(salaireEstime, currency, teacher.devise)}
                </p>
                <p className="text-[10.5px] font-bold text-emerald-500">
                  {isTauxHoraire ? `Base ${heuresMois}h prestées` : 'Mensuel garanti'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION ONGLET & CONTENU ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* COLONNE GAUCHE (2 COLS) : ONGLETS PRINCIPAUX */}
        <div className="lg:col-span-2 space-y-5">
          {/* Barre des onglets */}
          <div className="rounded-2xl p-1.5 border flex items-center gap-1 overflow-x-auto shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            {[
              { id: 'identity', label: 'Identité & Origine RDC', icon: User },
              { id: 'classes', label: 'Contrat & Affectations', icon: BookOpen },
              { id: 'payroll', label: 'Taux Horaire & Paie', icon: Clock },
              { id: 'documents', label: 'Dossier & Documents', icon: Folder },
            ].map(t => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1 : IDENTITÉ & ORIGINE RDC */}
          {activeTab === 'identity' && (
            <div className="space-y-5 animate-fade-in">
              {/* Carte Fiche Médicale & Urgence */}
              <div className="rounded-2xl border p-6 space-y-4 bg-gradient-to-br from-rose-500/5 via-rose-500/10 to-transparent border-rose-500/20 shadow-xs">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> FICHE D'URGENCE MÉDICALE & SANTÉ AU TRAVAIL
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    GROUPE : {teacher.groupeSanguin || 'O+'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">ALLERGIES CONNUÉS</p>
                    <p className="font-black text-rose-500 mt-0.5">{teacher.allergies || 'Aucune contre-indication'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">ANTÉCÉDENTS & APTITUDE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.antecedentsMedicaux || 'Aptitude physique complète'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">TÉLÉPHONE URGENCE MÉDICALE</p>
                    <p className="font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{teacher.contactUrgenceTelephone || teacher.telephone}</p>
                  </div>
                </div>
              </div>

              {/* Carte État Civil & Famille */}
              <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-indigo-500">
                    <User className="w-4 h-4" /> Fiche Officielle d'État Civil, Famille & Urgences
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Dossier Certifié EPST
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">NOM (PATRONYME)</p>
                    <p className="font-black text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.nom}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">POSTNOM</p>
                    <p className="font-black text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.postnom || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">PRÉNOM</p>
                    <p className="font-black text-sm mt-0.5 text-indigo-600 dark:text-indigo-400">{teacher.prenom}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">SEXE & GENRE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.genre === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">DATE DE NAISSANCE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.dateNaissance || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">LIEU DE NAISSANCE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.lieuNaissance || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">SITUATION MATRIMONIALE</p>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{teacher.etatCivil || 'MARIÉ'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">CONJOINT / CONJOINTE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.nomConjoint || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">ENFANTS À CHARGE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.nombreEnfantsACharge || 0} enfant(s)</p>
                  </div>
                </div>
              </div>

              {/* Personne de Référence & Contact d'Urgence */}
              <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <User className="w-4 h-4" /> Personne de Référence & Contact d'Urgence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">NOM DU CONTACT</p>
                    <p className="font-bold text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.contactUrgenceNom || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">LIEN / RELATION</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.contactUrgenceLien || 'Proche'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">TÉLÉPHONE D'URGENCE</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{teacher.contactUrgenceTelephone || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Contacts & Adresse */}
              <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <Phone className="w-4 h-4" /> Coordonnées & Contacts de Résidence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">TÉLÉPHONE PRINCIPAL</p>
                    <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">{teacher.telephone}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">TÉLÉPHONE SECONDAIRE</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.telephoneSecondaire || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400 text-[10.5px]">ADRESSE E-MAIL</p>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{teacher.email || '—'}</p>
                  </div>
                  <div className="sm:col-span-3">
                    <p className="font-bold text-slate-400 text-[10.5px]">ADRESSE PHYSIQUE (RÉSIDENCE)</p>
                    <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.adresse || 'Kinshasa, République Démocratique du Congo'}</p>
                  </div>
                </div>
              </div>

              {/* Notes Biographiques */}
              {teacher.notesBiographiques && (
                <div className="rounded-2xl border p-6 space-y-2" style={cardStyle}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Notes & Parcours Professionnel
                  </h3>
                  <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-primary)' }}>
                    {teacher.notesBiographiques}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 : CONTRAT & AFFECTATIONS (adaptatif selon rôle/cycle) */}
          {activeTab === 'classes' && (() => {
            const isAdminPersonnel = ['PREFET', 'DE', 'SURVEILLANT', 'COMPTABLE', 'ADMIN', 'PROMOTEUR_ADMIN',
              'PREFET_DIRECTEUR', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE', 'SECRETAIRE', 'INTENDANT'].includes(teacher.role || '');
            const isPrimMat = teacher.cyclePrincipal === 'MATERNELLE' || teacher.cyclePrincipal === 'PRIMAIRE';

            // ── Restructurer les cours en tableau { matiere, classe } ──
            const courseEntries: { matiere: string; classe: string }[] = (teacher.coursAttribues || teacher.disciplines || []).map(c => {
              const match = c.match(/^(.+?)\s+\((.+?)\)$/);
              return match ? { matiere: match[1].trim(), classe: match[2].trim() } : { matiere: c.trim(), classe: 'TOUTES' };
            });

            // Grouper par classe
            const byClasse: Record<string, string[]> = {};
            courseEntries.forEach(({ matiere, classe }) => {
              if (!byClasse[classe]) byClasse[classe] = [];
              byClasse[classe].push(matiere);
            });

            return (
              <div className="space-y-5 animate-fade-in">

                {/* ── CAS ADMIN ── */}
                {isAdminPersonnel && (
                  <>
                    {/* Carte Rôle Officiel */}
                    <div className="rounded-2xl border p-6 space-y-4 bg-gradient-to-br from-violet-500/5 to-transparent border-violet-500/20" style={cardStyle}>
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" /> Poste & Rôle Officiel EPST
                        </h3>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/25">
                          Personnel Administratif
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-black uppercase text-slate-400">RÔLE OFFICIEL</p>
                          <p className="text-base font-black text-violet-600 dark:text-violet-400 mt-1">
                            {roleLabel[teacher.role] || teacher.role}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-black uppercase text-slate-400">DÉPARTEMENT / SERVICE</p>
                          <p className="font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                            {teacher.personnelEnCharge || 'Direction Générale'}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl border space-y-1 sm:col-span-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-black uppercase text-slate-400">RESPONSABILITÉS & MISSIONS</p>
                          <p className="font-semibold mt-1 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                            {teacher.notesBiographiques || 'Aucune description de responsabilités enregistrée.'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAffectationModalOpen(true)}
                        className="mt-2 w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Briefcase className="w-4 h-4" /> Modifier Rôle & Responsabilités
                      </button>
                    </div>

                    {/* Informations contrat admin */}
                    <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                        <FileText className="w-4 h-4" /> Informations Contractuelles
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-slate-400 text-[10.5px]">TYPE DE CONTRAT</p>
                          <p className="font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.typeContrat || 'PERMANENT'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 text-[10.5px]">DATE D'EMBAUCHE</p>
                          <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.dateEmbauche || '—'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 text-[10.5px]">N° INSS</p>
                          <p className="font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.numeroINSS || 'Non renseigné'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 text-[10.5px]">MATRICULE INTERNE</p>
                          <p className="font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.matricule || '—'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 text-[10.5px]">MATRICULE EPST</p>
                          <p className="font-bold font-mono mt-0.5 text-indigo-600 dark:text-indigo-400">{teacher.numeroMatriculeEPST || '—'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-400 text-[10.5px]">STATUT</p>
                          <div className="mt-0.5">{statusBadge(teacher.statut)}</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── CAS MATERNELLE / PRIMAIRE ── */}
                {!isAdminPersonnel && isPrimMat && (
                  <>
                    <div className="rounded-2xl border p-6 space-y-4 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20" style={cardStyle}>
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          {teacher.cyclePrincipal === 'MATERNELLE' ? <Baby className="w-4 h-4" /> : <School className="w-4 h-4" />}
                          Titularisation — Cycle {teacher.cyclePrincipal === 'MATERNELLE' ? 'Maternelle' : 'Primaire'}
                        </h3>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          ★ Titulaire Exclusif de Salle
                        </span>
                      </div>

                      {/* Salle titularisée */}
                      <div className="p-5 rounded-xl border space-y-3 bg-emerald-500/10 border-emerald-500/25">
                        <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">SALLE DE CLASSE TITULARISÉE</p>
                        <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
                          {teacher.salleUniqueId || teacher.classeTitulaireId || <span className="text-slate-400 text-sm">Non renseignée</span>}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                          Conformément au régime EPST, cet enseignant prend en charge <strong>toutes les matières</strong> de sa salle et en est le <strong>seul titulaire exclusif</strong>. Volume : <strong>{volumeHebdo} h/semaine</strong>.
                        </p>
                      </div>

                      {/* Matières incluses */}
                      <div>
                        <p className="text-[10.5px] font-black uppercase text-slate-400 mb-2.5">
                          Matières Pédagogiques du Cycle {teacher.cyclePrincipal === 'MATERNELLE' ? 'Maternelle' : 'Primaire'} :
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(teacher.coursAttribues || teacher.disciplines || (
                            teacher.cyclePrincipal === 'PRIMAIRE'
                              ? ['Français (Lecture & Écriture)', 'Mathématiques / Calcul', 'Éveil Scientifique & Milieu', 'Éducation Civique & Morale', 'Calligraphie & Travaux Manuels', 'Éducation Physique']
                              : ['Activités d\'Éveil & Psychomotricité', 'Langage & Communication Oral', 'Sensorialité & Formes', 'Dessin, Coloriage & Découpage', 'Chants & Rondes']
                          )).map(m => (
                            <span key={m} className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
                              <Check className="w-3 h-3" /> {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button type="button" onClick={() => setAffectationModalOpen(true)}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all">
                        <UserCheck className="w-4 h-4" /> Modifier la Titularisation de Salle
                      </button>
                    </div>

                    {/* Contrat */}
                    <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                        <FileText className="w-4 h-4" /> Informations Contractuelles
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div><p className="font-bold text-slate-400 text-[10.5px]">TYPE CONTRAT</p><p className="font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.typeContrat || 'PERMANENT'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">DATE EMBAUCHE</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.dateEmbauche || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">N° INSS</p><p className="font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.numeroINSS || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">GRADE</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{(teacher.grade ? gradeLabel[teacher.grade] : undefined) || teacher.grade || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">SPÉCIALITÉ</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.specialite || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">DIPLÔME</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.diplome || teacher.qualification || '—'}</p></div>
                      </div>
                    </div>
                  </>
                )}

                {/* ── CAS SECONDAIRE ── */}
                {!isAdminPersonnel && !isPrimMat && (
                  <>
                    {/* Titularisation */}
                    <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-2">
                          <Award className="w-4 h-4" /> Titularisation de Classe (Secondaire EPST)
                        </h3>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          teacher.estTitulaire
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {teacher.estTitulaire ? `★ ${(teacher.classesTitularisees || []).length} Classe(s) Titularisée(s)` : 'Enseignant Intervenant'}
                        </span>
                      </div>

                      {(teacher.classesTitularisees && teacher.classesTitularisees.length > 0) ? (
                        <div className="flex flex-wrap gap-2">
                          {teacher.classesTitularisees.map(cls => (
                            <div key={cls} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black">
                              <Award className="w-3.5 h-3.5 text-amber-500" /> {cls}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-medium italic">Aucune classe titularisée — Enseignant intervenant.</p>
                      )}

                      <div className="grid grid-cols-3 gap-3 pt-1">
                        <div className="p-3 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-black uppercase text-slate-400">VOLUME / SEMAINE</p>
                          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{volumeHebdo}h</p>
                        </div>
                        <div className="p-3 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-black uppercase text-slate-400">CLASSES INTERVENUES</p>
                          <p className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{Object.keys(byClasse).filter(c => c !== 'TOUTES').length}</p>
                        </div>
                        <div className="p-3 rounded-xl border text-center" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <p className="text-[10px] font-black uppercase text-slate-400">MATIÈRES TOTAL</p>
                          <p className="text-base font-black text-violet-600 dark:text-violet-400 mt-0.5">{courseEntries.length}</p>
                        </div>
                      </div>
                    </div>

                    {/* Tableau Matières × Classe */}
                    <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                      <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" /> Affectations Matières × Classes (Régime Secondaire)
                        </h3>
                        <button type="button" onClick={() => setAffectationModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-extrabold hover:bg-indigo-500/20 cursor-pointer">
                          Modifier
                        </button>
                      </div>

                      {courseEntries.length > 0 ? (
                        <div className="space-y-4">
                          {Object.entries(byClasse).map(([classe, matieres]) => (
                            <div key={classe}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="px-3 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center gap-1.5">
                                  <School className="w-3 h-3" />
                                  {classe === 'TOUTES' ? 'Toutes les classes' : classe}
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">{matieres.length} matière(s)</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pl-2">
                                {matieres.map(m => (
                                  <span key={m} className="px-3 py-1.5 rounded-xl text-xs font-black bg-slate-500/10 border flex items-center gap-1.5" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                                    <BookOpen className="w-3 h-3 text-indigo-500" /> {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-5 rounded-xl border text-center space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <GraduationCap className="w-10 h-10 text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-400">Aucune affectation de cours enregistrée.</p>
                          <button type="button" onClick={() => setAffectationModalOpen(true)}
                            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs cursor-pointer">
                            + Affecter des Matières par Classe
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Contrat secondaire */}
                    <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                        <FileText className="w-4 h-4" /> Informations Contractuelles
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div><p className="font-bold text-slate-400 text-[10.5px]">TYPE CONTRAT</p><p className="font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.typeContrat || 'PERMANENT'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">DATE EMBAUCHE</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.dateEmbauche || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">N° INSS</p><p className="font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.numeroINSS || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">GRADE ACADÉMIQUE</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{(teacher.grade ? gradeLabel[teacher.grade] : undefined) || teacher.grade || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">SPÉCIALITÉ</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.specialite || '—'}</p></div>
                        <div><p className="font-bold text-slate-400 text-[10.5px]">DIPLÔME</p><p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.diplome || teacher.qualification || '—'}</p></div>
                      </div>
                    </div>
                  </>
                )}

              </div>
            );
          })()}


          {/* TAB 3 : TAUX HORAIRE & FICHE DE PAIE */}
          {activeTab === 'payroll' && (
            <div className="space-y-5 animate-fade-in">
              {/* Synthèse Rémunération & Montant Net à Payer */}
              <div className="rounded-2xl border p-6 space-y-4 shadow-xs" style={cardStyle}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" /> Rémunération & Conditions Salariales
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      {isTauxHoraire
                        ? 'Contrat prestataire calculé selon les heures de cours effectivement prestées'
                        : 'Contrat permanent à rémunération mensuelle fixe garantie'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black border self-start sm:self-auto ${
                    isTauxHoraire
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}>
                    {isTauxHoraire ? '⏱️ Taux Horaire Presté' : '💼 Salaire Fixe Mensuel CDI'}
                  </span>
                </div>

                {/* Synthèse Tarifaire - 3 Grands Blocs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {/* Bloc 1 : Taux / Base */}
                  <div className="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/20 space-y-1">
                    <p className="text-[10px] font-black uppercase text-indigo-500">
                      {isTauxHoraire ? 'TAUX HORAIRE DE BASE' : 'SALAIRE DE BASE CONTRACTUEL'}
                    </p>
                    <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {isTauxHoraire
                        ? `${formatCurrency(tauxBase, currency, teacher.devise)} / h`
                        : formatCurrency(teacher.salaireBase || 0, currency, teacher.devise)}
                    </p>
                    <p className="text-[10.5px] font-medium text-slate-400">
                      {isTauxHoraire ? 'Tarif par heure de cours' : 'Montant mensuel brut garanti'}
                    </p>
                  </div>

                  {/* Bloc 2 : Volume / Périodicité */}
                  <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      {isTauxHoraire ? 'HEURES PRESTÉES DU MOIS' : 'PÉRIODICITÉ DE PAIEMENT'}
                    </p>
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {isTauxHoraire ? `${heuresMois} Heures` : 'Mensuel (30 jours)'}
                    </p>
                    <p className="text-[10.5px] font-medium text-slate-400">
                      {isTauxHoraire ? `Quota : ${volumeHebdo}h / semaine` : 'Règlement en fin de mois'}
                    </p>
                  </div>

                  {/* Bloc 3 : TOTAL NET À PAYER (Mis en valeur) */}
                  <div className="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-1 shadow-xs">
                    <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" /> MONTANT NET À PAYER
                    </p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                      {formatCurrency(salaireEstime, currency, teacher.devise)}
                    </p>
                    <p className="text-[10.5px] font-bold text-emerald-600/80 dark:text-emerald-400/80">
                      Rémunération totale due à l'agent
                    </p>
                  </div>
                </div>

                {/* Grille par niveau si taux horaire au secondaire */}
                {isTauxHoraire && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-500" /> Grille de Taux selon le Niveau d'Enseignement
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(defaultTauxParNiveau).map(([niveau, tx]) => (
                        <div key={niveau} className="p-3 rounded-xl border flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                          <div>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{niveau}</p>
                            <p className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{formatCurrency(tx, currency, teacher.devise)} / h</p>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Coordonnées de Versement Bancaire & Mobile Money */}
              <div className="rounded-2xl border p-6 space-y-4 shadow-xs" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <DollarSign className="w-4 h-4" /> Canal de Versement & Coordonnées Bancaires
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="font-bold text-slate-400 text-[10.5px] uppercase">MODE DE VERSEMENT</p>
                    <p className="font-black text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {teacher.modeVersementSalaire === 'BANQUE' ? '🏦 Virement Bancaire' : teacher.modeVersementSalaire === 'MOBILE_MONEY' ? '📱 Mobile Money' : '💵 Caisse Établissement'}
                    </p>
                  </div>

                  {teacher.modeVersementSalaire === 'MOBILE_MONEY' ? (
                    <>
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <p className="font-bold text-slate-400 text-[10.5px] uppercase">OPÉRATEUR MOBILE</p>
                        <p className="font-black text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.mobileMoneyOperateur || 'M-Pesa / Vodacom'}</p>
                      </div>
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <p className="font-bold text-slate-400 text-[10.5px] uppercase">NUMÉRO MOBILE MONEY</p>
                        <p className="font-black text-sm font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{teacher.mobileMoneyNumero || teacher.telephone || 'Non renseigné'}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <p className="font-bold text-slate-400 text-[10.5px] uppercase">BANQUE PARTENAIRE</p>
                        <p className="font-black text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{teacher.banqueNom || 'Rawbank RDC'}</p>
                      </div>
                      <div className="p-4 rounded-xl border space-y-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <p className="font-bold text-slate-400 text-[10.5px] uppercase">NUMÉRO DE COMPTE (RIB)</p>
                        <p className="font-black text-sm font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{teacher.numeroCompteBancaire || 'Non renseigné'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Historique des Règlements & Fiches de Paie Réalisées */}
              <div className="rounded-2xl border p-6 space-y-4 shadow-xs" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Historique des Fiches de Paie & Règlements ({staffFiches.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">Enregistrements SQLite</span>
                </div>

                {staffFiches.length > 0 ? (
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'var(--bg-sunken)' }}>
                          <th className="text-left px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Période</th>
                          <th className="text-left px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Date Règlement</th>
                          <th className="text-right px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Salaire Brut</th>
                          <th className="text-right px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Net Payé</th>
                          <th className="text-center px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Canal</th>
                          <th className="text-center px-4 py-2.5 font-black uppercase text-[10px] text-slate-400">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffFiches.map(f => (
                          <tr key={f.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                            <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>
                              {f.periode || f.anneeScolaire || '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-400 font-medium">{f.datePaiement || '—'}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">
                              {formatCurrency(f.salaireBrut || f.salaireBase || 0, currency, f.devise)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(f.salaireNet || f.salaireBase || 0, currency, f.devise)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-500/10 text-slate-500">
                                {f.modePaiement || 'CASH'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                f.statut === 'PAYE'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                              }`}>
                                {f.statut === 'PAYE' ? 'Payé' : f.statut || 'En attente'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed text-center space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                    <DollarSign className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">Aucune fiche de paie clôturée enregistrée pour cet agent pour le moment.</p>
                    <p className="text-[11px] text-slate-500">Les fiches de paie générées depuis le module Finances & Salaires s'afficheront automatiquement ici.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4 : DOSSIER & DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-2xl border p-6 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                      <Folder className="w-4 h-4" /> Pièces Jointes & Dossier Scanné RH
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black border border-indigo-500/20">
                      {staffDocs.length} document(s)
                    </span>
                  </div>
                  <button
                    onClick={() => setDocsModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    + Gérer les Documents Numériques
                  </button>
                </div>

                {staffDocs.length === 0 ? (
                  <div className="p-6 text-center rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Dossier Numérique Vide</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                      Aucune pièce justificative n'a encore été téléversée pour cet enseignant (Diplômes, CV, Contrat EPST).
                    </p>
                    <button
                      onClick={() => setDocsModalOpen(true)}
                      className="mt-4 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-colors cursor-pointer"
                    >
                      Ouvrir le Gestionnaire de Documents
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {staffDocs.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => setDocsModalOpen(true)}
                        className="p-3.5 rounded-xl border flex items-center justify-between gap-3 hover:border-indigo-500 transition-all cursor-pointer group"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate group-hover:text-indigo-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                              {doc.originalName || doc.nomFichier || 'Document RH'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {doc.category || 'Pièce Jointe RH'} • {doc.dateAjout ? new Date(doc.dateAjout as string).toLocaleDateString('fr-FR') : 'Récemment'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Voir ➔
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE (1 COL) : CARTE ENSEIGNANT PRO & DOSSIER ACCÈS RAPIDE */}
        <div className="space-y-5">
          {/* 1. Carte Enseignant Pro Officielle */}
          <div className="rounded-2xl border p-5 space-y-4 shadow-md" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> CARTE ENSEIGNANT OFFICIELLE
              </h3>
              <span className="text-[10px] font-bold text-slate-400">EPST RDC</span>
            </div>

            {/* Visualiseur de carte avec Recto/Verso */}
            <div className="relative rounded-2xl border p-3 text-center space-y-3 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 shadow-xl" style={{ borderColor: 'rgba(99,102,241,0.25)' }}>
              <TeacherIdCardRenderer
                teacher={teacher}
                schoolConfig={config}
                face={cardPreviewFace}
              />

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setCardPreviewFace('front')}
                  className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${cardPreviewFace === 'front' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                >
                  Recto
                </button>
                <button
                  onClick={() => setCardPreviewFace('back')}
                  className={`flex-1 py-1.5 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${cardPreviewFace === 'back' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}
                >
                  Verso
                </button>
              </div>
            </div>

            <button
              onClick={() => setCardModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Aperçu HD & Impression Carte Service</span>
            </button>
          </div>

          {/* 2. Accès Rapide Documents RH & Coffre-Fort Numérique */}
          <div className="rounded-2xl border p-5 space-y-3 shadow-md" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <Folder className="w-4 h-4" /> COFFRE-FORT NUMÉRIQUE
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {staffDocs.length} Document(s)
              </span>
            </div>

            {staffDocs.length === 0 ? (
              <div className="p-4 rounded-xl border text-center space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <Folder className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Pièces justificatives RH & Diplômes</p>
                <p className="text-[10.5px] text-slate-400">Aucun document numérique importé</p>
                <button
                  onClick={() => setDocsModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                >
                  + Ajouter des Documents
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {staffDocs.map(doc => (
                    <div
                      key={doc.id}
                      onClick={() => setDocsModalOpen(true)}
                      className="p-2.5 rounded-xl border flex items-center justify-between gap-2 hover:border-indigo-500 transition-all cursor-pointer group"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-[11.5px] font-bold truncate group-hover:text-indigo-500 transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {doc.originalName || doc.nomFichier || 'Document'}
                          </p>
                          <p className="text-[9.5px] text-slate-400">
                            {doc.category || 'RH'} • {formatBytes(doc.size || doc.sizeBytes || 0)}
                          </p>
                        </div>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setDocsModalOpen(true)}
                  className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                >
                  Gérer le Coffre-Fort ({staffDocs.length})
                </button>
              </div>
            )}
          </div>

          {/* 3. Identifiants de Connexion & Rôle Système (Pour Administrateurs) */}
          <div className="rounded-2xl border p-5 space-y-3.5 shadow-md bg-gradient-to-br from-indigo-500/5 via-slate-900/5 to-transparent" style={cardStyle}>
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> COMPTE D'ACCÈS SYSTÈME & IDENTIFIANTS
              </h3>
              {userAccount ? (
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  userAccount.statut === 'ACTIF' 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                }`}>
                  {userAccount.statut === 'ACTIF' ? 'Compte Actif' : 'Compte Suspendu'}
                </span>
              ) : (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-500 border border-slate-500/30">
                  Aucun Compte
                </span>
              )}
            </div>

            {userAccount ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-slate-400 font-bold text-[10.5px]">Identifiant / E-mail :</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{userAccount.email}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-slate-400 font-bold text-[10.5px]">Rôle Système :</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{getRoleInfo(userAccount.role).label}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-slate-400 font-bold text-[10.5px]">Mot de Passe Sécurisé :</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${isPasswordRevealed ? 'text-amber-600 dark:text-amber-400 font-black' : 'text-slate-500'}`}>
                      {isPasswordRevealed ? ((userAccount as any).password || (userAccount as any).generatedPassword || (userAccount as any).motDePasse || 'Mot de passe configuré') : '•••••••• (Protégé)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPasswordRevealed) {
                          setIsPasswordRevealed(false);
                        } else {
                          setAdminPasswordInput('');
                          setAdminAuthError(null);
                          setAuthAdminModalOpen(true);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-slate-500/10 text-indigo-500 transition-colors cursor-pointer"
                      title={isPasswordRevealed ? "Masquer le mot de passe" : "Afficher le mot de passe (Vérification admin)"}
                    >
                      {isPasswordRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-indigo-500" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <span className="text-slate-400 font-bold text-[10.5px]">Code PIN de Secours :</span>
                  <span className="font-mono font-bold text-slate-400 tracking-widest">
                    {userAccount.pinCode ? (isPasswordRevealed ? userAccount.pinCode : '••••••') : 'Non configuré'}
                  </span>
                </div>

                {userAccount.derniereConnexion && (
                  <div className="flex items-center justify-between p-2 rounded-xl text-[10.5px] text-slate-400">
                    <span>Dernière connexion :</span>
                    <span className="font-semibold text-slate-300">
                      {new Date(userAccount.derniereConnexion).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}

                {/* Boutons d'action pour le compte existant */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setUserModalOpen(true)}
                    className="py-2 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Modifier Accès</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const role = getRoleInfo(userAccount.role);
                      const pwd = (userAccount as any).password || (userAccount as any).generatedPassword || (userAccount as any).motDePasse || '';
                      const msg = `Bonjour ${userAccount.prenom || ''} ${userAccount.nom},\n\nVos accès officiels ECOLISA :\n• E-mail : ${userAccount.email}\n• Mot de passe : ${pwd || '[Mot de passe configuré]'}\n• Code PIN : ${userAccount.pinCode || 'Non configuré'}\n• Rôle : ${role.label}\n\nVeuillez conserver ces informations en lieu sûr.`;
                      const rawPhone = (userAccount.telephone || teacher.telephone || '').replace(/[^0-9]/g, '');
                      const phone = rawPhone.startsWith('243') ? rawPhone : (rawPhone ? `243${rawPhone.replace(/^0/, '')}` : '');
                      const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                      window.open(url, '_blank');
                    }}
                    className="py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Envoyer WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Cet enseignant ne dispose pas encore de compte d'accès pour se connecter au portail ECOLISA.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUserModalOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-500/30"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Créer un Compte d'Accès pour cet Enseignant</span>
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/40">
              <button
                type="button"
                onClick={() => setAffectationModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer border border-indigo-500/30"
              >
                <BookOpen className="w-4 h-4 text-white" />
                <span>Gérer les Affectations & Titularisations</span>
              </button>

              <button
                type="button"
                onClick={() => onEdit(teacher)}
                className="w-full py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-extrabold hover:bg-amber-500/20 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Modifier les Informations RH & Identité</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal Carte Pro Enseignant */}
      <TeacherIdCardModal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        teacher={teacher}
      />

      {/* Modal des documents rattachés */}
      <StaffDocumentsModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        staff={teacher}
      />

      {/* Modal Fiche Officielle Imprimable */}
      <TeacherFullFileModal
        isOpen={fullFileModalOpen}
        onClose={() => setFullFileModalOpen(false)}
        teacher={teacher}
      />

      {/* Modale d'Affectations Pédagogiques & Titularisation EPST */}
      <TeacherAffectationModal
        isOpen={affectationModalOpen}
        onClose={() => setAffectationModalOpen(false)}
        teacher={teacher}
        onSaveSuccess={(upd) => {
          const merged = { ...teacher, ...upd };
          setTeacher(merged);
          if (onUpdate) onUpdate(merged);
        }}
      />

      {/* Modal Zoom Photo de Profil (Lightbox) */}
      {zoomAvatarOpen && teacher.avatarUrl && (
        <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="relative max-w-2xl w-full flex flex-col items-center gap-4">
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <button
                onClick={() => setAvatarZoomScale(s => Math.min(s + 0.25, 3))}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                title="Zoomer"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setAvatarZoomScale(s => Math.max(s - 0.25, 0.5))}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                title="Dézoomer"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setAvatarZoomScale(1)}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
                title="Réinitialiser"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoomAvatarOpen(false)}
                className="p-2 rounded-xl bg-rose-500/80 text-white hover:bg-rose-600 transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl bg-slate-900 max-h-[75vh] flex items-center justify-center p-2">
              <img
                src={teacher.avatarUrl}
                alt={`${teacher.prenom} ${teacher.nom}`}
                className="rounded-2xl object-contain max-h-[70vh] transition-transform duration-200"
                style={{ transform: `scale(${avatarZoomScale})` }}
              />
            </div>
            
            <p className="text-xs font-bold text-slate-300">
              Photo de profil officielle · {teacher.prenom} {teacher.nom}
            </p>
          </div>
        </div>
      )}

      {/* Modal d'Authentification Administrateur (Déverrouillage Mot de Passe) */}
      {authAdminModalOpen && (
        <div className="fixed inset-0 w-full h-full z-[9999] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-5 shadow-2xl"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-indigo-500">
                    Confirmation Administrateur
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400">Authentification de Sécurité</p>
                </div>
              </div>
              <button
                onClick={() => setAuthAdminModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-500/10 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pour afficher le mot de passe confidentiel de <span className="font-bold text-indigo-500">{teacher.prenom} {teacher.nom}</span>, veuillez confirmer votre mot de passe d'administration ou votre PIN Caisse/Admin.
            </p>

            {adminAuthError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <Key className="w-4 h-4 shrink-0" />
                <span>{adminAuthError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyAdminPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mot de Passe ou PIN Admin
                </label>
                <div className="relative">
                  <input
                    type={showTypedAdminPassword ? "text" : "password"}
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    placeholder="Saisissez votre mot de passe / PIN..."
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl text-xs font-mono font-bold border outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{
                      background: 'var(--bg-sunken)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTypedAdminPassword(!showTypedAdminPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    {showTypedAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAuthAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-500/10 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={adminAuthSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/25 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{adminAuthSubmitting ? 'Vérification...' : 'Déverrouiller et Afficher'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Création / Modification Compte Utilisateur */}
      {userModalOpen && (
        <UserFormModal
          user={userAccount}
          initialStaff={userAccount ? null : teacher}
          existingUsers={allUsers}
          staffList={allStaff}
          onClose={() => setUserModalOpen(false)}
          onSave={async (u) => {
            if (u.id && allUsers.some(ex => ex.id === u.id)) {
              await LocalDatabaseService.updateUser(u.id, u);
            } else {
              await LocalDatabaseService.addUser(u);
            }
            setUserModalOpen(false);
            await loadData();
          }}
        />
      )}
    </div>
  );
};
