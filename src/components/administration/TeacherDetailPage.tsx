import React, { useState } from 'react';
import {
  ArrowLeft, Pencil, FileText, QrCode, User, BookOpen, Clock, DollarSign,
  Folder, Phone, Mail, MapPin, Calendar, Hash, Award, Check, RotateCw, Eye, ShieldCheck, Download, School
} from 'lucide-react';
import { MembrePersonnel } from '../../types';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { TeacherIdCardModal } from './TeacherIdCardModal';
import { TeacherIdCardRenderer } from './TeacherIdCardRenderer';
import { StaffDocumentsModal } from './StaffDocumentsModal';

interface TeacherDetailPageProps {
  teacher: MembrePersonnel;
  onBack: () => void;
  onEdit: (teacher: MembrePersonnel) => void;
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
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 20px -6px rgba(15, 23, 42, 0.06)',
};

const gradeLabel: Record<string, string> = {
  DOCTEUR: 'Docteur (PhD)', DES: 'DES / Master', LICENCIE: 'Licencié (L2)',
  AGREGE: 'Agrégé EPST', GRADUAT: 'Gradué (L1)', AUTRE: 'Autre',
};

const roleLabel: Record<string, string> = {
  ENSEIGNANT: 'Enseignant / Professeur', COMPTABLE: 'Comptable / Intendant',
  PREFET: 'Préfet des Études', SURVEILLANT: 'Directeur de Discipline',
  DE: 'Directeur des Études', ADMIN: 'Personnel Administratif',
};

export const TeacherDetailPage: React.FC<TeacherDetailPageProps> = ({
  teacher,
  onBack,
  onEdit,
}) => {
  const { config } = useSchoolConfig();
  const [activeTab, setActiveTab] = useState<'identity' | 'classes' | 'payroll' | 'documents'>('identity');
  const [cardPreviewFace, setCardPreviewFace] = useState<'front' | 'back'>('front');
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  const isTauxHoraire = teacher.modeRemuneration === 'TAUX_HORAIRE' || teacher.modeRemuneration === 'MIXTE';
  const volumeHebdo = teacher.volumeHoraireHebdo || 18;
  const heuresMois = teacher.heuresPresteesMois || volumeHebdo * 4;
  const tauxBase = teacher.tauxHoraireBase || 6.5;
  const salaireEstime = isTauxHoraire ? tauxBase * heuresMois : (teacher.salaireBase || 0);

  const defaultTauxParNiveau: Record<string, number> = {
    '7ème CTEB': teacher.tauxHoraireParNiveau?.['7ème CTEB'] || (tauxBase * 0.9),
    '8ème CTEB': teacher.tauxHoraireParNiveau?.['8ème CTEB'] || (tauxBase * 0.9),
    '1ère Humanités': teacher.tauxHoraireParNiveau?.['1ère Humanités'] || tauxBase,
    '2ème Humanités': teacher.tauxHoraireParNiveau?.['2ème Humanités'] || tauxBase,
    '3ème Humanités': teacher.tauxHoraireParNiveau?.['3ème Humanités'] || (tauxBase * 1.1),
    '4ème Humanités': teacher.tauxHoraireParNiveau?.['4ème Humanités'] || (tauxBase * 1.2),
  };

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* ── BARRE SUPÉRIEURE (HEADER) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sunken)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la Liste
          </button>

          <span className="text-xs font-medium text-slate-400 hidden sm:inline">
            Dossier Personnel Officiel · EPST RDC
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onEdit(teacher)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition-all"
            style={{ background: '#f59e0b' }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Modifier Dossier Enseignant
          </button>
          <button
            onClick={() => setDocsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition-all"
            style={{ background: '#6366f1' }}
          >
            <FileText className="w-3.5 h-3.5" />
            Exporter Dossier Complet
          </button>
          <button
            onClick={() => setCardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer transition-all"
            style={{ background: '#10b981' }}
          >
            <QrCode className="w-3.5 h-3.5" />
            Carte Enseignant QR
          </button>
        </div>
      </div>

      {/* ── BANNIÈRE PROFIL ── */}
      <div className="rounded-3xl border p-6 shadow-sm" style={cardStyle}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Gauche : Avatar & Nom */}
          <div className="flex items-center gap-5 min-w-0">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={`${teacher.prenom} ${teacher.nom}`}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-500 shadow-md shrink-0"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg"
              >
                {teacher.prenom?.[0]}{teacher.nom?.[0]}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {teacher.prenom} {teacher.postnom ? `${teacher.postnom} ` : ''}{teacher.nom}
                </h1>
                {statusBadge(teacher.statut)}
              </div>

              <p className="text-xs font-bold text-indigo-500">
                {roleLabel[teacher.role] || teacher.role} {teacher.grade ? `• ${gradeLabel[teacher.grade]}` : ''}
              </p>

              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                <span className="px-2 py-0.5 rounded-md border" style={pillStyle}>
                  Matricule EPST: {teacher.numeroMatriculeEPST || 'Non attribué'}
                </span>
                <span>Né(e) le {teacher.dateNaissance || '—'} ({teacher.lieuNaissance || 'RDC'})</span>
              </div>
            </div>
          </div>

          {/* Droite : Widget Rémunération & Mode de Paie */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl p-4 border flex items-center gap-3 min-w-[200px]" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">RÉMUNÉRATION</p>
                <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  {isTauxHoraire ? 'Au Taux Horaire' : 'Salaire Fixe CDI'}
                </p>
                <p className="text-[10px] font-semibold text-slate-400">
                  {isTauxHoraire ? `${tauxBase} ${teacher.devise} / heure` : `${teacher.salaireBase} ${teacher.devise} / mois`}
                </p>
              </div>
            </div>

            <div className="rounded-2xl p-4 border flex items-center gap-3 min-w-[200px]" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.20)' }}>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">PAIE ESTIMÉE MOIS</p>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">
                  {salaireEstime.toLocaleString()} {teacher.devise}
                </p>
                <p className="text-[10px] font-bold text-emerald-500">
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
          {/* Barres des onglets */}
          <div className="rounded-2xl p-1.5 border flex items-center gap-1 overflow-x-auto" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            {[
              { id: 'identity', label: 'Identité & Origine RDC', icon: User },
              { id: 'classes', label: 'Affectations & Charges', icon: BookOpen },
              { id: 'payroll', label: 'Taux Horaire & Paie', icon: Clock },
              { id: 'documents', label: 'Dossier & Documents', icon: Folder },
            ].map(t => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                  style={{
                    background: active ? '#6366f1' : 'transparent',
                    color: active ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1 : IDENTITÉ & ORIGINE RDC */}
          {activeTab === 'identity' && (
            <div className="space-y-5 animate-fade-in">
              {/* Carte Fiche Médicale & Urgence */}
              <div className="rounded-3xl border p-6 space-y-4 bg-gradient-to-br from-rose-500/5 via-rose-500/10 to-transparent border-rose-500/20 shadow-xs">
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
                    <p className="font-bold text-slate-400">ALLERGIES CONNUÉS</p>
                    <p className="font-black text-rose-500 mt-0.5">{teacher.allergies || 'Aucune contre-indication'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">ANTÉCÉDENTS & APTITUDE</p>
                    <p className="font-bold mt-0.5">{teacher.antecedentsMedicaux || 'Aptitude physique complète'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">TÉLÉPHONE URGENCE MÉDICALE</p>
                    <p className="font-black text-emerald-500 mt-0.5">{teacher.contactUrgenceTelephone || teacher.telephone}</p>
                  </div>
                </div>
              </div>

              {/* Carte État Civil & Famille */}
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
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
                    <p className="font-bold text-slate-400">NOM (PATRONYME)</p>
                    <p className="font-black text-sm mt-0.5">{teacher.nom}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">POSTNOM</p>
                    <p className="font-black text-sm mt-0.5">{teacher.postnom || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">PRÉNOM</p>
                    <p className="font-black text-sm mt-0.5 text-indigo-500">{teacher.prenom}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">SEXE & GENRE</p>
                    <p className="font-bold mt-0.5">{teacher.genre === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">DATE DE NAISSANCE</p>
                    <p className="font-bold mt-0.5">{teacher.dateNaissance || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">LIEU DE NAISSANCE</p>
                    <p className="font-bold mt-0.5">{teacher.lieuNaissance || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">SITUATION MATRIMONIALE</p>
                    <p className="font-bold text-indigo-500 mt-0.5">{teacher.etatCivil || 'MARIÉ'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">CONJOINT / CONJOINTE</p>
                    <p className="font-bold mt-0.5">{teacher.nomConjoint || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">ENFANTS À CHARGE</p>
                    <p className="font-bold mt-0.5">{teacher.nombreEnfantsACharge || 0} enfant(s)</p>
                  </div>
                </div>
              </div>

              {/* Personne de Référence & Contact d'Urgence */}
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <User className="w-4 h-4" /> Personne de Référence & Contact d'Urgence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400">NOM DU CONTACT</p>
                    <p className="font-bold text-sm mt-0.5">{teacher.contactUrgenceNom || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">LIEN / RELATION</p>
                    <p className="font-bold mt-0.5">{teacher.contactUrgenceLien || 'Proche'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">TÉLÉPHONE D'URGENCE</p>
                    <p className="font-bold text-emerald-500 mt-0.5">{teacher.contactUrgenceTelephone || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Contacts & Adresse */}
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <Phone className="w-4 h-4" /> Coordonnées & Contacts de Résidence
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400">TÉLÉPHONE PRINCIPAL</p>
                    <p className="font-bold text-sm text-emerald-500 mt-0.5">{teacher.telephone}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">TÉLÉPHONE SECONDAIRE</p>
                    <p className="font-bold mt-0.5">{teacher.telephoneSecondaire || '—'}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-400">ADRESSE E-MAIL</p>
                    <p className="font-bold text-indigo-500 mt-0.5">{teacher.email || '—'}</p>
                  </div>
                  <div className="sm:col-span-3">
                    <p className="font-bold text-slate-400">ADRESSE PHYSIQUE (RÉSIDENCE)</p>
                    <p className="font-bold mt-0.5">{teacher.adresse || 'Kinshasa, République Démocratique du Congo'}</p>
                  </div>
                </div>
              </div>

              {/* Notes Biographiques */}
              {teacher.notesBiographiques && (
                <div className="rounded-3xl border p-6 space-y-2" style={cardStyle}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Notes & Parcours Professionnel
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {teacher.notesBiographiques}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 : AFFECTATIONS & CHARGES HORAIRES */}
          {activeTab === 'classes' && (
            <div className="space-y-5 animate-fade-in">
              {/* Disciplines & Charges */}
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <BookOpen className="w-4 h-4" /> Disciplines & Volume Horaire Hebdomadaire
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-black uppercase text-slate-400">VOLUME HORAIRE TOTAL</p>
                    <p className="text-2xl font-black text-indigo-500 mt-1">{volumeHebdo} Heures / semaine</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Soit ~{heuresMois}h par mois réparties sur la grille</p>
                  </div>
                  <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-black uppercase text-slate-400">GRADE & SPÉCIALITÉ</p>
                    <p className="text-base font-black mt-1">{gradeLabel[teacher.grade || ''] || teacher.grade || 'Licencié'}</p>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{teacher.specialite || teacher.diplome || 'Didactique EPST'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-black uppercase text-slate-400 mb-2">Matières Enseignées :</p>
                  <div className="flex flex-wrap gap-2">
                    {(teacher.disciplines || ['Mathématiques', 'Physique']).map(d => (
                      <span key={d} className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Assignation aux Classes */}
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <School className="w-4 h-4" /> Classes Attribuées (Éducation de Base & Secondaire)
                </h3>
                {(teacher.classesAssignees || []).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(teacher.classesAssignees || []).map(cls => (
                      <div key={cls} className="p-3 rounded-2xl border flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <span className="text-xs font-bold">{cls}</span>
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border text-center text-xs text-slate-400" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    Aucune classe attribuée spécifiquement. L'enseignant intervient sur la grille générale.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3 : TAUX HORAIRE & FICHE DE PAIE */}
          {activeTab === 'payroll' && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Formule de Paie & Grille au Taux Horaire
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {isTauxHoraire ? 'Rémunération par Heures Prestées' : 'Salaire Fixe Mensuel'}
                  </span>
                </div>

                {/* Synthèse Tarifaire */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border bg-indigo-500/5 border-indigo-500/20">
                    <p className="text-[10px] font-black uppercase text-indigo-500">TAUX DE BASE / HEURE</p>
                    <p className="text-2xl font-black text-indigo-500 mt-1">{tauxBase} {teacher.devise}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Par heure d'enseignement prestée</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-emerald-500/5 border-emerald-500/20">
                    <p className="text-[10px] font-black uppercase text-emerald-500">HEURES PRESTÉES</p>
                    <p className="text-2xl font-black text-emerald-500 mt-1">{heuresMois} Heures</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Mois en cours (Cumul)</p>
                  </div>
                  <div className="p-4 rounded-2xl border bg-amber-500/5 border-amber-500/20">
                    <p className="text-[10px] font-black uppercase text-amber-500">TOTAL ESTIMÉ PAIE</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">{salaireEstime.toLocaleString()} {teacher.devise}</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Calculé automatiquement</p>
                  </div>
                </div>

                {/* Grille par Niveau de Classe */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-500" /> Variation du Taux Horaire selon le Niveau de Classe (7è CTEB ➔ 4è Humanités)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(defaultTauxParNiveau).map(([niveau, tx]) => (
                      <div key={niveau} className="p-3 rounded-2xl border flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                        <div>
                          <p className="text-xs font-bold">{niveau}</p>
                          <p className="text-[10px] font-semibold text-indigo-500 mt-0.5">{tx} {teacher.devise} / h</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coordonnées de Versement Bancaire & Mobile Money */}
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-500 border-b pb-3 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
                  <DollarSign className="w-4 h-4" /> Canal de Versement & Coordonnées Bancaires
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-400">MODE DE VERSEMENT</p>
                    <p className="font-black text-sm text-emerald-500 mt-0.5">
                      {teacher.modeVersementSalaire === 'BANQUE' ? 'Virement Bancaire' : teacher.modeVersementSalaire === 'MOBILE_MONEY' ? 'Mobile Money' : 'Caisse Établissement'}
                    </p>
                  </div>
                  {teacher.modeVersementSalaire === 'MOBILE_MONEY' ? (
                    <>
                      <div>
                        <p className="font-bold text-slate-400">OPÉRATEUR MOBILE</p>
                        <p className="font-bold mt-0.5">{teacher.mobileMoneyOperateur || 'M-Pesa'}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-400">NUMÉRO MOBILE MONEY</p>
                        <p className="font-bold text-indigo-500 mt-0.5">{teacher.mobileMoneyNumero || teacher.telephone}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="font-bold text-slate-400">BANQUE D'AFFECTATION</p>
                        <p className="font-bold mt-0.5">{teacher.banqueNom || 'Equity BCDC'}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-400">N° COMPTE BANCAIRE</p>
                        <p className="font-bold text-indigo-500 mt-0.5">{teacher.numeroCompteBancaire || 'Non renseigné'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4 : DOSSIER & DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-3xl border p-6 space-y-4" style={cardStyle}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-2">
                    <Folder className="w-4 h-4" /> Pièces Jointes & Dossier Scanné
                  </h3>
                  <button
                    onClick={() => setDocsModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    + Ajouter un Document Numérique
                  </button>
                </div>

                <div className="p-6 text-center rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold">Dossier Numérique de l'Enseignant</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                    Consultez et importez les pièces justificatives : Diplômes certifiés, CV, Contrat de travail et Pièce d'identité EPST.
                  </p>
                  <button
                    onClick={() => setDocsModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-bold hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    Ouvrir le Gestionnaire de Documents
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE (1 COL) : CARTE ENSEIGNANT PRO & DOSSIER ACCÈS RAPIDE */}
        <div className="space-y-5">
          {/* 1. Carte Enseignant Pro Officielle */}
          <div className="rounded-3xl border p-5 space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> CARTE ENSEIGNANT OFFICIELLE
              </h3>
              <span className="text-[10px] font-bold text-slate-400">2026–2027</span>
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
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${cardPreviewFace === 'front' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'}`}
                >
                  Recto
                </button>
                <button
                  onClick={() => setCardPreviewFace('back')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${cardPreviewFace === 'back' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300'}`}
                >
                  Verso
                </button>
              </div>
            </div>
          </div>

          {/* 2. Access Rapide Documents */}
          <div className="rounded-3xl border p-5 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <Folder className="w-4 h-4" /> DOSSIER DOCUMENTS
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                Numérisé
              </span>
            </div>

            <div className="p-4 rounded-2xl border text-center space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <Folder className="w-8 h-8 text-indigo-500 mx-auto" />
              <p className="text-xs font-bold">Pièces justificatives & Certificats</p>
              <button
                onClick={() => setDocsModalOpen(true)}
                className="w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                Gérer les Documents
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
    </div>
  );
};
