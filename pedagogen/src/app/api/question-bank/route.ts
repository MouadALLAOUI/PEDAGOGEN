import { NextRequest, NextResponse } from 'next/server';
import { listQuestionBank, addQuestionBank, deleteQuestionBank } from '@/lib/exams/examService';

export async function GET() {
  try {
    return NextResponse.json({ questions: listQuestionBank() });
  } catch (error) {
    console.error('GET /api/question-bank failed:', error);
    return NextResponse.json({ error: 'Échec du chargement de la banque' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const questions = Array.isArray(body.questions) ? body.questions : [body];
    const saved = addQuestionBank(questions);
    return NextResponse.json({ saved }, { status: 201 });
  } catch (error) {
    console.error('POST /api/question-bank failed:', error);
    return NextResponse.json({ error: 'Échec de l\'enregistrement' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const ok = deleteQuestionBank(id);
    if (!ok) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/question-bank failed:', error);
    return NextResponse.json({ error: 'Échec de la suppression' }, { status: 500 });
  }
}
