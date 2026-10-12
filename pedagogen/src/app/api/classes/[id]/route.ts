import { NextRequest, NextResponse } from 'next/server';
import { getClassById, getStudentsByClass, updateClass, deleteClass } from '@/lib/students/studentManager';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classe = getClassById(id);
    if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });
    const eleves = getStudentsByClass(id);
    return NextResponse.json({ classe, eleves });
  } catch (error) {
    console.error('GET /api/classes/[id] failed:', error);
    return NextResponse.json({ error: 'Échec du chargement de la classe' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'default';
    const body = await request.json();
    const updated = updateClass(id, body, userId);
    if (!updated) return NextResponse.json({ error: 'Classe introuvable ou non autorisée' }, { status: 404 });
    return NextResponse.json({ classe: updated });
  } catch (error) {
    console.error('PUT /api/classes/[id] failed:', error);
    return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'default';
    const ok = deleteClass(id, userId);
    if (!ok) return NextResponse.json({ error: 'Classe introuvable ou non autorisée' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/classes/[id] failed:', error);
    return NextResponse.json({ error: 'Échec de la suppression' }, { status: 500 });
  }
}
