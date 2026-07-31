import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Cpu, Command, ShieldCheck } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      getHwid: () => Promise<string>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      platform?: string;
      isElectron?: boolean;
    };
  }
}

interface TitleBarProps {
  isOnline: boolean;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isOnline }) => {
  const [isMaximized, setIsMaximized] = useState(true);

  useEffect(() => {
    if (window.electronAPI?.isMaximized) {
      window.electronAPI.isMaximized().then(setIsMaximized).catch(() => {});
    }
  }, []);

  const handleMinimize = () => {
    window.electronAPI?.minimize();
  };

  const handleMaximize = () => {
    if (window.electronAPI?.maximize) {
      window.electronAPI.maximize();
      setIsMaximized((prev) => !prev);
    }
  };

  const handleClose = () => {
    window.electronAPI?.close();
  };

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div
      className="h-8 flex items-center justify-between px-3 select-none z-50 shrink-0 text-xs border-b transition-colors duration-200"
      style={{
        ...dragStyle,
        background: 'var(--titlebar-bg)',
        color: 'var(--titlebar-text)',
        borderColor: 'var(--titlebar-border)',
      }}
    >
      {/* Left: App Branding & Status Badges */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 font-black tracking-tight text-[11.5px]">
          <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white text-[9.5px] font-black shadow-xs">
            E
          </div>
          <span className="tracking-wider">ECOLISA</span>
          <span className="text-[9.5px] font-bold opacity-50 uppercase tracking-widest hidden sm:inline">
            • ERP EPST RDC
          </span>
        </div>

        {/* Offline / Online Engine Pill */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold border shadow-2xs"
          style={{
            ...noDragStyle,
            background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            borderColor: isOnline ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            color: isOnline ? '#10b981' : '#f59e0b',
          }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <span>{isOnline ? 'EN LIGNE (CLOUD)' : 'HORS-LIGNE (SQLITE)'}</span>
        </div>
      </div>

      {/* Center: System Performance & Shortcut Tip */}
      <div className="hidden lg:flex items-center gap-3 text-[10px] font-semibold opacity-75">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Moteur P2P Local • 0.4ms Latence</span>
        </div>
        <span className="w-1 h-1 rounded-full bg-slate-400 opacity-40" />
        <div className="flex items-center gap-1 text-slate-400">
          <Command className="w-3 h-3 text-indigo-400" />
          <span>Appuyer sur <kbd className="font-mono text-indigo-400 font-bold px-1 bg-slate-500/10 rounded">Ctrl+K</kbd> pour la recherche</span>
        </div>
      </div>

      {/* Right: Window Controls */}
      <div className="flex items-center gap-0.5 -mr-1" style={noDragStyle}>
        <button
          onClick={handleMinimize}
          className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-slate-500/20 active:scale-95 transition-all cursor-pointer"
          style={{ color: 'var(--titlebar-text)' }}
          title="Réduire la fenêtre"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-slate-500/20 active:scale-95 transition-all cursor-pointer"
          style={{ color: 'var(--titlebar-text)' }}
          title={isMaximized ? "Réduire la taille" : "Agrandir"}
        >
          {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-red-600 hover:text-white active:scale-95 transition-all cursor-pointer"
          style={{ color: 'var(--titlebar-text)' }}
          title="Fermer l'application"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
