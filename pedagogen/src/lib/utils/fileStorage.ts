import { readFile, unlink, writeFile, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { getDb } from '@/lib/db';
import type { ReferenceFile, ReferenceCategory } from '@/types/references';

const readFileAsync = promisify(readFile);
const unlinkAsync = promisify(unlink);
const writeFileAsync = promisify(writeFile);

const REFERENCES_DIR = join(process.cwd(), 'data', 'references');
if (!existsSync(REFERENCES_DIR)) mkdirSync(REFERENCES_DIR, { recursive: true });

export async function listReferenceFiles(): Promise<ReferenceFile[]> {
  const db = getDb();
  const files = db.prepare(
    'SELECT * FROM reference_files ORDER BY uploaded_at DESC'
  ).all() as any[];

  return files.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category as ReferenceCategory,
    size: f.size,
    uploadedAt: new Date(f.uploaded_at),
    url: `/api/references/download/${f.id}`,
    enabled: !!f.enabled,
    builtin: !!f.builtin,
  }));
}

export async function readReferenceContent(id: string): Promise<string | null> {
  try {
    const db = getDb();
    const record = db.prepare(
      'SELECT storage_path FROM reference_files WHERE id = ?'
    ).get(id) as any;

    if (!record) return null;

    const filePath = join(REFERENCES_DIR, record.storage_path);
    return await readFileAsync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export async function saveReferenceFile(
  name: string,
  category: string,
  buffer: Buffer
): Promise<{ id: string; name: string; category: string; size: number; url: string }> {
  const db = getDb();
  const id = crypto.randomUUID();
  const ext = name.split('.').pop() || 'bin';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

  const filePath = join(REFERENCES_DIR, storagePath);
  await writeFileAsync(filePath, buffer);

  db.prepare(`
    INSERT INTO reference_files (id, name, category, size, storage_path)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name, category, buffer.length, storagePath);

  return {
    id,
    name,
    category,
    size: buffer.length,
    url: `/api/references/download/${id}`,
  };
}

export async function deleteReferenceFile(id: string): Promise<boolean> {
  try {
    const db = getDb();
    const record = db.prepare(
      'SELECT storage_path FROM reference_files WHERE id = ?'
    ).get(id) as any;

    if (!record) return false;

    const filePath = join(REFERENCES_DIR, record.storage_path);
    try { await unlinkAsync(filePath); } catch {}

    db.prepare('DELETE FROM reference_files WHERE id = ?').run(id);
    return true;
  } catch {
    return false;
  }
}

export async function getReferenceRecord(id: string): Promise<{ storage_path: string; name: string } | null> {
  const db = getDb();
  const record = db.prepare(
    'SELECT storage_path, name FROM reference_files WHERE id = ?'
  ).get(id) as any;
  return record || null;
}

export async function getReferenceFilePath(id: string): Promise<string | null> {
  const record = await getReferenceRecord(id);
  if (!record) return null;
  return join(REFERENCES_DIR, record.storage_path);
}

export async function getGeneratedFilePath(filename: string): Promise<string | null> {
  const GENERATED_DIR = join(process.cwd(), 'data', 'generated');
  const filePath = join(GENERATED_DIR, filename);
  if (existsSync(filePath)) return filePath;
  return null;
}
