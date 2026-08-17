import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pageSizeOptions?: number[];
  start: number;
  end: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  compact?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  total,
  pageSize,
  pageSizeOptions = [10, 25, 50, 100],
  start,
  end,
  onPageChange,
  onPageSizeChange,
  compact = false,
}) => {
  if (total <= 0) return null;

  const items = [] as (number | string)[];
  const delta = 1;

  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
  } else {
    items.push(1);
    let l = Math.max(2, currentPage - delta);
    let r = Math.min(totalPages - 1, currentPage + delta);
    if (currentPage - delta <= 2) r = Math.min(totalPages - 1, 4);
    if (currentPage + delta >= totalPages - 1) l = Math.max(2, totalPages - 3);
    if (l > 2) items.push('...');
    for (let i = l; i <= r; i++) items.push(i);
    if (r < totalPages - 1) items.push('...');
    items.push(totalPages);
  }

  const sizeOptions = pageSizeOptions.map(s => ({ value: String(s), label: `${s} / page` }));

  return (
    <div
      className={`flex items-center ${compact ? 'gap-2' : 'flex-wrap gap-3'} justify-between px-4 py-3 border-t select-none`}
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-bold text-slate-500 dark:text-slate-400">
          {start}-{end} sur <span className="text-indigo-600 dark:text-indigo-400 font-black">{total}</span>
        </span>
        {onPageSizeChange && (
          <div className="w-28">
            <CustomSelect
              options={sizeOptions}
              value={String(pageSize)}
              onChange={val => onPageSizeChange(Number(val))}
              placeholder="Taille"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          title="Première page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          title="Page précédente"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {items.map((it, idx) => (
          <React.Fragment key={idx}>
            {typeof it === 'string' ? (
              <span className="px-1 text-xs font-bold" style={{ color: 'var(--text-disabled)' }}>...</span>
            ) : (
              <button
                type="button"
                onClick={() => onPageChange(it)}
                className={`min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  it === currentPage
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 scale-105'
                    : 'border hover:bg-indigo-500/10 text-slate-700 dark:text-slate-300'
                }`}
                style={it === currentPage ? {} : { borderColor: 'var(--border)' }}
              >
                {it}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          title="Page suivante"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all hover:bg-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          title="Dernière page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

