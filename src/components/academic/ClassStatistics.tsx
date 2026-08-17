import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Users, School, Layers, Percent } from 'lucide-react';
import { ClasseScolaire, Eleve } from '../../types';
import { formatCurrency, convertCurrency } from '../../utils/currency';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';

interface ClassStatisticsProps {
  classes: ClasseScolaire[];
  students: Eleve[];
}

const normalizeCycle = (cycleId?: string): string => {
  const c = (cycleId || '').toUpperCase().replace(/[-_\s]/g, '');
  if (c.includes('PRESCHOOL') || c.includes('MATERNELLE') || c.startsWith('MAT')) return 'Maternelle';
  if (c.includes('PRIMAIRE') || c.startsWith('PRI')) return 'Primaire';
  if (c.includes('CTEB') || (c.includes('SECONDAIRE') && c.includes('CTEB')) || c.startsWith('7') || c.startsWith('8')) return 'CTEB';
  if (c.includes('HUMANITES') || c.includes('HUMAN')) return 'Humanités';
  return 'Autre';
};

const CYCLE_COLORS: Record<string, string> = {
  Maternelle: '#6366f1',
  Primaire: '#10b981',
  CTEB: '#f59e0b',
  Humanités: '#818cf8',
  Autre: '#94a3b8',
};

const KpiCard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; color: string }> = ({ icon: Icon, label, value, sub, color }) => (
  <div className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
    <div className="flex items-center gap-3">
      <div className="p-2.5 rounded-xl" style={{ background: `${color}15`, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
        {sub && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </div>
  </div>
);

export const ClassStatistics: React.FC<ClassStatisticsProps> = ({ classes, students }) => {
  const { currency } = useSchoolConfig();
  const countsByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of students) {
      if (s.statut !== 'ACTIF') continue;
      map.set(s.classId, (map.get(s.classId) || 0) + 1);
    }
    return map;
  }, [students]);

  const topClasses = useMemo(() => {
    return classes
      .map(c => ({
        nom: c.nom,
        effectif: countsByClass.get(c.id) || 0,
        salle: c.salles?.join(', ') || c.salle,
      }))
      .filter(c => c.effectif > 0)
      .sort((a, b) => b.effectif - a.effectif)
      .slice(0, 8);
  }, [classes, countsByClass]);

  const cycleData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of classes) {
      const count = countsByClass.get(c.id) || 0;
      const label = normalizeCycle(c.cycleId);
      map.set(label, (map.get(label) || 0) + count);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value, color: CYCLE_COLORS[name] || '#94a3b8' }));
  }, [classes, countsByClass]);

  const totalStudents = useMemo(() => students.filter(s => s.statut === 'ACTIF').length, [students]);
  const totalClasses = classes.length;
  const avg = totalClasses > 0 ? Math.round((totalStudents / totalClasses) * 10) / 10 : 0;

  const totalFrais = useMemo(() => {
    return classes.reduce((sum, c) => {
      const totalClasse = (c.fraisInscription || 0) + (c.fraisMinerval || 0) + (c.fraisAnnexe || 0);
      return sum + convertCurrency(totalClasse, c.devise || 'USD', currency);
    }, 0);
  }, [classes, currency]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={School} label="Classes" value={totalClasses.toLocaleString()} sub="Promotions configurées" color="#6366f1" />
        <KpiCard icon={Users} label="Effectif Actif" value={totalStudents.toLocaleString()} sub="Élèves actifs" color="#10b981" />
        <KpiCard icon={Layers} label="Moyenne / Classe" value={avg.toFixed(1)} sub="élèves par promotion" color="#f59e0b" />
        <KpiCard icon={Percent} label="Tarification moy." value={formatCurrency(totalFrais / (totalClasses || 1), currency)} sub="par classe" color="#ec4899" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Répartition par Cycle</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cycleData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {cycleData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {cycleData.map(c => (
              <span key={c.name} className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                {c.name} ({c.value})
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-4" style={{ color: 'var(--text-primary)' }}>Top Classes par Effectif</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topClasses} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="nom" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-surface)' }} />
                <Bar dataKey="effectif" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl border shadow-xs" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-primary)' }}>Affectation des Salles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from(
            classes.reduce((acc, c) => {
              const rooms = c.salles?.length ? c.salles : [c.salle];
              for (const r of rooms) {
                if (!acc.has(r)) acc.set(r, { count: 0, students: 0 });
                const entry = acc.get(r)!;
                entry.count++;
                entry.students += countsByClass.get(c.id) || 0;
              }
              return acc;
            }, new Map<string, { count: number; students: number }>())
          )
            .sort(([, a], [, b]) => b.students - a.students)
            .slice(0, 12)
            .map(([room, data]) => (
              <div key={room} className="flex items-center justify-between p-3 rounded-xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{room}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{data.count} classe{data.count > 1 ? 's' : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{data.students}</p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>élèves</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
