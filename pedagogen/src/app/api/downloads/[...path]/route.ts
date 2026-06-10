import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  md: 'text/markdown',
  zip: 'application/zip',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathParts } = await params;
  const filename = pathParts.join('/');

  if (!filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const GENERATED_DIR = join(process.cwd(), 'data', 'generated');
  const filePath = join(GENERATED_DIR, filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = filename.split('.').pop() || '';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
