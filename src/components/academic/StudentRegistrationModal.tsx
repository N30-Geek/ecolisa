import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  GraduationCap,
  Users as UsersIcon,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  QrCode,
  Printer,
  Calendar,
  Sparkles,
  Camera,
  MapPin,
  Phone,
  Mail,
  Heart,
  FileText,
  BadgeAlert,
  School,
  Award
} from 'lucide-react';
import { Eleve } from '../../types';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { LocalDatabaseService } from '../../services/localDatabase';

export const PROVINCES_RDC = [
  'Kinshasa',
  'Haut-Katanga',
  'Nord-Kivu',
  'Sud-Kivu',
  'Kongo-Central',
  'Kasaï-Central',
  'Kasaï-Oriental',
  'Lualaba',
  'Tshopo',
  'Ituri',
  'Équateur',
  'Kwilu',
  'Kwango',
  'Mai-Ndombe',
  'Mongala',
  'Nord-Ubangi',
  'Sud-Ubangi',
  'Tshuapa',
  'Sankuru',
  'Maniema',
  'Bas-Uele',
  'Haut-Uele',
  'Haut-Lomami',
  'Lomami',
  'Tanganyika',
  'Kasaï'
];

const PROVINCES_RDC_OPTIONS: SelectOption[] = PROVINCES_RDC.map(p => ({ value: p, label: p }));

const SEXE_OPTIONS: SelectOption[] = [
  { value: 'M', label: 'Masculin (M)' },
  { value: 'F', label: 'Féminin (F)' },
];

const NATIONALITE_OPTIONS: SelectOption[] = [
  { value: 'Congolaise (RDC)', label: 'Congolaise (RDC)' },
  { value: 'Étrangère (Afrique)', label: 'Étrangère (Afrique)' },
  { value: 'Étrangère (Europe/International)', label: 'Étrangère (International)' },
];

const GROUPE_SANGUIN_OPTIONS: SelectOption[] = [
  { value: 'O+', label: 'O+ (Donneur Universel)' },
  { value: 'A+', label: 'A+' },
  { value: 'B+', label: 'B+' },
  { value: 'AB+', label: 'AB+' },
  { value: 'O-', label: 'O-' },
];

const CYCLE_OPTIONS: SelectOption[] = [
  { value: 'MATERNELLE', label: 'Cycle Maternelle (Petite/Moyenne/Grande Section)' },
  { value: 'PRIMAIRE', label: 'Cycle Primaire (1ère à 6ème Primaire)' },
  { value: 'HUMANITES', label: 'Secondaire & Humanités (CTEB / Humanités)' },
];

const OPTION_EPST_OPTIONS: SelectOption[] = [
  { value: 'MATH_PHYS', label: 'Mathématique-Physique (STEM)' },
  { value: 'BIO_CHIMIE', label: 'Biologie-Chimie (SVT)' },
  { value: 'COMMERCE', label: 'Commerciale & Gestion' },
  { value: 'PEDAGOGIE', label: 'Pédagogie Générale' },
  { value: 'LITTERAIRE', label: 'Littéraire & Langues' },
  { value: 'TECHNIQUE', label: 'Technique Industrielle & Électricité' },
];

const REGIME_OPTIONS: SelectOption[] = [
  { value: 'EXTERNE', label: 'Externe (Demi-journée)' },
  { value: 'INTERNE', label: 'Interne (Internat Établissement)' },
  { value: 'SEMI_INTERNE', label: 'Semi-Interne (Cantine)' },
];

const LANGUE_OPTIONS: SelectOption[] = [
  { value: 'Français', label: 'Français (Programme Officiel EPST)' },
  { value: 'Anglais', label: 'Section Bilangue Français / Anglais' },
];

interface StudentRegistrationModalProps {
  onClose: () => void;
  onRegister: (newStudent: Eleve) => void;
  availableClasses: { id: string; nom: string }[];
  inline?: boolean;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationModalProps> = ({
  onClose,
  onRegister,
  availableClasses,
  inline = false
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // État complet du formulaire d'inscription
  const [formData, setFormData] = useState({
    // Étape 1 : Identité & Origine Administrative RDC
    nom: '',
    postnom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    dateNaissance: '2012-05-18',
    lieuNaissance: 'Kinshasa',
    nationalite: 'Congolaise (RDC)',
    province: 'Kinshasa',
    provinceOrigine: 'Kasaï-Central',
    territoireCommune: 'Commune de la Gombe',
    chefferieSecteur: 'Secteur de Tshibata',
    groupement: 'Groupement Bena-Tshadi',
    village: 'Village Mukendi-Ville',
    adressePhysique: 'N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa',
    groupeSanguin: 'O+',
    allergies: 'Aucune allergie connue',
    informationsMedicales: 'Aptitude physique excellente (Vaccination à jour)',
    description: 'Élève discipliné, autonome avec un grand sens des responsabilités.',
    telephoneEleve: '',
    emailEleve: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',

    // Étape 2 : Scolarité & EPST
    anneeScolaire: '2025–2026',
    cycleId: 'HUMANITES',
    optionEPST: 'MATH_PHYS',
    classId: availableClasses[0]?.id || 'cls-4',
    nomClasse: availableClasses[0]?.nom || '3ème Math-Physique',
    regime: 'EXTERNE' as 'EXTERNE' | 'INTERNE' | 'SEMI_INTERNE',
    langue: 'Français',

    // Étape 3 : Tuteurs & Contacts
    nomPere: 'M. Jean-Baptiste Mukendi',
    professionPere: 'Ingénieur BTP',
    telephonePere: '+243 81 555 0192',
    emailPere: 'j.mukendi@gmail.com',
    nomMere: 'Mme Chantal Bakamba',
    professionMere: 'Médecin Généraliste',
    telephoneMere: '+243 99 444 8812',
    emailMere: 'c.bakamba@yahoo.fr',
    emailParent: 'parents.mukendi@gmail.com',
    adresse: 'N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa',
    contactUrgence: '+243 82 111 3490 (Tuteur Légal)',
    notes: 'Élève assidu avec intérêt prononcé pour les sciences informatiques et la logique.',
  });

  // Matricule auto-généré format EPST RDC
  const generatedRegistrationNumber = React.useMemo(() => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    return `2026-EPST-${randomCode}-KIN`;
  }, []);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Validation stricte des étapes
  const validateCurrentStep = (targetStep?: number): boolean => {
    const currentTarget = targetStep || step;
    setValidationError(null);

    if (currentTarget >= 1) {
      if (!formData.nom.trim()) {
        setValidationError("Le Nom (patronyme) de l'élève est obligatoire.");
        return false;
      }
      if (!formData.prenom.trim()) {
        setValidationError("Le Prénom de l'élève est obligatoire.");
        return false;
      }
      if (!formData.dateNaissance.trim()) {
        setValidationError("La Date de naissance de l'élève est obligatoire.");
        return false;
      }
      if (!formData.lieuNaissance.trim()) {
        setValidationError("Le Lieu de naissance de l'élève est obligatoire.");
        return false;
      }
    }

    if (currentTarget >= 2) {
      if (!formData.classId.trim()) {
        setValidationError("Veuillez sélectionner une Classe d'affectation.");
        return false;
      }
    }

    if (currentTarget >= 3) {
      if (!formData.nomPere.trim() && !formData.nomMere.trim()) {
        setValidationError("Veuillez renseigner le Nom d'au moins un Parent ou Tuteur Légal.");
        return false;
      }
      if (!formData.telephonePere.trim() && !formData.telephoneMere.trim()) {
        setValidationError("Veuillez fournir au moins un Téléphone de contact pour le Parent.");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(step)) {
      setValidationError(null);
      if (step < 4) setStep((step + 1) as any);
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (step > 1) setStep((step - 1) as any);
  };

  const handleStepClick = (targetNum: number) => {
    if (targetNum < step) {
      setValidationError(null);
      setStep(targetNum as any);
    } else {
      if (validateCurrentStep(step)) {
        setStep(targetNum as any);
      }
    }
  };

  const handleSubmit = () => {
    if (!validateCurrentStep(3)) return;

    const newStudent: Eleve = {
      id: `std-${Date.now()}`,
      registrationNumber: generatedRegistrationNumber,
      prenom: formData.prenom || 'Nouveau',
      nom: formData.nom || 'Élève',
      postnom: formData.postnom,
      sexe: formData.sexe,
      dateNaissance: formData.dateNaissance,
      lieuNaissance: formData.lieuNaissance,
      province: formData.province,
      provinceOrigine: formData.provinceOrigine,
      territoireCommune: formData.territoireCommune,
      chefferieSecteur: formData.chefferieSecteur,
      groupement: formData.groupement,
      village: formData.village,
      adressePhysique: formData.adressePhysique || formData.adresse,
      nationalite: formData.nationalite,
      allergies: formData.allergies,
      informationsMedicales: formData.informationsMedicales,
      description: formData.description,
      telephoneEleve: formData.telephoneEleve,
      emailEleve: formData.emailEleve,
      nomPere: formData.nomPere,
      telephonePere: formData.telephonePere,
      professionPere: formData.professionPere,
      emailPere: formData.emailPere,
      nomMere: formData.nomMere,
      telephoneMere: formData.telephoneMere,
      professionMere: formData.professionMere,
      emailMere: formData.emailMere,
      statut: 'ACTIF',
      classId: formData.classId,
      nomClasse: formData.nomClasse,
      nomParent: formData.nomPere || formData.nomMere || 'Parent / Tuteur',
      telephoneParent: formData.telephonePere || formData.telephoneMere || '+243 000 000 000',
      emailParent: formData.emailParent || formData.emailPere || formData.emailMere,
      notesPsychopedagogiques: formData.notes || formData.description,
      photoUrl: formData.photoUrl,
    };

    LocalDatabaseService.addEleve(newStudent);
    onRegister(newStudent);
  };

  const modalJSX = (
    <div className={inline ? "w-full animate-fade-in select-none space-y-4" : "fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-lg animate-fade-in select-none"}>
      <div
        className={inline ? "w-full rounded-2xl shadow-xl overflow-hidden flex flex-col border" : "w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col border h-[90vh] max-h-[920px]"}
        style={{
          background: 'var(--sidebar-popover-bg)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-primary)',
        }}
      >
        {/* BOUTON RETOUR QUAND EN MODE PAGE DÉDIÉE */}
        {inline && (
          <div className="px-6 py-3 border-b flex items-center gap-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
              <span>Retour à la Liste des Élèves</span>
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Formulaire Officiel d'Inscription de l'Élève
            </span>
          </div>
        )}
        {/* ===== HEADER ONBOARDING WIZARD ===== */}
        <div
          className="px-8 py-6 border-b flex items-center justify-between gap-6 shrink-0"
          style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Inscrire un Nouvel Élève
                </h2>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Dossier EPST RDC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Formulaire guidé complet d'admission et d'affectation académique
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-slate-500/20 transition-colors text-slate-400 hover:text-white cursor-pointer border border-transparent hover:border-slate-500/30"
          >
            <X className="w-5.5 h-5.5" />
          </button>
        </div>

        {/* BANNIÈRE D'AVERTISSEMENT / VALIDATION */}
        {validationError && (
          <div className="px-8 py-3 bg-red-500/15 border-b border-red-500/30 text-red-400 flex items-center justify-between gap-3 text-xs font-bold animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <BadgeAlert className="w-4.5 h-4.5 shrink-0 text-red-400 animate-pulse" />
              <span>{validationError}</span>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="text-red-400 hover:text-white text-xs underline cursor-pointer"
            >
              Fermer
            </button>
          </div>
        )}

        {/* ===== BARRE D'ÉTAPES DU WIZARD ===== */}
        <div className="px-8 py-4 border-b flex items-center justify-between gap-3 overflow-x-auto sidebar-scroll shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          {[
            { num: 1, label: '1. Identité & Origine', icon: User },
            { num: 2, label: '2. Scolarité & EPST', icon: School },
            { num: 3, label: '3. Parents & Tuteurs', icon: UsersIcon },
            { num: 4, label: '4. Résumé des Informations', icon: QrCode },
          ].map((s) => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => handleStepClick(s.num)}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'text-slate-400 border border-transparent hover:text-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-black ${
                  isCurrent ? 'bg-white text-indigo-700 shadow-sm' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-700/60 text-slate-300'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className="text-xs">{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* ===== CORPS DES ÉTAPES DU FORMULAIRE ===== */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 sidebar-scroll">

          {/* ── ÉTAPE 1 : IDENTITÉ, NATIONALITÉ & SANTÉ ── */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 rounded-3xl border flex flex-col sm:flex-row items-center gap-6" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="relative group shrink-0">
                  <img
                    src={formData.photoUrl}
                    alt="Aperçu Élève"
                    className="w-28 h-28 rounded-3xl object-cover border-2 border-indigo-500 shadow-xl"
                  />
                  <button
                    type="button"
                    className="absolute inset-0 bg-slate-900/60 rounded-3xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Camera className="w-7 h-7" />
                  </button>
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Photo d'Identité Scolaire</h3>
                  <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                    Photo officielle format passeport pour le fichier de l'établissement et la carte d'élève QR code.
                  </p>
                  <div className="flex justify-center sm:justify-start gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' })}
                      className="px-3 py-1.5 text-xs font-black rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 transition-all cursor-pointer"
                    >
                      Modèle Garçon
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' })}
                      className="px-3 py-1.5 text-xs font-black rounded-xl bg-pink-500/15 text-pink-400 border border-pink-500/30 hover:bg-pink-500/25 transition-all cursor-pointer"
                    >
                      Modèle Fille
                    </button>
                  </div>
                </div>
              </div>

              {/* IDENTITÉ DE BASE */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Nom (Patronyme) <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    placeholder="ex: Mukendi"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Postnom</label>
                  <input
                    type="text"
                    value={formData.postnom}
                    onChange={e => setFormData({ ...formData, postnom: e.target.value })}
                    placeholder="ex: Kabasele"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Prénom <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    placeholder="ex: Jean-Luc"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Sexe</label>
                  <CustomSelect
                    options={SEXE_OPTIONS}
                    value={formData.sexe}
                    onChange={val => setFormData({ ...formData, sexe: val as any })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Date de Naissance <span className="text-red-500 font-bold">*</span>
                  </label>
                  <CustomDatePicker
                    value={formData.dateNaissance}
                    onChange={val => setFormData({ ...formData, dateNaissance: val })}
                    placeholder="Date de naissance..."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Lieu de Naissance <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lieuNaissance}
                    onChange={e => setFormData({ ...formData, lieuNaissance: e.target.value })}
                    placeholder="Kinshasa"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Nationalité</label>
                  <CustomSelect
                    options={NATIONALITE_OPTIONS}
                    value={formData.nationalite}
                    onChange={val => setFormData({ ...formData, nationalite: val })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* CONTACTS OPTIONNELS DE L'ÉLÈVE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Téléphone Personnel Élève (Optionnel)</label>
                  <input
                    type="text"
                    value={formData.telephoneEleve}
                    onChange={e => setFormData({ ...formData, telephoneEleve: e.target.value })}
                    placeholder="ex: +243 81 222 3344"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Adresse Email Élève (Optionnel)</label>
                  <input
                    type="email"
                    value={formData.emailEleve}
                    onChange={e => setFormData({ ...formData, emailEleve: e.target.value })}
                    placeholder="ex: eleve.mukendi@ecolisa.cd"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* SECTION DÉCOUPAGE TERRITORIAL & ORIGINE RDC */}
              <div className="p-6 rounded-3xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
                    <MapPin className="w-4 h-4" /> Origine Géographique & Découpage Administratif RDC
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    26 Provinces RDC
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Province Actuelle (Résidence)</label>
                    {formData.nationalite.includes('RDC') ? (
                      <CustomSelect
                        options={PROVINCES_RDC_OPTIONS}
                        value={formData.province}
                        onChange={val => setFormData({ ...formData, province: val })}
                        className="w-full"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.province}
                        onChange={e => setFormData({ ...formData, province: e.target.value })}
                        placeholder="ex: Kinshasa / Région"
                        className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Province d'Origine</label>
                    {formData.nationalite.includes('RDC') ? (
                      <CustomSelect
                        options={PROVINCES_RDC_OPTIONS}
                        value={formData.provinceOrigine}
                        onChange={val => setFormData({ ...formData, provinceOrigine: val })}
                        className="w-full"
                      />
                    ) : (
                      <input
                        type="text"
                        value={formData.provinceOrigine}
                        onChange={e => setFormData({ ...formData, provinceOrigine: e.target.value })}
                        placeholder="ex: Province d'origine"
                        className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Territoire / Commune</label>
                    <input
                      type="text"
                      value={formData.territoireCommune}
                      onChange={e => setFormData({ ...formData, territoireCommune: e.target.value })}
                      placeholder="ex: Territoire de Kazumba / C. Gombe"
                      className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Chefferie / Secteur</label>
                    <input
                      type="text"
                      value={formData.chefferieSecteur}
                      onChange={e => setFormData({ ...formData, chefferieSecteur: e.target.value })}
                      placeholder="ex: Secteur de Tshibata"
                      className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Groupement</label>
                    <input
                      type="text"
                      value={formData.groupement}
                      onChange={e => setFormData({ ...formData, groupement: e.target.value })}
                      placeholder="ex: Groupement Bena-Tshadi"
                      className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Village</label>
                    <input
                      type="text"
                      value={formData.village}
                      onChange={e => setFormData({ ...formData, village: e.target.value })}
                      placeholder="ex: Village Mukendi-Ville"
                      className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Adresse Physique de Résidence</label>
                  <input
                    type="text"
                    value={formData.adressePhysique}
                    onChange={e => setFormData({ ...formData, adressePhysique: e.target.value, adresse: e.target.value })}
                    placeholder="ex: N° 45, Av. des Huileries, Q. Golf, C. Gombe, Kinshasa"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* SECTION SANTÉ & ALLERGIES MÉDICALES */}
              <div className="p-6 rounded-3xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                  <Heart className="w-4 h-4" /> Informations Médicales & Allergies
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Groupe Sanguin & Rhésus</label>
                    <CustomSelect
                      options={GROUPE_SANGUIN_OPTIONS}
                      value={formData.groupeSanguin}
                      onChange={val => setFormData({ ...formData, groupeSanguin: val })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Allergies Connues (Aliments, Médicaments)</label>
                    <input
                      type="text"
                      value={formData.allergies}
                      onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                      placeholder="ex: Allergie Pénicilline, Lactose, Aucune..."
                      className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Antécédents Médicaux & Précautions Infirmerie</label>
                  <input
                    type="text"
                    value={formData.informationsMedicales}
                    onChange={e => setFormData({ ...formData, informationsMedicales: e.target.value })}
                    placeholder="ex: Asthme d'effort, port de lunettes correctrices, vaccins à jour..."
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* DESCRIPTION & REMARQUES DIVERSES */}
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Description & Observations Particulières</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value, notes: e.target.value })}
                  placeholder="Observations pédagogiques, talents particuliers, comportement..."
                  className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          {/* ── ÉTAPE 2 : SCOLARITÉ & AFFECTATION EPST ── */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Année Scolaire d'Admission</label>
                  <input
                    type="text"
                    disabled
                    value={formData.anneeScolaire}
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold bg-slate-500/10 opacity-80"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Cycle EPST</label>
                  <CustomSelect
                    options={CYCLE_OPTIONS}
                    value={formData.cycleId}
                    onChange={val => setFormData({ ...formData, cycleId: val })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Option / Filière (si Humanités)</label>
                  <CustomSelect
                    options={OPTION_EPST_OPTIONS}
                    value={formData.optionEPST}
                    onChange={val => setFormData({ ...formData, optionEPST: val })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">
                    Classe d'Affectation <span className="text-red-500 font-bold">*</span>
                  </label>
                  <CustomSelect
                    options={availableClasses.map(c => ({ value: c.id, label: c.nom }))}
                    value={formData.classId}
                    onChange={val => {
                      const selected = availableClasses.find(c => c.id === val);
                      setFormData({
                        ...formData,
                        classId: val,
                        nomClasse: selected?.nom || 'Classe',
                      });
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Régime de Fréquentation</label>
                  <CustomSelect
                    options={REGIME_OPTIONS}
                    value={formData.regime}
                    onChange={val => setFormData({ ...formData, regime: val as any })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Langue Véhiculaire d'Enseignement</label>
                  <CustomSelect
                    options={LANGUE_OPTIONS}
                    value={formData.langue}
                    onChange={val => setFormData({ ...formData, langue: val })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : PARENTS & TUTEURS LÉGAUX ── */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-6 rounded-3xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4.5 h-4.5" /> Identité du Père / Tuteur Légal 1
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">Au moins 1 parent requis <span className="text-red-500 font-bold">*</span></span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">
                      Nom Complet du Père <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nomPere}
                      onChange={e => setFormData({ ...formData, nomPere: e.target.value })}
                      placeholder="M. Jean Mukendi"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Profession Père</label>
                    <input
                      type="text"
                      value={formData.professionPere}
                      onChange={e => setFormData({ ...formData, professionPere: e.target.value })}
                      placeholder="Ingénieur BTP"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">
                      Téléphone Père (WhatsApp) <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.telephonePere}
                      onChange={e => setFormData({ ...formData, telephonePere: e.target.value })}
                      placeholder="+243 81 000 0000"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Email Père (Optionnel)</label>
                    <input
                      type="email"
                      value={formData.emailPere}
                      onChange={e => setFormData({ ...formData, emailPere: e.target.value })}
                      placeholder="pere.mukendi@gmail.com"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl border space-y-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-xs font-black text-pink-400 uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4.5 h-4.5" /> Identité de la Mère / Tuteur Légal 2
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Nom Complet de la Mère</label>
                    <input
                      type="text"
                      value={formData.nomMere}
                      onChange={e => setFormData({ ...formData, nomMere: e.target.value })}
                      placeholder="Mme Chantal Bakamba"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Profession Mère</label>
                    <input
                      type="text"
                      value={formData.professionMere}
                      onChange={e => setFormData({ ...formData, professionMere: e.target.value })}
                      placeholder="Médecin"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Téléphone Mère (WhatsApp)</label>
                    <input
                      type="text"
                      value={formData.telephoneMere}
                      onChange={e => setFormData({ ...formData, telephoneMere: e.target.value })}
                      placeholder="+243 99 000 0000"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1.5">Email Mère (Optionnel)</label>
                    <input
                      type="email"
                      value={formData.emailMere}
                      onChange={e => setFormData({ ...formData, emailMere: e.target.value })}
                      placeholder="mere.bakamba@yahoo.fr"
                      className="w-full px-4 py-2.5 text-xs rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Email Principal du Parent / Tuteur Légal</label>
                  <input
                    type="email"
                    value={formData.emailParent}
                    onChange={e => setFormData({ ...formData, emailParent: e.target.value })}
                    placeholder="parents.mukendi@gmail.com"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Contact Téléphone d'Urgence</label>
                  <input
                    type="text"
                    value={formData.contactUrgence}
                    onChange={e => setFormData({ ...formData, contactUrgence: e.target.value })}
                    placeholder="+243 82 111 3490"
                    className="w-full px-4 py-3 text-sm rounded-2xl border font-bold focus:outline-none focus:border-indigo-500"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 4 : RÉSUMÉ DES INFORMATIONS & BADGE SCORAIRE QR CODE ── */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-indigo-300">Résumé Synthétique du Dossier Élève</h3>
                  <p className="text-xs text-slate-400">Vérifiez la totalité des informations saisies avant de valider l'inscription officielle.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-indigo-400 block">Matricule Automatique</span>
                  <span className="text-lg font-black font-mono text-indigo-300">{generatedRegistrationNumber}</span>
                </div>
              </div>

              {/* GRILLE DU RÉSUMÉ DES INFORMATIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CARD 1 : IDENTITÉ & DÉCOUPAGE TERRITORIAL */}
                <div className="p-5 rounded-3xl border space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <User className="w-4 h-4" /> 1. Identité & Origine RDC
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Nom Complet :</span>
                      <span className="font-black text-indigo-300">{formData.prenom} {formData.nom} {formData.postnom}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Sexe & Naissance :</span>
                      <span className="font-bold">{formData.sexe === 'M' ? 'Masculin' : 'Féminin'} · {formData.dateNaissance} ({formData.lieuNaissance})</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Nationalité :</span>
                      <span className="font-bold text-emerald-400">{formData.nationalite}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Province Résidence / Origine :</span>
                      <span className="font-bold">{formData.province} / {formData.provinceOrigine}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Territoire / Secteur :</span>
                      <span className="font-bold">{formData.territoireCommune} · {formData.chefferieSecteur}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Groupement / Village :</span>
                      <span className="font-bold">{formData.groupement} · {formData.village}</span>
                    </div>
                  </div>
                </div>

                {/* CARD 2 : SANTÉ & AFFECTATION ACADÉMIQUE */}
                <div className="p-5 rounded-3xl border space-y-3" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <School className="w-4 h-4" /> 2. Scolarité & Santé
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Classe d'Admission :</span>
                      <span className="font-black text-indigo-300">{formData.nomClasse}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Cycle & Option EPST :</span>
                      <span className="font-bold">{formData.cycleId} · {formData.optionEPST}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Régime & Langue :</span>
                      <span className="font-bold">{formData.regime} · {formData.langue}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Groupe Sanguin :</span>
                      <span className="font-black text-pink-400">{formData.groupeSanguin}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-slate-400 font-bold">Allergies :</span>
                      <span className="font-bold text-amber-400">{formData.allergies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold">Notes Médicales :</span>
                      <span className="font-bold truncate max-w-[200px]">{formData.informationsMedicales}</span>
                    </div>
                  </div>
                </div>

                {/* CARD 3 : PARENTS & CONTACTS */}
                <div className="p-5 rounded-3xl border space-y-3 md:col-span-2" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-400 flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" /> 3. Tuteurs Légaux & Contacts Famille
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-2xl border bg-indigo-500/5 border-indigo-500/20 space-y-1">
                      <p className="font-black text-indigo-300">Père : {formData.nomPere} ({formData.professionPere})</p>
                      <p className="text-slate-300">📞 Tél : <span className="font-mono">{formData.telephonePere}</span></p>
                      {formData.emailPere && <p className="text-slate-400">✉️ Email : {formData.emailPere}</p>}
                    </div>
                    <div className="p-3 rounded-2xl border bg-pink-500/5 border-pink-500/20 space-y-1">
                      <p className="font-black text-pink-300">Mère : {formData.nomMere} ({formData.professionMere})</p>
                      <p className="text-slate-300">📞 Tél Maman : <span className="font-mono">{formData.telephoneMere}</span></p>
                      {formData.emailMere && <p className="text-slate-400">✉️ Email : {formData.emailMere}</p>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 pt-1">
                    📍 Adresse : <span className="font-bold text-slate-200">{formData.adressePhysique || formData.adresse}</span>
                  </div>
                </div>
              </div>

              {/* CARTE SCORAIRE OFFICIELLE APERÇU */}
              <div className="max-w-md mx-auto p-5 rounded-3xl border shadow-2xl relative overflow-hidden text-left bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-500/40">
                <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3 mb-3">
                  <div className="flex items-center gap-3">
                    <School className="w-5 h-5 text-indigo-400" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-indigo-200">CS SAINT-MICHEL EPST RDC</h4>
                      <p className="text-[9px] text-slate-400">Carte d'Élève Officielle · 2025–2026</p>
                    </div>
                  </div>
                  <Award className="w-5 h-5 text-amber-400" />
                </div>

                <div className="flex items-center gap-4">
                  <img
                    src={formData.photoUrl}
                    alt={formData.prenom}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-400 shadow-md shrink-0"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-base font-black tracking-tight leading-tight truncate">
                      {formData.prenom} {formData.nom}
                    </p>
                    <p className="text-xs font-extrabold text-indigo-300">{formData.nomClasse}</p>
                    <p className="text-[10px] text-slate-300 font-mono">Né(e) le: {formData.dateNaissance}</p>
                    <p className="text-[10px] text-slate-300 font-bold">Groupe: {formData.groupeSanguin}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-slate-400">Matricule Élève</p>
                    <p className="text-xs font-black font-mono text-indigo-300">{generatedRegistrationNumber}</p>
                  </div>
                  <div className="p-1 rounded-lg bg-white shrink-0 shadow-md">
                    <QrCode className="w-8 h-8 text-slate-950" />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ===== FOOTER DU WIZARD AVEC BOUTONS NAVIGATION ===== */}
        <div
          className="px-8 py-5 border-t flex items-center justify-between shrink-0"
          style={{ background: 'var(--header-bg)', borderColor: 'var(--border)' }}
        >
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-3 rounded-2xl text-xs font-extrabold border flex items-center gap-2 hover:bg-slate-500/15 transition-all cursor-pointer"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Précédent</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Continuer</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer animate-pulse"
              >
                <Check className="w-5 h-5" />
                <span>Valider l'Inscription et Générer la Carte</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return inline ? modalJSX : createPortal(modalJSX, document.body);
};
