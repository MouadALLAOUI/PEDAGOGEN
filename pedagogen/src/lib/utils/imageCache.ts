import { getDb } from '@/lib/db';
import { join } from 'path';
import { existsSync, writeFileSync, mkdirSync } from 'fs';

const IMAGES_DIR = join(process.cwd(), 'data', 'images');
if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

function hashPrompt(prompt: string): string {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function getCachedImage(prompt: string): { filePath: string; url: string } | null {
  const db = getDb();
  const h = hashPrompt(prompt);
  const row = db.prepare(
    'SELECT storage_path, url FROM image_cache WHERE prompt_hash = ?'
  ).get(h) as any;

  if (!row) return null;

  const filePath = join(IMAGES_DIR, row.storage_path);
  if (!existsSync(filePath)) return null;

  return { filePath, url: row.url };
}

export function saveCachedImage(
  prompt: string,
  buffer: Buffer,
  tokensUsed: number = 0
): { filePath: string; url: string } {
  const db = getDb();
  const h = hashPrompt(prompt);
  const storagePath = `img-${h}.png`;
  const filePath = join(IMAGES_DIR, storagePath);
  const url = `/api/images/${storagePath}`;

  writeFileSync(filePath, buffer);

  // Upsert cache entry
  const existing = db.prepare('SELECT id FROM image_cache WHERE prompt_hash = ?').get(h);
  if (existing) {
    db.prepare(
      'UPDATE image_cache SET storage_path = ?, url = ?, tokens_used = ? WHERE prompt_hash = ?'
    ).run(storagePath, url, tokensUsed, h);
  } else {
    db.prepare(
      'INSERT INTO image_cache (id, prompt_hash, prompt, storage_path, url, tokens_used) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(crypto.randomUUID(), h, prompt, storagePath, url, tokensUsed);
  }

  return { filePath, url };
}

export function listCachedImages(): Array<{
  id: string;
  prompt: string;
  url: string;
  tokensUsed: number;
  createdAt: string;
}> {
  const db = getDb();
  const rows = db.prepare(
    'SELECT id, prompt, url, tokens_used, created_at FROM image_cache ORDER BY created_at DESC'
  ).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    prompt: r.prompt,
    url: r.url,
    tokensUsed: r.tokens_used,
    createdAt: r.created_at,
  }));
}

export async function generateFluxImage(prompt: string): Promise<Buffer> {
  const response = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FLUX generation failed: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

