import JSZip from 'jszip';
import type { GeneratedFile } from '@/types/generation';
import { promises as fs } from 'fs';
import path from 'path';

export async function bundleToZip(files: GeneratedFile[]): Promise<Buffer> {
  const zip = new JSZip();

  for (const file of files) {
    const filename = file.url.split('/').pop();
    if (!filename) continue;

    const filePath = path.join(process.cwd(), 'data', 'generated', filename);
    try {
      const buffer = await fs.readFile(filePath);
      zip.file(file.name, buffer);
    } catch {
      // Skip files that can't be read
    }
  }

  return zip.generateAsync({ type: 'nodebuffer' }) as Promise<Buffer>;
}
