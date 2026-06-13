import { getDb } from "../client";

export interface SettingRow {
  key: string;
  value: string;
  user_id: string;
  updated_at: string;
}

export const settingsRepo = {
  get(key: string, userId: string): string | undefined {
    const row = getDb()
      .prepare("SELECT value FROM settings WHERE key = ? AND user_id = ?")
      .get(key, userId) as { value: string } | undefined;
    return row?.value;
  },

  set(key: string, value: string, userId: string): void {
    getDb()
      .prepare(
        "INSERT INTO settings (key, value, user_id, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key, user_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
      )
      .run(key, value, userId);
  },

  delete(key: string, userId: string): void {
    getDb()
      .prepare("DELETE FROM settings WHERE key = ? AND user_id = ?")
      .run(key, userId);
  },
};
