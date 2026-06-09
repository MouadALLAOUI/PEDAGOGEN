import { promises as fs } from 'fs';
import path from 'path';
import type { OutputFormat, GeneratedFile, DocumentType } from '@/types/generation';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated');

export async function ensureGeneratedDir(): Promise<void> {
  try {
    await fs.access(GENERATED_DIR);
  } catch {
    await fs.mkdir(GENERATED_DIR, { recursive: true });
  }
}

export async function saveGeneratedFile(
  buffer: Buffer,
  name: string,
  format: OutputFormat,
  docType: DocumentType
): Promise<GeneratedFile> {
  await ensureGeneratedDir();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const filename = `${id}.${format}`;
  const filePath = path.join(GENERATED_DIR, filename);

  await fs.writeFile(filePath, buffer);

  return {
    name,
    type: docType,
    format,
    url: `/api/downloads/${filename}`,
    sizeKb: Math.round(buffer.length / 1024),
  };
}

export async function getGeneratedFilePath(filename: string): Promise<string | null> {
  try {
    const filePath = path.join(GENERATED_DIR, filename);
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}
