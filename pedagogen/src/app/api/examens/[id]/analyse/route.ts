import { NextRequest, NextResponse } from 'next/server';
import { computeAnalyse } from '@/lib/exams/examManager';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const analyse = computeAnalyse(id);
    if (!analyse) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });
    return NextResponse.json(analyse);
  } catch (error) {
    console.error('GET /api/examens/[id]/analyse failed:', error);
    return NextResponse.json({ error: 'Échec du calcul de l\'analyse' }, { status: 500 });
  }
}
