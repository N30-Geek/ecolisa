import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortableThProps {
  label: string;
  field: string;
  currentSortField?: string;
  currentSortOrder?: 'asc' | 'desc';
  onSort: (field: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const SortableTh: React.FC<SortableThProps> = ({
  label,
  field,
  currentSortField,
  currentSortOrder = 'asc',
  onSort,
  align = 'left',
  className = '',
}) => {
  const isSorted = currentSortField === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={`cursor-pointer select-none group transition-colors hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/5 ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
      title={`Trier par ${label}`}
    >
      <div
        className={`inline-flex items-center gap-1.5 ${
          align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : 'justify-start'
        }`}
      >
        <span className={isSorted ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>{label}</span>
        <span
          className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
            isSorted
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/15'
              : 'text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-indigo-500'
          }`}
        >
          {isSorted ? (
            currentSortOrder === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </span>
      </div>
    </th>
  );
};
