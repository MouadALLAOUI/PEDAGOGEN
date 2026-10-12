import { NextRequest, NextResponse } from 'next/server';
import { getGradesByStudent, saveGrade, deleteGrade } from '@/lib/students/studentManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const grades = getGradesByStudent(id);
    return NextResponse.json({ grades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement notes' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { class_id, title, eval_type, score, max_score, coeff, date, comment } = body;

    if (!class_id || !title || score == null || !date) {
      return NextResponse.json({ error: 'Champs requis manquants pour la note' }, { status: 400 });
    }

    const saved = saveGrade({
      class_id,
      student_id: id,
      title,
      eval_type,
      score: Number(score),
      max_score: max_score ? Number(max_score) : 20,
      coeff: coeff ? Number(coeff) : 1,
      date,
      comment,
    });

    return NextResponse.json({ success: true, grade: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur enregistrement note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeId = searchParams.get('gradeId');
    if (!gradeId) return NextResponse.json({ error: 'gradeId requis' }, { status: 400 });

    const ok = deleteGrade(gradeId);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur suppression note' }, { status: 500 });
  }
}
