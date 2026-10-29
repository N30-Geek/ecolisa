import React, { useState, useEffect } from 'react';
import {
  Building2,
  GraduationCap,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Cpu,
  RefreshCw,
  Save,
  Award,
  Phone,
  Mail,
  MapPin,
  School,
  DollarSign,
  FileCheck,
  CreditCard,
  Printer,
  SlidersHorizontal,
  Trash2,
  Palette,
  User,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  DatabaseBackup,
  HardDrive
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { showToast } from '../common/ToastNotification';
import { PROVINCES_RDC } from '../../data/referentielEPST';
import { SchoolConfig } from '../onboarding/OnboardingWizard';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CardSettingsPanel } from './CardSettingsPanel';
import { DocumentSettingsPanel } from './DocumentSettingsPanel';
import { CurrencySettingsPanel } from './CurrencySettingsPanel';
import { Currency, DEFAULT_CURRENCIES, NumberFormatConfig, DEFAULT_NUMBER_FORMAT } from '../../utils/currency';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { useThemeConfig, contrastOnColor } from '../../hooks/useThemeConfig';
import { ROLE_DETAILS, getDefaultTabForRole } from '../../utils/permissions';
import type { AppSettings, ThemeConfig, BackupConfig, UserPreferences, BackupEntry, RôleSystème } from '../../types';

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

interface SettingsManagerProps {
  onOpenOnboarding: () => void;
}

type SettingsTab =
  | 'school' | 'cycles' | 'promoter' | 'finance' | 'printer'
  | 'cards' | 'documents' | 'appearance' | 'backup' | 'account' | 'system';

/** Libellés lisibles des onglets principaux de l'application (pour le sélecteur « onglet par défaut »). */
const MAIN_TAB_LABELS: Record<string, string> = {
  dashboard: 'Tableau de Bord',
  students: 'Élèves', apprenants: 'Apprenants', classes: 'Classes',
  subjects: 'Matières', years: 'Années Scolaires', teachers: 'Enseignants',
  schedule: 'Horaires', grades: 'Cotes & Notes', examens: 'Examens',
  deliberation: 'Délibérations', invoices: 'Facturation', payroll: 'Paie',
  expenses: 'Dépenses', fees: 'Frais Scolaires', cash: 'Caisse',
  accounting: 'Comptabilité', reports: 'Rapports', analytics: 'Statistiques',
  discipline: 'Discipline', hr: 'Ressources Humaines', leaves: 'Congés',
  pointage: 'Pointage', infirmerie: 'Infirmerie', cantine: 'Cantine',
  ressources: 'Ressources', transport: 'Transport', library: 'Bibliothèque',
  documents: 'Documents', messages: 'Messages', license: 'Licence',
  settings: 'Paramètres', users: 'Utilisateurs', audit: 'Audit',
};

const ACCENT_PRESETS: { name: string; value: string }[] = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Émeraude', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Ambre', value: '#f59e0b' },
  { name: 'Bleu Ciel', value: '#0ea5e9' },
  { name: 'Violet', value: '#8b5cf6' },
];

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onOpenOnboarding }) => {
  // ── Paramètres applicatifs (thème, sauvegardes, préférences utilisateur) ──
  const { config: hookSchoolConfig, setAppSettings, appSettings } = useSchoolConfig();
  const { themeConfig, resolvedTheme, isDark, applyThemeConfig, setAppearance } = useThemeConfig();
  const currentUser = LocalDatabaseService.getCurrentUser();
  const userRole = (currentUser?.role || 'PROMOTEUR_ADMIN') as RôleSystème;

  // Copie locale synchronisée de app_settings (persistée via setAppSettings / bouton Sauvegarder)
  const [appSettingsLocal, setAppSettingsLocal] = useState<AppSettings>({});
  useEffect(() => {
    if (appSettings) setAppSettingsLocal(appSettings);
  }, [appSettings]);

  const [activeTab, setActiveTab] = useState<SettingsTab>('school');
  const [isSaved, setIsSaved] = useState(false);
  const [isSavingCards, setIsSavingCards] = useState(false);
  const [cardsDirty, setCardsDirty] = useState(false);
  const [systemPrinters, setSystemPrinters] = useState<SelectOption[]>([]);

  // Onglets visibles selon le rôle de l'utilisateur connecté
  const isAdminRole = !currentUser || userRole === 'PROMOTEUR_ADMIN' || ROLE_DETAILS[userRole]?.canEditConfig === true;
  const isFinanceRole = userRole === 'COMPTABLE' || userRole === 'INTENDANT';
  const visibleTabs: SettingsTab[] = isAdminRole
    ? ['school', 'cycles', 'promoter', 'finance', 'printer', 'cards', 'documents', 'appearance', 'backup', 'account', 'system']
    : isFinanceRole
      ? ['finance', 'printer', 'appearance', 'account']
      : ['appearance', 'account'];

  // Bascule sur le premier onglet visible si l'onglet actif n'est pas accessible au rôle
  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0]);
  });

  // ── Menu latéral de navigation des paramètres ──
  const navGroups = [
    {
      title: 'Configuration de l\'Établissement',
      items: [
        { id: 'school', label: 'Profil & Statut', icon: Building2 },
        { id: 'cycles', label: 'Cycles & Options', icon: GraduationCap },
        { id: 'promoter', label: 'Promoteur & 2FA', icon: ShieldCheck },
        { id: 'finance', label: 'Devise & Caisse', icon: Wallet },
        { id: 'printer', label: 'Imprimantes', icon: Printer },
        { id: 'cards', label: 'Atelier des cartes', icon: CreditCard },
        { id: 'documents', label: 'Modèles de documents', icon: FileCheck },
      ],
    },
    {
      title: 'Personnalisation',
      items: [
        { id: 'appearance', label: 'Apparence', icon: Palette },
        { id: 'account', label: 'Mon Compte', icon: User },
      ],
    },
    {
      title: 'Système',
      items: [
        { id: 'backup', label: 'Sauvegardes', icon: DatabaseBackup },
        { id: 'system', label: 'HWID & Système', icon: Cpu },
      ],
    },
  ].map((g) => ({ ...g, items: g.items.filter((t) => visibleTabs.includes(t.id as SettingsTab)) }))
    .filter((g) => g.items.length > 0);

  const [isRefreshingPrinters, setIsRefreshingPrinters] = useState(false);

  const fetchPrinters = async () => {
    setIsRefreshingPrinters(true);
    const electron = (window as any).electronAPI;
    try {
      if (electron?.getPrinters) {
        const list = await electron.getPrinters();
        if (Array.isArray(list) && list.length > 0) {
          const options = list.map((p: any) => ({
            value: p.name,
            label: `${p.isThermal ? '🧾' : '🖨️'} ${p.displayName || p.name}${p.isDefault ? ' (Par défaut OS)' : ''}`,
          }));
          setSystemPrinters(options);

          const defaultPrinter = list.find((p: any) => p.isDefault);
          const firstThermal = list.find((p: any) => p.isThermal);
          const firstA4 = list.find((p: any) => p.isA4) || defaultPrinter || list[0];

          setConfig(prev => {
            const next = { ...prev };
            if (!prev.thermalPrinterName) {
              next.thermalPrinterName = firstThermal ? firstThermal.name : (defaultPrinter ? defaultPrinter.name : list[0].name);
            }
            if (!prev.a4PrinterName) {
              next.a4PrinterName = firstA4 ? firstA4.name : (defaultPrinter ? defaultPrinter.name : list[0].name);
            }
            return next;
          });
          setIsRefreshingPrinters(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Erreur getPrinters :', e);
    }
    setSystemPrinters([
      { value: '', label: '🖨️ Aucune imprimante détectée — dialogue Windows par défaut' },
    ]);
    setIsRefreshingPrinters(false);
  };

  const testPrint = async (format: 'thermal' | 'a4') => {
    const electron = (window as any).electronAPI;
    const printer = format === 'thermal' ? config.thermalPrinterName : config.a4PrinterName;
    const fn = format === 'thermal' ? electron?.printThermal : electron?.printA4;
    if (!fn) {
      showToast('Impression indisponible', "L'API d'impression n'est pas accessible.", 'error');
      return;
    }
    const html = format === 'thermal'
      ? `<div style="font-family:Arial,sans-serif;text-align:center;padding:8px"><h3>Test imprimante thermique</h3><p>${new Date().toLocaleString('fr-FR')}</p></div>`
      : `<div style="font-family:Arial,sans-serif;padding:20mm"><h2>Test imprimante A4</h2><p>Imprimante : ${printer || 'Par défaut'}</p><p>${new Date().toLocaleString('fr-FR')}</p></div>`;
    try {
      const result = await fn({ html, deviceName: printer, silent: config.directSilentPrint ?? true });
      if (result?.success) {
        showToast('Test envoyé', `Page test envoyée à ${printer || "l'imprimante par défaut"}`, 'success');
      } else {
        showToast('Échec du test', result?.error || "L'impression de test a échoué.", 'error');
      }
    } catch (err: any) {
      showToast('Erreur de test', err?.message || "Impossible d'envoyer l'impression de test.", 'error');
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  // ── Sauvegardes locales (Electron uniquement) ────────────────────────────
  const [dbPath, setDbPath] = useState<string>('');
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  const refreshBackups = async () => {
    try {
      setBackups(await LocalDatabaseService.listBackups());
    } catch {}
  };

  useEffect(() => {
    LocalDatabaseService.getDbPath().then((p) => setDbPath(p || '')).catch(() => {});
    refreshBackups();
  }, []);

  const [currencies, setCurrencies] = useState<Currency[]>(() => DEFAULT_CURRENCIES);
  const [referenceCurrency, setReferenceCurrency] = useState(() => {
    const ref = currencies.find((c) => c.isReference)?.code || currencies[0]?.code || 'USD';
    return ref;
  });
  const [displayCurrency, setDisplayCurrency] = useState(() => referenceCurrency);
  const [numberFormat, setNumberFormat] = useState<NumberFormatConfig>(() => DEFAULT_NUMBER_FORMAT);

  const defaultCardCustomization = {
    selectedFields: ['nom', 'postnom', 'prenom', 'dateNaissance', 'sexe', 'adressePhysique', 'provinceOrigine', 'nomClasse', 'registrationNumber'],
    legalMention: 'Cette carte est strictement personnelle. Toute falsification est punissable par la loi.',
    validityPeriod: '2025–2026',
    contactPhone: '+243 81 555 0192',
    contactEmail: 'contact@ecolisa.cd',
    showCoatOfArms: true,
    showCountryFlag: true,
    showFiligree: true,
    showMiniLogos: true,
    cardTheme: 'blue' as const,
    cardLayout: 'portrait' as const,
    byCycle: {},
    filigreeType: 'pattern' as const,
    filigreeText: 'EPST',
    filigreeShape: 'circles' as const,
    filigreeImage: '',
    filigreeOpacity: 0.18,
    filigreeDensity: 'medium' as const,
    headerAlign: 'center' as const,
    photoPosition: 'right' as const,
    fieldsLayout: 'grid' as const,
    textAlign: 'left' as const,
    showQR: true,
    showTricolor: true,
    showSchoolSeal: true,
  };

  const [config, setConfig] = useState<SchoolConfig>(() => ({
    schoolName: 'Complexe Scolaire ACADEMIA / ECOLISA',
    secopeCode: 'SECOPE-99201-KIN',
    schoolType: 'POLYVALENT',
    schoolStatus: 'PRIVE_AGREE',
    regime: 'EXTERNE',
    arreteAgrement: 'Arrêté MINEPST/N°0451/2022',
    province: 'Kinshasa',
    subDivision: 'Gombe / Lukunga',
    address: '12, Avenue de la Justice, Q. Golf, C. Gombe',
    phone: '+243 81 555 0192',
    email: 'contact@ecolisa.cd',
    motto: 'Discipline - Travail - Excellence',
    logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
    selectedCycles: ['PRIMAIRE', 'CTEB', 'HUMANITES'],
    selectedOptions: ['MATH_PHYS', 'COMMERCE', 'BIO_CHIMIE'],
    currency: 'USD',
    exchangeRate: 2850,
    currencies: DEFAULT_CURRENCIES,
    referenceCurrency: 'USD',
    displayCurrency: 'USD',
    subscriptionPlan: 'ANNUEL',
    paymentMethod: 'MOBILE_MONEY',
    promoterName: 'Dr. Jean-Baptiste KABANGE',
    promoterRole: 'PROMOTEUR_ADMIN',
    promoterEmail: 'admin@ecolisa.cd',
    promoterPhone2FA: '+243 81 234 5678',
    promoterPinCode: '992001',
    activeSchoolYear: '2025–2026',
    hwid: 'HWID-ED25519-RDC-99201-NODE-MAC',
    cardCustomization: defaultCardCustomization,
    thermalPrinterName: '',
    a4PrinterName: '',
    directSilentPrint: true,
  }));

  // Charger la config depuis SQLite (unique source de vérité) au montage.
  useEffect(() => {
    LocalDatabaseService.getConfig('school_config').then((raw) => {
      if (!raw) return;
      const parsed = raw as SchoolConfig;
      setConfig({
        ...parsed,
        cardCustomization: { ...defaultCardCustomization, ...parsed.cardCustomization },
      });
      if (parsed.currencies?.length) setCurrencies(parsed.currencies);
      if (parsed.referenceCurrency) setReferenceCurrency(parsed.referenceCurrency);
      if (parsed.displayCurrency) setDisplayCurrency(parsed.displayCurrency);
      if (parsed.numberFormat) setNumberFormat({ ...DEFAULT_NUMBER_FORMAT, ...parsed.numberFormat });
    });
  }, []);

  const handleSave = async () => {
    if (activeTab === 'documents') return;
    if (activeTab === 'cards') {
      if (!isAdminRole || isSavingCards) return;
      setIsSavingCards(true);
      try {
        const latest = await LocalDatabaseService.getConfig('school_config');
        if (!latest) throw new Error('Configuration de l’établissement indisponible.');
        await LocalDatabaseService.setConfig('school_config', { ...latest, cardCustomization: config.cardCustomization }, true);
        setCardsDirty(false);
        setIsSaved(true);
        window.dispatchEvent(new Event('ecolisa:config:change'));
        showToast('Modèle enregistré', 'Les cartes générées utiliseront ces réglages et les exceptions par cycle.', 'success');
      } catch {
        showToast('Enregistrement impossible', 'Vos modifications restent disponibles. Réessayez.', 'error');
      } finally {
        setIsSavingCards(false);
      }
      return;
    }
    const updated = {
      ...config,
      currencies,
      referenceCurrency,
      displayCurrency,
      numberFormat,
      exchangeRate: (currencies.find((c) => c.code === 'CDF')?.rateToReference) || config.exchangeRate || 2850,
    };
    // Source de vérité unique : SQLite. Pas de localStorage.
    await LocalDatabaseService.setConfig('school_config', updated);
    // Persiste aussi les réglages applicatifs (thème, sauvegardes, préférences utilisateur)
    await setAppSettings({ ...(appSettings || {}), ...(appSettingsLocal || {}) });
    try {
      window.dispatchEvent(new Event('ecolisa:config:change'));
    } catch {}
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleCycle = (code: string) => {
    setConfig((prev) => ({
      ...prev,
      selectedCycles: prev.selectedCycles.includes(code)
        ? prev.selectedCycles.filter((c) => c !== code)
        : [...prev.selectedCycles, code],
    }));
  };

  // ── Helpers pour les nouveaux onglets Apparence / Backup / Compte ──
  const setThemeConfigLocal = (next: Partial<ThemeConfig>) => {
    const merged: ThemeConfig = { ...themeConfig, ...appSettingsLocal?.themeConfig, ...next };
    setAppSettingsLocal((prev) => ({ ...prev, themeConfig: merged }));
    applyThemeConfig(merged);
  };

  const setBackupConfigLocal = (next: Partial<BackupConfig>) => {
    setAppSettingsLocal((prev) => ({
      ...prev,
      backupConfig: { ...defaultBackupConfig, ...prev?.backupConfig, ...next },
    }));
  };

  const setUserPrefsLocal = (next: Partial<UserPreferences>) => {
    if (!currentUser) return;
    setAppSettingsLocal((prev) => {
      const byUser = { ...(prev?.userPreferences || {}) };
      byUser[currentUser.id] = { ...defaultUserPreferences, ...byUser[currentUser.id], ...next };
      return { ...prev, userPreferences: byUser };
    });
  };

  const defaultBackupConfig: BackupConfig = {
    enabled: true,
    autoBackup: false,
    autoBackupIntervalMinutes: 60,
    maxBackups: 10,
    compressBackups: true,
    includeDocuments: false,
  };

  const defaultUserPreferences: UserPreferences = {
    defaultTab: getDefaultTabForRole(userRole),
    compactLists: false,
    emailNotifications: true,
    sessionTimeoutMinutes: 30,
    landingPage: 'dashboard',
    language: 'fr',
    sidebarCollapsed: false,
  };

  const userPrefs: UserPreferences = currentUser
    ? { ...defaultUserPreferences, ...(appSettingsLocal?.userPreferences?.[currentUser.id] || {}) }
    : defaultUserPreferences;

  const backupCfg: BackupConfig = { ...defaultBackupConfig, ...(appSettingsLocal?.backupConfig || {}) };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const b = await LocalDatabaseService.createBackup('MANUAL', backupCfg.compressBackups);
      if (b) {
        showToast('Sauvegarde créée', `Fichier : ${b.name} (${formatSize(b.size)})`, 'success');
        await refreshBackups();
      } else {
        showToast('Échec', 'La sauvegarde n\'a pas pu être créée.', 'error');
      }
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (entry: BackupEntry) => {
    if (!confirm(`Restaurer la sauvegarde du ${new Date(entry.createdAt).toLocaleString('fr-FR')} ?\nL'application va redémarrer avec cette base.`)) return;
    const ok = await LocalDatabaseService.restoreBackup(entry.id);
    if (ok) {
      showToast('Base restaurée', 'L\'application va être rechargée.', 'success');
      window.location.reload();
    } else {
      showToast('Échec', 'Impossible de restaurer la sauvegarde.', 'error');
    }
  };

  const handleDeleteBackup = async (entry: BackupEntry) => {
    if (!confirm(`Supprimer la sauvegarde ${entry.name} ?`)) return;
    const ok = await LocalDatabaseService.deleteBackup(entry.id);
    if (ok) {
      showToast('Sauvegarde supprimée', '', 'success');
      await refreshBackups();
    } else {
      showToast('Échec', 'Impossible de supprimer la sauvegarde.', 'error');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    if (bytes > 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${bytes} octets`;
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 select-none">
      {/* HEADER PARAMÈTRES */}
      <div className="md3-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
            style={{ background: 'var(--md-sys-color-primary)' }}
          >
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Paramètres du Système & Configuration Établissement
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gestion de l'identité scolaire, du statut juridique, des cycles EPST et du compte Promoteur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenOnboarding}
            className="px-3.5 py-2 rounded-xl border border-slate-500/30 bg-slate-500/10 text-slate-300 font-bold text-xs hover:bg-slate-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Relancer l'Onboarding</span>
          </button>
        </div>
      </div>

      {/* CORPS DE L'ONGLET SÉLECTIONNÉ */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[224px_minmax(0,1fr)] gap-5"
      >
        {/* MENU LATÉRAL DES PARAMÈTRES */}
        <div className="md3-card p-3 h-fit space-y-4">
          <div className="px-3 pt-1">
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Paramètres ECOLISA
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Configurez l'établissement, l'apparence et les sauvegardes.
            </p>
          </div>

          <div className="space-y-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="px-3 py-1 text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((t) => {
                    const TabIcon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as SettingsTab)}
                        className={`md3-nav-item ${isActive ? 'active' : ''}`}
                      >
                        <div className="icon-wrap">
                          <TabIcon className="w-4 h-4" />
                        </div>
                        <span>{t.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--md-sys-color-primary)' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3" style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
            <button
              onClick={handleSave}
              disabled={isSavingCards || activeTab === 'documents'}
              className="md3-filled-btn w-full text-xs disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingCards ? 'Enregistrement…' : activeTab === 'documents' ? 'Enregistrer dans l’atelier' : cardsDirty && activeTab === 'cards' ? 'Enregistrer la carte' : isSaved ? 'Enregistré !' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>

        {/* PANNEAU DE CONTENU */}
        <div className="md3-card p-4 xl:p-6 space-y-6 min-h-[60vh] min-w-0">
        {/* ONGLET 1 : PROFIL & STATUT JURIDIQUE */}
        {activeTab === 'school' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              Identité Administrative & Statut Juridique EPST
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8 space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Nom Officiel de l'École
                </label>
                <input
                  type="text"
                  value={config.schoolName}
                  onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Code SECOPE / EPST
                </label>
                <input
                  type="text"
                  value={config.secopeCode}
                  onChange={(e) => setConfig({ ...config, secopeCode: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Type d'Établissement
                </label>
                <CustomSelect
                  options={SCHOOL_TYPE_OPTIONS}
                  value={config.schoolType || 'POLYVALENT'}
                  onChange={(val) => setConfig({ ...config, schoolType: val })}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Statut Juridique / Régime
                </label>
                <CustomSelect
                  options={SCHOOL_STATUS_OPTIONS}
                  value={config.schoolStatus || 'PRIVE_AGREE'}
                  onChange={(val) => setConfig({ ...config, schoolStatus: val })}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Régime d'Enseignement
                </label>
                <CustomSelect
                  options={REGIME_TEACHING_OPTIONS}
                  value={config.regime || 'EXTERNE'}
                  onChange={(val) => setConfig({ ...config, regime: val })}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  N° Arrêté d'Agrément MINEPST
                </label>
                <input
                  type="text"
                  value={config.arreteAgrement || ''}
                  onChange={(e) => setConfig({ ...config, arreteAgrement: e.target.value })}
                  placeholder="Arrêté MINEPST/N°0451/2022"
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Province Éducative RDC
                </label>
                <CustomSelect
                  options={PROVINCE_OPTIONS}
                  value={config.province}
                  onChange={(val) => setConfig({ ...config, province: val })}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Sous-Division / Commune
                </label>
                <input
                  type="text"
                  value={config.subDivision}
                  onChange={(e) => setConfig({ ...config, subDivision: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Adresse Physique Complète
              </label>
              <input
                type="text"
                value={config.address}
                onChange={(e) => setConfig({ ...config, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        )}

        {/* ONGLET 2 : CYCLES & OPTIONS */}
        {activeTab === 'cycles' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              Cycles d'Enseignement & Options EPST
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { code: 'PRESCHOOL', label: 'École Maternelle & Éveil', cite: 'CITE 020' },
                { code: 'PRIMAIRE', label: 'Éducation de Base / Primaire', cite: 'CITE 100' },
                { code: 'CTEB', label: 'Cycle Terminal CTEB (7e/8e)', cite: 'CITE 244' },
                { code: 'HUMANITES', label: 'Humanités Générales & Tech.', cite: 'CITE 344' },
                { code: 'CUSTOM', label: 'Mode International Custom', cite: 'CUSTOM' },
              ].map((c) => {
                const isSelected = config.selectedCycles.includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleCycle(c.code)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-500/10 text-indigo-400 font-bold ring-1 ring-indigo-500/20'
                        : 'border-slate-500/20 text-slate-400 hover:bg-slate-500/5'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black">{c.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.cite}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-500/30'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ONGLET 3 : COMPTE PROMOTEUR */}
        {activeTab === 'promoter' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              Identité du Promoteur, Téléphone 2FA & Sécurité
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Nom du Promoteur / Fondateur
                </label>
                <input
                  type="text"
                  value={config.promoterName}
                  onChange={(e) => setConfig({ ...config, promoterName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Email Racine (Login)
                </label>
                <input
                  type="email"
                  value={config.promoterEmail}
                  onChange={(e) => setConfig({ ...config, promoterEmail: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Téléphone Validation 2FA (SMS / OTP)
                </label>
                <input
                  type="text"
                  value={config.promoterPhone2FA || '+243 81 234 5678'}
                  onChange={(e) => setConfig({ ...config, promoterPhone2FA: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                  Code PIN de Sécurité (Caisse & Exercices)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={config.promoterPinCode}
                  onChange={(e) => setConfig({ ...config, promoterPinCode: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border font-mono font-black text-center text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 4 : DEVISE, CAISSE & IMPRIMANTE THERMIQUE */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <CurrencySettingsPanel
              currencies={currencies}
              onChange={setCurrencies}
              referenceCurrency={referenceCurrency}
              onReferenceChange={setReferenceCurrency}
              displayCurrency={displayCurrency}
              onDisplayChange={setDisplayCurrency}
              numberFormat={numberFormat}
              onNumberFormatChange={setNumberFormat}
            />

            {/* SECTEUR IMPRESSION THERMIQUE & REÇUS DE CAISSE */}
            <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
                <Printer className="w-4 h-4" /> Paramètres Imprimante Thermique & Impression Directe
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Imprimante Thermique (détection automatique OS)
                  </label>
                  <input
                    type="text"
                    value={config.thermalPrinterName || ''}
                    placeholder="Sélectionnée automatiquement depuis l'onglet Imprimante"
                    onChange={(e) => setConfig({ ...config, thermalPrinterName: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border font-mono font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                    <input
                      type="checkbox"
                      checked={config.directSilentPrint ?? true}
                      onChange={(e) => setConfig({ ...config, directSilentPrint: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-200">Impression Directe Silencieuse (Sans Modale OS)</div>
                      <div className="text-[10px] text-slate-400">Envoie le reçu directement à l'imprimante configurée</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 5 : IMPRIMANTES THERMIQUE & A4 */}
        {activeTab === 'printer' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <Printer className="w-4 h-4" /> Configuration des Imprimantes (Thermique & A4)
            </h3>

            <div className="p-5 rounded-2xl border space-y-5" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <p className="text-[11px] text-slate-400">
                ECOLISA détecte automatiquement vos imprimantes. Les imprimantes comportant les mots-clés <b>POS, 80mm, Thermal, XP-80, TM-T, Receipt, Ticket</b> sont classées comme thermiques ; les autres comme A4.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* IMPRIMANTE THERMIQUE / TICKET */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                      <Printer className="w-3 h-3" /> Imprimante Ticket / Thermique (80 mm)
                    </label>
                    <button
                      type="button"
                      onClick={fetchPrinters}
                      disabled={isRefreshingPrinters}
                      className="text-xs font-bold text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isRefreshingPrinters ? '⏳ Recherche...' : '🔄 Actualiser'}</span>
                    </button>
                  </div>
                  <CustomSelect
                    options={systemPrinters}
                    value={config.thermalPrinterName || systemPrinters[0]?.value || ''}
                    onChange={(val) => setConfig({ ...config, thermalPrinterName: val })}
                    placeholder="Choisir l'imprimante thermique détectée..."
                    searchable
                    creatable
                  />
                  <p className="text-[11px] text-slate-500">
                    Utilisée pour les reçus de caisse, tickets de paiement et petits formats.
                  </p>
                </div>

                {/* IMPRIMANTE A4 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                    <Printer className="w-3 h-3" /> Imprimante A4 (Documents & Fiches)
                  </label>
                  <CustomSelect
                    options={systemPrinters}
                    value={config.a4PrinterName || systemPrinters[0]?.value || ''}
                    onChange={(val) => setConfig({ ...config, a4PrinterName: val })}
                    placeholder="Choisir l'imprimante A4 détectée..."
                    searchable
                    creatable
                  />
                  <p className="text-[11px] text-slate-500">
                    Utilisée pour les fiches de paie, bulletins, documents officiels et rapports.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <label className="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all hover:bg-slate-500/5" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={config.directSilentPrint ?? true}
                    onChange={(e) => setConfig({ ...config, directSilentPrint: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Impression Directe Silencieuse (Sans Fenêtre OS)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Lorsque vous cliquez sur "Imprimer", le document est envoyé directement à l'imprimante configurée sans ouvrir la modale système. Décochez pour afficher le dialogue d'impression Windows.
                    </div>
                  </div>
                </label>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs font-bold text-slate-300 mb-2">Vérifier l'impression</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => testPrint('thermal')}
                    disabled={!config.thermalPrinterName && (config.directSilentPrint ?? true)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-500/30 hover:bg-slate-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    🧾 Test impression ticket
                  </button>
                  <button
                    type="button"
                    onClick={() => testPrint('a4')}
                    disabled={!config.a4PrinterName && (config.directSilentPrint ?? true)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-slate-500/30 hover:bg-slate-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    🖨️ Test impression A4
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Désactivez "Impression directe silencieuse" si vous voulez choisir l'imprimante via le dialogue Windows.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 6 : CARTES & MODÈLES */}
        {activeTab === 'documents' && isAdminRole && <DocumentSettingsPanel />}
        {activeTab === 'cards' && isAdminRole && (
          <CardSettingsPanel
            value={config.cardCustomization || defaultCardCustomization}
            onChange={(cardCustomization) => { setConfig((prev) => ({ ...prev, cardCustomization })); setCardsDirty(true); setIsSaved(false); }}
            schoolName={config.schoolName}
            schoolPhone={config.phone}
            schoolEmail={config.email}
            schoolAddress={config.address}
            activeSchoolYear={config.activeSchoolYear}
            logoUrl={config.logoUrl}
            secopeCode={config.secopeCode}
          />
        )}

        {/* ONGLET APPARENCE */}
        {activeTab === 'appearance' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                <span className="p-2 rounded-xl" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                  <Palette className="w-5 h-5" />
                </span>
                Apparence & Personnalisation
              </h2>
              <p className="text-sm" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Couleurs, mode clair/sombre, typographie, densité et accessibilité. Les changements s'appliquent immédiatement et sont persistés à l'enregistrement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Couleur d'accentuation</h3>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_PRESETS.map((p) => {
                    const active = (appSettingsLocal?.themeConfig?.accentColor || themeConfig.accentColor) === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setThemeConfigLocal({ accentColor: p.value })}
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm transition-transform hover:scale-105"
                        style={{ background: p.value, outline: active ? `2px solid var(--md-sys-color-on-surface)` : 'none', outlineOffset: '2px' }}
                        title={p.name}
                        aria-pressed={active}
                      >
                        {active && <CheckCircle2 className="w-5 h-5" style={{ color: contrastOnColor(p.value) }} />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 pt-3" style={{ borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                  <input
                    type="color"
                    value={appSettingsLocal?.themeConfig?.accentColor || themeConfig.accentColor}
                    onChange={(e) => setThemeConfigLocal({ accentColor: e.target.value })}
                    className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0"
                    style={{ background: 'transparent' }}
                  />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Couleur personnalisée</p>
                    <p className="font-mono text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{appSettingsLocal?.themeConfig?.accentColor || themeConfig.accentColor}</p>
                  </div>
                </div>
              </div>

              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Mode d'apparence</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'light', label: 'Clair', icon: Sun },
                    { id: 'dark', label: 'Sombre', icon: Moon },
                    { id: 'system', label: 'Système', icon: Monitor },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = (appSettingsLocal?.themeConfig?.appearance || themeConfig.appearance) === (m.id as any);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setThemeConfigLocal({ appearance: m.id as any })}
                        className={`p-4 rounded-2xl border text-[11px] font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          active ? 'border-transparent shadow-sm' : 'border-[var(--md-sys-color-outline)]'
                        }`}
                        style={{
                          background: active ? 'var(--md-sys-color-primary-container)' : 'transparent',
                          color: active ? 'var(--md-sys-color-on-primary-container)' : 'var(--md-sys-color-on-surface)',
                        }}
                      >
                        <Icon className="w-6 h-6" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setAppearance(isDark ? 'light' : 'dark')}
                  className="md3-outlined-btn w-full text-xs"
                >
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  Bascule rapide : {isDark ? 'Passer en clair' : 'Passer en sombre'}
                </button>
              </div>

              <div className="md3-card p-5 space-y-5 md:col-span-2 xl:col-span-1">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Typographie & Densité</h3>

                {[
                  { id: 'fontScale', label: 'Taille de police', options: [
                    { id: 'small', label: 'Petite' },
                    { id: 'medium', label: 'Normale' },
                    { id: 'large', label: 'Grande' },
                  ] as any[] },
                  { id: 'fontFamily', label: 'Famille de police', options: [
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Serif' },
                    { id: 'mono', label: 'Mono' },
                  ] },
                  { id: 'density', label: 'Densité', options: [
                    { id: 'compact', label: 'Compacte' },
                    { id: 'comfortable', label: 'Confortable' },
                  ] },
                  { id: 'borderRadius', label: 'Rayon des bordures', options: [
                    { id: 'sharp', label: 'Droit' },
                    { id: 'rounded', label: 'Arrondi' },
                    { id: 'extra', label: 'Très arrondi' },
                  ] },
                ].map((row) => (
                  <div key={row.id} className="space-y-2">
                    <label className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>{row.label}</label>
                    <div className="md3-segmented-btn w-full">
                      {row.options.map((opt: any) => {
                        const active = (appSettingsLocal?.themeConfig?.[row.id as keyof ThemeConfig] || themeConfig[row.id as keyof ThemeConfig]) === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setThemeConfigLocal({ [row.id]: opt.id } as any)}
                            className={active ? 'active' : ''}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="md3-card p-5 space-y-4">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Accessibilité</h3>
                <label className="md3-list-item cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(appSettingsLocal?.themeConfig?.reducedMotion || themeConfig.reducedMotion)}
                    onChange={(e) => setThemeConfigLocal({ reducedMotion: e.target.checked })}
                    className="md3-switch shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Réduire les animations</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Désactive les effets de transition pour améliorer le confort.</div>
                  </div>
                </label>
                <label className="md3-list-item cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!(appSettingsLocal?.themeConfig?.highContrast || themeConfig.highContrast)}
                    onChange={(e) => setThemeConfigLocal({ highContrast: e.target.checked })}
                    className="md3-switch shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Contraste élevé</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Renforce les contrastes pour une meilleure lisibilité.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET SAUVEGARDES */}
        {activeTab === 'backup' && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h2 className="text-2xl font-black flex items-center gap-3" style={{ color: 'var(--md-sys-color-on-surface)' }}>
                <span className="p-2 rounded-xl" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                  <DatabaseBackup className="w-5 h-5" />
                </span>
                Sauvegardes locales SQLite
              </h2>
              <p className="text-sm" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                Protégez la base de données. Les sauvegardes sont stockées localement et peuvent être restaurées ou supprimées.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="md3-card p-5 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Sauvegardes disponibles</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={refreshBackups} className="md3-tonal-btn text-xs">
                      <RotateCcw className="w-3.5 h-3.5" /> Actualiser
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="md3-filled-btn text-xs disabled:opacity-60"
                    >
                      <DatabaseBackup className="w-4 h-4" />
                      {isCreatingBackup ? 'Sauvegarde…' : 'Sauvegarder'}
                    </button>
                  </div>
                </div>

                {backups.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    <HardDrive className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--md-sys-color-on-surface-variant)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Aucune sauvegarde locale</p>
                    <p className="text-xs mt-1">Créez une sauvegarde manuelle pour sécuriser votre base.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {backups.map((b) => (
                      <div
                        key={b.id}
                        className="md3-list-item"
                      >
                        <div className="p-2.5 rounded-xl" style={{ background: 'var(--md-sys-color-primary-container)', color: 'var(--md-sys-color-on-primary-container)' }}>
                          <DatabaseBackup className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--md-sys-color-on-surface)' }}>{b.name}</p>
                          <p className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                            {new Date(b.createdAt).toLocaleString('fr-FR')} · {formatSize(b.size)} · {b.type}{b.compressed ? ' · compressé' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleRestoreBackup(b)} className="md3-tonal-btn text-[10px] py-2 px-3">Restaurer</button>
                          <button type="button" onClick={() => handleDeleteBackup(b)} className="md3-outlined-btn text-[10px] py-2 px-3" style={{ color: 'var(--md-sys-color-error)', borderColor: 'var(--md-sys-color-error)' }}>Supprimer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--md-sys-color-surface-variant)', color: 'var(--md-sys-color-on-surface-variant)' }}>
                  <span className="font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Base active :</span>
                  <p className="font-mono break-all mt-1">{dbPath || '—'}</p>
                </div>
              </div>

              <div className="md3-card p-5 space-y-5">
                <h3 className="text-sm font-bold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Configuration</h3>

                <label className="md3-list-item cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupCfg.autoBackup}
                    onChange={(e) => setBackupConfigLocal({ autoBackup: e.target.checked })}
                    className="md3-switch shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Sauvegarde automatique</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Création automatique selon l'intervalle.</div>
                  </div>
                </label>

                <label className="md3-list-item cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupCfg.compressBackups}
                    onChange={(e) => setBackupConfigLocal({ compressBackups: e.target.checked })}
                    className="md3-switch shrink-0"
                  />
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--md-sys-color-on-surface)' }}>Compresser les sauvegardes</div>
                    <div className="text-xs" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Réduit la taille avec gzip.</div>
                  </div>
                </label>

                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Intervalle (minutes)</label>
                  <NumberInput
                    value={backupCfg.autoBackupIntervalMinutes}
                    onChange={(v) => setBackupConfigLocal({ autoBackupIntervalMinutes: Math.max(15, Number(v) || 60) })}
                    min={15}
                    step={15}
                    className="md3-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>Nombre max de sauvegardes</label>
                  <NumberInput
                    value={backupCfg.maxBackups}
                    onChange={(v) => setBackupConfigLocal({ maxBackups: Math.max(3, Number(v) || 10) })}
                    min={3}
                    step={1}
                    className="md3-input"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET COMPTE */}
        {activeTab === 'account' && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" /> Mon Compte & Préférences
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Identité Connectée</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold">Nom</span>
                    <span className="font-black" style={{ color: 'var(--text-primary)' }}>{currentUser?.nom || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold">Email</span>
                    <span className="font-mono text-slate-400">{currentUser?.email || '—'}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-bold">Rôle</span>
                    <span className="font-black text-indigo-400">{ROLE_DETAILS[userRole]?.label || userRole}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Préférences Utilisateur</h4>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Onglet par défaut au lancement</label>
                  <CustomSelect
                    options={ROLE_DETAILS[userRole].allowedTabs.map((t) => ({ value: t, label: MAIN_TAB_LABELS[t] || t }))}
                    value={userPrefs.defaultTab || getDefaultTabForRole(userRole)}
                    onChange={(v) => setUserPrefsLocal({ defaultTab: v })}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Timeout session (minutes)</label>
                  <NumberInput
                    value={userPrefs.sessionTimeoutMinutes || 30}
                    onChange={(v) => setUserPrefsLocal({ sessionTimeoutMinutes: Math.max(5, Number(v) || 30) })}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={!!userPrefs.compactLists}
                    onChange={(e) => setUserPrefsLocal({ compactLists: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Listes compactes</div>
                    <div className="text-[10px] text-slate-500">Réduit l'espacement des lignes dans les tableaux.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={!!userPrefs.emailNotifications}
                    onChange={(e) => setUserPrefsLocal({ emailNotifications: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Notifications par email</div>
                    <div className="text-[10px] text-slate-500">Active l'envoi de notifications (si SMTP configuré).</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={!!userPrefs.sidebarCollapsed}
                    onChange={(e) => setUserPrefsLocal({ sidebarCollapsed: e.target.checked })}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600"
                  />
                  <div>
                    <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Sidebar repliée par défaut</div>
                    <div className="text-[10px] text-slate-500">Réduit la barre latérale au démarrage.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 6 : LICENCE & SYSTEME */}
        {activeTab === 'system' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              Empreinte Matérielle & Moteur de Base de Données SQLite
            </h3>

            <div className="p-3.5 rounded-xl border bg-slate-500/5 space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 text-xs font-black text-indigo-400">
                <Cpu className="w-4 h-4" /> Empreinte Matérielle HWID (Hardware ID)
              </div>
              <p className="font-mono text-xs font-bold text-slate-300">{config.hwid}</p>
            </div>

            {/* Nettoyage des Données de Test */}
            <div className="p-4 rounded-xl border space-y-3" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.25)' }}>
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Nettoyage & Remise à Zéro de l'Application (Base Propre)
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Supprimez instantanément toutes les données factices (les 1 000+ élèves et enseignants de démonstration). Conserve uniquement la structure propre de votre établissement (les classes EPST, l'année scolaire et le plan comptable).
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Voulez-vous vraiment supprimer toutes les données de test et remettre l’application à zéro (0 élève, 0 enseignant) ?')) {
                    const res = await LocalDatabaseService.cleanMockData();
                    if (res.success) {
                      alert('✅ Succès ! L’application a été entièrement nettoyée.');
                      window.location.reload();
                    } else {
                      alert(`⚠️ Erreur : ${res.error || 'Impossible de nettoyer la base.'}`);
                    }
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Nettoyer la Base de Données (Supprimer les 1 000+ Élèves & Enseignants Factices)</span>
              </button>

              <div className="pt-3 border-t" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                  Supprimez uniquement les transactions financières (factures, paiements, reçus, caisse, écritures comptables et dépenses) sans toucher aux élèves, classes, personnel ni frais scolaires.
                </p>
                <button
                type="button"
                onClick={async () => {
                  if (confirm('Cette action supprime toutes les factures, paiements, reçus, caisse et écritures comptables.\n\nConfirmer ?')) {
                    const res = await LocalDatabaseService.resetFinancialData();
                    if (res.ok) {
                      alert('✅ Données financières réinitialisées avec succès.');
                      window.location.reload();
                    } else {
                      alert(`⚠️ Erreur : ${res.error || 'Impossible de réinitialiser les données financières.'}`);
                    }
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500/80 hover:bg-rose-600/80 text-white font-black text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Réinitialiser les Données Financières (Factures, Paiements, Caisse, Comptabilité)</span>
              </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);
};
