import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface CustomDatePickerProps {
  value?: string;
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  alignRight?: boolean;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une date...',
  className = '',
  alignRight = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Date actuelle ou sélectionnée
  const initialDate = value ? new Date(value) : new Date();
  const [viewDate, setViewDate] = useState<Date>(isNaN(initialDate.getTime()) ? new Date() : initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value && !isNaN(initialDate.getTime()) ? initialDate : null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    const dateStr = newDate.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  // Calcul du calendrier
  const firstDayOfMonth = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const formatDateDisplay = (d: Date | null) => {
    if (!d) return placeholder;
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  };

  const applyPreset = (presetType: 'today' | 'this_month' | 'semester' | 'year') => {
    const now = new Date();
    if (presetType === 'today') {
      setSelectedDate(now);
      setViewDate(now);
      onChange(now.toISOString().split('T')[0]);
    } else if (presetType === 'this_month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setSelectedDate(first);
      setViewDate(first);
      onChange(first.toISOString().split('T')[0]);
    } else if (presetType === 'semester') {
      const sem = new Date(2025, 8, 1);
      setSelectedDate(sem);
      setViewDate(sem);
      onChange('2025-09-01');
    } else if (presetType === 'year') {
      const year = new Date(2025, 8, 1);
      setSelectedDate(year);
      setViewDate(year);
      onChange('2025-09-01');
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 border shadow-sm active:scale-98 cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'hover:border-indigo-500/40 hover:bg-indigo-500/10'
        }`}
        style={{
          background: 'var(--bg-sunken)',
          borderColor: isOpen ? '#6366f1' : 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="truncate">{formatDateDisplay(selectedDate)}</span>
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-1.5 w-72 rounded-2xl border shadow-2xl z-[100] p-3 space-y-3 animate-scale-in`}
          style={{
            background: 'var(--sidebar-popover-bg)',
            borderColor: 'var(--sidebar-popover-border)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Raccourcis Rapides de Périodes */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sidebar-scroll">
            <button
              onClick={() => applyPreset('today')}
              className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 whitespace-nowrap cursor-pointer"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => applyPreset('this_month')}
              className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 whitespace-nowrap cursor-pointer"
            >
              Ce Mois
            </button>
            <button
              onClick={() => applyPreset('semester')}
              className="px-2 py-1 rounded-lg text-[10px] font-black bg-amber-500/15 text-amber-900 dark:text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 whitespace-nowrap cursor-pointer"
            >
              1er Semestre
            </button>
          </div>

          {/* En-tête Mois / Année */}
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-500/15 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
              {MONTHS_FR[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-500/15 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {DAYS_FR.map((d) => (
              <span key={d} className="text-[10px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Grille des jours */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <span key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear;

              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentMonth &&
                new Date().getFullYear() === currentYear;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md scale-105'
                      : isToday
                      ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/40 font-black'
                      : 'hover:bg-indigo-500/15 hover:text-indigo-600'
                  }`}
                  style={{
                    color: isSelected ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
