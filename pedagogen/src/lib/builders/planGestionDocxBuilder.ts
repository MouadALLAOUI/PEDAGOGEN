import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType,
} from 'docx';
import type { CourseMetadata } from '@/types/generation';
import type { PlanGestionContent } from './planGestionBuilder';

function sanitizeText(text: string): string {
  let clean = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFFFD]/g, '');
  clean = clean.replace(/\\u[0-9a-fA-F]{4}/g, '');
  clean = clean.replace(/\\n/g, ' ');
  clean = clean.replace(/\\t/g, ' ');
  clean = clean.replace(/\\"/g, '"');
  clean = clean.replace(/[ \t]+/g, ' ');
  clean = clean.replace(/\n{3,}/g, '\n\n');
  return clean.trim();
}

function buildFieldParagraph(label: string, value: string, color: string, indent: number = 240): Paragraph | null {
  if (!value) return null;
  const cleanValue = sanitizeText(value);
  if (!cleanValue) return null;
  return new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: indent },
    children: [
      new TextRun({ text: label, bold: true, size: 18, font: 'Calibri', color }),
      new TextRun({ text: `  ${cleanValue}`, size: 18, font: 'Calibri', color: '333333' }),
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
    children: [new TextRun({ text: `• ${sanitizeText(item)}`, size: 18, font: 'Calibri', color: '333333' })],
  }));
}

export async function buildPlanGestionDocx(
  metadata: CourseMetadata,
  content: PlanGestionContent,
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

  if (content.titre_seance) {
    sections.push(
      new Paragraph({
        spacing: { before: 100, after: 80 },
        indent: { left: 80 },
        children: [new TextRun({ text: `Titre: ${content.titre_seance}`, bold: true, size: 22, font: 'Calibri', color: '0F172A' })],
      })
    );
  }

  const se = content.strategie_entree;
  if (se) {
    sections.push(...buildSectionHeading("STRATÉGIE D'ENTRÉE"));
    const fields = [
      ['ACCUEIL', se.accueil || '', '0D9488'],
      ['MISE EN ROUTE', se.mise_en_route || '', 'B45309'],
      ['CAPTATION', se.captation_attention || '', '7C3AED'],
    ] as [string, string, string][];
    for (const [label, value, color] of fields) {
      const p = buildFieldParagraph(label, value, color);
      if (p) sections.push(p);
    }
  }

  if (content.gestion_retard || content.gestion_fin_de_seance || content.alternatives_sans_materiel) {
    sections.push(...buildSectionHeading("FONCTIONNEMENT DE LA CLASSE"));
    const fields = [
      ['GESTION RETARD', content.gestion_retard || '', '0D9488'],
      ['FIN DE SÉANCE', content.gestion_fin_de_seance || '', 'B45309'],
      ['SANS MATÉRIEL', content.alternatives_sans_materiel || '', '7C3AED'],
    ] as [string, string, string][];
    for (const [label, value, color] of fields) {
      const p = buildFieldParagraph(label, value, color);
      if (p) sections.push(p);
    }
  }

  const oe = content.organisation_espace;
  if (oe) {
    sections.push(...buildSectionHeading("ORGANISATION DE L'ESPACE"));
    const p1 = buildFieldParagraph('DISPOSITION', oe.disposition_tables || '', '0D9488');
    if (p1) sections.push(p1);
    if (oe.zones_activite?.length) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Zones d'activité", bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 60, after: 40 },
          indent: { left: 80 },
        })
      );
      sections.push(...buildBulletList(oe.zones_activite));
    }
    const p3 = buildFieldParagraph('MATÉRIEL', oe.acces_materiel || '', '7C3AED');
    if (p3) sections.push(p3);
  }

  const gt = content.gestion_temps;
  if (gt) {
    sections.push(...buildSectionHeading('GESTION DU TEMPS'));
    const fields = [
      ['MISE EN SITUATION', gt.Mise_en_situation || '', '0D9488'],
      ['ANALYSE', gt.Analyse || '', 'B45309'],
      ['SYNTHÈSE', gt.Synthese || '', '7C3AED'],
      ['MARGE', gt.marge_imprevus || '', '0D9488'],
      ['TRANSITION', gt.signaux_transition || '', 'B45309'],
    ] as [string, string, string][];
    for (const [label, value, color] of fields) {
      const p = buildFieldParagraph(label, value, color);
      if (p) sections.push(p);
    }
  }

  const gc = content.gestion_comportement;
  if (gc) {
    sections.push(...buildSectionHeading('GESTION DU COMPORTEMENT'));
    if (gc.regles_rappelees?.length) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Règles rappelées', bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 60, after: 40 },
          indent: { left: 80 },
        })
      );
      sections.push(...buildBulletList(gc.regles_rappelees));
    }
    const p1 = buildFieldParagraph('BAVARDAGES', gc.gestion_bavardages || '', 'B45309');
    if (p1) sections.push(p1);
    const p2 = buildFieldParagraph('ÉLÈVE BLOQUÉ', gc['gestion_eleve_bloqué'] || '', '7C3AED');
    if (p2) sections.push(p2);
  }

  const df = content.differenciation;
  if (df) {
    sections.push(...buildSectionHeading('DIFFÉRENCIATION'));
    const p1 = buildFieldParagraph('RAPIDES', df.eleves_rapides || '', '0D9488');
    if (p1) sections.push(p1);
    const p2 = buildFieldParagraph('DIFFICULTÉ', df.eleves_en_difficulte || '', 'B45309');
    if (p2) sections.push(p2);
  }

  const rm = (content as any).remédiation || (content as any).remediation;
  if (rm) {
    sections.push(...buildSectionHeading('REMÉDIATION'));
    if (rm.erreurs_frequentes_prevues?.length) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Erreurs fréquentes prévues', bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 60, after: 40 },
          indent: { left: 80 },
        })
      );
      sections.push(...buildBulletList(rm.erreurs_frequentes_prevues));
    }
    const priorisation = rm.priorisation_erreurs_frequentes || rm.priorisation_erreurs;
    if (priorisation?.length) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: 'Erreurs prioritaires et remédiations', bold: true, size: 20, font: 'Calibri', color: '1E293B' })],
          spacing: { before: 60, after: 40 },
          indent: { left: 80 },
        })
      );
      for (const item of priorisation) {
        const text = `Erreur: ${item.erreur || ''} -> Remédiation: ${item.remediation_ciblee || ''}`;
        const pCrit = buildFieldParagraph('CRITIQUE', text, 'B45309');
        if (pCrit) sections.push(pCrit);
      }
    }
    const p = buildFieldParagraph('CORRECTION', rm.strategie_correction || '', '0D9488');
    if (p) sections.push(p);
  }

  const doc = new Document({ sections: [{ children: sections }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
