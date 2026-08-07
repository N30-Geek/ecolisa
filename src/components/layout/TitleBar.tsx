import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, Cpu, Command } from 'lucide-react';

declare global {
  interface Window {
    electronAPI?: {
      getHwid: () => Promise<string>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      dbLoad?: () => Promise<any>;
      dbSave?: (state: any) => Promise<{ success: boolean; error?: string }>;
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

  const handleMinimize = () => { window.electronAPI?.minimize(); };
  const handleMaximize = () => {
    if (window.electronAPI?.maximize) {
      window.electronAPI.maximize();
      setIsMaximized((prev) => !prev);
    }
  };
  const handleClose = () => { window.electronAPI?.close(); };

  const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties;
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div
      className="h-8 flex items-center justify-between px-3 select-none z-50 shrink-0 border-b transition-colors duration-200"
      style={{
        ...dragStyle,
        background: 'var(--titlebar-bg)',
        color: 'var(--titlebar-text)',
        borderColor: 'var(--titlebar-border)',
      }}
    >
      {/* ── Left: Branding + Status ── */}
      <div className="flex items-center gap-2.5 min-w-0" style={noDragStyle}>
        {/* Logo cohérent avec la Sidebar */}
        <div className="logo-gradient-bg w-4 h-4 rounded-md flex items-center justify-center shrink-0">
          <span className="text-white text-[9px] font-black leading-none">E</span>
        </div>

        <span className="font-black text-[11px] tracking-tight" style={{ color: 'var(--titlebar-text)' }}>
          ECOLISA
        </span>
        <span
          className="text-[9px] font-semibold uppercase tracking-widest hidden sm:inline opacity-40"
          style={{ color: 'var(--titlebar-text)' }}
        >
          ERP EPST RDC
        </span>

        {/* Pill statut online/offline */}
        <div className={`titlebar-status-pill ${isOnline ? 'online' : 'offline'} hidden md:inline-flex`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500 dot-pulse' : 'bg-amber-500'}`} />
          {isOnline ? 'EN LIGNE' : 'HORS-LIGNE'}
        </div>
      </div>

      {/* ── Center: Performance hint ── */}
      <div
        className="hidden lg:flex items-center gap-2.5 text-[9.5px] font-semibold"
        style={{ ...dragStyle, opacity: 0.42, color: 'var(--titlebar-text)' }}
      >
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3 h-3 text-indigo-400" />
          <span>Moteur P2P Local · 0.4ms</span>
        </div>
        <span className="w-1 h-1 rounded-full bg-current opacity-30" />
        <div className="flex items-center gap-1">
          <Command className="w-3 h-3 text-indigo-400" />
          <span>
            <kbd
              className="font-mono text-indigo-400 font-bold px-1 rounded"
              style={{ background: 'rgba(99,102,241,0.12)' }}
            >Ctrl+K</kbd> pour la recherche
          </span>
        </div>
      </div>

      {/* ── Right: Window Controls ── */}
      <div className="flex items-center gap-0.5 -mr-1" style={noDragStyle}>
        <button
          onClick={handleMinimize}
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-slate-500/15 active:scale-90 transition-all cursor-pointer"
          style={{ color: 'var(--titlebar-text)', opacity: 0.65 }}
          title="Réduire"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-slate-500/15 active:scale-90 transition-all cursor-pointer"
          style={{ color: 'var(--titlebar-text)', opacity: 0.65 }}
          title={isMaximized ? 'Réduire la taille' : 'Agrandir'}
        >
          {isMaximized ? <Copy className="w-3 h-3 rotate-180" /> : <Square className="w-3 h-3" />}
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-6 flex items-center justify-center rounded hover:bg-red-500 hover:opacity-100 active:scale-90 transition-all cursor-pointer group"
          style={{ color: 'var(--titlebar-text)', opacity: 0.65 }}
          title="Fermer"
        >
          <X className="w-3.5 h-3.5 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
};
