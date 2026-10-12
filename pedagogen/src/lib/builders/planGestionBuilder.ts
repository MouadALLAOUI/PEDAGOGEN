import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';
import type { WatermarkInfo } from './pdfBuilder';

export interface PlanGestionContent {
  titre_seance?: string;
  gestion_retard?: string;
  gestion_fin_de_seance?: string;
  alternatives_sans_materiel?: string;
  strategie_entree?: {
    accueil?: string; mise_en_route?: string; captation_attention?: string;
  };
  organisation_espace?: {
    disposition_tables?: string; zones_activite?: string[]; acces_materiel?: string;
  };
  gestion_temps?: {
    Mise_en_situation?: string; Analyse?: string; Synthese?: string;
    marge_imprevus?: string; signaux_transition?: string;
  };
  gestion_comportement?: {
    regles_rappelees?: string[]; gestion_bavardages?: string; gestion_eleve_bloqué?: string;
  };
  differenciation?: {
    eleves_rapides?: string; eleves_en_difficulte?: string;
  };
  remédiation?: {
    erreurs_frequentes_prevues?: string[];
    priorisation_erreurs_frequentes?: Array<{ erreur: string; remediation_ciblee: string }>;
    strategie_correction?: string;
  };
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

export function buildPlanGestionPdf(
  metadata: CourseMetadata,
  content: PlanGestionContent,
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

  if (content.titre_seance) {
    if (y > 268) { doc.addPage(); y = 20; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Titre: ${content.titre_seance}`, margin, y);
    y += 8;
  }

  // Pre-session Checklist Box
  if (y > 240) { doc.addPage(); y = 20; }
  doc.saveGraphicsState();
  doc.setFillColor(254, 252, 243); // light gold/parchment background
  doc.rect(margin, y, contentW, 25, 'F');
  doc.setDrawColor(217, 119, 6); // gold border
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW, 25);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(217, 119, 6);
  doc.text("CHECKLIST PRÉ-SÉANCE (À vérifier par l'enseignant) :", margin + 4, y + 5);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);
  doc.text("[ ]  Vérifier le fonctionnement du projecteur et du tableau.", margin + 6, y + 10);
  doc.text("[ ]  Allumer le poste maître et tester l'accès au réseau.", margin + 6, y + 14);
  doc.text("[ ]  Préparer les supports de cours et fiches TP élèves.", margin + 6, y + 18);
  doc.text("[ ]  S'assurer que les postes élèves sont opérationnels.", margin + 6, y + 22);
  doc.restoreGraphicsState();
  y += 30;

  const se = content.strategie_entree;
  if (se) {
    y = drawSectionHeading(doc, "STRATÉGIE D'ENTRÉE", margin, pageWidth, y);
    y = drawField(doc, 'ACCUEIL', se.accueil || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, 'MISE EN ROUTE', se.mise_en_route || '', innerX, y, fieldW, [180, 83, 9], lineH);
    y = drawField(doc, 'CAPTATION', se.captation_attention || '', innerX, y, fieldW, [124, 58, 237], lineH);
  }

  if (content.gestion_retard || content.gestion_fin_de_seance || content.alternatives_sans_materiel) {
    y = drawSectionHeading(doc, "FONCTIONNEMENT DE LA CLASSE", margin, pageWidth, y);
    y = drawField(doc, 'GESTION RETARD', content.gestion_retard || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, 'FIN DE SÉANCE', content.gestion_fin_de_seance || '', innerX, y, fieldW, [180, 83, 9], lineH);
    y = drawField(doc, 'SANS MATÉRIEL', content.alternatives_sans_materiel || '', innerX, y, fieldW, [124, 58, 237], lineH);
  }

  const oe = content.organisation_espace;
  if (oe) {
    y = drawSectionHeading(doc, "ORGANISATION DE L'ESPACE", margin, pageWidth, y);
    y = drawField(doc, 'DISPOSITION', oe.disposition_tables || '', innerX, y, fieldW, [13, 148, 136], lineH);
    
    // ASCII Seating Layout
    if (y > 210) { doc.addPage(); y = 20; }
    doc.saveGraphicsState();
    doc.setFillColor(248, 250, 252); // light slate background
    doc.rect(margin, y, contentW, 50, 'F');
    doc.setDrawColor(148, 163, 184); // slate border
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, 50);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text("PLAN DE LA SALLE DE CLASSE (Laboratoire informatique)", margin + 4, y + 5);
    
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30);
    const layoutLines = [
      "   +-----------------------------------------------------------+",
      "   |               [ T A B L E A U   -   E C R A N ]           |",
      "   |                                                           |",
      "   |                  [ POSTE ENSEIGNANT ]                     |",
      "   |                                                           |",
      "   |   [ Poste 1 ] [ Poste 2 ]       [ Poste 3 ] [ Poste 4 ]   |",
      "   |      |---|       |---|             |---|       |---|      |",
      "   |                                                           |",
      "   |   [ Poste 5 ] [ Poste 6 ]       [ Poste 7 ] [ Poste 8 ]   |",
      "   |      |---|       |---|             |---|       |---|      |",
      "   |                                                           |",
      "   |   [ Poste 9 ] [ Poste 10]       [ Poste 11] [ Poste 12]   |",
      "   |      |---|       |---|             |---|       |---|      |",
      "   +-----------------------------------------------------------+"
    ];
    let asciiY = y + 10;
    for (const line of layoutLines) {
      doc.text(line, margin + 12, asciiY);
      asciiY += 2.8;
    }
    doc.restoreGraphicsState();
    y += 54;

    if (oe.zones_activite?.length) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("Zones d'activité", margin, y);
      y += 6;
      for (const z of oe.zones_activite) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        doc.text(`• ${z}`, innerX, y);
        y += 4;
      }
    }
    y = drawField(doc, 'MATÉRIEL', oe.acces_materiel || '', innerX, y, fieldW, [124, 58, 237], lineH);
  }

  const gt = content.gestion_temps;
  if (gt) {
    y = drawSectionHeading(doc, 'GESTION DU TEMPS', margin, pageWidth, y);
    y = drawField(doc, 'MISE EN SITUATION', gt.Mise_en_situation || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, 'ANALYSE', gt.Analyse || '', innerX, y, fieldW, [180, 83, 9], lineH);
    y = drawField(doc, 'SYNTHÈSE', gt.Synthese || '', innerX, y, fieldW, [124, 58, 237], lineH);
    y = drawField(doc, 'MARGE', gt.marge_imprevus || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, 'TRANSITION', gt.signaux_transition || '', innerX, y, fieldW, [180, 83, 9], lineH);
  }

  const gc = content.gestion_comportement;
  if (gc) {
    y = drawSectionHeading(doc, 'GESTION DU COMPORTEMENT', margin, pageWidth, y);
    if (gc.regles_rappelees?.length) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Charte de comportement : À faire vs À ne pas faire', margin, y);
      y += 6;

      const positiveRules: string[] = [];
      const negativeRules: string[] = [];

      for (const r of gc.regles_rappelees) {
        const low = r.toLowerCase();
        if (low.includes('ne pas') || low.includes('pas') || low.includes('interdit') || low.includes('éviter') || low.includes('sans') || low.includes('ne doit')) {
          negativeRules.push(r);
        } else {
          positiveRules.push(r);
        }
      }

      doc.setFontSize(7.5);
      for (const pr of positiveRules) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(22, 163, 74); // green
        doc.text('✅ À FAIRE :', innerX, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(pr, fieldW - 20);
        doc.text(lines, innerX + 18, y);
        y += lines.length * 3.5 + 1;
      }
      for (const nr of negativeRules) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38); // red
        doc.text('❌ À ÉVITER :', innerX, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(nr, fieldW - 20);
        doc.text(lines, innerX + 18, y);
        y += lines.length * 3.5 + 1;
      }
      y += 2;
    }
    y = drawField(doc, 'BAVARDAGES', gc.gestion_bavardages || '', innerX, y, fieldW, [180, 83, 9], lineH);
    y = drawField(doc, 'ÉLÈVE BLOQUÉ', gc['gestion_eleve_bloqué'] || '', innerX, y, fieldW, [124, 58, 237], lineH);
  }

  const df = content.differenciation;
  if (df) {
    y = drawSectionHeading(doc, 'DIFFÉRENCIATION PÉDAGOGIQUE', margin, pageWidth, y);
    y = drawField(doc, '⚡ ÉLÈVES RAPIDES', df.eleves_rapides || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, '🐢 ÉLÈVES EN DIFFICULTÉ', df.eleves_en_difficulte || '', innerX, y, fieldW, [180, 83, 9], lineH);
  }

  const rm = content.remédiation || (content as any).remediation;
  if (rm) {
    y = drawSectionHeading(doc, 'REMÉDIATION', margin, pageWidth, y);
    if (rm.erreurs_frequentes_prevues?.length) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Erreurs fréquentes prévues', margin, y);
      y += 6;
      for (const e of rm.erreurs_frequentes_prevues) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        doc.text(`• ${e}`, innerX, y);
        y += 4;
      }
      y += 2;
    }
    const priorisation = rm.priorisation_erreurs_frequentes || (rm as any).priorisation_erreurs;
    if (priorisation?.length) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Erreurs prioritaires et remédiations', margin, y);
      y += 6;
      for (const item of priorisation) {
        if (y > 262) { doc.addPage(); y = 20; }
        const text = `Erreur: ${item.erreur || ''} -> Remédiation: ${item.remediation_ciblee || ''}`;
        y = drawField(doc, 'CRITIQUE', text, innerX, y, fieldW, [180, 83, 9], lineH);
      }
    }
    y = drawField(doc, 'CORRECTION', rm.strategie_correction || '', innerX, y, fieldW, [13, 148, 136], lineH);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
