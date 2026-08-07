import React, { useState, useEffect } from 'react';

interface NumberInputProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  integer?: boolean;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

/**
 * Champ numérique qui n'impose pas un zéro pré-rempli.
 * L'utilisateur peut vider le champ, taper un nombre entier ou décimal,
 * et le focus est personnalisé (pas de contour navigateur par défaut).
 */
export const NumberInput: React.FC<NumberInputProps> = ({
  id,
  value,
  onChange,
  onKeyDown,
  min,
  max,
  step,
  integer,
  placeholder,
  className = '',
  style,
  disabled,
}) => {
  const [raw, setRaw] = useState<string>(value === 0 ? '' : String(value));

  useEffect(() => {
    const parsed = raw === '' ? 0 : Number(raw);
    if (parsed !== value) {
      setRaw(value === 0 ? '' : String(value));
    }
  }, [value]);

  const clamp = (n: number) => {
    let v = integer ? Math.round(n) : n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    return integer ? Math.round(v) : v;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    const pattern = integer ? /^[0-9]*$/ : /^[0-9]*\.?[0-9]*$/;
    if (v === '' || pattern.test(v)) {
      setRaw(v);
      const parsed = v === '' ? 0 : Number(v);
      onChange(clamp(parsed));
    }
  };

  const handleBlur = () => {
    if (raw === '') {
      onChange(clamp(0));
      return;
    }
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      onChange(clamp(0));
      setRaw(value === 0 ? '' : String(value));
      return;
    }
    const clamped = clamp(parsed);
    onChange(clamped);
    setRaw(clamped === 0 ? '' : String(clamped));
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={raw}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`${className} focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all`.trim()}
      style={style}
    />
  );
};
