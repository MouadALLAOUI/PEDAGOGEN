import { getDb } from '@/lib/db';
import { CURRICULUM_DATA } from '@/lib/curriculum/moroccoCollege';

export interface SearchResult {
  ref_type: 'generation' | 'notebook' | 'file' | 'curriculum';
  ref_id: string;
  title: string;
  href: string;
  type_label: string;
  subtitle?: string;
  level?: string;
  subject?: string;
}

const HREFS: Record<string, (id: string, extra?: any) => string> = {
  generation: (_id) => `/history`,
  notebook: (_id) => `/notebook`,
  file: (_id) => `/files`,
  curriculum: (_id, extra) =>
    `/generate?matiere=${encodeURIComponent(extra?.subject || '')}&niveau=${encodeURIComponent(extra?.level || '')}&lecon=${encodeURIComponent(extra?.title || '')}`,
};

const LABELS: Record<SearchResult['ref_type'], string> = {
  generation: 'Leçon générée',
  notebook: 'Carnet de bord',
  file: 'Fichier',
  curriculum: 'Programme MEN',
};

/** Recherche full-text unifiée (FTS5 + Référentiel Collège Marocain). */
export function searchAll(
  query: string,
  limit = 15,
  filters?: { niveau?: string; matiere?: string }
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchResult[] = [];

  // 1. Search Moroccan College Curriculum Database
  for (const [matiere, niveaux] of Object.entries(CURRICULUM_DATA)) {
    if (filters?.matiere && filters.matiere !== matiere) continue;
    for (const [niveau, units] of Object.entries(niveaux)) {
      if (filters?.niveau && filters.niveau !== niveau) continue;
      for (const unit of units) {
        // Match unit title
        if (unit.titre.toLowerCase().includes(q) || (unit.titreArabe && unit.titreArabe.includes(q))) {
          results.push({
            ref_type: 'curriculum',
            ref_id: unit.id,
            title: unit.titre,
            subtitle: `${matiere} • ${niveau} • Semestre ${unit.semestre}`,
            href: `/generate?matiere=${encodeURIComponent(matiere)}&niveau=${encodeURIComponent(niveau)}&unite=${encodeURIComponent(unit.titre)}`,
            type_label: LABELS.curriculum,
            level: niveau,
            subject: matiere,
          });
        }
        // Match lesson title
        for (const lesson of unit.lecons) {
          if (lesson.titre.toLowerCase().includes(q) || (lesson.titreArabe && lesson.titreArabe.includes(q))) {
            results.push({
              ref_type: 'curriculum',
              ref_id: lesson.id,
              title: lesson.titre,
              subtitle: `${matiere} • ${niveau} • S${unit.semestre} • ${unit.titre}`,
              href: `/generate?matiere=${encodeURIComponent(matiere)}&niveau=${encodeURIComponent(niveau)}&unite=${encodeURIComponent(unit.titre)}&lecon=${encodeURIComponent(lesson.titre)}`,
              type_label: LABELS.curriculum,
              level: niveau,
              subject: matiere,
            });
          }
        }
      }
    }
  }

  // 2. Search Database FTS5
  const db = getDb();
  const ftsQuery = q.split(/\s+/).map((w) => `"${w.replace(/"/g, '')}"*`).join(' ');
  try {
    const rows = db.prepare(`
      SELECT ref_type, ref_id, title FROM search_fts
      WHERE search_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit) as any[];

    for (const r of rows) {
      const refType = r.ref_type as SearchResult['ref_type'];
      results.push({
        ref_type: refType,
        ref_id: r.ref_id,
        title: r.title || '(sans titre)',
        href: HREFS[refType]?.(r.ref_id) || '/',
        type_label: LABELS[refType] || String(r.ref_type),
      });
    }
  } catch {
    // If FTS fails or has syntax mismatch, continue with curriculum results
  }

  return results.slice(0, limit);
}
