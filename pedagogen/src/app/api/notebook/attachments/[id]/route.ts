import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getAttachment, deleteAttachment } from '@/lib/notebook/notebookManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attachment = getAttachment(id);

    if (!attachment) {
      return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });
    }

    const filePath = join(process.cwd(), 'data', 'attachments', attachment.storage_path);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Fichier physique introuvable' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const searchParams = request.nextUrl.searchParams;
    const isDownload = searchParams.get('download') === '1' || searchParams.get('download') === 'true';

    // Encode filename for Content-Disposition header
    const encodedFilename = encodeURIComponent(attachment.original_name);
    const dispositionType = isDownload ? 'attachment' : 'inline';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': attachment.mime_type || 'application/octet-stream',
        'Content-Disposition': `${dispositionType}; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('GET /api/notebook/attachments/[id] error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la pièce jointe' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = deleteAttachment(id);
    if (!ok) {
      return NextResponse.json({ error: 'Pièce jointe introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/notebook/attachments/[id] error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la pièce jointe' },
      { status: 500 }
    );
  }
}
