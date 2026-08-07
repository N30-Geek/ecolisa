import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

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
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const MONTHS_FR_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// Plage d'années utile pour un ERP scolaire congolais (EPST)
const START_YEAR = 2000;
const END_YEAR   = new Date().getFullYear() + 5;
const YEARS      = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

type PanelView = 'calendar' | 'year' | 'month';

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Sélectionner une date...',
  className = '',
  alignRight = false,
}) => {
  const [isOpen, setIsOpen]   = useState(false);
  const [view, setView]       = useState<PanelView>('calendar');
  const containerRef          = useRef<HTMLDivElement>(null);
  const yearGridRef           = useRef<HTMLDivElement>(null);

  const initialDate  = value ? new Date(value) : new Date();
  const safeInit     = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewDate,      setViewDate]      = useState<Date>(safeInit);
  const [selectedDate,  setSelectedDate]  = useState<Date | null>(value && !isNaN(safeInit.getTime()) ? safeInit : null);

  // Fermeture au clic extérieur
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

  // Scroll vers l'année actuelle dans la grille
  useEffect(() => {
    if (view === 'year' && yearGridRef.current) {
      const activeBtn = yearGridRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [view]);

  const currentYear  = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  // ── Navigation mois ──────────────────────────────────────────────────────
  const handlePrevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

  // ── Sélection année ──────────────────────────────────────────────────────
  const handleSelectYear = (year: number) => {
    setViewDate(new Date(year, currentMonth, 1));
    setView('calendar');
  };

  // ── Sélection mois (vue intermédiaire optionnelle) ───────────────────────
  const handleSelectMonth = (monthIdx: number) => {
    setViewDate(new Date(currentYear, monthIdx, 1));
    setView('calendar');
  };

  // ── Sélection jour ───────────────────────────────────────────────────────
  const handleSelectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]);
    setIsOpen(false);
    setView('calendar');
  };

  // ── Calcul grille calendrier ─────────────────────────────────────────────
  const firstDayOfMonth = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const daysInMonth     = new Date(currentYear, currentMonth + 1, 0).getDate();

  const formatDateDisplay = (d: Date | null) => {
    if (!d) return placeholder;
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  };

  // ── Raccourcis rapides ───────────────────────────────────────────────────
  const applyPreset = (presetType: 'today' | 'this_month' | 'semester') => {
    const now = new Date();
    let target: Date;
    if (presetType === 'today') {
      target = now;
    } else if (presetType === 'this_month') {
      target = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      target = new Date(2025, 8, 1);
    }
    setSelectedDate(target);
    setViewDate(target);
    onChange(target.toISOString().split('T')[0]);
    setIsOpen(false);
    setView('calendar');
  };

  // ── Couleurs bouton header selon la vue ──────────────────────────────────
  const headerLabelStyle: React.CSSProperties = {
    cursor: 'pointer',
    userSelect: 'none',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
          {label}
        </label>
      )}

      {/* ── Déclencheur ── */}
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setView('calendar'); }}
        className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 border shadow-sm active:scale-98 cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'hover:border-indigo-500/40 hover:bg-indigo-500/10'
        }`}
        style={{
          background:   'var(--bg-sunken)',
          borderColor:  isOpen ? '#6366f1' : 'var(--border)',
          color:        'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="truncate">{formatDateDisplay(selectedDate)}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-indigo-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Panel principal ── */}
      {isOpen && (
        <div
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} top-full mt-1.5 rounded-2xl border shadow-2xl z-[9999] p-3 space-y-3 animate-scale-in`}
          style={{
            width:              288,
            background:         'var(--sidebar-popover-bg)',
            borderColor:        'var(--sidebar-popover-border)',
            backdropFilter:     'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* ── Raccourcis rapides ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sidebar-scroll">
            {[
              { key: 'today',      label: "Aujourd'hui",  color: 'indigo'  },
              { key: 'this_month', label: 'Ce mois',      color: 'emerald' },
              { key: 'semester',   label: '1er Semestre', color: 'amber'   },
            ].map(({ key, label: l, color }) => (
              <button
                key={key}
                onClick={() => applyPreset(key as any)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer transition-all border`}
                style={{
                  background:   `rgba(var(--c-${color}), 0.10)`,
                  borderColor:  `rgba(var(--c-${color}), 0.25)`,
                }}
              >
                {/* Couleur inline par cohérence token */}
                <span className={
                  color === 'indigo'  ? 'text-indigo-700 dark:text-indigo-300' :
                  color === 'emerald' ? 'text-emerald-800 dark:text-emerald-300' :
                  'text-amber-900 dark:text-amber-300'
                }>{l}</span>
              </button>
            ))}
          </div>

          <div className="border-t" style={{ borderColor: 'var(--border)' }} />

          {/* ════════════════════════════════════════════════
              VUE : CALENDRIER (vue par défaut)
              ════════════════════════════════════════════════ */}
          {view === 'calendar' && (
            <>
              {/* En-tête mois / année — cliquable pour changer la vue */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handlePrevMonth}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-500/15 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Mois précédent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Label cliquable → bascule vers sélecteur d'année */}
                <div className="flex items-center gap-1">
                  {/* Mois → vue mois */}
                  <button
                    onClick={() => setView('month')}
                    className="px-2 py-1 rounded-lg text-xs font-black transition-all hover:bg-indigo-500/10 cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                    title="Choisir le mois"
                  >
                    {MONTHS_FR[currentMonth]}
                  </button>

                  {/* Séparateur */}
                  <span style={{ color: 'var(--text-disabled)', fontSize: 11 }}>·</span>

                  {/* Année → vue année */}
                  <button
                    onClick={() => setView('year')}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black transition-all cursor-pointer"
                    style={{
                      background:  'rgba(99,102,241,0.10)',
                      border:      '1px solid rgba(99,102,241,0.22)',
                      color:       '#6366f1',
                    }}
                    title="Choisir l'année directement"
                  >
                    {currentYear}
                    <ChevronDown className="w-3 h-3 opacity-70" />
                  </button>
                </div>

                <button
                  onClick={handleNextMonth}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-500/15 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Noms des jours */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS_FR.map((d) => (
                  <span key={d} className="text-[9.5px] font-black uppercase" style={{ color: 'var(--text-disabled)' }}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Grille des jours */}
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <span key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const isSelected =
                    selectedDate &&
                    selectedDate.getDate()     === day &&
                    selectedDate.getMonth()    === currentMonth &&
                    selectedDate.getFullYear() === currentYear;

                  const isToday =
                    new Date().getDate()     === day &&
                    new Date().getMonth()    === currentMonth &&
                    new Date().getFullYear() === currentYear;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`w-7 h-7 mx-auto rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm scale-105'
                          : isToday
                          ? 'bg-indigo-500/15 border border-indigo-500/40 font-black'
                          : 'hover:bg-indigo-500/12 hover:text-indigo-600'
                      }`}
                      style={{
                        color: isSelected ? '#ffffff' : isToday ? '#6366f1' : 'var(--text-primary)',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════
              VUE : SÉLECTEUR D'ANNÉE
              ════════════════════════════════════════════════ */}
          {view === 'year' && (
            <>
              {/* Header de la vue année */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                  Choisir l'année
                </span>
                <button
                  onClick={() => setView('calendar')}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-all hover:bg-slate-500/10"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Retour
                </button>
              </div>

              {/* Grille d'années scrollable */}
              <div
                ref={yearGridRef}
                className="grid grid-cols-4 gap-1.5 overflow-y-auto sidebar-scroll"
                style={{ maxHeight: 200 }}
              >
                {YEARS.map((year) => {
                  const isActive   = year === currentYear;
                  const isCurrent  = year === new Date().getFullYear();
                  return (
                    <button
                      key={year}
                      data-active={isActive ? 'true' : 'false'}
                      onClick={() => handleSelectYear(year)}
                      className="py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer relative"
                      style={
                        isActive
                          ? {
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color:      '#ffffff',
                              fontWeight: 900,
                              boxShadow:  '0 2px 8px rgba(99,102,241,0.35)',
                            }
                          : isCurrent
                          ? {
                              background:  'rgba(99,102,241,0.10)',
                              border:      '1px solid rgba(99,102,241,0.28)',
                              color:       '#6366f1',
                              fontWeight:  800,
                            }
                          : {
                              color:      'var(--text-secondary)',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.09)';
                          (e.currentTarget as HTMLButtonElement).style.color      = '#6366f1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = isCurrent ? 'rgba(99,102,241,0.10)' : 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.color      = isCurrent ? '#6366f1' : 'var(--text-secondary)';
                        }
                      }}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ════════════════════════════════════════════════
              VUE : SÉLECTEUR DE MOIS
              ════════════════════════════════════════════════ */}
          {view === 'month' && (
            <>
              {/* Header de la vue mois */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>
                  Choisir le mois — <span style={{ color: '#6366f1' }}>{currentYear}</span>
                </span>
                <button
                  onClick={() => setView('calendar')}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer transition-all hover:bg-slate-500/10"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ChevronLeft className="w-3 h-3" />
                  Retour
                </button>
              </div>

              {/* Grille 3×4 des mois */}
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS_FR_SHORT.map((m, idx) => {
                  const isActive  = idx === currentMonth;
                  const isNowMon  = idx === new Date().getMonth() && currentYear === new Date().getFullYear();
                  return (
                    <button
                      key={m}
                      onClick={() => handleSelectMonth(idx)}
                      className="py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      style={
                        isActive
                          ? {
                              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                              color:      '#ffffff',
                              fontWeight: 900,
                              boxShadow:  '0 2px 8px rgba(99,102,241,0.30)',
                            }
                          : isNowMon
                          ? {
                              background:  'rgba(99,102,241,0.10)',
                              border:      '1px solid rgba(99,102,241,0.25)',
                              color:       '#6366f1',
                            }
                          : {
                              color:      'var(--text-secondary)',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.09)';
                          (e.currentTarget as HTMLButtonElement).style.color      = '#6366f1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLButtonElement).style.background = isNowMon ? 'rgba(99,102,241,0.10)' : 'transparent';
                          (e.currentTarget as HTMLButtonElement).style.color      = isNowMon ? '#6366f1' : 'var(--text-secondary)';
                        }
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
