import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackSummaryForLesson } from '@/lib/students/studentManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matiere = searchParams.get('matiere') || '';
    const niveau = searchParams.get('niveau') || '';
    const lecon = searchParams.get('lecon') || '';

    if (!matiere && !niveau && !lecon) {
      return NextResponse.json({ hasData: false });
    }

    const summary = getFeedbackSummaryForLesson(matiere, niveau, lecon);
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement synthèse didactique' }, { status: 500 });
  }
}
