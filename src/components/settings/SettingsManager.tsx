import React, { useState } from 'react';
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
  FileCheck
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { PROVINCES_RDC } from '../academic/StudentRegistrationModal';
import { SchoolConfig } from '../onboarding/OnboardingWizard';
import { LocalDatabaseService } from '../../services/localDatabase';

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

export const SettingsManager: React.FC<SettingsManagerProps> = ({ onOpenOnboarding }) => {
  const [activeTab, setActiveTab] = useState<'school' | 'cycles' | 'promoter' | 'finance' | 'system'>('school');
  const [isSaved, setIsSaved] = useState(false);

  const [config, setConfig] = useState<SchoolConfig>(() => {
    const raw = localStorage.getItem('ecolisa_school_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
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
      promoterName: 'Dr. Jean-Baptiste KABANGE',
      promoterRole: 'PROMOTEUR_ADMIN',
      promoterEmail: 'admin@ecolisa.cd',
      promoterPhone2FA: '+243 81 234 5678',
      promoterPinCode: '992001',
      activeSchoolYear: '2025–2026',
      hwid: 'HWID-ED25519-RDC-99201-NODE-MAC',
    };
  });

  const handleSave = async () => {
    localStorage.setItem('ecolisa_school_config', JSON.stringify(config));
    await LocalDatabaseService.setConfig('school_config', config);
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

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 select-none">
      {/* HEADER PARAMÈTRES */}
      <div
        className="p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
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
            className="px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 font-bold text-xs hover:bg-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Relancer l'Onboarding</span>
          </button>

          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaved ? 'Enregistré !' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>

      {/* BARRE D'ONGLETS PARAMÈTRES */}
      <div
        className="flex items-center gap-2 p-1.5 rounded-xl border shadow-xs overflow-x-auto sidebar-scroll"
        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
      >
        {[
          { id: 'school', label: '1. Profil & Statut Juridique', icon: Building2 },
          { id: 'cycles', label: '2. Cycles & Options EPST', icon: GraduationCap },
          { id: 'promoter', label: '3. Compte Promoteur & 2FA', icon: ShieldCheck },
          { id: 'finance', label: '4. Devise & Caisse', icon: Wallet },
          { id: 'system', label: '5. HWID & Système', icon: Cpu },
        ].map((t) => {
          const TabIcon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-500/10'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* CORPS DE L'ONGLET SÉLECTIONNÉ */}
      <div
        className="p-6 rounded-2xl border shadow-xs space-y-6"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
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

        {/* ONGLET 4 : DEVISE & CAISSE */}
        {activeTab === 'finance' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              Paramètres Monétaires & Comptabilité
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Devise Principale de Gestion
                </label>
                <CustomSelect
                  options={[
                    { value: 'USD', label: 'Dollar Américain (USD $)' },
                    { value: 'CDF', label: 'Franc Congolais (CDF FC)' },
                  ]}
                  value={config.currency}
                  onChange={(val) => setConfig({ ...config, currency: val as 'USD' | 'CDF' })}
                  className="w-full"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Taux de Change Indicatif (1 USD en CDF)
                </label>
                <input
                  type="number"
                  value={config.exchangeRate}
                  onChange={(e) => setConfig({ ...config, exchangeRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-lg border font-black text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 5 : LICENCE & SYSTEME */}
        {activeTab === 'system' && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              Empreinte Matérielle & Moteur de Base de Données
            </h3>

            <div className="p-3.5 rounded-xl border bg-slate-500/5 space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 text-xs font-black text-indigo-400">
                <Cpu className="w-4 h-4" /> Empreinte Matérielle HWID (Hardware ID)
              </div>
              <p className="font-mono text-xs font-bold text-slate-300">{config.hwid}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
