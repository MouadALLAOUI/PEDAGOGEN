import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { getDb } from '@/lib/db';

const MIME_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf',
  md: 'text/markdown',
  zip: 'application/zip',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const raw = searchParams.get('raw');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const db = getDb();
  const file = db.prepare(
    'SELECT storage_path, format, name FROM generated_files WHERE id = ?'
  ).get(id) as any;

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const filePath = join(process.cwd(), 'data', 'generated', file.storage_path);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);

    // Raw mode: serve file directly (for iframe/embed)
    if (raw === '1') {
      const contentType = MIME_TYPES[file.format] || 'application/octet-stream';
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For markdown files, return text content
    if (file.format === 'md') {
      return NextResponse.json({
        type: 'text',
        content: buffer.toString('utf-8'),
        name: file.name,
        format: file.format,
      });
    }

    // For other formats, return info + raw URL
    return NextResponse.json({
      type: 'binary',
      name: file.name,
      format: file.format,
      sizeKb: Math.round(buffer.length / 1024),
      rawUrl: `/api/generated/preview?id=${id}&raw=1`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
