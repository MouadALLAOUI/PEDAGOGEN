import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';
import type { WatermarkInfo } from './pdfBuilder';
import { drawPdfMinisterialHeader, type MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

export interface EvaluationQuestion {
  numero?: number;
  type?: string;
  competence_evaluee?: string;
  niveau_bloom?: string;
  enonce?: string;
  options?: string[];
  points?: number;
  correction?: string;
  feedback_personnalise?: string;
}

export interface EvaluationPartieRestitution {
  titre?: string;
  points_total?: number;
  consigne?: string;
  questions?: EvaluationQuestion[];
}

export interface EvaluationPartieRaisonnementAPC {
  titre?: string;
  points_total?: number;
  situation_probleme?: string;
  documents_supports?: string[];
  questions?: EvaluationQuestion[];
}

export interface EvaluationElementReponse {
  question_ref?: string;
  reponse_modele?: string;
  bareme_detaille?: string;
  criteres_acceptation?: string;
}

export interface EvaluationGrilleCriterieeAPCItem {
  critere_code?: string;
  critere_nom?: string;
  description?: string;
  indicateurs?: string[];
  points_max?: number;
  niveaux_maitrise?: {
    maitrise_maximale?: string;
    maitrise_minimale?: string;
    non_maitrise?: string;
  };
}

export interface EvaluationContent {
  titre?: string;
  niveau?: string;
  duree?: string;
  evaluation_automatique?: boolean;
  consigne_generale?: string;
  partie_restitution?: EvaluationPartieRestitution;
  partie_raisonnement_apc?: EvaluationPartieRaisonnementAPC;
  questions?: EvaluationQuestion[];
  elements_reponse?: EvaluationElementReponse[];
  bareme?: {
    total_points?: number;
    repartition_par_competence?: Array<{ competence?: string; points?: number }>;
    criteres?: string[];
  };
  grille_criteriee_apc?: EvaluationGrilleCriterieeAPCItem[];
  grille_evaluation?: Array<{
    critere?: string;
    indicateurs?: string[];
    points_max?: number;
  }>;
}

function drawField(
  doc: jsPDF, label: string, value: string,
  x: number, y: number, contentW: number,
  color: [number, number, number], lineH: number,
): number {
  if (!value) return y;
  if (y > 268) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(label, x, y);
  const labelW = doc.getTextWidth(label);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  const lines = doc.splitTextToSize(value, contentW - labelW - 2);
  const startX = x + labelW + 2;
  for (const line of lines) {
    if (y > 268) { doc.addPage(); y = 20; }
    doc.text(line, startX, y);
    y += lineH;
  }
  return y + 1;
}

function drawSectionHeading(doc: jsPDF, title: string, margin: number, pageWidth: number, y: number): number {
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, margin, y);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  return y + 7;
}

function drawQuestionPdf(
  doc: jsPDF, q: EvaluationQuestion, index: number,
  margin: number, contentW: number, innerX: number, fieldW: number, lineH: number, y: number
): number {
  if (y > 255) { doc.addPage(); y = 20; }
  const qNum = q.numero || index + 1;

  doc.setDrawColor(200);
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(margin, y - 3.5, contentW, 7, 1.5, 1.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(`Question ${qNum}`, innerX, y + 1);

  if (q.type) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`(${q.type})`, innerX + doc.getTextWidth(`Question ${qNum} `) + 2, y + 1);
  }

  if (q.niveau_bloom) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(180, 83, 9);
    doc.text(`[${q.niveau_bloom}]`, innerX + 45, y + 1);
  }

  if (q.points !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${q.points} pt${q.points > 1 ? 's' : ''}`, margin + contentW - 15, y + 1);
  }
  y += 7;

  if (q.competence_evaluee) {
    y = drawField(doc, 'COMPÉTENCE : ', q.competence_evaluee, innerX, y, fieldW, [13, 148, 136], lineH);
  }

  if (q.enonce) {
    if (y > 268) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30);
    const elines = doc.splitTextToSize(q.enonce, fieldW);
    for (const line of elines) {
      if (y > 268) { doc.addPage(); y = 20; }
      doc.text(line, innerX, y);
      y += lineH + 0.5;
    }
    y += 1;
  }

  if (q.options?.length) {
    for (const opt of q.options) {
      if (y > 268) { doc.addPage(); y = 20; }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70);
      doc.text(`   [  ]  ${opt}`, innerX + 2, y);
      y += lineH + 0.5;
    }
  }

  // Zone d'écriture pour l'élève
  if (y > 265) { doc.addPage(); y = 20; }
  doc.setDrawColor(200);
  doc.setLineDashPattern([1, 2], 0);
  doc.line(innerX, y + 3, innerX + fieldW - 5, y + 3);
  doc.setLineDashPattern([], 0);
  y += 7;

  return y;
}

export function buildEvaluationPdf(
  metadata: CourseMetadata,
  content: EvaluationContent,
  title: string,
  watermark?: WatermarkInfo,
  headerInfo?: MinisterialHeaderInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageWidth - 2 * margin;
  const innerX = margin + 3;
  const fieldW = contentW - 6;
  const lineH = 3.5;

  function drawWatermarkOnPage() {
    if (!watermark || (!watermark.fullName && !watermark.etablissement)) return;
    const wmText = `${watermark.etablissement} | ${watermark.fullName} | ${new Date().toLocaleDateString('fr-FR')}`;
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.08 }));
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120);
    doc.text(wmText, pageWidth / 2, doc.internal.pageSize.getHeight() / 2, { angle: 45, align: 'center' });
    doc.restoreGraphicsState();
  }
  doc.internal.events.subscribe('addPage', drawWatermarkOnPage);
  drawWatermarkOnPage();

  // 1. En-tête officiel ministériel 3 colonnes
  let y = drawPdfMinisterialHeader(doc, headerInfo, metadata, 10);

  // 2. Titre de l'Évaluation
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title.toUpperCase(), pageWidth / 2, y + 4, { align: 'center' });
  y += 9;

  // 3. Cartouche officiel Élève & Examen (Note sur 20)
  const cartTop = y;
  const cartHeight = 16;
  doc.setDrawColor(200);
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, cartTop, contentW, cartHeight);

  // Ligne 1 : Nom et Note
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.text('Nom & Prénom : ................................................................', margin + 3, cartTop + 5);
  doc.text(`Niveau : ${metadata.niveau}`, margin + 95, cartTop + 5);

  doc.setFillColor(240, 253, 250);
  doc.rect(margin + 135, cartTop + 1, 45, cartHeight - 2, 'F');
  doc.setTextColor(13, 148, 136);
  doc.setFontSize(8.5);
  doc.text('Note : ......... / 20', margin + 142, cartTop + 9);

  // Ligne 2 : Matière & Durée
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70);
  doc.text(`Matière : ${metadata.matiere}   |   Unité : ${metadata.unite || '—'}   |   Leçon : ${metadata.lecon}`, margin + 3, cartTop + 11);
  doc.text(`Durée : ${content.duree || `${metadata.duree} min`}   |   Semestre : S${metadata.semestre || 1}`, margin + 3, cartTop + 14.5);

  y = cartTop + cartHeight + 6;

  if (content.consigne_generale) {
    y = drawField(doc, 'Consignes : ', content.consigne_generale, innerX, y, fieldW, [180, 83, 9], lineH);
    y += 2;
  }

  // 4. PARTIE 1 : RESTITUTION DES CONNAISSANCES (6 à 8 pts)
  const part1 = content.partie_restitution;
  if (part1 && part1.questions && part1.questions.length > 0) {
    const p1Title = part1.titre || 'PREMIÈRE PARTIE : RESTITUTION DES CONNAISSANCES (استرداد المعارف)';
    const p1Pts = part1.points_total ? ` (${part1.points_total} Points)` : ' (8 Points)';
    y = drawSectionHeading(doc, `${p1Title}${p1Pts}`, margin, pageWidth, y);

    if (part1.consigne) {
      y = drawField(doc, 'Consigne : ', part1.consigne, innerX, y, fieldW, [100, 116, 139], lineH);
    }

    part1.questions.forEach((q, idx) => {
      y = drawQuestionPdf(doc, q, idx, margin, contentW, innerX, fieldW, lineH, y);
    });
  }

  // 5. PARTIE 2 : RAISONNEMENT SCIENTIFIQUE ET RÉSOLUTION DE PROBLÈME (12 à 14 pts)
  const part2 = content.partie_raisonnement_apc;
  if (part2 && part2.questions && part2.questions.length > 0) {
    const p2Title = part2.titre || 'DEUXIÈME PARTIE : RAISONNEMENT SCIENTIFIQUE & PROBLÈME APC (الاستدلال العلمي)';
    const p2Pts = part2.points_total ? ` (${part2.points_total} Points)` : ' (12 Points)';
    y = drawSectionHeading(doc, `${p2Title}${p2Pts}`, margin, pageWidth, y);

    if (part2.situation_probleme) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setDrawColor(13, 148, 136);
      doc.setFillColor(248, 250, 252);
      const splines = doc.splitTextToSize(part2.situation_probleme, fieldW - 6);
      const spHeight = splines.length * lineH + 6;
      doc.roundedRect(margin, y - 2, contentW, spHeight, 1.5, 1.5, 'F');
      doc.line(margin, y - 2, margin, y - 2 + spHeight);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 148, 136);
      doc.text('Situation-Problème contextualisée :', innerX, y + 2);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30);
      for (const line of splines) {
        doc.text(line, innerX, y + 1);
        y += lineH;
      }
      y += 4;
    }

    if (part2.documents_supports?.length) {
      for (const docSup of part2.documents_supports) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(80);
        doc.text(`• Support : ${docSup}`, innerX, y);
        y += lineH;
      }
      y += 2;
    }

    part2.questions.forEach((q, idx) => {
      y = drawQuestionPdf(doc, q, idx, margin, contentW, innerX, fieldW, lineH, y);
    });
  }

  // 6. Rétrocompatibilité si questions plates
  if ((!part1 || !part1.questions?.length) && (!part2 || !part2.questions?.length)) {
    const questions = content.questions || [];
    if (questions.length > 0) {
      y = drawSectionHeading(doc, `QUESTIONS D'ÉVALUATION (${questions.length})`, margin, pageWidth, y);
      questions.forEach((q, idx) => {
        y = drawQuestionPdf(doc, q, idx, margin, contentW, innerX, fieldW, lineH, y);
      });
    }
  }

  // 7. CORRIGÉ TYPE & ÉLÉMENTS DE RÉPONSE (Page séparée pour l'enseignant)
  const elements = content.elements_reponse;
  if (elements && elements.length > 0) {
    doc.addPage();
    y = 20;
    y = drawSectionHeading(doc, 'CORRIGÉ TYPE & ÉLÉMENTS DE RÉPONSE (عناصر الإجابة وسلم التنقيط)', margin, pageWidth, y);

    for (const el of elements) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setDrawColor(220);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y - 2, contentW, 6, 1, 1, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 148, 136);
      doc.text(el.question_ref || 'Question', innerX, y + 2);

      if (el.bareme_detaille) {
        doc.setTextColor(180, 83, 9);
        doc.text(el.bareme_detaille, margin + contentW - 25, y + 2);
      }
      y += 7;

      if (el.reponse_modele) {
        y = drawField(doc, 'Réponse attendue : ', el.reponse_modele, innerX, y, fieldW, [15, 23, 42], lineH);
      }
      if (el.criteres_acceptation) {
        y = drawField(doc, 'Tolérance / Variantes : ', el.criteres_acceptation, innerX, y, fieldW, [100, 116, 139], lineH);
      }
      y += 3;
    }
  }

  // 8. GRILLE CRITÉRIÉE APC OFFICIELLE (C1, C2, C3, CP)
  const grilleApc = content.grille_criteriee_apc;
  if (grilleApc && grilleApc.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; } else { y += 6; }
    y = drawSectionHeading(doc, "GRILLE CRITÉRIÉE D'ÉVALUATION APC (شبكة التقويم)", margin, pageWidth, y);

    for (const g of grilleApc) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setDrawColor(200);
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(margin, y - 2, contentW, 6, 1, 1, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(g.critere_nom || g.critere_code || 'Critère', innerX, y + 2);

      if (g.points_max) {
        doc.setTextColor(15, 23, 42);
        doc.text(`${g.points_max} pts max`, margin + contentW - 25, y + 2);
      }
      y += 7;

      if (g.description) {
        y = drawField(doc, 'Description : ', g.description, innerX, y, fieldW, [71, 85, 105], lineH);
      }

      if (g.indicateurs?.length) {
        for (const ind of g.indicateurs) {
          if (y > 268) { doc.addPage(); y = 20; }
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50);
          doc.text(`   • ${ind}`, innerX + 2, y);
          y += lineH;
        }
      }

      if (g.niveaux_maitrise) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(21, 128, 61);
        doc.text(`[+] Max: ${g.niveaux_maitrise.maitrise_maximale || 'Maîtrise'}`, innerX + 2, y);
        doc.setTextColor(217, 119, 6);
        doc.text(`[±] Min: ${g.niveaux_maitrise.maitrise_minimale || 'Partiel'}`, innerX + 65, y);
        doc.setTextColor(220, 38, 38);
        doc.text(`[-] Non: ${g.niveaux_maitrise.non_maitrise || 'Lacunes'}`, innerX + 120, y);
        y += lineH + 1;
      }
      y += 3;
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
