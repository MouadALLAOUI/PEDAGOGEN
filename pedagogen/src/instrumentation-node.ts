import { getDb } from '@/lib/db';
import { cleanupGeneratedFiles } from '@/lib/utils/retention';

export async function runBootCleanup() {
  let days = 0;
  try {
    // Schema init may not have run yet — skip silently if the DB/tables
    // are not ready (it happens on first API request anyway).
    const db = getDb();
    const row =
      (db.prepare(
        "SELECT value FROM settings WHERE key = 'retention_days' AND user_id = 'default'"
      ).get() as any) ||
      (db.prepare(
        "SELECT value FROM settings WHERE key = 'retention_days'"
      ).get() as any);
    days = parseInt(row?.value ?? '', 10);
  } catch {
    return;
  }

  if (!Number.isFinite(days) || days <= 0) return;

  try {
    const { deleted, freedBytes } = await cleanupGeneratedFiles(days);
    console.log(
      `[retention] boot cleanup (retention_days=${days}): removed ${deleted} generated file(s), freed ${(freedBytes / 1024).toFixed(1)} KB`
    );
  } catch (error) {
    console.error('[retention] boot cleanup failed:', error);
  }
}
