import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Search, ShieldCheck, KeyRound, Lock, Eye, EyeOff,
  X, CheckCircle2, Crown, Sparkles, ArrowRight, UserCheck, Wallet, GraduationCap
} from 'lucide-react';
import { RôleSystème, UserAccount } from '../../types';
import { LocalDatabaseService, UserSession } from '../../services/localDatabase';
import { roleRequiresPin } from '../../utils/permissions';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserSession | null;
  onSwitchUser: (user: UserSession) => void;
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

type PoleCategory = 'ALL' | 'DIRECTION' | 'PEDAGOGIE' | 'FINANCES' | 'PARENTS';

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PoleCategory>('ALL');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedUser(null);
      setPinOrPassword('');
      setErrorMsg(null);
      return;
    }
    setLoading(true);
    LocalDatabaseService.getUsers()
      .then((res) => {
        setUsers(res || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen]);

  // Bloquer le défilement de fond
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.statut === 'SUSPENDU') return false;

      // Filtre catégorie
      if (activeCategory === 'DIRECTION') {
        if (!['PROMOTEUR_ADMIN', 'PREFET_DIRECTEUR', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE', 'CENSEUR', 'SECRETAIRE'].includes(u.role)) return false;
      } else if (activeCategory === 'PEDAGOGIE') {
        if (!['ENSEIGNANT', 'TITULAIRE', 'DIRECTEUR_ETUDES', 'CENSEUR'].includes(u.role)) return false;
      } else if (activeCategory === 'FINANCES') {
        if (!['COMPTABLE', 'INTENDANT', 'PROMOTEUR_ADMIN'].includes(u.role)) return false;
      } else if (activeCategory === 'PARENTS') {
        if (u.role !== 'PARENT_ELEVE') return false;
      }

      // Recherche textuelle
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const fullName = `${u.prenom || ''} ${u.nom || ''}`.toLowerCase();
        const roleLabel = (ROLE_LABELS[u.role] || u.role).toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.telephone || '').replace(/[^0-9]/g, '');
        return fullName.includes(q) || roleLabel.includes(q) || email.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [users, activeCategory, search]);

  if (!isOpen) return null;

  const handleSelectUserToSwitch = (user: UserAccount) => {
    if (user.id === currentUser?.id) {
      onClose();
      return;
    }
    setSelectedUser(user);
    setPinOrPassword('');
    setErrorMsg(null);
  };

  const handleSubmitSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setErrorMsg(null);

    setIsSubmitting(true);
    await new Promise((res) => setTimeout(res, 250));

    try {
      // Vérifier le mot de passe ou code PIN
      const verified = await LocalDatabaseService.verifyCredentials(
        selectedUser.email || selectedUser.id,
        pinOrPassword
      );

      if (!verified) {
        setIsSubmitting(false);
        setErrorMsg('Code PIN ou mot de passe incorrect.');
        return;
      }

      // Créer la nouvelle session
      const newSession: UserSession = {
        id:      verified.id,
        email:   verified.email,
        nom:     `${verified.prenom || ''} ${verified.nom}`.trim(),
        role:    verified.role,
        token:   `token_${Math.random().toString(36).substring(2)}`,
        pinCode: verified.pinCode || undefined,
      };

      // Consigner l'audit
      await LocalDatabaseService.logAction(
        'CONNEXION',
        'SYSTEME',
        'UserSession',
        verified.id,
        { action: 'Changement de compte rapide', role: verified.role }
      );

      setIsSubmitting(false);
      onSwitchUser(newSession);
      onClose();
    } catch {
      setIsSubmitting(false);
      setErrorMsg('Erreur lors du changement de compte.');
    }
  };

  const getInitials = (u: UserAccount) =>
    `${(u.prenom || '').charAt(0)}${u.nom.charAt(0)}`.toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div
        className="w-full max-w-2xl rounded-2xl border flex flex-col overflow-hidden animate-scale-in"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--elevation-3)',
        }}
      >
        {/* HEADER MODAL */}
        <div
          className="p-4 sm:p-5 border-b flex items-center justify-between"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  Bascule Rapide de Compte
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                  Multi-Utilisateurs
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Session active : <strong className="text-indigo-500">{currentUser?.nom || 'Non défini'}</strong> ({ROLE_LABELS[currentUser?.role as RôleSystème] || currentUser?.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border transition-all hover:bg-slate-500/10 cursor-pointer"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto sidebar-scroll">
          {/* Si aucun utilisateur sélectionné pour entrer le PIN -> Afficher la liste */}
          {!selectedUser ? (
            <>
              {/* FILTRES PAR PÔLE */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'ALL', label: 'Tous les comptes', icon: Users },
                  { id: 'DIRECTION', label: 'Direction & Admin', icon: Crown },
                  { id: 'PEDAGOGIE', label: 'Pédagogie & Profs', icon: GraduationCap },
                  { id: 'FINANCES', label: 'Finances & Caisse', icon: Wallet },
                  { id: 'PARENTS', label: 'Parents', icon: UserCheck },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeCategory === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveCategory(t.id as PoleCategory)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-500/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* RECHERCHE */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, rôle, e-mail ou téléphone..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  style={{
                    background: 'var(--bg-sunken)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  autoFocus
                />
              </div>

              {/* GRILLE DES COMPTES */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <span className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400">Chargement des profils...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Aucun compte trouvé pour ces critères de recherche.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredUsers.map((user) => {
                    const isCurrent = user.id === currentUser?.id;
                    const colorClass = ROLE_COLORS[user.role] || 'from-slate-700 to-slate-800 text-white';
                    const requiresPin = roleRequiresPin(user.role);

                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUserToSwitch(user)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                          isCurrent
                            ? 'border-indigo-500/40 bg-indigo-500/10'
                            : 'hover:border-indigo-500/50 hover:bg-slate-500/5'
                        }`}
                        style={{
                          background: isCurrent ? undefined : 'var(--bg-surface)',
                          borderColor: isCurrent ? undefined : 'var(--border)',
                        }}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center font-black text-sm shrink-0 shadow-xs group-hover:scale-105 transition-transform overflow-hidden`}
                        >
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{getInitials(user)}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-black text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                              {user.prenom ? `${user.prenom} ` : ''}{user.nom}
                            </p>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-black bg-indigo-600 text-white shrink-0">
                                Actif
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
                            {ROLE_LABELS[user.role] || user.role}
                          </p>

                          <div className="flex items-center gap-1.5 text-[9.5px] text-slate-400 mt-0.5">
                            {requiresPin ? (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <KeyRound className="w-3 h-3" /> PIN requis
                              </span>
                            ) : (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                <Lock className="w-3 h-3" /> Mot de passe
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* FORMULAIRE DE VALIDATION PIN / MOT DE PASSE DU COMPTE CHOISI */
            <form onSubmit={handleSubmitSwitch} className="space-y-4 animate-fade-in">
              <div
                className="p-4 rounded-xl border flex items-center gap-4"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${
                    ROLE_COLORS[selectedUser.role] || 'from-slate-700 to-slate-800 text-white'
                  } flex items-center justify-center font-black text-lg shadow-xs overflow-hidden`}
                >
                  {selectedUser.avatarUrl ? (
                    <img src={selectedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{getInitials(selectedUser)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                    {ROLE_LABELS[selectedUser.role] || selectedUser.role}
                  </span>
                  <h4 className="font-black text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
                    {selectedUser.prenom ? `${selectedUser.prenom} ` : ''}{selectedUser.nom}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedUser.email || selectedUser.telephone || 'Compte interne'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs font-black text-indigo-500 hover:underline cursor-pointer"
                >
                  Changer
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-fade-in">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5 text-indigo-500">
                  <KeyRound className="w-3.5 h-3.5" />
                  {roleRequiresPin(selectedUser.role) ? 'Code PIN de Sécurité (4 chiffres) *' : 'Mot de Passe ou Code PIN *'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={pinOrPassword}
                    onChange={(e) => setPinOrPassword(e.target.value)}
                    placeholder={roleRequiresPin(selectedUser.role) ? '••••' : '••••••••••••'}
                    required
                    autoFocus
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    style={{
                      background: 'var(--bg-sunken)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10.5px] text-slate-400">
                  Code PIN par défaut : <span className="font-mono font-bold text-indigo-500">1234</span> ou mot de passe créé.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-black transition-all hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-amber-300" />
                      <span>Basculer sur cette Session</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
