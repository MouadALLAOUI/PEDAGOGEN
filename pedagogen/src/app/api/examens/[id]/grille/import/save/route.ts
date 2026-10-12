import { NextRequest, NextResponse } from 'next/server';
import { getExam, saveGrades } from '@/lib/exams/examManager';

/** POST — persiste les notes importées. body: { notes: [{ studentId, numero, note }] } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exam = getExam(id);
    if (!exam) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const body = await request.json();
    const notes = body.notes;
    if (!Array.isArray(notes) || notes.length === 0) {
      return NextResponse.json({ error: 'Aucune note à enregistrer' }, { status: 400 });
    }
    saveGrades(id, notes.map((n: any) => ({
      studentId: String(n.studentId),
      numero: Number(n.numero),
      note: n.note === null || n.note === '' || n.note === undefined ? null : Number(n.note),
    })));
    return NextResponse.json({ success: true, saved: notes.length });
  } catch (error) {
    console.error('POST /api/examens/[id]/grille/import/save failed:', error);
    return NextResponse.json({ error: 'Échec de l\'enregistrement' }, { status: 500 });
  }
}
