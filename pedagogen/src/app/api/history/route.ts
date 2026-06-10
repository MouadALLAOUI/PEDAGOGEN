import { NextRequest, NextResponse } from 'next/server';
import { getHistory, addHistoryEntry } from '@/lib/utils/historyStore';
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
    await addHistoryEntry(result);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save history entry:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
