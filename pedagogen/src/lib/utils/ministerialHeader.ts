import { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, BorderStyle } from 'docx';
import type { jsPDF } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';

export const AREF_LIST = [
  'AREF Rabat-Salé-Kénitra',
  'AREF Casablanca-Settat',
  'AREF Fès-Meknès',
  'AREF Marrakech-Safi',
  'AREF Tanger-Tétouan-Al Hoceïma',
  'AREF Souss-Massa',
  'AREF Béni Mellal-Khénifra',
  'AREF Oriental',
  'AREF Drâa-Tafilalet',
  'AREF Guelmim-Oued Noun',
  'AREF Laâyoune-Sakia El Hamra',
  'AREF Dakhla-Oued Ed-Dahab',
] as const;

export interface MinisterialHeaderInfo {
  fullName?: string;
  teacherName?: string;
  etablissement?: string;
  aref?: string;
  directionProvinciale?: string;
  matiere?: string;
  subject?: string;
  anneeScolaire?: string;
}

export function getCurrentSchoolYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  // Moroccan school year starts in September
  if (month >= 9) {
    return `${year} - ${year + 1}`;
  }
  return `${year - 1} - ${year}`;
}

/**
 * Builds an official Moroccan MEN 3-column header for DOCX documents.
 */
export function createDocxMinisterialHeader(
  header?: MinisterialHeaderInfo,
  metadata?: Partial<CourseMetadata>,
): Table {
  const aref = header?.aref?.trim() || 'AREF Rabat-Salé-Kénitra';
  const direction = header?.directionProvinciale?.trim() || 'Direction Provinciale';
  const etablissement = header?.etablissement?.trim() || 'Collège';
  const teacher = header?.teacherName?.trim() || header?.fullName?.trim() || 'Professeur';
  const matiere = metadata?.matiere || header?.subject || header?.matiere || 'Matière';
  const niveau = metadata?.niveau || 'Collège';
  const semestre = metadata?.semestre ? `Semestre ${metadata.semestre}` : '';
  const annee = header?.anneeScolaire || getCurrentSchoolYear();

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const bottomBorder = { style: BorderStyle.SINGLE, size: 4, color: '0D9488' };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder,
      left: noBorder,
      right: noBorder,
      bottom: bottomBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        children: [
          // Left Column
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Royaume du Maroc', bold: true, size: 16, font: 'Calibri', color: '0F172A' }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Ministère de l\'Éducation Nationale', size: 14, font: 'Calibri', color: '475569' }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: aref, size: 14, font: 'Calibri', color: '0D9488', bold: true }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: direction, size: 14, font: 'Calibri', color: '64748B' }),
                ],
                spacing: { after: 60 },
              }),
            ],
          }),

          // Center Column
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: etablissement, bold: true, size: 18, font: 'Calibri', color: '0F172A' }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Cycle de l\'Enseignement Collégial', size: 13, font: 'Calibri', color: '64748B' }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Année scolaire : ${annee}`, size: 13, font: 'Calibri', color: 'B45309', bold: true }),
                ],
                spacing: { after: 60 },
              }),
            ],
          }),

          // Right Column
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Enseignant(e) : ${teacher}`, bold: true, size: 16, font: 'Calibri', color: '0F172A' }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Discipline : ${matiere}`, size: 14, font: 'Calibri', color: '0D9488', bold: true }),
                ],
                spacing: { after: 20 },
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `Niveau : ${niveau} ${semestre ? `· ${semestre}` : ''}`, size: 14, font: 'Calibri', color: '475569' }),
                ],
                spacing: { after: 60 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Draws an official Moroccan MEN 3-column header on the current jsPDF page.
 * Returns the Y position immediately following the header.
 */
export function drawPdfMinisterialHeader(
  doc: jsPDF,
  header?: MinisterialHeaderInfo,
  metadata?: Partial<CourseMetadata>,
  startY = 12,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const colWidth = (pageWidth - margin * 2) / 3;

  const aref = header?.aref?.trim() || 'AREF Rabat-Salé-Kénitra';
  const direction = header?.directionProvinciale?.trim() || 'Direction Provinciale';
  const etablissement = header?.etablissement?.trim() || 'Collège';
  const teacher = header?.fullName?.trim() || 'Professeur';
  const matiere = metadata?.matiere || header?.matiere || 'Matière';
  const niveau = metadata?.niveau || 'Collège';
  const semestre = metadata?.semestre ? `· S${metadata.semestre}` : '';
  const annee = header?.anneeScolaire || getCurrentSchoolYear();

  let y = startY;

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42); // navy
  doc.text('Royaume du Maroc', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Ministère de l\'Éducation Nationale', margin, y + 3.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136); // teal
  doc.text(aref, margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(direction, margin, y + 10.5);

  // Center Column
  const centerX = margin + colWidth + colWidth / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(etablissement, centerX, y + 2, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100);
  doc.text('Enseignement Secondaire Collégial', centerX, y + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // amber
  doc.text(`Année scolaire : ${annee}`, centerX, y + 9.5, { align: 'center' });

  // Right Column
  const rightX = pageWidth - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Prof : ${teacher}`, rightX, y, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(13, 148, 136);
  doc.text(`Matière : ${matiere}`, rightX, y + 3.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Niveau : ${niveau} ${semestre}`, rightX, y + 7, { align: 'right' });

  // Subtle separator line
  const lineY = y + 13;
  doc.setDrawColor(13, 148, 136);
  doc.setLineWidth(0.6);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  return lineY + 5;
}

/**
 * Generates an HTML 3-column ministerial header snippet.
 */
export function renderHtmlMinisterialHeader(
  header?: MinisterialHeaderInfo,
  metadata?: Partial<CourseMetadata>,
): string {
  const aref = header?.aref?.trim() || 'AREF Rabat-Salé-Kénitra';
  const direction = header?.directionProvinciale?.trim() || 'Direction Provinciale';
  const etablissement = header?.etablissement?.trim() || 'Collège';
  const teacher = header?.fullName?.trim() || 'Professeur';
  const matiere = metadata?.matiere || header?.matiere || 'Matière';
  const niveau = metadata?.niveau || 'Collège';
  const semestre = metadata?.semestre ? `· S${metadata.semestre}` : '';
  const annee = header?.anneeScolaire || getCurrentSchoolYear();

  return `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px; border-bottom: 2px solid #0d9488; margin-bottom: 20px; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; line-height: 1.4; color: #1e293b; background: #f8fafc; border-radius: 8px;">
      <div style="flex: 1; text-align: left;">
        <strong style="color: #0f172a; font-size: 12px; display: block;">Royaume du Maroc</strong>
        <span style="color: #64748b;">Ministère de l'Éducation Nationale</span><br />
        <strong style="color: #0d9488;">${aref}</strong><br />
        <span style="color: #64748b;">${direction}</span>
      </div>
      <div style="flex: 1; text-align: center;">
        <strong style="font-size: 14px; color: #0f172a; display: block;">${etablissement}</strong>
        <span style="color: #64748b;">Enseignement Secondaire Collégial</span><br />
        <span style="color: #b45309; font-weight: 600;">Année : ${annee}</span>
      </div>
      <div style="flex: 1; text-align: right;">
        <strong style="color: #0f172a; font-size: 12px; display: block;">Prof : ${teacher}</strong>
        <strong style="color: #0d9488;">Matière : ${matiere}</strong><br />
        <span style="color: #475569;">Niveau : ${niveau} ${semestre}</span>
      </div>
    </div>
  `;
}

/**
 * Builds an official Signature and Digital Stamp block for DOCX exports.
 */
export function createDocxSignatureAndStampBlock(
  header?: MinisterialHeaderInfo,
  dateStr?: string,
): Table {
  const teacher = header?.teacherName?.trim() || header?.fullName?.trim() || 'Professeur';
  const etablissement = header?.etablissement?.trim() || 'Collège';
  const displayDate = dateStr || new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const thinBorder = { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' };
  const cellBorders = {
    top: thinBorder,
    left: thinBorder,
    right: thinBorder,
    bottom: thinBorder,
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorders,
    rows: [
      new TableRow({
        children: [
          // Left Cell: Teacher signature & Digital stamp
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: { fill: 'F8FAFC' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "SIGNATURE DE L'ENSEIGNANT(E)",
                    bold: true,
                    size: 16,
                    font: 'Calibri',
                    color: '0F172A',
                  }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Enseignant(e) : `, bold: true, size: 14, font: 'Calibri' }),
                  new TextRun({ text: teacher, size: 14, font: 'Calibri', color: '0D9488' }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Établissement : `, bold: true, size: 14, font: 'Calibri' }),
                  new TextRun({ text: etablissement, size: 14, font: 'Calibri' }),
                ],
                spacing: { after: 30 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `Date de préparation : `, bold: true, size: 14, font: 'Calibri' }),
                  new TextRun({ text: displayDate, size: 14, font: 'Calibri' }),
                ],
                spacing: { after: 100 },
              }),
              // Digital Stamp Representation
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `★ TAMPON NUMÉRIQUE OFFICIEL — CRMEF ★\n`,
                    bold: true,
                    size: 13,
                    font: 'Calibri',
                    color: '0D9488',
                  }),
                  new TextRun({
                    text: `DOCUMENT CONFORME AUX DIRECTIVES MEN · ${etablissement.toUpperCase()}\nÉMARGÉ PAR : ${teacher.toUpperCase()}`,
                    size: 12,
                    font: 'Calibri',
                    color: '475569',
                  }),
                ],
                spacing: { before: 80, after: 80 },
              }),
            ],
          }),

          // Right Cell: Inspector / CRMEF trainer visa
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: { fill: 'FFFFFF' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'VISA DU FORMATEUR CRMEF / INSPECTEUR',
                    bold: true,
                    size: 16,
                    font: 'Calibri',
                    color: '0F172A',
                  }),
                ],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Observations pédagogiques & recommandations didactiques :',
                    size: 13,
                    font: 'Calibri',
                    color: '64748B',
                  }),
                ],
                spacing: { after: 120 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '........................................................................................................',
                    size: 12,
                    font: 'Calibri',
                    color: 'CBD5E1',
                  }),
                ],
                spacing: { after: 80 },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Date et Visa : Le ..... / ..... / 202...          Cachet :',
                    size: 13,
                    font: 'Calibri',
                    bold: true,
                    color: '334155',
                  }),
                ],
                spacing: { before: 80, after: 60 },
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/**
 * Draws an official Signature and Digital Stamp block on jsPDF.
 */
export function drawPdfSignatureAndStampBlock(
  doc: jsPDF,
  header?: MinisterialHeaderInfo | { fullName?: string; etablissement?: string; teacherName?: string },
  currentY = 220,
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const blockHeight = 44;

  let y = currentY;
  if (y + blockHeight > pageHeight - 15) {
    doc.addPage();
    y = 20;
  }

  const colWidth = (pageWidth - margin * 2 - 8) / 2;
  const teacher = (header as any)?.teacherName?.trim() || (header as any)?.fullName?.trim() || 'Professeur';
  const etablissement = (header as any)?.etablissement?.trim() || 'Collège';
  const displayDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // 1. Box Enseignant (Left)
  doc.setDrawColor(203, 213, 225); // #CBD5E1
  doc.setFillColor(248, 250, 252); // #F8FAFC
  doc.roundedRect(margin, y, colWidth, blockHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("SIGNATURE DE L'ENSEIGNANT(E)", margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Prof : ${teacher}`, margin + 4, y + 11);
  doc.text(`Établissement : ${etablissement}`, margin + 4, y + 15);
  doc.text(`Date : ${displayDate}`, margin + 4, y + 19);

  // Digital Stamp Box inside left card
  const stampX = margin + 4;
  const stampY = y + 23;
  const stampW = colWidth - 8;
  const stampH = 17;

  doc.setDrawColor(13, 148, 136); // teal border
  doc.setLineWidth(0.5);
  doc.setFillColor(240, 253, 250); // teal-50
  doc.roundedRect(stampX, stampY, stampW, stampH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(13, 148, 136);
  doc.text('★ TAMPON NUMÉRIQUE CERTIFIÉ — CRMEF ★', stampX + stampW / 2, stampY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`CONFORME MEN · ${etablissement.toUpperCase()}`, stampX + stampW / 2, stampY + 8.5, { align: 'center' });
  doc.text(`ÉMARGÉ ÉLECTRONIQUEMENT : ${teacher.toUpperCase()}`, stampX + stampW / 2, stampY + 12.5, { align: 'center' });

  // 2. Box Inspecteur / Formateur CRMEF (Right)
  const rightX = margin + colWidth + 8;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rightX, y, colWidth, blockHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('VISA DU FORMATEUR CRMEF / INSPECTEUR', rightX + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Observations & recommandations didactiques :', rightX + 4, y + 12);

  // Line for observations
  doc.setDrawColor(226, 232, 240);
  doc.line(rightX + 4, y + 22, rightX + colWidth - 4, y + 22);
  doc.line(rightX + 4, y + 28, rightX + colWidth - 4, y + 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Date & Visa : Le ..... / ..... / 202...   Signature :', rightX + 4, y + 36);

  return y + blockHeight + 6;
}
