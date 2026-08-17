import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export const showToast = (title: string, message?: string, type: 'success' | 'error' | 'info' | 'warning' = 'success', duration = 3500) => {
  if (typeof window === 'undefined') return;
  const event = new CustomEvent('ecolisa:toast', {
    detail: {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      duration,
    },
  });
  window.dispatchEvent(event);
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const detail = (e as CustomEvent<ToastMessage>).detail;
      if (!detail) return;
      setToasts(prev => [detail, ...prev.slice(0, 4)]);

      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== detail.id));
      }, detail.duration || 3500);

      return () => clearTimeout(timer);
    };

    window.addEventListener('ecolisa:toast', handleToastEvent);
    return () => window.removeEventListener('ecolisa:toast', handleToastEvent);
  }, []);

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map(t => {
        const isSuccess = t.type === 'success' || !t.type;
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        const Icon = isSuccess ? CheckCircle2 : isError ? AlertTriangle : Info;
        const bgBorder = isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/30'
          : isError
          ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/30'
          : isWarning
          ? 'bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/30'
          : 'bg-slate-900/90 border-indigo-500/40 text-indigo-100 shadow-slate-950/30';

        const iconBg = isSuccess
          ? 'bg-emerald-500/20 text-emerald-400'
          : isError
          ? 'bg-rose-500/20 text-rose-400'
          : isWarning
          ? 'bg-amber-500/20 text-amber-400'
          : 'bg-indigo-500/20 text-indigo-400';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md shadow-sm transition-all animate-slide-down ${bgBorder}`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 pr-2">
              <h4 className="text-xs font-black tracking-wide leading-snug">{t.title}</h4>
              {t.message && (
                <p className="text-[11px] font-medium opacity-90 mt-0.5 leading-snug">{t.message}</p>
              )}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="p-1 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
