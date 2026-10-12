import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/** Tokens consommés par mois (dashboard) — depuis generations.tokens_used. */
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(tokens_used) as tokens, COUNT(*) as generations
      FROM generations
      WHERE tokens_used > 0
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `).all() as any[];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonth = rows.find((r) => r.month === currentMonth);
    return NextResponse.json({
      months: rows,
      thisMonth: { tokens: thisMonth?.tokens || 0, generations: thisMonth?.generations || 0 },
    });
  } catch (error) {
    console.error('GET /api/stats/tokens failed:', error);
    return NextResponse.json({ months: [], thisMonth: { tokens: 0, generations: 0 } });
  }
}
