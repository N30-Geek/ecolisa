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
import { normalizeAccessCycle, canAccessMaternelleAndPrimaire, expandMaternellePrimaireScope } from '../../utils/permissions';

interface LoginScreenProps {
  onLoginSuccess: (user: UserSession) => void;
  onResetAndReconfigure: () => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
  lockedUser?: UserSession; // Utilisateur dont la session vient d'être verrouillée
}

const ROLE_LABELS: Record<RôleSystème, string> = {
  PROMOTEUR_ADMIN:      'Promoteur / Admin',
  PREFET_DIRECTEUR:     'Préfet des Études',
  DIRECTEUR_ECOLE:      'Directeur d’école (P/M)',
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
  DIRECTEUR_ECOLE:      'from-blue-600 to-sky-700 text-white',
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
type LoginCycle = 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE';

const LOGIN_CYCLES: { id: LoginCycle; label: string; description: string; icon: React.ElementType; color: string }[] = [
  { id: 'MATERNELLE', label: 'Maternelle', description: 'Personnel administratif et pédagogique du cycle maternel', icon: UserCheck, color: 'from-pink-500 to-rose-500' },
  { id: 'PRIMAIRE', label: 'Primaire', description: 'Direction, instituteurs, secrétariat et comptabilité du primaire', icon: GraduationCap, color: 'from-sky-500 to-blue-600' },
  { id: 'SECONDAIRE', label: 'Secondaire', description: 'CTEB, Humanités, options et administration secondaire', icon: Building2, color: 'from-indigo-500 to-violet-600' },
];

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

  // Mode "Verrouillage Rapide"
  const isLockScreen = !!lockedUser;

  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [selectedCycle, setSelectedCycle] = useState<LoginCycle | null>(null);
  const [searchQuery, setSearchQuery]       = useState('');

  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [identifier, setIdentifier]     = useState('');
  const [password, setPassword]         = useState('');
  const [pinCode, setPinCode]           = useState('');
  const [authMethod, setAuthMethod]     = useState<'PASSWORD' | 'PIN'>('PASSWORD');
  const [isAdminMode, setIsAdminMode]   = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPinCode, setShowPinCode]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm]         = useState(isLockScreen);

  const GENERIC_AUTH_ERROR = 'Identifiants incorrects. Vérifiez votre identifiant et votre mot de passe.';

  useEffect(() => {
    // Charger config école depuis SQLite (source de vérité)
    LocalDatabaseService.getConfig('school_config').then((cfg: any) => {
      if (cfg) setSchoolConfig(cfg);
    });

    // Charger les comptes utilisateurs réels
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
          setIdentifier(lockedUser.email || '');
        }
      }

      setLoadingProfiles(false);
    }).catch(() => setLoadingProfiles(false));
  }, [lockedUser]);

  const handleSelectStandardUser = useCallback((profile: UserAccount) => {
    setSelectedUser(profile);
    setIdentifier(profile.email || profile.usernameGenerated || profile.id);
    setPassword('');
    setPinCode('');
    setAuthMethod('PASSWORD');
    setIsAdminMode(false);
    setShowForm(true);
    setErrorMsg(null);
  }, []);

  const handleOpenAdminLogin = useCallback(() => {
    setSelectedUser(adminUser);
    setIdentifier(adminUser?.email || 'admin@ecolisa.cd');
    setPassword('');
    setPinCode('');
    setAuthMethod('PASSWORD');
    setIsAdminMode(true);
    setShowForm(true);
    setErrorMsg(null);
  }, [adminUser]);

  const handleOpenManualLogin = useCallback(() => {
    setSelectedUser(null);
    setIdentifier('');
    setPassword('');
    setPinCode('');
    setAuthMethod('PASSWORD');
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

    const credentialToVerify = authMethod === 'PIN' ? pinCode.trim() : password.trim();
    if (!credentialToVerify) {
      setErrorMsg(authMethod === 'PIN' ? 'Veuillez saisir votre code PIN.' : 'Veuillez saisir votre mot de passe.');
      return;
    }

    setIsSubmitting(true);
    await new Promise(res => setTimeout(res, 200));

    try {
      // Authentifier avec le mot de passe (ou code PIN de secours)
      const existingUser = await LocalDatabaseService.verifyCredentials(
        targetIdentifier,
        credentialToVerify
      );

      if (!existingUser) {
        setIsSubmitting(false);
        setErrorMsg(GENERIC_AUTH_ERROR);
        return;
      }

      if (isAdminMode && existingUser.role !== 'PROMOTEUR_ADMIN') {
        setIsSubmitting(false);
        setErrorMsg('Ce formulaire est réservé au Promoteur/Admin général.');
        return;
      }
      const authenticatedProfile = selectedUser || standardProfiles.find(profile => profile.id === existingUser.id || profile.email?.toLowerCase() === existingUser.email?.toLowerCase()) || existingUser;
      if (existingUser.role !== 'PROMOTEUR_ADMIN' && !isLockScreen) {
        if (!selectedCycle) {
          setIsSubmitting(false);
          setErrorMsg('Sélectionnez d’abord votre cycle d’affectation.');
          return;
        }
        let cycles: string[] = (authenticatedProfile.cyclesAssignes || []).map(normalizeAccessCycle).filter(Boolean);
        if (canAccessMaternelleAndPrimaire(existingUser.role)) {
          cycles = expandMaternellePrimaireScope(cycles);
        }
        if (cycles.length > 0 && !cycles.includes(selectedCycle)) {
          setIsSubmitting(false);
          setErrorMsg('Ce compte n’est pas affecté au cycle sélectionné. Contactez le Promoteur/Admin.');
          return;
        }
      }

      // Consigner la connexion dans le journal d'audit
      await LocalDatabaseService.logAction('CONNEXION', 'SYSTEME', 'UserAccount', existingUser.id, {
        email: existingUser.email,
        role: existingUser.role,
        authMethod,
        timestamp: new Date().toISOString(),
      });

      // Préparer la session utilisateur avec le cycle de travail sélectionné
      const userSession: UserSession = {
        id:      existingUser.id,
        email:   existingUser.email,
        nom:     `${existingUser.prenom || ''} ${existingUser.nom}`.trim(),
        role:    existingUser.role,
        token:   `token_${crypto.randomUUID()}`,
        pinCode: existingUser.pinCode || undefined,
        telephone: existingUser.telephone,
        cycle:   isLockScreen ? (lockedUser?.cycle || undefined) : (existingUser.role === 'PROMOTEUR_ADMIN' ? undefined : selectedCycle || undefined),
        cyclesAssignes: authenticatedProfile.cyclesAssignes,
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
      if (!selectedCycle) return false;
      let cycles: string[] = (profile.cyclesAssignes || []).map(normalizeAccessCycle).filter(Boolean);
      if (canAccessMaternelleAndPrimaire(profile.role)) {
        cycles = expandMaternellePrimaireScope(cycles);
      }
      if (cycles.length > 0 && !cycles.includes(selectedCycle)) return false;

      // Filtre catégorie
      if (activeCategory === 'DIRECTION') {
        if (!['PREFET_DIRECTEUR', 'DIRECTEUR_ECOLE', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE', 'CENSEUR', 'SECRETAIRE'].includes(profile.role)) return false;
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
  }, [standardProfiles, selectedCycle, activeCategory, searchQuery]);

  // Styles adaptatifs
  const bg        = isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardBg    = isDarkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200';
  const panelBg   = isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-100/80 border-slate-200';
  const innerBg   = isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200';
  const inputBg   = isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900';
  const textPri   = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSec   = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const textMut   = isDarkMode ? 'text-slate-500' : 'text-slate-400';
  const divider   = isDarkMode ? 'border-slate-800' : 'border-slate-200';
  const badgePill = isDarkMode ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200';
  const badgeBox  = isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200';
  const errorBox  = isDarkMode ? 'bg-rose-500/08 border-rose-500/25 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700';
  const itemHover = isDarkMode ? 'hover:bg-slate-800/80 border-slate-800/80 hover:border-indigo-500/40' : 'hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300';
  const inputBase = isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-3 sm:p-6 select-none font-sans relative overflow-hidden transition-colors duration-200 ${bg}`}>

      {/* BOUTON THÈME */}
      {toggleTheme && (
        <button
          type="button"
          onClick={toggleTheme}
          className="fixed top-4 right-4 z-50 p-2 rounded-xl border bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 backdrop-blur-sm transition-all cursor-pointer"
          style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      )}

      {/* FOND DÉCORATIF SUBTIL */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-violet-500/15 blur-3xl" />
      </div>

      {/* CONTENEUR PRINCIPAL */}
      <div
        className={`w-full max-w-4xl rounded-2xl border overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10 transition-all ${cardBg}`}
        style={{ boxShadow: '0 20px 50px -12px rgba(0,0,0,0.12), 0 8px 20px -8px rgba(0,0,0,0.06)' }}
      >
        
        {/* COLONNE GAUCHE (5 COLS) : BRANDING & ÉTABLISSEMENT */}
        <div
          className="lg:col-span-5 p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r"
          style={{ background: 'linear-gradient(145deg, #1e1b4b 0%, #312e81 60%, #1e293b 100%)', borderColor: 'rgba(99,102,241,0.25)' }}
        >
          <div className="space-y-6 relative z-10">
            {/* LOGO ÉCOLE / ÉCOLISA */}
            <div className="flex items-center gap-3.5">
              {schoolConfig?.logoUrl ? (
                <img
                  src={schoolConfig.logoUrl}
                  alt="Logo"
                  className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-sm bg-white/10"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl border border-white/20 flex items-center justify-center shadow-sm" style={{ background: 'rgba(99,102,241,0.85)' }}>
                  <School className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-base font-semibold tracking-tight leading-tight line-clamp-1">
                  {schoolConfig?.schoolName || 'ÉCOLISA ENTERPRISE'}
                </h1>
                <p className="text-[10px] text-indigo-200 tracking-wide uppercase">
                  {schoolConfig?.province ? `${schoolConfig.province} · RDC` : 'Système de Gestion Scolaire EPST'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium border" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Authentification sécurisée par mot de passe</span>
              </span>
              <p className="text-xs text-indigo-200/90 leading-relaxed font-normal">
                Accédez à votre espace pédagogique, administratif ou financier avec vos identifiants protégés.
              </p>
            </div>
          </div>

          <div className="pt-6 relative z-10">
            <div className="p-3.5 rounded-xl border backdrop-blur-sm space-y-1" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}>
              <p className="text-[10px] text-indigo-200 uppercase tracking-wide font-medium">Sécurité des données</p>
              <p className="text-[11px] text-slate-300 font-normal leading-relaxed">
                Mots de passe hachés, contrôle d'accès strict par rôle et traçabilité complète.
              </p>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE (7 COLS) : FORMULAIRE OU GRILLE */}
        <div className="lg:col-span-7 flex flex-col justify-between min-h-[460px]">
          
          {/* VUE 1 : GRILLE DES PROFILS & ACCÈS */}
          {!showForm && (
            <div className="p-6 sm:p-8 flex flex-col justify-between flex-1 space-y-5 animate-fade-in">
              <div className="space-y-4">
                {!selectedCycle ? (
                  <>
                    <div>
                      <h2 className={`text-lg font-black tracking-tight ${textPri}`}>Choisir votre cycle</h2>
                      <p className={`text-xs ${textSec}`}>Cette étape détermine les comptes et le périmètre de travail disponibles.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {LOGIN_CYCLES.map(cycle => {
                        const CycleIcon = cycle.icon;
                        const count = standardProfiles.filter(profile => {
                          const assigned = (profile.cyclesAssignes || []).map(normalizeAccessCycle).filter(Boolean);
                          return assigned.length === 0 || assigned.includes(cycle.id);
                        }).length;
                        return (
                          <button
                            key={cycle.id}
                            type="button"
                            onClick={() => { setSelectedCycle(cycle.id); setActiveCategory('ALL'); setSearchQuery(''); }}
                            className={`group p-3.5 rounded-xl border text-left transition-all hover:-translate-y-0.5 active:scale-[0.98] ${innerBg}`}
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                          >
                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cycle.color} text-white flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform`}><CycleIcon className="w-[18px] h-[18px]" /></div>
                            <p className={`text-sm font-semibold ${textPri}`}>{cycle.label}</p>
                            <p className={`text-[10px] mt-1 min-h-6 ${textMut}`}>{cycle.description}</p>
                            <div className="flex items-center justify-between mt-2.5"><span className="text-[10px] font-medium text-indigo-500">{count} compte{count > 1 ? 's' : ''}</span><ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" /></div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                <div className="flex items-center justify-between">
                  <div>
                    <button type="button" onClick={() => { setSelectedCycle(null); setActiveCategory('ALL'); setSearchQuery(''); }} className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 mb-1"><ArrowLeft className="w-3.5 h-3.5" /> Changer de cycle</button>
                    <h2 className={`text-lg font-black tracking-tight ${textPri}`}>Comptes · {LOGIN_CYCLES.find(cycle => cycle.id === selectedCycle)?.label}</h2>
                    <p className={`text-xs ${textSec}`}>Choisissez votre compte personnel pour vous authentifier.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenManualLogin}
                    className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Saisie d’identifiants</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
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
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer active:scale-[0.98] ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-500/8 border border-transparent'
                        }`}
                        style={isActive ? { boxShadow: '0 2px 6px rgba(99,102,241,0.25)' } : undefined}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        <span className="capitalize">{cat.label}</span>
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
                    placeholder="Rechercher un compte..."
                    className={`w-full pl-9 pr-3.5 py-2 rounded-lg border text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${inputBase}`}
                  />
                </div>

                {/* LISTE DES PROFILS */}
                {loadingProfiles ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2">
                    <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs text-slate-400">Chargement des comptes...</span>
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="p-6 text-center border rounded-xl space-y-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
                    <Users className="w-8 h-8 mx-auto text-slate-400" />
                    <p className={`text-xs font-medium ${textPri}`}>Aucun profil trouvé</p>
                    <p className="text-[11px] text-slate-400">
                      {searchQuery ? 'Essayez un autre mot-clé ou' : 'Connectez-vous via la saisie manuelle.'}
                    </p>
                    <button
                      onClick={handleOpenManualLogin}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[11px] cursor-pointer inline-block mt-2 transition-colors"
                    >
                      Saisie manuelle
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1 sidebar-scroll">
                    {filteredProfiles.map((profile) => {
                      const colorClass = ROLE_COLORS[profile.role] || 'from-slate-700 to-slate-800 text-white';
                      return (
                        <button
                          key={profile.id}
                          onClick={() => handleSelectStandardUser(profile)}
                          className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer text-left hover:-translate-y-0.5 ${itemHover}`}
                          style={{ background: 'var(--bg-surface)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                        >
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden border border-white/10`}>
                            {profile.avatarUrl ? (
                              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(profile)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[11px] font-medium truncate ${textPri}`}>
                              {profile.prenom ? `${profile.prenom} ` : ''}{profile.nom}
                            </p>
                            <p className="text-[10px] text-indigo-500 font-medium truncate">
                              {ROLE_LABELS[profile.role] || profile.role}
                            </p>
                            {(profile.cyclesAssignes || []).map(normalizeAccessCycle).filter(Boolean).length === 0 && (
                              <p className="text-[9px] text-amber-500 font-medium truncate">Cycle à configurer</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                  </>
                )}
              </div>

              {/* BOUTON ADMIN PROÉMINENT */}
              <div className={`pt-4 border-t space-y-2 ${divider}`}>
                <button
                  type="button"
                  onClick={handleOpenAdminLogin}
                  className="w-full py-2.5 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] text-violet-600 dark:text-violet-300"
                  style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.25)' }}
                >
                  <Crown className="w-4 h-4" />
                  <span className="capitalize">Accès administrateur général (Promoteur / Admin)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* VUE 2 : FORMULAIRE FOCUS D'AUTHENTIFICATION AVEC MOT DE PASSE */}
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
                        Votre session a été verrouillée. Saisissez votre mot de passe pour reprendre.
                      </p>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
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
                    <div className={`p-3 rounded-lg border text-xs font-medium flex items-start gap-2.5 animate-fade-in ${errorBox}`}>
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                  )}

                  {/* IDENTIFIANT */}
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
                        className={`w-full px-3.5 py-2.5 rounded-lg border font-medium text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${inputBase}`}
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

                  {/* MOT DE PASSE (MÉTHODE PRINCIPALE ET PAR DÉFAUT) */}
                  {authMethod === 'PASSWORD' ? (
                    <div className="space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <label className={`text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${textMut}`}>
                          <Lock className="w-3.5 h-3.5 text-indigo-500" />
                          Mot de Passe de Connexion *
                        </label>
                        <button
                          type="button"
                          onClick={() => setAuthMethod('PIN')}
                          className="text-[10px] font-black text-indigo-500 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Utiliser le code PIN</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Saisissez votre mot de passe..."
                          required
                          autoFocus
                          className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border font-medium text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all ${inputBase}`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label="Afficher ou masquer le mot de passe"
                          onClick={() => setShowPassword((v) => !v)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${textSec} hover:text-indigo-500`}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* CODE PIN RAPIDE (MÉTHODE ALTERNATIVE) */
                    <div className="space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold uppercase text-indigo-500 tracking-wide flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5" />
                          Code PIN Rapide (4 à 6 chiffres) *
                        </label>
                        <button
                          type="button"
                          onClick={() => setAuthMethod('PASSWORD')}
                          className="text-[10px] font-black text-indigo-500 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Utiliser le Mot de passe</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPinCode ? 'text' : 'password'}
                          maxLength={6}
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="Code PIN"
                          autoFocus
                          required
                          className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border font-mono font-medium text-center text-sm tracking-widest focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 ${inputBase}`}
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          aria-label="Afficher ou masquer le code PIN"
                          onClick={() => setShowPinCode((v) => !v)}
                          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors cursor-pointer ${textSec} hover:text-indigo-500`}
                        >
                          {showPinCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOUTON SOUMETTRE */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 active:scale-[0.98] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60 mt-2"
                    style={{ boxShadow: '0 4px 10px -2px rgba(99,102,241,0.35)' }}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Authentification en cours...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-300" />
                        <span className="capitalize">Ouvrir mon espace {selectedUser ? (ROLE_LABELS[selectedUser.role] || '').toLowerCase() : 'ECOLISA'}</span>
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

    </div>
  );
};
