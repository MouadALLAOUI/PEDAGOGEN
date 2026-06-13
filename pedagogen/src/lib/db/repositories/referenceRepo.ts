import { getDb } from "../client";

export interface ReferenceRow {
  id: string;
  user_id: string;
  name: string;
  category: string;
  size_kb: number;
  path: string;
  created_at: string;
}

export const referenceRepo = {
  findById(id: string): ReferenceRow | undefined {
    return getDb()
      .prepare("SELECT * FROM references_files WHERE id = ?")
      .get(id) as ReferenceRow | undefined;
  },

  findByUserId(userId: string): ReferenceRow[] {
    return getDb()
      .prepare(
        "SELECT * FROM references_files WHERE user_id = ? ORDER BY created_at DESC",
      )
      .all(userId) as ReferenceRow[];
  },

  create(ref: Omit<ReferenceRow, "created_at">): void {
    getDb()
      .prepare(
        "INSERT INTO references_files (id, user_id, name, category, size_kb, path) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(ref.id, ref.user_id, ref.name, ref.category, ref.size_kb, ref.path);
  },

  deleteById(id: string): void {
    getDb().prepare("DELETE FROM references_files WHERE id = ?").run(id);
  },
};
