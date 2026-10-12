import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const db = getDb();
    const rows = db
      .prepare("SELECT key, value FROM settings WHERE user_id = ? OR user_id = 'default' ORDER BY CASE WHEN user_id = ? THEN 1 ELSE 0 END")
      .all(userId, userId) as { key: string; value: string }[];

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    // Mask huggingface_token so full secret is not leaked to client
    if (settings.huggingface_token && settings.huggingface_token.length > 8) {
      const token = settings.huggingface_token;
      settings.huggingface_token = token.slice(0, 4) + '****' + token.slice(-4);
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
    const userId = request.headers.get('x-user-id') || 'default';
    const body = await request.json();
    const db = getDb();

    db.prepare("INSERT OR IGNORE INTO users (id, email, password_hash, full_name) VALUES (?, 'user@pedagogen.ma', '', 'User')").run(userId);

    const upsert = db.prepare(
      "INSERT INTO settings (key, value, user_id, updated_at) VALUES (?, ?, ?, datetime('now')) ON CONFLICT(key, user_id) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
    );

    // If huggingface_token is being posted and looks masked (contains ****), keep the existing stored token
    const entries = Object.entries(body as Record<string, string>);
    const tx = db.transaction(() => {
      for (const [key, value] of entries) {
        if (key === 'huggingface_token' && value.includes('****')) {
          // Do not overwrite with the masked placeholder
          continue;
        }
        upsert.run(key, String(value), userId);
        if (userId !== 'default' && ['default_format', 'provider', 'opencode_model', 'filigran_enabled', 'notifications_enabled', 'debug_mode'].includes(key)) {
          upsert.run(key, String(value), 'default');
        }
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
