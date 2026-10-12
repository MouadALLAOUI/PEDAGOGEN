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
import type { FicheContent } from './fichePedagogiqueBuilder';

function sanitizeText(text: string): string {
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
  clean = clean.replace(/"\s*:\s*"(?:[^"]*)"/g, '');
  clean = clean.replace(/\{"/g, '');
  clean = clean.replace(/"\}/g, '');
  clean = clean.replace(/\\u[0-9a-fA-F]{4}/g, '');
  clean = clean.replace(/\\n/g, ' ');
  clean = clean.replace(/\\t/g, ' ');
  clean = clean.replace(/\\"/g, '"');
  clean = clean.replace(/[ \t]+/g, ' ');
  return clean.trim();
}

function isDialogueStep(val: unknown): val is { enseignant: string; apprenent: string; savoir?: string } {
  return typeof val === 'object' && val !== null && 'enseignant' in val;
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((i) => typeof i === 'string');
}

function buildDialogueTable(steps: { label: string; enseignant: string; apprenent: string }[]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '0D9488' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Étape', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
      }),
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '0D9488' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Enseignant', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
      }),
      new TableCell({
        width: { size: 40, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: '0D9488' },
        children: [new Paragraph({ children: [new TextRun({ text: 'Apprenant', bold: true, color: 'FFFFFF', size: 18, font: 'Calibri' })] })],
      }),
    ],
  });

  const dataRows = steps.map((step, idx) =>
    new TableRow({
      children: [
        new TableCell({
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F8FAFC' } : undefined,
          children: [new Paragraph({ children: [new TextRun({ text: step.label, bold: true, size: 18, font: 'Calibri' })] })],
        }),
        new TableCell({
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F8FAFC' } : undefined,
          children: step.enseignant.split('\n').filter(l => l.trim()).map(l =>
            new Paragraph({ children: [new TextRun({ text: sanitizeText(l), size: 18, font: 'Calibri' })], spacing: { after: 40 } })
          ),
        }),
        new TableCell({
          shading: idx % 2 === 0 ? { type: ShadingType.SOLID, color: 'F8FAFC' } : undefined,
          children: step.apprenent.split('\n').filter(l => l.trim()).map(l =>
            new Paragraph({ children: [new TextRun({ text: sanitizeText(l), size: 18, font: 'Calibri' })], spacing: { after: 40 } })
          ),
        }),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
    },
  });
}

function buildPhaseSection(phaseName: string, phaseData: Record<string, unknown>): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  // Phase header
  elements.push(
    new Paragraph({
      children: [new TextRun({ text: phaseName.replace(/_/g, ' '), bold: true, size: 22, font: 'Calibri', color: 'FFFFFF' })],
      shading: { type: ShadingType.SOLID, color: '0F172A' },
      spacing: { before: 300, after: 150 },
      indent: { left: 80, right: 80 },
    })
  );

  const steps: { label: string; enseignant: string; apprenent: string }[] = [];
  let tools: string[] = [];

  for (const [key, val] of Object.entries(phaseData)) {
    if (key === 'outils_didactiques' || key === 'outils_didactiques_materiel') {
      if (isStringArray(val)) tools = val;
      continue;
    }
    if (isDialogueStep(val)) {
      steps.push({
        label: key.replace(/_/g, ' '),
        enseignant: val.enseignant || '',
        apprenent: val.apprenent || '',
      });
    }
  }

  if (steps.length > 0) {
    elements.push(buildDialogueTable(steps));
  }

  if (tools.length > 0) {
    elements.push(
      new Paragraph({
        children: [new TextRun({ text: 'Outils didactiques :', bold: true, size: 18, font: 'Calibri' })],
        spacing: { before: 120, after: 60 },
      })
    );
    for (const t of tools) {
      const clean = sanitizeText(t);
      if (!clean) continue;
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${clean}`, size: 18, font: 'Calibri' })],
          spacing: { after: 40 },
          indent: { left: 240 },
        })
      );
    }
  }

  return elements;
}

export async function buildFichePedagogiqueDocx(
  metadata: CourseMetadata,
  content: FicheContent,
  title: string,
): Promise<Buffer> {
  const sections: Paragraph[] = [];

  // Title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 32, font: 'Calibri' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    })
  );

  // Metadata table
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

  sections.push(
    new Paragraph({
      children: [],
      spacing: { after: 100 },
    })
  );

  // Helper for list sections
  function addListSection(label: string, items: string[]) {
    if (!items.length) return;
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: label, bold: true, size: 22, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
      })
    );
    for (const item of items) {
      const clean = sanitizeText(item);
      if (!clean) continue;
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${clean}`, size: 20, font: 'Calibri' })],
          spacing: { after: 60 },
          indent: { left: 240 },
        })
      );
    }
  }

  addListSection('COMPÉTENCES VISÉES', content.competences_visees || []);
  addListSection('OBJECTIFS', content.objectifs || []);
  addListSection('PRÉREQUIS', content.prerequis || []);
  addListSection('SAVOIR-FAIRE', content.savoir_faire || []);
  addListSection('SAVOIR-ÊTRE', content.savoir_etre || []);
  addListSection('LIENS AVEC D\'AUTRES DISCIPLINES', content.liens_avec_autres_disciplines || []);
  addListSection('MODALITÉS D\'ÉVALUATION FORMATIVE', content.modalités_évaluation_formative || []);

  if (content.préparation_antérieure) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: 'PRÉPARATION ANTÉRIEURE', bold: true, size: 22, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
      })
    );
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: content.préparation_antérieure, size: 20, font: 'Calibri' })],
        spacing: { after: 60 },
        indent: { left: 240 },
      })
    );
  }

  // Note: timing_consistency_check is used for verification and omitted from the printed document sections


  // Déroulement
  const deroulement = content.deroulement;
  if (deroulement && typeof deroulement === 'object') {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: 'DÉROULEMENT', bold: true, size: 26, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 },
      })
    );

    const phaseOrder = ['Mise_en_situation', 'Analyse', 'Synthese'];
    const phaseLabels: Record<string, string> = {
      Mise_en_situation: 'PHASE 1 — MISE EN SITUATION',
      Analyse: 'PHASE 2 — ANALYSE',
      Synthese: 'PHASE 3 — SYNTHÈSE',
    };

    for (const phaseKey of phaseOrder) {
      const phaseData = deroulement[phaseKey];
      if (phaseData && typeof phaseData === 'object') {
        const elements = buildPhaseSection(phaseLabels[phaseKey] || phaseKey, phaseData as Record<string, unknown>);
        for (const el of elements) {
          sections.push(el as Paragraph);
        }
      }
    }
  }

  // Add metadata table at the beginning (after title, before content)
  // We need to insert it, so we rebuild with table
  const allChildren: (Paragraph | Table)[] = [];
  allChildren.push(sections[0]!); // title
  allChildren.push(metaTable);
  allChildren.push(new Paragraph({ children: [], spacing: { after: 100 } }));
  for (let i = 1; i < sections.length; i++) {
    allChildren.push(sections[i]!);
  }

  const doc = new Document({
    sections: [{ children: allChildren }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer as Buffer;
}
