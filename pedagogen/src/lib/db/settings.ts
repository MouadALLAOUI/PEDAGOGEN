import { getDb } from './index';

export function getDbSetting(key: string, userId?: string): string | undefined {
  try {
    const db = getDb();
    const uid = userId || 'default';
    const row = db
      .prepare(
        "SELECT value FROM settings WHERE key = ? AND (user_id = ? OR user_id = 'default') ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END LIMIT 1"
      )
      .get(key, uid, uid) as { value: string } | undefined;
    return row?.value;
  } catch {
    return undefined;
  }
}

export function getDbSettings(keys: string[], userId?: string): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const key of keys) {
    result[key] = getDbSetting(key, userId);
  }
  return result;
}

export function setDbSetting(key: string, value: string, userId?: string): void {
  const db = getDb();
  const uid = userId || 'default';
  db.prepare(
    "INSERT INTO settings (key, value, user_id, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key, user_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  ).run(key, value, uid);
}
