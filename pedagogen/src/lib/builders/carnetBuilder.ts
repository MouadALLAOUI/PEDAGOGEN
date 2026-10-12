import { jsPDF } from 'jspdf';
import type { NotebookEntry } from '@/lib/notebook/notebookManager';

/** Carnet de bord imprimable (archivage inspection) — entrées + statuts par classe. */
export function buildCarnetPdf(
  classeName: string,
  entries: NotebookEntry[],
  period?: { from?: string; to?: string }
): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Carnet de Bord', W / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const periodLabel = period?.from || period?.to ? ` — ${period.from || '...'} → ${period.to || '...'}` : '';
  doc.text(`${classeName}${periodLabel} — ${entries.length} séance(s)`, W / 2, y, { align: 'center' });
  y += 10;

  if (entries.length === 0) {
    doc.text('Aucune entrée sur la période.', 14, y);
    return Buffer.from(doc.output('arraybuffer'));
  }

  const STATUT_LABELS: Record<string, string> = {
    planifiee: 'Planifiée', realisee: 'Réalisée', reportee: 'Reportée',
  };

  for (const e of entries) {
    if (y > 262) { doc.addPage(); y = 20; }

    doc.setFillColor(232, 245, 243);
    doc.rect(14, y, W - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const horaire = e.heure_debut ? ` [${e.heure_debut}${e.heure_fin ? ` - ${e.heure_fin}` : ''}]` : '';
    doc.text(`${e.date}${horaire}  —  ${e.titre}`, 16, y + 5.5);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90);
    const tags = e.tags.length > 0 ? `   Tags : ${e.tags.join(', ')}` : '';
    doc.text(`Statut : ${STATUT_LABELS[e.statut] || e.statut}${tags}`, 16, y);
    y += 5;
    if (e.attachments && e.attachments.length > 0) {
      doc.text(`Pièces jointes : ${e.attachments.map((a) => a.name).join(', ')}`, 16, y);
      y += 5;
    }
    doc.setTextColor(0);

    if (e.resume) {
      const lines = doc.splitTextToSize(e.resume.replace(/[#*`>]/g, '').trim(), W - 34);
      for (const line of lines) {
        if (y > 282) { doc.addPage(); y = 20; }
        doc.text(line, 16, y);
        y += 4.6;
      }
    }
    y += 5;
  }

  return Buffer.from(doc.output('arraybuffer'));
}
