import { NextRequest, NextResponse } from 'next/server';
import { searchReferences } from '@/lib/search/vectorStore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchReferences(q.trim(), 15);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search failed:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
