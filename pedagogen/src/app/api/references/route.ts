import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveReferenceFile, deleteReferenceFile } from '@/lib/utils/fileStorage';
import { indexReferenceFile } from '@/lib/search/vectorStore';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const db = getDb();
    const files = db.prepare(
      "SELECT * FROM reference_files WHERE user_id IN (?, 'default') ORDER BY builtin DESC, uploaded_at DESC"
    ).all(userId) as any[];

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

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['pdf', 'docx', 'txt', 'md'];
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé. Formats acceptés : PDF, DOCX, TXT, MD' }, { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Le fichier dépasse la taille maximale autorisée (10 Mo)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const userId = request.headers.get('x-user-id') || 'default';
    const result = await saveReferenceFile(file.name, category, buffer, userId);

    indexReferenceFile(result.id).catch((err) =>
      console.error('Auto-index failed for', result.name, err)
    );

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

    const userId = request.headers.get('x-user-id') || 'default';
    const db = getDb();
    const record = db.prepare('SELECT user_id FROM reference_files WHERE id = ?').get(id) as any;
    if (record && record.user_id !== 'default' && record.user_id !== userId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

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

    const userId = request.headers.get('x-user-id') || 'default';
    const db = getDb();
    const record = db.prepare('SELECT builtin, user_id FROM reference_files WHERE id = ?').get(id) as any;
    if (record?.builtin) {
      return NextResponse.json({ error: 'Cannot delete built-in reference' }, { status: 403 });
    }
    if (record && record.user_id !== 'default' && record.user_id !== userId) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
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
