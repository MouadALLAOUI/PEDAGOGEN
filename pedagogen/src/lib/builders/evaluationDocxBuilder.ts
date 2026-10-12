import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType,
} from 'docx';
import type { CourseMetadata } from '@/types/generation';
import type { EvaluationContent, EvaluationQuestion } from './evaluationBuilder';
import { createDocxMinisterialHeader, type MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

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

function buildSectionHeading(text: string, subtitle?: string): Paragraph[] {
  const res: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 24, font: 'Calibri', color: '0F172A' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 280, after: 40 },
    }),
  ];
  if (subtitle) {
    res.push(
      new Paragraph({
        children: [new TextRun({ text: subtitle, italics: true, size: 18, font: 'Calibri', color: '64748B' })],
        spacing: { after: 60 },
      })
    );
  }
  res.push(
    new Paragraph({
      spacing: { after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '0F172A' } },
      children: [new TextRun({ text: '', size: 1 })],
    })
  );
  return res;
}

function buildBulletList(items: string[], indent: number = 240): Paragraph[] {
  return items.filter(Boolean).map(item => new Paragraph({
    spacing: { before: 20, after: 20 },
    indent: { left: indent },
    children: [new TextRun({ text: `• ${item}`, size: 18, font: 'Calibri', color: '333333' })],
  }));
}

function buildQuestionParagraphs(q: EvaluationQuestion, index: number): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const qNum = q.numero || index + 1;

  paragraphs.push(
    new Paragraph({
      spacing: { before: 60, after: 30 },
      shading: { type: ShadingType.CLEAR, fill: 'F0FDFA' },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '14B8A6' },
      },
      children: [
        new TextRun({ text: `Question ${qNum}`, bold: true, size: 20, font: 'Calibri', color: '0D9488' }),
        ...(q.type ? [new TextRun({ text: `  (${q.type})`, size: 16, font: 'Calibri', color: '64748B' })] : []),
        ...(q.niveau_bloom ? [new TextRun({ text: `  [${q.niveau_bloom}]`, size: 16, font: 'Calibri', color: 'B45309' })] : []),
        ...(q.points !== undefined ? [new TextRun({ text: `  —  ${q.points} pt${q.points > 1 ? 's' : ''}`, bold: true, size: 18, font: 'Calibri', color: '0F172A' })] : []),
      ],
    })
  );

  if (q.competence_evaluee) {
    const pComp = buildFieldParagraph('COMPÉTENCE', q.competence_evaluee, '0D9488', 240);
    if (pComp) paragraphs.push(pComp);
  }

  paragraphs.push(
    new Paragraph({
      spacing: { before: 30, after: 40 },
      indent: { left: 240 },
      children: [
        new TextRun({ text: q.enonce || '', size: 19, font: 'Calibri', color: '1E293B' }),
      ],
    })
  );

  if (q.options?.length) {
    paragraphs.push(
      new Paragraph({
        spacing: { before: 20, after: 20 },
        indent: { left: 240 },
        children: [new TextRun({ text: 'Options au choix :', bold: true, size: 17, font: 'Calibri', color: '7C3AED' })],
      })
    );
    paragraphs.push(...buildBulletList(q.options, 360));
  }

  // Zone de réponse pour l'élève (lignes d'écriture)
  paragraphs.push(
    new Paragraph({
      spacing: { before: 40, after: 80 },
      indent: { left: 240 },
      children: [
        new TextRun({
          text: 'Réponse : .....................................................................................................................................................................',
          size: 16,
          font: 'Calibri',
          color: '94A3B8',
        }),
      ],
    })
  );

  return paragraphs;
}

export async function buildEvaluationDocx(
  metadata: CourseMetadata,
  content: EvaluationContent,
  title: string,
  headerInfo?: MinisterialHeaderInfo,
): Promise<Buffer> {
  const sections: (Paragraph | Table)[] = [];

  // 1. Official MEN Ministerial Header
  sections.push(createDocxMinisterialHeader(headerInfo, metadata));

  // 2. Document Title Banner
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 28, font: 'Calibri', color: '0F172A' })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 150 },
    })
  );

  // 3. Cartouche officiel Élève & Examen (3 lignes standard MEN)
  sections.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      [
        'Nom & Prénom : ................................................................',
        `Niveau : ${metadata.niveau}`,
        'Note Finale : ........ / 20',
      ],
      [
        `Matière : ${metadata.matiere}`,
        `Unité : ${metadata.unite || '—'}`,
        `Durée : ${content.duree || `${metadata.duree} min`}`,
      ],
      [
        `Leçon / Thème : ${metadata.lecon}`,
        `Semestre : S${metadata.semestre || 1}`,
        'Appréciation : ................................',
      ],
    ].map(row => new TableRow({
      children: row.map((cellText, idx) => new TableCell({
        width: { size: idx === 0 ? 45 : idx === 1 ? 30 : 25, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: cellText, size: 17, font: 'Calibri', color: '1E293B', bold: cellText.includes('Note') })],
          spacing: { before: 40, after: 40 },
        })],
      })),
    })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    },
  }));

  if (content.consigne_generale) {
    sections.push(
      new Paragraph({
        spacing: { before: 140, after: 100 },
        children: [
          new TextRun({ text: 'Consignes Générales : ', bold: true, size: 18, font: 'Calibri', color: 'B45309' }),
          new TextRun({ text: content.consigne_generale, size: 18, font: 'Calibri', color: '475569' }),
        ],
      })
    );
  }

  // 4. PARTIE 1 : RESTITUTION DES CONNAISSANCES (6 à 8 pts)
  const part1 = content.partie_restitution;
  if (part1 && part1.questions && part1.questions.length > 0) {
    const part1Title = part1.titre || 'PREMIÈRE PARTIE : RESTITUTION DES CONNAISSANCES (استرداد المعارف)';
    const part1Pts = part1.points_total ? ` (${part1.points_total} Points)` : ' (8 Points)';
    sections.push(...buildSectionHeading(`${part1Title}${part1Pts}`, part1.consigne));

    part1.questions.forEach((q, idx) => {
      sections.push(...buildQuestionParagraphs(q, idx));
    });
  }

  // 5. PARTIE 2 : RAISONNEMENT SCIENTIFIQUE ET RÉSOLUTION DE PROBLÈME (12 à 14 pts)
  const part2 = content.partie_raisonnement_apc;
  if (part2 && part2.questions && part2.questions.length > 0) {
    const part2Title = part2.titre || 'DEUXIÈME PARTIE : RAISONNEMENT SCIENTIFIQUE & RÉSOLUTION DE PROBLÈME (APC)';
    const part2Pts = part2.points_total ? ` (${part2.points_total} Points)` : ' (12 Points)';
    sections.push(...buildSectionHeading(`${part2Title}${part2Pts}`));

    if (part2.situation_probleme) {
      sections.push(
        new Paragraph({
          spacing: { before: 40, after: 60 },
          shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
          border: {
            left: { style: BorderStyle.SINGLE, size: 12, color: '0D9488' },
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
          },
          indent: { left: 180 },
          children: [
            new TextRun({ text: 'Situation-Problème / Contexte didactique :', bold: true, size: 18, font: 'Calibri', color: '0D9488' }),
            new TextRun({ text: `\n${part2.situation_probleme}`, size: 18, font: 'Calibri', color: '1E293B' }),
          ],
        })
      );
    }

    if (part2.documents_supports?.length) {
      sections.push(
        new Paragraph({
          spacing: { before: 30, after: 20 },
          children: [new TextRun({ text: 'Documents de Support :', bold: true, size: 17, font: 'Calibri', color: '475569' })],
        })
      );
      sections.push(...buildBulletList(part2.documents_supports, 360));
    }

    part2.questions.forEach((q, idx) => {
      sections.push(...buildQuestionParagraphs(q, idx));
    });
  }

  // 6. Rétrocompatibilité : Questions plates si partie_restitution absente
  if ((!part1 || !part1.questions?.length) && (!part2 || !part2.questions?.length)) {
    const questions = content.questions || [];
    if (questions.length > 0) {
      sections.push(...buildSectionHeading(`QUESTIONS D'ÉVALUATION (${questions.length})`));
      questions.forEach((q, idx) => {
        sections.push(...buildQuestionParagraphs(q, idx));
      });
    }
  }

  // 7. ÉLÉMENTS DE RÉPONSE ET CORRIGÉ TYPE (Réservé à l'enseignant)
  const elements = content.elements_reponse;
  if (elements && elements.length > 0) {
    sections.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    sections.push(...buildSectionHeading('CORRIGÉ TYPE & ÉLÉMENTS DE RÉPONSE (عناصر الإجابة وسلم التنقيط)'));

    sections.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0F172A' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Question', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0F172A' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Réponse Modèle Attendue', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0F172A' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Barème', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0F172A' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Tolérance', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
          ],
        }),
        ...elements.map((el) => new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: el.question_ref || '—', bold: true, size: 17, font: 'Calibri', color: '0D9488' })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: el.reponse_modele || '—', size: 17, font: 'Calibri', color: '1E293B' })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: el.bareme_detaille || '—', size: 17, font: 'Calibri', color: 'B45309', bold: true })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: el.criteres_acceptation || 'Réponse équivalente admise', size: 16, font: 'Calibri', color: '64748B' })] })],
            }),
          ],
        })),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      },
    }));
  }

  // 8. GRILLE CRITÉRIÉE APC OFFICIELLE (C1, C2, C3, CP)
  const grilleApc = content.grille_criteriee_apc;
  if (grilleApc && grilleApc.length > 0) {
    sections.push(...buildSectionHeading("GRILLE CRITÉRIÉE D'ÉVALUATION PAR COMPÉTENCES (APC / شبكة التقويم)"));

    sections.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0D9488' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Critère APC', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0D9488' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Indicateurs de Performance', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 12, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0D9488' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Barème', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: '0D9488' },
              children: [new Paragraph({ children: [new TextRun({ text: 'Niveaux de Maîtrise (+ / +/- / -)', bold: true, color: 'FFFFFF', size: 17, font: 'Calibri' })] })],
            }),
          ],
        }),
        ...grilleApc.map((g) => new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: g.critere_nom || g.critere_code || '', bold: true, size: 17, font: 'Calibri', color: '0F172A' }),
                    ...(g.description ? [new TextRun({ text: `\n${g.description}`, size: 15, font: 'Calibri', color: '64748B' })] : []),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: (g.indicateurs || []).map(ind => new Paragraph({
                children: [new TextRun({ text: `• ${ind}`, size: 16, font: 'Calibri', color: '1E293B' })],
                spacing: { before: 10, after: 10 },
              })),
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: `${g.points_max || 0} pts`, bold: true, size: 17, font: 'Calibri', color: '0D9488' })] })],
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: `[+] Max: ${g.niveaux_maitrise?.maitrise_maximale || 'Maîtrise totale'}`, size: 15, font: 'Calibri', color: '15803D' })] }),
                new Paragraph({ children: [new TextRun({ text: `[±] Min: ${g.niveaux_maitrise?.maitrise_minimale || 'Maîtrise partielle'}`, size: 15, font: 'Calibri', color: 'D97706' })] }),
                new Paragraph({ children: [new TextRun({ text: `[-] Non: ${g.niveaux_maitrise?.non_maitrise || 'Lacunes majeures'}`, size: 15, font: 'Calibri', color: 'DC2626' })] }),
              ],
            }),
          ],
        })),
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'CBD5E1' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      },
    }));
  }

  const doc = new Document({ sections: [{ children: sections }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
