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
  ShadingType,
} from 'docx';
import type { CourseMetadata } from '@/types/generation';
import type { PlanificationContent } from './planificationBuilder';

function sanitizeText(text: string): string {
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
  clean = clean.replace(/\\u[0-9a-fA-F]{4}/g, '');
  clean = clean.replace(/\\n/g, ' ');
  clean = clean.replace(/\\t/g, ' ');
  clean = clean.replace(/\\"/g, '"');
  clean = clean.replace(/[ \t]+/g, ' ');
  return clean.trim();
}

interface TSStep {
  label: string;
  duration?: string;
  action: string;
  parole: string;
  interaction: string;
  indicateurs_reussite?: string;
  interactions_attendues?: string;
  savoir?: string;
}

function isTSBlock(val: unknown): val is {
  ACTION: string;
  PAROLE: string;
  INTERACTION: string;
  duration?: string;
  indicateurs_reussite?: string;
  interactions_attendues?: string;
  savoir?: string;
} {
  return typeof val === 'object' && val !== null && 'ACTION' in val && 'PAROLE' in val && 'INTERACTION' in val;
}

function buildFieldParagraph(label: string, value: string, color: string): Paragraph | null {
  if (!value) return null;
  const clean = sanitizeText(value);
  if (!clean) return null;
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: 240 },
    children: [
      new TextRun({ text: label, bold: true, size: 18, font: 'Calibri', color }),
      new TextRun({ text: `  ${clean}`, size: 18, font: 'Calibri', color: '333333' }),
    ],
  });
}

function buildSavoirParagraph(step: TSStep): Paragraph[] {
  if (!step.savoir) return [];
  const savLines = sanitizeText(step.savoir).split('\n').filter(l => l.trim());
  if (!savLines.length) return [];
  const children: TextRun[] = [];
  const firstLine = savLines[0] || '';
  children.push(new TextRun({ text: 'SAVOIR', bold: true, size: 18, font: 'Calibri', color: '059669' }));
  children.push(new TextRun({ text: `  ${sanitizeText(firstLine)}`, size: 18, font: 'Calibri', color: '333333' }));
  const result: Paragraph[] = [
    new Paragraph({
      spacing: { before: 60, after: 20 },
      indent: { left: 240 },
      children,
    }),
  ];
  for (let i = 1; i < savLines.length; i++) {
    const line = savLines[i];
    if (!line || !line.trim()) continue;
    result.push(
      new Paragraph({
        spacing: { before: 20, after: 20 },
        indent: { left: 530 },
        children: [new TextRun({ text: sanitizeText(line), size: 18, font: 'Calibri', color: '333333' })],
      })
    );
  }
  return result;
}

function buildPhaseSection(phaseName: string, phaseData: Record<string, unknown>): Paragraph[] {
  const elements: Paragraph[] = [];

  const steps: TSStep[] = [];
  for (const [key, val] of Object.entries(phaseData)) {
    if (key === 'outils_didactiques' || key === 'outils_didactiques_materiel') continue;
    if (isTSBlock(val)) {
      steps.push({
        label: key.replace(/_/g, ' '),
        duration: val.duration,
        action: val.ACTION || '',
        parole: val.PAROLE || '',
        interaction: val.INTERACTION || '',
        indicateurs_reussite: val.indicateurs_reussite,
        interactions_attendues: val.interactions_attendues,
        savoir: val.savoir,
      });
    }
  }

  if (steps.length === 0) return elements;

  // H4 — phase heading (navy bar)
  elements.push(
    new Paragraph({
      children: [new TextRun({ text: phaseName.replace(/_/g, ' '), bold: true, size: 22, font: 'Calibri', color: 'FFFFFF' })],
      shading: { type: ShadingType.SOLID, color: '0F172A' },
      spacing: { before: 200, after: 100 },
      indent: { left: 80, right: 80 },
    })
  );

  for (const step of steps) {
    // H6 — step heading
    elements.push(
      new Paragraph({
        children: [new TextRun({ text: step.label, bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
        spacing: { before: 120, after: 40 },
        indent: { left: 80 },
      })
    );

    const durationP = buildFieldParagraph('DURATION', step.duration || '', 'D97706');
    if (durationP) elements.push(durationP);

    const actionP = buildFieldParagraph('ACTION', step.action, '0D9488');
    if (actionP) elements.push(actionP);

    const paroleP = buildFieldParagraph('PAROLE', step.parole, 'B45309');
    if (paroleP) elements.push(paroleP);

    const interactionP = buildFieldParagraph('INTERACTION', step.interaction, '7C3AED');
    if (interactionP) elements.push(interactionP);

    const reussiteP = buildFieldParagraph('RÉUSSITE', step.indicateurs_reussite || '', '10B981');
    if (reussiteP) elements.push(reussiteP);

    const attenduesP = buildFieldParagraph('INTERACTIONS ATTENDUES', step.interactions_attendues || '', '4F46E5');
    if (attenduesP) elements.push(attenduesP);

    elements.push(...buildSavoirParagraph(step));

    // separator
    elements.push(
      new Paragraph({
        spacing: { before: 60, after: 40 },
        indent: { left: 80, right: 80 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        },
        children: [new TextRun({ text: '', size: 1 })],
      })
    );
  }

  return elements;
}

export async function buildPlanificationDocx(
  metadata: CourseMetadata,
  content: PlanificationContent,
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

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      ['Enseignant', '______', 'Niveau', metadata.niveau],
      ['Unité', metadata.unite, 'Séance', metadata.lecon],
      ['Séquence', '______', 'Durée', `${metadata.duree} min`],
    ].map((row) =>
      new TableRow({
        children: row.map((cell, i) =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [new Paragraph({ children: [new TextRun({ text: cell, bold: i % 2 === 0, size: 18, font: 'Calibri' })] })],
          })
        ),
      })
    ),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    },
  });
  sections.push(metaTable);

  // H2 — Déroulement
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'DÉROULEMENT', bold: true, size: 28, font: 'Calibri', color: '0F172A' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 60 },
    })
  );
  sections.push(
    new Paragraph({
      spacing: { after: 100 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '0F172A' },
      },
      children: [new TextRun({ text: '', size: 1 })],
    })
  );

  const der = content.deroulement || {};
  const phases = ['Mise_en_situation', 'Analyse', 'Synthese'];
  for (const phaseName of phases) {
    const phaseData = der[phaseName] as Record<string, unknown> | undefined;
    if (!phaseData || Object.keys(phaseData).length === 0) continue;
    sections.push(...buildPhaseSection(phaseName, phaseData));
  }

  const doc = new Document({
    sections: [{ children: sections }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
