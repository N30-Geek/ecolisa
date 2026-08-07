import React, { useState, useEffect } from 'react';
import { X, User, Camera, Mail, Phone, Briefcase, Award, Calendar, DollarSign, ShieldCheck, Check, Upload } from 'lucide-react';
import { MembrePersonnel, RôleSystème } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { WebcamCaptureModal } from '../common/WebcamCaptureModal';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: MembrePersonnel) => Promise<void>;
  staffToEdit?: MembrePersonnel | null;
}

const roleOptions: SelectOption[] = [
  { value: 'ENSEIGNANT', label: 'Enseignant / Professeur de Cours', icon: Briefcase },
  { value: 'DE', label: 'Directeur des Études (DE)', icon: ShieldCheck },
  { value: 'SURVEILLANT', label: 'Directeur de Discipline (DD) / Surveillant', icon: ShieldCheck },
  { value: 'PREFET', label: 'Préfet des Études / Directeur d’Établissement', icon: ShieldCheck },
  { value: 'COMPTABLE', label: 'Comptable Intendant Général', icon: DollarSign },
  { value: 'ADMIN', label: 'Administrateur Général / Secrétariat', icon: ShieldCheck },
];

const genderOptions: SelectOption[] = [
  { value: 'M', label: 'Masculin (M)' },
  { value: 'F', label: 'Féminin (F)' },
];

const currencyOptions: SelectOption[] = [
  { value: 'USD', label: 'Dollar Américain (USD $)' },
  { value: 'CDF', label: 'Franc Congolais (CDF FC)' },
];

const statusOptions: SelectOption[] = [
  { value: 'ACTIF', label: 'Actif en Poste', badge: 'EN SERVICE' },
  { value: 'EN_CONGE', label: 'En Congé Réglementaire' },
  { value: 'SUSPENDU', label: 'Suspendu / Inactif' },
];

export const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSave,
  staffToEdit,
}) => {
  const [formData, setFormData] = useState<Partial<MembrePersonnel>>({
    matricule: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
    prenom: '',
    nom: '',
    postnom: '',
    sexe: 'M',
    telephone: '',
    email: '',
    role: 'ENSEIGNANT',
    qualification: 'Licencié en Pédagogie',
    specialite: '',
    dateEmbauche: new Date().toISOString().split('T')[0],
    salaireBase: 350,
    devise: 'USD',
    statut: 'ACTIF',
    photoUrl: '',
  });

  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (staffToEdit) {
      setFormData({ ...staffToEdit });
    } else {
      setFormData({
        matricule: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
        prenom: '',
        nom: '',
        postnom: '',
        sexe: 'M',
        telephone: '',
        email: '',
        role: 'ENSEIGNANT',
        qualification: 'Licencié en Pédagogie',
        specialite: '',
        dateEmbauche: new Date().toISOString().split('T')[0],
        salaireBase: 350,
        devise: 'USD',
        statut: 'ACTIF',
        photoUrl: '',
      });
    }
  }, [staffToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prenom || !formData.nom) {
      setErrorMessage('Le prénom et le nom de famille sont obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const mappedRole: MembrePersonnel['role'] = (formData.role as MembrePersonnel['role']) || 'ENSEIGNANT';

      const fullStaff: MembrePersonnel = {
        id: staffToEdit?.id || `staff_${Date.now()}`,
        numeroMatriculeEPST: formData.matricule || formData.numeroMatriculeEPST || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
        matricule: formData.matricule || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
        prenom: formData.prenom || '',
        nom: formData.nom || '',
        postnom: formData.postnom || '',
        genre: (formData.sexe || formData.genre || 'M') as 'M' | 'F',
        sexe: (formData.sexe || formData.genre || 'M') as 'M' | 'F',
        telephone: formData.telephone || '',
        email: formData.email || '',
        role: mappedRole,
        diplome: formData.qualification || formData.diplome || '',
        qualification: formData.qualification || '',
        specialite: formData.specialite || '',
        dateEmbauche: formData.dateEmbauche || new Date().toISOString().split('T')[0],
        salaireBase: Number(formData.salaireBase) || 0,
        devise: (formData.devise as 'USD' | 'CDF') || 'USD',
        statut: (formData.statut as any) || 'ACTIF',
        avatarUrl: formData.photoUrl || formData.avatarUrl || '',
        photoUrl: formData.photoUrl || formData.avatarUrl || '',
      };

      await onSave(fullStaff);
      onClose();
    } catch (err: any) {
      console.error('[StaffModal] Erreur de sauvegarde :', err);
      setErrorMessage(err?.message || 'Une erreur est survenue lors de l’enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
        <div
          className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {/* En-tête de la Modale */}
          <div className="flex items-center justify-between p-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {staffToEdit ? 'Modifier la Fiche du Personnel' : 'Nouveau Membre du Personnel'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enregistrement administratif, photo de profil et affectation des rôles
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-500/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulaire défilant */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto sidebar-scroll space-y-6 flex-1">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            {/* Photo de Profil & Boutons de Capture */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="relative group shrink-0">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Photo Personnel"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/40 flex items-center justify-center text-indigo-500 font-extrabold text-2xl">
                    {formData.prenom ? formData.prenom[0].toUpperCase() : 'P'}
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Photo Officielle d’Identité
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prenez la photo directement via la WebCam intégrée ou téléversez un fichier image (JPG/PNG).
                </p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsWebcamOpen(true)}
                    className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-500/40"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <span>Prendre via WebCam</span>
                  </button>

                  <label className="px-3.5 py-2 rounded-lg border text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-500/10 transition-all flex items-center gap-1.5 cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span>Choisir une Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            </div>

            {/* Identités Principales */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                1. Identité & Numéro de Matricule
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Matricule Officiel *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.matricule || ''}
                    onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Jean-Paul"
                    value={formData.prenom || ''}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Nom de Famille *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: KABAMBA"
                    value={formData.nom || ''}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Postnom (Facultatif)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: MBUYI"
                    value={formData.postnom || ''}
                    onChange={(e) => setFormData({ ...formData, postnom: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Genre / Sexe *
                  </label>
                  <CustomSelect
                    options={genderOptions}
                    value={formData.sexe || 'M'}
                    onChange={(v) => setFormData({ ...formData, sexe: v as 'M' | 'F' })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Statut d'Activité
                  </label>
                  <CustomSelect
                    options={statusOptions}
                    value={formData.statut || 'ACTIF'}
                    onChange={(v) => setFormData({ ...formData, statut: v as any })}
                  />
                </div>
              </div>
            </div>

            {/* Affectation Professionnelle & Qualifications */}
            <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                2. Affectation Professionnelle & Rôle
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Rôle & Fonction Système *
                  </label>
                  <CustomSelect
                    options={roleOptions}
                    value={(formData.role as string) || 'ENSEIGNANT'}
                    onChange={(v) => setFormData({ ...formData, role: v as any })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Diplôme & Qualification Académique
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Licencié en Mathématique-Physique / ISP"
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Spécialité / Discipline Principale
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Mathématiques & Physique Appliquée"
                    value={formData.specialite || ''}
                    onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Date d’Embauche / Prise de Fonction
                  </label>
                  <CustomDatePicker
                    value={formData.dateEmbauche || new Date().toISOString().split('T')[0]}
                    onChange={(d) => setFormData({ ...formData, dateEmbauche: d })}
                  />
                </div>
              </div>
            </div>

            {/* Coordonnées & Rémunération */}
            <div className="space-y-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                3. Coordonnées & Rémunération Contractuelle
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Téléphone Principal (WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="ex: +243 81 234 56 78"
                    value={formData.telephone || ''}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Adresse E-mail Professionnelle
                  </label>
                  <input
                    type="email"
                    placeholder="ex: prof.kabamba@ecolisa.edu"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Salaire de Base Mensuel
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formData.salaireBase || 0}
                    onChange={(e) => setFormData({ ...formData, salaireBase: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all focus:ring-2 focus:ring-indigo-500 outline-none"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Devise de Paie
                  </label>
                  <CustomSelect
                    options={currencyOptions}
                    value={formData.devise || 'USD'}
                    onChange={(v) => setFormData({ ...formData, devise: v as 'USD' | 'CDF' })}
                  />
                </div>
              </div>
            </div>

            {/* Pied de page actions */}
            <div className="pt-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-500/10 transition-all cursor-pointer"
                style={{ borderColor: 'var(--border)' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{staffToEdit ? 'Enregistrer les Modifications' : 'Créer le Membre du Personnel'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modale de prise de photo WebCam */}
      <WebcamCaptureModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={(img) => setFormData((prev) => ({ ...prev, photoUrl: img }))}
        title={`Prise de photo pour ${formData.prenom || ''} ${formData.nom || 'Personnel'}`}
      />
    </>
  );
};
