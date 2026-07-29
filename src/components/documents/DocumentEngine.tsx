import React, { useState } from 'react';
import { mockStudents, mockSubjects } from '../../data/mockData';
import { FileCheck, Printer } from 'lucide-react';

export const DocumentEngine: React.FC = () => {
  const [docType, setDocType] = useState<'BULLETIN' | 'CERTIFICAT' | 'PALMARES'>('BULLETIN');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('std-1'); // Gloire Kambale

  const eleve = mockStudents.find(s => s.id === selectedStudentId) || mockStudents[0];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Moteur d'Édition des Documents Officiels EPST RDC
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Bulletins scolaires homologués, Certificats de scolarité, Procès-verbaux et Palmarès.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Imprimer le Document PDF
          </button>
        </div>
      </div>

      {/* Barre de sélection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <span className="text-xs font-bold text-slate-500 uppercase">Document :</span>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setDocType('BULLETIN')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                docType === 'BULLETIN' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulletin Scolaire RDC
            </button>
            <button
              onClick={() => setDocType('CERTIFICAT')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                docType === 'CERTIFICAT' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Certificat de Scolarité
            </button>
            <button
              onClick={() => setDocType('PALMARES')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                docType === 'PALMARES' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Palmarès Annuel
            </button>
          </div>
        </div>

        {/* Sélecteur d'Élève */}
        {docType !== 'PALMARES' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Élève :</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {mockStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.prenom} {s.nom} ({s.nomClasse})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* CONTENEUR DE PRÉVISUALISATION DU DOCUMENT */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 max-w-4xl mx-auto font-sans leading-relaxed">
        
        {/* DOCUMENT TYPE 1: BULLETIN SCOLAIRE RDC */}
        {docType === 'BULLETIN' && (
          <div className="space-y-6">
            
            {/* Header Officiel RDC */}
            <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
              <h2 className="font-extrabold text-sm uppercase tracking-widest text-slate-900">
                RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
              </h2>
              <h3 className="font-bold text-xs uppercase text-slate-700">
                MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE (EPST)
              </h3>
              <div className="text-[11px] font-bold text-indigo-700 uppercase">
                COMPLEXE SCOLAIRE ACADEMIA / ECOLISA - KINSHASA / GOMBE
              </div>
              <div className="inline-block mt-2 px-4 py-1 bg-slate-900 text-white font-extrabold text-sm tracking-wider uppercase rounded-md">
                BULLETIN SCOLAIRE • ANNÉE SCOLAIRE 2025 - 2026
              </div>
            </div>

            {/* Fiche Élève */}
            <div className="grid grid-cols-2 gap-4 text-xs font-bold bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <div>Nom & Prénom : <span className="text-slate-900 font-extrabold">{eleve.prenom} {eleve.nom} {eleve.postnom || ''}</span></div>
                <div>Matricule EPST : <span className="font-mono text-indigo-700">{eleve.registrationNumber}</span></div>
                <div>Lieu & Date Naiss. : <span className="text-slate-700">{eleve.lieuNaissance}, {eleve.dateNaissance}</span></div>
              </div>
              <div>
                <div>Classe & Option : <span className="text-slate-900 font-extrabold">{eleve.nomClasse}</span></div>
                <div>Niveau CITE : <span className="text-slate-700">CITE 344 (Humanités Scientifiques)</span></div>
                <div>Professeur Titulaire : <span className="text-slate-700">Prof. Alan Turing</span></div>
              </div>
            </div>

            {/* Tableau des Cotes */}
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-extrabold text-slate-900 uppercase border-b border-slate-300">
                  <th className="p-2 border-r border-slate-300">Branche / Discipline</th>
                  <th className="p-2 border-r border-slate-300 text-center">Max</th>
                  <th className="p-2 border-r border-slate-300 text-center">1er Trim</th>
                  <th className="p-2 border-r border-slate-300 text-center">2e Trim</th>
                  <th className="p-2 border-r border-slate-300 text-center">3e Trim</th>
                  <th className="p-2 text-center">Exam. d'État / Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockSubjects.map((sub, idx) => (
                  <tr key={sub.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{sub.nom}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono">{sub.maxScore * sub.coefficient}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-800">{(16.5 * sub.coefficient).toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-800">{(17.0 * sub.coefficient).toFixed(1)}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-400">-</td>
                    <td className="p-2 text-center font-mono font-extrabold text-indigo-700">{(33.5 * sub.coefficient).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td className="p-2.5 border-r border-slate-700 uppercase">TOTAL GÉNÉRAL & POURCENTAGE</td>
                  <td className="p-2.5 border-r border-slate-700 text-center font-mono">340</td>
                  <td className="p-2.5 border-r border-slate-700 text-center font-mono text-emerald-400">84.2%</td>
                  <td className="p-2.5 border-r border-slate-700 text-center font-mono text-emerald-400">86.5%</td>
                  <td className="p-2.5 border-r border-slate-700 text-center font-mono text-slate-400">-</td>
                  <td className="p-2.5 text-center font-mono text-emerald-400 text-sm">85.3%</td>
                </tr>
              </tfoot>
            </table>

            {/* Appréciations & Sceau */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 border border-slate-200 rounded-xl space-y-2">
                <div className="font-extrabold text-slate-900 uppercase">Appréciation du Titulaire :</div>
                <p className="text-slate-700 italic">
                  "Élève très brillant, régulier dans l'effort et faisant preuve de qualités d'analyse exceptionnelles."
                </p>
                <div className="pt-2 text-slate-500 font-semibold">Rang : <strong className="text-slate-900">1er sur 32 élèves</strong></div>
              </div>

              <div className="p-4 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 uppercase">Sceau & Signatures :</div>
                  <div className="text-[11px] text-slate-500 mt-1">Fait à Kinshasa, le 29 Juillet 2026</div>
                </div>

                <div className="flex justify-between items-end pt-6 font-bold text-[11px]">
                  <div className="text-center">
                    <div>Le Préfet des Études</div>
                    <div className="h-10 text-indigo-700 italic font-mono flex items-end">Dr. Sarah Jenkins</div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-[9px] uppercase tracking-tighter text-center leading-none p-1">
                    Sceau Officiel EPST
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* DOCUMENT TYPE 2: CERTIFICAT DE SCOLARITE */}
        {docType === 'CERTIFICAT' && (
          <div className="space-y-8 py-8 text-center">
            <div className="space-y-1">
              <h2 className="font-extrabold text-sm uppercase tracking-widest text-slate-900">
                RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
              </h2>
              <h3 className="font-bold text-xs uppercase text-slate-600">
                MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE
              </h3>
            </div>

            <div className="my-6">
              <h1 className="text-2xl font-black uppercase text-indigo-900 tracking-wider">
                CERTIFICAT DE SCOLARITÉ
              </h1>
            </div>

            <div className="text-sm leading-relaxed text-slate-800 text-justify space-y-4 max-w-xl mx-auto font-serif">
              <p>
                Je soussigné, <strong>Préfet des Études</strong> du Complexe Scolaire ACADEMIA / ECOLISA (Agrément Ministériel N° EPST/KIN/2026), certifie par la présente que l'élève :
              </p>
              
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center font-sans font-bold text-slate-900 text-base">
                {eleve.prenom.toUpperCase()} {eleve.nom.toUpperCase()} {eleve.postnom ? eleve.postnom.toUpperCase() : ''}
              </div>

              <p>
                Né(e) à <strong>{eleve.lieuNaissance}</strong>, le <strong>{eleve.dateNaissance}</strong>, sous le matricule national <strong>{eleve.registrationNumber}</strong>, est régulièrement inscrit(e) dans notre établissement pour l'année scolaire <strong>2025 - 2026</strong> en classe de :
              </p>

              <div className="p-3 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-center font-sans font-extrabold text-sm">
                {eleve.nomClasse.toUpperCase()} (Cycle Humanités - CITE 344)
              </div>

              <p>
                En foi de quoi, ce certificat lui est délivré pour servir et valoir ce que de droit.
              </p>
            </div>

            <div className="pt-12 flex justify-between items-center text-xs font-bold max-w-xl mx-auto">
              <div>Kinshasa, le 29 Juillet 2026</div>
              <div>Le Chef d'Établissement</div>
            </div>
          </div>
        )}

        {/* DOCUMENT TYPE 3: PALMARES ANNUEL */}
        {docType === 'PALMARES' && (
          <div className="space-y-6">
            <div className="text-center border-b border-slate-200 pb-4">
              <h2 className="font-extrabold text-base uppercase tracking-tight text-slate-900">
                PALMARÈS GÉNÉRAL DES RÉSULTATS ANNUELS (EPST RDC)
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Année Scolaire 2025-2026 • Promotion: 3ème Math-Physique
              </p>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-extrabold text-slate-900 uppercase">
                  <th className="p-3">Rang</th>
                  <th className="p-3">Matricule EPST</th>
                  <th className="p-3">Nom & Prénom</th>
                  <th className="p-3 text-center">Total Points</th>
                  <th className="p-3 text-center">Pourcentage %</th>
                  <th className="p-3 text-right">Décision du Conseil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mockStudents.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{idx + 1}er</td>
                    <td className="p-3 font-mono text-indigo-700">{std.registrationNumber}</td>
                    <td className="p-3 font-bold text-slate-800">{std.prenom} {std.nom}</td>
                    <td className="p-3 font-mono text-center font-bold">290 / 340</td>
                    <td className="p-3 font-mono text-center font-extrabold text-emerald-700">85.3%</td>
                    <td className="p-3 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        PROMU EN CLASSE SUPÉRIEURE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
