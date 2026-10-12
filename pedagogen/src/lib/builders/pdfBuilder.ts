import { jsPDF } from 'jspdf';
import { marked } from 'marked';
import type { CourseMetadata } from '@/types/generation';
import { drawPdfMinisterialHeader, drawPdfSignatureAndStampBlock, type MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

export interface WatermarkInfo {
  fullName: string;
  etablissement: string;
  aref?: string;
  directionProvinciale?: string;
}

function sanitizeText(text: string): string {
  // Remove non-printable/invisible characters (control chars except \n, \t, \r)
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
  // Remove corrupted JSON fragments that leak into text (e.g. "titre_seance": "...")
  clean = clean.replace(/"[a-z_]+"\s*:\s*"/gi, '');
  clean = clean.replace(/"\s*:\s*"/g, ' ');
  clean = clean.replace(/\{"/g, '');
  clean = clean.replace(/"\}/g, '');
  clean = clean.replace(/\\u[0-9a-fA-F]{4}/g, '');
  clean = clean.replace(/\\n/g, ' ');
  clean = clean.replace(/\\t/g, ' ');
  clean = clean.replace(/\\"/g, '"');
  // Replace multiple consecutive spaces/newlines with single
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/\n{3,}/g, '\n\n');
  return clean.trim();
}

function flattenContent(content: Record<string, unknown>, prefix = ''): { label: string; text: string }[] {
  const result: { label: string; text: string }[] = [];

  for (const [key, value] of Object.entries(content)) {
    if (key === 'timing_consistency_check') continue;
    const label = prefix ? `${prefix} > ${key.replace(/_/g, ' ')}` : key.replace(/_/g, ' ');

    if (typeof value === 'string' && value.trim()) {
      const sanitized = sanitizeText(value);
      if (sanitized) {
        result.push({ label: label.toUpperCase(), text: sanitized });
      }
    } else if (Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (typeof item === 'string') return `• ${sanitizeText(item)}`;
          if (typeof item === 'object' && item !== null) {
            const sub = flattenContent(item as Record<string, unknown>, label);
            return sub.map((s) => `  ${s.text}`).join('\n');
          }
          return '';
        })
        .filter(Boolean);
      if (items.length > 0) {
        result.push({ label: label.toUpperCase(), text: items.join('\n') });
      }
    } else if (typeof value === 'object' && value !== null) {
      const sub = flattenContent(value as Record<string, unknown>, label);
      result.push(...sub);
    }
  }

  return result;
}

export function buildPdf(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string,
  watermark?: WatermarkInfo | MinisterialHeaderInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Draw official 3-column Moroccan ministerial header
  let y = drawPdfMinisterialHeader(doc, watermark, metadata, 10);
  y += 4;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Metadata table
  const colWidth = (pageWidth - 40) / 4;
  const rowHeight = 10;
  const tableTop = y + 5;

  const rows: string[][] = [
    ['Enseignant', watermark?.fullName || '______', 'Niveau', metadata.niveau],
    ['Unité', metadata.unite, 'Séance', metadata.lecon],
    ['Séquence', '______', 'Durée', `${metadata.duree} min`],
  ];

  doc.setDrawColor(180);
  doc.setFontSize(9);
  rows.forEach((row, r) => {
    for (let c = 0; c < 4; c++) {
      const x = 20 + c * colWidth;
      const yRow = tableTop + r * rowHeight;
      doc.rect(x, yRow, colWidth, rowHeight);
      const isLabel = c % 2 === 0;
      doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
      doc.setTextColor(isLabel ? 0 : 80);
      doc.text(row[c]!, x + 2, yRow + 6.5);
    }
  });

  y = tableTop + rows.length * rowHeight + 10;
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Flatten and render all content
  const sections = flattenContent(content);

  for (const section of sections) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const labelLines = doc.splitTextToSize(section.label, pageWidth - 40);
    for (const line of labelLines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 6;
    }
    y += 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const textLines = doc.splitTextToSize(section.text, pageWidth - 40);
    for (const line of textLines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 5;
    }
    y += 8;
  }

  // Official Signature & Digital Stamp Block
  drawPdfSignatureAndStampBlock(doc, watermark, y);

  return Buffer.from(doc.output('arraybuffer'));
}

export function buildPdfFromMarkdown(
  markdown: string,
  title?: string,
  header?: MinisterialHeaderInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = drawPdfMinisterialHeader(doc, header, undefined, 10);
  y += 4;

  if (title) {
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title, pageWidth / 2, y, { align: 'center' });
    y += 10;
  }

  const tokens = marked.lexer(markdown);
  for (const token of tokens) {
    if (token.type === 'heading') {
      if (y > pageHeight - 25) { doc.addPage(); y = 16; }
      const size = token.depth === 1 ? 13 : token.depth === 2 ? 11 : 9.5;
      doc.setFontSize(size);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(token.depth === 1 ? 15 : token.depth === 2 ? 13 : 51, token.depth === 1 ? 23 : token.depth === 2 ? 148 : 65, token.depth === 1 ? 42 : token.depth === 2 ? 136 : 85);
      const lines = doc.splitTextToSize(token.text, contentWidth);
      for (const line of lines) {
        if (y > pageHeight - 20) { doc.addPage(); y = 16; }
        doc.text(line, margin, y);
        y += size * 0.45 + 1;
      }
      y += 2;
    } else if (token.type === 'paragraph') {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(token.text, contentWidth);
      for (const line of lines) {
        if (y > pageHeight - 20) { doc.addPage(); y = 16; }
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 2.5;
    } else if (token.type === 'list') {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      for (const item of token.items) {
        const itemLines = doc.splitTextToSize(`• ${item.text}`, contentWidth - 4);
        for (const line of itemLines) {
          if (y > pageHeight - 20) { doc.addPage(); y = 16; }
          doc.text(line, margin + 4, y);
          y += 4.2;
        }
      }
      y += 2;
    } else if (token.type === 'table') {
      const cols = token.header.length || 1;
      const colW = contentWidth / cols;
      if (y > pageHeight - 30) { doc.addPage(); y = 16; }
      
      doc.setFillColor(13, 148, 136);
      doc.rect(margin, y, contentWidth, 7, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      (token as any).header.forEach((th: any, c: number) => {
        doc.text(th.text, margin + c * colW + 2, y + 5);
      });
      y += 7;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      (token as any).rows.forEach((row: any[], r: number) => {
        if (y > pageHeight - 20) { doc.addPage(); y = 16; }
        if (r % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, contentWidth, 6, 'F');
        }
        row.forEach((cell: any, c: number) => {
          doc.text(cell.text, margin + c * colW + 2, y + 4.5);
        });
        y += 6;
      });
      y += 4;
    } else if (token.type === 'code') {
      if (y > pageHeight - 25) { doc.addPage(); y = 16; }
      doc.setFillColor(241, 245, 249);
      const codeLines = doc.splitTextToSize(token.text, contentWidth - 6);
      const boxH = codeLines.length * 4 + 4;
      doc.rect(margin, y, contentWidth, boxH, 'F');
      doc.setFontSize(7);
      doc.setFont('courier', 'normal');
      doc.setTextColor(51, 65, 85);
      let cy = y + 3.5;
      for (const line of codeLines) {
        doc.text(line, margin + 3, cy);
        cy += 4;
      }
      y += boxH + 3;
    }
  }

  // Official Signature & Digital Stamp Block
  drawPdfSignatureAndStampBlock(doc, header, y);

  return Buffer.from(doc.output('arraybuffer'));
}
