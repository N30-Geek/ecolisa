import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
  const showFirst = 1;
  const showLast = totalPages;
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

  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'flex-wrap gap-3'} justify-between px-4 py-3 border-t`} style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span className="font-medium">
          {start}-{end} sur {total}
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="ml-1 rounded-lg border px-1.5 py-0.5 text-[11px] outline-none focus:border-indigo-500"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          title="Première page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          title="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {items.map((it, idx) => (
          <React.Fragment key={idx}>
            {typeof it === 'string' ? (
              <span className="px-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>...</span>
            ) : (
              <button
                onClick={() => onPageChange(it)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-colors ${
                  it === currentPage
                    ? 'bg-indigo-600 text-white'
                    : 'border hover:bg-indigo-500/10'
                }`}
                style={it === currentPage ? {} : { borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                {it}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          title="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          title="Dernière page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
