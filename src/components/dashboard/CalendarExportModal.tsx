import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Calendar, Filter, RotateCcw, FileDown } from 'lucide-react';
import { CalendarEventData, categoryInfo } from '../../utils/calendarHelpers';
import { CustomSelect } from '../common/CustomSelect';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { generateCalendarPDF } from '../../utils/calendarPdfExport';

interface CalendarExportModalProps {
  events: CalendarEventData[];
  title: string;
  subtitle?: string;
  anneeScolaire?: string;
  onClose: () => void;
}

const CYCLE_OPTIONS = [
  { value: 'TOUS', label: 'Tous les cycles' },
  { value: 'MATERNELLE', label: 'Cycle Maternelle' },
  { value: 'PRIMAIRE', label: 'Cycle Primaire' },
  { value: 'SECONDAIRE', label: 'Secondaire (général)' },
  { value: 'SECONDAIRE_EXETAT', label: 'Secondaire / EXETAT' },
];

const CAT_OPTIONS = [
  { value: 'TOUS', label: 'Toutes les catégories' },
  { value: 'EXAMENS_JURY', label: 'Examens & Jury' },
  { value: 'VACANCES', label: 'Vacances & Congés' },
  { value: 'FÉRIÉ', label: 'Jours Fériés RDC' },
  { value: 'RENTRÉE_CLÔTURE', label: 'Rentrée / Clôture' },
];

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  events,
  title,
  subtitle,
  anneeScolaire,
  onClose,
}) => {
  const [cycle, setCycle] = useState('TOUS');
  const [categorie, setCategorie] = useState('TOUS');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeList, setIncludeList] = useState(true);
  const [generating, setGenerating] = useState(false);

  const previewCount = useMemo(() => {
    const q = search.toLowerCase().trim();
    return events.filter((ev) => {
      if (categorie !== 'TOUS' && ev.categorie !== categorie) return false;
      if (cycle !== 'TOUS' && ev.publicCible && ev.publicCible !== 'TOUS') {
        if (cycle === 'SECONDAIRE') {
          if (!ev.publicCible.startsWith('SECONDAIRE')) return false;
        } else if (ev.publicCible !== cycle) {
          return false;
        }
      }
      if (q) {
        const hay = `${ev.titre} ${ev.subtitre || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (startDate && ev.dateDebut < startDate) return false;
      if (endDate && ev.dateFin ? ev.dateFin > endDate : ev.dateDebut > endDate) return false;
      return true;
    }).length;
  }, [events, cycle, categorie, search, startDate, endDate]);

  const handleExport = async (withFilters = true) => {
    setGenerating(true);
    await generateCalendarPDF(events, {
      title,
      subtitle,
      anneeScolaire,
      filters: withFilters
        ? { cycle, categorie, search, startDate, endDate }
        : { cycle: 'TOUS', categorie: 'TOUS', search: '', startDate: '', endDate: '' },
      includeList,
      orientation: 'landscape',
    });
    setGenerating(false);
    onClose();
  };

  const handleExportAll = () => {
    setCycle('TOUS');
    setCategorie('TOUS');
    setSearch('');
    setStartDate('');
    setEndDate('');
    return handleExport(false);
  };

  const handleReset = () => {
    setCycle('TOUS');
    setCategorie('TOUS');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setIncludeList(true);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-0)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center border"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: '#6366f1', boxShadow: 'var(--elevation-1)' }}
            >
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>Exporter le calendrier en PDF</h3>
              <p className="text-[10.5px] text-slate-400">Grille mensuelle paysage + liste détaillée</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              disabled={generating || events.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50 hover:shadow-sm"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: '#6366f1', border: '1px solid var(--border)', boxShadow: 'var(--elevation-1)' }}
            >
              <FileDown className="w-3.5 h-3.5" />
              Tout exporter
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                <Filter className="w-3.5 h-3.5" />
                <span>Filtres d'exportation (optionnels)</span>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomSelect
                options={CYCLE_OPTIONS}
                value={cycle}
                onChange={setCycle}
                placeholder="Cycle / Public"
              />
              <CustomSelect
                options={CAT_OPTIONS}
                value={categorie}
                onChange={setCategorie}
                placeholder="Catégorie"
              />
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un mot-clé..."
                className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-1)' }}>
            <div className="flex items-center gap-2 text-xs font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
              <Calendar className="w-3.5 h-3.5" />
              <span>Plage de dates (optionnel)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Du..."
                className="w-full"
              />
              <CustomDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="Au..."
                alignRight
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="includeList"
              type="checkbox"
              checked={includeList}
              onChange={(e) => setIncludeList(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="includeList" className="text-xs font-bold cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              Inclure la liste détaillée en fin de document
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <span className="text-xs font-bold" style={{ color: '#6366f1' }}>
              {previewCount} événement{previewCount > 1 ? 's' : ''} correspond{previewCount > 1 ? 'ent' : ''}
            </span>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)', boxShadow: 'var(--elevation-1)' }}
              >
                Annuler
              </button>
              <button
                onClick={() => handleExport(false)}
                disabled={generating || events.length === 0}
                className="px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5 hover:shadow-md"
                style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: '#6366f1', boxShadow: 'var(--elevation-1)' }}
              >
                <FileDown className="w-3.5 h-3.5" />
                Tout exporter
              </button>
              <button
                onClick={() => handleExport(true)}
                disabled={generating || previewCount === 0}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                {generating ? 'Génération...' : 'Exporter filtré'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
