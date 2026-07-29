import React, { useState } from 'react';
import { 
  Users, 
  Receipt, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  MoreHorizontal,
  GraduationCap,
  Award,
  Clock,
  Check,
  X
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { mockEvents, mockFacultyUpdates } from '../../data/mockData';

export const ExecutiveDashboard: React.FC = () => {
  const [periodeGraphique, setPeriodeGraphique] = useState<'Hebdomadaire' | 'Mensuel' | 'Annuel'>('Mensuel');
  const [actualites, setActualites] = useState(mockFacultyUpdates);

  // Graphique de courbe d'assiduité & cotes (Jan, Mar, Mai, Jul, Sep, Nov)
  const donneesPerformance = [
    { mois: 'Jan', moyenneCotes: 42, tauxPresence: 52 },
    { mois: 'Mar', moyenneCotes: 68, tauxPresence: 58 },
    { mois: 'Mai', moyenneCotes: 62, tauxPresence: 48 },
    { mois: 'Jul', moyenneCotes: 78, tauxPresence: 65 },
    { mois: 'Sep', moyenneCotes: 84, tauxPresence: 68 },
    { mois: 'Nov', moyenneCotes: 95, tauxPresence: 72 },
  ];

  // Synthèse financière par trimestre (T1, T2, T3, T4, T1'26)
  const donneesFinancieres = [
    { trimestre: 'T1', val: 45 },
    { trimestre: 'T2', val: 65 },
    { trimestre: 'T3', val: 52 },
    { trimestre: 'T4', val: 88 },
    { trimestre: "T1'26", val: 60 },
  ];

  const ApprouverConge = (id: string) => {
    setActualites(prev => prev.map(fu => fu.id === id ? { ...fu, necessiteApprobation: false } : fu));
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* CARTES STATISTIQUES EN EN-TÊTE (4 Colonnes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Carte 1: EFFECTIF TOTAL */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EFFECTIF TOTAL ÉLÈVES</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">14 295</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> +4.2%
              </span>
              <span>vs semestre précédent</span>
            </div>
          </div>
        </div>

        {/* Carte 2: RECETTES MINERVAL */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">RECETTES PERÇUES (USD/CDF)</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">$12.4M</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                <TrendingUp className="w-3.5 h-3.5" /> +12.8%
              </span>
              <span>vs année scolaire précédente</span>
            </div>
          </div>
        </div>

        {/* Carte 3: PRÉSENCE DU PERSONNEL */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PRÉSENCE DU PERSONNEL</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">98.2%</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
                <TrendingDown className="w-3.5 h-3.5" /> -0.5%
              </span>
              <span>vs semaine passée</span>
            </div>
          </div>
        </div>

        {/* Carte 4: INSCRIPTIONS EN ATTENTE */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">DOSSIERS D'INSCRIPTION</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">432</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-900 h-full w-[65%] rounded-full"></div>
              </div>
              <span className="text-xs text-slate-500 font-medium">65% Traités</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION CENTRALE (Graphique d'Assiduité vs Synthèse Financière) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Gauche: Performances Académiques vs Présences (8 Colonnes) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Performances Académiques vs Assiduité
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Analyse comparative annuelle de la moyenne des cotes et du taux de présence.
              </p>
            </div>

            {/* Boutons de bascule (Hebdomadaire, Mensuel, Annuel) */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
              {(['Hebdomadaire', 'Mensuel', 'Annuel'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodeGraphique(p)}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    periodeGraphique === p
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Graphique Recharts */}
          <div className="h-72 mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={donneesPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e293b" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="mois" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="moyenneCotes" 
                  stroke="#0f172a" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#gradeGradient)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="tauxPresence" 
                  stroke="#475569" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  fillOpacity={0} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Légende du Graphique */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-100 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
              <span>Moyenne Générale des Cotes (%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-600 border-dashed"></span>
              <span>Taux de Présence Élèves</span>
            </div>
          </div>
        </div>

        {/* Droite: Synthèse Financière (4 Colonnes) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Synthèse Financière
            </h2>

            {/* Graphique à barres trimestrielles */}
            <div className="h-48 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={donneesFinancieres} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <XAxis dataKey="trimestre" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Bar dataKey="val" fill="#1e293b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pilules récapitulatives */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Frais d'Études Minerval</span>
              </div>
              <span className="text-sm font-extrabold text-slate-900">$8.4M</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700">Subventions & Donateurs</span>
              </div>
              <span className="text-sm font-extrabold text-slate-900">$3.2M</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION INFÉRIEURE (3 Colonnes Égales) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Colonne 1: Événements du Calendrier Scolaire EPST */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Événements à Venir</h3>
              <MoreHorizontal className="w-5 h-5 text-slate-400 cursor-pointer" />
            </div>

            <div className="space-y-5">
              {mockEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-4">
                  <div className="bg-slate-100 rounded-xl p-2.5 text-center min-w-[54px]">
                    <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">{ev.dateJour.split(' ')[1]}</div>
                    <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{ev.dateJour.split(' ')[0]}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{ev.titre}</h4>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {ev.heureLieu}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="w-full mt-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors">
            Voir tout le Calendrier EPST
          </button>
        </div>

        {/* Colonne 2: Actualités du Personnel & Enseignants [DIRECT] */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Actualités Enseignants</h3>
              <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase">
                DIRECT
              </span>
            </div>

            <div className="space-y-5">
              {actualites.map((fu) => (
                <div key={fu.id} className="flex items-start gap-3 text-xs">
                  <img
                    src={fu.avatarUrl}
                    alt={fu.nomAuteur}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium">
                      <strong className="font-bold text-slate-900">{fu.nomAuteur}</strong> {fu.titre}
                    </p>
                    <span className="text-[11px] text-slate-400 block mt-1">{fu.ilYA}</span>

                    {fu.necessiteApprobation && (
                      <div className="flex gap-2 mt-2">
                        <button 
                          onClick={() => ApprouverConge(fu.id)}
                          className="px-3 py-1 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Approuver
                        </button>
                        <button 
                          onClick={() => ApprouverConge(fu.id)}
                          className="px-3 py-1 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Rejeter
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Colonne 3: État & Santé du Système */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Santé du Système</h3>
            </div>

            <div className="space-y-4">
              
              {/* Élément 1: Latence FlexPay API */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Latence Passerelle FlexPay Mobile</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      L'API FlexPay M-Pesa répond avec une latence moyenne de 850ms. Surveillance active.
                    </p>
                  </div>
                </div>
              </div>

              {/* Élément 2: Alerte Capacité SQLite */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></span>
                  <div className="flex-1">
                    <h4 className="font-bold text-xs text-slate-900">Alerte Capacité Base SQLite</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      La base de données locale est occupée à 82% d'espace alloué.
                    </p>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-amber-500 h-full w-[82%] rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Élément 3: Sauvegarde Nocturne */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Sauvegarde Automatique Réussie</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                      Tous les bulletins et registres financiers sont chiffrés et archivés.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
