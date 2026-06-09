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

  // Content sections
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: key.replace(/_/g, ' ').toUpperCase(),
              bold: true,
              size: 24,
              font: 'Calibri',
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        })
      );

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: value,
              size: 22,
              font: 'Calibri',
            }),
          ],
          spacing: { after: 200 },
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
