import { NextRequest, NextResponse } from 'next/server';
import { computeAnalyse } from '@/lib/exams/examManager';
import { buildGuideProfPdf } from '@/lib/builders/examBuilders';

/** GET — Guide pédagogique du professeur imprimable (corrigé & objectifs didactiques PDF). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const analyse = computeAnalyse(id);
    if (!analyse) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const pdf = buildGuideProfPdf(analyse);
    const slug = analyse.exam.titre.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="guide_professeur_${slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error('GET /api/examens/[id]/guide/export failed:', error);
    return NextResponse.json({ error: 'Échec de l\'export du guide du professeur' }, { status: 500 });
  }
}
