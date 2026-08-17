import React, { useState, useEffect } from 'react';
import { 
  School, 
  Sparkles, 
  Database, 
  ShieldCheck, 
  GraduationCap, 
  Wallet, 
  FileSpreadsheet, 
  Layers,
  Award
} from 'lucide-react';
import type { SchoolConfig } from '../onboarding/OnboardingWizard';

interface SplashScreenProps {
  onLoaded?: () => void;
  isDarkMode?: boolean;
  schoolConfig?: SchoolConfig | null;
}

interface Slide {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    tag: 'OFFLINE-FIRST RDC',
    title: 'ECOLISA Enterprise ERP',
    subtitle: 'La suite logicielle complète pour la gestion scolaire d’excellence',
    icon: School,
  },
  {
    id: 2,
    tag: 'SÉCURITÉ & DONNÉES LOCALES',
    title: 'Moteur SQLite & 512-bit scrypt',
    subtitle: 'Vos données restent 100% sous votre contrôle et sécurisées sur votre machine',
    icon: ShieldCheck,
  },
  {
    id: 3,
    tag: 'CONFORMITÉ NATIONALE EPST',
    title: 'Pédagogie, Bulletins & Palmarès',
    subtitle: 'Gestion des cotes, présences, grilles horaires et référentiels officiels',
    icon: GraduationCap,
  },
  {
    id: 4,
    tag: 'COMPTABILITÉ & TRÉSORERIE',
    title: 'Caisse, Frais & Rapprochements',
    subtitle: 'Suivi des paiements, reçus thermiques, plan comptable et gestion des dépenses',
    icon: Wallet,
  },
];

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onLoaded,
  isDarkMode = true,
  schoolConfig,
}) => {
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [progress, setProgress] = useState<number>(8);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Démarrage des services locaux...');

  // Diapositives automatiques
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 1800);
    return () => clearInterval(slideInterval);
  }, []);

  // Progression fluide du chargement
  useEffect(() => {
    const steps = [
      { at: 20, text: 'Vérification du stockage SQLite...' },
      { at: 45, text: 'Chargement des référentiels EPST & Devises...' },
      { at: 70, text: 'Synchronisation du plan comptable & Caisse...' },
      { at: 90, text: 'Préparation du portail d’accès multi-comptes...' },
      { at: 100, text: 'Prêt ! Lancement de votre espace...' },
    ];

    let stepIdx = 0;
    const progressInterval = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].at);
        setStatusText(steps[stepIdx].text);
        stepIdx++;
      } else {
        clearInterval(progressInterval);
        setIsFinishing(true);
        setTimeout(() => {
          if (onLoaded) onLoaded();
        }, 400);
      }
    }, 600);

    return () => clearInterval(progressInterval);
  }, [onLoaded]);

  const slide = SLIDES[activeSlide];
  const SlideIcon = slide.icon;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center select-none overflow-hidden transition-all duration-500 ${
        isFinishing ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
      } ${
        isDarkMode ? 'bg-slate-950/90 text-slate-100' : 'bg-slate-900/60 text-slate-900'
      } backdrop-blur-xl`}
    >
      {/* Halo lumineux d'ambiance en arrière-plan */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />

      {/* POPUP / MODAL FLOTTANT MINIMALISTE & PROFESSIONNEL */}
      <div 
        className={`w-full max-w-[460px] mx-4 rounded-3xl border shadow-2xl overflow-hidden relative flex flex-col transition-all duration-300 ${
          isDarkMode 
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-indigo-950/50' 
            : 'bg-white/95 border-slate-200 text-slate-900 shadow-slate-900/20'
        }`}
        style={{ backdropFilter: 'blur(24px)' }}
      >
        {/* Contenu supérieur centré */}
        <div className="px-8 pt-9 pb-6 flex flex-col items-center text-center">
          
          {/* GRAND LOGO MAJESTUEUX CENTRÉ AVEC ÉCLAT */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/25 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-1 shadow-xl flex items-center justify-center border border-indigo-400/40">
              {schoolConfig?.logoUrl ? (
                <img 
                  src={schoolConfig.logoUrl} 
                  alt="Logo Établissement" 
                  className="w-full h-full object-cover rounded-[20px]" 
                />
              ) : (
                <div className="w-full h-full rounded-[20px] bg-slate-950/30 backdrop-blur-xs flex items-center justify-center">
                  <School className="w-12 h-12 text-white drop-shadow-md animate-bounce-subtle" />
                </div>
              )}
            </div>
            
            <div className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-emerald-500 text-white shadow-md border-2 border-slate-900">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* TITRE ÉCOLE OU NOM DE L'APPLICATION */}
          <h1 className="text-xl font-black tracking-tight mb-1">
            {schoolConfig?.schoolName || 'ECOLISA Enterprise'}
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-6">
            {schoolConfig?.secopeCode ? `SECOPE : ${schoolConfig.secopeCode}` : 'ERP Scolaire Certifié · RDC'}
          </p>

          {/* ZONE DIAPOSITIVES (SLIDES DE PRÉSENTATION ANIMÉES) */}
          <div className={`w-full min-h-[100px] p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center text-center ${
            isDarkMode 
              ? 'bg-slate-950/50 border-slate-800/80' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div key={slide.id} className="animate-fade-in flex flex-col items-center">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                <SlideIcon className="w-3 h-3" />
                <span>{slide.tag}</span>
              </div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-100 dark:text-slate-100">
                {slide.title}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 max-w-xs leading-relaxed font-medium">
                {slide.subtitle}
              </p>
            </div>
          </div>

          {/* INDICATEURS POINTS DES DIAPOS */}
          <div className="flex items-center justify-center gap-1.5 mt-4 mb-2">
            {SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeSlide 
                    ? 'w-6 bg-indigo-500 shadow-xs shadow-indigo-500/50' 
                    : 'w-1.5 bg-slate-700/60 hover:bg-slate-600'
                }`}
                aria-label={`Diapo ${idx + 1}`}
              />
            ))}
          </div>

        </div>

        {/* PIED DE PAGE : STATUT & BARRE DE CHARGEMENT ÉPURÉE TOUT EN BAS */}
        <div className={`px-8 pt-3 pb-6 border-t ${
          isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
        }`}>
          {/* Label de statut & pourcentage */}
          <div className="flex items-center justify-between text-xs font-semibold mb-2.5">
            <span className="text-slate-400 text-[11.5px] truncate max-w-[280px]">
              {statusText}
            </span>
            <span className="font-black text-indigo-400">
              {progress}%
            </span>
          </div>

          {/* BARRE DE CHARGEMENT FLUIDE TOUT EN BAS */}
          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-slate-700/40 relative shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-400 transition-all duration-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/25 animate-shimmer" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
