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
  const academicGroup = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isPrimary: true },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
  ];

  const financeGroup = [
    { id: 'invoices', label: 'Invoices & Mobile', icon: Receipt },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
    { id: 'expenses', label: 'Expenses', icon: PieChart },
  ];

  const corporateGroup = [
    { id: 'documents', label: 'RDC Documents', icon: FileCheck },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'hr', label: 'HR Management', icon: Briefcase },
    { id: 'license', label: 'Offline Sync & HWID', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-screen flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold shadow-md">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
              ACADEMIA
            </h1>
            <span className="text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">
              ECOLISA RDC SaaS
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="p-4 space-y-6">
          {/* Main Dashboard Button */}
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
              DASHBOARD
            </button>
          </div>

          {/* ACADEMIC */}
          <div>
            <div className="px-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Academic
            </div>
            <div className="space-y-1">
              {academicGroup.slice(1).map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FINANCE */}
          <div>
            <div className="px-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Finance
            </div>
            <div className="space-y-1">
              {financeGroup.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CORPORATE */}
          <div>
            <div className="px-4 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Corporate & Docs
            </div>
            <div className="space-y-1">
              {corporateGroup.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-slate-100 text-slate-900 font-semibold' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Settings */}
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
          Settings
        </button>
      </div>
    </aside>
  );
};
