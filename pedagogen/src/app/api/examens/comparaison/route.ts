import { NextRequest, NextResponse } from 'next/server';
import { getComparaison } from '@/lib/exams/examService';

export async function GET(request: NextRequest) {
  try {
    const classeId = request.nextUrl.searchParams.get('classeId');
    if (!classeId) return NextResponse.json({ error: 'classeId requis' }, { status: 400 });
    return NextResponse.json(getComparaison(classeId));
  } catch (error) {
    console.error('GET /api/examens/comparaison failed:', error);
    return NextResponse.json({ error: 'Échec du calcul de la comparaison' }, { status: 500 });
  }
}
