import { getDb } from "./client";

const MIGRATIONS = [
  {
    version: 1,
    name: "initial_schema",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL DEFAULT '',
        matiere TEXT NOT NULL DEFAULT '',
        etablissement TEXT NOT NULL DEFAULT '',
        telephone TEXT NOT NULL DEFAULT '',
        avatar_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS generations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode TEXT NOT NULL CHECK(mode IN ('heavy', 'medium', 'light')),
        metadata TEXT NOT NULL,
        files TEXT NOT NULL DEFAULT '[]',
        tokens_used INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS references_files (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'custom',
        size_kb REAL NOT NULL DEFAULT 0,
        path TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
      CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at);
      CREATE INDEX IF NOT EXISTS idx_references_user_id ON references_files(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key_user ON settings(key, user_id);
    `,
  },
];

export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db
      .prepare("SELECT version FROM _migrations")
      .all()
      .map((r: any) => r.version),
  );

  for (const migration of MIGRATIONS) {
    if (!applied.has(migration.version)) {
      db.exec(migration.sql);
      db.prepare("INSERT INTO _migrations (version, name) VALUES (?, ?)").run(
        migration.version,
        migration.name,
      );
    }
  }
}
