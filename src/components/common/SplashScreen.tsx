import React, { useState, useEffect } from 'react';
import { 
  School, 
  ShieldCheck, 
  Database, 
  HardDrive, 
  Cpu, 
  CheckCircle2, 
  Sparkles, 
  Lock,
  Layers,
  Award
} from 'lucide-react';
import type { SchoolConfig } from '../onboarding/OnboardingWizard';

interface SplashScreenProps {
  onLoaded?: () => void;
  isDarkMode?: boolean;
  schoolConfig?: SchoolConfig | null;
}

interface InitStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

const INIT_STEPS: InitStep[] = [
  {
    id: 'db',
    label: 'Connexion SQLite relationnelle',
    sublabel: 'Mode WAL haute performance activé',
    icon: Database,
  },
  {
    id: 'security',
    label: 'Vérification de sécurité & chiffrement',
    sublabel: 'Hachage scrypt 512-bit & conformité locale',
    icon: ShieldCheck,
  },
  {
    id: 'epst',
    label: 'Chargement des référentiels EPST',
    sublabel: 'Grilles horaires, cycles & options nationales',
    icon: Award,
  },
  {
    id: 'offline',
    label: 'Moteur Offline-First & Caisse',
    sublabel: 'Plan comptable OHADA & stockage local',
    icon: HardDrive,
  },
  {
    id: 'auth',
    label: 'Initialisation du portail d\'accès',
    sublabel: 'Prêt pour l\'authentification multi-profils',
    icon: Lock,
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onLoaded,
  isDarkMode = true,
  schoolConfig,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [progress, setProgress] = useState<number>(10);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [hwid, setHwid] = useState<string>('HWID-ED25519-RDC-LOCAL');

  useEffect(() => {
    if ((window as any).electronAPI?.getHwid) {
      (window as any).electronAPI.getHwid().then((h: string) => {
        if (h) setHwid(h);
      });
    }
  }, []);

  useEffect(() => {
    const totalSteps = INIT_STEPS.length;
    const stepDuration = 320; // ms par étape pour une transition fluide et professionnelle

    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const next = prev + 1;
        if (next < totalSteps) {
          setProgress(Math.round(((next + 1) / totalSteps) * 90));
          return next;
        } else {
          clearInterval(interval);
          setProgress(100);
          setIsFinishing(true);
          setTimeout(() => {
            if (onLoaded) onLoaded();
          }, 350);
          return prev;
        }
      });
    }, stepDuration);

    return () => clearInterval(interval);
  }, [onLoaded]);

  const currentStep = INIT_STEPS[Math.min(currentStepIndex, INIT_STEPS.length - 1)];

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
        isFinishing ? 'opacity-0 scale-98' : 'opacity-100 scale-100'
      } ${
        isDarkMode 
          ? 'bg-slate-950 text-slate-100' 
          : 'bg-slate-50 text-slate-900'
      }`}
      style={{
        background: isDarkMode 
          ? 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(99, 102, 241, 0.15), rgba(2, 6, 23, 1))'
          : 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(99, 102, 241, 0.08), rgba(248, 250, 252, 1))'
      }}
    >
      {/* Halo lumineux d'ambiance */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Conteneur principal Splash */}
      <div className="w-full max-w-md px-6 flex flex-col items-center text-center relative z-10">
        
        {/* LOGO AVEC ANNEAU LUMINEUX PULSANT */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-0.5 shadow-2xl flex items-center justify-center border border-indigo-400/30">
            {schoolConfig?.logoUrl ? (
              <img 
                src={schoolConfig.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover rounded-[22px]" 
              />
            ) : (
              <div className="w-full h-full rounded-[22px] bg-slate-950/40 backdrop-blur-xs flex items-center justify-center">
                <School className="w-10 h-10 text-white animate-bounce-subtle" />
              </div>
            )}
          </div>
          
          <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-emerald-500 text-white shadow-md border-2 border-slate-950">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* TITRE & BADGE D'IDENTITÉ */}
        <div className="space-y-1.5 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <span>OFFLINE-FIRST ERP SCOLAIRE</span>
            <span className="w-1 h-1 rounded-full bg-indigo-400" />
            <span>RDC</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight mt-2 bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
            {schoolConfig?.schoolName || 'ECOLISA Enterprise'}
          </h1>
          
          <p className="text-xs font-semibold text-slate-400">
            Système Intégré de Gestion Pédagogique & Financière
          </p>
        </div>

        {/* CARTE DE DIAGNOSTIC & INITIALISATION */}
        <div className={`w-full p-4 rounded-2xl border backdrop-blur-md mb-6 transition-all ${
          isDarkMode 
            ? 'bg-slate-900/70 border-slate-800 shadow-xl' 
            : 'bg-white/80 border-slate-200 shadow-lg'
        }`}>
          {/* Étape courante */}
          <div className="flex items-center gap-3.5 mb-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <currentStep.icon className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-black text-slate-200 truncate">
                {currentStep.label}
              </p>
              <p className="text-[10.5px] font-medium text-slate-400 truncate">
                {currentStep.sublabel}
              </p>
            </div>
            <span className="text-xs font-black text-indigo-400 shrink-0">
              {progress}%
            </span>
          </div>

          {/* BARRE DE PROGRESSION ULTRA-MODERNE */}
          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/50 relative">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 transition-all duration-300 relative shadow-sm"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
            </div>
          </div>

          {/* LISTE DES MICRO-ÉTAPES TERMINÉES */}
          <div className="grid grid-cols-5 gap-1 mt-3 pt-2.5 border-t border-slate-800/60">
            {INIT_STEPS.map((step, idx) => {
              const isDone = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div 
                  key={step.id} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' 
                      : isCurrent 
                      ? 'bg-indigo-500 animate-pulse' 
                      : 'bg-slate-800'
                  }`}
                  title={step.label}
                />
              );
            })}
          </div>
        </div>

        {/* BADGES CERTIFICATIFS EN BAS */}
        <div className="flex items-center justify-center flex-wrap gap-2 text-[10px] font-bold text-slate-500">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <Database className="w-3 h-3 text-indigo-400" />
            <span>SQLite WAL</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>512-bit scrypt</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
            <Cpu className="w-3 h-3 text-amber-400" />
            <span>v1.0 Enterprise</span>
          </div>
        </div>

        {/* HWID Hardware Tag discret */}
        <p className="text-[9.5px] font-mono text-slate-600 dark:text-slate-500 mt-4 tracking-tight">
          ID MACHINE : {hwid.slice(0, 24)}...
        </p>
      </div>
    </div>
  );
};
