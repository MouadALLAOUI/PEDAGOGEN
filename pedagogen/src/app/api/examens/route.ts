import { NextRequest, NextResponse } from 'next/server';
import { listExams, createExam, QUESTION_TYPES, type QuestionType } from '@/lib/exams/examManager';

export async function GET() {
  try {
    return NextResponse.json({ examens: listExams() });
  } catch (error) {
    console.error('GET /api/examens failed:', error);
    return NextResponse.json({ error: 'Échec du chargement des examens' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.titre || !body.exam_date) {
      return NextResponse.json({ error: 'Le titre et la date sont requis' }, { status: 400 });
    }
    if (!Array.isArray(body.classe_ids) || body.classe_ids.length === 0) {
      return NextResponse.json({ error: 'Sélectionnez au moins une classe' }, { status: 400 });
    }
    const questions = Array.isArray(body.questions) ? body.questions : [];
    for (const q of questions) {
      if (!QUESTION_TYPES.includes(q.type)) {
        return NextResponse.json({ error: `Type de question invalide : ${q.type}` }, { status: 400 });
      }
      const bareme = Number(q.bareme);
      if (!Number.isFinite(bareme) || bareme < 0) {
        return NextResponse.json({ error: 'Le barème d\'une question ne peut pas être négatif' }, { status: 400 });
      }
    }
    const examen = createExam({
      titre: body.titre,
      exam_date: body.exam_date,
      duree: body.duree,
      niveau: body.niveau,
      classe_ids: body.classe_ids,
      questions: questions.map((q: any, i: number) => ({
        numero: q.numero ?? i + 1,
        type: q.type as QuestionType,
        enonce: q.enonce || '',
        bareme: Number(q.bareme),
        options: q.options !== undefined && q.options !== null ? q.options : [],
        image_url: q.image_url || '',
      })),
    });
    return NextResponse.json({ examen }, { status: 201 });
  } catch (error) {
    console.error('POST /api/examens failed:', error);
    return NextResponse.json({ error: 'Échec de la création de l\'examen' }, { status: 500 });
  }
}
