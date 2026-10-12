import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: Record<string, unknown> = {};
  let status = 'ok';

  try {
    const db = getDb();
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    checks.database = row?.ok === 1 ? 'ok' : 'error';
  } catch (err) {
    checks.database = 'error';
    checks.databaseError = err instanceof Error ? err.message : String(err);
    status = 'degraded';
  }

  checks.hfTokenConfigured = Boolean(process.env.HF_TOKEN);
  checks.uptimeSeconds = Math.round(process.uptime());
  checks.timestamp = new Date().toISOString();

  return NextResponse.json({ status, checks });
}
