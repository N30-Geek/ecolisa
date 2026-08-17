import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomSelect } from './CustomSelect';

export interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const pageSizeOptions = [
    { value: '5', label: '5 / page' },
    { value: '10', label: '10 / page' },
    { value: '25', label: '25 / page' },
    { value: '50', label: '50 / page' },
  ];

  // Generate page numbers with ellipsis
  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (currentPage < totalPages - 2) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return (
    <div
      className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
    >
      <div className="flex items-center gap-2">
        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Afficher :</span>
        <CustomSelect
          options={pageSizeOptions}
          value={String(pageSize)}
          onChange={(val) => {
            onPageSizeChange(Number(val));
            onPageChange(1);
          }}
          className="w-28"
        />
        <span className="font-semibold text-slate-500 dark:text-slate-400">
          {startItem}–{endItem} sur {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {pageNumbers.map((pn, idx) =>
          typeof pn === 'number' ? (
            <button
              key={`page-${pn}`}
              onClick={() => onPageChange(pn)}
              className={`min-w-[28px] h-7 px-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                pn === currentPage
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'border hover:bg-indigo-500/15'
              }`}
              style={pn === currentPage ? undefined : { borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {pn}
            </button>
          ) : (
            <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">…</span>
          )
        )}

        <button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-indigo-500/15 cursor-pointer"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
