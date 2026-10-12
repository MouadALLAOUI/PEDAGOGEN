import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';
import { marked } from 'marked';
import type { CourseMetadata } from '@/types/generation';
import { createDocxMinisterialHeader, createDocxSignatureAndStampBlock, type MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

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
    // Skip internal metadata/consistency fields that should not appear as document content
    const keyLower = key.replace(/_/g, ' ').toLowerCase();
    if (keyLower.includes('timing consistency') || keyLower.includes('timing_consistency')) continue;

    const label = prefix ? `${prefix} > ${key.replace(/_/g, ' ')}` : key.replace(/_/g, ' ');

    if (typeof value === 'string' && value.trim()) {
      const sanitized = sanitizeText(value);
      if (sanitized) {
        result.push({ label: label.toUpperCase(), text: sanitized });
      }
    } else if (Array.isArray(value)) {
      const items = value
        .map((item) => {
          if (typeof item === 'string') {
            const sanitized = sanitizeText(item);
            return sanitized ? `• ${sanitized}` : '';
          }
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
  title: string,
  header?: MinisterialHeaderInfo,
): Promise<Buffer> {
  const sections: (Paragraph | Table)[] = [];

  // Official Moroccan Ministerial Header
  sections.push(createDocxMinisterialHeader(header, metadata));
  sections.push(new Paragraph({ spacing: { after: 200 } }));

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

  // Official Signature and Digital Stamp Block
  sections.push(new Paragraph({ spacing: { before: 240, after: 120 } }));
  sections.push(createDocxSignatureAndStampBlock(header));

  const doc = new Document({
    sections: [{ children: sections }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}

export async function buildDocxFromMarkdown(
  markdown: string,
  title?: string,
  header?: MinisterialHeaderInfo,
): Promise<Buffer> {
  const sections: (Paragraph | Table)[] = [];

  // Official 3-column Moroccan Ministerial Header
  sections.push(createDocxMinisterialHeader(header));
  sections.push(new Paragraph({ spacing: { after: 200 } }));

  if (title) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 30, font: 'Calibri', color: '0F172A' })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 300 },
      })
    );
  }

  const tokens = marked.lexer(markdown);
  for (const token of tokens) {
    if (token.type === 'heading') {
      const headingLevel =
        token.depth === 1
          ? HeadingLevel.HEADING_1
          : token.depth === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;
      const size = token.depth === 1 ? 26 : token.depth === 2 ? 22 : 19;
      const color = token.depth === 1 ? '0F172A' : token.depth === 2 ? '0D9488' : '334155';
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: token.text, bold: true, size, font: 'Calibri', color })],
          heading: headingLevel,
          spacing: { before: 240, after: 100 },
        })
      );
    } else if (token.type === 'paragraph') {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: token.text, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { after: 120 },
        })
      );
    } else if (token.type === 'list') {
      for (const item of token.items) {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item.text}`, size: 20, font: 'Calibri', color: '334155' })],
            spacing: { after: 60 },
            indent: { left: 240 },
          })
        );
      }
    } else if (token.type === 'table') {
      const headerRow = new TableRow({
        tableHeader: true,
        children: (token as any).header.map(
          (cell: any) =>
            new TableCell({
              shading: { fill: '0D9488' },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: cell.text, bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })],
                }),
              ],
            })
        ),
      });
      const dataRows = (token as any).rows.map(
        (row: any[]) =>
          new TableRow({
            children: row.map(
              (cell: any) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: cell.text, size: 18, font: 'Calibri', color: '1E293B' })],
                    }),
                  ],
                })
            ),
          })
      );
      sections.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        })
      );
      sections.push(new Paragraph({ spacing: { after: 120 } }));
    } else if (token.type === 'code') {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: token.text, font: 'Courier New', size: 18, color: '334155' })],
          spacing: { before: 60, after: 100 },
          indent: { left: 160 },
        })
      );
    }
  }

  // Official Signature and Digital Stamp Block
  sections.push(new Paragraph({ spacing: { before: 240, after: 120 } }));
  sections.push(createDocxSignatureAndStampBlock(header));

  const doc = new Document({ sections: [{ children: sections }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
