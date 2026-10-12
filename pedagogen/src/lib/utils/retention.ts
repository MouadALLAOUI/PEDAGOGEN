import { stat, unlink } from 'fs';
import { join, resolve, sep } from 'path';
import { promisify } from 'util';
import { getDb } from '@/lib/db';

const statAsync = promisify(stat);
const unlinkAsync = promisify(unlink);

const GENERATED_DIR = join(process.cwd(), 'data', 'generated');

/**
 * Deletes generated_files rows older than maxAgeDays along with their files
 * on disk under data/generated.
 *
 * `created_at` is stored as 'YYYY-MM-DD HH:MM:SS' UTC (sqlite datetime('now')),
 * so the cutoff is computed in UTC in the same format and compared as a string.
 */
export async function cleanupGeneratedFiles(
  maxAgeDays: number
): Promise<{ deleted: number; freedBytes: number }> {
  const result = { deleted: 0, freedBytes: 0 };
  if (!Number.isFinite(maxAgeDays) || maxAgeDays <= 0) return result;

  const db = getDb();
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  const rows = db.prepare(
    'SELECT id, url, size_kb FROM generated_files WHERE created_at < ?'
  ).all(cutoff) as any[];

  if (rows.length === 0) return result;

  const baseDir = resolve(GENERATED_DIR);

  for (const row of rows) {
    try {
      const filename = String(row.url || '').split('/').pop();
      if (!filename) continue;

      const filePath = resolve(baseDir, filename);
      // Containment guard: never delete outside data/generated
      if (!filePath.startsWith(baseDir + sep)) continue;

      let freedBytes = 0;
      try {
        freedBytes = (await statAsync(filePath)).size;
      } catch {
        freedBytes = (row.size_kb || 0) * 1024;
      }

      try {
        await unlinkAsync(filePath);
      } catch {
        // File already gone or unreadable — still drop the stale row.
      }

      db.prepare('DELETE FROM generated_files WHERE id = ?').run(row.id);
      result.deleted += 1;
      result.freedBytes += freedBytes;
    } catch (error) {
      console.error('retention: failed to remove generated file', row?.id, error);
    }
  }

  return result;
}
