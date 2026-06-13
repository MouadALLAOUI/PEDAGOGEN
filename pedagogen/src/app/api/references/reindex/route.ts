import { NextResponse } from 'next/server';
import { indexAllEnabledReferences } from '@/lib/search/vectorStore';

export async function POST() {
  try {
    const count = await indexAllEnabledReferences();
    return NextResponse.json({ success: true, indexed: count });
  } catch (error) {
    console.error('Reindex failed:', error);
    return NextResponse.json({ error: 'Reindex failed' }, { status: 500 });
  }
}
