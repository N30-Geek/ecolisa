import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  creatable?: boolean;
  createLabel?: (term: string) => string;
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
  creatable,
  createLabel = (term: string) => `Créer « ${term} »`,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value)
    || (value ? { value, label: value } : undefined);
  const isSearchable = searchable ?? options.length > 6;
  const estimatedMenuHeight = Math.min(options.length * 34 + (isSearchable ? 44 : 0) + 16, 300);

  const computePosition = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedMenuHeight && rect.top > spaceBelow;
    setMenuPos({
      top: openUp ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (isOpen) computePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleReflow = () => computePosition();
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseFiltered = isSearchable && searchTerm.trim() !== ''
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const canCreate = creatable && searchTerm.trim() !== '' && !options.some(opt =>
    opt.value.toLowerCase() === searchTerm.toLowerCase() ||
    opt.label.toLowerCase() === searchTerm.toLowerCase()
  );

  const filteredOptions = canCreate
    ? [...baseFiltered, { value: searchTerm.trim(), label: createLabel(searchTerm.trim()) }]
    : baseFiltered;

  const menuJSX = isOpen ? createPortal(
    (
      <div
        ref={menuRef}
        className="fixed rounded-2xl border shadow-sm z-[99999] p-1.5 space-y-1.5 animate-scale-in"
        style={{
          top: menuPos.openUp ? undefined : menuPos.top,
          bottom: menuPos.openUp ? window.innerHeight - menuPos.top : undefined,
          left: menuPos.left,
          width: Math.max(menuPos.width, 260),
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-sm)',
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
                      isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'hover:bg-[var(--bg-sunken)]'
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
    ),
    document.body
  ) : null;

  return (
    <div className={`relative text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-colors border cursor-pointer focus:outline-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        style={{
          background: 'var(--bg-sunken)',
          borderColor: isOpen ? '#6366f1' : 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption?.icon ? (
            <selectedOption.icon className="w-4 h-4 text-indigo-500 shrink-0" />
          ) : Icon ? (
            <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
          ) : null}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </button>

      {menuJSX}
    </div>
  );
};
