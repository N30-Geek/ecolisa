import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  School,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  PhoneCall,
  KeyRound,
  Sparkles,
  BadgeCheck,
  Shield,
} from 'lucide-react';
import { RôleSystème } from '../../types';
import { LocalDatabaseService, UserSession } from '../../services/localDatabase';
import { SchoolConfig } from '../onboarding/OnboardingWizard';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession) => void;
  onResetAndReconfigure: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

// Labels lisibles par rôle
const ROLE_LABELS: Record<string, string> = {
  PROMOTEUR_ADMIN:      'Promoteur & Administrateur Général',
  PREFET_DIRECTEUR:     'Préfet des Études / Directeur',
  DIRECTEUR_ETUDES:     'Directeur des Études (DE)',
  DIRECTEUR_DISCIPLINE: 'Directeur de Discipline (DD)',
  COMPTABLE:            'Comptable Intendant Général',
  TITULAIRE:            'Enseignant Titulaire de Classe',
  ENSEIGNANT:           'Enseignant / Professeur',
  PARENT_ELEVE:         'Espace Parent & Élève',
};

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onResetAndReconfigure,
  isDarkMode = false,
  toggleTheme
}) => {
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode]   = useState('');
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showPinCode, setShowPinCode]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Message générique — ne révèle jamais si l'email existe (anti account-enumeration)
  const GENERIC_AUTH_ERROR = 'Identifiants incorrects. Vérifiez votre e-mail et votre mot de passe.';

  useEffect(() => {
    // Charger la config école
    const stored = localStorage.getItem('ecolisa_school_config');
    if (stored) { try { setSchoolConfig(JSON.parse(stored)); } catch {} }
    if ((window as any).electronAPI?.getConfig) {
      (window as any).electronAPI.getConfig('school_config').then((cfg: any) => {
        if (cfg) setSchoolConfig(cfg);
      });
    }
  }, []);

  // Détecter le rôle à la volée lorsque l'email est saisi (lookup DB)
  useEffect(() => {
    if (!email.trim() || !email.includes('@')) {
      setDetectedRole(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const user = await LocalDatabaseService.getUserByEmail(email.trim());
        setDetectedRole(user ? user.role : null);
      } catch {
        setDetectedRole(null);
      }
    }, 350); // debounce 350ms
    return () => clearTimeout(timer);
  }, [email]);

  const needsPinCode = detectedRole === 'PROMOTEUR_ADMIN' || detectedRole === 'COMPTABLE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Veuillez saisir une adresse e-mail valide.');
      return;
    }
    if (!password) {
      setErrorMsg('Veuillez saisir votre mot de passe.');
      return;
    }
    if (needsPinCode && pinCode.length > 0 && pinCode.length < 4) {
      setErrorMsg('Le code PIN doit comporter au moins 4 chiffres.');
      return;
    }

    setIsSubmitting(true);

    // Délai anti brute-force (400–600 ms) — rend l'énumération coûteuse
    await new Promise(res => setTimeout(res, 400 + Math.random() * 200));

    try {
      // Vérification email + mot de passe via scrypt (main process)
      const existingUser = await LocalDatabaseService.verifyCredentials(email.trim(), password);

      if (!existingUser) {
        setIsSubmitting(false);
        setErrorMsg(GENERIC_AUTH_ERROR);
        return;
      }

      // Vérification PIN pour les rôles sensibles — même message générique
      if (existingUser.pinCode && existingUser.pinCode.trim() !== '') {
        if (!pinCode || pinCode.trim() !== existingUser.pinCode.trim()) {
          setIsSubmitting(false);
          setErrorMsg(GENERIC_AUTH_ERROR);
          return;
        }
      }

      const userSession: UserSession = {
        id:      existingUser.id,
        email:   existingUser.email,
        nom:     `${existingUser.prenom || ''} ${existingUser.nom}`.trim(),
        role:    existingUser.role,
        token:   `token_${Math.random().toString(36).substring(2)}`,
        pinCode: existingUser.pinCode || undefined,
      };

      setIsSubmitting(false);
      onLoginSuccess(userSession);
    } catch {
      setIsSubmitting(false);
      setErrorMsg(GENERIC_AUTH_ERROR);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 login-ambient-bg text-slate-900 dark:text-slate-100 animate-fade-in select-none relative"
      style={{ background: 'var(--bg-base)' }}>

      {/* Grille décorative subtile */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }} />

      {/* Bouton thème */}
      {toggleTheme && (
        <div className="absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border bg-white/5 dark:bg-white/4 backdrop-blur-md text-slate-300 dark:text-slate-300 hover:text-indigo-400 hover:border-indigo-500/30 transition-all cursor-pointer"
            style={{ borderColor: 'var(--border)' }}
            title="Basculer le mode sombre/clair"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      )}

      <div
        className="w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col lg:flex-row border transition-all animate-scale-in relative z-10"
        style={{
          background:  'rgba(8, 11, 32, 0.88)',
          borderColor: 'rgba(255,255,255,0.07)',
          color:       'var(--text-primary)',
          boxShadow:   '0 32px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px) saturate(1.5)',
        }}
      >
        {/* ─── PANNEAU GAUCHE ─── */}
        <div className="w-full lg:w-5/12 p-8 border-b lg:border-b-0 lg:border-r flex flex-col justify-between gap-6"
          style={{ background: 'rgba(5,6,20,0.70)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="space-y-5">

            {/* Logo établissement */}
            <div className="flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border shadow-xs"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden animate-float"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #2563eb)', boxShadow: '0 8px 28px rgba(99,102,241,0.40)' }}>
                {schoolConfig?.logoUrl ? (
                  <img src={schoolConfig.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <School className="w-12 h-12 text-white" />
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {schoolConfig?.schoolName || 'ECOLISA Enterprise'}
                </h1>
                {schoolConfig?.secopeCode && (
                  <p className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                    SECOPE : {schoolConfig.secopeCode}
                  </p>
                )}
                {schoolConfig?.province && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {schoolConfig.province}{schoolConfig.subDivision ? ` • ${schoolConfig.subDivision}` : ''}
                  </p>
                )}
                {!schoolConfig && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">ERP Scolaire Enterprise · RDC</p>
                )}
              </div>
            </div>

            {/* Badges info */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl border"
              style={{ background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.15)' }}>
              <div className="p-2 rounded-lg text-indigo-400 shrink-0"
                style={{ background: 'rgba(99,102,241,0.12)' }}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>Profil Automatique</p>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Votre rôle est identifié selon votre e-mail</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl border"
              style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.14)' }}>
              <div className="p-2 rounded-lg text-emerald-400 shrink-0"
                style={{ background: 'rgba(16,185,129,0.10)' }}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>Chiffrement scrypt 512-bit</p>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Mots de passe hachés, données 100% locales</p>
              </div>
            </div>
          </div>

          {/* Aide */}
          <div className="p-4 rounded-xl border space-y-2.5"
            style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.18)' }}>
            <div className="flex items-center gap-2 font-black text-xs" style={{ color: '#fbbf24' }}>
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Accès Perdu ou Identifiants Oubliés ?</span>
            </div>
            <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
              Contactez l'Administrateur Système de votre établissement pour réinitialiser votre accès.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[10.5px] font-bold text-indigo-400">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>Assistance : ecolisa@assistant.com</span>
            </div>
            {schoolConfig?.phone && (
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
                <span>Support : {schoolConfig.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── PANNEAU DROIT : FORMULAIRE ─── */}
        <div className="w-full lg:w-7/12 p-8 flex flex-col justify-between"
          style={{ background: 'rgba(10,13,35,0.60)' }}>
          <div>
            <div className="mb-7">
              <span className="px-3 py-1 rounded-full font-black text-[9.5px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 uppercase tracking-widest">
                PORTAIL D'AUTHENTIFICATION SÉCURISÉ
              </span>
              <h2 className="text-xl font-black tracking-tight mt-2.5" style={{ color: 'var(--text-primary)' }}>
                Connexion à l'Espace ECOLISA
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Saisissez vos identifiants — votre profil d'accès est détecté automatiquement.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-black flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  Adresse E-mail *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Mot de passe */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Lock className="w-3.5 h-3.5 text-indigo-500" />
                  Mot de Passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Rôle détecté — lecture seule */}
              {detectedRole && (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-indigo-400/30 bg-indigo-500/8 animate-fade-in">
                  <BadgeCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Profil détecté</p>
                    <p className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                      {ROLE_LABELS[detectedRole] || detectedRole}
                    </p>
                  </div>
                </div>
              )}

              {/* Code PIN — uniquement pour Admin et Comptable */}
              {needsPinCode && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-xs font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wide flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Code PIN de Sécurité Caisse
                  </label>
                  <div className="relative">
                    <input
                      type={showPinCode ? 'text' : 'password'}
                      maxLength={6}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="Code PIN à 4 ou 6 chiffres"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border font-mono font-black text-center text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinCode(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {showPinCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton connexion */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 mt-2"
                style={{ boxShadow: '0 2px 12px 0 rgba(99,102,241,0.20)' }}
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    <span>Vérification sécurisée...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>Se Connecter</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div
            className="mt-6 pt-3 border-t flex flex-wrap items-center justify-between gap-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="text-slate-400 font-mono text-[10.5px]">ECOLISA ERP Enterprise v1.0</span>
            <button
              type="button"
              onClick={onResetAndReconfigure}
              className="text-[11px] font-black text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Réinitialiser la Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
