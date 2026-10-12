import { NextRequest, NextResponse } from 'next/server';
import { searchAll } from '@/lib/search/fts';

/** R3 — recherche full-text unifiée (leçons, carnet, fichiers). */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    const niveau = request.nextUrl.searchParams.get('niveau') || undefined;
    const matiere = request.nextUrl.searchParams.get('matiere') || undefined;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '15', 10);

    return NextResponse.json({
      results: searchAll(q, limit, { niveau, matiere }),
    });
  } catch (error) {
    console.error('GET /api/search failed:', error);
    return NextResponse.json({ results: [] });
  }
}
