import { jsPDF } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';

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
  title: string
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const metaLines = [
    `Niveau: ${metadata.niveau} | Matière: ${metadata.matiere}`,
    `Unité: ${metadata.unite}`,
    `Leçon: ${metadata.lecon}`,
    `Durée: ${metadata.duree} min | Semestre: ${metadata.semestre}`,
  ];

  for (const line of metaLines) {
    doc.text(line, 20, y);
    y += 6;
  }

  y += 5;
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

    // Section label
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const labelLines = doc.splitTextToSize(section.label, pageWidth - 40);
    for (const line of labelLines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 6;
    }
    y += 2;

    // Section text
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
