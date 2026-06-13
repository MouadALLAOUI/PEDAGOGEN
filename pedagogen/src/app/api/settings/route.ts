import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT key, value FROM settings WHERE user_id = 'default'")
      .all() as { key: string; value: string }[];

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getDb();

    db.prepare("INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES ('default', 'default@local', '', 'Default')").run();

    const upsert = db.prepare(
      "INSERT INTO settings (key, value, user_id, updated_at) VALUES (?, ?, 'default', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    );

    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(body as Record<string, string>)) {
        upsert.run(key, String(value));
      }
    });
    tx();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Settings save error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save settings" },
      { status: 500 },
    );
  }
}
