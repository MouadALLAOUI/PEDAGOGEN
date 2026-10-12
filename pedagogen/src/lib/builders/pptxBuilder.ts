import PptxGenJS from 'pptxgenjs';
import type { CourseMetadata } from '@/types/generation';

export interface SlideData {
  numero?: number;
  phase_pedagogique?: string;
  layout?: string;
  title?: string;
  slide_duration_minutes?: number;
  transition_animation?: string;
  questions_audience?: string[];
  bullets?: string[];
  visuel?: string;
  notes?: string;
}

export interface PresentationContent {
  titre_presentation?: string;
  slides?: SlideData[];
  ordre_slides?: string[];
}

const COLORS = {
  navy: '0F172A',
  teal: '0D9488',
  gold: 'D97706',
  white: 'FFFFFF',
  lightGray: 'F1F5F9',
  darkGray: '334155',
  muted: '94A3B8',
};

const PHASE_COLORS: Record<string, string> = {
  Mise_en_situation: 'D97706',
  Analyse: '0D9488',
  Synthese: '2563EB',
};

const LAYOUT_ACCENTS: Record<string, string> = {
  titre: '0F172A',
  contenu: '0D9488',
  deux_colonnes: '7C3AED',
  image_texte: 'D97706',
  quiz: 'DC2626',
  recapitulatif: '2563EB',
};

function addTitleSlide(pptx: PptxGenJS, metadata: CourseMetadata, title: string) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.navy };

  slide.addText(title, {
    x: 0.8, y: 1.5, w: 8.4, h: 1.2,
    fontSize: 32, fontFace: 'Calibri', color: COLORS.white, bold: true, align: 'center',
  });

  slide.addText(`${metadata.niveau} — ${metadata.matiere} — Semestre ${metadata.semestre}`, {
    x: 0.8, y: 2.8, w: 8.4, h: 0.5,
    fontSize: 16, fontFace: 'Calibri', color: COLORS.teal, align: 'center',
  });

  slide.addText(`Unité: ${metadata.unite}\nLeçon: ${metadata.lecon}`, {
    x: 0.8, y: 3.5, w: 8.4, h: 0.8,
    fontSize: 14, fontFace: 'Calibri', color: COLORS.muted, align: 'center', lineSpacing: 22,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.6, w: 10, h: 0.4, fill: { color: COLORS.teal },
  });
  slide.addText('PEDAGOGEN — Assistant Pédagogique IA', {
    x: 0, y: 4.6, w: 10, h: 0.4,
    fontSize: 10, fontFace: 'Calibri', color: COLORS.white, align: 'center',
  });
}

function addMetadataSlide(pptx: PptxGenJS, metadata: CourseMetadata) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.lightGray };

  slide.addText('Informations du Cours', {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Calibri', color: COLORS.navy, bold: true,
  });

  const rows = [
    [{ text: 'Niveau', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: metadata.niveau, options: { fontSize: 12 } }],
    [{ text: 'Matière', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: metadata.matiere, options: { fontSize: 12 } }],
    [{ text: 'Unité', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: metadata.unite, options: { fontSize: 12 } }],
    [{ text: 'Leçon', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: metadata.lecon, options: { fontSize: 12 } }],
    [{ text: 'Durée', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: `${metadata.duree} minutes`, options: { fontSize: 12 } }],
    [{ text: 'Semestre', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: `${metadata.semestre}`, options: { fontSize: 12 } }],
    [{ text: 'Langue', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: metadata.langue.toUpperCase(), options: { fontSize: 12 } }],
    [{ text: 'Compétences', options: { bold: true, color: COLORS.navy, fontSize: 12 } }, { text: metadata.competences.join(', '), options: { fontSize: 12 } }],
  ];

  slide.addTable(rows, {
    x: 0.6, y: 1.2, w: 8.8, colW: [2.5, 6.3],
    border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
    rowH: 0.4, fill: { color: COLORS.white }, fontFace: 'Calibri',
  });
}

function addContentSlide(
  pptx: PptxGenJS,
  slideData: SlideData,
  index: number,
  metadata: CourseMetadata,
  preambleCount: number = 3,
) {
  const slide = pptx.addSlide();
  const phaseColor = PHASE_COLORS[slideData.phase_pedagogique || ''] || COLORS.navy;
  const layoutColor = LAYOUT_ACCENTS[slideData.layout || ''] || COLORS.teal;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.15, h: 5.63, fill: { color: layoutColor },
  });

  slide.addText((slideData.title || `Diapositive ${index + 1}`).toUpperCase(), {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 36, fontFace: 'Calibri', color: COLORS.navy, bold: true,
  });

  if (slideData.phase_pedagogique) {
    const icons: Record<string, string> = {
      Mise_en_situation: '⏰',
      Analyse: '🧠',
      Synthese: '🎯',
    };
    const icon = icons[slideData.phase_pedagogique] || '💡';
    const durationText = slideData.slide_duration_minutes ? ` (${slideData.slide_duration_minutes} min)` : '';
    slide.addText(`${icon} ${slideData.phase_pedagogique.replace(/_/g, ' ').toUpperCase()}${durationText}`, {
      x: 0.6, y: 0.9, w: 5, h: 0.35,
      fontSize: 10, fontFace: 'Calibri', color: phaseColor, bold: true,
    });
  }

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.3, w: 2, h: 0.04, fill: { color: layoutColor },
  });

  const bullets = slideData.bullets || [];
  let yPos = 1.6;

  if (bullets.length > 0) {
    const limitedBullets = bullets.slice(0, 5);
    const bulletText = limitedBullets.filter(Boolean).map((item) => ({
      text: item,
      options: {
        fontSize: 24, fontFace: 'Calibri', color: COLORS.darkGray,
        bullet: { code: '2022', color: layoutColor },
        lineSpacing: 32, paraSpaceAfter: 10,
      },
    }));

    slide.addText(bulletText, {
      x: 0.6, y: yPos, w: 8.8, h: 3.2,
      valign: 'top', wrap: true,
    });
    yPos += 3.4;
  }

  if (slideData.visuel) {
    slide.addText(`Visuel: ${slideData.visuel}`, {
      x: 0.6, y: Math.max(yPos, 4.0), w: 8.8, h: 0.6,
      fontSize: 9, fontFace: 'Calibri', color: COLORS.gold, italic: true,
    });
    yPos += 0.7;
  }

  let notesParts: string[] = [];
  if (slideData.notes) {
    notesParts.push(slideData.notes);
  }
  if (slideData.transition_animation) {
    notesParts.push(`[Animation: ${slideData.transition_animation}]`);
  }
  if (slideData.questions_audience && slideData.questions_audience.length > 0) {
    const questionsStr = slideData.questions_audience.map(q => `• "${q}"`).join('\n');
    notesParts.push(`[Questions audience:\n${questionsStr}]`);
  }
  const notesText = notesParts.join('\n\n');

  if (notesText) {
    // Speaker notes only, we do not draw visually on slide to avoid overlap with 24pt bullets
    try {
      slide.addNotes(notesText);
    } catch (e) {
      // ignore
    }
  }

  // Slide Footer
  const slideNumber = index + preambleCount + 1;
  slide.addText(`${metadata.niveau} – ${metadata.lecon || 'Informatique'} | Diapositive ${slideNumber}`, {
    x: 0.6, y: 5.2, w: 8.8, h: 0.3,
    fontSize: 9, fontFace: 'Calibri', color: COLORS.muted, align: 'right',
  });
}

function addOrdreSlidesSlide(pptx: PptxGenJS, ordre: string[], preambleCount: number) {
  if (!ordre?.length) return;
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.lightGray };

  slide.addText("Plan de la Présentation", {
    x: 0.6, y: 0.3, w: 8.8, h: 0.6,
    fontSize: 22, fontFace: 'Calibri', color: COLORS.navy, bold: true,
  });

  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 1.0, w: 1.5, h: 0.04, fill: { color: COLORS.teal },
  });

  const steps = ordre.map((item, i) => ({
    text: `${i + 1}. ${item}`,
    options: {
      fontSize: 14, fontFace: 'Calibri', color: COLORS.teal,
      lineSpacing: 24, paraSpaceAfter: 4,
      hyperlink: { slide: i + preambleCount + 1 }
    },
  }));

  slide.addText(steps, {
    x: 0.6, y: 1.3, w: 8.8, h: 3.5,
    valign: 'top', wrap: true,
  });
}

function validateSlideDurations(slides: SlideData[], totalDuration: number): SlideData[] {
  if (!slides.length) return slides;

  // Check if AI-provided durations are already valid and match total duration within +/- 5 mins
  const aiTotalDuration = slides.reduce((sum, s) => sum + (s.slide_duration_minutes || 0), 0);
  if (aiTotalDuration >= totalDuration - 5 && aiTotalDuration <= totalDuration + 5) {
    return slides;
  }

  // Map phases to expected percentage of total duration
  const phaseTarget: Record<string, { pct: number }> = {
    Mise_en_situation: { pct: 0.20 },  // 10 min out of 50
    Analyse: { pct: 0.50 },            // 25 min out of 50
    Synthese: { pct: 0.20 },           // 10 min out of 50
  };

  // Sum durations per phase
  const phaseDurations: Record<string, number> = {};
  for (const s of slides) {
    const phase = s.phase_pedagogique || '';
    const d = s.slide_duration_minutes || 2;
    phaseDurations[phase] = (phaseDurations[phase] || 0) + d;
  }

  // Recalculate slide durations proportionally per phase
  const updatedSlides: SlideData[] = [];
  for (const s of slides) {
    const phase = s.phase_pedagogique || '';
    const target = phaseTarget[phase];
    const slide = { ...s };

    if (target) {
      const targetPhaseMin = Math.round(totalDuration * target.pct);
      const phaseSlideCount = slides.filter(x => x.phase_pedagogique === phase).length;
      if (phaseSlideCount > 0) {
        const avgPerSlide = Math.round(targetPhaseMin / phaseSlideCount);
        slide.slide_duration_minutes = Math.max(1, avgPerSlide);
      }
    } else {
      slide.slide_duration_minutes = 2;
    }
    updatedSlides.push(slide);
  }

  return updatedSlides;
}

export async function buildPptx(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.author = 'PEDAGOGEN';
  pptx.title = title;
  pptx.subject = `${metadata.matiere} — ${metadata.niveau}`;

  const pptContent = content as PresentationContent;
  const displayTitle = pptContent.titre_presentation || title;

  const totalDuration = metadata.duree || 50;
  const validatedSlides = validateSlideDurations(pptContent.slides || [], totalDuration);

  addTitleSlide(pptx, metadata, displayTitle);
  addMetadataSlide(pptx, metadata);

  const hasOrdre = Boolean(pptContent.ordre_slides && pptContent.ordre_slides.length > 0);
  const preambleCount = hasOrdre ? 3 : 2;

  if (hasOrdre) {
    addOrdreSlidesSlide(pptx, pptContent.ordre_slides!, preambleCount);
  }

  for (let i = 0; i < validatedSlides.length; i++) {
    addContentSlide(pptx, validatedSlides[i]!, i, metadata, preambleCount);
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}
