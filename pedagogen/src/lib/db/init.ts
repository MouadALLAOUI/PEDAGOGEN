import { getDb } from "./index";

let initialized = false;

export function initDb(): void {
  if (initialized) return;
  getDb();
  initialized = true;
}
