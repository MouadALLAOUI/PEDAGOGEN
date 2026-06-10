import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveReferenceFile, deleteReferenceFile } from '@/lib/utils/fileStorage';
import type { ReferenceCategory } from '@/types/references';

export async function GET() {
  try {
    const db = getDb();
    const files = db.prepare(
      'SELECT * FROM reference_files ORDER BY builtin DESC, uploaded_at DESC'
    ).all() as any[];

    const mapped = files.map((f: any) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      size: f.size,
      uploadedAt: f.uploaded_at,
      url: `/api/references/download/${f.id}`,
      enabled: !!f.enabled,
      builtin: !!f.builtin,
    }));

    return NextResponse.json({ files: mapped });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'custom';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveReferenceFile(file.name, category, buffer);

    return NextResponse.json({ file: { ...result, enabled: true, builtin: false } });
  } catch (error) {
    console.error('Upload failed:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, enabled } = await request.json();

    if (!id || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'id and enabled required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare('UPDATE reference_files SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to toggle' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'No id provided' }, { status: 400 });
    }

    const db = getDb();
    const record = db.prepare('SELECT builtin FROM reference_files WHERE id = ?').get(id) as any;
    if (record?.builtin) {
      return NextResponse.json({ error: 'Cannot delete built-in reference' }, { status: 403 });
    }

    const deleted = await deleteReferenceFile(id);
    if (!deleted) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
