import { NextRequest, NextResponse } from 'next/server';
import { computeAnalyse } from '@/lib/exams/examManager';
import { buildSujetPdf, buildSujetHtml } from '@/lib/builders/examBuilders';

/** GET — sujet d'évaluation imprimable pour les élèves (PDF ou HTML). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const analyse = computeAnalyse(id);
    if (!analyse) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const format = request.nextUrl.searchParams.get('format')?.toLowerCase();
    const slug = analyse.exam.titre.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'examen';

    if (format === 'html') {
      const html = buildSujetHtml(analyse);
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="sujet_${slug}.html"`,
        },
      });
    }

    const pdf = buildSujetPdf(analyse);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sujet_${slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error('GET /api/examens/[id]/sujet/export failed:', error);
    return NextResponse.json({ error: 'Échec de l\'export du sujet' }, { status: 500 });
  }
}
