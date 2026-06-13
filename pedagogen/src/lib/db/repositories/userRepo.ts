import { getDb } from "../client";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const userRepo = {
  findById(id: string): UserRow | undefined {
    return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | UserRow
      | undefined;
  },

  findByEmail(email: string): UserRow | undefined {
    return getDb().prepare("SELECT * FROM users WHERE email = ?").get(email) as
      | UserRow
      | undefined;
  },

  create(user: Omit<UserRow, "created_at" | "updated_at">): void {
    getDb()
      .prepare(
        "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
      )
      .run(user.id, user.email, user.password_hash, user.name);
  },
};
