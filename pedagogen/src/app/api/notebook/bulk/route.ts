import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateEntries, bulkDeleteEntries, STATUTS, type Statut } from '@/lib/notebook/notebookManager';
import { verifyToken } from '@/lib/db/auth';

async function getUserId(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return 'default';
  const payload = await verifyToken(token);
  return (payload?.sub as string) || 'default';
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { action, ids, date } = body;
    const statut = body.statut ?? body.status;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Aucune entrée sélectionnée' }, { status: 400 });
    }

    if (action === 'status') {
      if (!statut || !STATUTS.includes(statut)) {
        return NextResponse.json({ error: `Statut invalide (${STATUTS.join(', ')})` }, { status: 400 });
      }
      const res = bulkUpdateEntries(ids, { statut: statut as Statut }, userId);
      return NextResponse.json({ success: true, count: res.updatedCount });
    }

    if (action === 'date') {
      if (!date) {
        return NextResponse.json({ error: 'Date requise' }, { status: 400 });
      }
      const res = bulkUpdateEntries(ids, { date }, userId);
      return NextResponse.json({ success: true, count: res.updatedCount });
    }

    if (action === 'delete') {
      const res = bulkDeleteEntries(ids, userId);
      return NextResponse.json({ success: true, count: res.deletedCount });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('POST /api/notebook/bulk failed:', error);
    return NextResponse.json({ error: 'Échec de l\'opération groupée' }, { status: 500 });
  }
}
