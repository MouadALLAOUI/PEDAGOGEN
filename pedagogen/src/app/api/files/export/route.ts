import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';
import { buildDocxFromMarkdown } from '@/lib/builders/docxBuilder';
import { buildPdfFromMarkdown } from '@/lib/builders/pdfBuilder';
import { buildHtmlFromMarkdown } from '@/lib/builders/htmlBuilder';
import { MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markdown, format, title = 'Document Pedagogique' } = body;

    if (!markdown || typeof markdown !== 'string') {
      return NextResponse.json({ error: 'Contenu markdown manquant' }, { status: 400 });
    }

    if (!['docx', 'pdf', 'html'].includes(format)) {
      return NextResponse.json({ error: 'Format invalide (docx, pdf, html requis)' }, { status: 400 });
    }

    let user = null;
    try {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.sub) {
          user = getUserFromDb(payload.sub);
        }
      }
    } catch {}

    const headerInfo: MinisterialHeaderInfo = {
      aref: user?.aref || '',
      directionProvinciale: user?.direction_provinciale || '',
      etablissement: user?.etablissement || '',
      teacherName: user?.full_name || '',
      subject: user?.matiere || '',
    };

    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').substring(0, 50) || 'document';

    if (format === 'docx') {
      const buffer = await buildDocxFromMarkdown(markdown, title, headerInfo);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizedTitle)}.docx"`,
        },
      });
    }

    if (format === 'pdf') {
      const buffer = await buildPdfFromMarkdown(markdown, title, headerInfo);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizedTitle)}.pdf"`,
        },
      });
    }

    if (format === 'html') {
      const htmlString = buildHtmlFromMarkdown(markdown, title, headerInfo);
      return new NextResponse(htmlString, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(sanitizedTitle)}.html"`,
        },
      });
    }

    return NextResponse.json({ error: 'Format non supporte' }, { status: 400 });
  } catch (error) {
    console.error('Erreur export fichier:', error);
    return NextResponse.json(
      { error: 'Erreur interne lors de la generation du fichier' },
      { status: 500 }
    );
  }
}
