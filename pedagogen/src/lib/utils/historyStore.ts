import { getDb } from '@/lib/db';
import type { GenerationResult } from '@/types/generation';

export interface HistoryEntry {
  id: string;
  mode: string;
  matiere: string;
  niveau: string;
  lecon: string;
  createdAt: string;
  filesCount: number;
  tokensUsed: number;
  files: { name: string; url: string; format: string }[];
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const db = getDb();
  const generations = db.prepare(
    'SELECT * FROM generations ORDER BY created_at DESC LIMIT 50'
  ).all() as any[];

  const entries: HistoryEntry[] = [];

  for (const gen of generations) {
    const files = db.prepare(
      'SELECT name, url, format FROM generated_files WHERE generation_id = ?'
    ).all(gen.id) as any[];

    entries.push({
      id: gen.id,
      mode: gen.mode,
      matiere: gen.matiere,
      niveau: gen.niveau,
      lecon: gen.lecon,
      createdAt: gen.created_at,
      filesCount: gen.files_count,
      tokensUsed: gen.tokens_used,
      files: files || [],
    });
  }

  return entries;
}

export async function addHistoryEntry(result: GenerationResult, userId?: string): Promise<void> {
  const db = getDb();
  if (!result || !result.id) return;

  try {
    const existingGen = db.prepare('SELECT id FROM generations WHERE id = ?').get(result.id);
    if (existingGen) return;

    const meta = result.metadata || {} as any;
    db.prepare(`
      INSERT INTO generations (id, user_id, mode, metadata, matiere, niveau, lecon, unite, duree, competences, langue, semestre, tokens_used, duration_ms, files_count, zip_url, files)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      String(result.id),
      userId || null,
      String(result.mode || ''),
      JSON.stringify(meta),
      String(meta.matiere || ''),
      String(meta.niveau || ''),
      String(meta.lecon || ''),
      String(meta.unite || ''),
      Number(meta.duree) || 50,
      JSON.stringify(meta.competences || []),
      String(meta.langue || 'francais'),
      Number(meta.semestre) || 1,
      Number(result.tokensUsed) || 0,
      Number(result.durationMs) || 0,
      (result.files && Array.isArray(result.files)) ? result.files.length : 0,
      result.zipUrl || null,
      JSON.stringify(result.files || [])
    );

    if (result.files && Array.isArray(result.files) && result.files.length > 0) {
      const updateFile = db.prepare('UPDATE generated_files SET generation_id = ? WHERE url = ?');
      const insertFile = db.prepare(`
        INSERT INTO generated_files (id, generation_id, name, doc_type, format, storage_path, url, size_kb)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const f of result.files) {
        if (!f || !f.url) continue;
        const url = String(f.url);
        const existingFile = db.prepare('SELECT id FROM generated_files WHERE url = ?').get(url);
        if (existingFile) {
          updateFile.run(String(result.id), url);
        } else {
          insertFile.run(
            crypto.randomUUID(),
            String(result.id),
            String(f.name || ''),
            String((f as any).type || (f as any).docType || ''),
            String(f.format || ''),
            url.split('/').pop() || '',
            url,
            Number(f.sizeKb) || 0
          );
        }
      }
    }
  } catch (err) {
    console.error('addHistoryEntry error:', err);
  }
}
