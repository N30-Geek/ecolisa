import React, { useState } from 'react';
import { Building2, Save, MapPin, Phone, Mail, Globe, Shield, UserCheck, DollarSign, Image as ImageIcon, CheckCircle } from 'lucide-react';
import type { ConfigEtablissement } from '../../../types';
import { PROVINCES_RDC } from '../../../data/referentielEPST';
import { CustomSelect } from '../../common/CustomSelect';

const CONFIG_KEY = 'ecolisa_etablissement';

const defaultConfig: ConfigEtablissement = {
  nomOfficiel: '',
  acronyme: '',
  devise: '',
  numeroAgrement: '',
  numeroIdentificationNationale: '',
  codeEPST: '',
  province: 'Kinshasa',
  territoireCommune: '',
  quartier: '',
  avenue: '',
  numero: '',
  telephone1: '',
  telephone2: '',
  email: '',
  siteWeb: '',
  nomPrefetDirecteur: '',
  nomDirecteurEtudes: '',
  nomCenseur: '',
  nomSecrétaireGeneral: '',
  deviseLocale: 'USD',
  logoUrl: '',
};

export const EtablissementTab: React.FC = () => {
  const [config, setConfig] = useState<ConfigEtablissement>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_KEY);
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: keyof ConfigEtablissement, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleChange('logoUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const provinceOptions = PROVINCES_RDC.map(p => ({ value: p, label: p }));
  const deviseOptions = [
    { value: 'USD', label: 'USD ($) - Dollar Américain' },
    { value: 'CDF', label: 'CDF (FC) - Franc Congolais' },
    { value: 'USD_CDF', label: 'Bidevise (USD & CDF)' },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* En-tête & Bouton Sauvegarder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Fiche Signalétique de l'Établissement
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Identité officielle, agrément EPST RDC et coordonnées de contact.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-fade-in">
              <CheckCircle className="w-4 h-4" /> Modifications enregistrées !
            </span>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <Save className="w-4 h-4" /> Enregistrer la Configuration
          </button>
        </div>
      </div>

      {/* Section 1 : Identité & Logo */}
      <div className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
          <Building2 className="w-4 h-4 text-indigo-500" />
          1. Identité Officielle de l'École
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nom Officiel de l'Établissement *
              </label>
              <input
                type="text"
                required
                value={config.nomOfficiel}
                onChange={e => handleChange('nomOfficiel', e.target.value)}
                placeholder="Ex: Complexe Scolaire Saint-Joseph"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Acronyme / Sigle
                </label>
                <input
                  type="text"
                  value={config.acronyme}
                  onChange={e => handleChange('acronyme', e.target.value)}
                  placeholder="Ex: C.S. ST-JOSEPH"
                  className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Devise / Slogan de l'Établissement
                </label>
                <input
                  type="text"
                  value={config.devise}
                  onChange={e => handleChange('devise', e.target.value)}
                  placeholder="Ex: Discipline - Travail - Succès"
                  className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>

          {/* Logo Upload / URL */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed text-center"
               style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
            {config.logoUrl ? (
              <div className="relative group w-24 h-24 mb-2">
                <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg border bg-white p-1" />
                <button
                  type="button"
                  onClick={() => handleChange('logoUrl', '')}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-[10px] shadow-md hover:bg-red-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2">
                <ImageIcon className="w-8 h-8 text-slate-400" />
              </div>
            )}
            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                className="hidden"
              />
              <div className="w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-center">
                Importer un logo
              </div>
            </label>
            <input
              type="text"
              value={config.logoUrl || ''}
              onChange={e => handleChange('logoUrl', e.target.value)}
              placeholder="Ou collez l'URL du logo"
              className="w-full px-2 py-1 mt-2 text-[11px] rounded-lg border font-medium text-center focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, WEBP acceptés</span>
          </div>
        </div>
      </div>

      {/* Section 2 : Agrément EPST RDC */}
      <div className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
          <Shield className="w-4 h-4 text-indigo-500" />
          2. Agrément & Identifiants Officiels EPST (RDC)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              N° d'Agrément MEPST
            </label>
            <input
              type="text"
              value={config.numeroAgrement}
              onChange={e => handleChange('numeroAgrement', e.target.value)}
              placeholder="Ex: MINEPST/CABMIN/0892/2018"
              className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              N° d'Identification Nationale (ID NAT)
            </label>
            <input
              type="text"
              value={config.numeroIdentificationNationale}
              onChange={e => handleChange('numeroIdentificationNationale', e.target.value)}
              placeholder="Ex: 01-902-N48910-K"
              className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Code Établissement EPST (EXETAT)
            </label>
            <input
              type="text"
              value={config.codeEPST}
              onChange={e => handleChange('codeEPST', e.target.value)}
              placeholder="Ex: 11048291"
              className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Section 3 : Localisation Géographique */}
      <div className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
           style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
          <MapPin className="w-4 h-4 text-indigo-500" />
          3. Localisation Géographique (RDC)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Province *
            </label>
            <CustomSelect
              options={provinceOptions}
              value={config.province}
              onChange={val => handleChange('province', val)}
              searchable
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Territoire / Commune *
            </label>
            <input
              type="text"
              required
              value={config.territoireCommune}
              onChange={e => handleChange('territoireCommune', e.target.value)}
              placeholder="Ex: Gombe, Ngaliema, Kalamu..."
              className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Quartier
            </label>
            <input
              type="text"
              value={config.quartier}
              onChange={e => handleChange('quartier', e.target.value)}
              placeholder="Ex: Quartier SOCIMAT"
              className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Avenue & Numéro
            </label>
            <input
              type="text"
              value={config.avenue}
              onChange={e => handleChange('avenue', e.target.value)}
              placeholder="Ex: Av. de la Justice, N° 14"
              className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Section 4 : Contacts & Direction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact */}
        <div className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <Phone className="w-4 h-4 text-indigo-500" />
            4. Contacts & Coordonnées
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Téléphone Principal (Accueil) *
              </label>
              <input
                type="tel"
                required
                value={config.telephone1}
                onChange={e => handleChange('telephone1', e.target.value)}
                placeholder="+243 810 000 000"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Phone className="w-3.5 h-3.5 text-slate-400" /> Téléphone Secondaire (Comptabilité)
              </label>
              <input
                type="tel"
                value={config.telephone2 || ''}
                onChange={e => handleChange('telephone2', e.target.value)}
                placeholder="+243 990 000 000"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Officiel *
              </label>
              <input
                type="email"
                required
                value={config.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="contact@ecole.cd"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Site Web (Optionnel)
              </label>
              <input
                type="url"
                value={config.siteWeb || ''}
                onChange={e => handleChange('siteWeb', e.target.value)}
                placeholder="https://www.ecole.cd"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>

        {/* Direction & Monnaie */}
        <div className="p-5 rounded-2xl border shadow-xs space-y-4 transition-colors"
             style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-bold flex items-center gap-2 pb-2 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
            <UserCheck className="w-4 h-4 text-indigo-500" />
            5. Noms des Responsables & Devise
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nom du Préfet / Directeur Chef d'Établissement *
              </label>
              <input
                type="text"
                required
                value={config.nomPrefetDirecteur}
                onChange={e => handleChange('nomPrefetDirecteur', e.target.value)}
                placeholder="Ex: Rév. Père Alphonse KABENGA"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nom du Directeur des Études (D.E.)
              </label>
              <input
                type="text"
                value={config.nomDirecteurEtudes}
                onChange={e => handleChange('nomDirecteurEtudes', e.target.value)}
                placeholder="Ex: Prof. MUKENDI Jean-Pierre"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Nom du Censeur / Directeur de Discipline
              </label>
              <input
                type="text"
                value={config.nomCenseur || ''}
                onChange={e => handleChange('nomCenseur', e.target.value)}
                placeholder="Ex: M. BWANGA Sylvain"
                className="w-full px-3 py-2 rounded-lg text-xs border font-medium focus:outline-none focus:border-indigo-500"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Devise Principale pour les Frais & Caisse
              </label>
              <CustomSelect
                options={deviseOptions}
                value={config.deviseLocale}
                onChange={val => handleChange('deviseLocale', val as any)}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
