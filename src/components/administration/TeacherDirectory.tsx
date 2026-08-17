import React, { useState, useMemo } from 'react';
import {
  Search, Plus, Users, UserCheck, Briefcase, TrendingUp,
  ChevronRight, SlidersHorizontal, UserPlus, GraduationCap,
  ChevronLeft, ArrowUpDown, Filter, Eye, Award
} from 'lucide-react';
import { MembrePersonnel } from '../../types';
import { CustomSelect } from '../common/CustomSelect';
import { SortableTh } from '../common/SortableTh';

interface TeacherDirectoryProps {
  teachers: MembrePersonnel[];
  loading: boolean;
  targetCategory: 'ENSEIGNANT' | 'STAFF';
  onAdd: () => void;
  onView: (t: MembrePersonnel) => void;
  onEdit: (t: MembrePersonnel) => void;
}

const avatarColor = (name: string): string => {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981',
    '#06b6d4', '#3b82f6', '#84cc16', '#f59e0b', '#ef4444',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const initials = (t: MembrePersonnel): string =>
  `${t.prenom?.[0] || ''}${t.nom?.[0] || ''}`.toUpperCase();

const roleLabel: Record<string, string> = {
  ENSEIGNANT: 'Enseignant',
  COMPTABLE: 'Comptable / Intendant',
  PREFET: 'Préfet des Études',
  SURVEILLANT: 'Dir. Discipline',
  DE: 'Dir. des Études',
  ADMIN: 'Administratif',
};

const gradeLabel: Record<string, string> = {
  AGREGE: 'Agrégé EPST', LICENCIE: 'Licencié (L2)', GRADUAT: 'Gradué (L1)',
  DES: 'DES / Master', DOCTEUR: 'Docteur (PhD)', AUTRE: 'Autre Grade',
};

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  bg: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div
    className="rounded-2xl p-4 flex items-center gap-4 border shadow-xs transition-all hover:brightness-105"
    style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
  >
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
      style={{ background: bg, border: `1px solid ${color}33` }}
    >
      <Icon className="w-6 h-6" style={{ color }} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <p className="text-2xl font-black leading-none mt-1" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
      {sub && <p className="text-[10.5px] mt-1 font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>{sub}</p>}
    </div>
  </div>
);

const StatutBadge: React.FC<{ statut: MembrePersonnel['statut'] }> = ({ statut }) => {
  const cfgMap: Record<string, { label: string; bg: string; color: string; border: string }> = {
    ACTIF:     { label: 'Actif',     bg: 'rgba(16,185,129,0.10)',  color: '#10b981', border: 'rgba(16,185,129,0.25)' },
    EN_CONGE:  { label: 'En congé',  bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    SUSPENDU:  { label: 'Suspendu',  bg: 'rgba(239,68,68,0.10)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    INACTIF:   { label: 'Inactif',   bg: 'rgba(239,68,68,0.10)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  };
  const cfg = cfgMap[statut] || cfgMap.ACTIF;

  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
};

const TeacherRow: React.FC<{
  teacher: MembrePersonnel;
  isEnseignant: boolean;
  onView: (t: MembrePersonnel) => void;
  onEdit: (t: MembrePersonnel) => void;
}> = ({ teacher, isEnseignant, onView, onEdit }) => {
  const [hovered, setHovered] = useState(false);
  const color = avatarColor(`${teacher.prenom}${teacher.nom}`);
  const ini = initials(teacher);
  const disciplines = (teacher.disciplines || []).slice(0, 2);
  const moreCount = (teacher.disciplines || []).length - 2;

  return (
    <tr
      className="transition-colors cursor-pointer"
      style={{ borderBottom: '1px solid var(--border)', background: hovered ? 'var(--bg-sunken)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onView(teacher)}
    >
      {/* Avatar + Nom */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {teacher.avatarUrl ? (
            <img
              src={teacher.avatarUrl}
              alt={`${teacher.prenom} ${teacher.nom}`}
              className="w-10 h-10 rounded-xl object-cover border border-indigo-500/40 shrink-0 shadow-xs"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-xs"
              style={{ background: color }}
            >
              {ini}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              {teacher.prenom} {teacher.postnom ? `${teacher.postnom} ` : ''}{teacher.nom}
            </p>
            <p className="text-[10px] font-semibold truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {teacher.grade ? gradeLabel[teacher.grade] || teacher.grade : 'Personnel Qualifié'}
            </p>
          </div>
        </div>
      </td>

      {/* Matricule EPST */}
      <td className="px-4 py-3.5 text-xs">
        <span className="px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
          {teacher.numeroMatriculeEPST || 'EPST-PRO-001'}
        </span>
      </td>

      {/* Fonction / Rôle */}
      <td className="px-4 py-3.5 text-xs">
        <span
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap"
          style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.18)' }}
        >
          {roleLabel[teacher.role] || teacher.role}
        </span>
      </td>

      {/* Sexe */}
      <td className="px-4 py-3.5 text-xs font-semibold">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${teacher.genre === 'F' ? 'bg-pink-500/10 text-pink-500 border border-pink-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
          {teacher.genre === 'F' ? 'Féminin' : 'Masculin'}
        </span>
      </td>

      {/* Statut */}
      <td className="px-4 py-3.5 text-xs">
        <StatutBadge statut={teacher.statut} />
      </td>

      {/* Affectation / Contact */}
      <td className="px-4 py-3.5 text-xs">
        <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
          {isEnseignant ? (disciplines.join(', ') || 'Sciences & Lettres') : (teacher.telephone || '—')}
        </p>
        <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
          {teacher.telephone ? teacher.telephone : 'Contrat Permanent'}
        </p>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-xs text-right">
        <div className="flex items-center gap-1 justify-end">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onView(teacher); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Voir la fiche</span>
          </button>
        </div>
      </td>
    </tr>
  );
};

const EmptyState: React.FC<{ isEnseignant: boolean; onAdd: () => void }> = ({ isEnseignant, onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div
      className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-xs"
      style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
    >
      {isEnseignant ? (
        <GraduationCap className="w-8 h-8 text-indigo-500" />
      ) : (
        <Users className="w-8 h-8 text-emerald-500" />
      )}
    </div>
    <h3 className="text-base font-black mb-1" style={{ color: 'var(--text-primary)' }}>
      {isEnseignant ? 'Aucun enseignant enregistré' : 'Aucun membre du personnel enregistré'}
    </h3>
    <p className="text-xs mb-6 max-w-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {isEnseignant
        ? 'Commencez par inscrire les enseignants et professeurs de votre établissement.'
        : 'Commencez par enregistrer les membres de la direction et du personnel administratif.'}
    </p>
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-700 cursor-pointer"
      style={{ background: '#6366f1' }}
    >
      <UserPlus className="w-4 h-4" />
      {isEnseignant ? 'Inscrire un enseignant' : 'Ajouter un agent administratif'}
    </button>
  </div>
);

export const TeacherDirectory: React.FC<TeacherDirectoryProps> = ({
  teachers,
  loading,
  targetCategory,
  onAdd,
  onView,
  onEdit,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterGenre, setFilterGenre] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [sortBy, setSortBy] = useState<string>('nom');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const isEnseignant = targetCategory === 'ENSEIGNANT';

  // Filtrer par la catégorie cible
  const categoryTeachers = useMemo(() => {
    if (isEnseignant) {
      return teachers.filter(t => t.role === 'ENSEIGNANT');
    } else {
      return teachers.filter(t => t.role !== 'ENSEIGNANT');
    }
  }, [teachers, isEnseignant]);

  const filtered = useMemo(() => {
    let list = [...categoryTeachers];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        `${t.prenom} ${t.postnom || ''} ${t.nom}`.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.telephone?.includes(q) ||
        t.numeroMatriculeEPST?.toLowerCase().includes(q) ||
        (t.disciplines || []).some(d => d.toLowerCase().includes(q))
      );
    }
    if (filterStatut) list = list.filter(t => t.statut === filterStatut);
    if (filterGenre) list = list.filter(t => t.genre === filterGenre);
    if (filterRole) list = list.filter(t => t.role === filterRole);

    // Tri
    list.sort((a, b) => {
      let res = 0;
      switch (sortBy) {
        case 'matricule':
          res = (a.numeroMatriculeEPST || '').localeCompare(b.numeroMatriculeEPST || '');
          break;
        case 'role':
          res = (a.role || '').localeCompare(b.role || '');
          break;
        case 'genre':
          res = (a.genre || '').localeCompare(b.genre || '');
          break;
        case 'statut':
          res = (a.statut || '').localeCompare(b.statut || '');
          break;
        case 'disciplines':
          res = (a.disciplines?.join(', ') || a.telephone || '').localeCompare(b.disciplines?.join(', ') || b.telephone || '');
          break;
        case 'prenom':
          res = (a.prenom || '').localeCompare(b.prenom || '');
          break;
        case 'nom':
        default:
          res = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
          break;
      }
      return sortOrder === 'asc' ? res : -res;
    });

    return list;
  }, [categoryTeachers, search, filterStatut, filterGenre, filterRole, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const actifs = categoryTeachers.filter(t => t.statut === 'ACTIF').length;
  const femmes = categoryTeachers.filter(t => t.genre === 'F').length;
  const permanents = categoryTeachers.filter(t => isEnseignant ? t.typeContrat === 'PERMANENT' : ['PREFET','DE','SURVEILLANT'].includes(t.role)).length;

  return (
    <div className="space-y-4 select-none">
      {/* ── 1. CARTES KPI HEADER (EN-TÊTE DÉCOUPÉ) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Users}
          label={isEnseignant ? 'TOTAL ENSEIGNANTS INSCRITS' : 'TOTAL PERSONNEL ADMIN'}
          value={categoryTeachers.length}
          sub={isEnseignant ? 'Corps professoral qualifié' : 'Cadres & agents administratifs'}
          color="#6366f1"
          bg="rgba(99,102,241,0.10)"
        />
        <KpiCard
          icon={UserCheck}
          label="STATUT ACTIF"
          value={actifs}
          sub="En fonction dans l'établissement"
          color="#10b981"
          bg="rgba(16,185,129,0.10)"
        />
        <KpiCard
          icon={UserCheck}
          label="FEMMES (PARITÉ EPST)"
          value={femmes}
          sub="Effectif féminin engagé"
          color="#ec4899"
          bg="rgba(236,72,153,0.10)"
        />
        <KpiCard
          icon={Briefcase}
          label={isEnseignant ? 'PERMANENTS (CDI)' : 'DIRECTION & CADRES'}
          value={permanents}
          sub={isEnseignant ? 'Agents sous contrat permanent' : 'Cadres de direction scolaire'}
          color="#f59e0b"
          bg="rgba(245,158,11,0.10)"
        />
      </div>

      {/* ── 2. BARRE DE FILTRES CONTENEURISÉE (MILIEU) ── */}
      <div
        className="rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-3 border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {/* Recherche */}
        <div className="flex-1 min-w-[220px] relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          />
          <input
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border outline-none transition-all focus:ring-2 focus:ring-indigo-500/30 font-medium"
            style={{
              background: 'var(--bg-sunken)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            placeholder={isEnseignant ? "Rechercher par nom, postnom, matricule, matière..." : "Rechercher un agent par nom, fonction..."}
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Filtre par Sexe */}
        <div className="w-36">
          <CustomSelect
            value={filterGenre}
            onChange={v => { setFilterGenre(v); setCurrentPage(1); }}
            placeholder="Tous sexes"
            options={[
              { value: '', label: 'Tous sexes' },
              { value: 'M', label: 'Masculin (M)' },
              { value: 'F', label: 'Féminin (F)' },
            ]}
          />
        </div>

        {/* Filtre par Statut */}
        <div className="w-36">
          <CustomSelect
            value={filterStatut}
            onChange={v => { setFilterStatut(v); setCurrentPage(1); }}
            placeholder="Tous statuts"
            options={[
              { value: '', label: 'Tous statuts' },
              { value: 'ACTIF', label: 'Actifs' },
              { value: 'EN_CONGE', label: 'En congé' },
              { value: 'SUSPENDU', label: 'Suspendus' },
            ]}
          />
        </div>

        {/* Tri */}
        <div className="w-36">
          <CustomSelect
            value={sortBy}
            onChange={v => setSortBy(v as 'nom' | 'prenom')}
            options={[
              { value: 'nom', label: 'Nom Complexe' },
              { value: 'prenom', label: 'Prénom' },
            ]}
          />
        </div>

        {/* Direction Tri */}
        <button
          onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer"
          style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
          <span>{sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}</span>
        </button>

        {/* Bouton d'ajout */}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shrink-0 shadow-sm cursor-pointer hover:bg-indigo-700"
          style={{ background: '#6366f1' }}
        >
          <Plus className="w-4 h-4" />
          <span>{isEnseignant ? 'Inscrire Enseignant' : 'Ajouter Personnel'}</span>
        </button>
      </div>

      {/* ── 3. TABLEAU & PAGINATION CONTENEURISÉE (BAS) ── */}
      <div
        className="rounded-3xl overflow-hidden border shadow-xs flex flex-col"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState isEnseignant={isEnseignant} onAdd={onAdd} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-sunken)' }}>
                    <SortableTh label={isEnseignant ? 'ENSEIGNANT & PHOTO' : 'MEMBRE DU PERSONNEL'} field="nom" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="MATRICULE EPST" field="matricule" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="FONCTION / RÔLE" field="role" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="SEXE" field="genre" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label="STATUT" field="statut" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                    <SortableTh label={isEnseignant ? 'MATIÈRES ASSIGNÉES' : 'TÉLÉPHONE / CONTACT'} field="disciplines" currentSortField={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(t => (
                    <TeacherRow
                      key={t.id}
                      teacher={t}
                      isEnseignant={isEnseignant}
                      onView={onView}
                      onEdit={onEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* BARRE DE PAGINATION INTÉGRÉE AU FOOTER */}
            <div
              className="px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-4 text-xs font-semibold"
              style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold">Afficher :</span>
                <div className="w-28">
                  <CustomSelect
                    value={pageSize.toString()}
                    onChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}
                    options={[
                      { value: '5', label: '5 par page' },
                      { value: '10', label: '10 par page' },
                      { value: '25', label: '25 par page' },
                      { value: '50', label: '50 par page' },
                    ]}
                  />
                </div>
                <span className="text-slate-400 font-medium">
                  {(currentPage - 1) * pageSize + 1} – {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length} élément{filtered.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Précédent
                </button>

                <span className="px-3 py-1.5 rounded-xl font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Page {currentPage} / {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-500/10 cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Suivant
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
