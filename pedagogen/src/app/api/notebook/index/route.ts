import { NextResponse } from 'next/server';
import { syncNotebookToReferences } from '@/lib/references/notebookIndexer';

/** Indexe les entrées du carnet de bord dans le magasin vectoriel des références. */
export async function POST() {
  try {
    const result = await syncNotebookToReferences();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('POST /api/notebook/index failed:', error);
    return NextResponse.json({ error: 'Échec de l\'indexation du carnet' }, { status: 500 });
  }
}
