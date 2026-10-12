import { NextRequest, NextResponse } from 'next/server';
import { listEntries } from '@/lib/notebook/notebookManager';
import { buildCarnetPdf } from '@/lib/builders/carnetBuilder';

/** GET ?classeId=&from=&to= — carnet de bord imprimable (PDF archivage). */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const classeId = sp.get('classeId');
    const entries = listEntries({
      classeId: classeId || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
    });
    const classeName = entries[0]?.classe_nom || 'Toutes les classes';
    const pdf = buildCarnetPdf(classeName, entries, { from: sp.get('from') || undefined, to: sp.get('to') || undefined });
    const slug = (classeName || 'carnet').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carnet_${slug}.pdf"`,
      },
    });
  } catch (error) {
    console.error('GET /api/notebook/export failed:', error);
    return NextResponse.json({ error: 'Échec de l\'export du carnet' }, { status: 500 });
  }
}
