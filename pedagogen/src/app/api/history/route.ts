import { NextRequest, NextResponse } from 'next/server';
import { getHistory, addHistoryEntry } from '@/lib/utils/historyStore';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';
import type { GenerationResult } from '@/types/generation';

export async function GET() {
  try {
    const entries = await getHistory();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json({ entries: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const result: GenerationResult = await request.json();
    let userId: string | undefined;
    try {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.sub) {
          const user = getUserFromDb(payload.sub);
          if (user) userId = user.id;
        }
      }
      if (!userId) {
        const { getDb } = await import('@/lib/db');
        const first = getDb().prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined;
        if (first) userId = first.id;
      }
    } catch {
      // ensure we still try with a fallback
      try {
        const { getDb } = await import('@/lib/db');
        const first = getDb().prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined;
        if (first) userId = first.id;
      } catch {}
    }
    if (!userId) {
      const { getDb } = await import('@/lib/db');
      userId = (getDb().prepare('SELECT id FROM users LIMIT 1').get() as { id: string } | undefined)?.id || '';
    }
    await addHistoryEntry(result, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save history entry:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
