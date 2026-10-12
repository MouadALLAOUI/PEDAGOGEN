import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType,
} from 'docx';
import type { CourseMetadata } from '@/types/generation';
import type { ResumeContent } from './resumeBuilder';

function buildFieldParagraph(label: string, value: string, color: string, indent: number = 240): Paragraph | null {
  if (!value) return null;
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: indent },
    children: [
      new TextRun({ text: label, bold: true, size: 18, font: 'Calibri', color }),
      new TextRun({ text: `  ${value}`, size: 18, font: 'Calibri', color: '333333' }),
    ],
  });
}

function buildSectionHeading(text: string): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 28, font: 'Calibri', color: '0F172A' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 60 },
    }),
    new Paragraph({
      spacing: { after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '0F172A' } },
      children: [new TextRun({ text: '', size: 1 })],
    }),
  ];
}

function buildBulletList(items: string[], indent: number = 240): Paragraph[] {
  return items.filter(Boolean).map(item => new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: indent },
    children: [new TextRun({ text: `• ${item}`, size: 18, font: 'Calibri', color: '333333' })],
  }));
}

function buildBodyText(text: string, indent: number = 80): Paragraph {
  return new Paragraph({
    spacing: { before: 20, after: 40 },
    indent: { left: indent, right: 80 },
    children: [new TextRun({ text, size: 18, font: 'Calibri', color: '333333' })],
  });
}

export async function buildResumeDocx(
  metadata: CourseMetadata,
  content: ResumeContent,
  title: string,
): Promise<Buffer> {
  const sections: (Paragraph | Table)[] = [];

  sections.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 32, font: 'Calibri' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  sections.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ['Enseignant', '______', 'Niveau', metadata.niveau],
      ['Unité', metadata.unite, 'Séance', metadata.lecon],
      ['Séquence', '______', 'Durée', `${metadata.duree} min`],
    ].map(row => new TableRow({
      children: row.map((cell, i) => new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: cell, bold: i % 2 === 0, size: 18, font: 'Calibri' })] })],
      })),
    })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    },
  }));

  if (content.titre) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: content.titre, bold: true, size: 24, font: 'Calibri', color: '0D9488' })],
        spacing: { before: 100, after: 80 },
        indent: { left: 80 },
      })
    );
  }

  if (content.introduction) {
    sections.push(...buildSectionHeading('INTRODUCTION'));
    sections.push(buildBodyText(content.introduction));
  }

  if (content.qrcode_externe) {
    sections.push(
      new Paragraph({
        spacing: { before: 60, after: 40 },
        indent: { left: 80, right: 80 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        },
        children: [
          new TextRun({ text: 'Ressource externe / Quiz en ligne :', bold: true, size: 18, font: 'Calibri', color: '1F2937' }),
          new TextRun({ text: '', size: 1, break: 1 }),
          new TextRun({ text: content.qrcode_externe, size: 18, font: 'Calibri', color: '1D4ED8' }),
        ],
      })
    );
  }

  if (content.resume) {
    sections.push(...buildSectionHeading('RÉSUMÉ'));
    sections.push(buildBodyText(content.resume));
  }

  const nc = content.notions_cles;
  if (nc?.length) {
    sections.push(...buildSectionHeading('NOTIONS CLÉS'));
    for (const n of nc) {
      sections.push(
        new Paragraph({
          spacing: { before: 60, after: 40 },
          indent: { left: 80, right: 80 },
          shading: { type: 'clear', color: 'F0FDFA' },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '0D9488' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '0D9488' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '0D9488' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '0D9488' },
          },
          children: [
            new TextRun({ text: n.terme || '', bold: true, size: 20, font: 'Calibri', color: '0D9488' }),
            new TextRun({ text: '', size: 1, break: 1 }),
            new TextRun({ text: n.definition_simple || '', size: 18, font: 'Calibri', color: '1E293B' }),
            new TextRun({ text: '', size: 1, break: 1 }),
            new TextRun({ text: `Ex: ${n.exemple || ''}`, italics: true, size: 16, font: 'Calibri', color: '64748B' }),
          ],
        })
      );
    }
  }

  const lexique = content.lexique_bilingue;
  if (lexique?.length) {
    sections.push(...buildSectionHeading('LEXIQUE BILINGUE / معجم المصطلحات'));
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: '0D9488' },
                children: [new Paragraph({ children: [new TextRun({ text: 'Français', bold: true, color: 'FFFFFF', font: 'Calibri', size: 18 })] })],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { fill: '0D9488' },
                children: [new Paragraph({ children: [new TextRun({ text: 'العربية', bold: true, color: 'FFFFFF', font: 'Calibri', size: 18 })] })],
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: '0D9488' },
                children: [new Paragraph({ children: [new TextRun({ text: 'Contexte / Définition', bold: true, color: 'FFFFFF', font: 'Calibri', size: 18 })] })],
              }),
            ],
          }),
          ...lexique.map(item => new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: item.terme_fr || '', bold: true, font: 'Calibri', size: 18, color: '0F172A' })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: item.terme_ar || '', font: 'Calibri', size: 18, color: '0D9488' })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: item.contexte || '', font: 'Calibri', size: 17, color: '475569' })] })],
              }),
            ],
          })),
        ],
      })
    );
  }

  if (content.schema_simplifie) {
    sections.push(...buildSectionHeading('SCHÉMA SIMPLIFIÉ'));
    sections.push(
      new Paragraph({
        spacing: { before: 20, after: 40 },
        indent: { left: 80 },
        children: [new TextRun({ text: content.schema_simplifie, size: 16, font: 'Courier New', color: '333333' })],
      })
    );
  }

  if (content.illustration_ascii) {
    sections.push(...buildSectionHeading('ILLUSTRATION (ASCII)'));
    sections.push(
      new Paragraph({
        spacing: { before: 20, after: 40 },
        indent: { left: 80 },
        children: [new TextRun({ text: content.illustration_ascii, size: 15, font: 'Courier New', color: '333333' })],
      })
    );
  }

  if (content.points_cles?.length) {
    sections.push(...buildSectionHeading('POINTS CLÉS'));
    sections.push(...buildBulletList(content.points_cles));
  }

  if (content.auto_evaluation?.length) {
    sections.push(...buildSectionHeading('AUTO-ÉVALUATION'));
    for (const ae of content.auto_evaluation) {
      sections.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          indent: { left: 240 },
          children: [
            new TextRun({ text: '[ ]  ', bold: true, size: 18, font: 'Courier New', color: '475569' }),
            new TextRun({ text: ae, size: 18, font: 'Calibri', color: '333333' }),
          ],
        })
      );
    }
  }

  if (content.a_retenir) {
    sections.push(...buildSectionHeading('À RETENIR'));
    sections.push(
      new Paragraph({
        spacing: { before: 20, after: 40 },
        indent: { left: 80 },
        children: [new TextRun({ text: content.a_retenir, bold: true, size: 20, font: 'Calibri', color: 'B45309' })],
      })
    );
  }

  const exos = content.exercices;
  if (exos?.length) {
    sections.push(...buildSectionHeading('EXERCICES'));
    for (const ex of exos) {
      sections.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
          indent: { left: 80 },
          children: [
            new TextRun({ text: `Exercice ${ex.numero || ''}`, bold: true, size: 20, font: 'Calibri', color: '0F172A' }),
            new TextRun({ text: `  [${ex.type || '?'}]`, size: 18, font: 'Calibri', color: 'B45309' }),
          ],
        })
      );
      const e1 = buildFieldParagraph('ÉNONCÉ', ex.enonce || '', '0D9488');
      if (e1) sections.push(e1);
      if (ex.options?.length) {
        sections.push(...buildBulletList(ex.options, 320));
      }
      const e2 = buildFieldParagraph('CORRECTION', ex.correction || '', '0D9488');
      if (e2) sections.push(e2);
      sections.push(
        new Paragraph({
          spacing: { before: 20, after: 20 },
          indent: { left: 80, right: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } },
          children: [new TextRun({ text: '', size: 1 })],
        })
      );
    }
  }

  const doc = new Document({ sections: [{ children: sections }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
