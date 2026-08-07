import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  User,
  GraduationCap,
  Users as UsersIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  QrCode,
  Camera,
  MapPin,
  Heart,
  BadgeAlert,
  School,
  ArrowLeft,
  Wallet,
  Banknote,
  Clock,
  CreditCard,
  Smartphone,
  ImagePlus,
  X as XIcon,
  Baby,
  BookOpenCheck,
  Printer,
  Tag,
  Upload,
  AlertCircle,
  Sparkles,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  BadgeCheck,
  UserCheck,
  DollarSign,
  FileText,
  Award
} from 'lucide-react';
import { Eleve, ClasseScolaire, AnneeScolaireConfig, FactureEleve, TransactionPaiement, TypeFraisScolaire, LigneFacture } from '../../types';
import type { SchoolConfig } from '../onboarding/OnboardingWizard';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { WebcamCaptureModal } from '../common/WebcamCaptureModal';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { PROVINCES_RDC } from '../../data/referentielEPST';

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
  { value: 'O-', label: 'O- (Rares)' },
  { value: 'A-', label: 'A-' },
  { value: 'B-', label: 'B-' },
  { value: 'AB-', label: 'AB-' },
];

const CYCLE_OPTIONS: SelectOption[] = [
  { value: 'MATERNELLE', label: 'Cycle Maternelle (Petite/Moyenne/Grande Section)', icon: Baby },
  { value: 'PRIMAIRE', label: 'Cycle Primaire (1ère à 6ème Primaire)', icon: BookOpenCheck },
  { value: 'SECONDAIRE_CTEB', label: 'Secondaire CTEB (7ème & 8ème)', icon: School },
  { value: 'HUMANITES', label: 'Humanités (Options / Filières)', icon: GraduationCap },
];

const CYCLES_AVEC_OPTIONS = ['HUMANITES'];

const OPTION_EPST_OPTIONS: SelectOption[] = [
  { value: 'Math-Physique', label: 'Mathématique-Physique (STEM)' },
  { value: 'Biologie-Chimie', label: 'Biologie-Chimie (SVT)' },
  { value: 'Commerciale', label: 'Commerciale & Gestion' },
  { value: 'Pédagogie', label: 'Pédagogie Générale' },
  { value: 'Littéraire', label: 'Littéraire & Langues' },
];

const CYCLE_LABELS: Record<string, string> = {
  MATERNELLE: 'Cycle Maternelle',
  PRIMAIRE: 'Cycle Primaire',
  SECONDAIRE_CTEB: 'Secondaire CTEB',
  HUMANITES: 'Humanités',
};

const REGIME_OPTIONS: SelectOption[] = [
  { value: 'EXTERNE', label: 'Externe (Demi-journée)' },
  { value: 'INTERNE', label: 'Interne (Internat Établissement)' },
  { value: 'SEMI_INTERNE', label: 'Semi-Interne (Cantine)' },
];

const LANGUE_OPTIONS: SelectOption[] = [
  { value: 'Français', label: 'Français (Programme Officiel EPST)' },
  { value: 'Anglais', label: 'Section Bilangue Français / Anglais' },
];

const MOYEN_PAIEMENT_OPTIONS: SelectOption[] = [
  { value: 'CASH', label: 'Cash en Caisse', icon: Banknote },
  { value: 'MOBILE_MONEY', label: 'Mobile Money (M-Pesa / Orange / Airtel)', icon: Smartphone },
  { value: 'VIREMENT', label: 'Virement Bancaire / Chèque', icon: CreditCard },
];

interface StudentRegistrationPageProps {
  onBack: () => void;
  onRegister?: (newStudent: Eleve) => void;
  onUpdate?: (updated: Eleve) => void;
  defaultSchoolYearId?: string | null;
  initialStudent?: Eleve | null;
}

export const StudentRegistrationModal: React.FC<StudentRegistrationPageProps> = ({
  onBack,
  onRegister,
  onUpdate,
  defaultSchoolYearId,
  initialStudent,
}) => {
  const isEdit = !!initialStudent;
  const { currency: systemCurrency, exchangeRate } = useSchoolConfig();

  // Navigation du Wizard (4 étapes d'origine conservées)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [previewTab, setPreviewTab] = useState<'BADGE' | 'SYNTHESE'>('BADGE');
  const [isWebcamOpen, setIsWebcamOpen] = useState<boolean>(false);

  const [classesList, setClassesList] = useState<ClasseScolaire[]>([]);
  const [schoolYears, setSchoolYears] = useState<AnneeScolaireConfig[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feeTypes, setFeeTypes] = useState<TypeFraisScolaire[]>([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // État complet du formulaire d'inscription
  const [formData, setFormData] = useState({
    // Étape 1 : Identité & Origine RDC
    registrationNumber: initialStudent?.registrationNumber || '',
    nom: '',
    postnom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    dateNaissance: '2015-01-01',
    lieuNaissance: 'Kinshasa',
    nationalite: 'Congolaise (RDC)',
    province: 'Kinshasa',
    provinceOrigine: 'Kinshasa',
    territoireCommune: '',
    chefferieSecteur: '',
    groupement: '',
    village: '',
    adressePhysique: '',
    adresse: '',
    groupeSanguin: 'O+',
    allergies: '',
    informationsMedicales: '',
    description: '',
    telephoneEleve: '',
    emailEleve: '',
    photoUrl: '',

    // Étape 2 : Scolarité & EPST
    schoolYearId: '',
    anneeScolaire: '',
    cycleId: 'HUMANITES',
    optionEPST: 'Math-Physique',
    classId: '',
    nomClasse: '',
    regime: 'EXTERNE' as 'EXTERNE' | 'INTERNE' | 'SEMI_INTERNE',
    langue: 'Français',

    // Étape 3 : Tuteurs & Parents
    nomPere: '',
    professionPere: '',
    telephonePere: '',
    emailPere: '',
    nomMere: '',
    professionMere: '',
    telephoneMere: '',
    emailMere: '',
    emailParent: '',
    contactUrgence: '',
    notes: '',

    // Dossier complet supplémentaire
    numeroActeNaissance: '',
    ecoleOrigine: '',
    religion: '',
    langueMaternelle: 'Français',
    handicap: '',
    vaccinations: '',
    medecinTraitant: '',
    assuranceSante: '',
    numeroCarteSante: '',
    nomTuteur: '',
    telephoneTuteur: '',
    professionTuteur: '',
    relationTuteur: 'Père',
    adresseTuteur: '',
    nomReferentUrgence: '',
    telephoneReferentUrgence: '',
    relationReferentUrgence: 'Parent',
    transportScolaire: 'AUCUN' as 'AUCUN' | 'BUS' | 'VOITURE' | 'MOTO' | 'PIED',
    cantine: false,
    internat: false,
    boursier: false,
    aideSociale: false,
    anneePrecedente: '',
    moyenneAnneePrecedente: 0,
    dateInscription: new Date().toISOString().split('T')[0],

    // Étape 4 : Frais d'inscription & Paiement
    payerMaintenant: true,
    montantInscription: 0,
    devise: systemCurrency as 'USD' | 'CDF',
    moyenPaiement: 'CASH' as TransactionPaiement['moyenPaiement'],
    referencePaiement: '',
    datePaiement: new Date().toISOString().split('T')[0],
    numeroRecu: `RECU-${Date.now()}`,
    nomCaissier: '',
  });

  // Matricule auto-généré format EPST RDC
  const generatedRegistrationNumber = useMemo(() => {
    if (initialStudent?.registrationNumber) return initialStudent.registrationNumber;
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    return `2026-EPST-${randomCode}-KIN`;
  }, [initialStudent]);

  // Chargement relationnel des classes et années scolaires
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [classes, years, config] = await Promise.all([
        LocalDatabaseService.getClasses(),
        LocalDatabaseService.getSchoolYears(),
        LocalDatabaseService.getConfig('school_config')
      ]);
      if (!mounted) return;
      setClassesList(classes);
      setSchoolYears(years);
      setSchoolConfig(config);

      const activeYear = defaultSchoolYearId
        ? years.find(y => y.id === defaultSchoolYearId)
        : (years.find(y => y.statut === 'EN_COURS') || years[0]);
      const firstClass = classes.find(c => c.schoolYearId === activeYear?.id) || classes[0];

      setFormData(prev => ({
        ...prev,
        registrationNumber: prev.registrationNumber || generatedRegistrationNumber,
        schoolYearId: activeYear?.id || '',
        anneeScolaire: activeYear?.nom || '',
        classId: firstClass?.id || '',
        nomClasse: firstClass?.nom || '',
        cycleId: (firstClass?.cycleId as any) || 'HUMANITES',
        montantInscription: firstClass?.fraisInscription ?? activeYear?.fraisInscription ?? 0,
        devise: firstClass?.devise || systemCurrency
      }));
      setIsLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [defaultSchoolYearId, generatedRegistrationNumber, systemCurrency]);

  // Chargement des types de frais de l'année scolaire sélectionnée
  useEffect(() => {
    if (!formData.schoolYearId) return;
    LocalDatabaseService.getFeeTypes(formData.schoolYearId).then(setFeeTypes);
  }, [formData.schoolYearId]);

  // Frais applicables selon le profil de l'élève
  const applicableFees = useMemo(() => {
    const option = CYCLES_AVEC_OPTIONS.includes(formData.cycleId)
      ? formData.optionEPST
      : 'TRONC_COMMUN';
    return feeTypes.filter(ft => {
      if (ft.actif === false) return false;
      if (ft.schoolYearId && ft.schoolYearId !== formData.schoolYearId && ft.anneeScolaireId !== formData.schoolYearId) return false;
      if (ft.cycleId && ft.cycleId !== 'TOUS' && ft.cycleId !== formData.cycleId) return false;
      if (ft.optionCode && ft.optionCode !== 'TOUS' && ft.optionCode !== option) return false;
      if (ft.regime && ft.regime !== 'TOUS' && ft.regime !== formData.regime) return false;
      if (ft.portee && ft.portee !== 'TOUS' && ft.portee !== formData.nomClasse) return false;
      return true;
    });
  }, [feeTypes, formData.cycleId, formData.optionEPST, formData.regime, formData.nomClasse, formData.schoolYearId]);

  // Sélection automatique des frais d'inscription
  useEffect(() => {
    if (feeTypes.length && !selectedFeeIds.length) {
      const auto = applicableFees
        .filter(ft => ft.obligatoire || ft.categorie === 'FRAIS_INSCRIPTION' || ft.categorie === 'FRAIS_REINSCRIPTION')
        .map(ft => ft.id);
      setSelectedFeeIds(auto);
    }
  }, [applicableFees, feeTypes.length, selectedFeeIds.length]);

  // Lignes de facture calculées
  const invoiceLignes: LigneFacture[] = useMemo(() => {
    return selectedFeeIds.map(id => {
      const ft = feeTypes.find(f => f.id === id);
      const rawMontant = ft?.montant || 0;
      const ftDevise = ft?.devise || systemCurrency;
      const finalMontant = convertCurrency(rawMontant, ftDevise, formData.devise, exchangeRate);
      return {
        id: `l_${id}_${Date.now()}`,
        invoiceId: '',
        feeTypeId: id,
        nom: ft?.nom || 'Frais scolaire',
        categorie: ft?.categorie || 'FRAIS_INSCRIPTION',
        montant: finalMontant,
        devise: formData.devise,
      };
    });
  }, [selectedFeeIds, feeTypes, systemCurrency, formData.devise, exchangeRate]);

  // Total calculé des frais sélectionnés
  const totalFacture = useMemo(() => {
    return invoiceLignes.reduce((sum, l) => sum + l.montant, 0);
  }, [invoiceLignes]);

  // Mettre à jour le montantInscription dès que le total change
  useEffect(() => {
    if (totalFacture > 0) {
      setFormData(prev => ({ ...prev, montantInscription: totalFacture }));
    }
  }, [totalFacture]);

  // Initialisation lors de l'édition d'un élève
  useEffect(() => {
    if (!initialStudent || !classesList.length || !schoolYears.length) return;
    const studentClass = classesList.find(c => c.id === initialStudent.classId);
    const studentYear = schoolYears.find(y => y.id === (studentClass?.schoolYearId || initialStudent.schoolYearId));
    const cycleId = (studentClass?.cycleId as any) || 'HUMANITES';
    const optionEPST = CYCLES_AVEC_OPTIONS.includes(cycleId)
      ? ((studentClass?.optionCode as any) || 'Math-Physique')
      : 'TRONC_COMMUN';
    const fee = studentClass?.fraisInscription ?? studentYear?.fraisInscription ?? 0;

    setFormData(prev => ({
      ...prev,
      registrationNumber: initialStudent.registrationNumber || generatedRegistrationNumber,
      nom: initialStudent.nom || '',
      postnom: initialStudent.postnom || '',
      prenom: initialStudent.prenom || '',
      sexe: initialStudent.sexe || 'M',
      dateNaissance: initialStudent.dateNaissance || '2015-01-01',
      lieuNaissance: initialStudent.lieuNaissance || 'Kinshasa',
      nationalite: initialStudent.nationalite || 'Congolaise (RDC)',
      province: initialStudent.province || 'Kinshasa',
      provinceOrigine: initialStudent.provinceOrigine || 'Kinshasa',
      territoireCommune: initialStudent.territoireCommune || '',
      chefferieSecteur: initialStudent.chefferieSecteur || '',
      groupement: initialStudent.groupement || '',
      village: initialStudent.village || '',
      adressePhysique: initialStudent.adressePhysique || '',
      adresse: initialStudent.adressePhysique || '',
      groupeSanguin: initialStudent.groupeSanguin || 'O+',
      allergies: initialStudent.allergies || '',
      informationsMedicales: initialStudent.informationsMedicales || '',
      description: initialStudent.description || initialStudent.notesPsychopedagogiques || '',
      notes: initialStudent.notesPsychopedagogiques || initialStudent.description || '',
      telephoneEleve: initialStudent.telephoneEleve || '',
      emailEleve: initialStudent.emailEleve || '',
      photoUrl: initialStudent.photoUrl || '',
      schoolYearId: studentYear?.id || initialStudent.schoolYearId || '',
      anneeScolaire: studentYear?.nom || '',
      cycleId,
      optionEPST,
      classId: studentClass?.id || initialStudent.classId || '',
      nomClasse: studentClass?.nom || initialStudent.nomClasse || '',
      regime: 'EXTERNE',
      langue: 'Français',
      payerMaintenant: false,
      montantInscription: fee,
      devise: studentClass?.devise || systemCurrency,
      nomPere: initialStudent.nomPere || '',
      professionPere: initialStudent.professionPere || '',
      telephonePere: initialStudent.telephonePere || '',
      emailPere: initialStudent.emailPere || '',
      nomMere: initialStudent.nomMere || '',
      professionMere: initialStudent.professionMere || '',
      telephoneMere: initialStudent.telephoneMere || '',
      emailMere: initialStudent.emailMere || '',
      emailParent: initialStudent.emailParent || '',
      contactUrgence: initialStudent.telephoneParent || '',
      numeroRecu: `RECU-${Date.now()}`,
      numeroActeNaissance: initialStudent.numeroActeNaissance || '',
      ecoleOrigine: initialStudent.ecoleOrigine || '',
      religion: initialStudent.religion || '',
      langueMaternelle: initialStudent.langueMaternelle || 'Français',
      handicap: initialStudent.handicap || '',
      vaccinations: initialStudent.vaccinations || '',
      medecinTraitant: initialStudent.medecinTraitant || '',
      assuranceSante: initialStudent.assuranceSante || '',
      numeroCarteSante: initialStudent.numeroCarteSante || '',
      nomTuteur: initialStudent.nomTuteur || '',
      telephoneTuteur: initialStudent.telephoneTuteur || '',
      professionTuteur: initialStudent.professionTuteur || '',
      relationTuteur: initialStudent.relationTuteur || 'Père',
      adresseTuteur: initialStudent.adresseTuteur || '',
      nomReferentUrgence: initialStudent.nomReferentUrgence || '',
      telephoneReferentUrgence: initialStudent.telephoneReferentUrgence || '',
      relationReferentUrgence: initialStudent.relationReferentUrgence || 'Parent',
      transportScolaire: initialStudent.transportScolaire || 'AUCUN',
      cantine: !!initialStudent.cantine,
      internat: !!initialStudent.internat,
      boursier: !!initialStudent.boursier,
      aideSociale: !!initialStudent.aideSociale,
      anneePrecedente: initialStudent.anneePrecedente || '',
      moyenneAnneePrecedente: initialStudent.moyenneAnneePrecedente || 0,
      dateInscription: initialStudent.dateInscription || new Date().toISOString().split('T')[0],
    }));
    setStep(1);
  }, [initialStudent, classesList, schoolYears, generatedRegistrationNumber, systemCurrency]);

  const hasOptions = CYCLES_AVEC_OPTIONS.includes(formData.cycleId);

  // Classes filtrées selon le cycle et l'année scolaire
  const filteredClasses = useMemo(
    () => classesList.filter(c =>
      (!formData.cycleId || c.cycleId === formData.cycleId) &&
      (!formData.schoolYearId || c.schoolYearId === formData.schoolYearId)
    ),
    [classesList, formData.cycleId, formData.schoolYearId]
  );

  const classOptions: SelectOption[] = useMemo(
    () => filteredClasses.map(c => ({ value: c.id, label: c.nom })),
    [filteredClasses]
  );

  const schoolYearOptions: SelectOption[] = useMemo(
    () => schoolYears.map(y => ({ value: y.id, label: `${y.nom} — ${y.statut}` })),
    [schoolYears]
  );

  // Taux de complétude du dossier (%)
  const completionPercentage = useMemo(() => {
    const required = [
      formData.prenom,
      formData.nom,
      formData.sexe,
      formData.classId,
      formData.telephonePere || formData.telephoneMere || formData.telephoneEleve,
    ];
    const filled = required.filter(f => Boolean(f) && String(f).trim() !== '').length;
    return Math.round((filled / required.length) * 100);
  }, [formData]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const toggleFeeSelection = (id: string) => {
    setSelectedFeeIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStepNext = () => {
    setValidationError(null);
    if (step === 1) {
      if (!formData.prenom || !formData.nom) {
        setValidationError("Le prénom et le nom de famille de l'élève sont obligatoires.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.classId) {
        setValidationError("Veuillez sélectionner une classe pour inscrire l'élève.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleSaveStudent = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.prenom || !formData.nom) {
      setValidationError("Le prénom et le nom de famille de l'élève sont obligatoires.");
      setStep(1);
      return;
    }

    if (!formData.classId) {
      setValidationError("Veuillez sélectionner une classe pour inscrire l'élève.");
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      const targetClass = classesList.find(c => c.id === formData.classId);

      const payload: Partial<Eleve> = {
        id: initialStudent?.id || `student_${Date.now()}`,
        registrationNumber: formData.registrationNumber || generatedRegistrationNumber,
        nom: formData.nom.toUpperCase(),
        postnom: formData.postnom,
        prenom: formData.prenom,
        sexe: formData.sexe,
        dateNaissance: formData.dateNaissance,
        lieuNaissance: formData.lieuNaissance,
        nationalite: formData.nationalite,
        province: formData.province,
        provinceOrigine: formData.provinceOrigine,
        territoireCommune: formData.territoireCommune,
        chefferieSecteur: formData.chefferieSecteur,
        groupement: formData.groupement,
        village: formData.village,
        adressePhysique: formData.adressePhysique || formData.adresse,
        groupeSanguin: formData.groupeSanguin,
        allergies: formData.allergies,
        informationsMedicales: formData.informationsMedicales,
        description: formData.description || formData.notes,
        notesPsychopedagogiques: formData.notes || formData.description,
        telephoneEleve: formData.telephoneEleve,
        emailEleve: formData.emailEleve,
        photoUrl: formData.photoUrl,
        schoolYearId: formData.schoolYearId,
        classId: formData.classId,
        nomClasse: targetClass?.nom || formData.nomClasse,
        statut: 'ACTIF',
        nomPere: formData.nomPere,
        professionPere: formData.professionPere,
        telephonePere: formData.telephonePere,
        emailPere: formData.emailPere,
        nomMere: formData.nomMere,
        professionMere: formData.professionMere,
        telephoneMere: formData.telephoneMere,
        emailMere: formData.emailMere,
        nomParent: formData.nomPere || formData.nomMere || formData.nomTuteur || 'Parent Élève',
        telephoneParent: formData.contactUrgence || formData.telephonePere || formData.telephoneMere || formData.telephoneTuteur || '',
        emailParent: formData.emailParent || formData.emailPere || formData.emailMere || formData.emailEleve,

        // Dossier complet
        numeroActeNaissance: formData.numeroActeNaissance,
        ecoleOrigine: formData.ecoleOrigine,
        religion: formData.religion,
        langueMaternelle: formData.langueMaternelle,
        handicap: formData.handicap,
        vaccinations: formData.vaccinations,
        medecinTraitant: formData.medecinTraitant,
        assuranceSante: formData.assuranceSante,
        numeroCarteSante: formData.numeroCarteSante,
        nomTuteur: formData.nomTuteur,
        telephoneTuteur: formData.telephoneTuteur,
        professionTuteur: formData.professionTuteur,
        relationTuteur: formData.relationTuteur,
        adresseTuteur: formData.adresseTuteur,
        nomReferentUrgence: formData.nomReferentUrgence,
        telephoneReferentUrgence: formData.telephoneReferentUrgence,
        relationReferentUrgence: formData.relationReferentUrgence,
        transportScolaire: formData.transportScolaire,
        cantine: formData.cantine,
        internat: formData.internat,
        boursier: formData.boursier,
        aideSociale: formData.aideSociale,
        anneePrecedente: formData.anneePrecedente,
        moyenneAnneePrecedente: formData.moyenneAnneePrecedente,
        dateInscription: formData.dateInscription,
      };

      let saved: Eleve | null;
      if (isEdit && initialStudent?.id) {
        saved = await LocalDatabaseService.updateStudent(initialStudent.id, payload);
        if (saved) onUpdate?.(saved);
      } else {
        saved = await LocalDatabaseService.addStudent(payload as Eleve);
        if (saved) onRegister?.(saved);
      }

      // Génération automatique de la facture & du reçu de caisse si coché à l'étape 4
      if (saved && invoiceLignes.length > 0) {
        const invoiceId = `inv_${Date.now()}`;
        const paidAmount = formData.payerMaintenant
          ? Math.min(Number(formData.montantInscription) || 0, totalFacture)
          : 0;
        const statut = paidAmount >= totalFacture - 0.001
          ? 'PAYE'
          : paidAmount > 0
            ? 'PARTIEL'
            : 'NON_PAYE';

        const newInvoice: FactureEleve = {
          id: invoiceId,
          numeroFacture: `FAC-${Date.now()}`,
          studentId: saved.id,
          eleveId: saved.id,
          nomEleve: `${saved.prenom} ${saved.nom}`,
          anneeScolaireId: formData.schoolYearId,
          anneeScolaire: formData.anneeScolaire || '2025-2026',
          nomClasse: saved.nomClasse,
          statut,
          devise: formData.devise,
          montantTotal: totalFacture,
          montantPaye: paidAmount,
          dateEcheance: new Date().toISOString().split('T')[0],
          lignes: invoiceLignes.map(l => ({ ...l, invoiceId })),
        };
        await LocalDatabaseService.addInvoice(newInvoice);

        if (formData.payerMaintenant && paidAmount > 0) {
          // Répartition du montant payé sur les lignes de frais
          let remaining = paidAmount;
          const allocations = invoiceLignes
            .map(l => {
              const alloc = Math.min(l.montant, remaining);
              remaining = Math.max(0, remaining - alloc);
              return { feeTypeId: l.feeTypeId, montant: Number(alloc.toFixed(2)) };
            })
            .filter(a => a.montant > 0.001);

          const payment: TransactionPaiement = {
            id: `pay_${Date.now()}`,
            anneeScolaireId: formData.schoolYearId,
            invoiceId,
            nomEleve: `${saved.prenom} ${saved.nom}`,
            registrationNumber: saved.registrationNumber,
            montantPaye: paidAmount,
            devise: formData.devise,
            moyenPaiement: (formData.moyenPaiement as any) || 'CASH',
            reference: formData.referencePaiement,
            numeroRecu: formData.numeroRecu,
            dateCreation: formData.datePaiement || new Date().toISOString().split('T')[0],
            nomCaissier: formData.nomCaissier || 'Caissier',
            jetonQrCode: `qr-${saved.registrationNumber}`,
            allocations,
          };
          await LocalDatabaseService.addPayment(payment);
        }
      }

      onBack();
    } catch (err: any) {
      console.error('[StudentRegistration] Erreur enregistrement :', err);
      setValidationError(err?.message || "Erreur lors de l'enregistrement de l'élève.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cycleIcon = formData.cycleId === 'MATERNELLE' ? Baby : formData.cycleId === 'HUMANITES' ? GraduationCap : BookOpenCheck;
  const CycleIcon = cycleIcon;

  return (
    <div className="space-y-6 animate-fade-in w-full pb-16 select-none">
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer hover:bg-slate-500/10"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft className="w-4 h-4 text-indigo-500" />
          <span>{isEdit ? "Retour à la Fiche Élève" : "Retour à la Liste des Élèves"}</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fiche Officielle d'Inscription Élève EPST RDC (4 Étapes)</span>
          </div>
        </div>
      </div>

      {/* Grid à 2 colonnes (Split 50/50 : Formulaire Pas-à-Pas Gauche + Live Preview Droite) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_450px] gap-6 items-start">
        
        {/* COLONNE GAUCHE : Formulaire pas-à-pas en 4 étapes */}
        <div
          className="p-6 sm:p-8 rounded-2xl border shadow-xs transition-colors"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {/* Titre & Indicateur des 4 étapes */}
          <div className="pb-6 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                <CycleIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  {isEdit ? `Modification : ${initialStudent?.prenom} ${initialStudent?.nom}` : 'Nouvelle Inscription Élève'}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {CYCLE_LABELS[formData.cycleId] || 'Cycle Scolaire'} • Identité, filière EPST, tuteurs et facturation.
                </p>
              </div>
            </div>

            {/* Barre de navigation des 4 étapes d'origine */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              {[
                { num: 1, label: 'Identité', icon: User },
                { num: 2, label: 'Scolarité', icon: School },
                { num: 3, label: 'Parents', icon: UsersIcon },
                { num: 4, label: 'Paiement', icon: Wallet },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num as any)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    step === s.num
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">{s.num}</span>
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {validationError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Formulaire Pas-à-Pas */}
          <form onSubmit={handleSaveStudent} className="space-y-6">
            
            {/* ÉTAPE 1 : IDENTITÉ, ORIGINE RDC & SANTÉ */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                {/* Photo Studio & Upload */}
                <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="relative shrink-0">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Photo Élève"
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-indigo-500 shadow-md"
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/40 flex items-center justify-center text-indigo-500 font-black text-4xl">
                        {formData.prenom ? formData.prenom[0].toUpperCase() : 'E'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 flex-1 text-center sm:text-left">
                    <h4 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Photo Officielle d'Identité Élève
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Prenez une photo studio en direct par WebCam ou importez une image HD.
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section Identifiant EPST */}
                <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Identifiant Officiel EPST RDC</span>
                  </h3>
                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      N° PERMANENT EPST / Matricule Élève
                    </label>
                    <input
                      type="text"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      placeholder="Ex: 2026-EPST-8492-KIN"
                      className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Section Identité Civique */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>Identité Civique de l'Élève</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Prénom <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        placeholder="Prénom de l'élève"
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
                        value={formData.nom}
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
                        value={formData.postnom}
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
                        options={SEXE_OPTIONS}
                        value={formData.sexe}
                        onChange={(val) => setFormData({ ...formData, sexe: val as 'M' | 'F' })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Date de Naissance
                      </label>
                      <CustomDatePicker
                        value={formData.dateNaissance}
                        onChange={(dateStr) => setFormData({ ...formData, dateNaissance: dateStr })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Lieu de Naissance
                      </label>
                      <input
                        type="text"
                        value={formData.lieuNaissance}
                        onChange={(e) => setFormData({ ...formData, lieuNaissance: e.target.value })}
                        placeholder="Kinshasa"
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
                        options={NATIONALITE_OPTIONS}
                        value={formData.nationalite}
                        onChange={(val) => setFormData({ ...formData, nationalite: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Province d'Origine RDC
                      </label>
                      <CustomSelect
                        options={PROVINCES_RDC_OPTIONS}
                        value={formData.provinceOrigine || 'Kinshasa'}
                        onChange={(val) => setFormData({ ...formData, provinceOrigine: val })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Adresse Résidentielle Actuelle
                    </label>
                    <input
                      type="text"
                      value={formData.adressePhysique}
                      onChange={(e) => setFormData({ ...formData, adressePhysique: e.target.value, adresse: e.target.value })}
                      placeholder="Avenue, N°, Quartier, Commune"
                      className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Section Santé */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <span>Santé & Groupe Sanguin</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Groupe Sanguin
                      </label>
                      <CustomSelect
                        options={GROUPE_SANGUIN_OPTIONS}
                        value={formData.groupeSanguin}
                        onChange={(val) => setFormData({ ...formData, groupeSanguin: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Allergies Connues
                      </label>
                      <input
                        type="text"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        placeholder="Ex: Intolérance au lactose"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Dossier Administratif & Social */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Dossier Administratif & Social</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        N° Acte de Naissance
                      </label>
                      <input
                        type="text"
                        value={formData.numeroActeNaissance}
                        onChange={(e) => setFormData({ ...formData, numeroActeNaissance: e.target.value })}
                        placeholder="Ex: 001245/2026/KIN"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        École d'Origine
                      </label>
                      <input
                        type="text"
                        value={formData.ecoleOrigine}
                        onChange={(e) => setFormData({ ...formData, ecoleOrigine: e.target.value })}
                        placeholder="Nom de l'école précédente"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Religion
                      </label>
                      <CustomSelect
                        options={[
                          { value: '', label: 'Non précisée' },
                          { value: 'Catholique', label: 'Catholique' },
                          { value: 'Protestant', label: 'Protestant / Évangélique' },
                          { value: 'Kimbanguiste', label: 'Kimbanguiste' },
                          { value: 'Musulman', label: 'Musulman' },
                          { value: 'Autre', label: 'Autre' },
                        ]}
                        value={formData.religion}
                        onChange={(val) => setFormData({ ...formData, religion: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Langue Maternelle
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'Français', label: 'Français' },
                          { value: 'Lingala', label: 'Lingala' },
                          { value: 'Swahili', label: 'Swahili' },
                          { value: 'Kikongo', label: 'Kikongo' },
                          { value: 'Tshiluba', label: 'Tshiluba' },
                          { value: 'Autre', label: 'Autre' },
                        ]}
                        value={formData.langueMaternelle}
                        onChange={(val) => setFormData({ ...formData, langueMaternelle: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Handicap / Affection
                      </label>
                      <input
                        type="text"
                        value={formData.handicap}
                        onChange={(e) => setFormData({ ...formData, handicap: e.target.value })}
                        placeholder="Aucun ou préciser"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Vaccinations à jour
                      </label>
                      <input
                        type="text"
                        value={formData.vaccinations}
                        onChange={(e) => setFormData({ ...formData, vaccinations: e.target.value })}
                        placeholder="Ex: BCG, DTC, Rougeole"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Médecin Traitant
                      </label>
                      <input
                        type="text"
                        value={formData.medecinTraitant}
                        onChange={(e) => setFormData({ ...formData, medecinTraitant: e.target.value })}
                        placeholder="Nom et contact du médecin"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Assurance / Mutuelle Santé
                      </label>
                      <input
                        type="text"
                        value={formData.assuranceSante}
                        onChange={(e) => setFormData({ ...formData, assuranceSante: e.target.value })}
                        placeholder="Ex: CNSS, privée"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        N° Carte / Fiche Médicale
                      </label>
                      <input
                        type="text"
                        value={formData.numeroCarteSante}
                        onChange={(e) => setFormData({ ...formData, numeroCarteSante: e.target.value })}
                        placeholder="Numéro de carte"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleStepNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <span>Passer à l’Étape 2 (Scolarité)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 2 : SCOLARITÉ, PROMOTION & OPTION EPST */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <School className="w-4 h-4 text-indigo-500" />
                    <span>Affectation Scolaire EPST RDC</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Année Scolaire d'Inscription
                      </label>
                      <CustomSelect
                        options={schoolYearOptions}
                        value={formData.schoolYearId}
                        onChange={(val) => {
                          const y = schoolYears.find(sy => sy.id === val);
                          setFormData({ ...formData, schoolYearId: val, anneeScolaire: y?.nom || '' });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Cycle Scolaire EPST
                      </label>
                      <CustomSelect
                        options={CYCLE_OPTIONS}
                        value={formData.cycleId}
                        onChange={(val) => {
                          const hasOpt = CYCLES_AVEC_OPTIONS.includes(val);
                          setFormData({
                            ...formData,
                            cycleId: val as any,
                            optionEPST: hasOpt ? formData.optionEPST : 'TRONC_COMMUN',
                            classId: '',
                            nomClasse: '',
                          });
                        }}
                      />
                    </div>
                  </div>

                  {hasOptions && (
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Option / Filière d'Enseignement EPST <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        options={OPTION_EPST_OPTIONS}
                        value={formData.optionEPST}
                        onChange={(val) => setFormData({ ...formData, optionEPST: val })}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Classe / Promotion <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        options={classOptions}
                        value={formData.classId}
                        onChange={(val) => {
                          const targetClass = classesList.find(c => c.id === val);
                          setFormData({
                            ...formData,
                            classId: val,
                            nomClasse: targetClass?.nom || '',
                            montantInscription: targetClass?.fraisInscription ?? formData.montantInscription,
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Régime de Présence
                      </label>
                      <CustomSelect
                        options={REGIME_OPTIONS}
                        value={formData.regime}
                        onChange={(val) => setFormData({ ...formData, regime: val as any })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Langue d'Enseignement
                    </label>
                    <CustomSelect
                      options={LANGUE_OPTIONS}
                      value={formData.langue}
                      onChange={(val) => setFormData({ ...formData, langue: val })}
                    />
                  </div>
                </div>

                {/* Section Parcours & Transport */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                    <School className="w-4 h-4" />
                    <span>Parcours, Transport & Internat</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Transport Scolaire
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'AUCUN', label: 'Aucun' },
                          { value: 'BUS', label: 'Bus scolaire' },
                          { value: 'VOITURE', label: 'Voiture' },
                          { value: 'MOTO', label: 'Moto' },
                          { value: 'PIED', label: 'À pied' },
                        ]}
                        value={formData.transportScolaire}
                        onChange={(val) => setFormData({ ...formData, transportScolaire: val as any })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Année Scolaire Précédente
                      </label>
                      <input
                        type="text"
                        value={formData.anneePrecedente}
                        onChange={(e) => setFormData({ ...formData, anneePrecedente: e.target.value })}
                        placeholder="Ex: 2024-2025"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Moyenne Année Précédente
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formData.moyenneAnneePrecedente}
                        onChange={(e) => setFormData({ ...formData, moyenneAnneePrecedente: Number(e.target.value) })}
                        placeholder="Sur 100"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {[
                      { key: 'cantine', label: 'Cantine' },
                      { key: 'internat', label: 'Internat' },
                      { key: 'boursier', label: 'Boursier' },
                      { key: 'aideSociale', label: 'Aide Sociale' },
                    ].map((t) => (
                      <label key={t.key} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                        <input
                          type="checkbox"
                          checked={!!(formData as any)[t.key]}
                          onChange={(e) => setFormData({ ...formData, [t.key]: e.target.checked } as any)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-500/10"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Retour à l’Étape 1</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStepNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <span>Passer à l’Étape 3 (Parents)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 3 : PARENTS & TUTEURS LÉGAUX */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <UsersIcon className="w-4 h-4" />
                    <span>Tuteurs Légaux & Contacts Famille</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nom du Père
                      </label>
                      <input
                        type="text"
                        value={formData.nomPere}
                        onChange={(e) => setFormData({ ...formData, nomPere: e.target.value })}
                        placeholder="Nom complet du père"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone du Père
                      </label>
                      <input
                        type="tel"
                        value={formData.telephonePere}
                        onChange={(e) => setFormData({ ...formData, telephonePere: e.target.value })}
                        placeholder="+243 ..."
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Profession du Père
                      </label>
                      <input
                        type="text"
                        value={formData.professionPere}
                        onChange={(e) => setFormData({ ...formData, professionPere: e.target.value })}
                        placeholder="Ex: Ingénieur"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nom de la Mère
                      </label>
                      <input
                        type="text"
                        value={formData.nomMere}
                        onChange={(e) => setFormData({ ...formData, nomMere: e.target.value })}
                        placeholder="Nom complet de la mère"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone de la Mère
                      </label>
                      <input
                        type="tel"
                        value={formData.telephoneMere}
                        onChange={(e) => setFormData({ ...formData, telephoneMere: e.target.value })}
                        placeholder="+243 ..."
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Profession de la Mère
                      </label>
                      <input
                        type="text"
                        value={formData.professionMere}
                        onChange={(e) => setFormData({ ...formData, professionMere: e.target.value })}
                        placeholder="Ex: Enseignante"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Tuteur & Contact d'Urgence */}
                <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>Tuteur & Contact d'Urgence</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Nom du Tuteur (si autre que père/mère)
                      </label>
                      <input
                        type="text"
                        value={formData.nomTuteur}
                        onChange={(e) => setFormData({ ...formData, nomTuteur: e.target.value })}
                        placeholder="Nom complet du tuteur"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone du Tuteur
                      </label>
                      <input
                        type="tel"
                        value={formData.telephoneTuteur}
                        onChange={(e) => setFormData({ ...formData, telephoneTuteur: e.target.value })}
                        placeholder="+243 ..."
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Profession du Tuteur
                      </label>
                      <input
                        type="text"
                        value={formData.professionTuteur}
                        onChange={(e) => setFormData({ ...formData, professionTuteur: e.target.value })}
                        placeholder="Ex: Commerçant"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Lien de Parenté (Tuteur)
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'Père', label: 'Père' },
                          { value: 'Mère', label: 'Mère' },
                          { value: 'Oncle', label: 'Oncle' },
                          { value: 'Tante', label: 'Tante' },
                          { value: 'Grand-parent', label: 'Grand-parent' },
                          { value: 'Frère', label: 'Frère' },
                          { value: 'Sœur', label: 'Sœur' },
                          { value: 'Tuteur légal', label: 'Tuteur légal' },
                          { value: 'Autre', label: 'Autre' },
                        ]}
                        value={formData.relationTuteur}
                        onChange={(val) => setFormData({ ...formData, relationTuteur: val })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Adresse du Tuteur
                      </label>
                      <input
                        type="text"
                        value={formData.adresseTuteur}
                        onChange={(e) => setFormData({ ...formData, adresseTuteur: e.target.value })}
                        placeholder="Avenue, N°, Quartier, Commune"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Contact en Cas d'Urgence
                      </label>
                      <input
                        type="text"
                        value={formData.nomReferentUrgence}
                        onChange={(e) => setFormData({ ...formData, nomReferentUrgence: e.target.value })}
                        placeholder="Nom complet"
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Téléphone Urgence
                      </label>
                      <input
                        type="tel"
                        value={formData.telephoneReferentUrgence}
                        onChange={(e) => setFormData({ ...formData, telephoneReferentUrgence: e.target.value })}
                        placeholder="+243 ..."
                        className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
                        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                        Lien (Urgence)
                      </label>
                      <CustomSelect
                        options={[
                          { value: 'Parent', label: 'Parent' },
                          { value: 'Tuteur', label: 'Tuteur' },
                          { value: 'Médecin', label: 'Médecin' },
                          { value: 'Voisin', label: 'Voisin' },
                          { value: 'Autre', label: 'Autre' },
                        ]}
                        value={formData.relationReferentUrgence}
                        onChange={(val) => setFormData({ ...formData, relationReferentUrgence: val })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-500/10"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Retour à l’Étape 2</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStepNext}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
                  >
                    <span>Passer à l’Étape 4 (Facturation & Paie)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE 4 : FRAIS D'INSCRIPTION, FACTURATION & REÇU DE CAISSE */}
            {step === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span>4. Frais d'Inscription</span>
                    </h3>

                    {/* Montant à payer à l'inscription */}
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Montant à payer à l'inscription</p>
                      <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(totalFacture, formData.devise, formData.devise, exchangeRate)}
                      </p>
                    </div>
                  </div>

                  {/* Choix : Payer maintenant ou Payer plus tard chez le comptable */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payerMaintenant: true, montantInscription: prev.montantInscription || totalFacture }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        formData.payerMaintenant
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-500/5 text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span className="text-left">Payer maintenant à l'inscription</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, payerMaintenant: false, montantInscription: 0 }))}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        !formData.payerMaintenant
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-500/5 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span className="text-left">Payer plus tard chez le comptable</span>
                    </button>
                  </div>

                  {formData.payerMaintenant && (
                    <div className="space-y-4 pt-2">
                      {/* Grille des frais applicables */}
                      {applicableFees.length > 0 && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                            Sélectionnez les frais applicables à l'inscription :
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {applicableFees.map(ft => {
                              const isChecked = selectedFeeIds.includes(ft.id);
                              return (
                                <div
                                  key={ft.id}
                                  onClick={() => toggleFeeSelection(ft.id)}
                                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-slate-500/5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span className="text-xs font-bold truncate">{ft.nom}</span>
                                  </div>
                                  <span className="text-xs font-black shrink-0 ml-2">
                                    {ft.montant} {ft.devise || systemCurrency}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Indicateur du statut de paiement */}
                      {formData.payerMaintenant && (
                        <div className="p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Total facture</p>
                              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(totalFacture, formData.devise, formData.devise, exchangeRate)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Reste à payer</p>
                              <p className="text-sm font-black text-rose-600 dark:text-rose-400">
                                {formatCurrency(Math.max(0, totalFacture - (Number(formData.montantInscription) || 0)), formData.devise, formData.devise, exchangeRate)}
                              </p>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${
                              (Number(formData.montantInscription) || 0) >= totalFacture - 0.001
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                                : (Number(formData.montantInscription) || 0) > 0
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25'
                            }`}>
                              {(Number(formData.montantInscription) || 0) >= totalFacture - 0.001
                                ? 'SOLDÉ'
                                : (Number(formData.montantInscription) || 0) > 0
                                  ? 'PARTIEL'
                                  : 'NON PAYÉ'}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                            Montant Total Payé
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.montantInscription}
                            onChange={(e) => setFormData({ ...formData, montantInscription: Number(e.target.value) })}
                            className="w-full px-3.5 py-2 rounded-lg text-xs font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                            Mode de Paiement
                          </label>
                          <CustomSelect
                            options={MOYEN_PAIEMENT_OPTIONS}
                            value={formData.moyenPaiement}
                            onChange={(val) => setFormData({ ...formData, moyenPaiement: val as any })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                            N° Référence / Trans.
                          </label>
                          <input
                            type="text"
                            value={formData.referencePaiement}
                            onChange={(e) => setFormData({ ...formData, referencePaiement: e.target.value })}
                            placeholder="N° Bordereau / Ref Mobile"
                            className="w-full px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Boutons d'Action Final */}
                <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-slate-500/10"
                    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Retour à l’Étape 3</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Enregistrement en cours...' : (isEdit ? 'Mettre à jour le Dossier' : 'Valider l’Inscription et Générer la Carte')}</span>
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

            {/* SYNTHÈSE RAPIDE DU DOSSIER */}
            <div className="p-3 rounded-xl border space-y-2 mb-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between text-[11px] font-black uppercase text-slate-500">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-indigo-500" /> Synthèse du dossier</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">Live</span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[11px]">
                <div className="min-w-0">
                  <span className="text-slate-400 block">Nom complet</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {formData.prenom || formData.nom ? `${formData.prenom} ${formData.nom}`.trim() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Sexe / Né(e) le</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formData.sexe === 'F' ? 'F' : 'M'} — {formData.dateNaissance || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Classe</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formData.nomClasse || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Matricule</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{formData.registrationNumber || generatedRegistrationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Groupe Sanguin</span>
                  <span className="font-black text-rose-600 dark:text-rose-400">{formData.groupeSanguin || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Transport</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formData.transportScolaire}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Tuteur / Contact</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                    {formData.nomTuteur || formData.nomPere || formData.nomMere || '—'}
                    {formData.telephoneTuteur || formData.telephonePere || formData.telephoneMere
                      ? ` (${formData.telephoneTuteur || formData.telephonePere || formData.telephoneMere})`
                      : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Urgence</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 truncate block">
                    {formData.nomReferentUrgence || formData.contactUrgence || '—'}
                    {formData.telephoneReferentUrgence ? ` (${formData.telephoneReferentUrgence})` : ''}
                  </span>
                </div>
              </div>
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
                Carte d'Élève
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

            {/* VUE 1 : CARTE D'ÉLÈVE OFFICIELLE */}
            {previewTab === 'BADGE' && (
              <div className="p-4 rounded-xl border bg-gradient-to-b from-indigo-900/10 via-slate-900/5 to-transparent space-y-4" style={{ borderColor: 'var(--border)' }}>
                {/* Filigrane Écolisa / EPST */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[11px] font-black tracking-wider text-slate-800 dark:text-slate-200 uppercase">
                      Écolisa RDC • Carte Élève
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                    {CYCLE_LABELS[formData.cycleId] || 'CYCLE'}
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
                        {formData.prenom ? formData.prenom[0].toUpperCase() : 'E'}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {formData.prenom || formData.nom
                        ? `${formData.prenom} ${formData.nom} ${formData.postnom || ''}`
                        : 'Prénom NOM de l’Élève'}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {formData.nomClasse || 'Classe non assignée'} {hasOptions ? `— ${formData.optionEPST}` : ''}
                    </p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {formData.registrationNumber || generatedRegistrationNumber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* QR Code & Régime */}
                <div className="p-3 rounded-lg border flex items-center justify-between" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{formData.provinceOrigine || 'Kinshasa'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
                      <School className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Régime : {formData.regime}</span>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-md bg-white border border-slate-200 shrink-0">
                    <QrCode className="w-9 h-9 text-slate-950" />
                  </div>
                </div>
              </div>
            )}

            {/* VUE 2 : SYNTHÈSE DU DOSSIER ÉLÈVE EN DIRECT */}
            {previewTab === 'SYNTHESE' && (
              <div className="space-y-3 text-xs">
                {/* Bloc 1 : Civilité & Origine */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400">
                    <span>Identité & Origine RDC</span>
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Sexe / Genre:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.sexe === 'F' ? 'Féminin (F)' : 'Masculin (M)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Nationalité:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.nationalite || 'Congolaise'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Province Origine:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.provinceOrigine || 'Kinshasa'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Groupe Sanguin:</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">
                        {formData.groupeSanguin || 'O+'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloc 2 : Parents & Tuteurs */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-purple-600 dark:text-purple-400">
                    <span>Parents & Tuteurs</span>
                    <UsersIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1 text-[11px]">
                    <div>
                      <span className="text-slate-400">Nom du Père:</span>{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.nomPere || 'Non précisé'}</span>
                      {formData.telephonePere && <span className="text-indigo-500 font-bold ml-1">({formData.telephonePere})</span>}
                    </div>
                    <div>
                      <span className="text-slate-400">Nom de la Mère:</span>{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.nomMere || 'Non précisé'}</span>
                      {formData.telephoneMere && <span className="text-indigo-500 font-bold ml-1">({formData.telephoneMere})</span>}
                    </div>
                  </div>
                </div>

                {/* Bloc 3 : Inscription & Paie */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                    <span>Facturation & Frais</span>
                    <DollarSign className="w-3.5 h-3.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Classe:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formData.nomClasse || 'Non choisie'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Acompte / Payé:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {formData.payerMaintenant ? `${formData.montantInscription} ${formData.devise}` : '0 USD'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Total dû:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(totalFacture, formData.devise, formData.devise, exchangeRate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Statut:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border ${
                        (formData.payerMaintenant ? (Number(formData.montantInscription) || 0) : 0) >= totalFacture - 0.001
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                          : (formData.payerMaintenant ? (Number(formData.montantInscription) || 0) : 0) > 0
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25'
                      }`}>
                        {(formData.payerMaintenant ? (Number(formData.montantInscription) || 0) : 0) >= totalFacture - 0.001
                          ? 'SOLDÉ'
                          : (formData.payerMaintenant ? (Number(formData.montantInscription) || 0) : 0) > 0
                            ? 'PARTIEL'
                            : 'NON PAYÉ'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloc 4 : Dossier Médical & Social */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-rose-600 dark:text-rose-400">
                    <span>Médical & Social</span>
                    <Heart className="w-3.5 h-3.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">N° Acte:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.numeroActeNaissance || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Langue Mat.:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.langueMaternelle}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Allergies:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.allergies || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Handicap:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.handicap || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Assurance:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.assuranceSante || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Médecin:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{formData.medecinTraitant || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Bloc 5 : Tuteur, Urgence & Transport */}
                <div className="p-3 rounded-xl border space-y-1.5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase text-amber-600 dark:text-amber-400">
                    <span>Tuteur, Urgence & Transport</span>
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {formData.nomTuteur && (
                      <div>
                        <span className="text-slate-400">Tuteur:</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formData.nomTuteur}</span>
                        {formData.telephoneTuteur && <span className="text-indigo-500 font-bold ml-1">({formData.telephoneTuteur})</span>}
                      </div>
                    )}
                    {formData.nomReferentUrgence && (
                      <div>
                        <span className="text-slate-400">Urgence:</span>{' '}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formData.nomReferentUrgence}</span>
                        {formData.telephoneReferentUrgence && <span className="text-rose-500 font-bold ml-1">({formData.telephoneReferentUrgence})</span>}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-slate-400 block">Transport:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{formData.transportScolaire}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cantine / Internat:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formData.cantine ? 'Cantine ' : ''}{formData.internat ? 'Internat ' : ''}{!formData.cantine && !formData.internat ? '—' : ''}
                        </span>
                      </div>
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
          setFormData(prev => ({ ...prev, photoUrl: dataUrl }));
          setIsWebcamOpen(false);
        }}
      />
    </div>
  );
};
