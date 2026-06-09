import PptxGenJS from 'pptxgenjs';
import type { CourseMetadata } from '@/types/generation';

const COLORS = {
  navy: '0F172A',
  teal: '0D9488',
  gold: 'D97706',
  white: 'FFFFFF',
  lightGray: 'F1F5F9',
  darkGray: '334155',
  muted: '94A3B8',
};

function addTitleSlide(pptx: PptxGenJS, metadata: CourseMetadata, title: string) {
  const slide = pptx.addSlide();

  // Background
  slide.background = { color: COLORS.navy };

  // Title
  slide.addText(title, {
    x: 0.8,
    y: 1.5,
    w: 8.4,
    h: 1.2,
    fontSize: 32,
    fontFace: 'Calibri',
    color: COLORS.white,
    bold: true,
    align: 'center',
  });

  // Metadata line
  slide.addText(`${metadata.niveau} — ${metadata.matiere} — Semestre ${metadata.semestre}`, {
    x: 0.8,
    y: 2.8,
    w: 8.4,
    h: 0.5,
    fontSize: 16,
    fontFace: 'Calibri',
    color: COLORS.teal,
    align: 'center',
  });

  // Unit + Lesson
  slide.addText(`Unité: ${metadata.unite}\nLeçon: ${metadata.lecon}`, {
    x: 0.8,
    y: 3.5,
    w: 8.4,
    h: 0.8,
    fontSize: 14,
    fontFace: 'Calibri',
    color: COLORS.muted,
    align: 'center',
    lineSpacing: 22,
  });

  // Bottom bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 4.6,
    w: 10,
    h: 0.4,
    fill: { color: COLORS.teal },
  });

  slide.addText('PEDAGOGEN — Assistant Pédagogique IA', {
    x: 0,
    y: 4.6,
    w: 10,
    h: 0.4,
    fontSize: 10,
    fontFace: 'Calibri',
    color: COLORS.white,
    align: 'center',
  });
}

function addSectionSlide(pptx: PptxGenJS, sectionTitle: string, content: string) {
  const slide = pptx.addSlide();

  // Left accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.15,
    h: 5.63,
    fill: { color: COLORS.teal },
  });

  // Section title
  slide.addText(sectionTitle.replace(/_/g, ' ').toUpperCase(), {
    x: 0.6,
    y: 0.3,
    w: 8.8,
    h: 0.6,
    fontSize: 22,
    fontFace: 'Calibri',
    color: COLORS.navy,
    bold: true,
  });

  // Divider
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6,
    y: 1.0,
    w: 2,
    h: 0.04,
    fill: { color: COLORS.teal },
  });

  // Content text
  slide.addText(content, {
    x: 0.6,
    y: 1.3,
    w: 8.8,
    h: 3.8,
    fontSize: 13,
    fontFace: 'Calibri',
    color: COLORS.darkGray,
    lineSpacing: 20,
    valign: 'top',
    wrap: true,
  });
}

function addBulletsSlide(pptx: PptxGenJS, sectionTitle: string, items: string[]) {
  const slide = pptx.addSlide();

  // Left accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.15,
    h: 5.63,
    fill: { color: COLORS.gold },
  });

  // Title
  slide.addText(sectionTitle.replace(/_/g, ' ').toUpperCase(), {
    x: 0.6,
    y: 0.3,
    w: 8.8,
    h: 0.6,
    fontSize: 22,
    fontFace: 'Calibri',
    color: COLORS.navy,
    bold: true,
  });

  // Divider
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6,
    y: 1.0,
    w: 2,
    h: 0.04,
    fill: { color: COLORS.gold },
  });

  // Bullets
  const bulletText = items.map((item) => ({
    text: item,
    options: {
      fontSize: 13,
      fontFace: 'Calibri',
      color: COLORS.darkGray,
      bullet: { code: '2022', color: COLORS.teal },
      lineSpacing: 22,
      paraSpaceAfter: 6,
    },
  }));

  slide.addText(bulletText, {
    x: 0.6,
    y: 1.3,
    w: 8.8,
    h: 3.8,
    valign: 'top',
    wrap: true,
  });
}

function addMetadataSlide(pptx: PptxGenJS, metadata: CourseMetadata) {
  const slide = pptx.addSlide();

  slide.background = { color: COLORS.lightGray };

  slide.addText('Informations du Cours', {
    x: 0.6,
    y: 0.3,
    w: 8.8,
    h: 0.6,
    fontSize: 22,
    fontFace: 'Calibri',
    color: COLORS.navy,
    bold: true,
  });

  const rows = [
    [
      { text: 'Niveau', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: metadata.niveau, options: { fontSize: 12 } },
    ],
    [
      { text: 'Matière', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: metadata.matiere, options: { fontSize: 12 } },
    ],
    [
      { text: 'Unité', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: metadata.unite, options: { fontSize: 12 } },
    ],
    [
      { text: 'Leçon', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: metadata.lecon, options: { fontSize: 12 } },
    ],
    [
      { text: 'Durée', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: `${metadata.duree} minutes`, options: { fontSize: 12 } },
    ],
    [
      { text: 'Semestre', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: `${metadata.semestre}`, options: { fontSize: 12 } },
    ],
    [
      { text: 'Langue', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: metadata.langue.toUpperCase(), options: { fontSize: 12 } },
    ],
    [
      { text: 'Compétences', options: { bold: true, color: COLORS.navy, fontSize: 12 } },
      { text: metadata.competences.join(', '), options: { fontSize: 12 } },
    ],
  ];

  slide.addTable(rows, {
    x: 0.6,
    y: 1.2,
    w: 8.8,
    colW: [2.5, 6.3],
    border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
    rowH: 0.4,
    fill: { color: COLORS.white },
    fontFace: 'Calibri',
  });
}

export async function buildPptx(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();

  // Presentation metadata
  pptx.author = 'PEDAGOGEN';
  pptx.title = title;
  pptx.subject = `${metadata.matiere} — ${metadata.niveau}`;

  // Slide 1: Title
  addTitleSlide(pptx, metadata, title);

  // Slide 2: Metadata
  addMetadataSlide(pptx, metadata);

  // Content slides
  for (const [key, value] of Object.entries(content)) {
    if (typeof value === 'string') {
      // Split long text into paragraphs
      const paragraphs = value.split('\n').filter((p) => p.trim());

      if (paragraphs.length > 8) {
        // Too many lines — split across multiple slides
        const chunks = [];
        for (let i = 0; i < paragraphs.length; i += 6) {
          chunks.push(paragraphs.slice(i, i + 6));
        }
        for (const chunk of chunks) {
          addBulletsSlide(pptx, key, chunk);
        }
      } else if (paragraphs.length > 1) {
        addBulletsSlide(pptx, key, paragraphs);
      } else {
        addSectionSlide(pptx, key, value);
      }
    } else if (Array.isArray(value)) {
      const strItems = value.filter((v): v is string => typeof v === 'string');
      if (strItems.length > 0) {
        addBulletsSlide(pptx, key, strItems);
      }
    } else if (typeof value === 'object' && value !== null) {
      // Nested object — flatten to bullets
      const flatItems: string[] = [];
      for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
        if (typeof subVal === 'string') {
          flatItems.push(`${subKey.replace(/_/g, ' ')}: ${subVal}`);
        }
      }
      if (flatItems.length > 0) {
        addBulletsSlide(pptx, key, flatItems);
      }
    }
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return buffer as Buffer;
}
