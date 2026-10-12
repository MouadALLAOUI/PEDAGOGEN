import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';
import type { WatermarkInfo } from './pdfBuilder';

export interface PlanificationContent {
  titre_seance?: string;
  competences_visees?: string[];
  objectifs?: string[];
  prerequis?: string[];
  savoir_faire?: string[];
  savoir_etre?: string[];
  deroulement?: Record<string, Record<string, unknown>>;
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

function drawPlanificationTable(
  doc: jsPDF,
  steps: TSStep[],
  startY: number,
  pageWidth: number,
  phaseColor: [number, number, number],
): number {
  const margin = 20;
  const tableWidth = pageWidth - 2 * margin;
  const colW = [25, 15, 40, 45, 45]; // Étape, Durée, Action, Parole, Interaction
  const padding = 2.5;
  let y = startY;

  // Header row
  doc.setFillColor(phaseColor[0], phaseColor[1], phaseColor[2]);
  doc.rect(margin, y, tableWidth, 8, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);

  let currentX = margin;
  const headers = ['Étape', 'Durée', 'Action enseignant', 'Parole', 'Interaction élève'];
  headers.forEach((h, i) => {
    doc.text(h, currentX + 1.5, y + 5.5);
    currentX += colW[i]!;
  });
  y += 8;

  for (const step of steps) {
    const etapeLines = doc.splitTextToSize(step.label, colW[0]! - 2 * padding);
    const durLines = doc.splitTextToSize(step.duration || '', colW[1]! - 2 * padding);
    const actLines = doc.splitTextToSize(step.action, colW[2]! - 2 * padding);
    const paroleLines = doc.splitTextToSize(step.parole, colW[3]! - 2 * padding);
    const interLines = doc.splitTextToSize(step.interaction, colW[4]! - 2 * padding);

    const maxLines = Math.max(etapeLines.length, durLines.length, actLines.length, paroleLines.length, interLines.length);
    const mainRowH = Math.max(maxLines * 3.5 + 2 * padding, 10);

    let hasExtra = false;
    let extraText = '';
    let extraLines: string[] = [];
    if (step.indicateurs_reussite || step.interactions_attendues || step.savoir) {
      hasExtra = true;
      const parts = [];
      if (step.indicateurs_reussite) parts.push(`[RÉUSSITE]: ${step.indicateurs_reussite}`);
      if (step.interactions_attendues) parts.push(`[INTERACTIONS]: ${step.interactions_attendues}`);
      if (step.savoir) parts.push(`[SAVOIR]: ${step.savoir}`);
      extraText = parts.join(' | ');
      extraLines = doc.splitTextToSize(extraText, tableWidth - 2 * padding);
    }
    const extraRowH = hasExtra ? (extraLines.length * 3.5 + 4) : 0;
    const totalRowH = mainRowH + extraRowH;

    if (y + totalRowH > 270) {
      doc.addPage();
      y = 20;
      // Redraw header row on next page
      doc.setFillColor(phaseColor[0], phaseColor[1], phaseColor[2]);
      doc.rect(margin, y, tableWidth, 8, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255);
      let tempX = margin;
      headers.forEach((h, i) => {
        doc.text(h, tempX + 1.5, y + 5.5);
        tempX += colW[i]!;
      });
      y += 8;
    }

    const stepIdx = steps.indexOf(step);
    if (stepIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, tableWidth, totalRowH, 'F');
    }

    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, tableWidth, totalRowH);

    let lineX = margin;
    for (let i = 0; i < 4; i++) {
      lineX += colW[i]!;
      doc.line(lineX, y, lineX, y + mainRowH);
    }

    doc.setFontSize(7);
    doc.setTextColor(50);
    doc.setFont('helvetica', 'normal');

    // Col 0: Étape
    doc.setFont('helvetica', 'bold');
    doc.text(etapeLines, margin + padding, y + padding + 3);
    doc.setFont('helvetica', 'normal');

    // Col 1: Durée
    doc.text(durLines, margin + colW[0]! + padding, y + padding + 3);

    // Col 2: Action
    doc.text(actLines, margin + colW[0]! + colW[1]! + padding, y + padding + 3);

    // Col 3: Parole
    doc.text(paroleLines, margin + colW[0]! + colW[1]! + colW[2]! + padding, y + padding + 3);

    // Col 4: Interaction
    doc.text(interLines, margin + colW[0]! + colW[1]! + colW[2]! + colW[3]! + padding, y + padding + 3);

    if (hasExtra) {
      doc.line(margin, y + mainRowH, margin + tableWidth, y + mainRowH);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(70);
      doc.text(extraLines, margin + padding, y + mainRowH + padding + 2.5);
    }

    y += totalRowH;
  }

  return y + 4;
}

function renderPhase(
  doc: jsPDF,
  phaseName: string,
  phaseData: Record<string, unknown>,
  margin: number,
  pageWidth: number,
  phaseColor: [number, number, number],
): number {
  let y = (doc as any).__currentY ?? 20;
  const contentW = pageWidth - 2 * margin;

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

  if (steps.length === 0) return y;

  if (y > 250) { doc.addPage(); y = 20; }

  // Phase heading (colored bar)
  doc.setFillColor(phaseColor[0], phaseColor[1], phaseColor[2]);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(phaseName.toUpperCase().replace(/_/g, ' '), margin + 2, y + 5.5);
  y += 12;

  y = drawPlanificationTable(doc, steps, y, pageWidth, phaseColor);

  return y;
}

export function buildPlanificationPdf(
  metadata: CourseMetadata,
  content: PlanificationContent,
  title: string,
  watermark?: WatermarkInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageWidth - 2 * margin;
  let y = 20;

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

  // Metadata table
  const colWidth = contentW / 4;
  const rowHeight = 10;
  const tableTop = y + 5;

  const rows: string[][] = [
    ['Enseignant', watermark?.fullName || '______', 'Niveau', metadata.niveau],
    ['Unité', metadata.unite, 'Séance', metadata.lecon],
    ['Séquence', '______', 'Durée', `${metadata.duree} min`],
  ];

  doc.setDrawColor(180);
  doc.setFontSize(9);
  rows.forEach((row, r) => {
    for (let c = 0; c < 4; c++) {
      const x = margin + c * colWidth;
      const yRow = tableTop + r * rowHeight;
      doc.rect(x, yRow, colWidth, rowHeight);
      const isLabel = c % 2 === 0;
      doc.setFont('helvetica', isLabel ? 'bold' : 'normal');
      doc.setTextColor(isLabel ? 0 : 80);
      doc.text(row[c]!, x + 2, yRow + 6.5);
    }
  });

  y = tableTop + rows.length * rowHeight + 12;

  // H2 — Déroulement section heading
  let totalDurations = 0;
  const der = content.deroulement || {};
  const phases = ['Mise_en_situation', 'Analyse', 'Synthese'];
  for (const phaseName of phases) {
    const phaseData = der[phaseName] as Record<string, unknown> | undefined;
    if (phaseData) {
      for (const val of Object.values(phaseData)) {
        if (isTSBlock(val) && val.duration) {
          const m = parseInt(val.duration.replace(/\D/g, '')) || 0;
          totalDurations += m;
        }
      }
    }
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`DÉROULEMENT (Durée totale : ${totalDurations} min)`, margin, y);

  // Draw visual progress/timer bar
  doc.setDrawColor(200);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin + 105, y - 4, 45, 4, 1, 1, 'F');
  doc.setFillColor(37, 99, 235);
  const fillW = Math.min(45, (totalDurations / 60) * 45); // simulated progress relative to 60 mins standard
  doc.roundedRect(margin + 105, y - 4, fillW, 4, 1, 1, 'F');

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 10;

  const phaseColors: Record<string, [number, number, number]> = {
    Mise_en_situation: [37, 99, 235], // Blue
    Analyse: [22, 163, 74],          // Green
    Synthese: [217, 119, 6]          // Orange
  };

  for (const phaseName of phases) {
    const phaseData = der[phaseName] as Record<string, unknown> | undefined;
    if (!phaseData || Object.keys(phaseData).length === 0) continue;
    (doc as any).__currentY = y;
    const col = phaseColors[phaseName] || [15, 23, 42];
    y = renderPhase(doc, phaseName, phaseData, margin, pageWidth, col);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
