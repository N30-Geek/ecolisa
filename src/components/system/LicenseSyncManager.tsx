import React, { useState, useEffect } from 'react';
import { OfflineStorageService } from '../../services/offlineStorage';
import { LicenceOffline, StatutSynchro } from '../../types';
import { 
  ShieldCheck, 
  Cpu, 
  Key, 
  RefreshCw, 
  Database, 
  CheckCircle2, 
  Clock
} from 'lucide-react';

export const LicenseSyncManager: React.FC = () => {
  const [licence, setLicence] = useState<LicenceOffline>(OfflineStorageService.getLicense());
  const [statutSynchro, setStatutSynchro] = useState<StatutSynchro>(OfflineStorageService.getSyncStatus());
  const [fileAttente, setFileAttente] = useState<any[]>(OfflineStorageService.getPendingQueue());
  const [estEnSynchro, setEstEnSynchro] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatutSynchro(OfflineStorageService.getSyncStatus());
      setFileAttente(OfflineStorageService.getPendingQueue());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateAddQueueItem = () => {
    OfflineStorageService.enqueueOfflineChange('students', 'INSERT', {
      prenom: 'Alain',
      nom: 'Muka',
      registrationNumber: `2026-ED-${Math.floor(1000 + Math.random() * 9000)}`
    });
    setFileAttente(OfflineStorageService.getPendingQueue());
  };

  const handleForceSync = () => {
    setEstEnSynchro(true);
    setTimeout(() => {
      OfflineStorageService.clearQueue();
      setFileAttente([]);
      setStatutSynchro(OfflineStorageService.getSyncStatus());
      setEstEnSynchro(false);
    }, 1200);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-300">
      
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Moteur Offline-First & Module de Licence Cryptographique
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Vérification locale Ed25519, Empreinte Matérielle (HWID), Période de Grâce & Synchronisation SQLite ↔ Supabase.
        </p>
      </div>

      {/* Cartes d'État */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Carte 1: Statut Licence */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Statut Licence Offline</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              {licence.typePlan} PLAN (ACTIF)
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Valide jusqu'au <strong>{licence.expireLe}</strong> ({licence.joursRestants} jours restants)
            </p>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 font-medium">
            Signature cryptographique <strong>Ed25519</strong> contrôlée localement en mémoire sans aucun appel réseau.
          </div>
        </div>

        {/* Carte 2: Empreinte HWID */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empreinte Matérielle (HWID)</span>
            <Cpu className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-sm font-mono font-bold text-slate-900 truncate">
              {licence.hwid}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Calculé via <code>node-machine-id</code> (Combinaison CPU ID + Serial Disque).
            </p>
          </div>
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-[11px] text-indigo-900 font-medium flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            Empêche le duplicata non autorisé sur d'autres PC.
          </div>
        </div>

        {/* Carte 3: Période de Grâce */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Période de Grâce (Grace Period)</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-slate-900">
              14 Jours Accordés
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Prolongation automatique si expiration hors-ligne jusqu'au {licence.graceJusquAu}.
            </p>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
            Garantit l'accès ininterrompu au personnel même en cas de coupure Internet prolongée.
          </div>
        </div>

      </div>

      {/* FILE D'ATTENTE SYNCHRO SQLITE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              File d'Attente de Synchronisation SQLite ↔ Supabase Postgres
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Les écritures hors-ligne sont enregistrées instantanément en local, puis synchronisées en arrière-plan.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSimulateAddQueueItem}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
            >
              + Simuler Écriture Hors-Ligne
            </button>
            
            <button
              disabled={estEnSynchro || fileAttente.length === 0}
              onClick={handleForceSync}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${estEnSynchro ? 'animate-spin' : ''}`} />
              {estEnSynchro ? 'Synchronisation Supabase...' : 'Forcer la Sync Cloud'}
            </button>
          </div>
        </div>

        {/* Tableau de la file d'attente */}
        <div className="overflow-x-auto">
          {fileAttente.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-slate-800">Toutes les données sont synchronisées</h4>
              <p className="text-xs text-slate-400 mt-1">Aucune mutation locale en attente dans SQLite.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">ID Transaction</th>
                  <th className="py-3 px-4">Table SQLite</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Horodatage</th>
                  <th className="py-3 px-4">Payload Données</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {fileAttente.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-indigo-600 font-bold">{item.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{item.table}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                        {item.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{item.timestamp}</td>
                    <td className="py-3 px-4 text-slate-700 truncate max-w-xs">
                      {JSON.stringify(item.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
