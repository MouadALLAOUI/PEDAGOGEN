import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from 'docx';
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

export async function buildDocx(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32,
          font: 'Calibri',
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Metadata header
  const metaLines = [
    `Niveau: ${metadata.niveau}`,
    `Matière: ${metadata.matiere}`,
    `Unité: ${metadata.unite}`,
    `Leçon: ${metadata.lecon}`,
    `Durée: ${metadata.duree} minutes`,
    `Semestre: ${metadata.semestre}`,
  ];

  for (const line of metaLines) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: line,
            size: 22,
            font: 'Calibri',
          }),
        ],
        spacing: { after: 100 },
      })
    );
  }

  sections.push(
    new Paragraph({
      children: [],
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      },
      spacing: { after: 200 },
    })
  );

  // Flatten and render all content
  const flatSections = flattenContent(content);

  for (const section of flatSections) {
    // Section label
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: section.label,
            bold: true,
            size: 24,
            font: 'Calibri',
          }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    // Section text — split by newlines for proper paragraphs
    const paragraphs = section.text.split('\n').filter((l) => l.trim());
    for (const para of paragraphs) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: para,
              size: 22,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}
