import { NextRequest, NextResponse } from 'next/server';
import { computeAnalyse } from '@/lib/exams/examManager';
import { buildGrilleDocx, buildGrilleCsv } from '@/lib/builders/examBuilders';

/** GET ?format=docx|csv — grille de notation (DOCX pour archivage MEN, CSV pour saisie externe). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const format = request.nextUrl.searchParams.get('format') || 'docx';
    const analyse = computeAnalyse(id);
    if (!analyse) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const slug = analyse.exam.titre.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);

    if (format === 'csv') {
      return new NextResponse('\uFEFF' + buildGrilleCsv(analyse), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="grille_${slug}.csv"`,
        },
      });
    }

    const buffer = await buildGrilleDocx(analyse);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="grille_${slug}.docx"`,
      },
    });
  } catch (error) {
    console.error('GET /api/examens/[id]/grille/export failed:', error);
    return NextResponse.json({ error: 'Échec de l\'export de la grille' }, { status: 500 });
  }
}
