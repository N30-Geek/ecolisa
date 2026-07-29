import React, { useState } from 'react';
import { Search, Bell, Wifi, WifiOff, Shield, ChevronDown, Sparkles } from 'lucide-react';
import { RôleSystème } from '../../types';

interface NavbarProps {
  userRole: RôleSystème;
  setUserRole: (role: RôleSystème) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  pendingQueueCount: number;
  onOpenOnboarding: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userRole,
  setUserRole,
  isOnline,
  setIsOnline,
  pendingQueueCount,
  onOpenOnboarding
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  const roleLabels: Record<RôleSystème, string> = {
    PROMOTEUR_ADMIN: 'Dr. Admin (Promoteur Général)',
    PREFET_DIRECTEUR: 'Préfet des Études / Directeur',
    DIRECTEUR_ETUDES: 'Directeur des Études (D.E.)',
    DIRECTEUR_DISCIPLINE: 'Directeur de Discipline (D.D.)',
    COMPTABLE: 'Comptable / Intendant',
    TITULAIRE: 'Titulaire de Classe',
    ENSEIGNANT: 'Professeur / Enseignant',
    PARENT_ELEVE: 'Espace Parent / Élève',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Barre de recherche */}
      <div className="relative w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Rechercher un élève, matricule, classe..."
          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Contrôles droite */}
      <div className="flex items-center gap-4">
        {/* Assistant Préconfiguration */}
        <button
          onClick={onOpenOnboarding}
          className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-full text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Assistant Initialisation</span>
        </button>

        {/* Indicateur Synchro Hors-Ligne */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          title="Basculer la simulation de mode réseau/hors-ligne"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>EN LIGNE (Synchronisé)</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-600" />
              <span>HORS LIGNE ({pendingQueueCount} en attente)</span>
            </>
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-slate-900">Notifications Directives</h4>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">3 Nouvelles</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-800">Paiement FlexPay Validé</p>
                  <p className="text-slate-500">M-Pesa reçu pour Gloire Kambale ($280.00)</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="font-semibold text-slate-800">Cotes de 3ème Math Validées</p>
                  <p className="text-slate-500">Prof. Alan Turing a encodé l'examen du 1er Trimestre.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profil Administrateur & Sélecteur RBAC */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-3 pl-2 pr-3 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="text-right hidden sm:block">
              <div className="font-bold text-sm text-slate-900 leading-tight">Dr. Admin</div>
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase">PROMOTEUR ADMIN</div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
              alt="Avatar Dr Admin"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-100 shadow-sm"
            />
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50">
              <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                Changer le Rôle Actif (Test RBAC)
              </div>
              <div className="py-1 space-y-0.5">
                {(Object.keys(roleLabels) as RôleSystème[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setUserRole(r);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                      userRole === r 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{roleLabels[r]}</span>
                    {userRole === r && <Shield className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
