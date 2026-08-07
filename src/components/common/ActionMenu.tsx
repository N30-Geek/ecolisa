import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'left' | 'right';
  className?: string;
  title?: string;
  width?: number;
  header?: React.ReactNode;
}

const DEFAULT_MENU_WIDTH = 210;

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  align = 'right',
  className = '',
  title = 'Autres actions',
  width = DEFAULT_MENU_WIDTH,
  header,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = (items.length * 36) + (header ? 120 : 12);

    let left = align === 'right' ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));

    const openUpwards = rect.bottom + estimatedHeight + 8 > window.innerHeight;
    const top = openUpwards ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6;

    setPosition({ top, left });
  }, [align, items.length, header, width]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    computePosition();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const handleReposition = () => setIsOpen(false);

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        title={title}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
          isOpen
            ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/10 hover:text-indigo-600 dark:hover:text-indigo-400'
        } ${className}`}
        style={isOpen ? undefined : { borderColor: 'var(--border)' }}
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={e => e.stopPropagation()}
          className="fixed rounded-xl border shadow-2xl p-1.5 space-y-0.5 animate-scale-in"
          style={{
            top: position.top,
            left: position.left,
            width,
            zIndex: 99999,
            background: 'var(--sidebar-popover-bg, var(--bg-surface))',
            borderColor: 'var(--sidebar-popover-border, var(--border))',
            boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.4)',
          }}
        >
          {header && (
            <>
              <div className="px-1.5 pb-2" onClick={e => e.stopPropagation()}>
                {header}
              </div>
              <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
            </>
          )}
          {items.map((item, index) => {
            const ItemIcon = item.icon;
            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {item.separatorBefore && index > 0 && !header && (
                  <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return;
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : item.danger
                        ? 'text-rose-500 hover:bg-rose-500/10 cursor-pointer'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  }`}
                  style={item.danger || item.disabled ? undefined : { color: 'var(--text-primary)' }}
                >
                  {ItemIcon && (
                    <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${item.danger ? 'text-rose-500' : 'text-indigo-500'}`} />
                  )}
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
