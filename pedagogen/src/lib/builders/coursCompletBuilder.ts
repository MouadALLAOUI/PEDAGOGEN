import { jsPDF, GState } from 'jspdf';
import type { CourseMetadata } from '@/types/generation';
import type { WatermarkInfo } from './pdfBuilder';

export interface CoursCompletContent {
  titre_seance?: string;
  timing_consistency_check?: string;
  variantes_pedagogiques?: string;
  gestion_erreurs_frequentes?: string;
  conseils_surlignage?: string;
  script_enseignant?: {
    Mise_en_situation?: { rappel?: string; situation_probleme?: string };
    Analyse?: { Analyse_SP?: string; Investigation?: string; Generalisation?: string; ENTRAINEMENT?: string };
    Synthese?: { Quiz?: string };
  };
  savoir?: {
    definitions?: { terme: string; definition: string }[];
    schema_reseau?: string;
    exemples_concrets?: string[];
  };
  plan_tableau?: {
    zone_titre?: string; zone_probleme?: string; zone_cours?: string; zone_exercices?: string;
  };
  activites_eleves?: { etape?: string; consigne: string; production_attendue?: string }[];
  annotations?: string;
  contenu_brut?: string;
}

export function normalizeCoursComplet(raw: unknown, fallbackTitle?: string): CoursCompletContent {
  if (!raw || typeof raw !== 'object') {
    const text = typeof raw === 'string' ? raw.trim() : '';
    return {
      titre_seance: fallbackTitle || 'Contenu de Leçon',
      contenu_brut: text,
      script_enseignant: {
        Mise_en_situation: { rappel: '', situation_probleme: text ? text.slice(0, 500) : '' },
        Analyse: { Analyse_SP: '', Investigation: '', Generalisation: text || '', ENTRAINEMENT: '' },
        Synthese: { Quiz: '' },
      },
      savoir: { definitions: [], exemples_concrets: [] },
      plan_tableau: { zone_titre: fallbackTitle || '', zone_probleme: '', zone_cours: '', zone_exercices: '' },
      activites_eleves: [],
    };
  }

  let obj = { ...(raw as Record<string, any>) };

  // 1. Unwrap AI tool wrappers if nested
  if (obj.generate_cours_complet && typeof obj.generate_cours_complet === 'object') {
    obj = obj.generate_cours_complet;
  } else if (obj.cours_complet && typeof obj.cours_complet === 'object') {
    obj = obj.cours_complet;
  } else if (obj.arguments && typeof obj.arguments === 'object') {
    obj = obj.arguments;
  } else if (typeof obj.arguments === 'string') {
    try { obj = JSON.parse(obj.arguments); } catch {}
  } else if (obj.data && typeof obj.data === 'object') {
    obj = obj.data;
  } else if (obj.properties && typeof obj.properties === 'object') {
    obj = obj.properties;
  }

  const findKey = (source: Record<string, any>, ...candidates: string[]): any => {
    if (!source || typeof source !== 'object') return undefined;
    for (const c of candidates) {
      if (source[c] !== undefined && source[c] !== null) return source[c];
      const lower = c.toLowerCase();
      for (const k of Object.keys(source)) {
        if (k.toLowerCase() === lower && source[k] !== undefined && source[k] !== null) {
          return source[k];
        }
      }
    }
    return undefined;
  };

  const titre = String(findKey(obj, 'titre_seance', 'titre', 'title', 'lecon') || fallbackTitle || '');

  // 2. Script Enseignant normalization
  const rawScript = findKey(obj, 'script_enseignant', 'script', 'enseignant_script', 'deroulement') || {};
  let scriptEnseignant: CoursCompletContent['script_enseignant'];

  if (typeof rawScript === 'string') {
    scriptEnseignant = {
      Mise_en_situation: { rappel: '', situation_probleme: '' },
      Analyse: { Analyse_SP: '', Investigation: '', Generalisation: rawScript, ENTRAINEMENT: '' },
      Synthese: { Quiz: '' },
    };
  } else {
    const rawMise = findKey(rawScript, 'Mise_en_situation', 'mise_en_situation', 'phase_1', 'introduction') || {};
    const rawAnalyse = findKey(rawScript, 'Analyse', 'analyse', 'phase_2', 'developpement') || {};
    const rawSynthese = findKey(rawScript, 'Synthese', 'synthese', 'phase_3', 'conclusion', 'bilan') || {};

    scriptEnseignant = {
      Mise_en_situation: {
        rappel: String(findKey(rawMise, 'rappel', 'revision') || ''),
        situation_probleme: String(findKey(rawMise, 'situation_probleme', 'situation', 'probleme') || ''),
      },
      Analyse: {
        Analyse_SP: String(findKey(rawAnalyse, 'Analyse_SP', 'analyse_sp', 'analyse_situation', 'analyse') || ''),
        Investigation: String(findKey(rawAnalyse, 'Investigation', 'investigation', 'recherche') || ''),
        Generalisation: String(findKey(rawAnalyse, 'Generalisation', 'generalisation', 'notions', 'cours') || ''),
        ENTRAINEMENT: String(findKey(rawAnalyse, 'ENTRAINEMENT', 'entrainement', 'Entrainement', 'exercices', 'application') || ''),
      },
      Synthese: {
        Quiz: String(findKey(rawSynthese, 'Quiz', 'quiz', 'evaluation', 'questions') || ''),
      },
    };
  }

  // 3. Savoir normalization
  const rawSavoir = findKey(obj, 'savoir', 'connaissances') || {};
  let definitions: { terme: string; definition: string }[] = [];
  const rawDefs = findKey(rawSavoir, 'definitions', 'def', 'termes');
  if (Array.isArray(rawDefs)) {
    definitions = rawDefs.map((d: any) => {
      if (typeof d === 'string') {
        const parts = d.split(/[:\-–—]/);
        return { terme: parts[0]?.trim() || '', definition: parts.slice(1).join(':').trim() || d };
      }
      if (d && typeof d === 'object') {
        const terme = findKey(d, 'terme', 'mot', 'term', 'concept') || Object.keys(d)[0] || '';
        const def = findKey(d, 'definition', 'def', 'sens', 'description') || Object.values(d)[0] || '';
        return { terme: String(terme), definition: String(def) };
      }
      return { terme: '', definition: String(d || '') };
    }).filter(d => d.terme || d.definition);
  } else if (rawDefs && typeof rawDefs === 'object') {
    definitions = Object.entries(rawDefs).map(([terme, definition]) => ({
      terme,
      definition: typeof definition === 'string' ? definition : JSON.stringify(definition),
    }));
  }

  const rawEx = findKey(rawSavoir, 'exemples_concrets', 'exemples', 'exemples_marocains');
  let exemples_concrets: string[] = [];
  if (Array.isArray(rawEx)) {
    exemples_concrets = rawEx.map((e: any) => typeof e === 'string' ? e : String(e?.texte || e?.description || JSON.stringify(e)));
  } else if (typeof rawEx === 'string') {
    exemples_concrets = rawEx.split('\n').map(s => s.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  }

  const savoir = {
    definitions,
    schema_reseau: String(findKey(rawSavoir, 'schema_reseau', 'schema', 'schema_tableau', 'diagramme') || ''),
    exemples_concrets,
  };

  // 4. Plan du tableau normalization
  const rawPt = findKey(obj, 'plan_tableau', 'tableau') || {};
  const plan_tableau = {
    zone_titre: String(findKey(rawPt, 'zone_titre', 'titre') || ''),
    zone_probleme: String(findKey(rawPt, 'zone_probleme', 'probleme') || ''),
    zone_cours: String(findKey(rawPt, 'zone_cours', 'cours', 'notions') || ''),
    zone_exercices: String(findKey(rawPt, 'zone_exercices', 'exercices') || ''),
  };

  // 5. Activités élèves normalization
  const rawActs = findKey(obj, 'activites_eleves', 'activites', 'eleves_activites');
  let activites_eleves: { etape?: string; consigne: string; production_attendue?: string }[] = [];
  if (Array.isArray(rawActs)) {
    activites_eleves = rawActs.map((a: any, i: number) => {
      if (typeof a === 'string') {
        return { etape: `Activité ${i + 1}`, consigne: a, production_attendue: '' };
      }
      if (a && typeof a === 'object') {
        return {
          etape: String(findKey(a, 'etape', 'titre', 'nom') || `Activité ${i + 1}`),
          consigne: String(findKey(a, 'consigne', 'description', 'instruction') || ''),
          production_attendue: String(findKey(a, 'production_attendue', 'production', 'attendu') || ''),
        };
      }
      return { etape: `Activité ${i + 1}`, consigne: String(a || ''), production_attendue: '' };
    }).filter(a => a.consigne || a.production_attendue);
  }

  // 6. Raw text fallback if structured content is missing
  const rawText = findKey(obj, 'raw', 'content', 'markdown', 'texte', 'text', 'contenu');
  const contenu_brut = typeof rawText === 'string' && rawText.trim().length > 0 ? rawText.trim() : undefined;

  return {
    titre_seance: titre,
    timing_consistency_check: findKey(obj, 'timing_consistency_check', 'timing'),
    variantes_pedagogiques: findKey(obj, 'variantes_pedagogiques', 'variantes'),
    gestion_erreurs_frequentes: findKey(obj, 'gestion_erreurs_frequentes', 'erreurs_frequentes'),
    conseils_surlignage: findKey(obj, 'conseils_surlignage', 'surlignage'),
    script_enseignant: scriptEnseignant,
    savoir,
    plan_tableau,
    activites_eleves,
    annotations: findKey(obj, 'annotations', 'notes', 'remarques'),
    contenu_brut,
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

function drawPhaseBar(doc: jsPDF, text: string, margin: number, contentW: number, y: number): number {
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, contentW, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255);
  doc.text(text, margin + 2, y + 5.5);
  return y + 12;
}

export function buildCoursCompletPdf(
  metadata: CourseMetadata,
  content: CoursCompletContent,
  title: string,
  watermark?: WatermarkInfo,
): Buffer {
  const data = normalizeCoursComplet(content, metadata.lecon);
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

  const se = data.script_enseignant;
  const hasScriptContent = se && (
    se.Mise_en_situation?.rappel || se.Mise_en_situation?.situation_probleme ||
    se.Analyse?.Analyse_SP || se.Analyse?.Investigation || se.Analyse?.Generalisation || se.Analyse?.ENTRAINEMENT ||
    se.Synthese?.Quiz
  );

  if (hasScriptContent && se) {
    y = drawSectionHeading(doc, 'SCRIPT ENSEIGNANT', margin, pageWidth, y);

    if (se.Mise_en_situation?.rappel || se.Mise_en_situation?.situation_probleme) {
      y = drawPhaseBar(doc, '1. MISE EN SITUATION', margin, contentW, y);
      const phaseStartY = y;
      
      // Draw timing column
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Timing réel: ______ min', margin + contentW - 35, phaseStartY - 4);
      
      y = drawField(doc, '🗣️ À DIRE À L\'ORAL (RAPPEL)', se.Mise_en_situation.rappel || '', innerX, y, fieldW, [13, 148, 136], lineH);
      y = drawField(doc, '🗣️ À DIRE À L\'ORAL (SITUATION)', se.Mise_en_situation.situation_probleme || '', innerX, y, fieldW, [180, 83, 9], lineH);
      
      // Draw blue border box
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.4);
      if (y >= phaseStartY) {
        doc.rect(margin, phaseStartY - 2, contentW, y - phaseStartY + 1);
      } else {
        doc.rect(margin, phaseStartY - 2, contentW, 280 - phaseStartY);
        doc.rect(margin, 20, contentW, y - 21);
      }
      y += 6;
    }
    if (se.Analyse?.Analyse_SP || se.Analyse?.Investigation || se.Analyse?.Generalisation || se.Analyse?.ENTRAINEMENT) {
      y = drawPhaseBar(doc, '2. ANALYSE', margin, contentW, y);
      const phaseStartY = y;
      
      // Draw timing column
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Timing réel: ______ min', margin + contentW - 35, phaseStartY - 4);
      
      y = drawField(doc, '🗣️ À DIRE À L\'ORAL (ANALYSE SP)', se.Analyse.Analyse_SP || '', innerX, y, fieldW, [13, 148, 136], lineH);
      y = drawField(doc, '🗣️ À DIRE À L\'ORAL (INVESTIGATION)', se.Analyse.Investigation || '', innerX, y, fieldW, [180, 83, 9], lineH);
      y = drawField(doc, '✍️ À ÉCRIRE AU TABLEAU (GÉNÉRALISATION)', se.Analyse.Generalisation || '', innerX, y, fieldW, [124, 58, 237], lineH);
      y = drawField(doc, '✍️ À ÉCRIRE AU TABLEAU (ENTRAÎNEMENT)', se.Analyse.ENTRAINEMENT || '', innerX, y, fieldW, [13, 148, 136], lineH);
      
      // Draw green border box
      doc.setDrawColor(22, 163, 74);
      doc.setLineWidth(0.4);
      if (y >= phaseStartY) {
        doc.rect(margin, phaseStartY - 2, contentW, y - phaseStartY + 1);
      } else {
        doc.rect(margin, phaseStartY - 2, contentW, 280 - phaseStartY);
        doc.rect(margin, 20, contentW, y - 21);
      }
      y += 6;
    }
    if (se.Synthese?.Quiz) {
      y = drawPhaseBar(doc, '3. SYNTHÈSE', margin, contentW, y);
      const phaseStartY = y;
      
      // Draw timing column
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Timing réel: ______ min', margin + contentW - 35, phaseStartY - 4);
      
      y = drawField(doc, '🗣️ À DIRE À L\'ORAL (QUIZ)', se.Synthese.Quiz || '', innerX, y, fieldW, [13, 148, 136], lineH);
      
      // Draw purple border box
      doc.setDrawColor(124, 58, 237);
      doc.setLineWidth(0.4);
      if (y >= phaseStartY) {
        doc.rect(margin, phaseStartY - 2, contentW, y - phaseStartY + 1);
      } else {
        doc.rect(margin, phaseStartY - 2, contentW, 280 - phaseStartY);
        doc.rect(margin, 20, contentW, y - 21);
      }
      y += 6;
    }
  }

  // Fallback for unstructured text / markdown
  if (data.contenu_brut && !hasScriptContent) {
    y += 4;
    y = drawSectionHeading(doc, 'CONTENU DE LA LEÇON', margin, pageWidth, y);
    const lines = doc.splitTextToSize(data.contenu_brut, contentW);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60);
      doc.text(line, margin, y);
      y += 4;
    }
  }

  if (data.variantes_pedagogiques || data.gestion_erreurs_frequentes || data.conseils_surlignage) {
    y += 4;
    y = drawSectionHeading(doc, 'VARIATION & ACCOMPAGNEMENT', margin, pageWidth, y);
    y = drawField(doc, 'VARIANTES PÉDAGOGIQUES', data.variantes_pedagogiques || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, 'GESTION ERREURS', data.gestion_erreurs_frequentes || '', innerX, y, fieldW, [180, 83, 9], lineH);
    y = drawField(doc, 'CONSEILS SURLIGNAGE', data.conseils_surlignage || '', innerX, y, fieldW, [124, 58, 237], lineH);
  }

  const sv = data.savoir;
  const hasSavoirContent = sv && (
    (sv.definitions && sv.definitions.length > 0) || sv.schema_reseau || (sv.exemples_concrets && sv.exemples_concrets.length > 0)
  );
  if (hasSavoirContent && sv) {
    y += 4;
    y = drawSectionHeading(doc, 'SAVOIR', margin, pageWidth, y);

    if (sv.definitions?.length) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Définitions', margin, y);
      y += 6;
      for (const def of sv.definitions) {
        if (y > 265) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(13, 148, 136);
        doc.text(`✍️ ${def.terme || ''}`, innerX, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(def.definition || '', fieldW - doc.getTextWidth(def.terme || '') - 4);
        doc.text(lines, innerX + doc.getTextWidth(def.terme || '') + 2, y);
        y += lines.length * lineH + 2;
      }
    }
    
    if (sv.schema_reseau) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFont('courier', 'normal');
      const schemaText = sv.schema_reseau
        .replace(/->/g, ' → ')
        .replace(/--/g, ' ─ ')
        .replace(/\|/g, ' │ ');
      y = drawField(doc, '✍️ SCHÉMA RÉSEAU', schemaText, innerX, y, fieldW, [13, 148, 136], lineH);
    }
    if (sv.exemples_concrets?.length) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Exemples concrets', margin, y);
      y += 6;
      for (const ex of sv.exemples_concrets) {
        if (y > 268) { doc.addPage(); y = 20; }
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        doc.text(`• ${ex}`, innerX, y);
        y += 4;
      }
    }
  }

  const pt = data.plan_tableau;
  const hasPlanContent = pt && (pt.zone_titre || pt.zone_probleme || pt.zone_cours || pt.zone_exercices);
  if (hasPlanContent && pt) {
    y += 4;
    y = drawSectionHeading(doc, 'PLAN DU TABLEAU', margin, pageWidth, y);
    y = drawField(doc, '✍️ ZONE TITRE', pt.zone_titre || '', innerX, y, fieldW, [13, 148, 136], lineH);
    y = drawField(doc, '✍️ ZONE PROBLÈME', pt.zone_probleme || '', innerX, y, fieldW, [180, 83, 9], lineH);
    y = drawField(doc, '✍️ ZONE COURS', pt.zone_cours || '', innerX, y, fieldW, [124, 58, 237], lineH);
    y = drawField(doc, '✍️ ZONE EXERCICES', pt.zone_exercices || '', innerX, y, fieldW, [13, 148, 136], lineH);
  }

  const acts = data.activites_eleves;
  if (acts?.length) {
    y += 4;
    y = drawSectionHeading(doc, 'ACTIVITÉS ÉLÈVES', margin, pageWidth, y);
    for (const a of acts) {
      if (y > 255) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text(a.etape || '', margin, y);
      y += 5;
      y = drawField(doc, 'CONSIGNE', a.consigne || '', innerX, y, fieldW, [13, 148, 136], lineH);
      y = drawField(doc, 'PRODUCTION', a.production_attendue || '', innerX, y, fieldW, [180, 83, 9], lineH);
      y += 2;
      if (y < 275) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 4;
      }
    }
  }

  if (data.annotations) {
    y += 4;
    y = drawSectionHeading(doc, 'ANNOTATIONS', margin, pageWidth, y);
    if (y > 268) { doc.addPage(); y = 20; }
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    const lines = doc.splitTextToSize(data.annotations, contentW);
    doc.text(lines, margin, y);
  }

  return Buffer.from(doc.output('arraybuffer'));
}
