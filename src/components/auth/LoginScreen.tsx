import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lock, Mail, ShieldCheck, ArrowRight, School, RefreshCw, Eye, EyeOff,
  Sun, Moon, AlertCircle, Sparkles, BadgeCheck, Shield, ChevronRight,
  UserCircle2, X, User, Users, Crown, Key, KeyRound, Building2, CheckCircle2,
  Search, GraduationCap, Wallet, UserCheck, Phone, ArrowLeft
} from 'lucide-react';
import { RôleSystème, UserAccount } from '../../types';
import { LocalDatabaseService, UserSession } from '../../services/localDatabase';
import { SchoolConfig } from '../onboarding/OnboardingWizard';
import { roleRequiresPin } from '../../utils/permissions';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession) => void;
  onResetAndReconfigure: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  lockedUser?: UserSession; // Utilisateur dont la session vient d'être verrouillée
}

const ROLE_LABELS: Record<RôleSystème, string> = {
  PROMOTEUR_ADMIN:      'Promoteur / Admin',
  PREFET_DIRECTEUR:     'Préfet / Directeur',
  DIRECTEUR_ETUDES:     'Dir. des Études',
  DIRECTEUR_DISCIPLINE: 'Dir. de Discipline',
  COMPTABLE:            'Comptable Intendant',
  SECRETAIRE:           'Secrétariat',
  INTENDANT:            'Intendant Financier',
  CENSEUR:              'Censeur des Études',
  TITULAIRE:            'Enseignant Titulaire',
  ENSEIGNANT:           'Professeur / Enseignant',
  PARENT_ELEVE:         'Parent & Élève',
};

const ROLE_COLORS: Record<RôleSystème, string> = {
  PROMOTEUR_ADMIN:      'from-violet-600 to-purple-700 text-white',
  PREFET_DIRECTEUR:     'from-indigo-600 to-blue-700 text-white',
  DIRECTEUR_ETUDES:     'from-blue-600 to-cyan-700 text-white',
  DIRECTEUR_DISCIPLINE: 'from-amber-600 to-orange-700 text-white',
  COMPTABLE:            'from-emerald-600 to-teal-700 text-white',
  SECRETAIRE:           'from-pink-600 to-rose-700 text-white',
  INTENDANT:            'from-teal-600 to-emerald-700 text-white',
  CENSEUR:              'from-slate-600 to-slate-800 text-white',
  TITULAIRE:            'from-sky-600 to-indigo-700 text-white',
  ENSEIGNANT:           'from-teal-600 to-cyan-700 text-white',
  PARENT_ELEVE:         'from-rose-500 to-pink-700 text-white',
};

type CategoryFilter = 'ALL' | 'DIRECTION' | 'PEDAGOGIE' | 'FINANCES' | 'PARENTS' | 'MANUAL';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onResetAndReconfigure,
  isDarkMode = false,
  toggleTheme,
  lockedUser,
}) => {
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);
  const [standardProfiles, setStandardProfiles] = useState<UserAccount[]>([]);
  const [adminUser, setAdminUser]               = useState<UserAccount | null>(null);
  const [loadingProfiles, setLoadingProfiles]   = useState(true);

  // Mode "Verrouillage Rapide": affiche directement l'écran de déverrouillage
  // du dernier utilisateur au lieu de la grille complète.
  const isLockScreen = !!lockedUser;

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery]       = useState('');

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [identifier, setIdentifier]     = useState('');
  const [password, setPassword]         = useState('');
  const [pinCode, setPinCode]           = useState('');
  const [isAdminMode, setIsAdminMode]   = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPinCode, setShowPinCode]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // En mode lock-screen, ouvrir directement le formulaire
  const [showForm, setShowForm]         = useState(isLockScreen);

  const GENERIC_AUTH_ERROR = 'Identifiants incorrects. Vérifiez votre e-mail, identifiant ou mot de passe / PIN.';

  useEffect(() => {
    // Charger config école
    const stored = localStorage.getItem('ecolisa_school_config');
    if (stored) { try { setSchoolConfig(JSON.parse(stored)); } catch {} }
    if ((window as any).electronAPI?.getConfig) {
      (window as any).electronAPI.getConfig('school_config').then((cfg: any) => {
        if (cfg) setSchoolConfig(cfg);
      });
    }

    // getUsers() fusionne déjà le personnel RH en interne (avatarUrl inclus).
    // Ne pas rappeler getStaff() séparément — cela crée des doublons.
    LocalDatabaseService.getUsers().then((users) => {
      const activeUsers = (users || []).filter(u => u.statut !== 'SUSPENDU');
      const admin = activeUsers.find(u => u.role === 'PROMOTEUR_ADMIN') || null;
      const standard = activeUsers.filter(u => u.role !== 'PROMOTEUR_ADMIN');
      setAdminUser(admin);
      setStandardProfiles(standard);

      // En mode lock-screen, pré-sélectionner automatiquement le dernier utilisateur
      if (lockedUser) {
        const match = activeUsers.find(u =>
          u.id === lockedUser.id ||
          (u.email && lockedUser.email && u.email.toLowerCase() === lockedUser.email.toLowerCase())
        );
        if (match) {
          setSelectedUser(match);
          setIdentifier(match.email || match.usernameGenerated || match.id);
        } else {
          // Fallback: pré-remplir l'email depuis la session verrouillée
          setIdentifier(lockedUser.email || '');
        }
      }

      setLoadingProfiles(false);
    }).catch(() => setLoadingProfiles(false));
  }, []);

  // PIN Requis uniquement pour les rôles financiers/admin (Comptable, Intendant, Promoteur)
  const needsPinCode = selectedUser ? roleRequiresPin(selectedUser.role) : isAdminMode;

  const handleSelectStandardUser = useCallback((profile: UserAccount) => {
    setSelectedUser(profile);
    setIdentifier(profile.email || profile.usernameGenerated || profile.id);
    setPassword('');
    setPinCode('');
    setIsAdminMode(false);
    setShowForm(true);
    setErrorMsg(null);
  }, []);

  const handleOpenAdminLogin = useCallback(() => {
    setSelectedUser(adminUser);
    setIdentifier(adminUser?.email || 'admin@ecolisa.cd');
    setPassword('');
    setPinCode('');
    setIsAdminMode(true);
    setShowForm(true);
    setErrorMsg(null);
  }, [adminUser]);

  const handleOpenManualLogin = useCallback(() => {
    setSelectedUser(null);
    setIdentifier('');
    setPassword('');
    setPinCode('');
    setIsAdminMode(false);
    setShowForm(true);
    setErrorMsg(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const targetIdentifier = identifier.trim();

    if (!targetIdentifier) {
      setErrorMsg('Veuillez saisir votre e-mail, téléphone, matricule ou identifiant.');
      return;
    }

    const effectivePassword = (needsPinCode && pinCode ? pinCode : password).trim();
    if (!effectivePassword && !password) {
      setErrorMsg(needsPinCode ? 'Veuillez saisir votre code PIN ou mot de passe.' : 'Veuillez saisir votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    await new Promise(res => setTimeout(res, 250));

    try {
      // 1. Authentifier via verifyCredentials
      const existingUser = await LocalDatabaseService.verifyCredentials(
        targetIdentifier,
        effectivePassword || password
      );

      if (!existingUser) {
        setIsSubmitting(false);
        setErrorMsg(GENERIC_AUTH_ERROR);
        return;
      }

      // 2. Consigner la connexion dans le journal d'audit
      await LocalDatabaseService.logAction('CONNEXION', 'SYSTEME', 'UserAccount', existingUser.id, {
        email: existingUser.email,
        role: existingUser.role,
        timestamp: new Date().toISOString(),
      });

      // 3. Préparer la session utilisateur
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

  const getInitials = (u: UserAccount) =>
    `${(u.prenom || '').charAt(0)}${u.nom.charAt(0)}`.toUpperCase();

  // Filtrage des comptes
  const filteredProfiles = useMemo(() => {
    return standardProfiles.filter(profile => {
      // Filtre catégorie
      if (activeCategory === 'DIRECTION') {
        if (!['PREFET_DIRECTEUR', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE', 'CENSEUR', 'SECRETAIRE'].includes(profile.role)) return false;
      } else if (activeCategory === 'PEDAGOGIE') {
        if (!['ENSEIGNANT', 'TITULAIRE', 'DIRECTEUR_ETUDES', 'CENSEUR'].includes(profile.role)) return false;
      } else if (activeCategory === 'FINANCES') {
        if (!['COMPTABLE', 'INTENDANT'].includes(profile.role)) return false;
      } else if (activeCategory === 'PARENTS') {
        if (profile.role !== 'PARENT_ELEVE') return false;
      }

      // Recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${profile.prenom || ''} ${profile.nom || ''}`.toLowerCase();
        const roleLabel = (ROLE_LABELS[profile.role] || profile.role).toLowerCase();
        const email = (profile.email || '').toLowerCase();
        const phone = (profile.telephone || '').replace(/[^0-9]/g, '');
        return fullName.includes(q) || roleLabel.includes(q) || email.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [standardProfiles, activeCategory, searchQuery]);

  // Styles adaptatifs
  const bg        = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg    = isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200';
  const panelBg   = isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100/80 border-slate-200';
  const innerBg   = isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200';
  const inputBg   = isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900';
  const textPri   = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSec   = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const textMut   = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const divider   = isDarkMode ? 'border-slate-800' : 'border-slate-200';
  const itemHover = isDarkMode
    ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-indigo-500/50'
    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-400';
  const neonA     = isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-500/10';
  const neonB     = isDarkMode ? 'bg-violet-600/20' : 'bg-violet-400/10';
  const badgePill = isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-indigo-100 text-indigo-700 border-indigo-200';
  const badgeBox  = isDarkMode ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200';
  const errorBox  = isDarkMode ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-700';

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-3 sm:p-6 animate-fade-in select-none relative overflow-hidden ${bg}`}>

      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 opacity-5">
        {schoolConfig?.logoUrl ? (
          <img src={schoolConfig.logoUrl} alt="Watermark" className="w-full h-full object-contain filter grayscale" style={{ transform: 'scale(1.1)' }} />
        ) : (
          <School style={{ width: '80vmin', height: '80vmin', color: isDarkMode ? '#818cf8' : '#6366f1' }} />
        )}
      </div>

      {/* Ambient Lighting */}
      <div className={`fixed -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0 ${neonA}`} />
      <div className={`fixed -bottom-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none z-0 ${neonB}`} />

      {/* Theme Toggle */}
      {toggleTheme && (
        <div className="absolute top-4 right-4 z-20">
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border backdrop-blur-md shadow-xs transition-all cursor-pointer ${
              isDarkMode ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:text-indigo-400' : 'border-slate-200 bg-white/80 text-slate-700 hover:text-indigo-600'
            }`}
            title={isDarkMode ? 'Mode Clair' : 'Mode Sombre'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <div className={`w-full max-w-5xl rounded-2xl overflow-hidden flex flex-col lg:flex-row border backdrop-blur-xl shadow-xl relative z-10 ${cardBg}`}>

        {/* LEFT PANEL : IDENTITÉ ÉTABLISSEMENT */}
        <div className={`w-full lg:w-5/12 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r flex flex-col justify-between gap-6 ${panelBg}`}>
          <div className="space-y-5">
            <div className={`flex flex-col items-center text-center space-y-4 p-6 rounded-2xl border ${innerBg}`}>
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center shrink-0 overflow-hidden shadow-md border border-indigo-400/30">
                {schoolConfig?.logoUrl ? (
                  <img src={schoolConfig.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <School className="w-12 h-12 text-white" />
                )}
              </div>
              <div className="space-y-1">
                <h1 className={`text-xl font-black tracking-tight leading-snug ${textPri}`}>
                  {schoolConfig?.schoolName || 'ECOLISA Enterprise'}
                </h1>
                {schoolConfig?.secopeCode && (
                  <p className="text-xs font-black text-indigo-500">SECOPE : {schoolConfig.secopeCode}</p>
                )}
                {schoolConfig?.province && (
                  <p className={`text-[11px] font-medium ${textSec}`}>
                    {schoolConfig.province}{schoolConfig.subDivision ? ` • ${schoolConfig.subDivision}` : ''}
                  </p>
                )}
                {!schoolConfig && (
                  <p className="text-xs text-indigo-500 font-bold">Système ERP Scolaire Certifié · RDC</p>
                )}
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${panelBg}`}>
              <div className="p-2 rounded-lg shrink-0 bg-indigo-500/15 text-indigo-500"><Sparkles className="w-4 h-4" /></div>
              <div>
                <p className={`text-xs font-black ${textPri}`}>Portail Multi-Comptes & Rôles Dédiés</p>
                <p className={`text-[10.5px] ${textSec}`}>Chaque utilisateur accède à son espace exclusif</p>
              </div>
            </div>

            <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${panelBg}`}>
              <div className="p-2 rounded-lg shrink-0 bg-emerald-500/15 text-emerald-500"><Shield className="w-4 h-4" /></div>
              <div>
                <p className={`text-xs font-black ${textPri}`}>Protection SQLite Locale & Offline-First</p>
                <p className={`text-[10.5px] ${textSec}`}>Traçabilité de session et sécurité 512-bit scrypt</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-xs">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Assistance & Connexion</span>
            </div>
            <p className={`text-[11px] leading-relaxed font-medium ${textMut}`}>
              Utilisez votre mot de passe ou code PIN à 4-6 chiffres pour ouvrir votre session de travail.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL : SÉLECTION COMPTE OU FORMULAIRE */}
        <div className="w-full lg:w-7/12 flex flex-col justify-between min-h-[520px]">

          {/* VUE 1 : GRILLE MULTI-COMPTES */}
          {!showForm && (
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full font-black text-[9.5px] border uppercase tracking-widest ${badgePill}`}>
                      ESPACE AUTHENTIFICATION
                    </span>
                    <button
                      onClick={handleOpenManualLogin}
                      className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" /> Autre compte
                    </button>
                  </div>

                  <h2 className={`text-xl font-black tracking-tight mt-2 ${textPri}`}>
                    Choisissez votre Profil
                  </h2>
                  <p className={`text-xs mt-0.5 ${textSec}`}>
                    Sélectionnez votre compte pour vous connecter à votre interface dédiée.
                  </p>
                </div>

                {/* FILTRES PAR CATÉGORIES */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'ALL', label: 'Tous', icon: Users },
                    { id: 'DIRECTION', label: 'Direction', icon: Crown },
                    { id: 'PEDAGOGIE', label: 'Profs', icon: GraduationCap },
                    { id: 'FINANCES', label: 'Finances', icon: Wallet },
                    { id: 'PARENTS', label: 'Parents', icon: UserCheck },
                  ].map((cat) => {
                    const CatIcon = cat.icon;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id as CategoryFilter)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-500/10'
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* BARRE DE RECHERCHE */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer par nom, rôle, e-mail ou téléphone..."
                    className={`w-full pl-9 pr-3.5 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${inputBg}`}
                  />
                </div>

                {/* LISTE DES PROFILS */}
                {loadingProfiles ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2">
                    <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs text-slate-400">Chargement des comptes...</span>
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="p-8 text-center border rounded-2xl space-y-2" style={{ borderColor: 'var(--border)' }}>
                    <Users className="w-8 h-8 mx-auto text-slate-400" />
                    <p className={`text-xs font-bold ${textPri}`}>Aucun profil trouvé</p>
                    <p className="text-[11px] text-slate-400">
                      {searchQuery ? 'Essayez un autre mot-clé ou' : 'Connectez-vous via l\'accès manuel ou administrateur.'}
                    </p>
                    <button
                      onClick={handleOpenManualLogin}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-xs cursor-pointer inline-block mt-2"
                    >
                      Saisie Manuelle d'Identifiants
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1 sidebar-scroll">
                    {filteredProfiles.map((profile) => {
                      const colorClass = ROLE_COLORS[profile.role] || 'from-slate-700 to-slate-800 text-white';
                      return (
                        <button
                          key={profile.id}
                          onClick={() => handleSelectStandardUser(profile)}
                          className={`group flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${itemHover}`}
                        >
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center font-black text-base shadow-xs group-hover:scale-105 transition-transform overflow-hidden border border-white/10`}>
                            {profile.avatarUrl ? (
                              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(profile)}</span>
                            )}
                          </div>
                          <div className="text-center min-w-0 w-full">
                            <p className={`text-xs font-black truncate ${textPri}`}>
                              {profile.prenom ? `${profile.prenom} ` : ''}{profile.nom}
                            </p>
                            <p className="text-[9.5px] text-indigo-500 font-bold truncate">
                              {ROLE_LABELS[profile.role] || profile.role}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* BOUTON ADMIN PROÉMINENT */}
              <div className={`pt-4 border-t space-y-2 ${divider}`}>
                <button
                  type="button"
                  onClick={handleOpenAdminLogin}
                  className={`w-full py-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 border-violet-500/40 text-violet-600 dark:text-violet-300`}
                >
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Accès Administrateur Général (Promoteur / Admin)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* VUE 2 : FORMULAIRE FOCUS D'AUTHENTIFICATION */}
          {showForm && (
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 animate-fade-in">
              <div>
                {/* BANDEAU VERROUILLAGE DE SESSION */}
                {isLockScreen && (
                  <div className={`mb-5 flex items-center gap-3 p-4 rounded-xl border ${
                    isDarkMode
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    <div className="p-2 rounded-lg bg-amber-500/20 shrink-0">
                      <Lock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black">Session Verrouillée</p>
                      <p className="text-[11px] font-medium opacity-80 mt-0.5">
                        Votre session a été verrouillée. Saisissez votre code PIN ou mot de passe pour reprendre.
                      </p>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {/* En mode lock-screen, le bouton Retour amène à la grille complète */}
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setSelectedUser(null); setErrorMsg(null); }}
                      className="p-2 rounded-xl border hover:bg-slate-500/10 transition-all cursor-pointer text-slate-400 hover:text-indigo-500"
                      title="Retour à la liste des profils"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <span className={`px-3 py-0.5 rounded-full font-black text-[9px] border uppercase tracking-widest ${badgePill}`}>
                        {isAdminMode ? 'ACCÈS PROMOTEUR / ADMIN' : selectedUser ? 'AUTHENTIFICATION PROFIL' : 'CONNEXION DIRECTE'}
                      </span>
                      <h2 className={`text-lg font-black tracking-tight mt-1 ${textPri}`}>
                        {selectedUser ? `${selectedUser.prenom || ''} ${selectedUser.nom}` : 'Ouvrir ma Session'}
                      </h2>
                    </div>
                  </div>

                  {selectedUser && (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_COLORS[selectedUser.role] || 'from-slate-700 to-slate-800 text-white'} flex items-center justify-center font-black text-sm shrink-0 overflow-hidden shadow-xs`}>
                      {selectedUser.avatarUrl ? (
                        <img src={selectedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{getInitials(selectedUser)}</span>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className={`p-3.5 rounded-xl border text-xs font-black flex items-center gap-2 animate-fade-in ${errorBox}`}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* IDENTIFIANT (Affiché si non pré-sélectionné ou mode manuel) */}
                  {(!selectedUser || !selectedUser.id) && (
                    <div className="space-y-1">
                      <label className={`text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${textMut}`}>
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        Identifiant / E-mail / Téléphone *
                      </label>
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="Ex: jean.dupont@ecolisa.cd ou 0812345678"
                        required
                        autoFocus
                        className={`w-full px-3.5 py-2.5 rounded-lg border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${inputBg}`}
                      />
                    </div>
                  )}

                  {/* RAPPEL DU RÔLE */}
                  {selectedUser && (
                    <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${badgeBox}`}>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ROLE_COLORS[selectedUser.role] || 'from-slate-600 to-slate-700 text-white'} flex items-center justify-center shrink-0`}>
                        <BadgeCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wide">Espace de Travail Dédié</p>
                        <p className={`text-xs font-black ${textPri}`}>
                          {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* MOT DE PASSE OU CODE PIN */}
                  {needsPinCode ? (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-xs font-extrabold uppercase text-indigo-500 tracking-wide flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        Code PIN de Sécurité (4 chiffres) *
                      </label>
                      <div className="relative">
                        <input
                          type={showPinCode ? 'text' : 'password'}
                          maxLength={6}
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          placeholder="Code PIN à 4 chiffres"
                          autoFocus
                          required
                          className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border font-mono font-black text-center text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${inputBg}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPinCode((v) => !v)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${textSec} hover:text-indigo-500`}
                        >
                          {showPinCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className={`text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${textMut}`}>
                        <Lock className="w-3.5 h-3.5 text-indigo-500" />
                        Mot de Passe ou Code PIN *
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          autoFocus
                          className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all ${inputBg}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${textSec} hover:text-indigo-500`}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOUTON SOUMETTRE */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 shadow-xs mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Authentification en cours...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-300" />
                        <span>Ouvrir mon Espace {selectedUser ? ROLE_LABELS[selectedUser.role] : 'ECOLISA'}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* PIED DU FORMULAIRE */}
              <div className={`mt-6 pt-3 border-t flex items-center justify-between ${divider}`}>
                <span className={`font-mono text-[10.5px] ${textSec}`}>ECOLISA ERP v1.0 · RDC</span>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setSelectedUser(null); setErrorMsg(null); }}
                  className="text-[11px] font-black text-indigo-500 hover:underline cursor-pointer"
                >
                  ← Changer de profil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER GENERAL */}
      <div className="mt-4 flex items-center justify-between w-full max-w-5xl px-2">
        <span className="text-[11px] font-semibold text-slate-400">
          Système Scolaire Sécurisé · EPST RDC
        </span>
        <button
          type="button"
          onClick={onResetAndReconfigure}
          className="text-[11px] font-black text-amber-500 hover:text-amber-600 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Réinitialiser Configuration
        </button>
      </div>
    </div>
  );
};
