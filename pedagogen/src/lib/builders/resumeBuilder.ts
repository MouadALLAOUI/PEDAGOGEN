import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';
import type { WatermarkInfo } from './pdfBuilder';

export interface ResumeContent {
  titre?: string;
  qrcode_externe?: string;
  illustration_ascii?: string;
  auto_evaluation?: string[];
  introduction?: string;
  resume?: string;
  notions_cles?: { terme?: string; definition_simple?: string; exemple?: string }[];
  lexique_bilingue?: { terme_fr?: string; terme_ar?: string; contexte?: string }[];
  schema_simplifie?: string;
  points_cles?: string[];
  a_retenir?: string;
  exercices?: { numero?: number; type?: string; enonce?: string; options?: string[]; correction?: string }[];
}

function drawField(
  doc: jsPDF, label: string, value: string,
  x: number, y: number, contentW: number,
  color: [number, number, number], lineH: number,
): number {
  if (!value) return y;
  if (y > 268) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
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
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(title, margin, y);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  return y + 10;
}

export function buildResumePdf(
  metadata: CourseMetadata,
  content: ResumeContent,
  title: string,
  watermark?: WatermarkInfo,
): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageWidth - 2 * margin;
  const innerX = margin + 4;
  const fieldW = contentW - 4;
  const lineH = 3.5;
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

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 15;

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
      doc.setFont('helvetica', c % 2 === 0 ? 'bold' : 'normal');
      doc.setTextColor(c % 2 === 0 ? 0 : 80);
      doc.text(row[c]!, x + 2, yRow + 6.5);
    }
  });
  y = tableTop + rows.length * rowHeight + 12;

  if (content.titre) {
    if (y > 268) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 148, 136);
    doc.text(content.titre, margin, y);
    y += 8;
  }

  y = drawSectionHeading(doc, 'INTRODUCTION', margin, pageWidth, y);
  if (y > 268) { doc.addPage(); y = 20; }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  const introLines = doc.splitTextToSize(content.introduction || '', contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * lineH + 4;

  const qrCode = (content.qrcode_externe || '').trim();
  const isValidQR = qrCode && !qrCode.includes('abc123') && !qrCode.includes('12345') && /^https?:\/\//.test(qrCode);
  if (isValidQR) {
    if (y > 255) { doc.addPage(); y = 20; }
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentW, 12, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('Ressource externe / Quiz en ligne :', margin + 4, y + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(29, 78, 216);
    doc.text(qrCode, margin + 4, y + 9);
    y += 16;
  }

  y = drawSectionHeading(doc, 'RÉSUMÉ', margin, pageWidth, y);
  if (y > 268) { doc.addPage(); y = 20; }
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  const resLines = doc.splitTextToSize(content.resume || '', contentW);
  doc.text(resLines, margin, y);
  y += resLines.length * lineH + 4;

  const nc = content.notions_cles;
  if (nc?.length) {
    y = drawSectionHeading(doc, 'NOTIONS CLÉS', margin, pageWidth, y);
    for (const n of nc) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(240, 253, 250);
      doc.rect(margin, y, contentW, 22, 'F');
      
      let icon = '📘';
      const termLower = (n.terme || '').toLowerCase();
      if (termLower.includes('ordinateur') || termLower.includes('ecran') || termLower.includes('clavier')) icon = '🖥️';
      else if (termLower.includes('logiciel') || termLower.includes('system') || termLower.includes('windows')) icon = '💾';
      else if (termLower.includes('reseau') || termLower.includes('lan') || termLower.includes('wifi') || termLower.includes('connect')) icon = '🔌';
      else if (termLower.includes('web') || termLower.includes('internet') || termLower.includes('navigateur')) icon = '🌐';
      else if (termLower.includes('securite') || termLower.includes('mot de passe') || termLower.includes('virus')) icon = '🔒';
      else if (termLower.includes('unite') || termLower.includes('processeur') || termLower.includes('ram') || termLower.includes('composant')) icon = '⚙️';
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 148, 136);
      doc.text(`${icon} ${n.terme || ''}`, margin + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(n.definition_simple || '', margin + 2, y + 10);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      doc.text(`Ex: ${n.exemple || ''}`, margin + 2, y + 16);
      y += 26;
    }
  }

  const lex = content.lexique_bilingue;
  if (lex?.length) {
    y = drawSectionHeading(doc, 'LEXIQUE BILINGUE (FR / AR)', margin, pageWidth, y);
    for (const item of lex) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentW, 16, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(13, 148, 136);
      doc.text(item.terme_fr || '', margin + 2, y + 4.5);
      if (item.terme_ar) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`[AR] ${item.terme_ar}`, margin + 50, y + 4.5);
      }
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100);
      doc.setFontSize(7.5);
      doc.text(item.contexte || '', margin + 2, y + 11);
      y += 19;
    }
  }

  if (content.schema_simplifie) {
    y = drawSectionHeading(doc, 'SCHÉMA SIMPLIFIÉ', margin, pageWidth, y);
    if (y > 268) { doc.addPage(); y = 20; }
    doc.setFontSize(7.5);
    doc.setFont('courier', 'normal');
    doc.setTextColor(60);
    const formattedSchema = content.schema_simplifie
      .replace(/->/g, ' → ')
      .replace(/<-/g, ' ← ')
      .replace(/--/g, ' ─ ')
      .replace(/\|/g, ' │ ');
    const schLines = doc.splitTextToSize(formattedSchema, contentW);
    doc.text(schLines, margin, y);
    y += schLines.length * lineH + 4;
  }

  if (content.illustration_ascii) {
    y = drawSectionHeading(doc, 'ILLUSTRATION (ASCII)', margin, pageWidth, y);
    if (y > 268) { doc.addPage(); y = 20; }
    doc.setFontSize(6.5);
    doc.setFont('courier', 'normal');
    doc.setTextColor(50);
    const formattedIll = content.illustration_ascii
      .replace(/->/g, ' → ')
      .replace(/<-/g, ' ← ')
      .replace(/--/g, ' ─ ')
      .replace(/\|/g, ' │ ');
    const illLines = doc.splitTextToSize(formattedIll, contentW);
    doc.text(illLines, margin, y);
    y += illLines.length * lineH + 4;
  }

  if (content.points_cles?.length) {
    y = drawSectionHeading(doc, 'POINTS CLÉS', margin, pageWidth, y);
    for (const p of content.points_cles) {
      if (y > 268) { doc.addPage(); y = 20; }
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60);
      doc.text(`• ${p}`, innerX, y);
      y += 4;
    }
  }

  if (content.auto_evaluation?.length) {
    y = drawSectionHeading(doc, 'AUTO-ÉVALUATION (Coche si tu as compris)', margin, pageWidth, y);
    for (const ae of content.auto_evaluation) {
      if (y > 268) { doc.addPage(); y = 20; }
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40);
      doc.text(`[ ]  ${ae}`, margin + 4, y);
      y += 4.5;
    }
  }

  if (content.a_retenir) {
    y += 4;
    y = drawSectionHeading(doc, 'À RETENIR', margin, pageWidth, y);
    const lines = doc.splitTextToSize(content.a_retenir, contentW - 8);
    const boxH = lines.length * 4 + 8;
    if (y + boxH > 270) { doc.addPage(); y = 20; }
    doc.setFillColor(254, 243, 199); // light gold amber-100
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text(lines, margin + 4, y + 6);
    y += boxH + 6;
  }

  const exos = content.exercices;
  if (exos?.length) {
    y += 4;
    y = drawSectionHeading(doc, 'JE TESTE MES CONNAISSANCES', margin, pageWidth, y);
    for (const ex of exos) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFillColor(255, 247, 237);
      doc.rect(margin, y, contentW, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Exercice ${ex.numero || ''}`, margin + 2, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 83, 9);
      doc.text(`[${ex.type || '?'}]`, margin + 30, y + 5);
      y += 12;
      y = drawField(doc, 'ÉNONCÉ', ex.enonce || '', innerX, y, fieldW, [13, 148, 136], lineH);
      if (ex.options?.length) {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        for (const opt of ex.options) {
          if (y > 268) { doc.addPage(); y = 20; }
          doc.text(`  • ${opt}`, innerX, y);
          y += 3.5;
        }
      }
      y = drawField(doc, 'CORRECTION', ex.correction || '', innerX, y, fieldW, [13, 148, 136], lineH);
      y += 3;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
