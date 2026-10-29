import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, FileSpreadsheet, FileType, Search, Loader2, Columns, Square, ZoomIn, ZoomOut } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  PageOrientation,
  VerticalAlign,
  BorderStyle,
} from 'docx';
import { LocalDatabaseService } from '../../services/localDatabase';
import { useSchoolConfig } from '../../hooks/useSchoolConfig';
import { CustomSelect } from '../common/CustomSelect';
import { DEFAULT_DOCUMENT_TEMPLATE, DOCUMENT_FONTS, DOCUMENT_TEMPLATES_KEY, resolveDocumentTemplatesConfig, type DocumentTemplate } from '../../utils/documentTemplates';
import type { Eleve, ClasseScolaire, AnneeScolaireConfig } from '../../types';

export type StudentReportTemplate = 'LISTE_ELEVES' | 'CERTIFICAT_SCOLARITE';

interface DocumentGeneratorModalProps {
  template: StudentReportTemplate;
  onClose: () => void;
}

interface FilterState {
  yearId: string;
  classId: string;
  sexe: string;
  statut: string;
  search: string;
}

const statutOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'INSCRIT', label: 'Inscrit' },
  { value: 'TRANSFERE', label: 'Transféré' },
  { value: 'EXCLU', label: 'Exclu' },
];

const sexeOptions = [
  { value: '', label: 'Tous' },
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

const fmtDate = (d?: string) => d ? d.split('T')[0] : 'Non renseignée';

const loadLogo = async (url?: string) => {
  if (!url) return null;
  const image = new window.Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Chargement du logo trop long. Vérifiez le logo configuré.')), 10000);
    image.onload = () => { window.clearTimeout(timer); resolve(); };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error('Logo inaccessible. Vérifiez le logo configuré ou désactivez son affichage.')); };
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Conversion du logo indisponible.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  try {
    return { data: canvas.toDataURL('image/png'), ratio: canvas.width / canvas.height };
  } catch {
    throw new Error('Le logo distant interdit son export. Utilisez une image locale dans les réglages.');
  }
};

const reportHeaders = ['N°', 'MATRICULE', 'PRÉNOM', 'NOM', 'POST-NOM', 'CLASSE', 'SEXE', 'DATE NAISS.', 'STATUT'];

export const DocumentGeneratorModal: React.FC<DocumentGeneratorModalProps> = ({ template, onClose }) => {
  const { config } = useSchoolConfig();
  const [students, setStudents] = useState<Eleve[]>([]);
  const [classes, setClasses] = useState<ClasseScolaire[]>([]);
  const [years, setYears] = useState<AnneeScolaireConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [documentTemplate, setDocumentTemplate] = useState<DocumentTemplate>({ ...DEFAULT_DOCUMENT_TEMPLATE });
  const [loadError, setLoadError] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const orientation = documentTemplate.orientation;
  const setOrientation = (value: DocumentTemplate['orientation']) => setDocumentTemplate(current => ({ ...current, orientation: value }));
  const [zoom, setZoom] = useState(1);
  const [filters, setFilters] = useState<FilterState>({ yearId: '', classId: '', sexe: '', statut: '', search: '' });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [stList, clList, yrList, stored] = await Promise.all([
          LocalDatabaseService.getEleves(),
          LocalDatabaseService.getClasses(),
          LocalDatabaseService.getSchoolYears(),
          LocalDatabaseService.getConfig(DOCUMENT_TEMPLATES_KEY),
        ]);
        setStudents(stList || []);
        setClasses(clList || []);
        setYears(yrList || []);
        setDocumentTemplate(resolveDocumentTemplatesConfig(stored).active);
        if (yrList?.length) setFilters(prev => ({ ...prev, yearId: yrList[0].id }));
      } catch {
        setLoadError('Impossible de charger les données ou le modèle. Fermez puis rouvrez le générateur.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const classOptions = useMemo(() => [
    { value: '', label: 'Toutes les classes' },
    ...classes.map(c => ({ value: c.id, label: c.nom })),
  ], [classes]);

  const yearOptions = useMemo(() => [
    { value: '', label: 'Toutes les années' },
    ...years.map(y => ({ value: y.id, label: y.nom })),
  ], [years]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (filters.yearId && s.schoolYearId !== filters.yearId) return false;
      if (filters.classId && s.classId !== filters.classId) return false;
      if (filters.sexe && s.sexe !== filters.sexe) return false;
      if (filters.statut && s.statut !== filters.statut) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const name = `${s.prenom} ${s.nom} ${s.postnom || ''}`.toLowerCase();
        const mat = (s.registrationNumber || '').toLowerCase();
        const cls = (s.nomClasse || '').toLowerCase();
        if (!name.includes(q) && !mat.includes(q) && !cls.includes(q)) return false;
      }
      return true;
    });
  }, [students, filters]);

  const selectedYear = years.find(y => y.id === filters.yearId)?.nom || 'Toutes les années';
  const selectedClass = classes.find(c => c.id === filters.classId)?.nom || 'Toutes les classes';
  const title = template === 'LISTE_ELEVES' ? 'LISTE DES ÉLÈVES' : 'CERTIFICAT DE SCOLARITÉ';
  const headers = reportHeaders;

  const schoolName = config?.schoolName || 'ÉTABLISSEMENT SCOLAIRE';
  const schoolAddress = config?.address || '';
  const schoolPhone = config?.phone || '';
  const schoolEmail = config?.email || '';
  const logoUrl = config?.logoUrl;
  // La subdivision est le lieu local configuré (ex. Kinshasa-Lukunga / Gombe).
  // La province ne sert de repli que si aucun lieu plus précis n'est renseigné.
  const lieu = config?.subDivision?.trim() || config?.province?.trim() || 'Lieu à configurer';
  const signataireName = config?.promoterName?.trim() || 'Nom du signataire à renseigner';
  const signataireRole = config?.promoterRole?.trim() || 'Fonction à renseigner';

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const content = useMemo(() => {
    const certificate = template === 'CERTIFICAT_SCOLARITE';
    const font = DOCUMENT_FONTS[documentTemplate.font];
    const measure = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const width = measure.internal.pageSize.getWidth();
    const height = measure.internal.pageSize.getHeight();
    const margin = documentTemplate.margin;
    const bodyWidth = width - margin * 2;
    measure.setFont(font.pdf, 'normal');
    measure.setFontSize(9);
    const wrap = (text: string): string[] => text ? measure.splitTextToSize(text, bodyWidth) : [];
    const header = [
      'RÉPUBLIQUE DÉMOCRATIQUE DU CONGO',
      "MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE",
      schoolName.toUpperCase(),
      [schoolAddress, schoolPhone, schoolEmail].filter(Boolean).join(' | '),
      documentTemplate.headerText,
    ].flatMap(wrap);
    const signature = documentTemplate.showSignature ? [
      `Fait à ${lieu}, le ${new Date().toLocaleDateString('fr-FR')}`,
      signataireName,
      signataireRole,
      'Signature et cachet à apposer par une personne habilitée :',
    ].flatMap(wrap) : [];
    const footer = wrap(documentTemplate.footerText);
    const logoHeight = documentTemplate.showLogo && logoUrl ? 18 : 0;
    const headerHeight = logoHeight + header.length * 4.5 + 5;
    const footerHeight = signature.length * 4.5 + (signature.length ? 15 : 0) + footer.length * 4.5 + (documentTemplate.showPagination ? 6 : 0) + 5;
    const top = margin + headerHeight;
    const bottom = margin + footerHeight;
    const rows = filtered.map((s, i) => [String(i + 1), s.registrationNumber || '—', s.prenom || '', s.nom || '', s.postnom || '', s.nomClasse || classes.find(c => c.id === s.classId)?.nom || '—', s.sexe || '—', fmtDate(s.dateNaissance), s.statut || 'Non renseigné']);
    const certificates = filtered.map(s => [
      'PROJET — À vérifier et à signer par une personne habilitée.',
      `Selon les données enregistrées dans ${schoolName}, l’élève ${[s.prenom, s.nom, s.postnom].filter(Boolean).join(' ')} (matricule : ${s.registrationNumber || 'non renseigné'}) figure dans les dossiers de l’établissement.`,
      `Date de naissance : ${fmtDate(s.dateNaissance)}. Classe : ${s.nomClasse || classes.find(c => c.id === s.classId)?.nom || 'non renseignée'}. Année scolaire : ${years.find(y => y.id === s.schoolYearId)?.nom || 'non renseignée'}. Statut enregistré : ${s.statut || 'non renseigné'}.`,
      'Ce projet ne vaut pas attestation officielle avant vérification des informations et signature. Aucun cachet ni signature officielle n’est généré.',
    ]);
    return { certificate, font, width, height, margin, bodyWidth, header, signature, footer, logoHeight, top, bottom, rows, certificates };
  }, [template, documentTemplate, orientation, schoolName, schoolAddress, schoolPhone, schoolEmail, lieu, signataireName, signataireRole, logoUrl, filtered, classes, years]);

  const buildPDF = useCallback(async () => {
    const { font, width, height, margin, bodyWidth, header, signature, footer, top, bottom } = content;
    if (height - top - bottom < 45) throw new Error('En-tête ou pied de page trop long : réduisez les textes ou les marges.');
    const logo = await loadLogo(documentTemplate.showLogo ? logoUrl : undefined);
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const tableMargin = { top, bottom, left: margin, right: margin };
    const addBody = (paragraphs?: string[]) => {
      autoTable(doc, {
        startY: top,
        margin: tableMargin,
        head: [[title]],
        body: paragraphs ? paragraphs.map(text => [text]) : [[`Année : ${selectedYear} | Classe : ${selectedClass} | Total : ${filtered.length} élève(s)`]],
        theme: 'plain',
        styles: { font: font.pdf, fontSize: paragraphs ? 11 : 9, cellPadding: paragraphs ? 4 : 2, textColor: '#0f172a', overflow: 'linebreak' },
        headStyles: { fontSize: 14, fontStyle: 'bold', textColor: documentTemplate.accent, halign: 'center' },
      });
    };
    if (content.certificate) {
      content.certificates.forEach((paragraphs, index) => {
        if (index) doc.addPage();
        addBody(paragraphs);
      });
    } else {
      addBody();
      const startY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3;
      autoTable(doc, {
        head: [reportHeaders], body: content.rows, startY, margin: tableMargin,
        theme: documentTemplate.tableStyle,
        styles: { font: font.pdf, fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: documentTemplate.accent, textColor: '#ffffff', fontStyle: 'bold' },
        alternateRowStyles: { fillColor: documentTemplate.tableStyle === 'striped' ? '#f1f5f9' : '#ffffff' },
      });
    }
    const count = doc.getNumberOfPages();
    for (let page = 1; page <= count; page++) {
      doc.setPage(page);
      doc.setFont(font.pdf, 'normal');
      doc.setFontSize(9);
      doc.setTextColor('#0f172a');
      if (logo) {
        const logoW = Math.min(16 * logo.ratio, bodyWidth);
        const logoH = logoW / logo.ratio;
        doc.addImage(logo.data, 'PNG', (width - logoW) / 2, margin, logoW, logoH);
      }
      header.forEach((line, index) => doc.text(line, width / 2, margin + content.logoHeight + 3 + index * 4.5, { align: 'center' }));
      doc.setDrawColor(documentTemplate.accent);
      doc.line(margin, top - 3, width - margin, top - 3);
      let y = height - bottom + 5;
      signature.forEach(line => { doc.text(line, width - margin, y, { align: 'right' }); y += 4.5; });
      if (signature.length) y += 15;
      footer.forEach(line => { doc.text(line, width / 2, y, { align: 'center' }); y += 4.5; });
      if (documentTemplate.showPagination) doc.text(`Page ${page} / ${count}`, width - margin, y + 1, { align: 'right' });
    }
    return doc;
  }, [content, documentTemplate, logoUrl, orientation, title, selectedYear, selectedClass, filtered.length]);

  useEffect(() => {
    let cancelled = false;
    let url = '';
    setPreviewUrl('');
    setPreviewError('');
    if (loading || loadError || !filtered.length) return;
    const timer = window.setTimeout(() => {
      void buildPDF().then(doc => {
        if (cancelled) return;
        url = URL.createObjectURL(doc.output('blob'));
        setPreviewUrl(url);
      }).catch(error => {
        if (!cancelled) setPreviewError(error instanceof Error ? error.message : 'Aperçu indisponible.');
      });
    }, 200);
    return () => { cancelled = true; window.clearTimeout(timer); if (url) URL.revokeObjectURL(url); };
  }, [buildPDF, loading, loadError, filtered.length]);

  const generatePDF = async () => {
    setGenerating('pdf');
    try {
      const doc = await buildPDF();
      doc.save(`${template.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('[Documents] Échec export PDF', error);
      window.alert(error instanceof Error ? error.message : 'Impossible de générer le PDF.');
    } finally {
      setGenerating(null);
    }
  };

  const generateXLSX = async () => {
    setGenerating('xlsx');
    try {
      const rows = content.rows;
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
        { wch: 20 },
        { wch: 7 },
        { wch: 16 },
        { wch: 14 },
      ];
      ws['!autofilter'] = { ref: `A1:I${1 + rows.length}` };
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
      const d = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `liste_des_eleves_${d}.xlsx`);
    } catch (error) {
      console.error('[Documents] Échec export Excel', error);
      window.alert('Impossible de générer le fichier Excel. Réessayez.');
    } finally {
      setGenerating(null);
    }
  };

  const generateDOCX = async () => {
    setGenerating('docx');
    try {
      if (content.height - content.top - content.bottom < 45) throw new Error('En-tête ou pied de page trop long : réduisez les textes ou les marges.');
      const logo = await loadLogo(documentTemplate.showLogo ? logoUrl : undefined);
      const mm = (value: number) => Math.round(value * 1440 / 25.4);
      const accent = documentTemplate.accent.slice(1);
      const paragraph = (text: string, alignment: typeof AlignmentType[keyof typeof AlignmentType] = AlignmentType.CENTER) => new Paragraph({
        alignment,
        spacing: { before: 0, after: 0, line: mm(4.5), lineRule: 'exact' },
        children: [new TextRun({ text, font: content.font.word, size: 18 })],
      });
      const titleParagraph = (pageBreakBefore = false) => new Paragraph({
        pageBreakBefore, alignment: AlignmentType.CENTER, keepNext: true,
        spacing: { after: 160 },
        children: [new TextRun({ text: title, bold: true, color: accent, font: content.font.word, size: 28 })],
      });
      const border = { style: documentTemplate.tableStyle === 'grid' ? BorderStyle.SINGLE : BorderStyle.NONE, size: 4, color: 'CBD5E1' };
      const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
      const cell = (text: string, header: boolean, index = 0) => new TableCell({
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 70, bottom: 70, left: 70, right: 70 },
        borders,
        shading: { fill: header ? accent : documentTemplate.tableStyle === 'striped' && index % 2 === 0 ? 'F1F5F9' : 'FFFFFF' },
        children: [new Paragraph({
          spacing: { after: 0 },
          children: [new TextRun({ text, font: content.font.word, size: 15, bold: header, color: header ? 'FFFFFF' : '0F172A' })],
        })],
      });
      const headerChildren: Paragraph[] = [];
      if (logo) {
        const width = Math.min(16 * logo.ratio, content.bodyWidth);
        headerChildren.push(new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [new ImageRun({ data: logo.data, transformation: { width: width * 96 / 25.4, height: width / logo.ratio * 96 / 25.4 } })],
        }));
      }
      headerChildren.push(...content.header.map(line => paragraph(line)));
      const footerChildren = content.signature.map(line => paragraph(line, AlignmentType.RIGHT));
      if (content.signature.length) footerChildren.push(new Paragraph({ spacing: { after: mm(12) }, children: [] }));
      footerChildren.push(...content.footer.map(line => paragraph(line)));
      if (documentTemplate.showPagination) footerChildren.push(new Paragraph({
        alignment: AlignmentType.RIGHT, spacing: { after: 0 },
        children: [new TextRun({ font: content.font.word, size: 18, children: ['Page ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES] })],
      }));
      const children: (Paragraph | Table)[] = content.certificate
        ? content.certificates.flatMap((paragraphs, index) => [titleParagraph(index > 0), ...paragraphs.map(text => new Paragraph({
          spacing: { after: 220 },
          children: [new TextRun({ text, font: content.font.word, size: 22 })],
        }))])
        : [titleParagraph(), paragraph(`Année : ${selectedYear} | Classe : ${selectedClass} | Total : ${filtered.length} élève(s)`), new Table({
          width: { size: 100, type: WidthType.PERCENTAGE }, borders,
          rows: [new TableRow({ tableHeader: true, children: headers.map(text => cell(text, true)) }),
            ...content.rows.map((row, index) => new TableRow({ children: row.map(text => cell(text, false, index)) }))],
        })];
      const doc = new Document({
        styles: { default: { document: { run: { font: content.font.word, size: 18 } } } },
        sections: [{
          properties: { page: {
            size: { width: 11906, height: 16838, orientation: orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: { top: mm(content.top + 3), bottom: mm(content.bottom + 3), left: mm(content.margin), right: mm(content.margin), header: mm(content.margin), footer: mm(content.margin) },
          } },
          headers: { default: new Header({ children: headerChildren }) },
          footers: { default: new Footer({ children: footerChildren.length ? footerChildren : [new Paragraph('')] }) },
          children,
        }],
      });
      download(await Packer.toBlob(doc), `${template.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.docx`);
    } catch (error) {
      console.error('[Documents] Échec export Word', error);
      window.alert(error instanceof Error ? error.message : 'Impossible de générer le fichier Word.');
    } finally {
      setGenerating(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-7xl max-h-[96vh] overflow-hidden rounded-3xl border shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black">Générateur de rapports élèves</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrientation('portrait')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${orientation === 'portrait' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200/50'}`}
            >
              <Square className="w-3.5 h-3.5" /> Portrait
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${orientation === 'landscape' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200/50'}`}
            >
              <Columns className="w-3.5 h-3.5" /> Paysage
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/50" style={{ background: 'var(--bg-surface)' }}><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Année scolaire</label>
              <CustomSelect options={yearOptions} value={filters.yearId} onChange={v => setFilters(f => ({ ...f, yearId: v }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Classe</label>
              <CustomSelect options={classOptions} value={filters.classId} onChange={v => setFilters(f => ({ ...f, classId: v }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Sexe</label>
              <CustomSelect options={sexeOptions} value={filters.sexe} onChange={v => setFilters(f => ({ ...f, sexe: v }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Statut</label>
              <CustomSelect options={statutOptions} value={filters.statut} onChange={v => setFilters(f => ({ ...f, statut: v }))} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Recherche</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                  placeholder="Nom, matricule..."
                  className="input w-full pl-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions + A4 preview */}
        <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--bg-sunken)' }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 mx-auto" style={{ maxWidth: orientation === 'portrait' ? '210mm' : '297mm' }}>
            <span className="text-[11px] font-black" style={{ color: 'var(--text-muted)' }}>{filtered.length} élève(s) sélectionné(s)</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
                <button
                  onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/50"
                  title="Zoom arrière"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-black w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/50"
                  title="Zoom avant"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={generatePDF}
                disabled={loading || !!loadError || !!generating || filtered.length === 0}
                className="group relative flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-rose-200 shadow-sm hover:shadow-md hover:bg-rose-50 transition-all disabled:opacity-50 min-w-[72px]"
              >
                <FileText className="w-7 h-7 text-rose-500" />
                <span className="text-[10px] font-black text-rose-600">PDF</span>
                {generating === 'pdf' && <Loader2 className="w-3 h-3 animate-spin absolute top-1 right-1" />}
              </button>
              <button
                onClick={generateXLSX}
                disabled={loading || !!loadError || !!generating || filtered.length === 0}
                className="group relative flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-emerald-200 shadow-sm hover:shadow-md hover:bg-emerald-50 transition-all disabled:opacity-50 min-w-[72px]"
              >
                <FileSpreadsheet className="w-7 h-7 text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-600">Excel</span>
                {generating === 'xlsx' && <Loader2 className="w-3 h-3 animate-spin absolute top-1 right-1" />}
              </button>
              <button
                onClick={generateDOCX}
                disabled={loading || !!loadError || !!generating || filtered.length === 0}
                className="group relative flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-blue-200 shadow-sm hover:shadow-md hover:bg-blue-50 transition-all disabled:opacity-50 min-w-[72px]"
              >
                <FileType className="w-7 h-7 text-blue-500" />
                <span className="text-[10px] font-black text-blue-600">Word</span>
                {generating === 'docx' && <Loader2 className="w-3 h-3 animate-spin absolute top-1 right-1" />}
              </button>
            </div>
          </div>

          {/* A4 Preview */}
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Aperçu PDF paginé identique à l’export. Word peut répartir les pages différemment selon les polices installées. Excel exporte uniquement les données, sans mise en page du modèle.</p>
            {content.certificate && <p className="text-xs">Un projet par élève, à vérifier et à signer. Le style de tableau ne s’applique pas aux certificats (sans tableau).</p>}
            {documentTemplate.showLogo && !logoUrl && <p className="text-xs" role="status">Aucun logo configuré : aucun logo ne sera ajouté.</p>}
            {(loadError || previewError) ? <p role="alert" className="text-sm text-red-600">{loadError || previewError}</p>
              : loading ? <p role="status">Chargement des données et du modèle…</p>
              : !filtered.length ? <p role="status">Aucun élève ne correspond aux critères.</p>
              : !previewUrl ? <p role="status">Préparation de l’aperçu paginé…</p>
              : <>
                <iframe key={`${previewUrl}-${zoom}`} title={`Aperçu ${title}`} src={`${previewUrl}#zoom=${Math.round(zoom * 100)}`} className="w-full border-0 rounded-lg" style={{ height: '65vh', minHeight: 450 }} />
                <a className="text-xs underline" href={previewUrl} target="_blank" rel="noreferrer">Ouvrir l’aperçu PDF si le lecteur intégré n’est pas disponible</a>
              </>}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
