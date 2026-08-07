import React, { useState } from 'react';
import {
  X, User, Phone, Mail, MapPin, Calendar, Briefcase,
  BookOpen, DollarSign, Hash, Edit2, Trash2, AlertTriangle, Folder, Award, School
} from 'lucide-react';
import { MembrePersonnel } from '../../types';
import { StaffDocumentsModal } from './StaffDocumentsModal';

interface TeacherDetailDrawerProps {
  teacher: MembrePersonnel | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (teacher: MembrePersonnel) => void;
  onDelete: (teacher: MembrePersonnel) => void;
}

const avatarColor = (name: string): string => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981',
    '#06b6d4', '#3b82f6', '#84cc16', '#f59e0b', '#ef4444',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (p: MembrePersonnel): string =>
  `${p.prenom?.[0] || ''}${p.nom?.[0] || ''}`.toUpperCase();

const gradeLabel: Record<string, string> = {
  AGREGE: 'Agrégé EPST', LICENCIE: 'Licencié', GRADUAT: 'Gradué',
  DES: 'DES / Master', DOCTEUR: 'Docteur (PhD)', AUTRE: 'Autre',
};

const contratLabel: Record<string, string> = {
  PERMANENT: 'Permanent / CDI', VACATAIRE: 'Vacataire / CDD',
  INTERIMAIRE: 'Intérimaire', BENEVOLE: 'Bénévole',
};

const roleLabel: Record<string, string> = {
  ENSEIGNANT: 'Enseignant / Professeur', COMPTABLE: 'Comptable / Intendant',
  PREFET: 'Préfet des Études', SURVEILLANT: 'Surveillant / Discipline',
  DE: 'Directeur des Études', ADMIN: 'Personnel Administratif',
};

type DrawerTab = 'identite' | 'disciplines' | 'remuneration' | 'contrat';

const InfoRow: React.FC<{ icon: React.ElementType; label: string; value?: string | null }> = ({
  icon: Icon, label, value,
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
      >
        <Icon className="w-3.5 h-3.5 text-indigo-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <p className="text-sm font-semibold mt-0.5 break-words" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
      </div>
    </div>
  );
};

export const TeacherDetailDrawer: React.FC<TeacherDetailDrawerProps> = ({
  teacher, isOpen, onClose, onEdit, onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('identite');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);

  if (!teacher) return null;

  const color = avatarColor(`${teacher.prenom}${teacher.nom}`);
  const ini = initials(teacher);

  const statutBadgeMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
    ACTIF: { label: 'Actif', bg: 'rgba(16,185,129,0.10)', color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    EN_CONGE: { label: 'En congé', bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    SUSPENDU: { label: 'Suspendu', bg: 'rgba(239,68,68,0.10)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    INACTIF: { label: 'Inactif', bg: 'rgba(239,68,68,0.10)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  };
  const statutBadge = statutBadgeMap[teacher.statut] || statutBadgeMap.ACTIF;

  const tabs: { id: DrawerTab; label: string; icon: React.ElementType }[] = [
    { id: 'identite', label: 'Identité', icon: User },
    { id: 'disciplines', label: 'Affectation', icon: BookOpen },
    { id: 'remuneration', label: 'Salaire', icon: DollarSign },
    { id: 'contrat', label: 'Contrat', icon: Hash },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: 420,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {/* Close */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Fiche Personnel & Dossier
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-sunken)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Avatar & Identity */}
          <div className="flex items-center gap-4">
            {teacher.avatarUrl ? (
              <img
                src={teacher.avatarUrl}
                alt={`${teacher.prenom} ${teacher.nom}`}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500 shadow-md shrink-0"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black text-white shrink-0 shadow-lg"
                style={{ background: color }}
              >
                {ini}
              </div>
            )}

            <div className="min-w-0">
              <h2 className="text-base font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
                {teacher.prenom} {teacher.postnom ? `${teacher.postnom} ` : ''}{teacher.nom}
              </h2>
              <p className="text-xs mt-0.5 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {roleLabel[teacher.role] || teacher.role}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                  style={{
                    background: statutBadge.bg,
                    color: statutBadge.color,
                    border: `1px solid ${statutBadge.border}`,
                  }}
                >
                  {statutBadge.label}
                </span>
                {teacher.grade && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      background: 'rgba(99,102,241,0.08)',
                      color: '#6366f1',
                      border: '1px solid rgba(99,102,241,0.18)',
                    }}
                  >
                    {gradeLabel[teacher.grade] || teacher.grade}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bouton Dossier Numérique */}
          <button
            type="button"
            onClick={() => setDocsModalOpen(true)}
            className="w-full mt-4 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-xs"
            style={{
              background: 'rgba(99,102,241,0.06)',
              borderColor: 'rgba(99,102,241,0.20)',
              color: '#6366f1',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.06)')}
          >
            <Folder className="w-4 h-4" />
            Dossier Numérique (Diplômes, CV, Contrat)
          </button>

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onEdit(teacher)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: 'rgba(99,102,241,0.10)',
                color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              <Edit2 className="w-3.5 h-3.5" /> Modifier la fiche
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.18)',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 px-4 py-2 gap-1"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {tabs.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all"
                style={{
                  background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  color: active ? '#6366f1' : 'var(--text-secondary)',
                  border: active ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                }}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {/* Identité */}
          {activeTab === 'identite' && (
            <div className="space-y-0 animate-fade-in">
              <InfoRow icon={User} label="Nom complet" value={`${teacher.prenom} ${teacher.postnom || ''} ${teacher.nom}`.trim()} />
              <InfoRow icon={User} label="Genre" value={teacher.genre === 'M' ? 'Masculin' : teacher.genre === 'F' ? 'Féminin' : undefined} />
              <InfoRow icon={Calendar} label="Date de naissance" value={teacher.dateNaissance} />
              <InfoRow icon={MapPin} label="Lieu de naissance" value={teacher.lieuNaissance} />
              <InfoRow icon={MapPin} label="Nationalité" value={teacher.nationalite} />
              <InfoRow icon={Phone} label="Téléphone principal" value={teacher.telephone} />
              <InfoRow icon={Phone} label="Téléphone secondaire" value={teacher.telephoneSecondaire} />
              <InfoRow icon={Mail} label="Adresse e-mail" value={teacher.email} />
              <InfoRow icon={MapPin} label="Adresse physique" value={teacher.adresse} />
              {teacher.notesBiographiques && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Notes biographiques
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {teacher.notesBiographiques}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Affectations, Competences, Cycles, Options */}
          {activeTab === 'disciplines' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Grade & Qualifications
                </p>
                <InfoRow icon={Briefcase} label="Grade" value={gradeLabel[teacher.grade || ''] || teacher.grade} />
                <InfoRow icon={BookOpen} label="Diplôme" value={teacher.diplome} />
                <InfoRow icon={BookOpen} label="Spécialité" value={teacher.specialite} />
              </div>

              {/* Qualités & Compétences */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Award className="w-3.5 h-3.5 text-emerald-500" /> Qualités & Compétences
                </p>
                {(teacher.qualitesCompetences || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(teacher.qualitesCompetences || []).map(c => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-md text-xs font-bold"
                        style={{
                          background: 'rgba(16,185,129,0.10)',
                          color: '#10b981',
                          border: '1px solid rgba(16,185,129,0.20)',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>Non renseignées</p>
                )}
              </div>

              {/* Cycles d'intervention */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <School className="w-3.5 h-3.5 text-indigo-500" /> Cycles scolaires d'intervention
                </p>
                {(teacher.cyclesAssignes || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(teacher.cyclesAssignes || []).map(cy => (
                      <span
                        key={cy}
                        className="px-2.5 py-1 rounded-md text-xs font-bold"
                        style={{
                          background: 'rgba(99,102,241,0.10)',
                          color: '#6366f1',
                          border: '1px solid rgba(99,102,241,0.20)',
                        }}
                      >
                        {cy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>Tous cycles</p>
                )}
              </div>

              {/* Options & Classes */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Options & Classes attribuées
                </p>
                {(teacher.classesAssignees || []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(teacher.classesAssignees || []).map(c => (
                      <span
                        key={c}
                        className="px-2.5 py-1 rounded-md text-xs font-bold"
                        style={{
                          background: 'rgba(99,102,241,0.08)',
                          color: '#6366f1',
                          border: '1px solid rgba(99,102,241,0.18)',
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic mb-2" style={{ color: 'var(--text-secondary)' }}>Aucune classe directe assignée</p>
                )}
              </div>
            </div>
          )}

          {/* Rémunération */}
          {activeTab === 'remuneration' && (
            <div className="animate-fade-in">
              <div
                className="rounded-2xl p-4 mb-4 text-center border"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
              >
                <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Salaire de base mensuel
                </p>
                <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                  {(teacher.salaireBase || 0).toLocaleString()}
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {teacher.devise}
                </p>
              </div>
              <InfoRow icon={Hash} label="Type de contrat" value={contratLabel[teacher.typeContrat || ''] || teacher.typeContrat} />
              <InfoRow icon={Calendar} label="Date d'embauche" value={teacher.dateEmbauche} />
              <InfoRow icon={Calendar} label="Fin de contrat" value={teacher.dateFinContrat} />
            </div>
          )}

          {/* Contrat */}
          {activeTab === 'contrat' && (
            <div className="animate-fade-in">
              <InfoRow icon={Hash} label="Matricule EPST RDC" value={teacher.numeroMatriculeEPST} />
              <InfoRow icon={Hash} label="Numéro INSS / CNSS" value={teacher.numeroINSS} />
              <InfoRow icon={Calendar} label="Date d'embauche" value={teacher.dateEmbauche} />
              <InfoRow icon={Calendar} label="Fin de contrat" value={teacher.dateFinContrat} />
              <InfoRow icon={Calendar} label="Créé le" value={teacher.creeLe} />

              <div
                className="mt-4 rounded-xl p-3 flex items-center gap-3 border"
                style={{
                  background: statutBadge.bg,
                  borderColor: statutBadge.border,
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: statutBadge.color }}
                />
                <p className="text-sm font-black" style={{ color: statutBadge.color }}>
                  Statut : {statutBadge.label}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setConfirmDelete(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 text-center animate-scale-in border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 border"
              style={{ background: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.20)' }}
            >
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              Supprimer cette fiche ?
            </h3>
            <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              La fiche de <strong>{teacher.prenom} {teacher.nom}</strong> sera définitivement supprimée.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => { setConfirmDelete(false); onDelete(teacher); }}
                className="flex-1 py-2 rounded-lg text-sm font-bold text-white transition-all"
                style={{ background: '#ef4444' }}
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dossier Numérique */}
      <StaffDocumentsModal
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
        staff={teacher}
      />
    </>
  );
};
