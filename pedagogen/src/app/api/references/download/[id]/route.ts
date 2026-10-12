import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { getReferenceRecord } from '@/lib/utils/fileStorage';
import path, { join } from 'path';

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

  const REFERENCES_DIR = join(process.cwd(), 'data', 'references');
  const resolvedPath = path.resolve(join(REFERENCES_DIR, record.storage_path));
  if (!resolvedPath.startsWith(path.resolve(REFERENCES_DIR) + path.sep)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const buffer = await readFile(resolvedPath);
    const ext = record.name.split('.').pop() || '';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    // Sanitize filename to prevent CRLF / header injection
    const displayName = record.name.replace(/[\r\n"]/g, '_');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${displayName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }
}
