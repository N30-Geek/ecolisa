import React, { useState, useEffect } from 'react';
import { School } from 'lucide-react';
import type { SchoolConfig } from '../onboarding/OnboardingWizard';

interface SplashScreenProps {
  onLoaded?: () => void;
  isDarkMode?: boolean;
  schoolConfig?: SchoolConfig | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onLoaded,
  isDarkMode = true,
  schoolConfig,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Préparation de votre espace…');

  const steps = [
    { at: 15, text: 'Vérification du stockage local…' },
    { at: 40, text: 'Chargement des référentiels EPST…' },
    { at: 65, text: 'Synchronisation comptes et caisse…' },
    { at: 85, text: 'Initialisation du portail…' },
    { at: 100, text: 'Prêt' },
  ];

  useEffect(() => {
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
        }, 350);
      }
    }, 520);

    return () => clearInterval(progressInterval);
  }, [onLoaded]);

  const schoolName = schoolConfig?.schoolName || 'ECOLISA';
  const subtitle = schoolConfig?.secopeCode
    ? `EPST · ${schoolConfig.secopeCode}`
    : 'ERP scolaire · République Démocratique du Congo';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-500 ${
        isFinishing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: isDarkMode ? '#f8fafc' : '#ffffff' }}
    >
      {/* Cercles d'ambiance très légers */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 520,
          height: 520,
          background: 'radial-gradient(circle, rgba(0,102,204,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Carte centrale minimaliste */}
      <div
        className="relative z-10 w-full max-w-[420px] mx-6 text-center"
      >
        {/* Logo / école */}
        <div className="mb-8 flex justify-center">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
            style={{
              background: schoolConfig?.logoUrl ? '#ffffff' : '#0066cc',
              border: '1px solid rgba(0,102,204,0.12)',
            }}
          >
            {schoolConfig?.logoUrl ? (
              <img
                src={schoolConfig.logoUrl}
                alt="Logo"
                className="w-16 h-16 object-contain rounded-xl"
              />
            ) : (
              <School className="w-9 h-9 text-white" />
            )}
          </div>
        </div>

        {/* Titre */}
        <h1
          className="text-2xl font-black tracking-tight mb-1"
          style={{ color: '#0f172a' }}
        >
          {schoolName}
        </h1>
        <p
          className="text-sm font-medium tracking-wide mb-10"
          style={{ color: '#64748b' }}
        >
          {subtitle}
        </p>

        {/* Barre de progression fine */}
        <div className="w-full max-w-[280px] mx-auto mb-3">
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(0,102,204,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: '#0066cc',
              }}
            />
          </div>
        </div>

        {/* Texte de statut */}
        <p
          className="text-xs font-medium"
          style={{ color: '#94a3b8' }}
        >
          {statusText}
        </p>
      </div>

      {/* Petit crédit discret en bas */}
      <div
        className="absolute bottom-6 left-0 right-0 text-center text-[11px] font-medium"
        style={{ color: '#cbd5e1' }}
      >
        ECOLISA ERP · Offline-first · RDC
      </div>
    </div>
  );
};
