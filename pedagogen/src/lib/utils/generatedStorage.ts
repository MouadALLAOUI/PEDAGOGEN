import { writeFile, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { getDb } from '@/lib/db';
import type { OutputFormat, GeneratedFile, DocumentType, CourseMetadata } from '@/types/generation';


const writeFileAsync = promisify(writeFile);

const GENERATED_DIR = join(process.cwd(), 'data', 'generated');
if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true });

export async function saveGeneratedFile(
  buffer: Buffer,
  name: string,
  format: OutputFormat,
  docType: DocumentType,
  generationId?: string
): Promise<GeneratedFile> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const storagePath = `${id}.${format}`;
  const filePath = join(GENERATED_DIR, storagePath);

  await writeFileAsync(filePath, buffer);

  const url = `/api/downloads/${storagePath}`;

  const db = getDb();
  const dbId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO generated_files (id, generation_id, name, doc_type, format, storage_path, url, size_kb)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dbId,
    generationId || null,
    name,
    docType,
    format,
    storagePath,
    url,
    Math.round(buffer.length / 1024)
  );

  return {
    id: dbId,
    name,
    type: docType,
    format,
    url,
    sizeKb: Math.round(buffer.length / 1024),
  };
}

export function getDynamicFilename(label: string, metadata: CourseMetadata, fmt: string): string {
  const sanitize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');

  const labelClean = sanitize(label);
  const niveauClean = sanitize(metadata.niveau);
  const matiereClean = sanitize(metadata.matiere);
  const leconClean = sanitize(metadata.lecon);

  return `${labelClean}_${niveauClean}_${matiereClean}_${leconClean}.${fmt}`;
}

