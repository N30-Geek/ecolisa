import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ElementType;
  description?: string;
  badge?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  icon: Icon,
  className = '',
  disabled = false,
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const isSearchable = searchable ?? options.length > 6;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = isSearchable && searchTerm.trim() !== ''
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border shadow-xs cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'hover:border-indigo-500/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{
          background: 'var(--bg-sunken)',
          borderColor: isOpen ? '#6366f1' : 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon ? (
            <selectedOption.icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          ) : Icon ? (
            <Icon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          ) : null}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[200px] w-full rounded-xl border shadow-lg z-[99999] p-1 space-y-1 animate-scale-in"
          style={{
            background: 'var(--sidebar-popover-bg)',
            borderColor: 'var(--sidebar-popover-border)',
          }}
        >
          {isSearchable && (
            <div className="p-1 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  autoFocus
                  className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none focus:border-indigo-500 font-medium"
                  style={{
                    background: 'var(--bg-sunken)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5 sidebar-scroll p-0.5">
            {filteredOptions.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-2 font-medium">Aucun résultat trouvé</p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    style={{
                      color: isSelected ? '#ffffff' : 'var(--text-primary)',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {OptIcon && <OptIcon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />}
                      <div className="min-w-0">
                        <p className="truncate leading-snug">{opt.label}</p>
                        {opt.description && (
                          <p className={`text-[10px] truncate ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                            {opt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800/60">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
