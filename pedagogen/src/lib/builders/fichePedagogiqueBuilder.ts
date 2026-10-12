import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';
import type { WatermarkInfo } from './pdfBuilder';

export interface FicheContent {
  titre_seance?: string;
  timing_consistency_check?: string;
  liens_avec_autres_disciplines?: string[];
  modalités_évaluation_formative?: string[];
  préparation_antérieure?: string;
  competences_visees?: string[];
  objectifs?: string[];
  prerequis?: string[];
  savoir_faire?: string[];
  savoir_etre?: string[];
  deroulement?: Record<string, Record<string, unknown>>;
}

function isDialogueStep(val: unknown): val is { enseignant: string; apprenent: string; savoir?: string } {
  return typeof val === 'object' && val !== null && 'enseignant' in val;
}

function isStringArray(val: unknown): val is string[] {
  return Array.isArray(val) && val.every((i) => typeof i === 'string');
}

function drawDialogueTable(
  doc: jsPDF,
  steps: { label: string; enseignant: string; apprenent: string }[],
  startY: number,
  pageWidth: number,
): number {
  const margin = 20;
  const tableWidth = pageWidth - 2 * margin;
  const colW: [number, number, number, number] = [25, 50, 50, 45]; // Étape, Enseignant, Apprenant, Annotations
  const padding = 3;
  let y = startY;

  // Header row
  doc.setFillColor(13, 148, 136); // teal
  doc.rect(margin, y, tableWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text('Étape', margin + 2, y + 5.5);
  doc.text('Enseignant', margin + colW[0] + 2, y + 5.5);
  doc.text('Apprenant', margin + colW[0] + colW[1] + 2, y + 5.5);
  doc.text('Annotations', margin + colW[0] + colW[1] + colW[2] + 2, y + 5.5);
  y += 8;

  for (const step of steps) {
    const etapeLines = doc.splitTextToSize(step.label, colW[0] - 2 * padding);
    const enseignantLines = doc.splitTextToSize(step.enseignant, colW[1] - 2 * padding);
    const apprenantLines = doc.splitTextToSize(step.apprenent, colW[2] - 2 * padding);
    const maxLines = Math.max(etapeLines.length, enseignantLines.length, apprenantLines.length);
    const rowH = Math.max(maxLines * 4 + 2 * padding, 12);

    if (y + rowH > 270) {
      doc.addPage();
      y = 20;
    }

    // Alternating row background
    const rowIdx = steps.indexOf(step);
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252); // very light gray
      doc.rect(margin, y, tableWidth, rowH, 'F');
    }

    // Borders
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, tableWidth, rowH);
    doc.line(margin + colW[0], y, margin + colW[0], y + rowH);
    doc.line(margin + colW[0] + colW[1], y, margin + colW[0] + colW[1], y + rowH);
    doc.line(margin + colW[0] + colW[1] + colW[2], y, margin + colW[0] + colW[1] + colW[2], y + rowH);

    // Annotations personal dotted guides
    doc.saveGraphicsState();
    doc.setLineDashPattern([1, 1.5], 0);
    doc.setDrawColor(180);
    const annoX = margin + colW[0] + colW[1] + colW[2];
    for (let ly = y + 5.5; ly < y + rowH - 2; ly += 4.5) {
      doc.line(annoX + 2, ly, annoX + colW[3] - 2, ly);
    }
    doc.restoreGraphicsState();

    // Content
    doc.setFontSize(7.5);
    doc.setTextColor(0);

    // Label column
    doc.setFont('helvetica', 'bold');
    doc.text(etapeLines, margin + padding, y + padding + 3);

    // Enseignant column
    doc.setFont('helvetica', 'normal');
    doc.text(enseignantLines, margin + colW[0] + padding, y + padding + 3);

    // Apprenant column
    doc.text(apprenantLines, margin + colW[0] + colW[1] + padding, y + padding + 3);

    y += rowH;
  }

  return y + 4;
}

function renderPhase(
  doc: jsPDF,
  phaseName: string,
  phaseData: Record<string, unknown>,
  pageWidth: number,
  startY: number,
): number {
  let y = startY;

  // Phase header
  if (y > 250) { doc.addPage(); y = 20; }
  
  // Decide header color and label emoji prefix
  let bgColor = [15, 23, 42]; // navy
  let displayTitle = phaseName;
  if (phaseName.includes('MISE EN SITUATION')) {
    bgColor = [37, 99, 235]; // Blue
    displayTitle = '⏰ ' + phaseName;
  } else if (phaseName.includes('ANALYSE')) {
    bgColor = [22, 163, 74]; // Green
    displayTitle = '🧠 ' + phaseName;
  } else if (phaseName.includes('SYNTHÈSE')) {
    bgColor = [217, 119, 6]; // Orange
    displayTitle = '🎯 ' + phaseName;
  }

  doc.setFillColor(bgColor[0]!, bgColor[1]!, bgColor[2]!);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(displayTitle.replace(/_/g, ' '), 22, y + 5.5);
  y += 12;

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
    y = drawDialogueTable(doc, steps, y, pageWidth);
  }

  if (tools.length > 0) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Outils didactiques : ✍️', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    for (const t of tools) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`• ${t}`, 24, y);
      y += 4;
    }
    y += 4;
  }

  return y;
}

export function buildFichePedagogiquePdf(
  metadata: CourseMetadata,
  content: FicheContent,
  title: string,
  watermark?: WatermarkInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Watermark
  function drawWatermarkOnPage() {
    if (!watermark || (!watermark.fullName && !watermark.etablissement)) return;
    const wmText = `${watermark.etablissement} | ${watermark.fullName} | ${new Date().toLocaleDateString('fr-FR')}`;
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.1 }));
    doc.setFontSize(30);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100);
    doc.text(wmText, pageWidth / 2, doc.internal.pageSize.getHeight() / 2, { angle: 45, align: 'center' });
    doc.restoreGraphicsState();
  }
  doc.internal.events.subscribe('addPage', drawWatermarkOnPage);
  drawWatermarkOnPage();

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Header list of bullet points instead of table
  doc.setFontSize(9.5);
  const metaItems = [
    `Enseignant : ${watermark?.fullName || '______'}`,
    `Niveau : ${metadata.niveau}`,
    `Matière : ${metadata.matiere}`,
    `Unité : ${metadata.unite}`,
    `Séance : ${metadata.lecon}`,
    `Durée : ${metadata.duree} min`,
    `Semestre : ${metadata.semestre}`,
  ];

  doc.saveGraphicsState();
  doc.setFillColor(245, 247, 250);
  doc.rect(20, y - 5, pageWidth - 40, 24, 'F');
  doc.setDrawColor(220);
  doc.rect(20, y - 5, pageWidth - 40, 24);
  doc.restoreGraphicsState();

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Fiche d\'identité pédagogique :', 24, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  const metaY = y + 5;
  doc.text(`• ${metaItems[0]}`, 24, metaY);
  doc.text(`• ${metaItems[1]}`, 24, metaY + 4.5);
  doc.text(`• ${metaItems[2]}`, 24, metaY + 9);

  doc.text(`• ${metaItems[3]}`, pageWidth / 2 + 10, metaY);
  doc.text(`• ${metaItems[4]}`, pageWidth / 2 + 10, metaY + 4.5);
  doc.text(`• ${metaItems[5]}`, pageWidth / 2 + 10, metaY + 9);

  y = metaY + 16;
  doc.setDrawColor(200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Helper to render a list section
  function renderListSection(label: string, items: string[], isCompetence = false) {
    if (!items.length) return;
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(label, 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);

    const compColors: [number, number, number][] = [
      [37, 99, 235],  // blue
      [22, 163, 74],  // green
      [217, 119, 6],  // orange
      [220, 38, 38],  // red
      [147, 51, 234], // purple
    ];

    for (let index = 0; index < items.length; index++) {
      const item = items[index]!;
      if (y > 270) { doc.addPage(); y = 20; }
      
      if (isCompetence) {
        // Draw color-coded square
        const color = compColors[index % compColors.length]!;
        doc.saveGraphicsState();
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(24, y - 2.5, 2.5, 2.5, 'F');
        doc.restoreGraphicsState();
        
        const lines = doc.splitTextToSize(item, pageWidth - 48);
        for (const line of lines) {
          doc.text(line, 29, y);
          y += 4;
        }
      } else {
        const lines = doc.splitTextToSize(`• ${item}`, pageWidth - 48);
        for (const line of lines) {
          doc.text(line, 24, y);
          y += 4;
        }
      }
      y += 1;
    }
    y += 4;
  }

  // Top-level sections
  renderListSection('COMPÉTENCES VISÉES', content.competences_visees || [], true);
  renderListSection('OBJECTIFS', content.objectifs || []);
  renderListSection('PRÉREQUIS', content.prerequis || []);
  renderListSection('SAVOIR-FAIRE', content.savoir_faire || []);
  renderListSection('SAVOIR-ÊTRE', content.savoir_etre || []);
  renderListSection('LIENS AVEC D\'AUTRES DISCIPLINES', content.liens_avec_autres_disciplines || []);
  renderListSection('MODALITÉS D\'ÉVALUATION FORMATIVE', content.modalités_évaluation_formative || []);

  if (content.préparation_antérieure) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('PRÉPARATION ANTÉRIEURE', 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);
    const lines = doc.splitTextToSize(content.préparation_antérieure, pageWidth - 40);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 4;
    }
    y += 4;
  }

  // Déroulement
  const deroulement = content.deroulement;
  if (deroulement && typeof deroulement === 'object') {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('DÉROULEMENT', 20, y);
    y += 10;

    const phaseOrder = ['Mise_en_situation', 'Analyse', 'Synthese'];
    const phaseLabels: Record<string, string> = {
      Mise_en_situation: 'PHASE 1 — MISE EN SITUATION',
      Analyse: 'PHASE 2 — ANALYSE',
      Synthese: 'PHASE 3 — SYNTHÈSE',
    };

    for (const phaseKey of phaseOrder) {
      const phaseData = deroulement[phaseKey];
      if (phaseData && typeof phaseData === 'object') {
        y = renderPhase(doc, phaseLabels[phaseKey] || phaseKey, phaseData as Record<string, unknown>, pageWidth, y);
      }
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
