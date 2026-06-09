import { jsPDF } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';

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

  // Content
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(key.replace(/_/g, ' ').toUpperCase(), 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(value, pageWidth - 40);
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += 5;
      }
      y += 5;
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
