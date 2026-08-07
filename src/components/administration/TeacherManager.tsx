import React, { useState, useEffect, useCallback } from 'react';
import { Users, BarChart3, GraduationCap, Building2 } from 'lucide-react';
import { MembrePersonnel } from '../../types';
import { LocalDatabaseService } from '../../services/localDatabase';
import { TeacherDirectory } from './TeacherDirectory';
import { TeacherDetailPage } from './TeacherDetailPage';
import { LeavesManager } from './LeavesManager';
import { StaffFormPage } from './StaffFormPage';

interface TeacherManagerProps {
  targetCategory?: 'ENSEIGNANT' | 'STAFF';
}

type ManagerTab = 'repertoire' | 'conges' | 'statistiques';
type ManagerView = 'LIST' | 'FORM' | 'DETAIL';

const StatsPanel: React.FC<{ teachers: MembrePersonnel[]; targetCategory: 'ENSEIGNANT' | 'STAFF' }> = ({
  teachers,
  targetCategory,
}) => {
  const isEnseignant = targetCategory === 'ENSEIGNANT';
  const categoryTeachers = isEnseignant
    ? teachers.filter(t => t.role === 'ENSEIGNANT')
    : teachers.filter(t => t.role !== 'ENSEIGNANT');

  const roles: Record<string, number> = {};
  const grades: Record<string, number> = {};
  const contrats: Record<string, number> = {};

  categoryTeachers.forEach(t => {
    roles[t.role] = (roles[t.role] || 0) + 1;
    if (t.grade) grades[t.grade] = (grades[t.grade] || 0) + 1;
    if (t.typeContrat) contrats[t.typeContrat] = (contrats[t.typeContrat] || 0) + 1;
  });

  const roleMeta: Record<string, { label: string; color: string }> = {
    ENSEIGNANT:  { label: 'Enseignants', color: '#6366f1' },
    PREFET:      { label: 'Préfets & Direction', color: '#8b5cf6' },
    DE:          { label: 'Dir. Études', color: '#06b6d4' },
    SURVEILLANT: { label: 'Dir. Discipline / Surveillants', color: '#f97316' },
    COMPTABLE:   { label: 'Comptables & Intendance', color: '#10b981' },
    ADMIN:       { label: 'Secrétariat & Administration', color: '#f59e0b' },
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
  };

  const BarChart: React.FC<{ data: [string, number][]; meta: Record<string, any>; total: number }> = ({ data, meta, total }) => (
    <div className="space-y-2.5">
      {data.sort((a, b) => b[1] - a[1]).map(([key, count]) => {
        const m = meta[key];
        const pct = total ? Math.round((count / total) * 100) : 0;
        const color = m?.color || '#6366f1';
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {m?.label || key}
              </span>
              <span className="text-xs font-black" style={{ color: 'var(--text-secondary)' }}>
                {count} <span className="font-semibold">({pct}%)</span>
              </span>
            </div>
            <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-sunken)' }}>
              <div
                className="h-1.5 rounded-full transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (categoryTeachers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart3 className="w-12 h-12 mb-4" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
          Aucune donnée statistique enregistrée
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Répartition par Fonction
        </h3>
        <BarChart data={Object.entries(roles)} meta={roleMeta} total={categoryTeachers.length} />
      </div>

      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Niveau d'Études & Diplômes
        </h3>
        <BarChart
          data={Object.entries(grades)}
          meta={{
            DOCTEUR: { label: 'Docteur (PhD)' },
            DES: { label: 'DES / Master' },
            LICENCIE: { label: 'Licencié' },
            AGREGE: { label: 'Agrégé EPST' },
            GRADUAT: { label: 'Gradué' },
            AUTRE: { label: 'Autre' },
          }}
          total={categoryTeachers.filter(t => t.grade).length}
        />
      </div>

      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
          Statut Contractuel
        </h3>
        <BarChart
          data={Object.entries(contrats)}
          meta={{
            PERMANENT: { label: 'Permanent / CDI', color: '#10b981' },
            VACATAIRE: { label: 'Vacataire / CDD', color: '#f59e0b' },
            INTERIMAIRE: { label: 'Intérimaire', color: '#f97316' },
            BENEVOLE: { label: 'Bénévole', color: '#8b5cf6' },
          }}
          total={categoryTeachers.filter(t => t.typeContrat).length}
        />
      </div>
    </div>
  );
};

export const TeacherManager: React.FC<TeacherManagerProps> = ({
  targetCategory = 'ENSEIGNANT',
}) => {
  const [activeTab, setActiveTab] = useState<ManagerTab>('repertoire');
  const [view, setView] = useState<ManagerView>('LIST');
  const [teachers, setTeachers] = useState<MembrePersonnel[]>([]);
  const [loading, setLoading] = useState(true);

  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [editingTeacher, setEditingTeacher] = useState<MembrePersonnel | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<MembrePersonnel | null>(null);

  const isEnseignant = targetCategory === 'ENSEIGNANT';

  const loadTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await LocalDatabaseService.getStaff();
      setTeachers(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
    setView('LIST');
  }, [loadTeachers, targetCategory]);

  const handleAdd = () => {
    setEditingTeacher(null);
    setView('FORM');
  };

  const handleEdit = (t: MembrePersonnel) => {
    setEditingTeacher(t);
    setView('FORM');
  };

  const handleView = (t: MembrePersonnel) => {
    setSelectedTeacher(t);
    setView('DETAIL');
  };

  const handleSaveFormPage = async (staffMember: MembrePersonnel) => {
    const exists = teachers.some((t) => t.id === staffMember.id);
    if (exists) {
      await LocalDatabaseService.updateStaff(staffMember.id, staffMember);
    } else {
      await LocalDatabaseService.addStaff(staffMember);
    }
    await loadTeachers();
    setView('LIST');
  };

  if (view === 'FORM') {
    return (
      <StaffFormPage
        staffToEdit={editingTeacher}
        targetCategory={targetCategory}
        onBack={() => setView('LIST')}
        onSave={handleSaveFormPage}
      />
    );
  }

  if (view === 'DETAIL' && selectedTeacher) {
    return (
      <TeacherDetailPage
        teacher={selectedTeacher}
        onBack={() => setView('LIST')}
        onEdit={t => {
          setEditingTeacher(t);
          setView('FORM');
        }}
      />
    );
  }

  const categoryTeachersCount = isEnseignant
    ? teachers.filter(t => t.role === 'ENSEIGNANT').length
    : teachers.filter(t => t.role !== 'ENSEIGNANT').length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isEnseignant ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
              border: `1px solid ${isEnseignant ? 'rgba(99,102,241,0.20)' : 'rgba(16,185,129,0.20)'}`,
            }}
          >
            {isEnseignant ? (
              <GraduationCap className="w-5 h-5 text-indigo-500" />
            ) : (
              <Building2 className="w-5 h-5 text-emerald-500" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight" style={{ color: 'var(--text-primary)' }}>
              {isEnseignant ? 'Gestion des Enseignants & Professeurs' : 'Dossiers Personnel & Agents Administratifs'}
            </h1>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {isEnseignant
                ? 'Registre du corps professoral, compétences et affectations'
                : 'Direction, comptabilité, secrétariat, discipline & services'}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
          style={{
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.20)',
            color: '#10b981',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {categoryTeachersCount} enregistré{categoryTeachersCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex gap-1">
        <button
          onClick={() => setActiveTab('repertoire')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
          style={{
            background: activeTab === 'repertoire' ? 'rgba(99,102,241,0.12)' : 'transparent',
            color: activeTab === 'repertoire' ? '#6366f1' : 'var(--text-secondary)',
            border: activeTab === 'repertoire' ? '1px solid rgba(99,102,241,0.22)' : '1px solid transparent',
          }}
        >
          <Users className="w-4 h-4" />
          Répertoire Personnel
        </button>
        <button
          onClick={() => setActiveTab('conges')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
          style={{
            background: activeTab === 'conges' ? 'rgba(99,102,241,0.12)' : 'transparent',
            color: activeTab === 'conges' ? '#6366f1' : 'var(--text-secondary)',
            border: activeTab === 'conges' ? '1px solid rgba(99,102,241,0.22)' : '1px solid transparent',
          }}
        >
          <Building2 className="w-4 h-4" />
          Congés, Absences & Documents FST
        </button>
        <button
          onClick={() => setActiveTab('statistiques')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer"
          style={{
            background: activeTab === 'statistiques' ? 'rgba(99,102,241,0.12)' : 'transparent',
            color: activeTab === 'statistiques' ? '#6366f1' : 'var(--text-secondary)',
            border: activeTab === 'statistiques' ? '1px solid rgba(99,102,241,0.22)' : '1px solid transparent',
          }}
        >
          <BarChart3 className="w-4 h-4" />
          Statistiques RH
        </button>
      </div>

      {activeTab === 'repertoire' && (
        <TeacherDirectory
          teachers={teachers}
          loading={loading}
          targetCategory={targetCategory}
          onAdd={handleAdd}
          onView={handleView}
          onEdit={handleEdit}
        />
      )}

      {activeTab === 'conges' && (
        <LeavesManager />
      )}

      {activeTab === 'statistiques' && (
        <StatsPanel teachers={teachers} targetCategory={targetCategory} />
      )}
    </div>
  );
};
