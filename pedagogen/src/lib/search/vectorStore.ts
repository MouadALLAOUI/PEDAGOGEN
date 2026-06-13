import { getDb } from '@/lib/db';
import { readReferenceContent } from '@/lib/utils/fileStorage';

const HF_EMBED_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

export interface SearchResult {
  fileId: string;
  fileName: string;
  chunkText: string;
  score: number;
}

async function getEmbedding(text: string): Promise<number[]> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error('HF_TOKEN not set');

  const res = await fetch(HF_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error: ${res.status} ${err}`);
  }

  const data: number[] = await res.json();
  return data.map((x) => x ?? 0);
}

async function getEmbeddingBatch(texts: string[]): Promise<number[][]> {
  const token = process.env.HF_TOKEN;
  if (!token) throw new Error('HF_TOKEN not set');

  const res = await fetch(HF_EMBED_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: texts }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding API error: ${res.status} ${err}`);
  }

  const data: number[][] = await res.json();
  return data.map((v) => v.map((x) => x ?? 0));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    na += (a[i] ?? 0) * (a[i] ?? 0);
    nb += (b[i] ?? 0) * (b[i] ?? 0);
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function chunkText(text: string, maxLen = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    if ((current + '\n' + trimmed).length > maxLen * 4) {
      if (current) chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + '\n' + trimmed : trimmed;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export async function indexReferenceFile(fileId: string): Promise<void> {
  const db = getDb();
  const record = db.prepare('SELECT name, storage_path FROM reference_files WHERE id = ?').get(fileId) as any;
  if (!record) return;

  const content = await readReferenceContent(fileId);
  if (!content || content.length < 10) return;

  db.prepare('DELETE FROM reference_embeddings WHERE file_id = ?').run(fileId);

  const chunks = chunkText(content);
  const insert = db.prepare(
    'INSERT INTO reference_embeddings (file_id, chunk_index, chunk_text, embedding) VALUES (?, ?, ?, ?)'
  );

  const insertBatch = db.transaction((chunks: string[]) => {
    for (let i = 0; i < chunks.length; i++) {
      insert.run(fileId, i, chunks[i], null);
    }
  });
  insertBatch(chunks);

  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    try {
      const embeddings = await getEmbeddingBatch(batch);
      for (let j = 0; j < batch.length; j++) {
        db.prepare('UPDATE reference_embeddings SET embedding = ? WHERE file_id = ? AND chunk_index = ?')
          .run(JSON.stringify(embeddings[j]), fileId, i + j);
      }
    } catch (err) {
      console.error(`Embedding batch ${i} failed for ${record.name}:`, err);
    }
  }

  db.prepare(
    'INSERT OR REPLACE INTO embed_index_status (file_id, indexed_at) VALUES (?, datetime(\'now\'))'
  ).run(fileId);
}

export async function indexAllEnabledReferences(): Promise<number> {
  const db = getDb();
  const files = db.prepare('SELECT id, name FROM reference_files WHERE enabled = 1').all() as any[];
  let count = 0;
  for (const f of files) {
    try {
      await indexReferenceFile(f.id);
      count++;
    } catch (err) {
      console.error(`Index failed for ${f.name}:`, err);
    }
  }
  return count;
}

export async function searchReferences(query: string, limit = 10): Promise<SearchResult[]> {
  const queryEmbedding = await getEmbedding(query);

  const db = getDb();
  const rows = db.prepare(`
    SELECT e.file_id, e.chunk_text, e.embedding, f.name as file_name
    FROM reference_embeddings e
    JOIN reference_files f ON f.id = e.file_id
    WHERE f.enabled = 1 AND e.embedding IS NOT NULL
  `).all() as any[];

  const scored: SearchResult[] = [];

  for (const row of rows) {
    const emb: number[] = JSON.parse(row.embedding);
    const score = cosineSimilarity(queryEmbedding, emb);
    scored.push({
      fileId: row.file_id,
      fileName: row.file_name,
      chunkText: row.chunk_text,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function getIndexStatus(): Promise<{ fileId: string; fileName: string; indexed: boolean }[]> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.id, f.name, e.file_id IS NOT NULL as indexed
    FROM reference_files f
    LEFT JOIN embed_index_status e ON e.file_id = f.id
    WHERE f.enabled = 1
    ORDER BY f.name
  `).all() as any[];
  return rows.map((r: any) => ({
    fileId: r.id,
    fileName: r.name,
    indexed: !!r.indexed,
  }));
}
