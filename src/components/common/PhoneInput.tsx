import React, { useMemo } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  required?: boolean;
  disabled?: boolean;
  /** Couleur d'anneau au focus (ex: 'focus:ring-indigo-500' ou 'focus:ring-rose-500') */
  focusRingClass?: string;
  id?: string;
}

// Indicatif pays par défaut — RDC (+243)
const COUNTRY_CODE = '+243';

/**
 * Champ téléphone avec indicatif pays (+243) pré-fixé et non modifiable.
 * L'utilisateur saisit uniquement le numéro local (sans l'indicatif).
 * La valeur stockée/retournée inclut toujours le préfixe "+243 ".
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  placeholder = '81 000 0000',
  className = '',
  style,
  required,
  disabled,
  focusRingClass = 'focus:ring-indigo-500',
  id,
}) => {
  // Extraire la partie locale (sans l'indicatif) pour l'affichage
  const localPart = useMemo(() => {
    if (!value) return '';
    let v = value.trim();
    // Retirer tous les préfixes possibles : +243, 00243, 243, ou 0 initial
    if (v.startsWith('+243')) v = v.slice(4);
    else if (v.startsWith('00243')) v = v.slice(5);
    else if (v.startsWith('243') && v.length > 6) v = v.slice(3);
    else if (v.startsWith('0')) v = v.slice(1);
    return v.trim();
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ne garder que les chiffres et espaces
    const raw = e.target.value.replace(/[^0-9 ]/g, '');
    if (raw.trim() === '') {
      onChange('');
      return;
    }
    onChange(`${COUNTRY_CODE} ${raw.trim()}`);
  };

  return (
    <div
      className={`flex items-stretch rounded-lg border transition-all focus-within:ring-2 focus-within:${focusRingClass} ${className}`}
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      <span
        className="flex items-center px-3 text-xs font-black border-r select-none shrink-0"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
          background: 'var(--bg-sunken)',
        }}
      >
        {COUNTRY_CODE}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={localPart}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="flex-1 min-w-0 px-3.5 py-2 bg-transparent text-xs font-bold outline-none"
        style={{ color: 'var(--text-primary)' }}
      />
    </div>
  );
};
