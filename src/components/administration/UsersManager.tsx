import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Plus, Pencil, Trash2, Search, ShieldCheck, ShieldOff,
  Eye, EyeOff, Loader2, KeyRound, UserCog, Lock, Unlock, X, Save, MessageSquare, Mail, Share2, Sparkles,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { PhoneInput } from '../common/PhoneInput';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { UserAccount, RôleSystème } from '../../types';

const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const ROLES: { value: RôleSystème; label: string; color: string }[] = [
  { value: 'PROMOTEUR_ADMIN',      label: 'Promoteur / Admin',       color: 'text-rose-600 bg-rose-500/10' },
  { value: 'PREFET_DIRECTEUR',     label: 'Préfet / Directeur',      color: 'text-indigo-600 bg-indigo-500/10' },
  { value: 'DIRECTEUR_ETUDES',     label: 'Directeur des Études',    color: 'text-violet-600 bg-violet-500/10' },
  { value: 'DIRECTEUR_DISCIPLINE',   label: 'Dir. Discipline',       color: 'text-orange-600 bg-orange-500/10' },
  { value: 'COMPTABLE',            label: 'Comptable Intendant',     color: 'text-emerald-600 bg-emerald-500/10' },
  { value: 'SECRETAIRE',           label: 'Secrétariat',             color: 'text-pink-600 bg-pink-500/10' },
  { value: 'INTENDANT',            label: 'Intendant Financier',     color: 'text-amber-600 bg-amber-500/10' },
  { value: 'CENSEUR',              label: 'Censeur des Études',      color: 'text-slate-600 bg-slate-500/10' },
  { value: 'TITULAIRE',            label: 'Enseignant Titulaire',    color: 'text-cyan-600 bg-cyan-500/10' },
  { value: 'ENSEIGNANT',           label: 'Professeur / Enseignant', color: 'text-sky-600 bg-sky-500/10' },
  { value: 'PARENT_ELEVE',         label: 'Parent & Élève',          color: 'text-purple-600 bg-purple-500/10' },
];

const roleInfo = (role: string) => ROLES.find(r => r.value === role);

type AccountStatut = 'ACTIF' | 'INACTIF' | 'SUSPENDU';

const STATUS_STYLES: Record<AccountStatut, { dot: string; text: string; label: string }> = {
  ACTIF:    { dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'Actif' },
  INACTIF:  { dot: 'bg-slate-400',   text: 'text-slate-500',   label: 'Inactif' },
  SUSPENDU: { dot: 'bg-amber-500',   text: 'text-amber-600',   label: 'Suspendu' },
};

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [editing, setEditing] = useState<UserAccount | null | 'new'>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const u = await LocalDatabaseService.getUsers();
    setUsers(u);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase();
      const matchSearch = !q || `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(q);
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleSave = async (u: UserAccount & { password?: string }) => {
    if (u.id) {
      await LocalDatabaseService.updateUser(u.id, u);
      LocalDatabaseService.logAction('MODIFICATION', 'USERS', 'UserAccount', u.id, { email: u.email, role: u.role });
    } else {
      const nu = { ...u, id: uuid() };
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

  const roleOptions = [{ value: 'ALL', label: 'Tous les rôles' }, ...ROLES.map(r => ({ value: r.value, label: r.label }))];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500"><UserCog className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Gestion des Comptes Utilisateurs</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{users.length} compte{users.length !== 1 ? 's' : ''} enregistré{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setEditing('new')} className="btn-primary flex items-center gap-2" style={{ fontSize: '11px' }}>
          <Plus className="w-3.5 h-3.5" /> Nouveau Compte
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input w-full pl-9" placeholder="Rechercher par nom, email…" />
        </div>
        <div className="w-52">
          <CustomSelect options={roleOptions} value={roleFilter} onChange={setRoleFilter} />
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-xs">
          <thead style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              {['Utilisateur', 'Rôle', 'Téléphone', 'PIN', 'Statut', 'Connexion', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '9.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500 mx-auto" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Aucun utilisateur trouvé</td></tr>
            ) : filtered.map((user, i) => {
              const role = roleInfo(user.role);
              const statut = STATUS_STYLES[user.statut as AccountStatut] || STATUS_STYLES.INACTIF;
              return (
                <tr key={user.id} className={`border-t ${i % 2 === 0 ? '' : 'bg-slate-500/[0.02]'} hover:bg-indigo-500/[0.03] transition-colors`} style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-black" style={{ color: 'var(--text-primary)' }}>{user.nom} {user.prenom}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-md text-[9.5px] font-black ${role?.color || 'text-slate-600 bg-slate-500/10'}`}>
                      {role?.label || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>{user.telephone || '—'}</td>
                  <td className="px-4 py-3">
                    {user.pinCode ? (
                      <div className="flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        <span className="font-mono text-xs font-bold">••••••</span>
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />
                      <span className={`font-bold ${statut.text}`}>{statut.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {user.derniereConnexion ? new Date(user.derniereConnexion).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : 'Jamais'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const msg = `Bonjour ${user.prenom || ''} ${user.nom},\n\nVos accès ECOLISA :\n- E-mail : ${user.email}\n- Rôle : ${role?.label || user.role}${user.pinCode ? `\n- Code PIN : ${user.pinCode}` : ''}\n\nVeuillez conserver ces informations en lieu sûr.`;
                          const rawPhone = (user.telephone || '').replace(/[^0-9]/g, '');
                          const phone = rawPhone.startsWith('243') ? rawPhone : (rawPhone ? `243${rawPhone.replace(/^0/, '')}` : '');
                          const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                          window.open(url, '_blank');
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-500/15 text-emerald-500 transition-all"
                        title="Partager via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditing(user)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-500/15 text-indigo-500 transition-all" title="Modifier">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleStatus(user)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${user.statut === 'ACTIF' ? 'hover:bg-amber-500/15 text-amber-500' : 'hover:bg-emerald-500/15 text-emerald-500'}`} title={user.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver'}>
                        {user.statut === 'ACTIF' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => setDeleteId(user.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-500/15 text-rose-400 transition-all" title="Supprimer">
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

      {editing && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <ConfirmDeleteModal
          userName={users.find(u => u.id === deleteId)?.email || deleteId}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </div>
  );
};

// ─── Modal Formulaire Utilisateur ─────────────────────────────────────────────
const UserFormModal: React.FC<{
  user: UserAccount | null;
  onClose: () => void;
  onSave: (u: UserAccount & { password?: string }) => void;
}> = ({ user, onClose, onSave }) => {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const [form, setForm] = useState<UserAccount & { password?: string }>({
    id: user?.id || '',
    email: user?.email || '',
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    role: user?.role || 'ENSEIGNANT',
    pinCode: user?.pinCode || '',
    statut: user?.statut || 'ACTIF',
    telephone: user?.telephone || '',
    creeLe: user?.creeLe || new Date().toISOString(),
    password: '',
  });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    const p = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Charger les membres du personnel / enseignants RH enregistrés
    LocalDatabaseService.getStaff().then((list) => {
      setStaffList(list || []);
    });

    return () => { document.body.style.overflow = p; };
  }, []);

  const roleOptions = ROLES.map(r => ({ value: r.value, label: r.label }));
  const statutOptions = ['ACTIF', 'SUSPENDU', 'INACTIF'].map(s => ({ value: s, label: s }));

  const staffOptions = [
    { value: '', label: '-- Sélectionner un membre du personnel / enseignant --' },
    ...staffList.map(s => ({
      value: s.id,
      label: `${s.nom} ${s.prenom || ''} (${s.titreOfficiel || s.role || 'Personnel'})`
    }))
  ];

  const handleSelectStaff = (staffId: string) => {
    setSelectedStaffId(staffId);
    if (!staffId) return;
    const staff = staffList.find(s => s.id === staffId);
    if (staff) {
      const cleanNom = (staff.nom || 'User').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanPrenom = (staff.prenom || 'Nom').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const randNum = Math.floor(100 + Math.random() * 900);
      const autoUsername = `${cleanNom}@${cleanPrenom}.${randNum}`;
      const autoEmail = staff.email || `${cleanPrenom}.${cleanNom}.${randNum}@ecolisa.cd`;
      const autoPassword = `Eco#${Math.floor(1000 + Math.random() * 9000)}!`;
      const autoPin = generatePin();

      setForm(prev => ({
        ...prev,
        nom: staff.nom || prev.nom,
        prenom: staff.prenom || prev.prenom,
        email: autoEmail,
        telephone: staff.telephone || prev.telephone,
        role: (staff.role as RôleSystème) || prev.role,
        usernameGenerated: autoUsername,
        generatedPassword: autoPassword,
        password: autoPassword,
        pinCode: autoPin,
      }));
    }
  };

  const generateAutoCredentials = () => {
    const cleanNom = (form.nom || 'User').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPrenom = (form.prenom || 'Nom').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const autoUsername = `${cleanNom}@${cleanPrenom}.${randNum}`;
    const autoEmail = `${cleanPrenom}.${cleanNom}.${randNum}@ecolisa.cd`;
    const autoPassword = `Eco#${Math.floor(1000 + Math.random() * 9000)}!`;
    const autoPin = generatePin();

    setForm(prev => ({
      ...prev,
      email: prev.email || autoEmail,
      usernameGenerated: autoUsername,
      generatedPassword: autoPassword,
      password: autoPassword,
      pinCode: prev.pinCode || autoPin,
    }));
  };

  const isValid = (form.email.includes('@') || form.email.includes('.')) && form.nom.trim() && (user?.id ? true : form.password!.length >= 6);

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-6 animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500"><UserCog className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{user ? 'Modifier' : 'Nouveau'} Compte Utilisateur</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{user ? `Modif. de ${user.email}` : 'Lier à un agent RH & générer un identifiant'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-500/10 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Sélection d'un membre du personnel enregistré */}
        {!user && (
          <div className="mb-4 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-2">
            <label className="block text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
              1. Sélectionner un Employé / Enseignant RH Enregistré *
            </label>
            <CustomSelect
              options={staffOptions}
              value={selectedStaffId}
              onChange={handleSelectStaff}
            />
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
              Sélectionnez un agent du personnel RH pour pré-remplir automatiquement son nom, prénom et générer son compte.
            </p>
          </div>
        )}

        {/* Bouton de génération automatique rapide */}
        {!user && (
          <div className="mb-4 p-3 rounded-xl border border-slate-700/50 bg-slate-900/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-slate-300">Option Génération Automatique</span>
            </div>
            <button
              type="button"
              onClick={generateAutoCredentials}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" /> Régénérer Identifiants
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Nom *</label>
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="input w-full font-bold" placeholder="KABAMBA" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Prénom *</label>
              <input value={form.prenom || ''} onChange={e => setForm({ ...form, prenom: e.target.value })} className="input w-full font-bold" placeholder="Jean-Baptiste" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Identifiant / E-mail de Connexion *
            </label>
            <input type="text" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input w-full font-bold" placeholder="jean.kabamba@ecolisa.cd ou kabamba@jean.489" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Rôle Système & Autorisations *</label>
            <CustomSelect options={roleOptions} value={form.role} onChange={val => setForm({ ...form, role: val as RôleSystème })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Téléphone (WhatsApp)</label>
              <PhoneInput value={form.telephone || ''} onChange={val => setForm({ ...form, telephone: val })} className="w-full" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>PIN (6 chiffres)</span>
                <button type="button" onClick={() => setForm({ ...form, pinCode: generatePin() })} className="text-[9.5px] font-black text-indigo-500 hover:underline">Générer</button>
              </label>
              <input value={form.pinCode || ''} onChange={e => setForm({ ...form, pinCode: e.target.value.slice(0, 6) })} maxLength={6} className="input w-full font-mono font-black text-center" placeholder="000000" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5 flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
              <span>Mot de passe {!user && '*'}</span>
              <button type="button" onClick={() => setForm({ ...form, password: `Eco#${Math.floor(1000 + Math.random() * 9000)}!` })} className="text-[9.5px] font-black text-indigo-500 hover:underline">Générer Mot de Passe</button>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="input w-full pr-10 font-mono font-bold"
                placeholder="Minimum 6 caractères"
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {user && (
            <div>
              <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Statut du Compte</label>
              <CustomSelect options={statutOptions} value={form.statut as string} onChange={val => setForm({ ...form, statut: val as AccountStatut })} />
            </div>
          )}
          <button
            onClick={() => { if (isValid) onSave(form); }}
            disabled={!isValid}
            className="w-full rounded-xl py-3.5 text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
            style={{ background: '#6366f1', color: 'white' }}
          >
            <Save className="w-4 h-4" /> {user ? 'Mettre à jour le compte' : 'Créer et Enregistrer le compte'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Modal confirmation suppression ──────────────────────────────────────────
const ConfirmDeleteModal: React.FC<{ userName: string; onCancel: () => void; onConfirm: () => void }> = ({ userName, onCancel, onConfirm }) => (
  createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl border p-6 animate-scale-in" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><Trash2 className="w-5 h-5" /></div>
          <h3 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>Supprimer ce compte ?</h3>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Le compte <strong>{userName}</strong> sera définitivement supprimé. Cette action est irréversible.</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-sm font-bold border hover:bg-slate-500/10 transition-all" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Annuler</button>
          <button onClick={onConfirm} className="flex-1 rounded-xl py-2.5 text-sm font-black transition-all" style={{ background: '#ef4444', color: 'white' }}>Supprimer</button>
        </div>
      </div>
    </div>,
    document.body
  )
);

export default UsersManager;
