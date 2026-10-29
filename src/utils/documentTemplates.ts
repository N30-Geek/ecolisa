export const DOCUMENT_TEMPLATES_KEY = 'document_templates';

export interface DocumentTemplate {
  headerText: string;
  footerText: string;
  accent: string;
  font: 'sans' | 'serif' | 'mono';
  margin: number;
  orientation: 'portrait' | 'landscape';
  showLogo: boolean;
  showSignature: boolean;
  showPagination: boolean;
  tableStyle: 'grid' | 'striped' | 'plain';
}

export interface DocumentTemplatesConfig {
  version: 1;
  active: DocumentTemplate;
}

export const DOCUMENT_FONTS = {
  sans: { label: 'Sans empattement', pdf: 'helvetica', word: 'Arial' },
  serif: { label: 'Avec empattement', pdf: 'times', word: 'Times New Roman' },
  mono: { label: 'Monospace', pdf: 'courier', word: 'Courier New' },
} as const;

export const DEFAULT_DOCUMENT_TEMPLATE: DocumentTemplate = {
  headerText: '',
  footerText: 'Document établi à partir des données de l’établissement.',
  accent: '#1e293b',
  font: 'sans',
  margin: 15,
  orientation: 'portrait',
  showLogo: true,
  showSignature: true,
  showPagination: true,
  tableStyle: 'grid',
};

export const DOCUMENT_PRESETS: { id: string; name: string; description: string; template: DocumentTemplate }[] = [
  { id: 'institutionnel', name: 'Institutionnel', description: 'Tableau quadrillé, typographie classique.', template: { ...DEFAULT_DOCUMENT_TEMPLATE, font: 'serif' } },
  { id: 'moderne', name: 'Moderne', description: 'Accent bleu, lignes alternées, format paysage.', template: { ...DEFAULT_DOCUMENT_TEMPLATE, accent: '#1d4ed8', orientation: 'landscape', tableStyle: 'striped', margin: 12 } },
  { id: 'sobre', name: 'Sobre', description: 'Présentation légère, sans logo ni quadrillage.', template: { ...DEFAULT_DOCUMENT_TEMPLATE, accent: '#374151', tableStyle: 'plain', showLogo: false, margin: 20 } },
];

export const documentPlainText = (value: unknown, maxLength: number): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, maxLength) : '';

export function resolveDocumentTemplate(value: unknown): DocumentTemplate {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const defaults = DEFAULT_DOCUMENT_TEMPLATE;
  return {
    headerText: typeof source.headerText === 'string' ? documentPlainText(source.headerText, 160) : defaults.headerText,
    footerText: typeof source.footerText === 'string' ? documentPlainText(source.footerText, 120) : defaults.footerText,
    accent: typeof source.accent === 'string' && /^#[0-9a-f]{6}$/i.test(source.accent) ? source.accent.toLowerCase() : defaults.accent,
    font: source.font === 'serif' || source.font === 'mono' || source.font === 'sans' ? source.font : defaults.font,
    margin: typeof source.margin === 'number' && Number.isFinite(source.margin) ? Math.round(Math.min(25, Math.max(10, source.margin))) : defaults.margin,
    orientation: source.orientation === 'landscape' ? 'landscape' : 'portrait',
    showLogo: typeof source.showLogo === 'boolean' ? source.showLogo : defaults.showLogo,
    showSignature: typeof source.showSignature === 'boolean' ? source.showSignature : defaults.showSignature,
    showPagination: typeof source.showPagination === 'boolean' ? source.showPagination : defaults.showPagination,
    tableStyle: source.tableStyle === 'striped' || source.tableStyle === 'plain' || source.tableStyle === 'grid' ? source.tableStyle : defaults.tableStyle,
  };
}

export function resolveDocumentTemplatesConfig(value: unknown): DocumentTemplatesConfig {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { version: 1, active: resolveDocumentTemplate(source.version === 1 ? source.active : undefined) };
}
