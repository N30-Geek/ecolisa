import React, { useState } from 'react';
import { 
  mockCycles, 
  mockClasses, 
  mockStudents, 
  mockSubjects 
} from '../../data/mockData';
import { Student, Grade } from '../../types';
import { GraduationCap, BookOpen, Search, UserCheck, Plus, CheckCircle, Award } from 'lucide-react';

export const AcademicManager: React.FC = () => {
  const [selectedCycleId, setSelectedCycleId] = useState<string>('c4'); // Default Humanités
  const [selectedClassId, setSelectedClassId] = useState<string>('cls-4'); // 3ème Math-Physique
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'STUDENTS' | 'GRADES'>('STUDENTS');
  const [students, setStudents] = useState<Student[]>(mockStudents);

  // Grade state simulation for class 3ème Math-Physique
  const [grades, setGrades] = useState<Record<string, number>>({
    'std-1_sub-1': 17.5,
    'std-1_sub-2': 18.0,
    'std-1_sub-3': 16.5,
    'std-1_sub-4': 15.0,
    'std-2_sub-1': 16.0,
    'std-2_sub-2': 15.5,
    'std-2_sub-3': 17.0,
    'std-2_sub-4': 14.5,
  });

  const filteredStudents = students.filter(s => 
    s.classId === selectedClassId &&
    (`${s.firstName} ${s.lastName} ${s.registrationNumber}`).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeClass = mockClasses.find(c => c.id === selectedClassId);

  const handleScoreChange = (studentId: string, subjectId: string, scoreStr: string) => {
    const val = parseFloat(scoreStr);
    if (isNaN(val)) return;
    setGrades(prev => ({
      ...prev,
      [`${studentId}_${subjectId}`]: val
    }));
  };

  const calculateStudentAvg = (studentId: string) => {
    let totalScore = 0;
    let totalMax = 0;
    mockSubjects.forEach(sub => {
      const score = grades[`${studentId}_${sub.id}`] || 0;
      totalScore += score * sub.coefficient;
      totalMax += sub.maxScore * sub.coefficient;
    });
    const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    return { totalScore, totalMax, percentage: percentage.toFixed(1) };
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Structure Académique & Suivi Pédagogique (CITE RDC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestion des cycles d'enseignement (CITE 100, CITE 244, CITE 344), dossiers psychopédagogiques et cotes.
          </p>
        </div>

        {/* Action button */}
        <div className="flex gap-3">
          <button 
            onClick={() => setActiveSubTab('STUDENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'STUDENTS' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Liste des Élèves
          </button>
          <button 
            onClick={() => setActiveSubTab('GRADES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'GRADES' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Matrice des Cotes & Bulletins
          </button>
        </div>
      </div>

      {/* Cycle Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {mockCycles.map((cycle) => (
          <button
            key={cycle.id}
            onClick={() => {
              setSelectedCycleId(cycle.id);
              const firstClassInCycle = mockClasses.find(c => c.cycleId === cycle.id);
              if (firstClassInCycle) setSelectedClassId(firstClassInCycle.id);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCycleId === cycle.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{cycle.name}</span>
            <span className="ml-2 text-[10px] opacity-75 font-normal">({cycle.citeCode})</span>
          </button>
        ))}
      </div>

      {/* Class Selector & Search bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-500 uppercase">Classe Active :</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {mockClasses
              .filter(c => c.cycleId === selectedCycleId)
              .map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} élèves) - Titulaire: {c.mainTeacher}
                </option>
              ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher élève par nom/matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* SUB TAB 1: STUDENTS LIST */}
      {activeSubTab === 'STUDENTS' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-base">
              Roster de la Classe - {activeClass?.name}
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {filteredStudents.length} Élèves inscrits
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">Élève & Matricule</th>
                  <th className="py-3 px-6">Genre / Naissance</th>
                  <th className="py-3 px-6">Parent / Contact</th>
                  <th className="py-3 px-6">Statut EPST</th>
                  <th className="py-3 px-6">Notes Psychopédagogiques</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={std.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt={std.lastName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{std.firstName} {std.lastName}</div>
                          <div className="text-[11px] font-mono text-indigo-600 font-semibold">{std.registrationNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="font-semibold">{std.gender === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</div>
                      <div className="text-[11px] text-slate-400">{std.birthDate} ({std.birthPlace})</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="font-bold text-slate-800">{std.parentName}</div>
                      <div className="text-[11px] text-slate-500">{std.parentPhone}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        <CheckCircle className="w-3 h-3" /> ACTIVE
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-xs truncate">
                      {std.psychopedagogicalNotes || 'R.A.S - Conduite irréprochable.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB TAB 2: GRADES MATRIX */}
      {activeSubTab === 'GRADES' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Saisie des Cotes - 1er Trimestre
              </h3>
              <p className="text-xs text-slate-500">
                Pondération officielle ministère EPST RDC (Interrogations & Examens).
              </p>
            </div>

            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-600" />
              Calcul Automatique de la Moyenne %
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Élève</th>
                  {mockSubjects.map(sub => (
                    <th key={sub.id} className="py-3 px-3 text-center">
                      <div>{sub.code}</div>
                      <div className="text-[9px] text-slate-400 font-normal">Coeff: {sub.coefficient} (/{sub.maxScore})</div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right">Totaux Points</th>
                  <th className="py-3 px-4 text-right">Pourcentage %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map(std => {
                  const { totalScore, totalMax, percentage } = calculateStudentAvg(std.id);
                  const isPassing = parseFloat(percentage) >= 50;

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {std.firstName} {std.lastName}
                      </td>

                      {mockSubjects.map(sub => {
                        const currentScore = grades[`${std.id}_${sub.id}`] ?? '';
                        return (
                          <td key={sub.id} className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={sub.maxScore}
                              step="0.5"
                              value={currentScore}
                              onChange={(e) => handleScoreChange(std.id, sub.id, e.target.value)}
                              className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                            />
                          </td>
                        );
                      })}

                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {totalScore.toFixed(1)} / {totalMax}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold font-mono ${
                          isPassing ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
