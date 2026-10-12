import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const db = getDb();
    const files = db.prepare(`
      SELECT f.id, f.generation_id, f.name, f.doc_type, f.format, f.storage_path, f.url, f.size_kb, f.created_at
      FROM generated_files f
      LEFT JOIN generations g ON f.generation_id = g.id
      WHERE g.user_id = ? OR g.user_id IS NULL OR ? = 'default'
      ORDER BY f.created_at DESC
    `).all(userId, userId);

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const body = await request.json();

    // Support both single id and batch ids
    const ids: string[] = body.ids
      ? body.ids
      : body.id
        ? [body.id]
        : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
    }

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    const fileRows = db.prepare(
      `SELECT f.id, f.storage_path FROM generated_files f
       LEFT JOIN generations g ON f.generation_id = g.id
       WHERE f.id IN (${placeholders}) AND (g.user_id = ? OR g.user_id IS NULL OR ? = 'default')`
    ).all(...ids, userId, userId) as any[];

    for (const file of fileRows) {
      const filePath = join(process.cwd(), 'data', 'generated', file.storage_path);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }

    const validIds = fileRows.map((f: any) => f.id);
    if (validIds.length > 0) {
      const validPlaceholders = validIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM generated_files WHERE id IN (${validPlaceholders})`).run(...validIds);
    }

    return NextResponse.json({ ok: true, deleted: validIds.length });
  } catch {
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
  }
}
