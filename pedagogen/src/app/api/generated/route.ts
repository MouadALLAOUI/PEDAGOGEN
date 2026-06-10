import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const db = getDb();
    const files = db.prepare(`
      SELECT id, generation_id, name, doc_type, format, storage_path, url, size_kb, created_at
      FROM generated_files
      ORDER BY created_at DESC
    `).all();

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'Failed to load files' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
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
      `SELECT id, storage_path FROM generated_files WHERE id IN (${placeholders})`
    ).all(...ids) as any[];

    for (const file of fileRows) {
      const filePath = join(process.cwd(), 'data', 'generated', file.storage_path);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }

    db.prepare(`DELETE FROM generated_files WHERE id IN (${placeholders})`).run(...ids);

    return NextResponse.json({ ok: true, deleted: fileRows.length });
  } catch {
    return NextResponse.json({ error: 'Failed to delete files' }, { status: 500 });
  }
}
