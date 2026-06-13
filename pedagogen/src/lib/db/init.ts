import { runMigrations } from "./schema";

let initialized = false;

export function initDb(): void {
  if (initialized) return;
  runMigrations();
  initialized = true;
}
