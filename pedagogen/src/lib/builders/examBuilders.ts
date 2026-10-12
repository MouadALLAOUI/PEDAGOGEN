import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx';
import { jsPDF } from 'jspdf';
import type { ExamAnalyse } from '@/lib/exams/examManager';
import { getDb } from '@/lib/db';

const THIN = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const CELL = { borders: { top: THIN, bottom: THIN, left: THIN, right: THIN } };

function cell(text: string, opts: { bold?: boolean; shade?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): TableCell {
  return new TableCell({
    ...CELL,
    shading: opts.shade ? { fill: opts.shade } : undefined,
    children: [new Paragraph({
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, size: 18 })],
    })],
  });
}

/** Grille de notation élèves × questions — archivage MEN (DOCX). */
export async function buildGrilleDocx(analyse: ExamAnalyse): Promise<Buffer> {
  const { exam, questions, students } = analyse;

  const header = new TableRow({
    tableHeader: true,
    children: [
      cell('N°', { bold: true, shade: 'E8F5F3' }),
      cell('Élève', { bold: true, shade: 'E8F5F3' }),
      cell('CNE', { bold: true, shade: 'E8F5F3' }),
      ...questions.map((q) => cell(`Q${q.numero} (${q.bareme})`, { bold: true, shade: 'E8F5F3', align: AlignmentType.CENTER })),
      cell(`Total / ${exam.total_points}`, { bold: true, shade: 'E8F5F3', align: AlignmentType.CENTER }),
      cell('/20', { bold: true, shade: 'E8F5F3', align: AlignmentType.CENTER }),
    ],
  });

  const rows = students.map((s, i) => new TableRow({
    children: [
      cell(String(i + 1), { align: AlignmentType.CENTER }),
      cell(`${s.nom} ${s.prenom}`),
      cell(s.cne || '—'),
      ...questions.map((q) => {
        const note = s.notes[q.numero];
        return cell(note === null || note === undefined ? '—' : String(note), { align: AlignmentType.CENTER });
      }),
      cell(s.total === null ? '—' : String(Math.round(s.total * 100) / 100), { bold: true, align: AlignmentType.CENTER }),
      cell(s.norm20 === null ? '—' : String(Math.round(s.norm20 * 100) / 100), {
        bold: true, align: AlignmentType.CENTER,
        shade: s.norm20 === null ? undefined : s.norm20 < 5 ? 'FDE8E8' : s.norm20 < 10 ? 'FFF4E0' : 'E8F6EC',
      }),
    ],
  }));

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'Grille de Notation — Évaluation', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `${exam.titre} — ${exam.niveau} — ${exam.exam_date} — Durée : ${exam.duree} min`, size: 20, color: '666666' })],
        }),
        new Paragraph({ text: `Total : ${exam.total_points} points — Moyenne de la classe : ${analyse.moyenne20 ?? '—'}/20 — Taux de réussite : ${analyse.tauxReussite ?? '—'}%`, spacing: { after: 300 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [header, ...rows],
        }),
        new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Légende : rouge < 5/20 · orange 5–9,99 · vert ≥ 10', size: 16, italics: true, color: '999999' })] }),
      ],
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/** Rapport d'analyse de classe (PDF). */
export function buildAnalysePdf(analyse: ExamAnalyse): Buffer {
  const { exam, questions, students } = analyse;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Rapport d\'Analyse — Évaluation', W / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${exam.titre} — ${exam.niveau} — ${exam.exam_date} — ${exam.duree} min`, W / 2, y, { align: 'center' });
  y += 12;

  // Indicateurs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Indicateurs de la classe', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const profils = analyse.profils;
  doc.text([
    `Indice de la classe (moyenne) : ${analyse.moyenne20 ?? '—'} / 20`,
    `Taux de réussite : ${analyse.tauxReussite ?? '—'} %`,
    `Élèves notés : ${gradedCount(analyse)} / ${students.length}`,
    `Profils — En difficulté : ${profils.en_difficulte} · Dans la moyenne : ${profils.dans_la_moyenne} · En avance : ${profils.en_avance} · Non notés : ${profils.non_note}`,
  ], 14, y);
  y += 26;

  // Histogram
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Distribution des notes (/20)', 14, y);
  y += 6;
  const maxCount = Math.max(1, ...analyse.histogram.map((h) => h.count));
  const colors = ['#EF4444', '#F59E0B', '#34D399', '#10B981'];
  analyse.histogram.forEach((h, i) => {
    const barW = 40;
    const barH = Math.max(1, (h.count / maxCount) * 25);
    const x = 20 + i * (barW + 6);
    doc.setFillColor(colors[i]!);
    doc.rect(x, y + 25 - barH, barW, barH, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.text(`${h.count}`, x + barW / 2, y + 25 - barH - 2, { align: 'center' });
    doc.text(h.bucket, x + barW / 2, y + 30, { align: 'center' });
  });
  doc.setTextColor(0, 0, 0);
  y += 38;

  // Question stats
  if (questions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    if (y > 240) { doc.addPage(); y = 20; }
    doc.text('Taux d\'échec par question', 14, y);
    y += 7;
    doc.setFontSize(9);
    for (const q of analyse.questionStats) {
      if (y > 282) { doc.addPage(); y = 20; }
      const label = `Q${q.numero} (${q.type}, /${q.bareme}) — moyenne : ${q.moyenne ?? '—'} — échec : ${q.tauxEchec ?? '—'}%`;
      doc.setFont('helvetica', q.tauxEchec !== null && q.tauxEchec > 50 ? 'bold' : 'normal');
      doc.text(label.slice(0, 95), 14, y);
      y += 5.5;
    }
  }

  // Profils par élève
  doc.addPage();
  y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Profils des élèves', 14, y);
  y += 8;
  doc.setFontSize(9);
  const groups: Array<[string, string, typeof analyse.profils]> = [
    ['En difficulté (< 10/20)', '#EF4444', { en_difficulte: 1 } as never],
  ];
  void groups;
  for (const profilLabel of ['en_difficulte', 'dans_la_moyenne', 'en_avance'] as const) {
    const list = analyse.students.filter((s) => s.profil === profilLabel);
    if (list.length === 0) continue;
    doc.setFont('helvetica', 'bold');
    doc.text(
      profilLabel === 'en_difficulte' ? `En difficulté (< 10/20) : ${list.length}` :
      profilLabel === 'dans_la_moyenne' ? `Dans la moyenne (10–14,99) : ${list.length}` :
      `En avance (≥ 15/20) : ${list.length}`,
      14, y
    );
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const s of list) {
      if (y > 285) { doc.addPage(); y = 20; }
      doc.text(`• ${s.nom} ${s.prenom} (${s.classe_nom}) — ${s.norm20 ?? '—'}/20`, 18, y);
      y += 5;
    }
    y += 3;
  }

  return Buffer.from(doc.output('arraybuffer'));
}

function gradedCount(analyse: ExamAnalyse): number {
  return analyse.students.filter((s) => s.norm20 !== null).length;
}

/** Grille vierge/remplie en CSV (saisie externe possible, séparateur ';'). */
export function buildGrilleCsv(analyse: ExamAnalyse): string {
  const { exam, questions, students } = analyse;
  const esc = (v: string | number | null) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [
    [`nom`, `prenom`, `CNE`, `classe`, ...questions.map((q) => `Q${q.numero}(/${q.bareme})`), `Total(/${exam.total_points})`, `Note(/20)`].map(esc).join(';'),
  ];
  for (const s of students) {
    lines.push([
      s.nom, s.prenom, s.cne, s.classe_nom,
      ...questions.map((q) => s.notes[q.numero] ?? ''),
      s.total ?? '', s.norm20 === null ? '' : Math.round(s.norm20 * 100) / 100,
    ].map(esc).join(';'));
  }
  return lines.join('\n');
}

function resolveImageToDataUri(url?: string): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('/api/images/')) {
    const filename = url.replace('/api/images/', '');
    try {
      const db = getDb();
      const row = db.prepare('SELECT mime_type, data FROM uploaded_images WHERE filename = ?').get(filename) as { mime_type: string; data: Buffer } | undefined;
      if (row && row.data) {
        return `data:${row.mime_type};base64,${Buffer.from(row.data).toString('base64')}`;
      }
    } catch {
      // fallback
    }
  }
  return url;
}

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mélange aléatoire (dérangement) pour les questions d'appariement / relier.
 * Évite que les réponses de droite ne se trouvent directement en face de leur élément correspondant.
 */
function derangeChoices<T>(items: T[]): T[] {
  if (items.length <= 1) return [...items];
  const original = [...items];

  // Tentatives de dérangement (aucun élément à sa position d'origine)
  for (let attempt = 0; attempt < 30; attempt++) {
    const copy = [...original];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i]!;
      copy[i] = copy[j]!;
      copy[j] = tmp;
    }
    const hasAnyInPlace = copy.some((val, idx) => val === original[idx]);
    if (!hasAnyInPlace) {
      return copy;
    }
  }

  // Décalage circulaire garanti si doublons ou après 30 essais
  return original.map((_, i) => original[(i + 1) % original.length]!);
}

/** Sujet d'évaluation imprimable pour les élèves (PDF) — distinct de la grille enseignant. */
export function buildSujetPdf(analyse: ExamAnalyse): Buffer {
  const { exam, questions } = analyse;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(exam.titre, W / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Niveau : ${exam.niveau}    Date : ${exam.exam_date}    Durée : ${exam.duree} min    Total : ${exam.total_points} pts`, W / 2, y, { align: 'center' });
  y += 10;

  // Cartouche élève
  doc.setDrawColor(30, 41, 59);
  doc.rect(14, y, W - 28, 16);
  doc.setFontSize(9);
  doc.text('Nom & Prénom : .......................................................    Classe : ..........    N° : ......', 17, y + 7);
  doc.text('Note :            / 20', 17, y + 13);
  y += 22;

  if (questions.length === 0) {
    doc.text('Aucune question définie pour cet examen.', 14, y);
    return Buffer.from(doc.output('arraybuffer'));
  }

  let displayQNum = 0;
  for (const q of questions) {
    if (q.type === 'section') {
      if (y > 245) { doc.addPage(); y = 20; }
      y += 3;
      doc.setFillColor(240, 245, 248);
      doc.setDrawColor(15, 76, 92);
      doc.rect(14, y, W - 28, 8, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 76, 92);
      doc.text((q.enonce || 'SECTION').toUpperCase(), 18, y + 5.5);
      doc.setTextColor(0);
      y += 11;

      const desc = typeof q.options === 'object' && q.options?.description ? q.options.description : '';
      if (desc) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(90);
        const descLines = doc.splitTextToSize(desc, W - 34);
        doc.text(descLines, 18, y);
        doc.setTextColor(0);
        y += descLines.length * 4.5 + 2;
      }
      continue;
    }

    displayQNum++;
    if (y > 262) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const baremeText = q.bareme > 0 ? `(${q.bareme} pt${q.bareme > 1 ? 's' : ''})` : '(Sans barème)';
    const header = `Question ${displayQNum}  ${baremeText}`;
    doc.text(header, 14, y);
    y += 6;
    if (q.enonce) {
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(q.enonce, W - 34);
      doc.text(lines, 18, y);
      y += lines.length * 5 + 2;
    }
    if (q.image_url) {
      const dataUri = resolveImageToDataUri(q.image_url);
      if (dataUri && dataUri.startsWith('data:image/')) {
        try {
          if (y > 220) { doc.addPage(); y = 20; }
          const match = dataUri.match(/^data:image\/([a-zA-Z]+);base64,/);
          const rawFmt = (match && match[1]) ? match[1].toUpperCase() : 'PNG';
          const validFmt = (rawFmt === 'JPG' || rawFmt === 'JPEG') ? 'JPEG' : 'PNG';
          doc.addImage(dataUri, validFmt, 18, y, 65, 40);
          y += 44;
        } catch {
          // ignore
        }
      }
    }
    // Rendu spécifique selon le type de question
    if (q.type === 'qcm' && q.options) {
      const isObj = !Array.isArray(q.options) && typeof q.options === 'object';
      const opts: any[] = isObj ? (q.options.items || []) : (Array.isArray(q.options) ? q.options : []);
      const layout: 'vertical' | 'horizontal' = (isObj && q.options.layout) || 'vertical';
      const isSingle: boolean = (isObj && q.options.qcm_mode === 'single');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      if (layout === 'horizontal' && opts.length > 0) {
        const count = opts.length;
        const itemsPerRow = Math.min(count, count <= 3 ? count : 4);
        const colW = (W - 36) / itemsPerRow;
        for (let idx = 0; idx < count; idx++) {
          const colIdx = idx % itemsPerRow;
          if (colIdx === 0 && idx > 0) {
            y += 7;
            if (y > 275) { doc.addPage(); y = 20; }
          }
          const opt = opts[idx];
          const label = String.fromCharCode(65 + idx);
          let text = typeof opt === 'string' ? opt : (opt.text || '');
          if (opt?.isOther) text = `${text || 'Autre (préciser)'} : .......`;
          const posX = 18 + colIdx * colW;
          doc.setDrawColor(120);
          if (isSingle) {
            doc.circle(posX + 2, y - 1, 1.8);
          } else {
            doc.rect(posX, y - 2.8, 3.5, 3.5);
          }
          doc.text(`${label}. ${text}`.slice(0, 26), posX + 6, y);
        }
        y += 8;
      } else {
        for (let idx = 0; idx < opts.length; idx++) {
          const opt = opts[idx];
          if (y > 275) { doc.addPage(); y = 20; }
          const label = String.fromCharCode(65 + idx);
          let text = typeof opt === 'string' ? opt : (opt.text || '');
          if (opt?.isOther) {
            text = `${text || 'Autre (préciser)'} : ..............................................................`;
          }
          doc.setDrawColor(120);
          if (isSingle) {
            doc.circle(19.8, y - 1, 1.8);
          } else {
            doc.rect(18, y - 2.8, 3.5, 3.5);
          }
          doc.text(`${label}.  ${text}`, 24, y);
          y += 6;
        }
        y += 2;
      }
    } else if (q.type === 'tableau' && q.options) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const tableConfig = (q.options.columns && q.options.rows)
        ? q.options
        : { columns: ['Colonne 1', 'Colonne 2', 'Colonne 3'], rows: [] };
      const cols: string[] = tableConfig.columns || [];
      const rows: Array<{ id?: string; cells: string[] }> = tableConfig.rows || [];
      const colCount = Math.max(1, cols.length);
      const colW = (W - 36) / colCount;
      const rowH = 7.5;

      if (y + (rows.length + 1) * rowH > 275) { doc.addPage(); y = 20; }

      // En-tête du tableau
      doc.setFillColor(240, 245, 245);
      doc.setDrawColor(160, 175, 175);
      doc.rect(18, y, W - 36, rowH, 'FD');
      doc.setFont('helvetica', 'bold');
      for (let c = 0; c < cols.length; c++) {
        const cellX = 18 + c * colW;
        if (c > 0) doc.line(cellX, y, cellX, y + rowH);
        doc.text(cols[c] || '', cellX + colW / 2, y + 5, { align: 'center' });
      }
      y += rowH;

      // Lignes du tableau
      doc.setFont('helvetica', 'normal');
      for (const r of rows) {
        if (y + rowH > 275) { doc.addPage(); y = 20; }
        doc.setDrawColor(180, 190, 190);
        doc.rect(18, y, W - 36, rowH);
        for (let c = 0; c < colCount; c++) {
          const cellX = 18 + c * colW;
          if (c > 0) doc.line(cellX, y, cellX, y + rowH);
          const rawCell = r.cells ? r.cells[c] : undefined;
          const val = typeof rawCell === 'string' ? rawCell.trim() : '';
          const colName = (cols[c] || '').toLowerCase().trim();
          const isChoiceCol = colName === 'oui' || colName === 'non' || colName === 'vrai' || colName === 'faux' || val === '□';

          if (isChoiceCol && (!val || val === '□')) {
            doc.setDrawColor(100);
            doc.rect(cellX + colW / 2 - 2, y + 1.8, 3.8, 3.8);
          } else if (val) {
            doc.text(val.slice(0, 35), cellX + 2.5, y + 5);
          } else {
            doc.setTextColor(150);
            doc.text('..........................', cellX + 2.5, y + 5);
            doc.setTextColor(0);
          }
        }
        y += rowH;
      }
      y += 4;
    } else if (q.type === 'vrai_faux' && Array.isArray(q.options) && q.options.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setDrawColor(120);
      for (const item of q.options) {
        if (y > 275) { doc.addPage(); y = 20; }
        const text = typeof item === 'string' ? item : (item.text || '');
        const lines = doc.splitTextToSize(text, W - 70);
        doc.text(lines, 18, y);
        doc.rect(W - 44, y - 2.8, 3.5, 3.5);
        doc.text('Vrai', W - 39, y);
        doc.rect(W - 25, y - 2.8, 3.5, 3.5);
        doc.text('Faux', W - 20, y);
        y += Math.max(lines.length * 5, 6);
      }
      y += 2;
    } else if (q.type === 'appariement' && Array.isArray(q.options) && q.options.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const rightChoices = derangeChoices(q.options.map((p: any) => p.right || ''));
      for (let idx = 0; idx < q.options.length; idx++) {
        const pair = q.options[idx];
        const rightText = rightChoices[idx] || '';
        const leftLines = doc.splitTextToSize(`• ${pair.left || ''}`, (W / 2) - 30);
        const rightLines = doc.splitTextToSize(`• ${rightText}`, (W / 2) - 25);
        const blockH = Math.max(leftLines.length, rightLines.length) * 5;
        if (y + blockH > 275) { doc.addPage(); y = 20; }
        doc.text(leftLines, 18, y);
        doc.text(`[ .......... ]`, W / 2 - 12, y);
        doc.text(rightLines, W / 2 + 10, y);
        y += Math.max(blockH, 6);
      }
      y += 2;
    } else if (q.type === 'exercice' && Array.isArray(q.options) && q.options.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      for (let sIdx = 0; sIdx < q.options.length; sIdx++) {
        if (y > 275) { doc.addPage(); y = 20; }
        const sq = q.options[sIdx];
        const text = typeof sq === 'string' ? sq : (sq.text || '');
        doc.text(`${sIdx + 1})  ${text}`, 18, y);
        y += 5;
        doc.setDrawColor(200);
        doc.line(18, y + 4, W - 20, y + 4);
        y += 7;
      }
      y += 2;
    } else {
      // Espace de réponse libre
      doc.setDrawColor(180);
      const answerH = 20;
      for (let i = 0; i < Math.floor(answerH / 8); i++) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.line(18, y + 6, W - 20, y + 6);
        y += 8;
      }
      y += 4;
    }
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text('Bon courage !', W / 2, 290, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

/** Sujet d'évaluation imprimable pour les élèves (HTML autonome avec styles et images embarquées). */
export function buildSujetHtml(analyse: ExamAnalyse): string {
  const { exam, questions } = analyse;

  const currentYear = new Date().getFullYear();
  const schoolYear = `${currentYear}-${currentYear + 1}`;

  let displayQNum = 0;
  const renderedQuestions = questions.map((q) => {
    if (q.type === 'section') {
      const desc = typeof q.options === 'object' && q.options?.description ? q.options.description : '';
      return `
        <div class="section-divider-card">
          <div class="section-divider-title">${escapeHtml(q.enonce || 'Nouvelle section')}</div>
          ${desc ? `<div class="section-divider-desc">${escapeHtml(desc)}</div>` : ''}
        </div>
      `;
    }

    displayQNum++;
    const qImg = resolveImageToDataUri(q.image_url);
    const imgHtml = qImg ? `<div class="q-img-wrap"><img src="${qImg}" alt="Illustration Q${displayQNum}" class="q-img" /></div>` : '';

    let contentHtml = '';

    if (q.type === 'qcm' && q.options) {
      const isObj = !Array.isArray(q.options) && typeof q.options === 'object';
      const opts: any[] = isObj ? (q.options.items || []) : (Array.isArray(q.options) ? q.options : []);
      const layout: 'vertical' | 'horizontal' = (isObj && q.options.layout) || 'vertical';
      const isSingle: boolean = (isObj && q.options.qcm_mode === 'single');
      const boxSymbol = isSingle ? '○' : '□';

      const optionsList = opts.map((opt, idx) => {
        const label = String.fromCharCode(65 + idx);
        let text = typeof opt === 'string' ? opt : (opt.text || '');
        if (opt?.isOther) text = `${text || 'Autre (préciser)'} : ..............................................................`;
        const optImg = opt?.image_url ? resolveImageToDataUri(opt.image_url) : undefined;
        const optImgHtml = optImg ? `<img src="${optImg}" class="opt-img" alt="${label}" />` : '';

        return `
          <div class="qcm-opt">
            <span class="box-sym">${boxSymbol}</span>
            <span class="opt-label">${label}.</span>
            <span class="opt-text">${escapeHtml(text)}</span>
            ${optImgHtml}
          </div>
        `;
      }).join('');

      contentHtml = `<div class="qcm-grid layout-${layout}">${optionsList}</div>`;
    } else if (q.type === 'tableau' && q.options) {
      const tableConfig = (q.options.columns && q.options.rows)
        ? q.options
        : { columns: ['Colonne 1', 'Colonne 2', 'Colonne 3'], rows: [] };
      const cols: string[] = tableConfig.columns || [];
      const rows: Array<{ id?: string; cells: string[] }> = tableConfig.rows || [];

      const theadHtml = cols.map(c => {
        const clean = (c || '').toLowerCase().trim();
        const isChoice = clean === 'oui' || clean === 'non' || clean === 'vrai' || clean === 'faux';
        return `<th style="${isChoice ? 'text-align: center; width: 85px;' : ''}">${escapeHtml(c)}</th>`;
      }).join('');
      const tbodyHtml = rows.map(r => {
        const cellsHtml = cols.map((colName, cIdx) => {
          const val = r.cells ? (r.cells[cIdx] || '') : '';
          const cleanCol = (colName || '').toLowerCase().trim();
          const isChoiceCol = cleanCol === 'oui' || cleanCol === 'non' || cleanCol === 'vrai' || cleanCol === 'faux' || val === '□';
          if (isChoiceCol && (!val || val === '□')) {
            return `<td style="text-align: center;"><span class="box-sym" style="font-size: 15px;">□</span></td>`;
          }
          return val.trim()
            ? `<td>${escapeHtml(val)}</td>`
            : `<td class="cell-blank"><span class="dots">...................................</span></td>`;
        }).join('');
        return `<tr>${cellsHtml}</tr>`;
      }).join('');

      contentHtml = `
        <div class="table-wrap">
          <table class="exam-table">
            <thead><tr>${theadHtml}</tr></thead>
            <tbody>${tbodyHtml}</tbody>
          </table>
        </div>
      `;
    } else if (q.type === 'vrai_faux' && Array.isArray(q.options) && q.options.length > 0) {
      const rowsHtml = q.options.map(item => {
        const text = typeof item === 'string' ? item : (item.text || '');
        return `
          <tr>
            <td class="vf-prop">${escapeHtml(text)}</td>
            <td class="vf-box"><span class="box-sym">□</span></td>
            <td class="vf-box"><span class="box-sym">□</span></td>
          </tr>
        `;
      }).join('');

      contentHtml = `
        <div class="table-wrap">
          <table class="exam-table vf-table">
            <thead>
              <tr>
                <th>Proposition</th>
                <th style="width: 70px; text-align: center;">Vrai</th>
                <th style="width: 70px; text-align: center;">Faux</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      `;
    } else if (q.type === 'appariement' && Array.isArray(q.options) && q.options.length > 0) {
      const rightChoices = derangeChoices(q.options.map((p: any) => p.right || ''));
      const pairsHtml = q.options.map((pair, idx) => {
        const rightText = rightChoices[idx] || '';
        return `
          <div class="match-pair">
            <span class="match-left">• ${escapeHtml(pair.left || '')}</span>
            <span class="match-box">[ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]</span>
            <span class="match-right">• ${escapeHtml(rightText)}</span>
          </div>
        `;
      }).join('');

      contentHtml = `<div class="match-list">${pairsHtml}</div>`;
    } else if (q.type === 'exercice' && Array.isArray(q.options) && q.options.length > 0) {
      const subQuestionsHtml = q.options.map((sq, sIdx) => {
        const text = typeof sq === 'string' ? sq : (sq.text || '');
        return `
          <div class="sub-q">
            <div class="sub-q-title"><strong>${sIdx + 1})</strong> ${escapeHtml(text)}</div>
            <div class="ruled-lines">
              <div class="line"></div>
              <div class="line"></div>
            </div>
          </div>
        `;
      }).join('');

      contentHtml = `<div class="exercise-list">${subQuestionsHtml}</div>`;
    } else {
      // Question ouverte / réponse libre
      contentHtml = `
        <div class="ruled-lines">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      `;
    }

    return `
      <div class="question-card">
        <div class="question-header">
          <span class="q-badge">Question ${displayQNum}</span>
          <span class="q-pts">${q.bareme > 0 ? `${q.bareme} pt${q.bareme > 1 ? 's' : ''}` : 'Sans barème'}</span>
        </div>
        ${q.enonce ? `<div class="question-enonce">${escapeHtml(q.enonce)}</div>` : ''}
        ${imgHtml}
        <div class="question-body">
          ${contentHtml}
        </div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sujet - ${escapeHtml(exam.titre)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* Toolbar non imprimable */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: #0d3b4c;
      color: #ffffff;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
    }
    .toolbar-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #0f766e;
      color: #ffffff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-print:hover {
      background: #115e59;
    }
    .print-tip {
      font-size: 12px;
      color: #cbd5e1;
    }

    /* Conteneur feuille d'examen */
    .sheet-wrapper {
      padding: 30px 16px;
      display: flex;
      justify-content: center;
    }
    .exam-sheet {
      background: #ffffff;
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      padding: 16mm 18mm;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    /* En-tête officiel marocain */
    .exam-header {
      display: grid;
      grid-template-columns: 1.1fr 1.6fr 1.1fr;
      gap: 16px;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-col {
      font-size: 11px;
      line-height: 1.35;
    }
    .header-left {
      text-align: left;
    }
    .header-left .school-country {
      font-weight: 800;
      letter-spacing: 0.5px;
      font-size: 11px;
    }
    .header-left .school-ministry {
      font-size: 10px;
      color: #334155;
      margin-top: 2px;
    }
    .header-center {
      text-align: center;
    }
    .header-center .exam-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      color: #0f766e;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .header-center .exam-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .header-center .exam-sub {
      font-size: 10.5px;
      color: #64748b;
      margin-top: 3px;
    }
    .header-right {
      text-align: right;
    }
    .header-right p {
      margin: 1px 0;
    }

    /* Cartouche élève */
    .cartouche {
      border: 1.5px solid #0f172a;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 20px;
      font-size: 11.5px;
      background: #fafafa;
    }
    .cartouche-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .cartouche-row:last-child {
      margin-bottom: 0;
    }
    .cartouche-field {
      flex: 1;
    }
    .cartouche-note {
      font-weight: 700;
      border: 1px dashed #0f172a;
      padding: 3px 12px;
      border-radius: 4px;
      background: #fff;
    }

    /* Séparateurs de section / partie */
    .section-divider-card {
      margin: 22px 0 16px;
      padding: 10px 14px;
      background: #f1f5f9;
      border-left: 4px solid #0f766e;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-divider-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .section-divider-desc {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
      font-style: italic;
    }

    /* Questions */
    .question-card {
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 1px dashed #cbd5e1;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .question-card:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    .question-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .q-badge {
      font-weight: 800;
      font-size: 13px;
      color: #0f172a;
      background: #e2e8f0;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .q-pts {
      font-weight: 700;
      font-size: 12px;
      color: #0f766e;
    }
    .question-enonce {
      font-size: 12.5px;
      margin-bottom: 10px;
      color: #1e293b;
      white-space: pre-wrap;
    }
    .q-img-wrap {
      margin: 8px 0 12px;
      text-align: center;
    }
    .q-img {
      max-width: 100%;
      max-height: 240px;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      object-fit: contain;
    }

    /* QCM */
    .qcm-grid {
      display: flex;
      gap: 10px;
      font-size: 12px;
    }
    .qcm-grid.layout-vertical {
      flex-direction: column;
    }
    .qcm-grid.layout-horizontal {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .qcm-opt {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 5px 10px;
      border-radius: 4px;
      flex: 1 1 calc(50% - 10px);
      min-width: 180px;
    }
    .box-sym {
      font-size: 14px;
      color: #475569;
      line-height: 1;
    }
    .opt-label {
      font-weight: 700;
      color: #0f172a;
    }
    .opt-text {
      flex: 1;
      color: #334155;
    }
    .opt-img {
      max-height: 40px;
      max-width: 80px;
      border-radius: 2px;
      border: 1px solid #cbd5e1;
    }

    /* Tableaux */
    .table-wrap {
      overflow-x: auto;
      margin: 8px 0;
    }
    .exam-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .exam-table th, .exam-table td {
      border: 1px solid #94a3b8;
      padding: 6px 10px;
      text-align: left;
    }
    .exam-table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
    }
    .cell-blank {
      color: #94a3b8;
      height: 28px;
    }
    .dots {
      letter-spacing: 1px;
    }

    /* Vrai/Faux */
    .vf-table th, .vf-table td {
      padding: 5px 8px;
    }
    .vf-box {
      text-align: center;
    }

    /* Appariement */
    .match-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 12px;
      margin: 8px 0;
    }
    .match-pair {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #f8fafc;
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
    }
    .match-left, .match-right {
      flex: 1;
      color: #1e293b;
    }
    .match-box {
      font-family: monospace;
      font-weight: bold;
      color: #64748b;
    }

    /* Ruled lines for answer writing */
    .exercise-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 12px;
    }
    .sub-q-title {
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .ruled-lines {
      margin-top: 8px;
    }
    .ruled-lines .line {
      height: 22px;
      border-bottom: 1px dotted #94a3b8;
    }

    /* Footer */
    .exam-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
    }

    /* Impression */
    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }
      .no-print {
        display: none !important;
      }
      .sheet-wrapper {
        padding: 0 !important;
      }
      .exam-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      @page {
        size: A4 portrait;
        margin: 12mm 14mm;
      }
      .question-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <div class="toolbar-title">
      <span>📄 Sujet d'évaluation : <strong>${escapeHtml(exam.titre)}</strong></span>
    </div>
    <div class="toolbar-actions">
      <span class="print-tip">Astuce : Choisissez « Enregistrer au format PDF » pour l'exporter en PDF</span>
      <button onclick="window.print()" class="btn-print">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Imprimer / Exporter en PDF
      </button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="exam-sheet">
      <!-- En-tête officiel -->
      <div class="exam-header">
        <div class="header-col header-left">
          <div class="school-country">ROYAUME DU MAROC</div>
          <div class="school-ministry">Ministère de l'Éducation Nationale,<br>du Préscolaire et des Sports</div>
          <div style="margin-top: 3px; font-weight: 600;">Direction Provinciale</div>
        </div>
        <div class="header-col header-center">
          <div class="exam-badge">ÉVALUATION SOMMATIVE</div>
          <h1 class="exam-title">${escapeHtml(exam.titre)}</h1>
          <div class="exam-sub">Année scolaire : ${schoolYear}</div>
        </div>
        <div class="header-col header-right">
          <p><strong>Niveau :</strong> ${escapeHtml(exam.niveau)}</p>
          <p><strong>Durée :</strong> ${exam.duree} min</p>
          <p><strong>Date :</strong> ${escapeHtml(exam.exam_date)}</p>
          <p><strong>Barème :</strong> /${exam.total_points}</p>
        </div>
      </div>

      <!-- Cartouche élève -->
      <div class="cartouche">
        <div class="cartouche-row">
          <div class="cartouche-field"><strong>Nom & Prénom :</strong> ......................................................................................</div>
          <div style="width: 140px;"><strong>Classe :</strong> ....................</div>
          <div style="width: 80px;"><strong>N° :</strong> .........</div>
        </div>
        <div class="cartouche-row" style="margin-top: 8px;">
          <div class="cartouche-field"><strong>Appréciation :</strong> ..................................................................................</div>
          <div class="cartouche-note"><strong>Note :</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / 20</div>
        </div>
      </div>

      <!-- Corps de l'épreuve -->
      <div class="exam-body">
        ${renderedQuestions || '<p style="text-align: center; color: #64748b;">Aucune question définie pour cet examen.</p>'}
      </div>

      <!-- Pied de page -->
      <div class="exam-footer">
        — Fin de l'épreuve · Bon courage ! —
      </div>
    </div>
  </div>
</body>
</html>`;
}

/** Guide pédagogique du professeur avec corrigé officiel et objectifs didactiques (PDF). */
export function buildGuideProfPdf(analyse: ExamAnalyse): Buffer {
  const { exam, questions } = analyse;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 76, 92); // Teal navy
  doc.text(exam.titre, W / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 100, 20);
  doc.text('GUIDE DU PROFESSEUR — CORRIGÉ OFFICIEL & OBJECTIFS DIDACTIQUES', W / 2, y, { align: 'center' });
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70);
  doc.text(`Niveau : ${exam.niveau}   |   Date : ${exam.exam_date}   |   Durée : ${exam.duree} min   |   Total : ${exam.total_points} points`, W / 2, y, { align: 'center' });
  y += 8;

  // Ligne de séparation
  doc.setDrawColor(200);
  doc.line(14, y, W - 14, y);
  y += 6;

  if (questions.length === 0) {
    doc.text('Aucune question définie.', 14, y);
    return Buffer.from(doc.output('arraybuffer'));
  }

  for (const q of questions) {
    if (y > 250) { doc.addPage(); y = 20; }

    // En-tête question
    doc.setFillColor(240, 248, 246);
    doc.setDrawColor(180, 215, 210);
    doc.rect(14, y, W - 28, 7.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 76, 92);
    doc.text(`Question ${q.numero}  (${q.bareme} pt${q.bareme > 1 ? 's' : ''}) — ${q.type.toUpperCase()}`, 18, y + 5);
    y += 11;

    // Énoncé
    if (q.enonce) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(40);
      doc.text('Énoncé :', 16, y);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(q.enonce, W - 45);
      doc.text(lines, 32, y);
      y += Math.max(lines.length * 4.5, 5) + 3;
    }

    // Objectif & Finalité pédagogique
    const guideCfg = exam.guide_config;
    const override = guideCfg?.questionOverrides?.[q.numero];
    const showCompetence = guideCfg?.visibleSections?.competence !== false && !override?.hiddenSections?.competence;

    if (showCompetence) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(180, 80, 20);
      doc.text('Objectif didactique :', 16, y);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(60);
      const purposeText = override?.custom?.competence
        ? `${override.custom.competence}${override.custom.objectif ? ` — ${override.custom.objectif}` : ''}`
        : q.type === 'qcm'
        ? 'Vérification de la discrimination conceptuelle et identification des terminologies clés.'
        : q.type === 'tableau'
        ? 'Structuration systématique, catégorisation et synthèse des données techniques.'
        : q.type === 'vrai_faux'
        ? 'Évaluation du sens critique et déconstruction des idées reçues sur la notion.'
        : q.type === 'appariement'
        ? 'Mise en relation fonctionnelle et correspondance logique (équipement <-> rôle).'
        : q.type === 'exercice'
        ? 'Mobilisation d\'une démarche de résolution séquentielle par étapes guidées.'
        : 'Capacité de formulation, restitution organisée et argumentation avec vocabulaire technique.';
      const purposeLines = doc.splitTextToSize(purposeText, W - 58);
      doc.text(purposeLines, 50, y);
      y += Math.max(purposeLines.length * 4.5, 5) + 3;
    }

    // Corrigé & Réponse attendue
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(16, 120, 70); // Vert
    doc.text('Corrigé officiel :', 16, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40);

    if (q.type === 'qcm' && q.options) {
      const isObj = !Array.isArray(q.options) && typeof q.options === 'object';
      const opts: any[] = isObj ? (q.options.items || []) : (Array.isArray(q.options) ? q.options : []);
      for (let idx = 0; idx < opts.length; idx++) {
        const opt = opts[idx];
        if (y > 275) { doc.addPage(); y = 20; }
        const label = String.fromCharCode(65 + idx);
        const text = typeof opt === 'string' ? opt : (opt.text || '');
        const isCorr = opt && typeof opt === 'object' && !!opt.isCorrect;
        if (isCorr) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 120, 70);
          doc.text(`[✓ BONNE RÉPONSE]  ${label}. ${text}`, 20, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(40);
        } else {
          doc.setTextColor(120);
          doc.text(`[✗ Distracteur]     ${label}. ${text}`, 20, y);
          doc.setTextColor(40);
        }
        y += 5;
      }
    } else if (q.type === 'vrai_faux' && Array.isArray(q.options)) {
      for (let idx = 0; idx < q.options.length; idx++) {
        const item = q.options[idx];
        if (y > 275) { doc.addPage(); y = 20; }
        const text = typeof item === 'string' ? item : (item.text || '');
        const isVrai = item && typeof item === 'object' && !!item.isVrai;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(isVrai ? 16 : 180, isVrai ? 120 : 30, isVrai ? 70 : 30);
        doc.text(`${idx + 1}. [${isVrai ? 'VRAI' : 'FAUX'}]`, 20, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40);
        doc.text(text.slice(0, 75), 45, y);
        y += 5;
      }
    } else if (q.type === 'tableau' && q.options) {
      const tableConfig = (q.options.columns && q.options.rows) ? q.options : { columns: [], rows: [] };
      const cols: string[] = tableConfig.columns || [];
      const rows: any[] = tableConfig.rows || [];
      doc.setFont('helvetica', 'bold');
      doc.text(`Tableau de référence complété :`, 20, y);
      y += 4.5;
      doc.setFontSize(8);
      for (const r of rows) {
        if (y > 275) { doc.addPage(); y = 20; }
        const rowSummary = (r.cells || []).map((c: string, ci: number) => `${cols[ci] || 'Col'}: ${c || '—'}`).join(' | ');
        doc.text(`• ${rowSummary}`.slice(0, 100), 22, y);
        y += 4.5;
      }
      doc.setFontSize(9);
    } else if (q.type === 'appariement' && Array.isArray(q.options)) {
      for (const pair of q.options) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(`• ${pair.left || ''}  ════▶  ${pair.right || ''}`, 20, y);
        y += 5;
      }
    } else if (q.type === 'exercice' && Array.isArray(q.options)) {
      for (let sIdx = 0; sIdx < q.options.length; sIdx++) {
        if (y > 275) { doc.addPage(); y = 20; }
        const sq = q.options[sIdx];
        const text = typeof sq === 'string' ? sq : (sq.text || '');
        doc.text(`Étape ${sIdx + 1} : ${text}`, 20, y);
        y += 5;
      }
    } else {
      const rep = (q.options && q.options.reponse_attendue) || 'Réponse argumentée attendue avec mots-clés du cours.';
      const repLines = doc.splitTextToSize(`Critères : ${rep}`, W - 40);
      doc.text(repLines, 20, y);
      y += repLines.length * 4.5;
    }

    // Conseils de remédiation
    const showRemediation = guideCfg?.visibleSections?.remediation !== false && !override?.hiddenSections?.remediation;
    if (showRemediation) {
      y += 2;
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(110);
      const remedText = override?.custom?.remediation || 'Piste de remédiation en cas d\'échec collectif : Revoir la notion en groupe de besoin lors de la séance suivante.';
      const remedLines = doc.splitTextToSize(`Piste de remédiation : ${remedText}`, W - 40);
      doc.text(remedLines, 16, y);
      y += Math.max(remedLines.length * 4, 5) + 3;
    }
  }

  return Buffer.from(doc.output('arraybuffer'));
}
