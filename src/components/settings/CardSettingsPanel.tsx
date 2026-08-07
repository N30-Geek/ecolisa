import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Palette,
  LayoutTemplate,
  Image as ImageIcon,
  Type,
  Phone,
  Mail,
  Calendar,
  Shield,
  RefreshCw,
  GraduationCap,
  CreditCard,
  SlidersHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImagePlus,
  List,
  Grid3x3,
  Columns2,
  ScanLine,
  Move,
  Upload,
  ChevronDown,
  Search,
  Layers,
  Monitor,
  Moon,
  Sun,
  X,
  Check,
  Maximize2,
  Flag,
  Stamp,
  QrCode,
  Baseline,
  Undo2,
  Baby,
  Wrench,
  Beaker,
  Cog,
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CardCustomization, CardFieldOverride } from '../onboarding/OnboardingWizard';
import { IdCardRenderer, defaultCardCustomization } from '../academic/IdCardRenderer';
import { Eleve, CodeCycle } from '../../types';

interface CardSettingsPanelProps {
  value: CardCustomization;
  onChange: (value: CardCustomization) => void;
  schoolName: string;
  schoolPhone: string;
  schoolEmail: string;
  schoolAddress: string;
  activeSchoolYear: string;
  logoUrl: string;
  secopeCode: string;
}

const CODE_CYCLES: { code: CodeCycle; label: string; icon: React.ElementType }[] = [
  { code: 'PRESCHOOL', label: 'Maternelle / Éveil', icon: Baby },
  { code: 'PRIMAIRE', label: 'Primaire', icon: GraduationCap },
  { code: 'CTEB', label: 'CTEB', icon: Wrench },
  { code: 'HUMANITES', label: 'Humanités', icon: Beaker },
  { code: 'CUSTOM', label: 'Personnalisé / Autre', icon: Cog },
];

const FIELD_DEFS: { key: string; label: string }[] = [
  { key: 'nom', label: 'Nom' },
  { key: 'postnom', label: 'Postnom' },
  { key: 'prenom', label: 'Prénom' },
  { key: 'dateNaissance', label: 'Date de naissance' },
  { key: 'lieuNaissance', label: 'Lieu de naissance' },
  { key: 'sexe', label: 'Sexe' },
  { key: 'adressePhysique', label: 'Adresse' },
  { key: 'provinceOrigine', label: 'Province' },
  { key: 'nomClasse', label: 'Classe' },
  { key: 'registrationNumber', label: 'Matricule' },
  { key: 'groupeSanguin', label: 'Groupe sanguin' },
  { key: 'nationalite', label: 'Nationalité' },
  { key: 'telephoneEleve', label: 'Tél. élève' },
  { key: 'emailEleve', label: 'Email élève' },
  { key: 'telephoneParent', label: 'Tél. parent' },
  { key: 'nomPere', label: 'Père' },
  { key: 'nomMere', label: 'Mère' },
  { key: 'statut', label: 'Statut' },
];

const PREVIEW_STUDENT: Eleve = {
  id: 'preview-001',
  registrationNumber: '2026-ED-094',
  prenom: 'Jeanne',
  nom: 'MUKENDI',
  postnom: 'NZUZI',
  sexe: 'F',
  dateNaissance: '2010-04-15',
  lieuNaissance: 'Kinshasa',
  province: 'Kinshasa',
  provinceOrigine: 'Haut-Katanga',
  adressePhysique: '12 Av. de la Justice, Gombe',
  nationalite: 'Congolaise',
  groupeSanguin: 'O+',
  telephoneEleve: '',
  emailEleve: '',
  nomPere: 'Patrick MUKENDI',
  nomMere: 'Marie NZUZI',
  telephoneParent: '+243 81 333 4444',
  statut: 'ACTIF',
  schoolYearId: 'sy-2025',
  classId: 'cl-6em',
  nomClasse: '6ème Primaire',
  nomParent: 'Patrick MUKENDI',
  photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
};

const THEME_OPTIONS = [
  { id: 'blue', label: 'Bleu EPST', color: 'bg-cyan-500' },
  { id: 'indigo', label: 'Indigo', color: 'bg-indigo-500' },
  { id: 'emerald', label: 'Vert', color: 'bg-emerald-500' },
  { id: 'gold', label: 'Or', color: 'bg-amber-500' },
];

const ALIGN_OPTIONS = [
  { value: 'left', icon: AlignLeft },
  { value: 'center', icon: AlignCenter },
  { value: 'right', icon: AlignRight },
];

const FILIGREE_SHAPES = [
  { value: 'circles', label: 'Cercles' },
  { value: 'lines', label: 'Lignes' },
  { value: 'dots', label: 'Points' },
  { value: 'diamonds', label: 'Losanges' },
  { value: 'cross', label: 'Croix' },
  { value: 'waves', label: 'Vagues' },
  { value: 'stars', label: 'Étoiles' },
];

const FIELD_LAYOUT_OPTIONS = [
  { value: 'list', label: 'Liste', icon: List },
  { value: 'grid', label: 'Grille 2 cols', icon: Grid3x3 },
  { value: 'compact', label: 'Compact', icon: Columns2 },
];

export const CardSettingsPanel: React.FC<CardSettingsPanelProps> = ({
  value,
  onChange,
  schoolName,
  schoolPhone,
  schoolEmail,
  schoolAddress,
  activeSchoolYear,
  logoUrl,
  secopeCode,
}) => {
  const [previewFace, setPreviewFace] = useState<'front' | 'back'>('front');
  const [previewCycle, setPreviewCycle] = useState<CodeCycle>('PRIMAIRE');
  const [activeCycleTab, setActiveCycleTab] = useState<CodeCycle | null>(null);
  const [fieldSearch, setFieldSearch] = useState('');
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<'general' | 'filigrane' | 'cycles'>('general');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setFieldDropdownOpen(false);
    };
    if (fieldDropdownOpen) window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [fieldDropdownOpen]);

  const schoolConfigForPreview = useMemo(
    () => ({
      schoolName,
      logoUrl,
      phone: schoolPhone,
      email: schoolEmail,
      address: schoolAddress,
      activeSchoolYear,
      secopeCode,
      cardCustomization: value,
    } as any),
    [schoolName, logoUrl, schoolPhone, schoolEmail, schoolAddress, activeSchoolYear, secopeCode, value]
  );

  const previewStudent = useMemo(
    () => ({
      ...PREVIEW_STUDENT,
      nomClasse:
        previewCycle === 'PRIMAIRE'
          ? '6ème Primaire'
          : previewCycle === 'CTEB'
          ? '7ème CTEB'
          : previewCycle === 'HUMANITES'
          ? '3ème Humanités'
          : 'Maternelle',
    }),
    [previewCycle]
  );

  const updateValue = (patch: Partial<CardCustomization>) => onChange({ ...value, ...patch });

  const toggleField = (key: string) => {
    const set = new Set(value.selectedFields);
    set.has(key) ? set.delete(key) : set.add(key);
    updateValue({ selectedFields: Array.from(set) });
  };

  const setOverride = (cycle: CodeCycle, patch: Partial<CardFieldOverride>) => {
    const byCycle = { ...(value.byCycle || {}) };
    byCycle[cycle] = { ...(byCycle[cycle] || {}), ...patch };
    if (Object.keys(byCycle[cycle] || {}).length === 0) delete byCycle[cycle];
    updateValue({ byCycle });
  };

  const getOverride = (cycle: CodeCycle): Partial<CardFieldOverride> | undefined =>
    value.byCycle?.[cycle];

  const isCycleEnabled = (cycle: CodeCycle) => !!getOverride(cycle);

  const toggleCycle = (cycle: CodeCycle) => {
    if (isCycleEnabled(cycle)) {
      const byCycle = { ...(value.byCycle || {}) };
      delete byCycle[cycle];
      updateValue({ byCycle });
    } else {
      setOverride(cycle, {});
    }
  };

  const cycleFields = (cycle: CodeCycle) =>
    getOverride(cycle)?.fields ?? value.selectedFields;

  const toggleCycleField = (cycle: CodeCycle, key: string) => {
    const set = new Set(cycleFields(cycle));
    set.has(key) ? set.delete(key) : set.add(key);
    setOverride(cycle, { fields: Array.from(set) });
  };

  const cycleValue = (
    cycle: CodeCycle,
    key: keyof CardFieldOverride,
    fallback: any
  ): any => (getOverride(cycle) as any)?.[key] ?? (value as any)[key] ?? fallback;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, scope: 'base' | CodeCycle = 'base') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string) || '';
      if (scope === 'base') updateValue({ filigreeImage: base64 });
      else setOverride(scope, { filigreeImage: base64 });
    };
    reader.readAsDataURL(file);
  };

  const activeToolsCount = useMemo(() => {
    let count = 0;
    if (value.showCoatOfArms) count++;
    if (value.showCountryFlag) count++;
    if (value.showFiligree) count++;
    if (value.showMiniLogos) count++;
    if (value.showQR) count++;
    if (value.showTricolor) count++;
    if (value.showSchoolSeal) count++;
    return count;
  }, [value]);

  const visibleFields = FIELD_DEFS.filter((f) =>
    f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
    f.key.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  const OptionButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    checked: boolean;
    onClick: () => void;
    count?: number;
  }> = ({ label, icon, checked, onClick, count }) => (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all ${
        checked
          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
          : 'border-slate-600/30 bg-slate-800/30 text-slate-400 hover:bg-slate-700/30'
      }`}
    >
      <span className="text-indigo-400/80">{icon}</span>
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center border border-slate-900">
          {count}
        </span>
      )}
    </button>
  );

  const Section: React.FC<{ icon: React.ReactNode; title: string; badge?: string | number; children: React.ReactNode }> = ({
    icon,
    title,
    badge,
    children,
  }) => (
    <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-wider">
          {icon}
          <span>{title}</span>
        </div>
        {badge !== undefined && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-300">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );

  const ControlLabel: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 tracking-wider">
      {icon}
      <span>{children}</span>
    </div>
  );

  const renderGeneralPanel = () => (
    <div className="space-y-4 animate-fade-in">
      <Section icon={<Palette className="w-4 h-4" />} title="Apparence" badge={value.cardTheme + ' · ' + (value.cardLayout === 'portrait' ? 'Portrait' : 'Paysage')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <ControlLabel icon={<Sun className="w-3 h-3" />}>Thème de couleur</ControlLabel>
            <div className="flex gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateValue({ cardTheme: t.id as any })}
                  className={`w-7 h-7 rounded-full ${t.color} border-2 transition-all ${
                    value.cardTheme === t.id ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <ControlLabel icon={<LayoutTemplate className="w-3 h-3" />}>Orientation</ControlLabel>
            <div className="flex gap-2 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {(['portrait', 'landscape'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => updateValue({ cardLayout: l })}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    value.cardLayout === l ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700/30 text-slate-400'
                  }`}
                >
                  {l === 'portrait' ? 'Portrait' : 'Paysage'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <ControlLabel icon={<AlignCenter className="w-3 h-3" />}>Align. en-tête</ControlLabel>
            <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {ALIGN_OPTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    onClick={() => updateValue({ headerAlign: a.value as any })}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                      value.headerAlign === a.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <ControlLabel icon={<Baseline className="w-3 h-3" />}>Align. texte</ControlLabel>
            <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {ALIGN_OPTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.value}
                    onClick={() => updateValue({ textAlign: a.value as any })}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center transition-all ${
                      value.textAlign === a.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700/30'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <ControlLabel icon={<Move className="w-3 h-3" />}>Photo</ControlLabel>
            <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {[
                { value: 'left', label: 'Gauche' },
                { value: 'right', label: 'Droite' },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => updateValue({ photoPosition: p.value as any })}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${
                    value.photoPosition === p.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700/30'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <ControlLabel icon={<Grid3x3 className="w-3 h-3" />}>Disposition des champs</ControlLabel>
            <div className="flex gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              {FIELD_LAYOUT_OPTIONS.map((o) => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    onClick={() => updateValue({ fieldsLayout: o.value as any })}
                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black flex items-center justify-center gap-1 transition-all ${
                      value.fieldsLayout === o.value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700/30'
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <ControlLabel icon={<Monitor className="w-3 h-3" />}>Éléments visuels</ControlLabel>
            <div className="grid grid-cols-2 gap-2">
              <OptionButton
                label="QR Code"
                icon={<QrCode className="w-3.5 h-3.5" />}
                checked={value.showQR}
                onClick={() => updateValue({ showQR: !value.showQR })}
              />
              <OptionButton
                label="Drapeau"
                icon={<Flag className="w-3.5 h-3.5" />}
                checked={value.showCountryFlag}
                onClick={() => updateValue({ showCountryFlag: !value.showCountryFlag })}
              />
              <OptionButton
                label="Armoiries"
                icon={<Stamp className="w-3.5 h-3.5" />}
                checked={value.showCoatOfArms}
                onClick={() => updateValue({ showCoatOfArms: !value.showCoatOfArms })}
              />
              <OptionButton
                label="Filigrane"
                icon={<ScanLine className="w-3.5 h-3.5" />}
                checked={value.showFiligree}
                onClick={() => updateValue({ showFiligree: !value.showFiligree })}
              />
              <OptionButton
                label="Mini-logos"
                icon={<Layers className="w-3.5 h-3.5" />}
                checked={value.showMiniLogos}
                onClick={() => updateValue({ showMiniLogos: !value.showMiniLogos })}
              />
              <OptionButton
                label="Tricolore"
                icon={<Baseline className="w-3.5 h-3.5" />}
                checked={value.showTricolor}
                onClick={() => updateValue({ showTricolor: !value.showTricolor })}
              />
              <OptionButton
                label="Sceau EPST"
                icon={<Shield className="w-3.5 h-3.5" />}
                checked={value.showSchoolSeal}
                onClick={() => updateValue({ showSchoolSeal: !value.showSchoolSeal })}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section icon={<Type className="w-4 h-4" />} title="Champs du recto" badge={value.selectedFields.length}>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setFieldDropdownOpen(!fieldDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">{value.selectedFields.length}</span>
              <span>champ{value.selectedFields.length !== 1 ? 's' : ''} sélectionné</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${fieldDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {fieldDropdownOpen && (
            <div
              className="absolute z-20 w-full mt-1 rounded-xl border shadow-xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    placeholder="Rechercher un champ..."
                    className="w-full pl-8 pr-2 py-1.5 rounded-lg border text-[10px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    style={{ background: 'var(--bg-sunken)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto p-2 space-y-1">
                {visibleFields.map((f) => {
                  const selected = value.selectedFields.includes(f.key);
                  return (
                    <label
                      key={f.key}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        selected ? 'bg-indigo-500/15 text-indigo-300' : 'hover:bg-slate-700/20 text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-500/40'}`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selected}
                        onChange={() => toggleField(f.key)}
                      />
                      {f.label}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {value.selectedFields.map((key) => {
            const f = FIELD_DEFS.find((d) => d.key === key);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
              >
                {f?.label}
                <button onClick={() => toggleField(key)} className="hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      </Section>

      <Section icon={<Phone className="w-4 h-4" />} title="Verso & Contacts" badge={value.contactPhone ? 2 : 1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <ControlLabel icon={<Phone className="w-3 h-3" />}>Téléphone</ControlLabel>
            <input
              type="text"
              value={value.contactPhone}
              onChange={(e) => updateValue({ contactPhone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="space-y-1.5">
            <ControlLabel icon={<Mail className="w-3 h-3" />}>Email</ControlLabel>
            <input
              type="text"
              value={value.contactEmail}
              onChange={(e) => updateValue({ contactEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="space-y-1.5">
            <ControlLabel icon={<Calendar className="w-3 h-3" />}>Validité</ControlLabel>
            <input
              type="text"
              value={value.validityPeriod}
              onChange={(e) => updateValue({ validityPeriod: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <ControlLabel icon={<Shield className="w-3 h-3" />}>Mention légale</ControlLabel>
          <textarea
            value={value.legalMention}
            onChange={(e) => updateValue({ legalMention: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 resize-none"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      </Section>
    </div>
  );

  const renderFiligranePanel = () => (
    <div className="space-y-4 animate-fade-in">
      <Section icon={<ScanLine className="w-4 h-4" />} title="Filigrane" badge={value.filigreeType}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1 space-y-2">
            <ControlLabel icon={<ScanLine className="w-3 h-3" />}>Type de filigrane</ControlLabel>
            <CustomSelect
              options={[
                { value: 'pattern', label: 'Motif par défaut' },
                { value: 'text', label: 'Texte' },
                { value: 'shape', label: 'Forme' },
                { value: 'image', label: 'Image' },
              ]}
              value={value.filigreeType}
              onChange={(v) => updateValue({ filigreeType: v as any })}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <ControlLabel icon={<Grid3x3 className="w-3 h-3" />}>Forme / Texture</ControlLabel>
            <CustomSelect
              options={FILIGREE_SHAPES}
              value={value.filigreeShape}
              onChange={(v) => updateValue({ filigreeShape: v as any })}
              disabled={value.filigreeType === 'pattern' || value.filigreeType === 'text' || value.filigreeType === 'image'}
            />
          </div>
        </div>

        {value.filigreeType === 'text' && (
          <div className="space-y-2">
            <ControlLabel icon={<Type className="w-3 h-3" />}>Texte du filigrane</ControlLabel>
            <input
              type="text"
              value={value.filigreeText}
              onChange={(e) => updateValue({ filigreeText: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        )}

        {value.filigreeType === 'image' && (
          <div className="space-y-2">
            <ControlLabel icon={<ImageIcon className="w-3 h-3" />}>Importer une texture</ControlLabel>
            <label className="flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer hover:bg-slate-700/20 transition-all" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
              <Upload className="w-4 h-4 text-indigo-400" />
              <span className="text-[11px] font-bold text-slate-300">{value.filigreeImage ? 'Changer l\'image' : 'Choisir une image (PNG / JPG / SVG)'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            {value.filigreeImage && (
              <div className="relative w-24 h-24 rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <img src={value.filigreeImage} alt="filigrane" className="w-full h-full object-contain" />
                <button
                  onClick={() => updateValue({ filigreeImage: '' })}
                  className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 text-white hover:bg-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <ControlLabel icon={<Layers className="w-3 h-3" />}>Densité</ControlLabel>
            <CustomSelect
              options={[
                { value: 'low', label: 'Faible' },
                { value: 'medium', label: 'Moyenne' },
                { value: 'high', label: 'Élevée' },
              ]}
              value={value.filigreeDensity}
              onChange={(v) => updateValue({ filigreeDensity: v as any })}
            />
          </div>
          <div className="space-y-2">
            <ControlLabel icon={<Sun className="w-3 h-3" />}>Opacité : {Math.round(value.filigreeOpacity * 100)}%</ControlLabel>
            <input
              type="range"
              min={0.05}
              max={0.8}
              step={0.05}
              value={value.filigreeOpacity}
              onChange={(e) => updateValue({ filigreeOpacity: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      </Section>
    </div>
  );

  const renderCyclesPanel = () => (
    <div className="space-y-4 animate-fade-in">
      <Section icon={<GraduationCap className="w-4 h-4" />} title="Personnalisation par cycle" badge={Object.keys(value.byCycle || {}).length}>
        <div className="flex flex-wrap gap-2">
          {CODE_CYCLES.map((c) => {
            const enabled = isCycleEnabled(c.code);
            return (
              <button
                key={c.code}
                onClick={() => {
                  toggleCycle(c.code);
                  setActiveCycleTab(enabled ? null : c.code);
                }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all flex items-center gap-1.5 ${
                  enabled
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-600/40 text-slate-400 hover:bg-slate-700/30'
                }`}
              >
                <c.icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {activeCycleTab && isCycleEnabled(activeCycleTab) && (
          <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase text-indigo-400">
                {CODE_CYCLES.find((c) => c.code === activeCycleTab)?.label}
              </p>
              <button
                onClick={() => {
                  const byCycle = { ...(value.byCycle || {}) };
                  delete byCycle[activeCycleTab];
                  updateValue({ byCycle });
                  setActiveCycleTab(null);
                }}
                className="text-[9px] font-black text-rose-500 hover:underline flex items-center gap-1"
              >
                <Undo2 className="w-3 h-3" /> Réinitialiser
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <ControlLabel icon={<LayoutTemplate className="w-3 h-3" />}>Orientation</ControlLabel>
                <CustomSelect
                  options={[
                    { value: '', label: 'Héritée' },
                    { value: 'portrait', label: 'Portrait' },
                    { value: 'landscape', label: 'Paysage' },
                  ]}
                  value={cycleValue(activeCycleTab, 'cardLayout', '')}
                  onChange={(v) => setOverride(activeCycleTab, { cardLayout: (v || undefined) as any })}
                />
              </div>
              <div className="space-y-2">
                <ControlLabel icon={<Palette className="w-3 h-3" />}>Thème</ControlLabel>
                <CustomSelect
                  options={[
                    { value: '', label: 'Hérité' },
                    { value: 'blue', label: 'Bleu EPST' },
                    { value: 'indigo', label: 'Indigo' },
                    { value: 'emerald', label: 'Vert' },
                    { value: 'gold', label: 'Or' },
                  ]}
                  value={cycleValue(activeCycleTab, 'cardTheme', '')}
                  onChange={(v) => setOverride(activeCycleTab, { cardTheme: (v || undefined) as any })}
                />
              </div>
              <div className="space-y-2">
                <ControlLabel icon={<Move className="w-3 h-3" />}>Position photo</ControlLabel>
                <CustomSelect
                  options={[
                    { value: '', label: 'Héritée' },
                    { value: 'left', label: 'Gauche' },
                    { value: 'right', label: 'Droite' },
                  ]}
                  value={cycleValue(activeCycleTab, 'photoPosition', '')}
                  onChange={(v) => setOverride(activeCycleTab, { photoPosition: (v || undefined) as any })}
                />
              </div>
              <div className="space-y-2">
                <ControlLabel icon={<Baseline className="w-3 h-3" />}>Align. texte</ControlLabel>
                <CustomSelect
                  options={[
                    { value: '', label: 'Hérité' },
                    { value: 'left', label: 'Gauche' },
                    { value: 'center', label: 'Centré' },
                    { value: 'right', label: 'Droite' },
                  ]}
                  value={cycleValue(activeCycleTab, 'textAlign', '')}
                  onChange={(v) => setOverride(activeCycleTab, { textAlign: (v || undefined) as any })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <ControlLabel icon={<Type className="w-3 h-3" />}>Champs du recto</ControlLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIELD_DEFS.map((f) => {
                  const selected = cycleFields(activeCycleTab).includes(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggleCycleField(activeCycleTab, f.key)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                        selected
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                          : 'border-slate-600/30 hover:bg-slate-700/20 text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Section>
    </div>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in h-full">
      {/* COLONNE CONFIGURATION */}
      <div className="xl:col-span-7 space-y-4 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="flex items-center gap-3 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-500 border border-indigo-500/30">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-indigo-400">Préférences de la Carte Élève</h3>
            <p className="text-[10px] text-slate-500 font-bold">
              {value.selectedFields.length} champs · {activeToolsCount} éléments actifs · {value.cardLayout === 'portrait' ? 'Portrait' : 'Paysage'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-1 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          {[
            { id: 'general', label: 'Général', icon: LayoutTemplate },
            { id: 'filigrane', label: 'Filigrane', icon: ScanLine },
            { id: 'cycles', label: 'Par cycle', icon: GraduationCap },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeCard === (t.id as any);
            return (
              <button
                key={t.id}
                onClick={() => setActiveCard(t.id as any)}
                className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${
                  active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {activeCard === 'general' && renderGeneralPanel()}
        {activeCard === 'filigrane' && renderFiligranePanel()}
        {activeCard === 'cycles' && renderCyclesPanel()}

        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={() => onChange(defaultCardCustomization)}
            className="px-3 py-2 rounded-xl text-[10px] font-black text-slate-400 border border-slate-600/40 hover:bg-slate-700/30 transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Réinitialiser
          </button>
        </div>
      </div>

      {/* COLONNE PRÉVISUALISATION */}
      <div className="xl:col-span-5 relative">
        <div className="xl:sticky xl:top-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Monitor className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-wider">Aperçu fixe</h3>
            </div>
            <div className="flex items-center gap-2">
              <CustomSelect
                value={previewCycle}
                onChange={(v) => setPreviewCycle(v as CodeCycle)}
                options={CODE_CYCLES.map((c) => ({ value: c.code, label: c.label, icon: c.icon }))}
                className="w-40"
              />
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setPreviewFace('front')}
                  className={`px-2.5 py-1 text-[10px] font-black ${previewFace === 'front' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400'}`}
                >
                  Recto
                </button>
                <button
                  onClick={() => setPreviewFace('back')}
                  className={`px-2.5 py-1 text-[10px] font-black ${previewFace === 'back' ? 'bg-indigo-600 text-white' : 'bg-slate-800/50 text-slate-400'}`}
                >
                  Verso
                </button>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl border flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', height: '460px' }}
          >
            <div
              className="flex items-center justify-center origin-center transition-transform"
              style={{ transform: `scale(${value.cardLayout === 'landscape' ? '0.82' : '0.9'})` }}
            >
              <IdCardRenderer
                student={previewStudent}
                schoolConfig={schoolConfigForPreview}
                face={previewFace}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            L'aperçu se met à jour instantanément. Le fond suit le thème de l'application.
          </p>
        </div>
      </div>
    </div>
  );
};
