import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  GraduationCap, 
  Wallet, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles,
  Check,
  Cpu,
  MapPin,
  School,
  Lock,
  Key,
  UserCheck,
  Phone,
  Mail,
  DollarSign,
  Layers,
  Award,
  Globe,
  FileCheck,
  Building,
  Image as ImageIcon,
  Plus,
  Trash2,
  Smartphone,
  Eye,
  EyeOff,
  FolderOpen,
  CreditCard,
  CheckSquare,
  Sun,
  Moon,
  HardDrive
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { PROVINCES_RDC } from '../academic/StudentRegistrationModal';
import { LocalDatabaseService } from '../../services/localDatabase';

export interface SchoolConfig {
  schoolName: string;
  secopeCode: string;
  schoolType: string;
  schoolStatus: string;
  regime: string;
  arreteAgrement: string;
  province: string;
  subDivision: string;
  address: string;
  phone: string;
  email: string;
  motto: string;
  logoUrl: string;
  selectedCycles: string[];
  selectedOptions: string[];
  currency: 'USD' | 'CDF';
  exchangeRate: number;
  subscriptionPlan: 'MENSUEL' | 'ANNUEL' | 'PERPETUEL';
  paymentMethod: 'MOBILE_MONEY' | 'VIREMENT_BANCAIRE';
  promoterName: string;
  promoterRole: string;
  promoterEmail: string;
  promoterPhone2FA: string;
  promoterPinCode: string;
  activeSchoolYear: string;
  hwid: string;
}

interface OnboardingWizardProps {
  onComplete: (config: SchoolConfig) => void;
  onSkip?: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const PROVINCE_OPTIONS: SelectOption[] = PROVINCES_RDC.map((p) => ({
  value: p,
  label: `Province de ${p}`,
}));

const SCHOOL_TYPE_OPTIONS: SelectOption[] = [
  { value: 'POLYVALENT', label: 'Polyvalent (Général, Technique & Commercial)' },
  { value: 'GENERAL', label: 'Enseignement Général (Maternelle, Primaire, Scientifique)' },
  { value: 'TECHNIQUE', label: 'Enseignement Technique & Professionnel' },
  { value: 'INTERNATIONAL', label: 'Établissement International & Bilingue' },
];

const SCHOOL_STATUS_OPTIONS: SelectOption[] = [
  { value: 'PRIVE_AGREE', label: 'Privé Agréé (Établissement Privé)' },
  { value: 'PUBLIC_ETAT', label: 'Public / Étatique (École Publique de l\'État)' },
  { value: 'CONVENTIONNE_CATHOLIQUE', label: 'Conventionné Catholique (ECP)' },
  { value: 'CONVENTIONNE_PROTESTANT', label: 'Conventionné Protestant (ECP)' },
  { value: 'CONVENTIONNE_KIMBANGUISTE', label: 'Conventionné Kimbanguiste' },
  { value: 'CONVENTIONNE_ISLAMIQUE', label: 'Conventionné Islamique' },
  { value: 'AUTRE', label: 'Autre Régime / Partenariat' },
];

const REGIME_TEACHING_OPTIONS: SelectOption[] = [
  { value: 'EXTERNE', label: 'Externe (Demi-journée)' },
  { value: 'SEMI_INTERNE', label: 'Semi-Interne (Cantine & Repas Midi)' },
  { value: 'INTERNAT', label: 'Internat Complet (Pensionnat Établissement)' },
];

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'PROMOTEUR_ADMIN', label: 'Promoteur & Fondateur Général' },
  { value: 'PREFET_DIRECTEUR', label: 'Préfet des Études / Directeur' },
  { value: 'DIRECTEUR_ETUDES', label: 'Directeur des Études (DE)' },
  { value: 'COMPTABLE', label: 'Comptable Intendant Général' },
];

// LISTE OFFICIELLE COMPLÈTE DES OPTIONS DE L'ENSEIGNEMENT NATIONAL EPST RDC
export const NATIONAL_EPST_OPTIONS: { code: string; label: string; cite: string; category: string }[] = [
  { code: 'MATH_PHYS', label: 'Mathématique-Physique (STEM)', cite: 'CITE 344', category: 'Sciences' },
  { code: 'BIO_CHIMIE', label: 'Chimie-Biologie (SVT)', cite: 'CITE 344', category: 'Sciences' },
  { code: 'COMMERCE', label: 'Commerciale & Gestion (OHADA)', cite: 'CITE 344', category: 'Commercial' },
  { code: 'PEDAGOGIE', label: 'Pédagogie Générale (Sciences Éducation)', cite: 'CITE 344', category: 'Pédagogie' },
  { code: 'LITTERAIRE', label: 'Littéraire & Langues (Latin-Philo)', cite: 'CITE 344', category: 'Humanités' },
  { code: 'TECHNIQUE', label: 'Technique Industrielle & Électricité', cite: 'CITE 344', category: 'Technique' },
  { code: 'MECANIQUE', label: 'Mécanique Générale & Automobile', cite: 'CITE 344', category: 'Technique' },
  { code: 'AGRONOMIE', label: 'Agronomie & Agriculture Générale', cite: 'CITE 344', category: 'Agro-Pasteur' },
  { code: 'COUPE_COUTURE', label: 'Coupe & Couture (Habillement)', cite: 'CITE 344', category: 'Arts & Métiers' },
  { code: 'INFORMATIQUE', label: 'Informatique de Gestion & Réseaux', cite: 'CITE 344', category: 'Nouvelles Tech' },
  { code: 'SOCIALE', label: 'Sociale & Économie Familiale', cite: 'CITE 344', category: 'Social' },
  { code: 'ARTS', label: 'Arts Plastiques & Musique', cite: 'CITE 344', category: 'Culture' },
  { code: 'SANTE', label: 'Sages-Femmes & Infirmerie Scolaire', cite: 'CITE 344', category: 'Santé' },
];

const NATIONAL_OPTIONS_DROPDOWN: SelectOption[] = NATIONAL_EPST_OPTIONS.map((o) => ({
  value: o.code,
  label: `${o.label} (${o.category})`,
}));

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ 
  onComplete, 
  onSkip,
  isDarkMode = false,
  toggleTheme
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hwid, setHwid] = useState('HWID-ED25519-RDC-LOCAL-OFFLINE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Étape 1 : Identité Établissement (VIDE POUR MODE LOCAL-FIRST CHERCHÉ PAR L'UTILISATEUR)
  const [schoolName, setSchoolName] = useState('');
  const [secopeCode, setSecopeCode] = useState('');
  const [schoolType, setSchoolType] = useState('POLYVALENT');
  const [schoolStatus, setSchoolStatus] = useState('PRIVE_AGREE');
  const [regime, setRegime] = useState('EXTERNE');
  const [arreteAgrement, setArreteAgrement] = useState('');
  const [province, setProvince] = useState('Kinshasa');
  const [subDivision, setSubDivision] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [motto, setMotto] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Étape 2 : Cycles & Options EPST
  const [selectedCycles, setSelectedCycles] = useState<string[]>(['PRIMAIRE', 'CTEB', 'HUMANITES']);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([
    'MATH_PHYS',
    'COMMERCE',
    'BIO_CHIMIE',
  ]);
  const [dropdownOptionToAdd, setDropdownOptionToAdd] = useState<string>('PEDAGOGIE');

  // Étape 3 : Promoteur (VIDE SANS ACCÈS CLOUD OBLIGATOIRE - PURE LOCAL)
  const [promoterName, setPromoterName] = useState('');
  const [promoterRole, setPromoterRole] = useState('PROMOTEUR_ADMIN');
  const [promoterEmail, setPromoterEmail] = useState('');
  const [promoterPhone2FA, setPromoterPhone2FA] = useState('');
  const [promoterPassword, setPromoterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [promoterPinCode, setPromoterPinCode] = useState('');

  // Toggle Visibility State pour Mot de passe & PIN
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPinCode, setShowPinCode] = useState(false);

  // Étape 4 : Licence du Logiciel, Abonnement & Monnaie (Local-First)
  const [subscriptionPlan, setSubscriptionPlan] = useState<'MENSUEL' | 'ANNUEL' | 'PERPETUEL'>('ANNUEL');
  const [paymentMethod, setPaymentMethod] = useState<'MOBILE_MONEY' | 'VIREMENT_BANCAIRE'>('MOBILE_MONEY');
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(2850);
  const [activeSchoolYear, setActiveSchoolYear] = useState<string>('2025–2026');

  // Validation State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getHwid) {
      window.electronAPI.getHwid().then((h) => {
        if (h) setHwid(h);
      });
    }
  }, []);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const steps = [
    { number: 1, title: 'Établissement & Logo', icon: Building2 },
    { number: 2, title: 'Cycles & Options EPST', icon: GraduationCap },
    { number: 3, title: 'Promoteur & 2FA', icon: ShieldCheck },
    { number: 4, title: 'Licence & Abonnement', icon: CreditCard },
    { number: 5, title: 'Validation', icon: Sparkles },
  ];

  const toggleCycle = (code: string) => {
    setSelectedCycles((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const addOptionFromDropdown = () => {
    if (dropdownOptionToAdd && !selectedOptions.includes(dropdownOptionToAdd)) {
      setSelectedOptions((prev) => [...prev, dropdownOptionToAdd]);
    }
  };

  const removeOption = (optCode: string) => {
    setSelectedOptions((prev) => prev.filter((o) => o !== optCode));
  };

  const validateStep = (step: number): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!schoolName.trim()) {
        setErrorMsg("Le nom officiel de l'école est obligatoire.");
        return false;
      }
      if (!province.trim()) {
        setErrorMsg('Veuillez sélectionner la Province Éducative.');
        return false;
      }
    } else if (step === 2) {
      if (selectedCycles.length === 0) {
        setErrorMsg("Veuillez sélectionner au moins un cycle d'enseignement.");
        return false;
      }
    } else if (step === 3) {
      if (!promoterName.trim()) {
        setErrorMsg('Le nom du Promoteur / Fondateur est obligatoire.');
        return false;
      }
      if (!promoterEmail.trim() || !promoterEmail.includes('@')) {
        setErrorMsg('Un email de connexion valide est requis.');
        return false;
      }
      if (!promoterPhone2FA.trim()) {
        setErrorMsg('Le numéro de téléphone pour la validation 2FA est obligatoire.');
        return false;
      }
      if (!promoterPassword) {
        setErrorMsg('Le mot de passe de connexion est obligatoire.');
        return false;
      }
      if (promoterPassword !== confirmPassword) {
        setErrorMsg('La confirmation du mot de passe ne correspond pas.');
        return false;
      }
      if (promoterPinCode.length < 4) {
        setErrorMsg('Le code PIN de sécurité doit contenir au moins 4 chiffres.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    if (!validateStep(3)) return;

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
    });

    const fullConfig: SchoolConfig = {
      schoolName,
      secopeCode,
      schoolType,
      schoolStatus,
      regime,
      arreteAgrement,
      province,
      subDivision,
      address,
      phone,
      email,
      motto,
      logoUrl,
      selectedCycles,
      selectedOptions,
      currency,
      exchangeRate,
      subscriptionPlan,
      paymentMethod,
      promoterName,
      promoterRole,
      promoterEmail,
      promoterPhone2FA,
      promoterPinCode,
      activeSchoolYear,
      hwid,
    };

    // 1. Créer le compte administrateur principal dans SQLite (mdp haché côté main process)
    const [prenom, ...restNom] = promoterName.trim().split(' ');
    await LocalDatabaseService.addUser({
      id:        `usr_admin_${Date.now()}`,
      email:     promoterEmail.trim(),
      nom:       restNom.join(' ') || prenom,
      prenom:    restNom.length > 0 ? prenom : '',
      role:      promoterRole as any,
      pinCode:   promoterPinCode,
      statut:    'ACTIF',
      telephone: promoterPhone2FA,
      password:  promoterPassword, // hashé dans le main process (scrypt 512-bit)
    } as any);

    // 2. Sauvegarder la config dans SQLite via IPC
    await LocalDatabaseService.setConfig('school_config', fullConfig);
    await LocalDatabaseService.setConfig('onboarding_completed', true);
    // Garder une copie légère dans localStorage pour la compatibilité UI
    localStorage.setItem('ecolisa_school_config', JSON.stringify(fullConfig));

    onComplete(fullConfig);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 animate-fade-in select-none overflow-hidden">
      {/* HEADER SUPÉRIEUR AVEC HAUTE LISIBILITÉ ET BADGE LOCAL-FIRST */}
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
                ECOLISA ENTERPRISE ERP
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                LOCAL-FIRST (SANS INTERNET)
              </span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Assistant d'Initialisation de l'Établissement
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* BOUTON BASCULE THÈME CLAIR / SOMBRE */}
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
              title="Basculer entre Mode Clair et Mode Sombre"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          )}

          {onSkip && (
            <button
              onClick={onSkip}
              className="text-xs font-black px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Passer
            </button>
          )}
        </div>
      </header>

      {/* BARRE D'INDICATEURS D'ÉTAPES EN HAUT */}
      <div className="px-6 py-3 bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        {steps.map((s) => {
          const isActive = currentStep === s.number;
          const isDone = currentStep > s.number;
          return (
            <div key={s.number} className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                  isDone
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isActive
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                }`}
              >
                {isDone ? <Check className="w-4 h-4" /> : s.number}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[9.5px] uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">Étape 0{s.number}</span>
                <span
                  className={`text-xs font-black ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MESSAGE D'ERREUR */}
      {errorMsg && (
        <div className="mx-6 mt-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-black flex items-center gap-2.5">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* CORPS PRINCIPAL DE L'ÉTAPE COURANTE - HAUTE LISIBILITÉ & AUTO-SCROLL */}
      <main className="flex-1 overflow-y-auto p-6 sm:p-8 sidebar-scroll min-h-0 space-y-6">
        {/* ── ÉTAPE 1 : IDENTITÉ, LOGO (LOCAL-FIRST) & STATUT ── */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                1. Identité Officielle, Logo Local & Agrément Juridique
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Sélectionnez le logo depuis vos fichiers locaux et renseignez l'identité légale de votre établissement.
              </p>
            </div>

            {/* SÉLECTION DU LOGO DEPUIS L'EXPLORATEUR DE FICHIERS (LOCAL-FIRST) */}
            <div className="p-5 rounded-2xl border flex flex-col sm:flex-row items-center gap-5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo École" className="w-full h-full object-cover" />
                ) : (
                  <School className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <label className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider">
                  Logo Officiel de l'Établissement (Fichier Local)
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Formats supportés : PNG, JPG, WebP. Fichier chargé localement et sauvegardé sur votre disque sans dépendance cloud.
                </p>

                {/* INPUT CACHÉ FICHIER */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Choisir depuis l'explorateur de fichiers...</span>
                  </button>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 text-xs font-bold rounded-xl border border-red-300 dark:border-red-900/40 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      Effacer le logo
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                <div className="sm:col-span-8 space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Nom Officiel de l'Établissement <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Saisissez le nom officiel de l'école (ex: Complexe Scolaire ACADEMIA)"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="sm:col-span-4 space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Code SECOPE / EPST
                  </label>
                  <input
                    type="text"
                    value={secopeCode}
                    onChange={(e) => setSecopeCode(e.target.value)}
                    placeholder="ex: SECOPE-99201-KIN"
                    className="w-full px-4 py-2.5 rounded-xl border font-mono font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Type d'Établissement
                  </label>
                  <CustomSelect
                    options={SCHOOL_TYPE_OPTIONS}
                    value={schoolType}
                    onChange={(val) => setSchoolType(val)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Statut Juridique / Régime
                  </label>
                  <CustomSelect
                    options={SCHOOL_STATUS_OPTIONS}
                    value={schoolStatus}
                    onChange={(val) => setSchoolStatus(val)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Régime d'Enseignement
                  </label>
                  <CustomSelect
                    options={REGIME_TEACHING_OPTIONS}
                    value={regime}
                    onChange={(val) => setRegime(val)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    N° Arrêté d'Agrément EPST
                  </label>
                  <input
                    type="text"
                    value={arreteAgrement}
                    onChange={(e) => setArreteAgrement(e.target.value)}
                    placeholder="ex: Arrêté MINEPST/N°0451/2022"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Province Éducative RDC <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    options={PROVINCE_OPTIONS}
                    value={province}
                    onChange={(val) => setProvince(val)}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Sous-Division / Commune
                  </label>
                  <input
                    type="text"
                    value={subDivision}
                    onChange={(e) => setSubDivision(e.target.value)}
                    placeholder="ex: Kinshasa-Lukunga / Gombe"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                  Adresse Physique Complète
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ex: 12, Avenue de la Justice, Q. Golf, C. Gombe, Kinshasa"
                  className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Téléphone Secrétariat
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+243 81 000 0000"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Email Officiel École
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@votre-ecole.cd"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Devise de l'École
                  </label>
                  <input
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="ex: Discipline - Travail - Excellence"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : CYCLES & SÉLECTION DÉROULANTE DES OPTIONS EPST ── */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                2. Cycles Scolaires & Liste des Options EPST RDC
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Sélectionnez la liste des options nationales dispensées par votre établissement.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                Cycles Scolaires Officiels Activés
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { code: 'PRESCHOOL', label: 'École Maternelle & Éveil', cite: 'CITE 020', desc: 'Petite, Moyenne & Grande Section' },
                  { code: 'PRIMAIRE', label: 'Éducation de Base / Primaire', cite: 'CITE 100', desc: '1ère à 6ème Année Primaire' },
                  { code: 'CTEB', label: 'Cycle Terminal CTEB (7e & 8e)', cite: 'CITE 244', desc: '7ème & 8ème Année Éducation de Base' },
                  { code: 'HUMANITES', label: 'Humanités Générales & Tech.', cite: 'CITE 344', desc: '1ère à 4ème Humanités (Secondaire)' },
                  { code: 'CUSTOM', label: 'Mode International / Custom', cite: 'CUSTOM', desc: 'Programmes bilingues & internationaux' },
                ].map((c) => {
                  const isSelected = selectedCycles.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleCycle(c.code)}
                      className={`p-4 rounded-xl border text-left flex items-start justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-slate-900 dark:text-indigo-200 font-bold ring-1 ring-indigo-500/30'
                          : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-black flex items-center gap-2">
                          <span>{c.label}</span>
                          <span className="px-2 py-0.5 rounded text-[9.5px] font-mono bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                            {c.cite}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{c.desc}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SÉLECTEUR DÉROULANT DES OPTIONS EPST */}
            {selectedCycles.includes('HUMANITES') && (
              <div className="space-y-4 pt-4 border-t overflow-visible" style={{ borderColor: 'var(--border)' }}>
                <label className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-400 tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4" /> Sélectionner & Ajouter une Option du Programme National EPST
                </label>

                <div className="flex items-center gap-3">
                  <CustomSelect
                    options={NATIONAL_OPTIONS_DROPDOWN}
                    value={dropdownOptionToAdd}
                    onChange={(val) => setDropdownOptionToAdd(val)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={addOptionFromDropdown}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajouter l'Option</span>
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Options Activées ({selectedOptions.length}) :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOptions.map((optCode) => {
                      const optDetail = NATIONAL_EPST_OPTIONS.find((o) => o.code === optCode);
                      return (
                        <div
                          key={optCode}
                          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 font-bold text-xs shadow-2xs"
                        >
                          <span>{optDetail ? optDetail.label : optCode}</span>
                          <button
                            type="button"
                            onClick={() => removeOption(optCode)}
                            className="text-indigo-500 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ÉTAPE 3 : PROMOTEUR & AUTH 2FA LOCAL ── */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                3. Compte du Promoteur, Mot de Passe & Validation 2FA
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Créez vos identifiants d'accès Super-Admin stockés localement avec affichage/masquage du mot de passe.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Nom & Prénom du Promoteur / Fondateur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={promoterName}
                    onChange={(e) => setPromoterName(e.target.value)}
                    placeholder="ex: Dr. Jean-Baptiste KABANGE"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Rôle / Fonction Officielle
                  </label>
                  <CustomSelect
                    options={ROLE_OPTIONS}
                    value={promoterRole}
                    onChange={(val) => setPromoterRole(val)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Email de Connexion (Login) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={promoterEmail}
                    onChange={(e) => setPromoterEmail(e.target.value)}
                    placeholder="admin@votre-ecole.cd"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Téléphone Validation 2FA (SMS / OTP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={promoterPhone2FA}
                    onChange={(e) => setPromoterPhone2FA(e.target.value)}
                    placeholder="+243 81 000 0000"
                    className="w-full px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* MOT DE PASSE ET CONFIRMATION AVEC BOUTON ŒIL (SHOW/HIDE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Mot de Passe Sécurisé <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={promoterPassword}
                      onChange={(e) => setPromoterPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                    Confirmer le Mot de Passe <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-4 pr-10 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 ${
                        confirmPassword && confirmPassword !== promoterPassword
                          ? 'border-red-500 focus:ring-red-500/40'
                          : 'focus:ring-indigo-500/40'
                      }`}
                      style={{ background: 'var(--bg-sunken)', borderColor: confirmPassword && confirmPassword !== promoterPassword ? '#ef4444' : 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-6 space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-indigo-700 dark:text-indigo-400 tracking-wide flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Code PIN d'Autorisation Caisse (6 chiffres)
                  </label>
                  <div className="relative">
                    <input
                      type={showPinCode ? 'text' : 'password'}
                      maxLength={6}
                      value={promoterPinCode}
                      onChange={(e) => setPromoterPinCode(e.target.value)}
                      placeholder="6 chiffres"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border font-mono font-black text-center text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinCode(!showPinCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                    >
                      {showPinCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-6 p-3.5 rounded-xl border bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                    <Cpu className="w-4 h-4" /> Empreinte HWID Matérielle Détectée
                  </div>
                  <p className="font-mono text-[10.5px] font-bold text-indigo-600 dark:text-indigo-300 truncate">{hwid}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : INFORMATIONS LICENCE LOGICIEL & ABONNEMENT SAAS ── */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                4. Licence du Logiciel, Formule d'Abonnement & Monnaie
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Sélectionnez le mode de licence Ecolisa Enterprise et la devise principale de votre caisse locale.
              </p>
            </div>

            <div className="space-y-5">
              {/* FORMULES D'ABONNEMENT LOGICIEL */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                  Formule de Licence Logicielle Choisie
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'MENSUEL', title: 'Mensuel Enterprise', price: '$25 / mois', desc: 'Facturation mobile money mensuelle sans engagement' },
                    { id: 'ANNUEL', title: 'Annuel Pro (-20%)', price: '$240 / an', desc: 'Recommandé · Économisez $60 par an + Support 24/7' },
                    { id: 'PERPETUEL', title: 'Licence Off-Line', price: '$450 unique', desc: 'Achat définitif · Clé hors-ligne Ed25519 illimitée' },
                  ].map((p) => {
                    const isSelected = subscriptionPlan === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSubscriptionPlan(p.id as any)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-slate-900 dark:text-white ring-2 ring-indigo-500/30 shadow-xs'
                            : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-black">{p.title}</h4>
                          {isSelected && <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>
                        <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-2">{p.price}</div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">{p.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DEVISE PRINCIPALE CAISSE */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase text-slate-800 dark:text-slate-200 tracking-wide">
                  Devise Principale de Comptabilité
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                      currency === 'USD'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                        : 'border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-black">Dollar Américain (USD $)</div>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Standard Minerval RDC</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrency('CDF')}
                    className={`p-4 rounded-xl border text-center transition-all cursor-pointer ${
                      currency === 'CDF'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                        : 'border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-sm font-black">Franc Congolais (CDF FC)</div>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Devise Nationale RDC</p>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Validation automatique FlexPay Mobile Money (M-Pesa, Orange, Airtel)</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] uppercase font-black">
                  Intégré RDC
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 5 : RECAPITULATIF & VALIDATION PERSISTANTE ── */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in text-center py-4 max-w-5xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-8 h-8 text-emerald-500" />
            </div>

            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Initialisation Prête à être Lancée !
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto font-medium">
                L'établissement <strong className="text-indigo-600 dark:text-indigo-400">{schoolName || 'Votre Établissement'}</strong> ({province}) est pré-configuré dans la base locale hors-ligne.
              </p>
            </div>

            <div className="p-6 rounded-2xl border text-left text-xs space-y-3 font-semibold max-w-xl mx-auto shadow-xs" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-slate-500 dark:text-slate-400 uppercase font-black text-[10px]">Établissement :</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">{schoolName || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-slate-500 dark:text-slate-400 uppercase font-black text-[10px]">Type & Agrément MINEPST :</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{schoolType} · {arreteAgrement || 'Non spécifié'}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-slate-500 dark:text-slate-400 uppercase font-black text-[10px]">Options EPST ({selectedOptions.length}) :</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedCycles.join(', ')}</span>
              </div>
              <div className="flex justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-slate-500 dark:text-slate-400 uppercase font-black text-[10px]">Promoteur Racine & 2FA :</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{promoterName || 'Promoteur'} ({promoterPhone2FA || '2FA'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400 uppercase font-black text-[10px]">Licence & Formule :</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{subscriptionPlan} · Devise : {currency}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER AVEC BOUTONS DE NAVIGATION ET METADATAS ECOLISA */}
      <footer className="px-8 py-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-20 shadow-lg">
        {/* GAUCHE : METADATAS ECOLISA (VERSION, EMAIL, SITE WEB & LOCAL-FIRST BADGE) */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] font-medium text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-slate-100">ECOLISA ERP Enterprise v1.0.4</span>
          <span>•</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">ecolisa@contact.com</span>
          <span>•</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">www.ecolisa.com</span>
        </div>

        {/* DROITE : BOUTONS DE NAVIGATION AVEC CONTRASTE ÉLEVÉ */}
        <div className="flex items-center gap-3 ml-auto">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-xl text-xs font-black border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Précédent</span>
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Continuer l'Assistant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span>Valider & Aller à la Connexion</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
