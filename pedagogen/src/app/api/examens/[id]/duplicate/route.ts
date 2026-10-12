import { NextRequest, NextResponse } from 'next/server';
import { duplicateExam } from '@/lib/exams/examService';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const copy = duplicateExam(id);
    if (!copy) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });
    return NextResponse.json({ examen: copy }, { status: 201 });
  } catch (error) {
    console.error('POST /api/examens/[id]/duplicate failed:', error);
    return NextResponse.json({ error: 'Échec de la duplication' }, { status: 500 });
  }
}
