import JSZip from 'jszip';
import type { GeneratedFile } from '@/types/generation';
import { promises as fs } from 'fs';
import path from 'path';

export async function bundleToZip(files: GeneratedFile[]): Promise<Buffer> {
  const zip = new JSZip();

  const skipped: string[] = [];

  for (const file of files) {
    const filename = file.url.split('/').pop();
    if (!filename) {
      skipped.push(file.name);
      continue;
    }

    const filePath = path.join(process.cwd(), 'data', 'generated', filename);
    try {
      const buffer = await fs.readFile(filePath);
      zip.file(file.name, buffer);
    } catch {
      skipped.push(file.name);
    }
  }

  if (skipped.length > 0) {
    console.warn(`bundleToZip: ${skipped.length} file(s) missing on disk and skipped: ${skipped.join(', ')}`);
  }

  return zip.generateAsync({ type: 'nodebuffer' }) as Promise<Buffer>;
}
