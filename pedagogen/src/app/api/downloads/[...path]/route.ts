import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path, { join } from 'path';
import { existsSync } from 'fs';
import { getGeneratedFileByStoragePath } from '@/lib/utils/generatedStorage';

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
  const resolvedPath = path.resolve(filePath);
  const resolvedBase = path.resolve(GENERATED_DIR);

  // Prevent path traversal outside GENERATED_DIR
  if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (!existsSync(resolvedPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(resolvedPath);
    const ext = filename.split('.').pop() || '';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    const record = getGeneratedFileByStoragePath(filename);
    const rawDisplayName = record?.name || filename;
    // Sanitize displayName to prevent CRLF / header injection
    const displayName = rawDisplayName.replace(/[\r\n"]/g, '_');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${displayName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
