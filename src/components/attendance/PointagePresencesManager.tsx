import React, { useState } from 'react';
import { CalendarCheck, UserCog, GraduationCap, Clock } from 'lucide-react';
import { StudentPointageManager } from './StudentPointageManager';
import { UserSession } from '../../services/localDatabase';

interface PointagePresencesManagerProps {
  activeSchoolYear?: string;
  currentUser?: UserSession | null;
}

export const PointagePresencesManager: React.FC<PointagePresencesManagerProps> = ({ activeSchoolYear, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'eleves' | 'personnel'>('eleves');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* HEADER */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Pointage & Présence
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grille journalière et mensuelle pour élèves et personnel
            </p>
          </div>
        </div>

        <div className="flex rounded-xl p-1 border gap-1" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'eleves' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Élèves
          </button>
          <button
            onClick={() => setActiveTab('personnel')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'personnel' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCog className="w-4 h-4" /> Personnel
          </button>
        </div>
      </div>

      {activeTab === 'eleves' ? (
        <StudentPointageManager activeSchoolYear={activeSchoolYear} currentUser={currentUser} />
      ) : (
        <div className="p-10 text-center text-slate-500 rounded-2xl border" style={{ borderColor: 'var(--border)' }}>
          <Clock className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
            Pointage du personnel
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            L'arrivée et le départ des enseignants et du personnel seront disponibles dans la prochaine étape.
          </p>
        </div>
      )}
    </div>
  );
};
