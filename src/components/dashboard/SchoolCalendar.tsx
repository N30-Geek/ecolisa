import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download, Clock, Plus, X, Check } from 'lucide-react';
import { LocalDatabaseService } from '../../services/localDatabase';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';

export interface CalendarEventData {
  id: string;
  titre: string;
  subtitre?: string;
  dateDebut: string;
  dateFin?: string;
  categorie: string;
  publicCible?: 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_EXETAT';
  highlight?: boolean;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  decembre: 11,
};

const parseAnyDate = (d?: string): Date | null => {
  if (!d) return null;
  const iso = d.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return isNaN(date.getTime()) ? null : date;
  }
  const french = d.toLowerCase().match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/);
  if (french) {
    const month = FRENCH_MONTHS[french[2].replace(/[\u0300-\u036f]/g, '')];
    if (month !== undefined) {
      const date = new Date(Number(french[3]), month, Number(french[1]));
      return isNaN(date.getTime()) ? null : date;
    }
  }
  const fallback = new Date(d);
  return isNaN(fallback.getTime()) ? null : fallback;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isBetween = (date: Date, start: Date, end: Date) =>
  date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
  date <= new Date(end.getFullYear(), end.getMonth(), end.getDate());

const categoryColor = (cat: string) => {
  if (cat === 'EXAMENS_JURY') return { bg: 'bg-indigo-500/15', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-500/30', dot: 'bg-indigo-500' };
  if (cat === 'VACANCES') return { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-500/30', dot: 'bg-amber-500' };
  if (cat === 'FÉRIÉ') return { bg: 'bg-rose-500/15', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-500/30', dot: 'bg-rose-500' };
  if (cat === 'RENTRÉE_CLÔTURE') return { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500/30', dot: 'bg-emerald-500' };
  return { bg: 'bg-slate-500/15', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-500/30', dot: 'bg-slate-500' };
};

interface SchoolCalendarProps {
  events?: CalendarEventData[];
  defaultYear?: number;
  onAddEvent?: (ev: CalendarEventData) => void;
}

export const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ events = [], defaultYear, onAddEvent }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => {
    if (defaultYear) return new Date(defaultYear, 8, 1);
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [localEvents, setLocalEvents] = useState<CalendarEventData[]>([]);

  const allEvents = useMemo(() => {
    const merged = [...(events.length > 0 ? events : []), ...localEvents];
    const map = new Map<string, CalendarEventData>();
    for (const ev of merged) if (ev.id) map.set(ev.id, ev);
    return Array.from(map.values());
  }, [events, localEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days: Date[] = useMemo(() => {
    const list: Date[] = [];
    for (let i = 0; i < startOffset; i++) {
      const d = new Date(year, month, -startOffset + i + 1);
      list.push(d);
    }
    for (let i = 1; i <= daysInMonth; i++) list.push(new Date(year, month, i));
    const remaining = (7 - (list.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) list.push(new Date(year, month + 1, i));
    return list;
  }, [year, month, startOffset, daysInMonth]);

  const eventsForDay = (date: Date) => {
    return allEvents.filter((ev) => {
      const start = parseAnyDate(ev.dateDebut);
      if (!start) return false;
      const end = ev.dateFin ? parseAnyDate(ev.dateFin) : start;
      if (!end) return isBetween(date, start, start);
      return isBetween(date, start, end);
    });
  };

  const selectedEvents = selectedDate ? eventsForDay(selectedDate) : [];

  const upcomingEvents = useMemo(() => {
    const fromToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return allEvents
      .map((ev) => ({ ev, start: parseAnyDate(ev.dateDebut) }))
      .filter((x): x is { ev: CalendarEventData; start: Date } => !!x.start && x.start >= fromToday)
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 6)
      .map((x) => x.ev);
  }, [allEvents, today]);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [form, setForm] = useState({
    titre: '',
    subtitre: '',
    dateDebut: '',
    dateFin: '',
    categorie: 'AUTRE',
    publicCible: 'TOUS' as 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE_EXETAT',
  });

  const openModal = (date: Date) => {
    setModalDate(date);
    setForm({
      titre: '',
      subtitre: '',
      dateDebut: toISODate(date),
      dateFin: toISODate(date),
      categorie: 'AUTRE',
      publicCible: 'TOUS',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalDate(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim() || !form.dateDebut) return;
    const newEvent: CalendarEventData = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      titre: form.titre.trim(),
      subtitre: form.subtitre.trim() || undefined,
      dateDebut: form.dateDebut,
      dateFin: form.dateFin || undefined,
      categorie: form.categorie,
      publicCible: form.publicCible,
    };
    if (onAddEvent) {
      onAddEvent(newEvent);
    } else {
      await LocalDatabaseService.addSchoolEvent(newEvent as any);
    }
    setLocalEvents(prev => [...prev, newEvent]);
    if (modalDate) setSelectedDate(modalDate);
    closeModal();
  };

  const handleDayDoubleClick = (date: Date) => {
    setSelectedDate(date);
    openModal(date);
  };

  return (
    <div
      id="school-calendar-print-section"
      className="p-4 sm:p-5 rounded-2xl border shadow-xs space-y-4 animate-fade-in"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 shrink-0">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white">
              Calendrier Scolaire {year}–{year + 1}
            </h2>
            <p className="text-[11px] font-semibold text-indigo-100">
              Jours fériés, vacances, examens et événements EPST
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 rounded-xl border border-white/20 hover:bg-white/10 transition-all text-white" title="Mois précédent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-4 py-2 rounded-xl border border-white/20 bg-white/10 text-sm font-black min-w-[160px] text-center text-white backdrop-blur-sm">
            {MONTHS_FR[month]} {year}
          </div>
          <button onClick={handleNextMonth} className="p-2 rounded-xl border border-white/20 hover:bg-white/10 transition-all text-white" title="Mois suivant">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={handleToday} className="px-3 py-2 rounded-xl text-xs font-black bg-white/15 text-white border border-white/20 hover:bg-white/25 transition-all">
            Aujourd'hui
          </button>
          <button
            onClick={() => openModal(today)}
            className="px-3.5 py-2 rounded-xl bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer border border-white/40"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer border border-white/20 no-print"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exporter</span>
          </button>
        </div>
      </div>

      {/* Month grid */}
      <div className="border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-7 text-center py-2.5 text-[11px] font-black uppercase tracking-wider" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          {WEEKDAYS_SHORT.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ background: 'var(--bg-surface)' }}>
          {days.map((date, idx) => {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = sameDay(date, today);
            const dayEvents = eventsForDay(date);
            const isSelected = selectedDate ? sameDay(date, selectedDate) : false;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                onDoubleClick={() => handleDayDoubleClick(date)}
                title="Double-cliquez pour ajouter un événement"
                className={`relative h-24 sm:h-28 p-1.5 border-b border-r text-left flex flex-col justify-between transition-all ${
                  isCurrentMonth ? '' : 'opacity-35'
                } ${isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/30 ring-2 ring-inset ring-indigo-500' : 'hover:bg-slate-500/5'} ${
                  !isCurrentMonth ? 'bg-slate-500/[0.03]' : ''
                } ${isWeekend ? 'bg-amber-500/[0.02]' : ''}`}
                style={{ borderColor: 'var(--border)', background: isToday ? 'var(--bg-sunken)' : undefined }}
              >
                <span className={`text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center mb-1 ${
                  isToday ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300'
                }`}>
                  {date.getDate()}
                </span>
                <div className="flex flex-wrap items-end gap-1 content-end">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span key={i} className={`w-2.5 h-2.5 rounded-full ${categoryColor(ev.categorie).dot}`} title={ev.titre} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="px-1 rounded text-[9px] font-black text-white bg-slate-500/70 dark:bg-slate-700">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day / upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
              {selectedDate
                ? `Événements du ${selectedDate.getDate()} ${MONTHS_FR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                : 'Sélectionnez un jour'}
            </h3>
            {selectedDate && (
              <button
                onClick={() => openModal(selectedDate)}
                className="flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter
              </button>
            )}
          </div>
          <div className="space-y-2">
            {selectedEvents.length > 0 ? selectedEvents.map((ev) => {
              const colors = categoryColor(ev.categorie);
              return (
                <div key={ev.id} className={`p-3 rounded-xl border ${colors.bg} ${colors.border} hover:shadow-sm transition-shadow`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className={`text-[12px] font-bold ${colors.text}`}>{ev.titre}</h4>
                      {ev.subtitre && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{ev.subtitre}</p>}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
                      {ev.categorie.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[10px] flex items-center gap-1 mt-1.5 text-slate-500 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    {ev.dateDebut} {ev.dateFin ? `au ${ev.dateFin}` : ''}
                  </p>
                </div>
              );
            }) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">Aucun événement ce jour. Double-cliquez sur une date pour en ajouter un.</p>
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: 'var(--text-primary)' }}>Prochaines échéances</h3>
          <div className="space-y-2">
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev) => {
              const colors = categoryColor(ev.categorie);
              const start = parseAnyDate(ev.dateDebut);
              return (
                <div key={ev.id} className="flex items-start gap-2.5 p-2 rounded-xl border hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                  <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 border ${colors.bg} ${colors.border}`}>
                    <span className="text-[8px] font-black uppercase" style={{ color: 'var(--text-muted)' }}>{start ? MONTHS_FR[start.getMonth()].slice(0, 3) : '—'}</span>
                    <span className="text-[12px] font-black leading-tight" style={{ color: 'var(--text-primary)' }}>{start ? start.getDate() : '—'}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[12px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>{ev.titre}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{ev.subtitre || ev.categorie.replace('_', ' ')}</p>
                  </div>
                </div>
              );
            }) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">Aucune échéance à venir.</p>
            )}
          </div>
        </div>
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeModal} />
          <div
            className="relative w-full max-w-lg rounded-2xl border shadow-2xl"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
          >
            <div className="p-4 border-b" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', borderColor: 'rgba(255,255,255,0.12)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Programmer un événement</h3>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[11px] text-indigo-100 mt-1">
                {modalDate ? `${modalDate.getDate()} ${MONTHS_FR[modalDate.getMonth()]} ${modalDate.getFullYear()}` : ''}
              </p>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Titre *</label>
                <input
                  type="text"
                  value={form.titre}
                  onChange={e => setForm(prev => ({ ...prev, titre: e.target.value }))}
                  placeholder="Ex : Examen de Mathématiques"
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sous-titre / Description</label>
                <input
                  type="text"
                  value={form.subtitre}
                  onChange={e => setForm(prev => ({ ...prev, subtitre: e.target.value }))}
                  placeholder="Détail ou salle concernée..."
                  className="w-full px-3 py-2 text-xs rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomDatePicker
                  label="Date début"
                  value={form.dateDebut}
                  onChange={val => setForm(prev => ({ ...prev, dateDebut: val }))}
                />
                <CustomDatePicker
                  label="Date fin (optionnel)"
                  value={form.dateFin}
                  onChange={val => setForm(prev => ({ ...prev, dateFin: val }))}
                  alignRight
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Catégorie</label>
                  <CustomSelect
                    options={[
                      { value: 'RENTRÉE_CLÔTURE', label: 'Rentrée / Clôture' },
                      { value: 'EXAMENS_JURY', label: 'Examens / Jury' },
                      { value: 'VACANCES', label: 'Vacances' },
                      { value: 'FÉRIÉ', label: 'Jour férié' },
                      { value: 'AUTRE', label: 'Autre' },
                    ]}
                    value={form.categorie}
                    onChange={val => setForm(prev => ({ ...prev, categorie: val }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Public cible</label>
                  <CustomSelect
                    options={[
                      { value: 'TOUS', label: 'Tous' },
                      { value: 'MATERNELLE', label: 'Maternelle' },
                      { value: 'PRIMAIRE', label: 'Primaire' },
                      { value: 'SECONDAIRE', label: 'Secondaire' },
                      { value: 'SECONDAIRE_EXETAT', label: 'Secondaire / Exetat' },
                    ]}
                    value={form.publicCible}
                    onChange={val => setForm(prev => ({ ...prev, publicCible: val as any }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-slate-500/5 transition-all cursor-pointer"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
