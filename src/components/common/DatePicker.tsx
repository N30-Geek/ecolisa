import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  disabled,
  className = '',
  id,
}) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    return new Date(value + 'T00:00:00');
  }, [value]);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const padStart = firstDay === 0 ? 6 : firstDay - 1; // Monday start
    const cells: (number | null)[] = Array(padStart).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewDate]);

  const select = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const date = new Date(year, month, day);
    const iso = date.toISOString().split('T')[0];
    onChange(iso);
    setOpen(false);
  };

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const header = (
    <div className="flex items-center justify-between mb-3">
      <button
        onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
        className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2">
        <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>{MONTHS[viewDate.getMonth()]}</span>
        <input
          type="number"
          value={viewDate.getFullYear()}
          onChange={e => setViewDate(new Date(Number(e.target.value), viewDate.getMonth(), 1))}
          className="w-14 text-center text-xs font-black py-0.5 rounded border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      <button
        onClick={() => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
        className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  const calendar = (
    <div className="grid grid-cols-7 gap-1 text-center">
      {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map(d => (
        <div key={d} className="text-[10px] font-black text-slate-400 py-1">{d}</div>
      ))}
      {days.map((day, i) => {
        if (day == null) return <div key={i} />;
        const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === viewDate.getMonth() && selectedDate.getFullYear() === viewDate.getFullYear();
        const isToday = new Date().toDateString() === new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toDateString();
        return (
          <button
            key={i}
            onClick={() => select(day)}
            className={`w-8 h-8 rounded-lg text-[11px] font-black transition-all ${isSelected ? 'bg-indigo-500 text-white shadow-md' : 'hover:bg-indigo-500/10 text-slate-300'} ${isToday && !isSelected ? 'ring-1 ring-indigo-500/40' : ''}`}
          >
            {day}
          </button>
        );
      })}
    </div>
  );

  const rect = containerRef.current?.getBoundingClientRect();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        id={id}
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="input w-full text-left flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className={display ? '' : 'text-slate-400'}>{display || placeholder}</span>
        </span>
        {value && (
          <span onClick={clear} className="p-0.5 rounded-full hover:bg-slate-500/20 text-slate-400">
            <X className="w-3 h-3" />
          </span>
        )}
      </button>
      {open && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[150] p-3 rounded-2xl border shadow-2xl animate-scale-in"
          style={{
            top: (rect ? rect.bottom + 6 : 0),
            left: (rect ? rect.left : 0),
            minWidth: (rect ? Math.max(rect.width, 260) : 260),
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-2xl)',
          }}
        >
          {header}
          {calendar}
          <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => { onChange(''); setOpen(false); }} className="text-[11px] font-black text-rose-500 hover:underline">Effacer</button>
            <button onClick={() => { const t = new Date(); onChange(t.toISOString().split('T')[0]); setOpen(false); }} className="text-[11px] font-black text-indigo-500 hover:underline">Aujourd'hui</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
