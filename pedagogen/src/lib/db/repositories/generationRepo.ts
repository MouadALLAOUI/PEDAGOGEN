import { getDb } from "../client";

export interface GenerationRow {
  id: string;
  user_id: string;
  mode: string;
  metadata: string;
  files: string;
  tokens_used: number;
  duration_ms: number;
  created_at: string;
}

export const generationRepo = {
  findById(id: string): GenerationRow | undefined {
    return getDb().prepare("SELECT * FROM generations WHERE id = ?").get(id) as
      | GenerationRow
      | undefined;
  },

  findByUserId(userId: string, limit = 50): GenerationRow[] {
    return getDb()
      .prepare(
        "SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
      )
      .all(userId, limit) as GenerationRow[];
  },

  create(gen: Omit<GenerationRow, "created_at">): void {
    getDb()
      .prepare(
        "INSERT INTO generations (id, user_id, mode, metadata, files, tokens_used, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        gen.id,
        gen.user_id,
        gen.mode,
        gen.metadata,
        gen.files,
        gen.tokens_used,
        gen.duration_ms,
      );
  },
};
