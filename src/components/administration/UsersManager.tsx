import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Plus, Pencil, Trash2, Search, ShieldCheck, ShieldOff,
  Eye, EyeOff, Loader2, KeyRound, UserCog, Lock, Unlock, X, Save, MessageSquare, 
  Mail, Share2, Sparkles, UserPlus, CheckCircle2, AlertCircle, Phone, Smartphone,
  GraduationCap, Briefcase, Building, Check
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { PhoneInput } from '../common/PhoneInput';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { UserAccount, RôleSystème, MembrePersonnel } from '../../types';

const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const SYSTEM_ROLES: { value: RôleSystème; label: string; desc: string; badgeCls: string; icon: React.ElementType }[] = [
  { value: 'PROMOTEUR_ADMIN',      label: 'Promoteur / Admin Général', desc: 'Accès total absolu & configuration système', badgeCls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30', icon: ShieldCheck },
  { value: 'PREFET_DIRECTEUR',     label: 'Préfet / Directeur',       desc: 'Supervision pédagogique, délibérations, élèves', badgeCls: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30', icon: Building },
  { value: 'DIRECTEUR_ETUDES',     label: 'Directeur des Études (DE)', desc: 'Programmes, horaires, matières & cotes', badgeCls: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30', icon: GraduationCap },
  { value: 'DIRECTEUR_DISCIPLINE', label: 'Directeur Discipline (DD)', desc: 'Présences, sanctions & discipline', badgeCls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30', icon: AlertCircle },
  { value: 'COMPTABLE',            label: 'Comptable Intendant',      desc: 'Caisse, frais scolaires, factures & paie', badgeCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', icon: Briefcase },
  { value: 'SECRETAIRE',           label: 'Secrétariat & Accueil',    desc: 'Inscriptions élèves, dossiers & documents', badgeCls: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30', icon: Users },
  { value: 'INTENDANT',            label: 'Intendant Financier',      desc: 'Logistique, matériel & perception caisse', badgeCls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30', icon: Briefcase },
  { value: 'CENSEUR',              label: 'Censeur des Études',       desc: 'Suivi des cours & présences enseignants', badgeCls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30', icon: GraduationCap },
  { value: 'TITULAIRE',            label: 'Enseignant Titulaire',     desc: 'Saisie des cotes & gestion de sa classe', badgeCls: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30', icon: GraduationCap },
  { value: 'ENSEIGNANT',           label: 'Professeur / Enseignant',  desc: 'Saisie des cotes & suivi pédagogique', badgeCls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30', icon: GraduationCap },
  { value: 'PARENT_ELEVE',         label: 'Portail Parent & Élève',   desc: 'Consultation des bulletins & reçus de frais', badgeCls: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30', icon: Users },
];

export const getRoleInfo = (role: string) => SYSTEM_ROLES.find(r => r.value === role) || {
  value: role as RôleSystème,
  label: role,
  desc: 'Utilisateur système',
  badgeCls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30',
  icon: UserCog,
};

type AccountStatut = 'ACTIF' | 'INACTIF' | 'SUSPENDU';

const STATUS_STYLES: Record<AccountStatut, { dot: string; text: string; badgeCls: string; label: string }> = {
  ACTIF:    { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badgeCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30', label: 'Actif' },
  INACTIF:  { dot: 'bg-slate-400',   text: 'text-slate-500 dark:text-slate-400',     badgeCls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30',     label: 'Inactif' },
  SUSPENDU: { dot: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     badgeCls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',   label: 'Suspendu' },
};

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [staffList, setStaffList] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<UserAccount | null | 'new'>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [u, staff] = await Promise.all([
      LocalDatabaseService.getUsers(),
      LocalDatabaseService.getStaff().catch(() => []),
    ]);
    setUsers(u);
    setStaffList(staff);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const togglePinReveal = (id: string) => {
    setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        `${u.nom} ${u.prenom} ${u.email} ${u.telephone || ''}`.toLowerCase().includes(q);
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchStatus = statusFilter === 'ALL' || (u.statut || 'ACTIF') === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Statistiques globales
  const stats = useMemo(() => {
    const total = users.length;
    const actifs = users.filter(u => (u.statut || 'ACTIF') === 'ACTIF').length;
    const suspendus = users.filter(u => u.statut === 'SUSPENDU').length;
    const adminDir = users.filter(u => ['PROMOTEUR_ADMIN', 'PREFET_DIRECTEUR', 'DIRECTEUR_ETUDES', 'DIRECTEUR_DISCIPLINE'].includes(u.role)).length;
    const enseignants = users.filter(u => ['ENSEIGNANT', 'TITULAIRE', 'CENSEUR'].includes(u.role)).length;
    const finance = users.filter(u => ['COMPTABLE', 'INTENDANT', 'SECRETAIRE'].includes(u.role)).length;
    return { total, actifs, suspendus, adminDir, enseignants, finance };
  }, [users]);

  const handleSave = async (u: UserAccount & { password?: string }) => {
    if (u.id && users.some(existing => existing.id === u.id)) {
      await LocalDatabaseService.updateUser(u.id, u);
      LocalDatabaseService.logAction('MODIFICATION', 'USERS', 'UserAccount', u.id, { email: u.email, role: u.role });
    } else {
      const nu = { ...u, id: u.id || uuid() };
      await LocalDatabaseService.addUser(nu);
      LocalDatabaseService.logAction('CREATION', 'USERS', 'UserAccount', nu.id, { email: nu.email, role: nu.role });
    }
    setEditing(null);
    load();
  };

  const handleToggleStatus = async (user: UserAccount) => {
    const newStatut: AccountStatut = user.statut === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
    await LocalDatabaseService.updateUser(user.id, { statut: newStatut });
    LocalDatabaseService.logAction('MODIFICATION', 'USERS', 'UserAccount', user.id, { action: `Statut → ${newStatut}` });
    load();
  };

  const handleDelete = async (id: string) => {
    await LocalDatabaseService.deleteUser(id);
    LocalDatabaseService.logAction('SUPPRESSION', 'USERS', 'UserAccount', id);
    setDeleteId(null);
    load();
  };

  const roleOptions: SelectOption[] = [
    { value: 'ALL', label: 'Tous les rôles système' },
    ...SYSTEM_ROLES.map(r => ({ value: r.value, label: r.label }))
  ];

  const statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'ACTIF', label: 'Comptes Actifs' },
    { value: 'SUSPENDU', label: 'Comptes Suspendus' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* ── KPI METRICS BANNER ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Total Comptes</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.total}</p>
            <p className="text-[10px] font-bold text-emerald-500">{stats.actifs} actif(s)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Direction & Admin</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.adminDir}</p>
            <p className="text-[10px] font-semibold text-slate-400">Accès décisionnels</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Enseignants</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.enseignants}</p>
            <p className="text-[10px] font-semibold text-slate-400">Saisie des cotes</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">Comptabilité & Caisse</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{stats.finance}</p>
            <p className="text-[10px] font-semibold text-slate-400">Trésorerie & Frais</p>
          </div>
        </div>
      </div>

      {/* ── HEADER ET BOUTON CRÉATION ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/25">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Gestion des Comptes Utilisateurs & Accès Système
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Contrôle strict des identifiants, codes PIN, rôles et habilitations d'accès au logiciel
            </p>
          </div>
        </div>

        <button 
          onClick={() => setEditing('new')} 
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" /> 
          <span>Nouveau Compte</span>
        </button>
      </div>

      {/* ── BARRE DE RECHERCHE & FILTRES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
            placeholder="Rechercher par nom, prénom, email, téléphone..." 
          />
        </div>
        <div className="sm:col-span-4">
          <CustomSelect options={roleOptions} value={roleFilter} onChange={setRoleFilter} />
        </div>
        <div className="sm:col-span-2">
          <CustomSelect options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      {/* ── TABLEAU DES UTILISATEURS ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Utilisateur & Identifiant</th>
                <th className="px-4 py-3.5">Rôle Système</th>
                <th className="px-4 py-3.5">Téléphone</th>
                <th className="px-4 py-3.5">Code PIN</th>
                <th className="px-4 py-3.5">Statut</th>
                <th className="px-4 py-3.5">Dernière Connexion</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400">Chargement des comptes utilisateurs...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3">
                      <UserCog className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">Aucun compte utilisateur trouvé</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {search || roleFilter !== 'ALL' || statusFilter !== 'ALL' 
                        ? 'Modifiez vos filtres de recherche pour afficher les résultats correspondants.'
                        : 'Créez un nouveau compte d\'accès ou associez un membre du personnel existant.'}
                    </p>
                    {(!search && roleFilter === 'ALL') && (
                      <button
                        onClick={() => setEditing('new')}
                        className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-4 h-4" /> Créer un premier compte
                      </button>
                    )}
                  </td>
                </tr>
              ) : filtered.map((user, i) => {
                const role = getRoleInfo(user.role);
                const RoleIcon = role.icon;
                const statut = STATUS_STYLES[(user.statut as AccountStatut) || 'ACTIF'] || STATUS_STYLES.ACTIF;
                const isPinVisible = !!revealedPins[user.id];

                // Vérifier si lié au personnel
                const linkedStaff = staffList.find(s => 
                  s.id === user.id || 
                  `usr_${s.id}` === user.id ||
                  (s.email && user.email && s.email.toLowerCase().trim() === user.email.toLowerCase().trim())
                );

                const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'U';

                return (
                  <tr 
                    key={user.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Colonne Utilisateur */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.nom} 
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0" 
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-xs">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
                              {user.nom} {user.prenom}
                            </p>
                            {linkedStaff && (
                              <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-black border border-indigo-500/20">
                                {linkedStaff.matricule || 'RH'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Colonne Rôle */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${role.badgeCls}`}>
                        <RoleIcon className="w-3 h-3" />
                        <span>{role.label}</span>
                      </span>
                    </td>

                    {/* Colonne Téléphone */}
                    <td className="px-4 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                      {user.telephone ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {user.telephone}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Colonne Mot de passe & PIN */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                          <Lock className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{(user as any).password || (user as any).generatedPassword ? '••••••••' : 'Protégé'}</span>
                        </div>
                        {user.pinCode && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px]">
                            <KeyRound className="w-2.5 h-2.5 text-amber-500" />
                            <span className="font-mono font-bold tracking-widest text-slate-600 dark:text-slate-300">
                              {isPinVisible ? user.pinCode : '••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePinReveal(user.id)}
                              className="text-slate-400 hover:text-indigo-500 p-0.5 transition-colors cursor-pointer"
                              title={isPinVisible ? "Masquer le PIN" : "Afficher le PIN"}
                            >
                              {isPinVisible ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Colonne Statut */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${statut.badgeCls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />
                        <span>{statut.label}</span>
                      </span>
                    </td>

                    {/* Colonne Connexion */}
                    <td className="px-4 py-3.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {user.derniereConnexion ? (
                        new Date(user.derniereConnexion).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      ) : (
                        <span className="text-slate-400 italic">Jamais</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Envoi WhatsApp */}
                        <button
                          onClick={() => {
                            const pwd = (user as any).password || (user as any).generatedPassword || (user as any).motDePasse || '';
                            const msg = `Bonjour ${user.prenom || ''} ${user.nom},\n\nVos accès officiels ECOLISA :\n• E-mail : ${user.email}\n• Mot de passe : ${pwd || '[Mot de passe configuré]'}\n• Code PIN : ${user.pinCode || 'Non configuré'}\n• Rôle : ${role.label}\n\nVeuillez conserver ces informations en lieu sûr.`;
                            const rawPhone = (user.telephone || '').replace(/[^0-9]/g, '');
                            const phone = rawPhone.startsWith('243') ? rawPhone : (rawPhone ? `243${rawPhone.replace(/^0/, '')}` : '');
                            const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                            window.open(url, '_blank');
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer"
                          title="Partager les identifiants via WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Modifier */}
                        <button 
                          onClick={() => setEditing(user)} 
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 transition-all cursor-pointer" 
                          title="Modifier le compte"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspendre / Réactiver */}
                        <button 
                          onClick={() => handleToggleStatus(user)} 
                          className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                            user.statut === 'ACTIF' 
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`} 
                          title={user.statut === 'ACTIF' ? 'Suspendre l\'accès' : 'Réactiver l\'accès'}
                        >
                          {user.statut === 'ACTIF' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        {/* Supprimer */}
                        <button 
                          onClick={() => setDeleteId(user.id)} 
                          className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all cursor-pointer" 
                          title="Supprimer définitivement ce compte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL FORMULAIRE UTILISATEUR (CRÉATION / MODIF) ── */}
      {editing && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          existingUsers={users}
          staffList={staffList}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {/* ── MODAL CONFIRMATION SUPPRESSION ── */}
      {deleteId && (
        <ConfirmDeleteModal
          userName={users.find(u => u.id === deleteId)?.nom ? `${users.find(u => u.id === deleteId)?.prenom} ${users.find(u => u.id === deleteId)?.nom}` : (users.find(u => u.id === deleteId)?.email || deleteId)}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </div>
  );
};

// ─── Modal Formulaire Utilisateur ─────────────────────────────────────────────
interface UserFormModalProps {
  user: UserAccount | null;
  initialStaff?: MembrePersonnel | null;
  existingUsers: UserAccount[];
  staffList: MembrePersonnel[];
  onClose: () => void;
  onSave: (u: UserAccount & { password?: string }) => void;
}

export const UserFormModal: React.FC<UserFormModalProps> = ({
  user,
  initialStaff,
  existingUsers,
  staffList,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'STAFF' | 'CUSTOM'>(user ? 'CUSTOM' : 'STAFF');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaff?.id || '');

  const [form, setForm] = useState<UserAccount & { password?: string }>({
    id: user?.id || (initialStaff ? `usr_${initialStaff.id}` : ''),
    email: user?.email || initialStaff?.email || '',
    nom: user?.nom || initialStaff?.nom || '',
    prenom: user?.prenom || initialStaff?.prenom || '',
    role: user?.role || (initialStaff?.role as RôleSystème) || 'ENSEIGNANT',
    pinCode: user?.pinCode || '',
    statut: user?.statut || 'ACTIF',
    telephone: user?.telephone || initialStaff?.telephone || '',
    creeLe: user?.creeLe || new Date().toISOString(),
    password: '',
  });

  const [showPwd, setShowPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!user && initialStaff) {
      handleSelectStaff(initialStaff.id);
    }
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const roleOptions: SelectOption[] = SYSTEM_ROLES.map(r => ({ value: r.value, label: r.label }));
  const statutOptions: SelectOption[] = [
    { value: 'ACTIF', label: 'Compte Actif' },
    { value: 'SUSPENDU', label: 'Compte Suspendu' },
    { value: 'INACTIF', label: 'Compte Inactif' },
  ];

  // Filtrer les employés du personnel qui n'ont pas encore de compte utilisateur
  const availableStaff = useMemo(() => {
    return staffList.filter(s => {
      const alreadyHasUser = existingUsers.some(u => 
        u.id === s.id || 
        u.id === `usr_${s.id}` ||
        (s.email && u.email && s.email.toLowerCase().trim() === u.email.toLowerCase().trim())
      );
      return !alreadyHasUser;
    });
  }, [staffList, existingUsers]);

  const staffDropdownOptions: SelectOption[] = [
    { value: '', label: '-- Sélectionner un membre du personnel --' },
    ...availableStaff.map(s => ({
      value: s.id,
      label: `${s.nom} ${s.prenom || ''} (${s.titreOfficiel || s.role || 'Personnel RH'}) - ${s.matricule || 'Sans matricule'}`
    }))
  ];

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (!staffId) return;
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      const cleanNom = (staff.nom || 'User').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanPrenom = (staff.prenom || 'Staff').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const autoEmail = staff.email || `${cleanPrenom}.${cleanNom}@ecolisa.cd`;
      const autoPassword = `Eco#${Math.floor(1000 + Math.random() * 9000)}!`;
      const autoPin = generatePin();

      setForm(prev => ({
        ...prev,
        id: `usr_${staff.id}`,
        nom: staff.nom || prev.nom,
        prenom: staff.prenom || prev.prenom,
        email: autoEmail,
        telephone: staff.telephone || prev.telephone,
        role: (staff.role as RôleSystème) || prev.role,
        password: autoPassword,
        pinCode: autoPin,
      }));
    }
  };

  const handleGenerateRandomPin = () => {
    setForm(prev => ({ ...prev, pinCode: generatePin() }));
  };

  const handleGenerateRandomPassword = () => {
    setForm(prev => ({ ...prev, password: `Eco#${Math.floor(1000 + Math.random() * 9000)}!` }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!form.nom.trim()) {
      setErrorMsg('Le nom de famille est obligatoire.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setErrorMsg('Une adresse e-mail valide est obligatoire.');
      return;
    }
    if (!user && (!form.password || form.password.length < 6)) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }
    if (form.pinCode && form.pinCode.length < 4) {
      setErrorMsg('Le code PIN de sécurité doit comporter entre 4 et 6 chiffres.');
      return;
    }

    onSave(form);
  };

  const selectedRoleDesc = SYSTEM_ROLES.find(r => r.value === form.role)?.desc || '';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER MODAL */}
        <div className="px-6 py-4.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                {user ? 'Modifier le Compte Utilisateur' : 'Créer un Compte d\'Accès Utilisateur'}
              </h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {user ? `Identifiant : ${user.email}` : 'Attribution d\'identifiants sécurisés (E-mail, Mot de passe & PIN)'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENU DU FORMULAIRE */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto flex-1">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ONGLET DE SÉLECTION POUR NOUVEAU COMPTE */}
          {!user && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActiveTab('STAFF')}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'STAFF' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Membre du Personnel RH</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('CUSTOM')}
                  className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'CUSTOM' 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Compte Libre / Externe</span>
                </button>
              </div>

              {activeTab === 'STAFF' && (
                <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 space-y-2">
                  <label className="block text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Sélectionner l'agent sans compte d'accès ({availableStaff.length} disponible(s))
                  </label>
                  <CustomSelect
                    options={staffDropdownOptions}
                    value={selectedStaffId}
                    onChange={handleSelectStaff}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    Le nom, prénom, numéro de téléphone et rôle seront pré-remplis instantanément.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CHAMPS D'IDENTITÉ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Nom de Famille *
              </label>
              <input 
                value={form.nom} 
                onChange={e => setForm({ ...form, nom: e.target.value })} 
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                placeholder="Ex: KABAMBA" 
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Prénom *
              </label>
              <input 
                value={form.prenom || ''} 
                onChange={e => setForm({ ...form, prenom: e.target.value })} 
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
                placeholder="Ex: Jean-Baptiste" 
                required
              />
            </div>
          </div>

          {/* IDENTIFIANT / EMAIL */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Identifiant / E-mail de Connexion *
            </label>
            <input 
              type="text" 
              value={form.email} 
              onChange={e => setForm({ ...form, email: e.target.value })} 
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" 
              placeholder="jean.kabamba@ecolisa.cd" 
              required
            />
          </div>

          {/* RÔLE SYSTÈME */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Rôle Système & Permissions *
              </label>
              <span className="text-[10.5px] font-semibold text-slate-400">
                {selectedRoleDesc}
              </span>
            </div>
            <CustomSelect 
              options={roleOptions} 
              value={form.role} 
              onChange={val => setForm({ ...form, role: val as RôleSystème })} 
            />
          </div>

          {/* TÉLÉPHONE & CODE PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Téléphone (WhatsApp Accès)
              </label>
              <PhoneInput 
                value={form.telephone || ''} 
                onChange={val => setForm({ ...form, telephone: val })} 
                className="w-full" 
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Code PIN (4 à 6 chiffres)
                </label>
                <button 
                  type="button" 
                  onClick={handleGenerateRandomPin} 
                  className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Générer PIN
                </button>
              </div>
              <input 
                value={form.pinCode || ''} 
                onChange={e => setForm({ ...form, pinCode: e.target.value.replace(/[^0-9]/g, '').slice(0, 6) })} 
                maxLength={6} 
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-black text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 tracking-widest" 
                placeholder="000000" 
              />
            </div>
          </div>

          {/* MOT DE PASSE */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mot de Passe {user ? '(Laisser vide pour ne pas modifier)' : '*'}
              </label>
              <button 
                type="button" 
                onClick={handleGenerateRandomPassword} 
                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Générer Mot de Passe
              </button>
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                placeholder={user ? "Nouveau mot de passe (optionnel)" : "Minimum 6 caractères (ex: Eco#2026!)"}
              />
              <button 
                type="button" 
                onClick={() => setShowPwd(!showPwd)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* STATUT */}
          {user && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Statut d'Accès
              </label>
              <CustomSelect 
                options={statutOptions} 
                value={form.statut as string} 
                onChange={val => setForm({ ...form, statut: val as AccountStatut })} 
              />
            </div>
          )}

          {/* BOUTON D'ENREGISTREMENT */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl py-3 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/25"
            >
              <Save className="w-4 h-4" /> 
              <span>{user ? 'Mettre à jour le compte' : 'Créer et Enregistrer le compte'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

// ─── Modal confirmation suppression ──────────────────────────────────────────
const ConfirmDeleteModal: React.FC<{ userName: string; onCancel: () => void; onConfirm: () => void }> = ({ userName, onCancel, onConfirm }) => (
  createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-slate-900 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Supprimer ce compte ?</h3>
            <p className="text-xs text-slate-400">Action irréversible</p>
          </div>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
          Le compte d'accès de <strong>{userName}</strong> sera définitivement supprimé. L'utilisateur ne pourra plus se connecter.
        </p>
        <div className="flex gap-2.5">
          <button 
            onClick={onCancel} 
            className="flex-1 rounded-xl py-2.5 text-xs font-black border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 rounded-xl py-2.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all cursor-pointer"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
);

export default UsersManager;
