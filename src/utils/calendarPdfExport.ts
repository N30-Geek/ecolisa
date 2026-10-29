import {
  CalendarEventData,
  MONTHS_FR,
  WEEKDAYS_SHORT,
  categoryInfo,
  parseAnyDate,
  formatFrenchDateRange,
} from './calendarHelpers';

export interface CalendarExportFilters {
  cycle?: string;        // 'TOUS' | 'MATERNELLE' | 'PRIMAIRE' | 'SECONDAIRE' | 'SECONDAIRE_EXETAT'
  categorie?: string;    // 'TOUS' | 'EXAMENS_JURY' | 'VACANCES' | 'FÉRIÉ' | 'RENTRÉE_CLÔTURE'
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CalendarExportOptions {
  title: string;
  subtitle?: string;
  anneeScolaire?: string;
  filters?: CalendarExportFilters;
  includeLegend?: boolean;
  includeList?: boolean;
  orientation?: 'landscape' | 'portrait';
}

const CYCLE_LABELS: Record<string, string> = {
  TOUS: 'Tous les cycles',
  MATERNELLE: 'Cycle Maternelle',
  PRIMAIRE: 'Cycle Primaire',
  SECONDAIRE: 'Secondaire général',
  SECONDAIRE_EXETAT: 'Secondaire / EXETAT',
};

const CAT_LABELS: Record<string, string> = {
  TOUS: 'Toutes les catégories',
  EXAMENS_JURY: 'Examens & Jury',
  VACANCES: 'Vacances & Congés',
  FÉRIÉ: 'Jours Fériés',
  RENTRÉE_CLÔTURE: 'Rentrée / Clôture',
};

function normalizeColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function filterCalendarEvents(
  events: CalendarEventData[],
  filters: CalendarExportFilters = {}
): CalendarEventData[] {
  const { cycle = 'TOUS', categorie = 'TOUS', search = '', startDate, endDate } = filters;
  const q = search.toLowerCase().trim();
  const start = startDate ? parseAnyDate(startDate) : null;
  const end = endDate ? parseAnyDate(endDate) : null;

  return events
    .filter((ev) => {
      if (categorie !== 'TOUS' && ev.categorie !== categorie) return false;
      if (cycle !== 'TOUS' && ev.publicCible && ev.publicCible !== 'TOUS') {
        if (cycle === 'SECONDAIRE') {
          if (!ev.publicCible.startsWith('SECONDAIRE')) return false;
        } else if (ev.publicCible !== cycle) {
          return false;
        }
      }
      if (q) {
        const hay = `${ev.titre} ${ev.subtitre || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const evStart = parseAnyDate(ev.dateDebut);
      if (!evStart) return false;
      if (start && evStart < start) return false;
      if (end) {
        const evEnd = ev.dateFin ? parseAnyDate(ev.dateFin) : evStart;
        if (evEnd && evEnd > end) return false;
      }
      return true;
    })
    .sort((a, b) => (parseAnyDate(a.dateDebut)?.getTime() || 0) - (parseAnyDate(b.dateDebut)?.getTime() || 0));
}

function getMonthRange(events: CalendarEventData[]): { year: number; month: number }[] {
  if (events.length === 0) {
    const now = new Date();
    return [{ year: now.getFullYear(), month: now.getMonth() }];
  }

  const dates = events
    .map((ev) => parseAnyDate(ev.dateDebut))
    .filter((d): d is Date => !!d);
  const min = new Date(Math.min(...dates.map((d) => d.getTime())));
  const max = new Date(Math.max(...dates.map((d) => d.getTime())));

  const months: { year: number; month: number }[] = [];
  const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
  const end = new Date(max.getFullYear(), max.getMonth(), 1);
  while (cursor <= end) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function eventsForDay(events: CalendarEventData[], date: Date): CalendarEventData[] {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return events.filter((ev) => {
    const start = parseAnyDate(ev.dateDebut);
    if (!start) return false;
    const end = ev.dateFin ? parseAnyDate(ev.dateFin) : start;
    if (!end) return false;
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return target >= s && target <= e;
  });
}

function getDaysForMonth(year: number, month: number): Date[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const days: Date[] = [];

  // Padding before
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }
  // Padding after
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

export async function generateCalendarPDF(
  events: CalendarEventData[],
  options: CalendarExportOptions
): Promise<void> {
  const [{ jsPDF }, atModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = atModule.autoTable || atModule.default;

  const filtered = filterCalendarEvents(events, options.filters);
  const doc = new jsPDF({
    orientation: options.orientation || 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margeX = 12;
  const margeY = 12;
  const filters = options.filters || {};

  // ── Page de garde / synthèse ──────────────────────────────────────────────
  const titleY = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text(options.title, pageW / 2, titleY, { align: 'center' });

  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 90, 90);
    doc.text(options.subtitle, pageW / 2, titleY + 8, { align: 'center' });
  }

  if (options.anneeScolaire) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(99, 102, 241);
    doc.text(`Année scolaire : ${options.anneeScolaire}`, pageW / 2, titleY + 18, { align: 'center' });
  }

  // Filtres appliqués
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Filtres appliqués', margeX, titleY + 35);

  const filterLines = [
    `Cycle / Public : ${CYCLE_LABELS[filters.cycle || 'TOUS'] || filters.cycle || 'Tous'}`,
    `Catégorie : ${CAT_LABELS[filters.categorie || 'TOUS'] || filters.categorie || 'Toutes'}`,
    `Recherche : ${filters.search || 'Aucune'}`,
    `Événements affichés : ${filtered.length}`,
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 70, 70);
  filterLines.forEach((line, i) => {
    doc.text(line, margeX, titleY + 43 + i * 6);
  });

  // Légende
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Légende des catégories', margeX, titleY + 75);

  const categories = ['EXAMENS_JURY', 'VACANCES', 'FÉRIÉ', 'RENTRÉE_CLÔTURE'];
  const startX = margeX;
  let legendY = titleY + 83;
  categories.forEach((cat) => {
    const info = categoryInfo(cat);
    const [r, g, b] = normalizeColor(info.hex);
    doc.setFillColor(r, g, b);
    doc.circle(startX + 2, legendY - 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(info.label, startX + 7, legendY);
    legendY += 7;
  });

  // ── Grilles mensuelles ────────────────────────────────────────────────────
  const months = getMonthRange(filtered);

  const gridTop = margeY + 28;
  const gridW = pageW - margeX * 2;
  const colW = gridW / 7;
  const rowH = 27;
  const headerH = 8;

  months.forEach(({ year, month }, monthIndex) => {
    if (monthIndex > 0 || (options.includeList ?? true)) {
      doc.addPage('a4', 'landscape');
    }

    const monthTitle = `${MONTHS_FR[month]} ${year}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text(monthTitle, pageW / 2, 18, { align: 'center' });

    // En-têtes des jours
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFillColor(245, 245, 250);
    WEEKDAYS_SHORT.forEach((day, i) => {
      const x = margeX + i * colW;
      doc.rect(x, gridTop, colW, headerH, 'FD');
      doc.setTextColor(80, 80, 80);
      doc.text(day, x + colW / 2, gridTop + 5.5, { align: 'center' });
    });

    const days = getDaysForMonth(year, month);
    const weeks = Math.ceil(days.length / 7);

    for (let w = 0; w < weeks; w++) {
      const y = gridTop + headerH + w * rowH;
      for (let d = 0; d < 7; d++) {
        const idx = w * 7 + d;
        const date = days[idx];
        if (!date) continue;
        const x = margeX + d * colW;
        const isCurrentMonth = date.getMonth() === month;

        // Bordure
        doc.setDrawColor(220, 220, 225);
        doc.setLineWidth(0.2);
        if (!isCurrentMonth) {
          doc.setFillColor(250, 250, 252);
          doc.rect(x, y, colW, rowH, 'FD');
        }
        doc.rect(x, y, colW, rowH);

        if (!isCurrentMonth) continue;

        // Numéro du jour
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.text(String(date.getDate()), x + 2, y + 4.5);

        // Événements du jour — affichage multi-lignes avec retour à la ligne automatique
        const dayEvents = eventsForDay(filtered, date);
        const contentW = Math.max(10, colW - 8);
        const lineHeight = 2.6;
        const eventSpacing = 0.8;
        const maxTitleLines = 3;
        const bottomMargin = 2.5;
        let cursorY = y + 6;
        let displayed = 0;

        for (const ev of dayEvents) {
          const info = categoryInfo(ev.categorie);
          const [r, g, b] = normalizeColor(info.hex);
          const rawLines = doc.splitTextToSize(ev.titre, contentW);
          let lines = rawLines.length > maxTitleLines ? rawLines.slice(0, maxTitleLines) : rawLines;

          // Si le titre est trop long pour les lignes allouées, indiquer la coupure avec "..."
          if (rawLines.length > maxTitleLines) {
            const last = lines[maxTitleLines - 1];
            lines[maxTitleLines - 1] = last.length > 3 ? last.slice(0, last.length - 3) + '...' : '...';
          }

          const blockH = lines.length * lineHeight + eventSpacing;
          if (cursorY + blockH > y + rowH - bottomMargin) break;

          // Pastille de catégorie alignée verticalement sur la première ligne
          doc.setFillColor(r, g, b);
          doc.circle(x + 2.8, cursorY + lineHeight / 2, 1.2, 'F');

          // Texte de l'événement
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(50, 50, 50);
          lines.forEach((line: string, li: number) => {
            doc.text(line, x + 5, cursorY + li * lineHeight);
          });

          cursorY += blockH;
          displayed++;
        }

        if (displayed < dayEvents.length) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(120, 120, 120);
          doc.text(`+${dayEvents.length - displayed} autre(s)`, x + 3, y + rowH - 2.5);
        }
      }
    }
  });

  // ── Liste détaillée des événements ────────────────────────────────────────
  if (options.includeList ?? true) {
    doc.addPage('a4', 'landscape');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Liste détaillée des événements', pageW / 2, 18, { align: 'center' });

    const rows = filtered.map((ev) => {
      const info = categoryInfo(ev.categorie);
      return {
        date: formatFrenchDateRange(ev.dateDebut, ev.dateFin),
        categorie: info.label,
        titre: ev.titre,
        public: ev.publicCible ? ev.publicCible.replace('_', ' / ') : 'TOUS',
        details: ev.subtitre || '',
        color: info.hex,
      };
    });

    autoTable(doc, {
      startY: 28,
      margin: { left: margeX, right: margeX, top: 28, bottom: 15 },
      head: [['Période', 'Catégorie', 'Événement', 'Public cible', 'Détails']],
      body: rows.map((r) => [r.date, r.categorie, r.titre, r.public, r.details]),
      headStyles: {
        fillColor: [99, 102, 241],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 2, right: 2, bottom: 2, left: 2 },
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 },
        lineColor: [220, 220, 225],
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 70 },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' },
      },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 1) {
          const row = rows[data.row.index];
          if (row && row.color) {
            const [r, g, b] = normalizeColor(row.color);
            const { x, y, width, height } = data.cell;
            doc.setFillColor(r, g, b);
            doc.roundedRect(x + 1, y + 1.5, 3, height - 3, 1, 1, 'F');
          }
        }
      },
    });
  }

  const fileName = options.title.replace(/\s+/g, '_').replace(/[^\w-]/g, '') + '.pdf';
  doc.save(fileName);
}
