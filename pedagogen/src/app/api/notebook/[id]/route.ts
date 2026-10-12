import { NextRequest, NextResponse } from 'next/server';
import { getEntry, updateEntry, deleteEntry, STATUTS, type Statut, type EntryType } from '@/lib/notebook/notebookManager';
import { verifyToken } from '@/lib/db/auth';

async function getUserId(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return 'default';
  const payload = await verifyToken(token);
  return (payload?.sub as string) || 'default';
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entry = getEntry(id);
    if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('GET /api/notebook/[id] failed:', error);
    return NextResponse.json({ error: 'Échec du chargement de l\'entrée' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);
    const existing = getEntry(id);
    if (!existing) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });

    // Authorization check
    if (existing.user_id && existing.user_id !== 'default' && existing.user_id !== userId && userId !== 'default') {
      return NextResponse.json({ error: 'Non autorisé à modifier cette entrée' }, { status: 403 });
    }

    const body = await request.json();
    const statut = body.statut ?? body.status;
    if (statut && !STATUTS.includes(statut)) {
      return NextResponse.json({ error: `Statut invalide (${STATUTS.join(', ')})` }, { status: 400 });
    }

    const entry = updateEntry(id, {
      entry_type: body.entry_type as EntryType | undefined,
      classe_id: body.classe_id !== undefined ? (body.classe_id || null) : undefined,
      date: body.date,
      heure_debut: body.heure_debut !== undefined ? String(body.heure_debut) : undefined,
      heure_fin: body.heure_fin !== undefined ? String(body.heure_fin) : undefined,
      titre: body.titre,
      resume: body.resume,
      statut: (statut as Statut) || undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
      exam_id: body.exam_id,
      meta: body.meta !== undefined ? body.meta : undefined,
      document_ids: Array.isArray(body.document_ids) ? body.document_ids.map(String) : undefined,
      attachment_ids: Array.isArray(body.attachment_ids) ? body.attachment_ids.map(String) : undefined,
    });
    if (!entry) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('PUT /api/notebook/[id] failed:', error);
    return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = await getUserId(request);
    const existing = getEntry(id);
    if (!existing) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });

    // Authorization check
    if (existing.user_id && existing.user_id !== 'default' && existing.user_id !== userId && userId !== 'default') {
      return NextResponse.json({ error: 'Non autorisé à supprimer cette entrée' }, { status: 403 });
    }

    const ok = deleteEntry(id);
    if (!ok) return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('DELETE /api/notebook/[id] failed:', error);
    return NextResponse.json({ error: 'Échec de la suppression' }, { status: 500 });
  }
}
