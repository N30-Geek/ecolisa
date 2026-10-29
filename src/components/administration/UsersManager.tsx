import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Users, Plus, Pencil, Trash2, Search, ShieldCheck,
  Loader2, UserCog, Lock, Unlock, X, Save, MessageSquare,
  UserPlus, AlertCircle, Phone, GraduationCap, Briefcase, Building,
  MoreVertical,
} from 'lucide-react';
import { CustomSelect, SelectOption } from '../common/CustomSelect';
import { PhoneInput } from '../common/PhoneInput';
import { LocalDatabaseService } from '../../services/localDatabase';
import type { UserAccount, RôleSystème, MembrePersonnel } from '../../types';

const uuid = () => (window as any).crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const SYSTEM_ROLES: { value: RôleSystème; label: string; desc: string; badgeCls: string; icon: React.ElementType }[] = [
  { value: 'PROMOTEUR_ADMIN',      label: 'Promoteur / Admin',     desc: 'Configuration système et accès total',      badgeCls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',  icon: ShieldCheck },
  { value: 'PREFET_DIRECTEUR',     label: 'Préfet des Études',     desc: 'Supervision pédagogique secondaire',        badgeCls: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20', icon: Building },
  { value: 'DIRECTEUR_ECOLE',      label: 'Directeur d’école',     desc: 'Direction du cycle maternel / primaire',    badgeCls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20', icon: Building },
  { value: 'DIRECTEUR_ETUDES',     label: 'Directeur des Études',  desc: 'Programmes, horaires et cotes',             badgeCls: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20', icon: GraduationCap },
  { value: 'DIRECTEUR_DISCIPLINE', label: 'Directeur Discipline',  desc: 'Présences, sanctions & discipline',         badgeCls: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20', icon: AlertCircle },
  { value: 'COMPTABLE',            label: 'Comptable',             desc: 'Caisse, frais, factures & paie',            badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', icon: Briefcase },
  { value: 'SECRETAIRE',           label: 'Secrétariat',           desc: 'Inscriptions, dossiers & documents',        badgeCls: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20', icon: Users },
  { value: 'INTENDANT',            label: 'Intendant',             desc: 'Logistique, matériel & caisse',             badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20', icon: Briefcase },
  { value: 'CENSEUR',              label: 'Censeur',               desc: 'Suivi des cours & présences',               badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20', icon: GraduationCap },
  { value: 'TITULAIRE',            label: 'Titulaire',             desc: 'Saisie des cotes & classe',                 badgeCls: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20', icon: GraduationCap },
  { value: 'ENSEIGNANT',           label: 'Enseignant',            desc: 'Saisie des cotes pédagogiques',             badgeCls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20', icon: GraduationCap },
  { value: 'PARENT_ELEVE',         label: 'Parent / Élève',        desc: 'Consultation bulletins & reçus',            badgeCls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20', icon: Users },
];

export const getRoleInfo = (role: string) => SYSTEM_ROLES.find(r => r.value === role) || {
  value: role as RôleSystème,
  label: role,
  desc: 'Utilisateur système',
  badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
  icon: UserCog,
};

type AccountStatut = 'ACTIF' | 'INACTIF' | 'SUSPENDU';

const STATUS_STYLES: Record<AccountStatut, { dot: string; badgeCls: string; label: string }> = {
  ACTIF:    { dot: 'bg-emerald-500', badgeCls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20', label: 'Actif' },
  INACTIF:  { dot: 'bg-slate-400',   badgeCls: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',     label: 'Inactif' },
  SUSPENDU: { dot: 'bg-amber-500',   badgeCls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',   label: 'Suspendu' },
};

const isAdminRole = (role: string) => role === 'PROMOTEUR_ADMIN';

export const UsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [staffList, setStaffList] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
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
    { value: 'ALL', label: 'Tous les rôles' },
    ...SYSTEM_ROLES.map(r => ({ value: r.value, label: r.label }))
  ];

  const statusOptions: SelectOption[] = [
    { value: 'ALL', label: 'Tous les statuts' },
    { value: 'ACTIF', label: 'Actifs' },
    { value: 'SUSPENDU', label: 'Suspendus' },
  ];

  const deleteUserName = useMemo(() => {
    const u = users.find(x => x.id === deleteId);
    return u ? `${u.prenom || ''} ${u.nom || ''}`.trim() : deleteId || '';
  }, [users, deleteId]);

  return (
    <div className="space-y-4 animate-fade-in select-none" style={{ color: 'var(--text-primary)' }}>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Comptes Utilisateurs</h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gestion manuelle des accès. Aucun compte n'est créé automatiquement.</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-[0.97]"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nouveau Compte</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total" value={stats.total} sub={`${stats.actifs} actif(s)`} />
        <KpiCard label="Direction" value={stats.adminDir} />
        <KpiCard label="Enseignants" value={stats.enseignants} />
        <KpiCard label="Finances" value={stats.finance} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Rechercher par nom, e-mail, téléphone..."
          />
        </div>
        <div className="sm:col-span-4">
          <CustomSelect options={roleOptions} value={roleFilter} onChange={setRoleFilter} />
        </div>
        <div className="sm:col-span-2">
          <CustomSelect options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead style={{ background: 'var(--bg-sunken)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <tr>
                <th className="px-4 py-3 text-[11px] font-medium">Utilisateur</th>
                <th className="px-4 py-3 text-[11px] font-medium">Rôle</th>
                <th className="px-4 py-3 text-[11px] font-medium">Téléphone</th>
                <th className="px-4 py-3 text-[11px] font-medium">Statut</th>
                <th className="px-4 py-3 text-[11px] font-medium">Connexion</th>
                <th className="px-4 py-3 text-[11px] font-medium w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-2">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aucun compte trouvé</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {search || roleFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Modifiez les filtres.' : 'Créez un compte manuellement.'}
                    </p>
                  </td>
                </tr>
              ) : filtered.map((user) => {
                const role = getRoleInfo(user.role);
                const RoleIcon = role.icon;
                const statut = STATUS_STYLES[(user.statut as AccountStatut) || 'ACTIF'] || STATUS_STYLES.ACTIF;
                const linkedStaff = staffList.find(s =>
                  s.id === user.id ||
                  `usr_${s.id}` === user.id ||
                  (s.email && user.email && s.email.toLowerCase().trim() === user.email.toLowerCase().trim())
                );
                const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`.toUpperCase() || 'U';

                return (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-slate-500/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.nom}
                            className="w-8 h-8 rounded-lg object-cover border shrink-0"
                            style={{ borderColor: 'var(--border)' }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {user.nom} {user.prenom}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                              {user.email}
                            </p>
                            {linkedStaff && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium border bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                                {linkedStaff.matricule || 'RH'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${role.badgeCls}`}>
                        <RoleIcon className="w-3 h-3" />
                        <span>{role.label}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {user.telephone ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" />
                          {user.telephone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${statut.badgeCls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statut.dot}`} />
                        <span>{statut.label}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {user.derniereConnexion ? (
                        new Date(user.derniereConnexion).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      ) : (
                        <span className="italic">Jamais</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <ActionMenu items={[
                        {
                          label: 'WhatsApp',
                          icon: MessageSquare,
                          color: 'text-emerald-500',
                          onClick: () => {
                            const msg = `Bonjour ${user.prenom || ''} ${user.nom},\n\nVos accès ECOLISA :\n• E-mail : ${user.email}\n• Rôle : ${role.label}\n\nConservez ces informations en lieu sûr.`;
                            const rawPhone = (user.telephone || '').replace(/[^0-9]/g, '');
                            const phone = rawPhone.startsWith('243') ? rawPhone : (rawPhone ? `243${rawPhone.replace(/^0/, '')}` : '');
                            const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                            window.open(url, '_blank');
                          }
                        },
                        { label: 'Modifier', icon: Pencil, color: 'text-indigo-500', onClick: () => setEditing(user) },
                        { label: user.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver', icon: user.statut === 'ACTIF' ? Lock : Unlock, color: 'text-amber-500', onClick: () => handleToggleStatus(user) },
                        { label: 'Supprimer', icon: Trash2, color: 'text-rose-500', onClick: () => setDeleteId(user.id) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <UserFormModal
          user={editing === 'new' ? null : editing}
          existingUsers={users}
          staffList={staffList}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <ConfirmDeleteModal
          userName={deleteUserName}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </div>
  );
};

// ── Sous-composants ─────────────────────────────────────────────────────────

const KpiCard: React.FC<{ label: string; value: number; sub?: string }> = ({ label, value, sub }) => (
  <div className="p-3 rounded-2xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <p className="text-[10.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    {sub && <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
  </div>
);

const ActionMenu: React.FC<{ items: { label: string; icon: React.ElementType; color: string; onClick: () => void }[] }> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors cursor-pointer"
        style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-36 rounded-xl border shadow-lg z-50 p-1"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => { it.onClick(); setOpen(false); }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-slate-500/5 transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <it.icon className={`w-3.5 h-3.5 ${it.color}`} />
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Modal Formulaire Utilisateur ───────────────────────────────────────────
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
  onSave,
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(initialStaff?.id || '');

  const [form, setForm] = useState<UserAccount & { password?: string }>({
    id: user?.id || '',
    email: user?.email || '',
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    role: user?.role || 'ENSEIGNANT',
    statut: user?.statut || 'ACTIF',
    telephone: user?.telephone || '',
    creeLe: user?.creeLe || new Date().toISOString(),
    password: '',
  });

  const [showPwd, setShowPwd] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  const roleOptions: SelectOption[] = SYSTEM_ROLES.map(r => ({ value: r.value, label: r.label }));
  const statutOptions: SelectOption[] = [
    { value: 'ACTIF', label: 'Actif' },
    { value: 'SUSPENDU', label: 'Suspendu' },
    { value: 'INACTIF', label: 'Inactif' },
  ];

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

  const selectedStaff = useMemo(() => staffList.find(s => s.id === selectedStaffId), [staffList, selectedStaffId]);

  const staffDropdownOptions: SelectOption[] = isAdminRole(form.role)
    ? [
        { value: '', label: '-- Compte manuel (admin) --' },
        ...availableStaff.map(s => ({ value: s.id, label: `${s.nom} ${s.prenom || ''} — ${s.titreOfficiel || s.role || 'Personnel'}` })),
      ]
    : availableStaff.map(s => ({ value: s.id, label: `${s.nom} ${s.prenom || ''} — ${s.titreOfficiel || s.role || 'Personnel'}` }));

  useEffect(() => {
    if (!user) {
      if (selectedStaff) {
        setForm(prev => ({
          ...prev,
          id: `usr_${selectedStaff.id}`,
          nom: selectedStaff.nom || prev.nom,
          prenom: selectedStaff.prenom || prev.prenom,
          email: selectedStaff.email || prev.email,
          telephone: selectedStaff.telephone || prev.telephone,
          role: isAdminRole(prev.role) ? prev.role : (selectedStaff.role as RôleSystème) || prev.role,
          password: '',
        }));
      } else {
        setForm(prev => ({
          ...prev,
          id: '',
          nom: '',
          prenom: '',
          email: '',
          telephone: '',
          password: '',
        }));
      }
    }
  }, [selectedStaff, user]);

  // Si le rôle change vers admin, on ne force pas le personnel ; si le rôle change vers non-admin, il faut choisir un personnel
  useEffect(() => {
    if (!user && !isAdminRole(form.role) && !selectedStaffId) {
      setSelectedStaffId('');
      setForm(prev => ({
        ...prev,
        id: '',
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
      }));
    }
  }, [form.role, selectedStaffId, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isAdminRole(form.role) && !selectedStaffId) {
      setErrorMsg('Veuillez lier ce compte à un membre du personnel.');
      return;
    }

    if (!form.nom?.trim() || !form.prenom?.trim()) {
      setErrorMsg('Le nom et le prénom sont obligatoires.');
      return;
    }
    if (!form.email?.trim() || !form.email.includes('@')) {
      setErrorMsg('Une adresse e-mail valide est obligatoire.');
      return;
    }

    const emailTaken = existingUsers.some(u =>
      u.email.toLowerCase().trim() === form.email.toLowerCase().trim() && u.id !== form.id
    );
    if (emailTaken) {
      setErrorMsg('Cette adresse e-mail est déjà utilisée.');
      return;
    }

    if (!user && (!form.password || form.password.length < 6)) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (user && form.password && form.password.length < 6) {
      setErrorMsg('Le nouveau mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    onSave(form);
  };

  const selectedRole = SYSTEM_ROLES.find(r => r.value === form.role);
  const isStaffLinked = !!selectedStaffId;
  const readOnlyIdentity = !user && isStaffLinked;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <UserCog className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {user ? 'Modifier le compte' : 'Créer un compte'}
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {user ? user.email : 'Liaison obligatoire au personnel sauf pour Promoteur/Admin'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-colors cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">

          {errorMsg && (
            <div className="p-3 rounded-xl border text-xs font-medium flex items-center gap-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Rôle en premier car il détermine si le personnel est obligatoire */}
          <Field label="Rôle système" description={selectedRole?.desc}>
            <CustomSelect
              options={roleOptions}
              value={form.role}
              onChange={val => setForm({ ...form, role: val as RôleSystème })}
            />
          </Field>

          {/* Staff selector */}
          {!user && (
            <div className="p-3 rounded-xl border space-y-2" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
              <label className="block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {isAdminRole(form.role) ? 'Lier à un membre du personnel (optionnel)' : 'Lier à un membre du personnel *'}
              </label>
              <CustomSelect
                options={staffDropdownOptions}
                value={selectedStaffId}
                onChange={setSelectedStaffId}
              />
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {isAdminRole(form.role)
                  ? 'Le compte Promoteur/Admin peut être créé manuellement sans lien RH.'
                  : 'Seuls les agents n\'ayant pas encore de compte sont affichés. L\'identité sera pré-remplie.'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom *">
              <input
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                readOnly={readOnlyIdentity}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${readOnlyIdentity ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="KABAMBA"
                required
              />
            </Field>

            <Field label="Prénom *">
              <input
                value={form.prenom || ''}
                onChange={e => setForm({ ...form, prenom: e.target.value })}
                readOnly={readOnlyIdentity}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm ${readOnlyIdentity ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="Jean-Baptiste"
                required
              />
            </Field>
          </div>

          <Field label="Adresse e-mail *">
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              readOnly={readOnlyIdentity && !!form.email}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="jean.kabamba@ecolisa.cd"
              required
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Téléphone">
              <PhoneInput
                value={form.telephone || ''}
                onChange={val => setForm({ ...form, telephone: val })}
                className="w-full"
              />
            </Field>

            <Field label="Statut">
              <CustomSelect
                options={statutOptions}
                value={form.statut as string}
                onChange={val => setForm({ ...form, statut: val as AccountStatut })}
              />
            </Field>
          </div>

          <Field label={`Mot de passe ${user ? '(optionnel)' : '*'}`}>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password || ''}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border text-sm"
                style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder={user ? 'Laisser vide pour conserver' : 'Minimum 6 caractères'}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showPwd ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-xl py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>{user ? 'Enregistrer' : 'Créer le compte'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
};

const Field: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
  <div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
      <label className="block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {description && (
        <span className="text-[10.5px] font-normal" style={{ color: 'var(--text-secondary)' }}>{description}</span>
      )}
    </div>
    {children}
  </div>
);

const ConfirmDeleteModal: React.FC<{ userName: string; onCancel: () => void; onConfirm: () => void }> = ({ userName, onCancel, onConfirm }) => (
  createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Supprimer ce compte ?</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Action irréversible</p>
          </div>
        </div>
        <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          Le compte de <strong>{userName}</strong> sera définitivement supprimé.
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-xs font-semibold border transition-all cursor-pointer"
            style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all cursor-pointer"
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
