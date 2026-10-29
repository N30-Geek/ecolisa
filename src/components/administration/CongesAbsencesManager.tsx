import React, { useState } from 'react';
import { CalendarOff, UserCog, GraduationCap } from 'lucide-react';
import { LeavesManager } from './LeavesManager';
import { StudentAbsencesManager } from './StudentAbsencesManager';

interface CongesAbsencesManagerProps {
  activeSchoolYear?: string;
}

export const CongesAbsencesManager: React.FC<CongesAbsencesManagerProps> = ({ activeSchoolYear }) => {
  const [activeTab, setActiveTab] = useState<'personnel' | 'eleves'>('personnel');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* BARRE EN-TÊTE DU MODULE */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <CalendarOff className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Congés & Absences
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestion des congés du personnel et suivi des absences des élèves
            </p>
          </div>
        </div>

        {/* ONGLETS PERSONNEL / ÉLÈVES */}
        <div className="flex rounded-xl p-1 border gap-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'personnel' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCog className="w-4 h-4" /> Personnel
          </button>
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'eleves' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Élèves
          </button>
        </div>
      </div>

      {activeTab === 'personnel' ? (
        <LeavesManager />
      ) : (
        <StudentAbsencesManager activeSchoolYear={activeSchoolYear} />
      )}
    </div>
  );
};
