import React from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  Receipt, 
  Wallet, 
  PieChart, 
  MessageSquare, 
  Megaphone, 
  Briefcase, 
  Settings,
  ShieldCheck,
  FileCheck
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const groupeAcademique = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, estPrincipal: true },
    { id: 'students', label: 'Élèves & Inscriptions', icon: GraduationCap },
    { id: 'teachers', label: 'Corps Enseignant', icon: Users },
    { id: 'classes', label: 'Classes & Salles', icon: BookOpen },
    { id: 'schedule', label: 'Emploi du Temps', icon: Calendar },
  ];

  const groupeFinance = [
    { id: 'invoices', label: 'Factures & Mobile Money', icon: Receipt },
    { id: 'payroll', label: 'Paie du Personnel', icon: Wallet },
    { id: 'expenses', label: 'Caisse & Dépenses', icon: PieChart },
  ];

  const groupeCorporatif = [
    { id: 'documents', label: 'Documents EPST RDC', icon: FileCheck },
    { id: 'messages', label: 'Messagerie', icon: MessageSquare },
    { id: 'announcements', label: 'Communiqués', icon: Megaphone },
    { id: 'hr', label: 'Ressources Humaines', icon: Briefcase },
    { id: 'license', label: 'Licence & Synchro Offline', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between select-none">
      <div>
        {/* En-tête Marque */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shadow-md">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
              ECOLISA
            </h1>
            <span className="text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">
              Desktop RDC SaaS
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 space-y-6">
          {/* Bouton Dashboard */}
          <div>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`} />
              TABLEAU DE BORD
            </button>
          </div>

          {/* ACADÉMIQUE */}
          <div>
            <div className="px-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Académique
            </div>
            <div className="space-y-1">
              {groupeAcademique.slice(1).map((item) => {
                const Icon = item.icon;
                const estActif = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      estActif 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${estActif ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FINANCES */}
          <div>
            <div className="px-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Finances & Caisse
            </div>
            <div className="space-y-1">
              {groupeFinance.map((item) => {
                const Icon = item.icon;
                const estActif = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      estActif 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${estActif ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DOCUMENTS & APPLICATION */}
          <div>
            <div className="px-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Documents & Système
            </div>
            <div className="space-y-1">
              {groupeCorporatif.map((item) => {
                const Icon = item.icon;
                const estActif = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      estActif 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${estActif ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Paramètres */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'settings' 
              ? 'bg-slate-100 text-slate-900 font-semibold' 
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 text-slate-400" />
          Paramètres Général
        </button>
      </div>
    </aside>
  );
};
