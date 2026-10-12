import { NextRequest, NextResponse } from 'next/server';
import { duplicateEntry, getEntry } from '@/lib/notebook/notebookManager';
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
    const id = body.id || body.sourceId;
    const newDate = body.newDate || body.date;
    const newClasseId = body.newClasseId !== undefined ? body.newClasseId : (body.classeId ?? body.targetClasseId);

    if (!id || !newDate) {
      return NextResponse.json({ error: 'ID et nouvelle date requis' }, { status: 400 });
    }

    const existing = getEntry(id);
    if (!existing) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    }

    const newEntry = duplicateEntry(id, newDate, newClasseId, userId);
    if (!newEntry) {
      return NextResponse.json({ error: 'Échec de la duplication' }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: newEntry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notebook/duplicate failed:', error);
    return NextResponse.json({ error: 'Échec de la duplication' }, { status: 500 });
  }
}
