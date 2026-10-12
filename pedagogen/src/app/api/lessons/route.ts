import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/** Leçons déjà générées — pour l'auto-complétion unité/leçon sur /generate. */
export async function GET(request: NextRequest) {
  try {
    const q = (request.nextUrl.searchParams.get('q') || '').trim();
    const db = getDb();
    const rows = db.prepare(`
      SELECT DISTINCT lecon, unite, matiere, niveau
      FROM generations
      WHERE lecon != ''
      ORDER BY created_at DESC
      LIMIT 200
    `).all() as any[];

    const filtered = q
      ? rows.filter((r) => `${r.lecon} ${r.unite} ${r.matiere}`.toLowerCase().includes(q.toLowerCase()))
      : rows;
    return NextResponse.json({ lessons: filtered.slice(0, 30) });
  } catch (error) {
    console.error('GET /api/lessons failed:', error);
    return NextResponse.json({ lessons: [] });
  }
}
