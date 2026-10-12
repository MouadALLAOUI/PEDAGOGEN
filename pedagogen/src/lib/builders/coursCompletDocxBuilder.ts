import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx';
import type { CourseMetadata } from '@/types/generation';
import { normalizeCoursComplet, type CoursCompletContent } from './coursCompletBuilder';

function sanitizeText(text: string): string {
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
  clean = clean.replace(/\\u[0-9a-fA-F]{4}/g, '');
  clean = clean.replace(/\\n/g, ' ');
  clean = clean.replace(/\\t/g, ' ');
  clean = clean.replace(/\\"/g, '"');
  clean = clean.replace(/[ \t]+/g, ' ');
  return clean.trim();
}

function buildFieldParagraph(label: string, value: string, color: string, indent: number = 240): Paragraph | null {
  if (!value) return null;
  const clean = sanitizeText(value);
  if (!clean) return null;
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: indent },
    children: [
      new TextRun({ text: label, bold: true, size: 18, font: 'Calibri', color }),
      new TextRun({ text: `  ${clean}`, size: 18, font: 'Calibri', color: '333333' }),
    ],
  });
}

function buildPhaseBar(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, font: 'Calibri', color: 'FFFFFF' })],
    shading: { type: ShadingType.SOLID, color: '0F172A' },
    spacing: { before: 200, after: 100 },
    indent: { left: 80, right: 80 },
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

export async function buildCoursCompletDocx(
  metadata: CourseMetadata,
  content: CoursCompletContent,
  title: string,
): Promise<Buffer> {
  const data = normalizeCoursComplet(content, metadata.lecon);
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

  const se = data.script_enseignant;
  const hasScriptContent = se && (
    se.Mise_en_situation?.rappel || se.Mise_en_situation?.situation_probleme ||
    se.Analyse?.Analyse_SP || se.Analyse?.Investigation || se.Analyse?.Generalisation || se.Analyse?.ENTRAINEMENT ||
    se.Synthese?.Quiz
  );

  if (hasScriptContent && se) {
    sections.push(...buildSectionHeading('SCRIPT ENSEIGNANT'));

    if (se.Mise_en_situation?.rappel || se.Mise_en_situation?.situation_probleme) {
      sections.push(buildPhaseBar('1. MISE EN SITUATION'));
      const p1 = buildFieldParagraph('RAPPEL', se.Mise_en_situation.rappel || '', '0D9488');
      if (p1) sections.push(p1);
      const p2 = buildFieldParagraph('SITUATION', se.Mise_en_situation.situation_probleme || '', 'B45309');
      if (p2) sections.push(p2);
    }
    if (se.Analyse?.Analyse_SP || se.Analyse?.Investigation || se.Analyse?.Generalisation || se.Analyse?.ENTRAINEMENT) {
      sections.push(buildPhaseBar('2. ANALYSE'));
      const fields = [
        ['ANALYSE SP', se.Analyse.Analyse_SP || '', '0D9488'],
        ['INVESTIGATION', se.Analyse.Investigation || '', 'B45309'],
        ['GÉNÉRALISATION', se.Analyse.Generalisation || '', '7C3AED'],
        ['ENTRAÎNEMENT', se.Analyse.ENTRAINEMENT || '', '0D9488'],
      ] as [string, string, string][];
      for (const [label, value, color] of fields) {
        const p = buildFieldParagraph(label, value, color);
        if (p) sections.push(p);
      }
    }
    if (se.Synthese?.Quiz) {
      sections.push(buildPhaseBar('3. SYNTHÈSE'));
      const p = buildFieldParagraph('QUIZ', se.Synthese.Quiz || '', '0D9488');
      if (p) sections.push(p);
    }
  }

  // Fallback for raw text / markdown content
  if (data.contenu_brut && !hasScriptContent) {
    sections.push(...buildSectionHeading('CONTENU DU COURS'));
    const paras = data.contenu_brut.split('\n\n');
    for (const p of paras) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      sections.push(new Paragraph({
        spacing: { before: 40, after: 40 },
        indent: { left: 80 },
        children: [new TextRun({ text: sanitizeText(trimmed), size: 18, font: 'Calibri', color: '333333' })],
      }));
    }
  }

  if (data.variantes_pedagogiques || data.gestion_erreurs_frequentes || data.conseils_surlignage) {
    sections.push(...buildSectionHeading('VARIATION & ACCOMPAGNEMENT'));
    const fields = [
      ['VARIANTES PÉDAGOGIQUES', data.variantes_pedagogiques || '', '0D9488'],
      ['GESTION ERREURS', data.gestion_erreurs_frequentes || '', 'B45309'],
      ['CONSEILS SURLIGNAGE', data.conseils_surlignage || '', '7C3AED'],
    ] as [string, string, string][];
    for (const [label, value, color] of fields) {
      const p = buildFieldParagraph(label, value, color);
      if (p) sections.push(p);
    }
  }

  const sv = data.savoir;
  const hasSavoirContent = sv && (
    (sv.definitions && sv.definitions.length > 0) || sv.schema_reseau || (sv.exemples_concrets && sv.exemples_concrets.length > 0)
  );
  if (hasSavoirContent && sv) {
    sections.push(...buildSectionHeading('SAVOIR'));

    if (sv.definitions?.length) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Définitions', bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 100, after: 60 },
          indent: { left: 80 },
        })
      );
      for (const def of sv.definitions) {
        const terme = sanitizeText(def.terme || '');
        const definition = sanitizeText(def.definition || '');
        if (!terme && !definition) continue;
        sections.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            indent: { left: 240 },
            children: [
              new TextRun({ text: terme || '', bold: true, size: 18, font: 'Calibri', color: '0D9488' }),
              new TextRun({ text: `  ${definition || ''}`, size: 18, font: 'Calibri', color: '333333' }),
            ],
          })
        );
      }
    }

    const schP = buildFieldParagraph('SCHÉMA', sv.schema_reseau || '', '0D9488');
    if (schP) sections.push(schP);

    if (sv.exemples_concrets?.length) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Exemples concrets', bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 100, after: 60 },
          indent: { left: 80 },
        })
      );
      for (const ex of sv.exemples_concrets) {
        const clean = sanitizeText(ex);
        if (!clean) continue;
        sections.push(
          new Paragraph({
            spacing: { before: 20, after: 20 },
            indent: { left: 240 },
            children: [new TextRun({ text: `• ${clean}`, size: 18, font: 'Calibri', color: '333333' })],
          })
        );
      }
    }
  }

  const pt = data.plan_tableau;
  const hasPlanContent = pt && (pt.zone_titre || pt.zone_probleme || pt.zone_cours || pt.zone_exercices);
  if (hasPlanContent && pt) {
    sections.push(...buildSectionHeading('PLAN DU TABLEAU'));
    const fields = [
      ['TITRE', pt.zone_titre || '', '0D9488'],
      ['PROBLÈME', pt.zone_probleme || '', 'B45309'],
      ['COURS', pt.zone_cours || '', '7C3AED'],
      ['EXERCICES', pt.zone_exercices || '', '0D9488'],
    ] as [string, string, string][];
    for (const [label, value, color] of fields) {
      const p = buildFieldParagraph(label, value, color);
      if (p) sections.push(p);
    }
  }

  const acts = data.activites_eleves;
  if (acts?.length) {
    sections.push(...buildSectionHeading('ACTIVITÉS ÉLÈVES'));
    for (const a of acts) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: a.etape || '', bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 100, after: 40 },
          indent: { left: 80 },
        })
      );
      const c1 = buildFieldParagraph('CONSIGNE', a.consigne || '', '0D9488');
      if (c1) sections.push(c1);
      const c2 = buildFieldParagraph('PRODUCTION', a.production_attendue || '', 'B45309');
      if (c2) sections.push(c2);
      sections.push(
        new Paragraph({
          spacing: { before: 40, after: 40 },
          indent: { left: 80, right: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' } },
          children: [new TextRun({ text: '', size: 1 })],
        })
      );
    }
  }

  if (data.annotations) {
    sections.push(...buildSectionHeading('ANNOTATIONS'));
    sections.push(
      new Paragraph({
        spacing: { before: 40, after: 40 },
        indent: { left: 80 },
        children: [new TextRun({ text: sanitizeText(data.annotations), size: 18, font: 'Calibri', color: '333333' })],
      })
    );
  }

  const doc = new Document({ sections: [{ children: sections }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
