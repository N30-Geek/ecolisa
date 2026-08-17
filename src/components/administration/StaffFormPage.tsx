import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Camera, Upload, Check, Briefcase, ShieldCheck, DollarSign,
  Heart, Users, Calendar, Building, FileText, CreditCard, Phone, Mail, MapPin, Award,
  ChevronRight, ChevronLeft, QrCode, AlertCircle, BadgeAlert, Baby, Droplet, Activity,
  Stethoscope, UserCheck, Sparkles, Building2, Wallet, AlertTriangle, BookOpen
} from 'lucide-react';
import { MembrePersonnel, TypeContratPersonnel, GradeEnseignant } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { NumberInput } from '../common/NumberInput';
import { PhoneInput } from '../common/PhoneInput';
import { WebcamCaptureModal } from '../common/WebcamCaptureModal';

interface StaffFormPageProps {
  staffToEdit?: MembrePersonnel | null;
  targetCategory?: 'ENSEIGNANT' | 'STAFF';
  onBack: () => void;
  onSave: (staff: MembrePersonnel) => Promise<void>;
}

// Options pour CustomSelect
const roleOptions: SelectOption[] = [
  { value: 'ENSEIGNANT', label: 'Enseignant / Professeur de Cours', icon: Briefcase },
  { value: 'DE', label: 'Directeur des Études (DE)', icon: ShieldCheck },
  { value: 'SURVEILLANT', label: 'Directeur de Discipline (DD) / Surveillant', icon: ShieldCheck },
  { value: 'PREFET', label: 'Préfet des Études / Dir. Établissement', icon: ShieldCheck },
  { value: 'COMPTABLE', label: 'Comptable Intendant Général', icon: DollarSign },
  { value: 'ADMIN', label: 'Administrateur Général / Secrétariat', icon: ShieldCheck },
];

const genderOptions: SelectOption[] = [
  { value: 'M', label: 'Masculin (M)' },
  { value: 'F', label: 'Féminin (F)' },
];

const nationaliteOptions: SelectOption[] = [
  { value: 'Congolaise (RDC)', label: 'Congolaise (RDC)' },
  { value: 'Étrangère (Afrique)', label: 'Étrangère (Afrique)' },
  { value: 'Étrangère (International)', label: 'Étrangère (Europe/International)' },
];

const contratOptions: SelectOption[] = [
  { value: 'PERMANENT', label: 'Contrat à Durée Indéterminée (CDI Permanent)' },
  { value: 'VACATAIRE', label: 'Vacataire / Prestataire de Cours (CDD)' },
  { value: 'BENEVOLE', label: 'Bénévolat / Mission Spéciale' },
  { value: 'INTERIMAIRE', label: 'Interimaire / Remplacement' },
];

const etatCivilOptions: SelectOption[] = [
  { value: 'CELIBATAIRE', label: 'Célibataire' },
  { value: 'MARIE', label: 'Marié(e)' },
  { value: 'VEUF', label: 'Veuf / Veuve' },
  { value: 'DIVORCE', label: 'Divorcé(e)' },
];

const gradeOptions: SelectOption[] = [
  { value: 'LICENCIE', label: 'Licencié (Bac +5 / Master 1)' },
  { value: 'GRADUE', label: 'Gradué (Bac +3)' },
  { value: 'DOCTEUR', label: 'Docteur (PhD)' },
  { value: 'DES', label: 'DES / Master 2 Spécialisé' },
  { value: 'AGREGE', label: 'Agrégé de l’Enseignement EPST' },
  { value: 'AUTRE', label: 'Autre Qualification' },
];

const groupeSanguinOptions: SelectOption[] = [
  { value: 'O+', label: 'O+ (Donneur Universel)' },
  { value: 'A+', label: 'A+' },
  { value: 'B+', label: 'B+' },
  { value: 'AB+', label: 'AB+' },
  { value: 'O-', label: 'O- (Donneur Universel Rares)' },
  { value: 'A-', label: 'A-' },
  { value: 'B-', label: 'B-' },
  { value: 'AB-', label: 'AB-' },
];

const lienParentOptions: SelectOption[] = [
  { value: 'Époux/Épouse', label: 'Époux / Épouse (Conjoint)' },
  { value: 'Père/Mère', label: 'Père / Mère' },
  { value: 'Frère/Sœur', label: 'Frère / Sœur' },
  { value: 'Fils/Fille', label: 'Enfant Majeur (Fils/Fille)' },
  { value: 'Oncle/Tante', label: 'Oncle / Tante' },
  { value: 'Proche Ami', label: 'Ami(e) Proche / Collègue' },
  { value: 'Tuteur Légale', label: 'Tuteur / Représentant Légal' },
];

const paymentModeOptions: SelectOption[] = [
  { value: 'BANQUE', label: 'Virement Bancaire (Compte Banque)' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (M-Pesa / Orange / Airtel)' },
  { value: 'CASH_CAISSE', label: 'Paiement Cash en Caisse' },
];

const banqueNomOptions: SelectOption[] = [
  { value: 'Rawbank RDC', label: 'Rawbank RDC' },
  { value: 'Equity BCDC', label: 'Equity BCDC' },
  { value: 'Trust Merchant Bank (TMB)', label: 'Trust Merchant Bank (TMB)' },
  { value: 'IllicoCash / Rawbank', label: 'IllicoCash' },
  { value: 'Bank of Africa (BOA)', label: 'Bank of Africa (BOA)' },
  { value: 'Ecobank RDC', label: 'Ecobank RDC' },
  { value: 'Access Bank RDC', label: 'Access Bank RDC' },
];

const mobileOperatorOptions: SelectOption[] = [
  { value: 'M-Pesa', label: 'Vodacom M-Pesa' },
  { value: 'Orange Money', label: 'Orange Money RDC' },
  { value: 'Airtel Money', label: 'Airtel Money RDC' },
];

const currencyOptions: SelectOption[] = [
  { value: 'USD', label: 'Dollar Américain (USD $)' },
  { value: 'CDF', label: 'Franc Congolais (CDF FC)' },
];

const statusOptions: SelectOption[] = [
  { value: 'ACTIF', label: 'Actif en Poste (En Service)' },
  { value: 'EN_CONGE', label: 'En Congé Réglementaire' },
  { value: 'SUSPENDU', label: 'Suspendu / Inactif' },
];

export const StaffFormPage: React.FC<StaffFormPageProps> = ({
  staffToEdit,
  targetCategory = 'STAFF',
  onBack,
  onSave,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [previewTab, setPreviewTab] = useState<'BADGE' | 'SYNTHESE'>('BADGE');

  const [formData, setFormData] = useState<Partial<MembrePersonnel>>({
    matricule: staffToEdit?.matricule || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
    numeroMatriculeEPST: staffToEdit?.numeroMatriculeEPST || `EPST-RDC-${Math.floor(10000 + Math.random() * 90000)}`,
    prenom: '',
    nom: '',
    postnom: '',
    sexe: 'M',
    genre: 'M',
    dateNaissance: '1990-01-01',
    lieuNaissance: 'Kinshasa',
    nationalite: 'Congolaise (RDC)',
    adresse: '',
    telephone: '',
    telephoneSecondaire: '',
    email: '',
    // État Civil & Famille
    etatCivil: 'CELIBATAIRE',
    nomConjoint: '',
    nombreEnfantsACharge: 0,
    nombreEnfantsEtablissement: 0,
    nomsEnfantsEtablissement: '',
    // Contrat & Rôle
    role: targetCategory === 'ENSEIGNANT' ? 'ENSEIGNANT' : 'ADMIN',
    statut: 'ACTIF',
    typeContrat: 'PERMANENT',
    dateEmbauche: new Date().toISOString().split('T')[0],
    dateFinContrat: '',
    numeroINSS: '',
    grade: 'LICENCIE',
    qualification: 'Licencié en Pédagogie',
    diplome: 'Licence EPST',
    specialite: '',
    disciplines: [],
    classesAssignees: [],
    cyclesAssignes: [],
    personnelEnCharge: '',
    // Paie
    salaireBase: 350,
    devise: 'USD',
    modeVersementSalaire: 'BANQUE',
    banqueNom: 'Rawbank RDC',
    numeroCompteBancaire: '',
    mobileMoneyOperateur: 'M-Pesa',
    mobileMoneyNumero: '',
    // Santé & Urgences
    groupeSanguin: 'O+',
    allergies: '',
    antecedentsMedicaux: '',
    medecinTraitant: '',
    centreSanteRef: '',
    contactUrgenceNom: '',
    contactUrgenceLien: 'Époux/Épouse',
    contactUrgenceTelephone: '',
    contactUrgenceAdresse: '',
    referenceProfessionnelle: '',
    referenceContact: '',
    referenceOrganisme: '',
    photoUrl: '',
    avatarUrl: '',
    notesBiographiques: '',
  });

  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Charger le membre en cours d'édition
  useEffect(() => {
    if (staffToEdit) {
      setFormData({
        ...staffToEdit,
        sexe: staffToEdit.sexe || staffToEdit.genre || 'M',
        genre: staffToEdit.genre || staffToEdit.sexe || 'M',
        photoUrl: staffToEdit.photoUrl || staffToEdit.avatarUrl || '',
        avatarUrl: staffToEdit.avatarUrl || staffToEdit.photoUrl || '',
      });
    }
  }, [staffToEdit]);

  // Calcul du taux de complétude du dossier
  const completionPercentage = React.useMemo(() => {
    const requiredFields = [
      formData.prenom,
      formData.nom,
      formData.sexe,
      formData.telephone,
      formData.role,
      formData.typeContrat,
      formData.contactUrgenceNom,
      formData.contactUrgenceTelephone,
    ];
    const filled = requiredFields.filter((f) => Boolean(f) && String(f).trim() !== '').length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [formData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.prenom || !formData.nom) {
      setErrorMessage('Le prénom et le nom de famille sont obligatoires pour enregistrer le dossier.');
      setCurrentStep(1);
      return;
    }

    if (!formData.telephone) {
      setErrorMessage('Le numéro de téléphone principal est obligatoire.');
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const mappedRole: MembrePersonnel['role'] = (formData.role as MembrePersonnel['role']) || 'ENSEIGNANT';
      const selectedSexe = (formData.sexe || formData.genre || 'M') as 'M' | 'F';

      const fullStaff: MembrePersonnel = {
        id: staffToEdit?.id || `staff_${Date.now()}`,
        numeroMatriculeEPST: formData.numeroMatriculeEPST || `EPST-RDC-${Math.floor(10000 + Math.random() * 90000)}`,
        matricule: formData.matricule || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
        prenom: formData.prenom || '',
        nom: formData.nom || '',
        postnom: formData.postnom || '',
        genre: selectedSexe,
        sexe: selectedSexe,
        dateNaissance: formData.dateNaissance || '',
        lieuNaissance: formData.lieuNaissance || '',
        nationalite: formData.nationalite || 'Congolaise (RDC)',
        adresse: formData.adresse || '',
        telephone: formData.telephone || '',
        telephoneSecondaire: formData.telephoneSecondaire || '',
        email: formData.email || '',
        // État Civil & Famille
        etatCivil: (formData.etatCivil as any) || 'CELIBATAIRE',
        nomConjoint: formData.nomConjoint || '',
        nombreEnfantsACharge: Number(formData.nombreEnfantsACharge) || 0,
        nombreEnfantsEtablissement: Number(formData.nombreEnfantsEtablissement) || 0,
        nomsEnfantsEtablissement: formData.nomsEnfantsEtablissement || '',
        // Rôle & Contrat
        role: mappedRole,
        typeContrat: (formData.typeContrat as TypeContratPersonnel) || 'PERMANENT',
        dateEmbauche: formData.dateEmbauche || new Date().toISOString().split('T')[0],
        dateFinContrat: formData.dateFinContrat || '',
        numeroINSS: formData.numeroINSS || '',
        grade: (formData.grade as GradeEnseignant) || 'LICENCIE',
        diplome: formData.diplome || formData.qualification || '',
        qualification: formData.qualification || formData.diplome || '',
        specialite: formData.specialite || '',
        disciplines: formData.disciplines || [],
        classesAssignees: formData.classesAssignees || [],
        cyclesAssignes: formData.cyclesAssignes || [],
        personnelEnCharge: formData.personnelEnCharge || '',
        // Paie
        modeVersementSalaire: formData.modeVersementSalaire || 'BANQUE',
        banqueNom: formData.banqueNom || '',
        numeroCompteBancaire: formData.numeroCompteBancaire || '',
        mobileMoneyOperateur: formData.mobileMoneyOperateur || '',
        mobileMoneyNumero: formData.mobileMoneyNumero || '',
        salaireBase: Number(formData.salaireBase) || 0,
        devise: (formData.devise as string) || 'USD',
        statut: (formData.statut as any) || 'ACTIF',
        // Santé & Urgences
        groupeSanguin: (formData.groupeSanguin as any) || 'O+',
        allergies: formData.allergies || '',
        antecedentsMedicaux: formData.antecedentsMedicaux || '',
        medecinTraitant: formData.medecinTraitant || '',
        centreSanteRef: formData.centreSanteRef || '',
        contactUrgenceNom: formData.contactUrgenceNom || '',
        contactUrgenceLien: formData.contactUrgenceLien || '',
        contactUrgenceTelephone: formData.contactUrgenceTelephone || '',
        contactUrgenceAdresse: formData.contactUrgenceAdresse || '',
        referenceProfessionnelle: formData.referenceProfessionnelle || '',
        referenceContact: formData.referenceContact || '',
        referenceOrganisme: formData.referenceOrganisme || '',
        avatarUrl: formData.photoUrl || formData.avatarUrl || '',
        photoUrl: formData.photoUrl || formData.avatarUrl || '',
        notesBiographiques: formData.notesBiographiques || '',
      };

      await onSave(fullStaff);
    } catch (err: any) {
      console.error('[StaffFormPage] Erreur enregistrement :', err);
      setErrorMessage(err?.message || 'Erreur lors de l’enregistrement du dossier.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, photoUrl: result, avatarUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  // Label court du rôle
  const getRoleBadge = (roleStr?: string) => {
    switch (roleStr) {
      case 'ENSEIGNANT':
        return { label: 'Enseignant / Professeur', bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' };
      case 'PREFET':
        return { label: 'Préfet des Études', bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' };
      case 'DE':
        return { label: 'Directeur des Études', bg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' };
      case 'SURVEILLANT':
        return { label: 'Dir. Discipline / Surveillant', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' };
      case 'COMPTABLE':
        return { label: 'Comptable Intendant', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
      default:
        return { label: 'Administrateur', bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' };
    }
  };

  const roleMeta = getRoleBadge(formData.role);

  return (
    <div className="space-y-6 animate-fade-in w-full pb-16">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer hover:bg-slate-500/10"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          <span>{staffToEdit ? 'Retour au Profil' : 'Retour au Répertoire'}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fiche Officielle du Personnel EPST (3 Étapes)</span>
          </div>
        </div>
      </div>

      {/* Grid à 2 colonnes (Split 50/50 ou Formulaire + Live Preview Sticky) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_450px] gap-6 items-start">
        {/* COLONNE GAUCHE : Formulaire pas-à-pas en 3 étapes */}
        <div
          className="p-6 sm:p-8 rounded-2xl border shadow-xs transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {/* Titre & Indicateur d'étape */}
          <div className="pb-6 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {staffToEdit
                    ? `Édition : ${staffToEdit.prenom} ${staffToEdit.nom}`
                    : 'Nouveau Dossier d’Agent / Enseignant'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Renseignez les données personnelles, professionnelles, médicales et familiales de l’agent.
                </p>
              </div>
            </div>

            {/* Barre de navigation des 3 étapes */}
            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentStep === 1
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">1</span>
                <span className="truncate">Identité & Famille</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentStep === 2
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">2</span>
                <span className="truncate">Contrat & Paie</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  currentStep === 3
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">3</span>
                <span className="truncate">Santé & Urgences</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Formulaire Multi-Étapes */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ÉTAPE 1 : IDENTITÉ, ÉTAT CIVIL & FAMILLE */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Photo Studio & Upload */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="relative shrink-0">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Photo Agent"
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-indigo-500 shadow-md"
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/40 flex items-center justify-center text-indigo-500 font-black text-4xl">
                        {formData.prenom ? formData.prenom[0].toUpperCase() : 'A'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 flex-1 text-center sm:text-left">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Photo d’Identité Officielle
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Prenez une photo en direct par Webcam ou importez un fichier image JPEG/PNG.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsWebcamOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Prendre par WebCam</span>
                      </button>
                      <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer hover:bg-slate-500/10" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                        <Upload className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Importer Image</span>
                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section Identifiants Administratifs */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Identifiants Administratifs RDC</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        N° Matricule Interne Établissement
                      </label>
                      <input
                        type="text"
                        value={formData.matricule || ''}
                        onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                        placeholder="Ex: STF-9482"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        N° Matricule Officiel EPST RDC
                      </label>
                      <input
                        type="text"
                        value={formData.numeroMatriculeEPST || ''}
                        onChange={(e) => setFormData({ ...formData, numeroMatriculeEPST: e.target.value })}
                        placeholder="Ex: EPST-RDC-83921"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Identité Personnelle */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>Identité Civique de l'Agent</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Prénom <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.prenom || ''}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        placeholder="Prénom de l'agent"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nom de Famille <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nom || ''}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value.toUpperCase() })}
                        placeholder="NOM DE FAMILLE"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Postnom (Optionnel)
                      </label>
                      <input
                        type="text"
                        value={formData.postnom || ''}
                        onChange={(e) => setFormData({ ...formData, postnom: e.target.value })}
                        placeholder="Postnom"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Sexe / Genre <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        options={genderOptions}
                        value={formData.sexe || formData.genre || 'M'}
                        onChange={(val) => setFormData({ ...formData, sexe: val as 'M' | 'F', genre: val as 'M' | 'F' })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Date de Naissance
                      </label>
                      <CustomDatePicker
                        value={formData.dateNaissance || '1990-01-01'}
                        onChange={(dateStr) => setFormData({ ...formData, dateNaissance: dateStr })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Lieu de Naissance
                      </label>
                      <input
                        type="text"
                        value={formData.lieuNaissance || ''}
                        onChange={(e) => setFormData({ ...formData, lieuNaissance: e.target.value })}
                        placeholder="Ex: Kinshasa, Lubumbashi"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nationalité
                      </label>
                      <CustomSelect
                        options={nationaliteOptions}
                        value={formData.nationalite || 'Congolaise (RDC)'}
                        onChange={(val) => setFormData({ ...formData, nationalite: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Adresse Résidentielle Physique
                      </label>
                      <input
                        type="text"
                        value={formData.adresse || ''}
                        onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                        placeholder="Avenue, N°, Quartier, Commune"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone Principal <span className="text-rose-500">*</span>
                      </label>
                      <PhoneInput
                        value={formData.telephone || ''}
                        onChange={(val) => setFormData({ ...formData, telephone: val })}
                        required
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone Secondaire / WhatsApp
                      </label>
                      <PhoneInput
                        value={formData.telephoneSecondaire || ''}
                        onChange={(val) => setFormData({ ...formData, telephoneSecondaire: val })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Adresse Email
                      </label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="agent@ecolisa.cd"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section État Civil & Famille */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>État Civil & Situation Familiale</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Statut État Civil
                      </label>
                      <CustomSelect
                        options={etatCivilOptions}
                        value={formData.etatCivil || 'CELIBATAIRE'}
                        onChange={(val) => setFormData({ ...formData, etatCivil: val as any })}
                      />
                    </div>

                    {formData.etatCivil === 'MARIE' && (
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          Nom du Conjoint(e) / Époux(se)
                        </label>
                        <input
                          type="text"
                          value={formData.nomConjoint || ''}
                          onChange={(e) => setFormData({ ...formData, nomConjoint: e.target.value })}
                          placeholder="Nom complet du conjoint"
                          className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nombre d'Enfants à Charge Total
                      </label>
                      <NumberInput
                        value={formData.nombreEnfantsACharge || 0}
                        onChange={v => setFormData({ ...formData, nombreEnfantsACharge: v })}
                        min={0}
                        integer
                        placeholder="0"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Enfants Scolarisés dans cet Établissement
                      </label>
                      <NumberInput
                        value={formData.nombreEnfantsEtablissement || 0}
                        onChange={v => setFormData({ ...formData, nombreEnfantsEtablissement: v })}
                        min={0}
                        integer
                        placeholder="0"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  {Number(formData.nombreEnfantsEtablissement) > 0 && (
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Prénoms & Classes des Enfants à l'École
                      </label>
                      <input
                        type="text"
                        value={formData.nomsEnfantsEtablissement || ''}
                        onChange={(e) => setFormData({ ...formData, nomsEnfantsEtablissement: e.target.value })}
                        placeholder="Ex: Jean (4e Primaire), Sarah (2e Maternelle)"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <span>Passer à l’Étape 2 (Contrat & Paie)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : PROFIL PROFESSIONNEL, CONTRAT & RÉMUNÉRATION */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Section Fonction & Affectation */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <span>Fonction & Statut de l'Agent</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Rôle / Fonction Principale <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        options={roleOptions}
                        value={formData.role || 'ENSEIGNANT'}
                        onChange={(val) => setFormData({ ...formData, role: val as any })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Statut d'Activité
                      </label>
                      <CustomSelect
                        options={statusOptions}
                        value={formData.statut || 'ACTIF'}
                        onChange={(val) => setFormData({ ...formData, statut: val as any })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Grade Académique / Diplôme Principal
                      </label>
                      <CustomSelect
                        options={gradeOptions}
                        value={formData.grade || 'LICENCIE'}
                        onChange={(val) => setFormData({ ...formData, grade: val as any })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Spécialité / Qualification Principale
                      </label>
                      <input
                        type="text"
                        value={formData.specialite || ''}
                        onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                        placeholder="Ex: Mathématique-Physique, Pédagogie"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Personnel en Charge / Responsabilités Encadrées
                    </label>
                    <input
                      type="text"
                      value={formData.personnelEnCharge || ''}
                      onChange={(e) => setFormData({ ...formData, personnelEnCharge: e.target.value })}
                      placeholder="Ex: Responsable des profs de sciences, Titulaire 6e Primaire, Supervision cantine"
                      className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Section Contrat de Travail */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Contrat de Travail & Sécurité Sociale</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Type de Contrat
                      </label>
                      <CustomSelect
                        options={contratOptions}
                        value={formData.typeContrat || 'PERMANENT'}
                        onChange={(val) => setFormData({ ...formData, typeContrat: val as any })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Date d'Embauche Prise de Service
                      </label>
                      <CustomDatePicker
                        value={formData.dateEmbauche || new Date().toISOString().split('T')[0]}
                        onChange={(d) => setFormData({ ...formData, dateEmbauche: d })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        N° Securité Sociale (CNSS / INSS RDC)
                      </label>
                      <input
                        type="text"
                        value={formData.numeroINSS || ''}
                        onChange={(e) => setFormData({ ...formData, numeroINSS: e.target.value })}
                        placeholder="N° CNSS / INSS RDC"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Rémunération & Calculateur Taux Horaire */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span>Conditions Salariales & Calculateur de Paie</span>
                    </h3>
                  </div>

                  {/* Calculateur interactif de Paie par Taux Horaire */}
                  <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/20 space-y-3">
                    <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Calculateur Automatique (Volume Hebdomadaire & Taux Horaire)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Volume Hebdo (h / sem.)
                        </label>
                        <NumberInput
                          value={formData.volumeHoraireHebdo || 18}
                          onChange={v => setFormData(prev => ({
                            ...prev,
                            volumeHoraireHebdo: v,
                            salaireBase: prev.modeRemuneration === 'TAUX_HORAIRE' ? Math.round(v * 4 * (prev.tauxHoraireBase || 6.5)) : prev.salaireBase
                          }))}
                          min={1}
                          integer
                          placeholder="18"
                          className="w-full px-3 py-1.5 rounded-lg text-xs font-bold border"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                          Taux Horaire ($ / h)
                        </label>
                        <NumberInput
                          value={formData.tauxHoraireBase || 6.5}
                          onChange={v => setFormData(prev => ({
                            ...prev,
                            tauxHoraireBase: v,
                            salaireBase: prev.modeRemuneration === 'TAUX_HORAIRE' ? Math.round((prev.volumeHoraireHebdo || 18) * 4 * v) : prev.salaireBase
                          }))}
                          min={0}
                          placeholder="6.5"
                          className="w-full px-3 py-1.5 rounded-lg text-xs font-bold border"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>

                      <div className="p-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/20 flex flex-col justify-center">
                        <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">Paie Mensuelle Estimée</span>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          {Math.round((formData.volumeHoraireHebdo || 18) * 4 * (formData.tauxHoraireBase || 6.5))} {formData.devise || 'USD'}
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-semibold">({(formData.volumeHoraireHebdo || 18) * 4}h prestées / mois)</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Salaire de Base Mensuel Fixé
                      </label>
                      <NumberInput
                        value={formData.salaireBase || 0}
                        onChange={v => setFormData({ ...formData, salaireBase: v })}
                        min={0}
                        placeholder="Salaire"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Devise de Paiement
                      </label>
                      <CustomSelect
                        options={currencyOptions}
                        value={formData.devise || 'USD'}
                        onChange={(val) => setFormData({ ...formData, devise: val as any })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Mode de Versement Salaire
                      </label>
                      <CustomSelect
                        options={paymentModeOptions}
                        value={formData.modeVersementSalaire || 'BANQUE'}
                        onChange={(val) => setFormData({ ...formData, modeVersementSalaire: val as any })}
                      />
                    </div>
                  </div>

                  {formData.modeVersementSalaire === 'BANQUE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          Nom de la Banque Partenaire
                        </label>
                        <CustomSelect
                          options={banqueNomOptions}
                          value={formData.banqueNom || 'Rawbank RDC'}
                          onChange={(val) => setFormData({ ...formData, banqueNom: val })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          Numéro de Compte Bancaire (RIB)
                        </label>
                        <input
                          type="text"
                          value={formData.numeroCompteBancaire || ''}
                          onChange={(e) => setFormData({ ...formData, numeroCompteBancaire: e.target.value })}
                          placeholder="00014-xxxxxx-xx"
                          className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>
                  )}

                  {formData.modeVersementSalaire === 'MOBILE_MONEY' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          Opérateur Mobile Money
                        </label>
                        <CustomSelect
                          options={mobileOperatorOptions}
                          value={formData.mobileMoneyOperateur || 'M-Pesa'}
                          onChange={(val) => setFormData({ ...formData, mobileMoneyOperateur: val })}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          Numéro Mobile Money Enregistré
                        </label>
                        <PhoneInput
                          value={formData.mobileMoneyNumero || ''}
                          onChange={(val) => setFormData({ ...formData, mobileMoneyNumero: val })}
                          placeholder="81 000 0000"
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-500/10"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Retour à l’Étape 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <span>Passer à l’Étape 3 (Santé & Urgences)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : INFORMATIONS MÉDICALES, CONTACTS D'URGENCE & RÉFÉRENCES */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Section Informations Médicales */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <span>Informations Médicales & Santé</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Groupe Sanguin & Rhésus
                      </label>
                      <CustomSelect
                        options={groupeSanguinOptions}
                        value={formData.groupeSanguin || 'O+'}
                        onChange={(val) => setFormData({ ...formData, groupeSanguin: val as any })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Médecin Traitant / Centre de Santé de Réf.
                      </label>
                      <input
                        type="text"
                        value={formData.medecinTraitant || ''}
                        onChange={(e) => setFormData({ ...formData, medecinTraitant: e.target.value })}
                        placeholder="Ex: Dr. Kabamba / Clinique Ngaliema"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Allergies & Intolérances Connaissables
                      </label>
                      <input
                        type="text"
                        value={formData.allergies || ''}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        placeholder="Ex: Pénicilline, Arachides, Poussière"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Antécédents Médicaux ou Traitements Réguliers
                      </label>
                      <input
                        type="text"
                        value={formData.antecedentsMedicaux || ''}
                        onChange={(e) => setFormData({ ...formData, antecedentsMedicaux: e.target.value })}
                        placeholder="Ex: Asthme, Diabète, Hypertendu"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Contacts d'Urgence */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <BadgeAlert className="w-4 h-4" />
                    <span>Contact d'Urgence Principal (Obligatoire)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nom & Prénom de la Personne de Contact <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contactUrgenceNom || ''}
                        onChange={(e) => setFormData({ ...formData, contactUrgenceNom: e.target.value })}
                        placeholder="Nom complet du proche"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Lien de Parenté / Relation <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        options={lienParentOptions}
                        value={formData.contactUrgenceLien || 'Époux/Épouse'}
                        onChange={(val) => setFormData({ ...formData, contactUrgenceLien: val })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone Direct d'Urgence <span className="text-rose-500">*</span>
                      </label>
                      <PhoneInput
                        value={formData.contactUrgenceTelephone || ''}
                        onChange={(val) => setFormData({ ...formData, contactUrgenceTelephone: val })}
                        required
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Adresse Physique du Contact d'Urgence
                      </label>
                      <input
                        type="text"
                        value={formData.contactUrgenceAdresse || ''}
                        onChange={(e) => setFormData({ ...formData, contactUrgenceAdresse: e.target.value })}
                        placeholder="Quartier, Commune"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Personne de Référence / Recommandation */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <UserCheck className="w-4 h-4" />
                    <span>Personnel de Référence / Recommandation Professionnelle</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nom Complet du Référent
                      </label>
                      <input
                        type="text"
                        value={formData.referenceProfessionnelle || ''}
                        onChange={(e) => setFormData({ ...formData, referenceProfessionnelle: e.target.value })}
                        placeholder="Ex: Prof. Mukendi"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Organisme / Ancien Établissement
                      </label>
                      <input
                        type="text"
                        value={formData.referenceOrganisme || ''}
                        onChange={(e) => setFormData({ ...formData, referenceOrganisme: e.target.value })}
                        placeholder="Ex: Complexe Scolaire Saint-Joseph"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone / Contact du Référent
                      </label>
                      <PhoneInput
                        value={formData.referenceContact || ''}
                        onChange={(val) => setFormData({ ...formData, referenceContact: val })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Remarques & Notes */}
                <div>
                  <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Notes Biographiques & Remarques Administratives
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notesBiographiques || ''}
                    onChange={(e) => setFormData({ ...formData, notesBiographiques: e.target.value })}
                    placeholder="Remarques particulières, aptitudes ou appréciations lors de l'entretien d'embauche..."
                    className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                {/* Boutons d'Action Final */}
                <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-500/10"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Retour à l’Étape 2</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer le Dossier du Personnel'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* COLONNE DROITE : Panneau de Prévisualisation en Temps Réel (Live Badge Sticky) */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <div
            className="p-5 rounded-2xl border shadow-sm transition-colors overflow-hidden"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            {/* Header de la carte de prévisualisation */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Affichage en Direct (Live)
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {completionPercentage}% Complété
              </span>
            </div>

            {/* Barre de complétude */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mb-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>

            {/* Onglets d'aperçu */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl mb-4 border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setPreviewTab('BADGE')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  previewTab === 'BADGE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Badge d'Identité
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('SYNTHESE')}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                  previewTab === 'SYNTHESE'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Fiche Synthétique
              </button>
            </div>

            {/* VUE 1 : BADGE OFFICIEL DU PERSONNEL */}
            {previewTab === 'BADGE' && (
              <div className="p-4 rounded-xl border bg-gradient-to-b from-indigo-900/10 via-slate-900/5 to-transparent space-y-4" style={{ borderColor: 'var(--border)' }}>
                {/* Filigrane Écolisa / EPST */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                      Écolisa RDC • Service RH
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${roleMeta.bg}`}>
                    {roleMeta.label}
                  </span>
                </div>

                {/* Photo & Identité live */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Photo Preview"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-indigo-500 shadow-xs"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500 font-black text-2xl">
                        {formData.prenom ? formData.prenom[0].toUpperCase() : 'A'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {formData.prenom || formData.nom
                        ? `${formData.prenom} ${formData.nom} ${formData.postnom || ''}`
                        : 'Prénom NOM de l’Agent'}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {formData.qualification || formData.specialite || 'Personnel Établissement'}
                    </p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20">
                        {formData.matricule || 'STF-XXXX'}
                      </span>
                      {formData.numeroMatriculeEPST && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {formData.numeroMatriculeEPST}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* QR Code & Signature */}
                <div className="p-3 rounded-lg border flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{formData.telephone || 'Non renseigné'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Embauche : {formData.dateEmbauche || 'Date du jour'}</span>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-md bg-white border border-slate-200 shrink-0">
                    <QrCode className="w-9 h-9 text-slate-900" />
                  </div>
                </div>
              </div>
            )}

            {/* VUE 2 : SYNTHÈSE DU DOSSIER EN DIRECT */}
            {previewTab === 'SYNTHESE' && (
              <div className="space-y-3 text-xs">
                {/* Bloc 1 : Civilité */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    <span>Identité & Famille</span>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Genre / Sexe:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.sexe === 'F' ? 'Féminin (F)' : 'Masculin (M)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">État Civil:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.etatCivil || 'Célibataire'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Conjoint:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {formData.nomConjoint || 'Non précisé'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Enfants Charge:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.nombreEnfantsACharge || 0} enfant(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloc 2 : Contrat & Paie */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                    <span>Contrat & Paie</span>
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Contrat:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.typeContrat || 'CDI'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Salaire Base:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {formData.salaireBase || 0} {formData.devise || 'USD'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Mode de Paiement:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.modeVersementSalaire === 'BANQUE'
                          ? `Banque : ${formData.banqueNom || 'Rawbank'} (${formData.numeroCompteBancaire || 'RIB non fourni'})`
                          : formData.modeVersementSalaire === 'MOBILE_MONEY'
                          ? `Mobile Money : ${formData.mobileMoneyOperateur || 'M-Pesa'} (${formData.mobileMoneyNumero || 'N° non fourni'})`
                          : 'Paiement Cash en Caisse'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloc 3 : Santé & Urgences */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-rose-600 dark:text-rose-400">
                    <span>Santé & Urgence</span>
                    <Heart className="w-3.5 h-3.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Groupe Sanguin:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {formData.groupeSanguin || 'O+'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Urgence Nom:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {formData.contactUrgenceNom || 'Non renseigné'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Urgence Téléphone:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formData.contactUrgenceTelephone || 'Non renseigné'} ({formData.contactUrgenceLien || 'Proche'})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal WebCam Studio pour la prise de photo */}
      <WebcamCaptureModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={(dataUrl) => {
          setFormData((prev) => ({ ...prev, photoUrl: dataUrl, avatarUrl: dataUrl }));
          setIsWebcamOpen(false);
        }}
      />
    </div>
  );
};
