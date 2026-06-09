import { promises as fs } from 'fs';
import path from 'path';
import type { ReferenceFile, ReferenceCategory } from '@/types/references';

const REFERENCES_DIR = path.join(process.cwd(), 'public', 'references');
const META_FILE = path.join(REFERENCES_DIR, '.metadata.json');

interface MetadataStore {
  [id: string]: { name: string; category: ReferenceCategory; uploadedAt: string };
}

async function readMetadata(): Promise<MetadataStore> {
  try {
    const raw = await fs.readFile(META_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeMetadata(store: MetadataStore): Promise<void> {
  await fs.writeFile(META_FILE, JSON.stringify(store, null, 2));
}

export async function ensureReferencesDir(): Promise<void> {
  try {
    await fs.access(REFERENCES_DIR);
  } catch {
    await fs.mkdir(REFERENCES_DIR, { recursive: true });
  }
}

export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  category: ReferenceCategory
): Promise<ReferenceFile> {
  await ensureReferencesDir();

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const ext = path.extname(filename);
  const storedName = `${id}${ext}`;
  const filePath = path.join(REFERENCES_DIR, storedName);

  await fs.writeFile(filePath, buffer);

  const meta = await readMetadata();
  meta[id] = { name: filename, category, uploadedAt: new Date().toISOString() };
  await writeMetadata(meta);

  return {
    id,
    name: filename,
    category,
    size: buffer.length,
    uploadedAt: new Date(),
    url: `/references/${storedName}`,
  };
}

export async function listReferenceFiles(): Promise<ReferenceFile[]> {
  await ensureReferencesDir();

  const meta = await readMetadata();

  try {
    const entries = await fs.readdir(REFERENCES_DIR);
    const files: ReferenceFile[] = [];

    for (const entry of entries) {
      if (entry === '.gitkeep' || entry.endsWith('.json')) continue;
      const filePath = path.join(REFERENCES_DIR, entry);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const id = path.basename(entry, path.extname(entry));
      const stored = meta[id];

      files.push({
        id,
        name: stored?.name || entry,
        category: stored?.category || 'custom',
        size: stat.size,
        uploadedAt: stored ? new Date(stored.uploadedAt) : stat.mtime,
        url: `/references/${entry}`,
      });
    }

    return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  } catch {
    return [];
  }
}

export async function deleteReferenceFile(id: string): Promise<boolean> {
  await ensureReferencesDir();

  try {
    const entries = await fs.readdir(REFERENCES_DIR);
    for (const entry of entries) {
      if (entry.startsWith(id)) {
        await fs.unlink(path.join(REFERENCES_DIR, entry));

        const meta = await readMetadata();
        delete meta[id];
        await writeMetadata(meta);

        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function readReferenceContent(filename: string): Promise<string | null> {
  try {
    const filePath = path.join(REFERENCES_DIR, filename);
    const buffer = await fs.readFile(filePath);
    return buffer.toString('utf-8');
  } catch {
    return null;
  }
}
