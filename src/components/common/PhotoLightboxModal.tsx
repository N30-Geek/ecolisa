import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, User, ShieldCheck, Printer } from 'lucide-react';

interface PhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string;
  title: string;
  subtitle?: string;
  badge?: string;
}

export const PhotoLightboxModal: React.FC<PhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  title,
  subtitle,
  badge,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setZoomLevel(1);
      setRotation(0);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!photoUrl) return;
    const a = document.createElement('a');
    a.href = photoUrl;
    a.download = `Photo_${title.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!photoUrl) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Photo ${title}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
            img { max-width: 80%; max-height: 70vh; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); object-fit: contain; }
            h2 { margin-top: 16px; color: #1e293b; font-size: 20px; text-align: center; }
            p { margin-top: 4px; color: #64748b; font-size: 14px; text-align: center; }
          </style>
        </head>
        <body>
          <img src="${photoUrl}" alt="${title}" />
          <h2>${title}</h2>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-between p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-fade-in select-none overflow-hidden"
      onClick={onClose}
    >
      {/* BARRE HAUTE DE CONTRÔLE */}
      <div
        className="w-full max-w-4xl flex items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md shadow-2xl text-white z-10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">{title}</h3>
              {badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs font-mono font-medium text-slate-400 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Boutons d'Action Lightbox */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer"
            title="Zoom Avant (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer"
            title="Zoom Arrière (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer"
            title="Pivoter à 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-700 mx-1" />

          {photoUrl && (
            <>
              <button
                onClick={handleDownload}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer shadow-md shadow-indigo-600/30"
                title="Télécharger la Photo"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={handlePrint}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer"
                title="Imprimer la Photo"
              >
                <Printer className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-100 transition-all cursor-pointer border border-rose-500/30 ml-1"
            title="Fermer (Échap)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ZONE D'AFFICHAGE DE LA PHOTO AVEC NIVEAU DE ZOOM */}
      <div
        className="flex-1 w-full flex items-center justify-center p-4 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={title}
            className="max-w-[90vw] max-h-[75vh] object-contain rounded-2xl shadow-2xl border-2 border-white/20 transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            }}
          />
        ) : (
          <div className="w-64 h-64 rounded-3xl bg-slate-900 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 space-y-3 p-6 text-center">
            <User className="w-20 h-20 text-slate-700" />
            <p className="text-xs font-bold text-slate-400">Aucune photo enregistrée pour cet élève.</p>
          </div>
        )}
      </div>

      {/* PIED DE MODALE INFORMATIONS */}
      <div
        className="w-full max-w-xl p-3 rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md text-center text-xs text-slate-400 font-medium z-10"
        onClick={e => e.stopPropagation()}
      >
        <span>💡 Astuce : Utilisez la molette ou les boutons pour zoomer · Appuyez sur <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">Échap</kbd> pour fermer</span>
      </div>
    </div>,
    document.body
  );
};
