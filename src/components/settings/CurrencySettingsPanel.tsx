import React, { useState } from 'react';
import { Plus, Trash2, RefreshCw, Check, Globe, DollarSign, Hash } from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { NumberInput } from '../common/NumberInput';
import { Currency, NumberFormatConfig, DEFAULT_CURRENCIES, DEFAULT_NUMBER_FORMAT, applyNumberFormatPreset } from '../../utils/currency';

interface CurrencySettingsPanelProps {
  currencies: Currency[];
  onChange: (currencies: Currency[]) => void;
  referenceCurrency: string;
  onReferenceChange: (code: string) => void;
  displayCurrency: string;
  onDisplayChange: (code: string) => void;
  numberFormat?: NumberFormatConfig;
  onNumberFormatChange?: (nf: NumberFormatConfig) => void;
}

export const CurrencySettingsPanel: React.FC<CurrencySettingsPanelProps> = ({
  currencies,
  onChange,
  referenceCurrency,
  onReferenceChange,
  displayCurrency,
  onDisplayChange,
  numberFormat = DEFAULT_NUMBER_FORMAT,
  onNumberFormatChange,
}) => {
  const [newCurrency, setNewCurrency] = useState<Partial<Currency>>({
    code: '',
    name: '',
    symbol: '',
    rateToReference: 1,
  });

  const nf = { ...DEFAULT_NUMBER_FORMAT, ...numberFormat };

  const handleNfPreset = (preset: NumberFormatConfig['preset']) => {
    if (!onNumberFormatChange) return;
    const applied = applyNumberFormatPreset(preset);
    onNumberFormatChange({ ...nf, ...applied, preset: preset || 'CUSTOM' } as NumberFormatConfig);
  };

  const updateNf = (patch: Partial<NumberFormatConfig>) => {
    if (!onNumberFormatChange) return;
    const next = { ...nf, ...patch } as NumberFormatConfig;
    const isPreset = Object.keys(patch).length === 1 && 'preset' in patch;
    if (!isPreset && next.preset && next.preset !== 'CUSTOM') {
      next.preset = 'CUSTOM';
    }
    onNumberFormatChange(next);
  };

  const displayOptions = currencies.map((c) => ({ value: c.code, label: `${c.name} (${c.code} / ${c.symbol})` }));
  const referenceOptions = [...displayOptions, { value: '__add_new__', label: '+ Ajouter une devise de référence' }];

  const handleAdd = () => {
    const code = (newCurrency.code || '').toUpperCase().trim();
    if (!code) return;
    if (currencies.some((c) => c.code === code)) return;
    const created: Currency = {
      code,
      name: (newCurrency.name || code).trim(),
      symbol: (newCurrency.symbol || code).trim(),
      rateToReference: Number(newCurrency.rateToReference) || 1,
      isReference: currencies.length === 0,
    };
    const next = [...currencies, created];
    onChange(next);
    if (next.length === 1) {
      onReferenceChange(created.code);
      onDisplayChange(created.code);
    }
    setNewCurrency({ code: '', name: '', symbol: '', rateToReference: 1 });
  };

  const handleRemove = (code: string) => {
    const next = currencies.filter((c) => c.code !== code);
    onChange(next);
    if (referenceCurrency === code) {
      const ref = next.find((c) => c.isReference)?.code || next[0]?.code || '';
      onReferenceChange(ref);
      if (displayCurrency === code) onDisplayChange(ref);
    } else if (displayCurrency === code) {
      onDisplayChange(referenceCurrency);
    }
  };

  const handleSetReference = (code: string) => {
    if (code === '__add_new__') return;
    const next = currencies.map((c) => ({ ...c, isReference: c.code === code }));
    onChange(next);
    onReferenceChange(code);
  };

  const handleRateChange = (code: string, rate: number) => {
    const next = currencies.map((c) => (c.code === code ? { ...c, rateToReference: rate } : c));
    onChange(next);
  };

  const handleReset = () => {
    onChange(DEFAULT_CURRENCIES);
    onReferenceChange('USD');
    onDisplayChange('USD');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start gap-3 p-3.5 rounded-xl border bg-indigo-500/10 border-indigo-500/25">
        <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
          Définissez la devise de référence (taux = 1) et les autres devises avec leur taux de conversion.
          L'affichage utilisera la devise choisie par l'utilisateur.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Devise de référence</label>
          <CustomSelect
            options={currencies.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))}
            value={referenceCurrency}
            onChange={handleSetReference}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500">La devise de référence a toujours un taux de 1.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Devise d'affichage par défaut</label>
          <CustomSelect
            options={displayOptions}
            value={displayCurrency}
            onChange={onDisplayChange}
            className="w-full"
          />
        </div>
      </div>

      <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-indigo-500" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Format d'affichage des montants
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Preset</label>
            <CustomSelect
              options={[
                { value: 'FR', label: 'Français (1 000 000,00)' },
                { value: 'US', label: 'Anglais (1,000,000.00)' },
                { value: 'DE', label: 'Allemand (1.000.000,00)' },
                { value: 'NONE', label: 'Sans séparateur (1000000.00)' },
                { value: 'CUSTOM', label: 'Personnalisé' },
              ]}
              value={nf.preset || 'CUSTOM'}
              onChange={(v) => handleNfPreset(v as NumberFormatConfig['preset'])}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Séparateur milliers</label>
            <CustomSelect
              options={[
                { value: ' ', label: 'Espace (1 000)' },
                { value: ',', label: 'Virgule (1,000)' },
                { value: '.', label: 'Point (1.000)' },
                { value: '', label: 'Aucun' },
              ]}
              value={nf.thousandsSeparator}
              onChange={(v) => updateNf({ thousandsSeparator: v as any })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Séparateur décimal</label>
            <CustomSelect
              options={[
                { value: ',', label: 'Virgule (0,00)' },
                { value: '.', label: 'Point (0.00)' },
              ]}
              value={nf.decimalSeparator}
              onChange={(v) => updateNf({ decimalSeparator: v as any })}
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Décimales</label>
            <NumberInput
              value={nf.decimalPlaces}
              onChange={(v) => updateNf({ decimalPlaces: Math.max(0, Math.min(6, Math.round(v || 0))) })}
              min={0}
              max={6}
              className="w-full px-2 py-1.5 rounded border text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Position du symbole</label>
            <CustomSelect
              options={[
                { value: 'after', label: 'Après le montant' },
                { value: 'before', label: 'Avant le montant' },
              ]}
              value={nf.currencyPosition}
              onChange={(v) => updateNf({ currencyPosition: v as any })}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3 h-full pt-5">
            <input
              id="showSymbol"
              type="checkbox"
              checked={nf.showCurrencySymbol}
              onChange={(e) => updateNf({ showCurrencySymbol: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="showSymbol" className="text-xs font-bold text-slate-500 select-none cursor-pointer">
              Afficher le symbole de la devise
            </label>
          </div>
        </div>

        <div className="p-3 rounded-xl border bg-white/5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Aperçu</p>
          <p className="font-mono text-lg font-black" style={{ color: 'var(--text-primary)' }}>
            {(() => {
              const displayCur = currencies.find((c) => c.code === displayCurrency) || currencies[0];
              const formatted = [1234567.89, 1000000, 500.5]
                .map((n) => {
                  const s = nf.showCurrencySymbol ? (displayCur?.symbol || displayCur?.code || '') : '';
                  const v = n.toFixed(nf.decimalPlaces).split('.');
                  const intPart = v[0].replace(/\B(?=(\d{3})+(?!\d))/g, nf.thousandsSeparator === ' ' ? '\u00A0' : nf.thousandsSeparator);
                  const dec = nf.decimalPlaces > 0 ? `${nf.decimalSeparator}${v[1]}` : '';
                  const num = `${intPart}${dec}`;
                  return nf.currencyPosition === 'before' ? `${s} ${num}` : `${num} ${s}`;
                })
                .join('  ·  ');
              return formatted;
            })()}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Devises configurées ({currencies.length})
          </h4>
          <button
            onClick={handleReset}
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Réinitialiser les devises par défaut
          </button>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-xs">
            <thead style={{ background: 'var(--bg-sunken)' }}>
              <tr className="text-left text-slate-500 dark:text-slate-400 font-bold">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Symbole</th>
                <th className="px-3 py-2">Taux vs réf.</th>
                <th className="px-3 py-2 text-center">Réf.</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((c) => (
                <tr key={c.code} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2 font-black" style={{ color: 'var(--text-primary)' }}>{c.code}</td>
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 font-mono">{c.symbol}</td>
                  <td className="px-3 py-2">
                    <NumberInput
                      value={c.rateToReference}
                      onChange={(v) => handleRateChange(c.code, v)}
                      min={0.000001}
                      className="w-24 px-2 py-1 rounded border text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    {c.isReference ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : null}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleRemove(c.code)}
                      disabled={currencies.length <= 1}
                      className="text-rose-500 hover:text-rose-700 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Ajouter une devise
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Code (ex: XAF)"
            value={newCurrency.code || ''}
            onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
            className="px-3 py-2 rounded-lg border text-xs font-bold"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            placeholder="Nom (ex: Franc CFA BEAC)"
            value={newCurrency.name || ''}
            onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
            className="px-3 py-2 rounded-lg border text-xs"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <input
            type="text"
            placeholder="Symbole (ex: FCFA)"
            value={newCurrency.symbol || ''}
            onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
            className="px-3 py-2 rounded-lg border text-xs"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <NumberInput
            value={Number(newCurrency.rateToReference) || 1}
            onChange={(v) => setNewCurrency({ ...newCurrency, rateToReference: v })}
            min={0.000001}
            placeholder="Taux vs référence"
            className="px-3 py-2 rounded-lg border text-xs"
          />
          <button
            onClick={handleAdd}
            disabled={!(newCurrency.code || '').trim()}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>
    </div>
  );
};
