import { NextRequest, NextResponse } from 'next/server';
import { getExam, getExamQuestions, updateExam, deleteExam, QUESTION_TYPES } from '@/lib/exams/examManager';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const examen = getExam(id);
    if (!examen) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });
    return NextResponse.json({ examen, questions: getExamQuestions(id) });
  } catch (error) {
    console.error('GET /api/examens/[id] failed:', error);
    return NextResponse.json({ error: 'Échec du chargement de l\'examen' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'default';
    const body = await request.json();
    if (body.questions !== undefined) {
      for (const q of body.questions) {
        if (!QUESTION_TYPES.includes(q.type)) {
          return NextResponse.json({ error: `Type de question invalide : ${q.type}` }, { status: 400 });
        }
      }
    }
    const updated = updateExam(id, body, userId);
    if (!updated) return NextResponse.json({ error: 'Examen introuvable ou non autorisé' }, { status: 404 });
    return NextResponse.json({ examen: updated, questions: getExamQuestions(id) });
  } catch (error) {
    console.error('PUT /api/examens/[id] failed:', error);
    return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id') || 'default';
    const ok = deleteExam(id, userId);
    if (!ok) return NextResponse.json({ error: 'Examen introuvable ou non autorisé' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/examens/[id] failed:', error);
    return NextResponse.json({ error: 'Échec de la suppression' }, { status: 500 });
  }
}
