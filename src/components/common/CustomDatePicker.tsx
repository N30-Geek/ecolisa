import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';

export interface CustomDatePickerProps {
  value?: string;
  onChange: (dateStr: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  alignRight?: boolean;
  disabled?: boolean;
  id?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MONTHS_FR_SHORT = [
  'Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc',
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const START_YEAR = 2000;
const END_YEAR = new Date().getFullYear() + 5;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

type PanelView = 'calendar' | 'year' | 'month';

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une date...',
  className = '',
  alignRight = false,
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<PanelView>('calendar');
  const containerRef = useRef<HTMLDivElement>(null);
  const yearGridRef = useRef<HTMLDivElement>(null);

  const initialDate = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value + (value.includes('T') ? '' : 'T00:00:00'));
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [viewDate, setViewDate] = useState<Date>(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? initialDate : null);

  useEffect(() => {
    if (value) {
      const d = new Date(value + (value.includes('T') ? '' : 'T00:00:00'));
      if (!isNaN(d.getTime())) {
        setSelectedDate(d);
        setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setView('calendar');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to active year when opening year grid
  useEffect(() => {
    if (view === 'year' && yearGridRef.current) {
      const activeBtn = yearGridRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [view]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, currentMonth, 1));
    setView('calendar');
  };

  const handleSelectMonth = (monthIdx: number) => {
    setViewDate(new Date(currentYear, monthIdx, 1));
    setView('calendar');
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    const iso = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(newDate);
    onChange(iso);
    setIsOpen(false);
    setView('calendar');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange('');
  };

  // Calendar grid calculations
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  const formatDateDisplay = (d: Date | null) => {
    if (!d) return placeholder;
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Presets
  const applyPreset = (preset: 'today' | 'yesterday' | 'this_month' | 'semester') => {
    const now = new Date();
    let target: Date;
    if (preset === 'today') {
      target = now;
    } else if (preset === 'yesterday') {
      target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else if (preset === 'this_month') {
      target = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      target = new Date(now.getFullYear(), 8, 1); // 1er Septembre rentrée
    }
    const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
    setSelectedDate(target);
    setViewDate(new Date(target.getFullYear(), target.getMonth(), 1));
    onChange(iso);
    setIsOpen(false);
    setView('calendar');
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
          {label}
        </label>
      )}

      {/* ── Déclencheur Input Material 3 ── */}
      <div
        id={id}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setView('calendar');
          }
        }}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border select-none cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
            : isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5'
            : 'hover:border-indigo-500/40 hover:bg-indigo-500/5'
        }`}
        style={{
          background: 'var(--bg-sunken)',
          borderColor: isOpen ? '#6366f1' : 'var(--border)',
          color: selectedDate ? 'var(--text-primary)' : 'var(--text-disabled)',
          boxShadow: 'var(--elevation-1)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
          </div>
          <span className="truncate text-xs font-semibold" style={{ color: selectedDate ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
            {formatDateDisplay(selectedDate)}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Effacer la date"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
          />
        </div>
      </div>

      {/* ── Popover Calendrier Material 3 (Inspiré Image 4) ── */}
      {isOpen && (
        <div
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-2 rounded-2xl border z-[9999] p-4 space-y-3 animate-scale-in`}
          style={{
            width: 320,
            background: 'var(--sidebar-popover-bg)',
            borderColor: 'var(--sidebar-popover-border)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: 'var(--elevation-3)',
          }}
        >
          {/* ── Raccourcis Rapides (Pill Buttons) ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sidebar-scroll">
            {[
              { key: 'today', label: "Aujourd'hui" },
              { key: 'yesterday', label: 'Hier' },
              { key: 'this_month', label: 'Ce mois' },
              { key: 'semester', label: 'Rentrée' },
            ].map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => applyPreset(p.key as any)}
                className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold whitespace-nowrap cursor-pointer transition-all border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="border-t" style={{ borderColor: 'var(--border)' }} />

          {/* ════════════════════════════════════════════════
              VUE 1 : GRILLE DU CALENDRIER
              ════════════════════════════════════════════════ */}
          {view === 'calendar' && (
            <div className="space-y-3">
              {/* Header Navigation Mois & Année */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  title="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Dropdown Déclencheur Mois & Année */}
                <button
                  type="button"
                  onClick={() => setView('month')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20 cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>{MONTHS_FR[currentMonth]} {currentYear}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-500" />
                </button>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                  title="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Jours de la semaine */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS_FR.map(d => (
                  <span key={d} className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Grille des Jours (Pastilles Circulaires Image 4) */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Jours du mois précédent */}
                {Array.from({ length: firstDayIndex }).map((_, i) => {
                  const dayNum = prevMonthDays - firstDayIndex + i + 1;
                  return (
                    <div
                      key={`prev-${i}`}
                      className="w-8 h-8 mx-auto flex items-center justify-center text-[11px] font-medium text-slate-300 dark:text-slate-600 select-none"
                    >
                      {dayNum}
                    </div>
                  );
                })}

                {/* Jours du mois en cours */}
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
                      className={`w-8 h-8 mx-auto rounded-full text-xs font-bold flex items-center justify-center transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105 font-black'
                          : isToday
                          ? 'border-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-black bg-indigo-500/10'
                          : 'hover:bg-indigo-500/15 hover:text-indigo-600 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              VUE 2 : SÉLECTEUR DE MOIS
              ════════════════════════════════════════════════ */}
          {view === 'month' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setView('year')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer border border-indigo-500/20"
                >
                  <span>Année {currentYear}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('calendar')}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Retour
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MONTHS_FR_SHORT.map((m, idx) => {
                  const isActive = idx === currentMonth;
                  const isCurrent = idx === new Date().getMonth() && currentYear === new Date().getFullYear();
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMonth(idx)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                          : isCurrent
                          ? 'border border-indigo-500/40 text-indigo-600 bg-indigo-500/10'
                          : 'hover:bg-indigo-500/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════
              VUE 3 : SÉLECTEUR D'ANNÉE
              ════════════════════════════════════════════════ */}
          {view === 'year' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                  Sélectionner l'année
                </span>
                <button
                  type="button"
                  onClick={() => setView('calendar')}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Retour
                </button>
              </div>

              <div
                ref={yearGridRef}
                className="grid grid-cols-3 gap-2 overflow-y-auto sidebar-scroll p-1"
                style={{ maxHeight: 210 }}
              >
                {YEARS.map(year => {
                  const isActive = year === currentYear;
                  const isCurrent = year === new Date().getFullYear();
                  return (
                    <button
                      key={year}
                      type="button"
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => handleSelectYear(year)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                          : isCurrent
                          ? 'border border-indigo-500/40 text-indigo-600 bg-indigo-500/10'
                          : 'hover:bg-indigo-500/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
