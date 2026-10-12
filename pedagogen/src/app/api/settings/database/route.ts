import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseStats, exportDatabaseSqlite, exportDatabaseJson, importDatabase } from '@/lib/db/backup';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exportFormat = searchParams.get('export');

    const dateStr = new Date().toISOString().slice(0, 10);

    if (exportFormat === 'sqlite') {
      const buffer = await exportDatabaseSqlite();
      const filename = `pedagogen_backup_${dateStr}.sqlite`;

      return new NextResponse(buffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.sqlite3',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
          'Cache-Control': 'no-store, no-cache',
        },
      });
    }

    if (exportFormat === 'json') {
      const json = exportDatabaseJson();
      const filename = `pedagogen_backup_${dateStr}.json`;

      return new NextResponse(json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store, no-cache',
        },
      });
    }

    // Default: return stats and metadata
    const stats = getDatabaseStats();
    return NextResponse.json({ stats });
  } catch (err) {
    console.error('Database stats/export error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur lors de la récupération des données de la base' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Le fichier dépasse la taille limite autorisée (50 Mo)' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importDatabase(buffer, file.name);

    return NextResponse.json(result);
  } catch (err) {
    console.error('Database import error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Échec de la restauration de la base de données' },
      { status: 500 }
    );
  }
}
