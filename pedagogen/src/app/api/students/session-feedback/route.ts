import { NextRequest, NextResponse } from 'next/server';
import { saveSessionFeedback, getSessionFeedbacksByClass } from '@/lib/students/studentManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    if (!classId) {
      return NextResponse.json({ error: 'classId requis' }, { status: 400 });
    }

    const feedbacks = getSessionFeedbacksByClass(classId);
    return NextResponse.json({ feedbacks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement bilans de séance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      class_id,
      date,
      matiere,
      niveau,
      unite,
      lecon,
      objectif_atteint,
      participation_globale,
      comprehension_globale,
      difficulte_principale,
      eleves_a_revoir,
      a_reprendre,
      note_libre,
    } = body;

    if (!class_id || !date) {
      return NextResponse.json({ error: 'Classe et date requises' }, { status: 400 });
    }

    const saved = saveSessionFeedback({
      class_id,
      date,
      matiere,
      niveau,
      unite,
      lecon,
      objectif_atteint,
      participation_globale,
      comprehension_globale,
      difficulte_principale,
      eleves_a_revoir,
      a_reprendre,
      note_libre,
    });

    return NextResponse.json({ success: true, feedback: saved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur enregistrement bilan séance' }, { status: 500 });
  }
}
