import { NextRequest, NextResponse } from 'next/server';
import { getHistory, addHistoryEntry } from '@/lib/utils/historyStore';
import { verifyToken } from '@/lib/db/auth';
import type { GenerationResult } from '@/types/generation';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    const userId = request.headers.get('x-user-id') || undefined;

    if (id) {
      const { getDb } = await import('@/lib/db');
      const db = getDb();
      const gen = db.prepare(
        'SELECT id, mode, metadata, tokens_used, duration_ms, zip_url FROM generations WHERE id = ?'
      ).get(id) as any;

      if (!gen) {
        return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
      }

      const files = db.prepare(
        'SELECT id, name, doc_type, format, url, size_kb FROM generated_files WHERE generation_id = ?'
      ).all(id) as any[];

      const filesFormatted = files.map(f => ({
        id: f.id,
        name: f.name,
        type: f.doc_type,
        format: f.format,
        url: f.url,
        sizeKb: f.size_kb
      }));

      let metadata = {};
      try {
        metadata = gen.metadata ? JSON.parse(gen.metadata) : {};
      } catch {}

      return NextResponse.json({
        entry: {
          id: gen.id,
          mode: gen.mode,
          metadata,
          tokensUsed: gen.tokens_used,
          durationMs: gen.duration_ms,
          zipUrl: gen.zip_url,
          files: filesFormatted
        }
      });
    }

    const entries = await getHistory(userId);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result: GenerationResult = await request.json();
    let userId = request.headers.get('x-user-id') || undefined;
    if (!userId) {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.sub) userId = String(payload.sub);
      }
    }

    await addHistoryEntry(result, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save history entry:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
