import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { getReferenceRecord } from '@/lib/utils/fileStorage';
import { join } from 'path';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const record = await getReferenceRecord(id);
  if (!record) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const filePath = join(process.cwd(), 'data', 'references', record.storage_path);

  try {
    const buffer = await readFile(filePath);
    const ext = record.name.split('.').pop() || '';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${record.name}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }
}
