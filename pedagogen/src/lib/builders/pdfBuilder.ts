import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';

export interface WatermarkInfo {
  fullName: string;
  etablissement: string;
}

function flattenContent(content: Record<string, unknown>, prefix = ''): { label: string; text: string }[] {
  const result: { label: string; text: string }[] = [];

  for (const [key, value] of Object.entries(content)) {
    const label = prefix ? `${prefix} > ${key.replace(/_/g, ' ')}` : key.replace(/_/g, ' ');

    if (typeof value === 'string' && value.trim()) {
      result.push({ label: label.toUpperCase(), text: value });
    } else if (Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (typeof item === 'string') return `• ${item}`;
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
  watermark?: WatermarkInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // Draw watermark on every page
  function drawWatermarkOnPage() {
    if (!watermark || (!watermark.fullName && !watermark.etablissement)) return;
    const wmText = `${watermark.etablissement} | ${watermark.fullName} | ${new Date().toLocaleDateString('fr-FR')}`;
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.1 }));
    doc.setFontSize(30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text(wmText, pageWidth / 2, pageHeight / 2, { angle: 45, align: 'center' });
    doc.restoreGraphicsState();
  }

  // Subscribe to addPage to stamp watermark on each new page
  doc.internal.events.subscribe('addPage', drawWatermarkOnPage);
  drawWatermarkOnPage();

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metaLines = [
    `Niveau: ${metadata.niveau} | Matière: ${metadata.matiere}`,
    `Unit\u00e9: ${metadata.unite}`,
    `Le\u00e7on: ${metadata.lecon}`,
    `Dur\u00e9e: ${metadata.duree} min | Semestre: ${metadata.semestre}`,
  ];

  for (const line of metaLines) {
    doc.text(line, 20, y);
    y += 6;
  }

  // Teacher/school info if available
  if (watermark) {
    y += 2;
    doc.setFontSize(9);
    doc.setTextColor(100);
    if (watermark.etablissement) doc.text(`\u00c9tablissement: ${watermark.etablissement}`, 20, y);
    if (watermark.fullName) doc.text(`Enseignant: ${watermark.fullName}`, pageWidth - 20, y, { align: 'right' });
    y += 6;
    doc.setTextColor(0);
  }

  y += 3;
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

  return Buffer.from(doc.output('arraybuffer'));
}
