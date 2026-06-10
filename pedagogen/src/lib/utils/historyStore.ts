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

export async function addHistoryEntry(result: GenerationResult): Promise<void> {
  const db = getDb();

  // If a generation with this ID already exists, do not re-insert it
  const existingGen = db.prepare('SELECT id FROM generations WHERE id = ?').get(result.id);
  if (existingGen) {
    return;
  }

  db.prepare(`
    INSERT INTO generations (id, mode, matiere, niveau, lecon, unite, duree, competences, langue, semestre, tokens_used, duration_ms, files_count, zip_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.id,
    result.mode,
    result.metadata.matiere,
    result.metadata.niveau,
    result.metadata.lecon,
    result.metadata.unite,
    result.metadata.duree,
    JSON.stringify(result.metadata.competences),
    result.metadata.langue,
    result.metadata.semestre,
    result.tokensUsed,
    result.durationMs,
    result.files.length,
    result.zipUrl || null
  );

  if (result.files.length > 0) {
    const updateFile = db.prepare(`
      UPDATE generated_files 
      SET generation_id = ?
      WHERE url = ?
    `);

    const insertFile = db.prepare(`
      INSERT INTO generated_files (id, generation_id, name, doc_type, format, storage_path, url, size_kb)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of result.files) {
      const existingFile = db.prepare('SELECT id FROM generated_files WHERE url = ?').get(f.url);
      if (existingFile) {
        updateFile.run(result.id, f.url);
      } else {
        insertFile.run(
          crypto.randomUUID(),
          result.id,
          f.name,
          f.type,
          f.format,
          f.url.split('/').pop() || '',
          f.url,
          f.sizeKb
        );
      }
    }
  }
}
