import React, { useMemo } from 'react';
import { QRCode } from 'react-qr-code';
import { User, School, Shield, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { Eleve, CodeCycle } from '../../types';
import { SchoolConfig, CardCustomization, CardFieldOverride } from '../onboarding/OnboardingWizard';

type CardTheme = 'blue' | 'indigo' | 'emerald' | 'gold';
type CardLayout = 'portrait' | 'landscape';

const ALL_FIELDS: { key: string; label: string; get: (s: Eleve) => React.ReactNode }[] = [
  { key: 'nom', label: 'Nom', get: (s) => s.nom },
  { key: 'postnom', label: 'Postnom', get: (s) => s.postnom || '-' },
  { key: 'prenom', label: 'Prénom', get: (s) => s.prenom },
  { key: 'dateNaissance', label: 'Né(e) le', get: (s) => formatDate(s.dateNaissance) },
  { key: 'lieuNaissance', label: 'Né(e) à', get: (s) => s.lieuNaissance },
  { key: 'sexe', label: 'Sexe', get: (s) => s.sexe },
  { key: 'adressePhysique', label: 'Adresse', get: (s) => s.adressePhysique },
  { key: 'provinceOrigine', label: 'Province', get: (s) => s.provinceOrigine },
  { key: 'nomClasse', label: 'Classe', get: (s) => s.nomClasse },
  { key: 'registrationNumber', label: 'Matricule', get: (s) => s.registrationNumber },
  { key: 'groupeSanguin', label: 'Groupe Sanguin', get: (s) => s.groupeSanguin },
  { key: 'nationalite', label: 'Nationalité', get: (s) => s.nationalite },
  { key: 'telephoneEleve', label: 'Tél. élève', get: (s) => s.telephoneEleve },
  { key: 'emailEleve', label: 'Email élève', get: (s) => s.emailEleve },
  { key: 'telephoneParent', label: 'Tél. Parent', get: (s) => s.telephoneParent },
  { key: 'nomPere', label: 'Père', get: (s) => s.nomPere },
  { key: 'nomMere', label: 'Mère', get: (s) => s.nomMere },
  { key: 'statut', label: 'Statut', get: (s) => s.statut },
  { key: 'numeroActeNaissance', label: 'N° Acte', get: (s) => s.numeroActeNaissance },
  { key: 'ecoleOrigine', label: 'École origine', get: (s) => s.ecoleOrigine },
  { key: 'religion', label: 'Religion', get: (s) => s.religion },
  { key: 'langueMaternelle', label: 'Langue', get: (s) => s.langueMaternelle },
  { key: 'handicap', label: 'Handicap', get: (s) => s.handicap },
  { key: 'vaccinations', label: 'Vaccins', get: (s) => s.vaccinations },
  { key: 'medecinTraitant', label: 'Médecin', get: (s) => s.medecinTraitant },
  { key: 'assuranceSante', label: 'Assurance', get: (s) => s.assuranceSante },
  { key: 'numeroCarteSante', label: 'Carte santé', get: (s) => s.numeroCarteSante },
  { key: 'nomTuteur', label: 'Tuteur', get: (s) => s.nomTuteur },
  { key: 'telephoneTuteur', label: 'Tél. tuteur', get: (s) => s.telephoneTuteur },
  { key: 'relationTuteur', label: 'Lien tuteur', get: (s) => s.relationTuteur },
  { key: 'nomReferentUrgence', label: 'Urgence', get: (s) => s.nomReferentUrgence },
  { key: 'telephoneReferentUrgence', label: 'Tél. urgence', get: (s) => s.telephoneReferentUrgence },
  { key: 'relationReferentUrgence', label: 'Lien urgence', get: (s) => s.relationReferentUrgence },
  { key: 'transportScolaire', label: 'Transport', get: (s) => s.transportScolaire },
  { key: 'anneePrecedente', label: 'Année préc.', get: (s) => s.anneePrecedente },
  { key: 'moyenneAnneePrecedente', label: 'Moyenne', get: (s) => s.moyenneAnneePrecedente },
  { key: 'dateInscription', label: 'Inscrit le', get: (s) => formatDate(s.dateInscription) },
];

interface IdCardRendererProps {
  student: Eleve;
  schoolConfig?: Partial<SchoolConfig> | null;
  cardConfig?: Partial<CardCustomization>;
  face?: 'front' | 'back';
  className?: string;
  style?: React.CSSProperties;
}

export const defaultCardCustomization: CardCustomization = {
  selectedFields: ['nom', 'postnom', 'prenom', 'dateNaissance', 'lieuNaissance', 'sexe', 'nationalite', 'groupeSanguin', 'adressePhysique', 'provinceOrigine', 'nomClasse', 'registrationNumber', 'telephoneParent', 'nomPere', 'nomMere', 'transportScolaire'],
  legalMention: 'Cette carte est strictement personnelle. Toute falsification est punissable par la loi.',
  validityPeriod: '2025–2026',
  contactPhone: '+243 81 555 0192',
  contactEmail: 'contact@ecolisa.cd',
  showCoatOfArms: true,
  showCountryFlag: true,
  showFiligree: true,
  showMiniLogos: true,
  cardTheme: 'blue',
  cardLayout: 'portrait',
  byCycle: {},
  filigreeType: 'pattern',
  filigreeText: 'EPST',
  filigreeShape: 'circles',
  filigreeImage: '',
  filigreeOpacity: 0.18,
  filigreeDensity: 'medium',
  headerAlign: 'center',
  photoPosition: 'right',
  fieldsLayout: 'compact',
  textAlign: 'left',
  showQR: true,
  showTricolor: true,
  showSchoolSeal: true,
};

const themeMeta: Record<CardTheme, { primary: string; secondary: string; accent: string; border: string; watermark: string; light: string }> = {
  blue:    { primary: '#0369a1', secondary: '#0ea5e9', accent: '#f59e0b', border: '#bae6fd', watermark: 'rgba(14,165,233,0.08)', light: '#e0f2fe' },
  indigo:  { primary: '#4338ca', secondary: '#6366f1', accent: '#f59e0b', border: '#c7d2fe', watermark: 'rgba(99,102,241,0.08)', light: '#e0e7ff' },
  emerald: { primary: '#047857', secondary: '#10b981', accent: '#f59e0b', border: '#a7f3d0', watermark: 'rgba(16,185,129,0.08)', light: '#d1fae5' },
  gold:    { primary: '#b45309', secondary: '#f59e0b', accent: '#dc2626', border: '#fde68a', watermark: 'rgba(245,158,11,0.08)', light: '#fef3c7' },
};

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('fr-FR'); } catch { return d; }
}

function detectCycle(nomClasse?: string): CodeCycle {
  const n = (nomClasse || '').toLowerCase();
  if (n.includes('maternelle') || n.includes('préscolaire') || n.includes('preschool')) return 'PRESCHOOL';
  if (n.includes('primaire')) return 'PRIMAIRE';
  if (n.includes('cteb') || n.includes('7ème') || n.includes('8ème') || n.includes('7e') || n.includes('8e')) return 'CTEB';
  if (n.includes('humanité') || n.includes('humanites') || n.includes('3ème') || n.includes('4ème') || n.includes('3e') || n.includes('4e') || n.includes('1ère') || n.includes('2nde') || n.includes('terminale')) return 'HUMANITES';
  return 'CUSTOM';
}

function resolveCardConfig(
  schoolConfig: Partial<SchoolConfig> | null | undefined,
  cardConfig: Partial<CardCustomization> | undefined,
  cycle: CodeCycle
): CardCustomization {
  const base = { ...defaultCardCustomization, ...schoolConfig?.cardCustomization, ...cardConfig };
  const override = (base.byCycle || {})[cycle] as CardFieldOverride | undefined;
  if (!override) return base;
  return {
    ...base,
    selectedFields: override.fields ?? base.selectedFields,
    legalMention: override.legalMention ?? base.legalMention,
    validityPeriod: override.validityPeriod ?? base.validityPeriod,
    showCoatOfArms: override.showCoatOfArms ?? base.showCoatOfArms,
    showCountryFlag: override.showCountryFlag ?? base.showCountryFlag,
    showFiligree: override.showFiligree ?? base.showFiligree,
    showMiniLogos: override.showMiniLogos ?? base.showMiniLogos,
    cardTheme: (override.cardTheme ?? base.cardTheme) as CardTheme,
    cardLayout: (override.cardLayout ?? base.cardLayout) as CardLayout,
    filigreeType: (override.filigreeType ?? base.filigreeType) as CardCustomization['filigreeType'],
    filigreeText: override.filigreeText ?? base.filigreeText,
    filigreeShape: (override.filigreeShape ?? base.filigreeShape) as CardCustomization['filigreeShape'],
    filigreeImage: override.filigreeImage ?? base.filigreeImage,
    filigreeOpacity: override.filigreeOpacity ?? base.filigreeOpacity,
    filigreeDensity: (override.filigreeDensity ?? base.filigreeDensity) as CardCustomization['filigreeDensity'],
    headerAlign: (override.headerAlign ?? base.headerAlign) as CardCustomization['headerAlign'],
    photoPosition: (override.photoPosition ?? base.photoPosition) as CardCustomization['photoPosition'],
    fieldsLayout: (override.fieldsLayout ?? base.fieldsLayout) as CardCustomization['fieldsLayout'],
    textAlign: (override.textAlign ?? base.textAlign) as CardCustomization['textAlign'],
    showQR: override.showQR ?? base.showQR,
    showTricolor: override.showTricolor ?? base.showTricolor,
    showSchoolSeal: override.showSchoolSeal ?? base.showSchoolSeal,
  };
}

const idPayload = (student: Eleve) =>
  JSON.stringify({
    app: 'ECOLISA',
    type: 'STUDENT_CARD',
    id: student.id,
    matricule: student.registrationNumber,
    nom: `${student.nom} ${student.postnom || ''} ${student.prenom}`.trim(),
    timestamp: new Date().toISOString(),
  });

const DRCFlag: React.FC<{ size?: number; className?: string }> = ({ size = 28, className }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className={className}>
    <defs>
      <clipPath id="circleClip"><circle cx="20" cy="20" r="20" /></clipPath>
    </defs>
    <g clipPath="url(#circleClip)">
      <rect x="0" y="0" width="40" height="12" fill="#007fff" />
      <rect x="0" y="12" width="40" height="16" fill="#ffcd00" />
      <rect x="0" y="28" width="40" height="12" fill="#ce1126" />
      <path d="M28 11 L20 18.5 L22 8 L15 13 L18 4 L12 9 L12 1 L8 9 L3 4 L6 13 L0 8 L4 18.5 L-4 12 L4 11" fill="none" stroke="#007fff" strokeWidth="0.8" transform="translate(4,5) scale(0.9)" />
      <path d="M20 18 L22 11 L17 16 L20 8 L15 13 L18 4 L12 9 L12 0 L8 9 L2 4 L6 13 L0 8 L4 16 L-2 11 L3 19 L20 19" fill="#ffcd00" opacity="0.9" transform="translate(8,7) scale(0.55)" />
    </g>
    <circle cx="20" cy="20" r="19.5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
  </svg>
);

const CoatOfArms: React.FC<{ size?: number; color?: string }> = ({ size = 28, color = '#0ea5e9' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
    <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeWidth="1.5" />
    <path d="M20 6 L26 14 L26 26 L20 30 L14 26 L14 14 Z" fill="none" stroke={color} strokeWidth="1" />
    <circle cx="20" cy="20" r="5" fill={color} opacity="0.2" />
    <path d="M20 10 L22 15 L27 15 L23 19 L25 24 L20 21 L15 24 L17 19 L13 15 L18 15 Z" fill={color} />
    <path d="M8 34 Q20 28 32 34" fill="none" stroke={color} strokeWidth="1" />
    <rect x="12" y="32" width="16" height="4" fill={color} opacity="0.15" rx="1" />
  </svg>
);

const MiniLogo: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex items-center gap-1 opacity-25" style={{ color: 'currentColor' }}>
    <School className="w-3 h-3" />
    <span className="text-[7px] font-black uppercase tracking-widest whitespace-nowrap">{name}</span>
  </div>
);

export const IdCardRenderer: React.FC<IdCardRendererProps> = ({
  student,
  schoolConfig,
  cardConfig,
  face = 'front',
  className = '',
  style,
}) => {
  const cycle = detectCycle(student.nomClasse);
  const cfg = resolveCardConfig(schoolConfig, cardConfig, cycle);
  const t = themeMeta[cfg.cardTheme];
  const qrValue = useMemo(() => idPayload(student), [student]);
  const shortName = useMemo(() => {
    const sn = schoolConfig?.schoolName || 'École';
    return sn.length > 26 ? `${sn.slice(0, 23)}…` : sn;
  }, [schoolConfig?.schoolName]);

  const schoolName = schoolConfig?.schoolName || 'Établissement Scolaire';
  const schoolLogo = schoolConfig?.logoUrl;
  const contactPhone = cfg.contactPhone || schoolConfig?.phone || '';
  const contactEmail = cfg.contactEmail || schoolConfig?.email || '';
  const validityPeriod = cfg.validityPeriod || schoolConfig?.activeSchoolYear || '2025–2026';
  const legalMention = cfg.legalMention || defaultCardCustomization.legalMention;

  const selected = useMemo(() => {
    const set = new Set(cfg.selectedFields || []);
    return ALL_FIELDS.filter((f) => set.has(f.key));
  }, [cfg.selectedFields]);

  const fieldFontSize = useMemo(() => {
    let size = cfg.fieldsLayout === 'compact' ? 9 : 10;
    const n = selected.length;
    if (n > 8) size -= 1;
    if (n > 12) size -= 1;
    if (n > 16) size -= 1;
    if (cfg.fieldsLayout === 'list' && n > 10) size -= 1;
    return Math.max(6, size);
  }, [selected.length, cfg.fieldsLayout]);
  const fieldLabelSize = Math.max(6, Math.round(fieldFontSize - 2.5));

  const initialAvatar = (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
      <User className="w-1/3 h-1/3 stroke-[1.5]" />
      <span className="text-[8px] font-black uppercase tracking-wider mt-1">Photo</span>
    </div>
  );

  const filigreeDensitySize = { low: 40, medium: 24, high: 12 }[cfg.filigreeDensity];
  const filigreeOpacity = cfg.filigreeOpacity ?? 0.18;

  const Filigree: React.FC<{ color: string }> = ({ color }) => {
    const patternId = `filigree-${cfg.cardTheme}-${cfg.filigreeType}-${cfg.filigreeShape}-${cfg.filigreeText}-${face}`;
    const half = filigreeDensitySize / 2;
    const strokeWidth = filigreeDensitySize * 0.04;
    let patternContent: React.ReactNode = null;

    if (cfg.filigreeType === 'image' && cfg.filigreeImage) {
      patternContent = (
        <image href={cfg.filigreeImage} x="0" y="0" width={filigreeDensitySize} height={filigreeDensitySize} preserveAspectRatio="xMidYMid slice" opacity={filigreeOpacity} />
      );
    } else if (cfg.filigreeType === 'text' && cfg.filigreeText) {
      patternContent = (
        <text
          x={half}
          y={half}
          fill={color}
          fontSize={filigreeDensitySize * 0.45}
          fontWeight="900"
          opacity={filigreeOpacity}
          textAnchor="middle"
          dominantBaseline="middle"
          transform={`rotate(-35, ${half}, ${half})`}
        >
          {cfg.filigreeText}
        </text>
      );
    } else {
      switch (cfg.filigreeShape) {
        case 'dots':
          patternContent = (
            <>
              <circle cx={half} cy={half} r={filigreeDensitySize * 0.18} fill={color} opacity={filigreeOpacity} />
              <circle cx="2" cy="2" r="1.5" fill={color} opacity={filigreeOpacity * 0.6} />
              <circle cx={filigreeDensitySize - 2} cy={filigreeDensitySize - 2} r="1.5" fill={color} opacity={filigreeOpacity * 0.6} />
              <circle cx={filigreeDensitySize - 2} cy="2" r="1.5" fill={color} opacity={filigreeOpacity * 0.6} />
              <circle cx="2" cy={filigreeDensitySize - 2} r="1.5" fill={color} opacity={filigreeOpacity * 0.6} />
            </>
          );
          break;
        case 'lines':
          patternContent = (
            <>
              <path d={`M0 ${filigreeDensitySize} L${filigreeDensitySize} 0`} stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity} />
              <path d={`M0 0 L${filigreeDensitySize} ${filigreeDensitySize}`} stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity} />
              <circle cx={half} cy={half} r="1.5" fill={color} opacity={filigreeOpacity * 0.7} />
            </>
          );
          break;
        case 'diamonds':
          patternContent = (
            <>
              <path d={`M${half} 0 L${filigreeDensitySize} ${half} L${half} ${filigreeDensitySize} L0 ${half} Z`} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity} />
              <path d={`M${half} ${filigreeDensitySize * 0.25} L${filigreeDensitySize * 0.75} ${half} L${half} ${filigreeDensitySize * 0.75} L${filigreeDensitySize * 0.25} ${half} Z`} fill={color} opacity={filigreeOpacity * 0.5} />
            </>
          );
          break;
        case 'cross':
          patternContent = (
            <>
              <path d={`M${half} 0 L${half} ${filigreeDensitySize} M0 ${half} L${filigreeDensitySize} ${half}`} stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity} />
              <circle cx={half} cy={half} r={filigreeDensitySize * 0.2} fill="none" stroke={color} strokeWidth={strokeWidth * 0.6} opacity={filigreeOpacity * 0.6} />
            </>
          );
          break;
        case 'waves':
          patternContent = (
            <>
              <path d={`M0 ${half} Q${filigreeDensitySize * 0.25} 0 ${half} ${half} T${filigreeDensitySize} ${half}`} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity} />
              <path d={`M0 ${half + 4} Q${filigreeDensitySize * 0.25} 4 ${half} ${half + 4} T${filigreeDensitySize} ${half + 4}`} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity * 0.6} />
            </>
          );
          break;
        case 'stars':
          patternContent = (
            <>
              <path d={`M${half} ${filigreeDensitySize * 0.1} L${filigreeDensitySize * 0.62} ${filigreeDensitySize * 0.4} L${filigreeDensitySize * 0.95} ${filigreeDensitySize * 0.45} L${filigreeDensitySize * 0.72} ${filigreeDensitySize * 0.72} L${filigreeDensitySize * 0.8} ${filigreeDensitySize * 0.98} L${half} ${filigreeDensitySize * 0.82} L${filigreeDensitySize * 0.2} ${filigreeDensitySize * 0.98} L${filigreeDensitySize * 0.28} ${filigreeDensitySize * 0.72} L${filigreeDensitySize * 0.05} ${filigreeDensitySize * 0.45} L${filigreeDensitySize * 0.38} ${filigreeDensitySize * 0.4} Z`} fill={color} opacity={filigreeOpacity} />
              <circle cx={half} cy={half} r="1.5" fill={color} opacity={filigreeOpacity * 0.7} />
            </>
          );
          break;
        default:
          patternContent = (
            <>
              <circle cx={half} cy={half} r={filigreeDensitySize * 0.42} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={filigreeOpacity} />
              <circle cx={half} cy={half} r={filigreeDensitySize * 0.22} fill="none" stroke={color} strokeWidth={strokeWidth * 0.7} opacity={filigreeOpacity * 0.7} />
              <path d={`M0 0 L${filigreeDensitySize} ${filigreeDensitySize} M${filigreeDensitySize} 0 L0 ${filigreeDensitySize}`} stroke={color} strokeWidth={strokeWidth * 0.5} opacity={filigreeOpacity * 0.5} />
            </>
          );
      }
    }

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" width="100%" height="100%">
        <defs>
          <pattern id={patternId} x="0" y="0" width={filigreeDensitySize} height={filigreeDensitySize} patternUnits="userSpaceOnUse">
            {patternContent}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    );
  };

  const headerJustify = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }[cfg.headerAlign];
  const headerTextAlign = { left: 'left', center: 'center', right: 'right' }[cfg.headerAlign];

  const FrontHeader = ({ compact = false, subtitle }: { compact?: boolean; subtitle?: string }) => (
    <div className={`relative z-10 ${compact ? 'pt-3 pb-1.5 px-3' : 'pt-4 pb-1.5 px-3'} border-b`} style={{ borderColor: t.border, background: `linear-gradient(180deg, ${t.light} 0%, #fff 100%)`, textAlign: headerTextAlign as any }}>
      <div className={`flex items-center gap-2 mb-0.5 ${headerJustify}`}>
        {schoolLogo ? (
          <img src={schoolLogo} alt="logo" className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} object-contain rounded`} />
        ) : (
          <School className={`${compact ? 'w-7 h-7' : 'w-8 h-8'}`} style={{ color: t.primary }} />
        )}
        <div className="leading-tight" style={{ textAlign: 'inherit' }}>
          <div className={`flex items-center gap-1 ${cfg.headerAlign === 'center' ? 'justify-center' : cfg.headerAlign === 'right' ? 'justify-end' : ''}`}>
            {cfg.showCountryFlag && <DRCFlag size={compact ? 12 : 14} className="rounded-full" />}
            {cfg.showCoatOfArms && <CoatOfArms size={compact ? 12 : 14} color={t.primary} />}
            <p className="font-black uppercase tracking-wider truncate" style={{ color: t.primary, fontSize: compact ? 7 : 8 }}>République Démocratique du Congo</p>
          </div>
          <p className="font-black uppercase tracking-wide text-slate-500 truncate" style={{ fontSize: compact ? 6 : 7 }}>Ministère de l'EPST</p>
        </div>
      </div>
      <h3 className={`font-black uppercase tracking-tight truncate ${compact ? 'text-[11px]' : 'text-[13px]'}`} style={{ color: t.primary }}>{schoolName}</h3>
      {subtitle && <p className={`font-black uppercase tracking-wider truncate ${compact ? 'text-[6px]' : 'text-[7px]'}`} style={{ color: t.secondary }}>{subtitle}</p>}
    </div>
  );

  const fieldColumns = cfg.fieldsLayout === 'list' ? 'grid-cols-1' : cfg.fieldsLayout === 'compact' ? 'grid-cols-2 gap-x-2' : 'grid-cols-2 gap-x-3';
  const fieldGap = cfg.fieldsLayout === 'compact' ? 'gap-y-1' : 'gap-y-1.5';

  const PhotoBox = () => (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-32 h-40 rounded-lg border-2 bg-white shadow-md overflow-hidden relative"
        style={{ borderColor: '#94a3b8' }}
      >
        {student.photoUrl ? (
          <img src={student.photoUrl} alt={student.prenom} className="w-full h-full object-cover" />
        ) : initialAvatar}
        {cfg.showSchoolSeal && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-blue-700 text-white text-[6px] font-black">
            EPST
          </div>
        )}
      </div>
      {cfg.showQR && (
        <div className="bg-white p-1 rounded-lg border shadow-sm" style={{ borderColor: t.border }}>
          <QRCode value={qrValue} size={64} level="M" />
        </div>
      )}
      <p className="text-[7px] font-mono font-black text-slate-500 text-center break-all w-32 leading-tight">
        {student.registrationNumber}
      </p>
    </div>
  );

  const FieldsBox = () => (
    <div className={`grid ${fieldColumns} ${fieldGap} min-w-0 text-slate-800`} style={{ textAlign: cfg.textAlign }}>
      {selected.length ? (
        selected.map((f) => <Field key={f.key} label={f.label} value={f.get(student)} textAlign={cfg.textAlign} compact={cfg.fieldsLayout === 'compact'} valueSize={fieldFontSize} labelSize={fieldLabelSize} />)
      ) : (
        <p className="text-[9px] text-slate-400 italic col-span-full">Aucun champ sélectionné</p>
      )}
    </div>
  );

  const PortraitBody = () => (
    <div className={`relative z-10 px-3 py-1.5 grid min-h-0 ${cfg.photoPosition === 'left' ? 'grid-cols-[120px_minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_120px]'} gap-2`}>
      {cfg.photoPosition === 'left' ? (
        <><PhotoBox /><FieldsBox /></>
      ) : (
        <><FieldsBox /><PhotoBox /></>
      )}
    </div>
  );

  const LandscapePhoto = () => (
    <div className="w-44 flex flex-col items-center justify-center gap-1.5 p-2" style={{ borderColor: t.border, background: t.light }}>
      <div
        className="w-32 h-40 rounded-lg border-2 bg-white shadow-md overflow-hidden relative"
        style={{ borderColor: '#94a3b8' }}
      >
        {student.photoUrl ? (
          <img src={student.photoUrl} alt={student.prenom} className="w-full h-full object-cover" />
        ) : initialAvatar}
        {cfg.showSchoolSeal && (
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-blue-700 text-white text-[6px] font-black">
            EPST
          </div>
        )}
      </div>
      {cfg.showQR && (
        <div className="bg-white p-1 rounded-lg border shadow-sm" style={{ borderColor: t.border }}>
          <QRCode value={qrValue} size={56} level="M" />
        </div>
      )}
    </div>
  );

  const LandscapeBody = () => (
    <div className={`relative z-10 flex h-full pt-3 ${cfg.photoPosition === 'right' ? 'flex-row-reverse' : ''}`}>
      <LandscapePhoto />
      <div className="flex-1 p-3 flex flex-col" style={{ borderLeftWidth: cfg.photoPosition === 'right' ? 0 : 1, borderRightWidth: cfg.photoPosition === 'right' ? 1 : 0, borderColor: t.border }}>
        <div className={`grid ${cfg.fieldsLayout === 'list' ? 'grid-cols-1' : 'grid-cols-2'} gap-x-4 ${cfg.fieldsLayout === 'compact' ? 'gap-y-0.5' : 'gap-y-1'} min-w-0 text-slate-800 flex-1 content-start`} style={{ textAlign: cfg.textAlign }}>
          {selected.length ? (
            selected.map((f) => <Field key={f.key} label={f.label} value={f.get(student)} textAlign={cfg.textAlign} compact={cfg.fieldsLayout === 'compact'} valueSize={fieldFontSize} labelSize={fieldLabelSize} />)
          ) : (
            <p className="text-[9px] text-slate-400 italic col-span-full">Aucun champ sélectionné</p>
          )}
        </div>
        {cfg.showSchoolSeal && (
          <div className="flex items-end justify-between mt-2 pt-2 border-t" style={{ borderColor: t.border }}>
            <p className="text-[8px] text-slate-600 font-black">Signature Chef d'Établissement</p>
            <div className="w-11 h-11 rounded-full border-2 border-dashed flex items-center justify-center text-[6px] font-black text-center p-0.5" style={{ color: t.primary, borderColor: t.primary }}>
              SCEAU<br/>EPST
            </div>
          </div>
        )}
        {cfg.showTricolor && <div className="h-1.5 w-full mt-2 rounded-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-500" />}
      </div>
    </div>
  );

  const FrontPortrait = () => (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-2xl border-2 ${className}`}
      style={{ width: '360px', height: '500px', background: '#fff', borderColor: t.border, ...style }}
    >
      {cfg.showFiligree && <Filigree color={t.primary} />}
      {cfg.showMiniLogos && (
        <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-2 z-10" style={{ color: t.primary }}>
          {Array.from({ length: 6 }).map((_, i) => <MiniLogo key={i} name={shortName} />)}
        </div>
      )}
      <FrontHeader />
      <PortraitBody />
      <div className="absolute bottom-0 left-0 right-0 z-10 px-3 py-2 border-t" style={{ borderColor: t.border, background: t.light }}>
        {cfg.showSchoolSeal && (
          <div className="flex items-end justify-between">
            <div className="text-[8px] text-slate-600">
              <p className="font-black uppercase">Signature Chef d'Établissement</p>
              <p className="italic truncate max-w-[180px]">{schoolName}</p>
            </div>
            <div className="w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center text-[7px] font-black text-center p-1" style={{ color: t.primary, borderColor: t.primary }}>
              SCEAU<br/>EPST
            </div>
          </div>
        )}
        {cfg.showTricolor && <div className="h-1.5 w-full mt-2 rounded-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-500" />}
      </div>
    </div>
  );

  const FrontLandscape = () => (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-2xl border-2 ${className}`}
      style={{ width: '540px', height: '360px', background: '#fff', borderColor: t.border, ...style }}
    >
      {cfg.showFiligree && <Filigree color={t.primary} />}
      {cfg.showMiniLogos && (
        <div className="absolute top-0 left-0 right-0 h-6 flex items-center justify-between px-2 z-10" style={{ color: t.primary }}>
          {Array.from({ length: 8 }).map((_, i) => <MiniLogo key={i} name={shortName} />)}
        </div>
      )}
      <div className="relative z-10 pt-3">
        <FrontHeader compact />
        <LandscapeBody />
      </div>
    </div>
  );

  const Back = () => {
    const backWidth = cfg.cardLayout === 'portrait' ? '360px' : '540px';
    const backHeight = cfg.cardLayout === 'portrait' ? '500px' : '360px';
    return (
      <div
        className={`relative rounded-2xl overflow-hidden shadow-2xl border-2 ${className}`}
        style={{ width: backWidth, height: backHeight, background: '#fff', borderColor: t.border, ...style }}
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ opacity: 0.05 }}>
          <div
            className="text-center font-black uppercase leading-none select-none"
            style={{ color: t.primary, fontSize: cfg.cardLayout === 'portrait' ? '44px' : '54px', transform: 'rotate(-12deg)', width: '160%' }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="whitespace-nowrap py-3">{schoolName} — EPST RDC</div>
            ))}
          </div>
        </div>

        {cfg.showFiligree && <Filigree color={t.secondary} />}

        <div className="relative z-10 h-full flex flex-col">
          <FrontHeader compact subtitle="Carte Officielle d'Identification de l'Élève" />
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 space-y-2 text-[9px] text-slate-700">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0" style={{ color: t.primary }} />
                <p className="leading-snug break-words">{legalMention}</p>
              </div>
              <p className="font-semibold text-slate-900 leading-snug break-words">En cas de perte ou de vol, veuillez déclarer immédiatement l'incident au chef d'établissement.</p>
              <p className="leading-snug break-words">Le titulaire est tenu de respecter le règlement intérieur de l'école et de se soumettre aux contrôles de présence effectués par le personnel habilité.</p>

              <div className="grid grid-cols-1 gap-2 mt-2">
                <div className="p-2 rounded-lg border" style={{ borderColor: t.border, background: t.light }}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: t.primary }} /> Période de validité</p>
                  <p className="font-mono font-black text-[11px] tracking-wider break-words" style={{ color: t.primary }}>{validityPeriod}</p>
                </div>

                {(contactPhone || contactEmail || schoolConfig?.address) && (
                  <div className="p-2 rounded-lg border" style={{ borderColor: t.border, background: t.light }}>
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Contact de l'établissement</p>
                    {contactPhone && <p className="text-[10px] flex items-center gap-1 text-slate-800 break-words leading-tight"><Phone className="w-3 h-3 shrink-0" style={{ color: t.primary }} /> {contactPhone}</p>}
                    {contactEmail && <p className="text-[10px] flex items-center gap-1 text-slate-800 break-words leading-tight"><Mail className="w-3 h-3 shrink-0" style={{ color: t.primary }} /> {contactEmail}</p>}
                    {schoolConfig?.address && <p className="text-[10px] flex items-center gap-1 text-slate-800 break-words leading-tight"><MapPin className="w-3 h-3 shrink-0" style={{ color: t.primary }} /> {schoolConfig.address}</p>}
                  </div>
                )}

                {(student.nomTuteur || student.nomReferentUrgence || student.telephoneParent) && (
                  <div className="p-2 rounded-lg border" style={{ borderColor: t.border, background: t.light }}>
                    <p className="text-[8px] font-black uppercase tracking-wider text-rose-500 mb-1">Contacts d'urgence</p>
                    {student.nomTuteur && (
                      <p className="text-[10px] flex items-center gap-1 text-slate-800 break-words leading-tight">
                        <Phone className="w-3 h-3 shrink-0" style={{ color: t.primary }} />
                        {student.nomTuteur} {student.telephoneTuteur ? `— ${student.telephoneTuteur}` : ''} {student.relationTuteur ? `(${student.relationTuteur})` : ''}
                      </p>
                    )}
                    {student.nomReferentUrgence && (
                      <p className="text-[10px] flex items-center gap-1 text-slate-800 break-words leading-tight">
                        <Shield className="w-3 h-3 shrink-0" style={{ color: t.primary }} />
                        {student.nomReferentUrgence} {student.telephoneReferentUrgence ? `— ${student.telephoneReferentUrgence}` : ''} {student.relationReferentUrgence ? `(${student.relationReferentUrgence})` : ''}
                      </p>
                    )}
                    {!student.nomTuteur && !student.nomReferentUrgence && student.telephoneParent && (
                      <p className="text-[10px] flex items-center gap-1 text-slate-800 break-words leading-tight">
                        <Phone className="w-3 h-3 shrink-0" style={{ color: t.primary }} /> Parent : {student.telephoneParent}
                      </p>
                    )}
                  </div>
                )}

                <div className="p-2 rounded-lg border" style={{ borderColor: t.border, background: t.light }}>
                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Code de l'établissement</p>
                  <p className="font-mono font-black text-[11px] tracking-wider break-words" style={{ color: t.primary }}>{schoolConfig?.secopeCode || '710482'}</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t" style={{ borderColor: t.border }}>
              <div className="flex items-center justify-between">
                <div className="text-[8px] text-slate-500">
                  <p>Année scolaire : <span className="text-slate-800 font-black">{schoolConfig?.activeSchoolYear || validityPeriod}</span></p>
                  <p>Valable sur tout le territoire national</p>
                </div>
                {cfg.showQR && (
                  <div className="bg-white p-1 rounded-lg border" style={{ borderColor: t.border }}>
                    <QRCode value={qrValue} size={cfg.cardLayout === 'portrait' ? 60 : 50} level="M" />
                  </div>
                )}
              </div>
              {cfg.showTricolor && <div className="h-1.5 w-full mt-3 rounded-full bg-gradient-to-r from-blue-600 via-yellow-400 to-red-500" />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (face === 'back') return <Back />;
  return cfg.cardLayout === 'portrait' ? <FrontPortrait /> : <FrontLandscape />;
};

const Field: React.FC<{ label: string; value: React.ReactNode; textAlign?: 'left' | 'center' | 'right'; compact?: boolean; valueSize?: number; labelSize?: number }> = ({ label, value, textAlign = 'left', compact, valueSize = 10, labelSize = 7 }) => (
  <div className={`flex flex-col min-w-0 ${compact ? 'pb-0 border-b border-slate-100/50' : 'pb-0.5 border-b border-slate-200'}`}>
    <span className="font-black uppercase text-slate-400 tracking-wide whitespace-nowrap text-ellipsis overflow-hidden" style={{ fontSize: labelSize }}>{label}</span>
    <span className="font-black text-slate-950 leading-none break-words" style={{ textAlign, fontSize: valueSize, lineHeight: `${valueSize * 1.15}px`, wordBreak: 'break-word' }}>{value || '—'}</span>
  </div>
);
