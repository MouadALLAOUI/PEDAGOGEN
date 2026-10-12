import { NextRequest, NextResponse } from 'next/server';
import {
  listEntries,
  createEntry,
  createMultipleEntries,
  getAllTags,
  STATUTS,
  type Statut,
  type EntryType,
} from '@/lib/notebook/notebookManager';
import { verifyToken } from '@/lib/db/auth';

async function getUserId(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return 'default';
  const payload = await verifyToken(token);
  return (payload?.sub as string) || 'default';
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const entries = listEntries({
      classeId: sp.get('classeId') || undefined,
      statut: sp.get('statut') || undefined,
      tag: sp.get('tag') || undefined,
      q: sp.get('q') || undefined,
      from: sp.get('from') || undefined,
      to: sp.get('to') || undefined,
      entryType: sp.get('entryType') || undefined,
    });
    return NextResponse.json({ entries, tags: getAllTags() });
  } catch (error) {
    console.error('GET /api/notebook failed:', error);
    return NextResponse.json({ error: 'Échec du chargement du carnet de bord' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const entryType: EntryType = body.entry_type || body.entryType || 'SESSION';

    if (!body.titre || !body.titre.trim()) {
      return NextResponse.json({ error: 'Le titre est requis' }, { status: 400 });
    }
    const rawStatut = body.statut ?? body.status;
    if (rawStatut && !STATUTS.includes(rawStatut)) {
      return NextResponse.json({ error: `Statut invalide (${STATUTS.join(', ')})` }, { status: 400 });
    }

    // Check if multiple classes are targeted (only applicable to SESSION)
    const isMulti =
      entryType === 'SESSION' &&
      ((Array.isArray(body.classes) && body.classes.length > 0) ||
        (Array.isArray(body.classe_ids) && body.classe_ids.length > 0));

    const effectiveDate =
      body.date ||
      body.newDate ||
      (Array.isArray(body.classes) ? body.classes.find((item: any) => item?.date)?.date : undefined);

    if (!isMulti && !effectiveDate) {
      return NextResponse.json({ error: 'La date est requise' }, { status: 400 });
    }
    if (isMulti && !effectiveDate) {
      return NextResponse.json({ error: 'La date est requise' }, { status: 400 });
    }

    // Type-specific validation
    if (entryType === 'MEETING') {
      if (!body.heure_debut || !body.heure_fin) {
        return NextResponse.json(
          { error: "L'heure de début et l'heure de fin sont obligatoires pour une réunion" },
          { status: 400 }
        );
      }
    }

    if (isMulti) {
      const rawItems: Array<{ classe_id?: string; date?: string; heure_debut?: string; heure_fin?: string }> =
        Array.isArray(body.classes) && body.classes.length > 0
          ? body.classes
          : body.classe_ids.map((id: string) => ({ classe_id: id }));

      const items = rawItems
        .filter((item) => Boolean(item && item.classe_id))
        .map((item) => ({
          entry_type: 'SESSION' as EntryType,
          classe_id: String(item.classe_id),
          date: item.date || body.date || effectiveDate || new Date().toISOString().slice(0, 10),
          heure_debut: item.heure_debut !== undefined ? String(item.heure_debut) : (body.heure_debut ? String(body.heure_debut) : ''),
          heure_fin: item.heure_fin !== undefined ? String(item.heure_fin) : (body.heure_fin ? String(body.heure_fin) : ''),
          titre: body.titre.trim(),
          resume: body.resume || '',
          statut: (rawStatut as Statut) || 'planifiee',
          tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
          exam_id: body.exam_id || null,
          group_id: body.group_id || undefined,
          meta: body.meta || {},
          document_ids: Array.isArray(body.document_ids) ? body.document_ids.map(String) : [],
          attachment_ids: Array.isArray(body.attachment_ids) ? body.attachment_ids.map(String) : [],
        }));

      if (items.length === 0) {
        return NextResponse.json({ error: 'Au moins une classe valide est requise' }, { status: 400 });
      }

      const entries = createMultipleEntries(items, userId);
      return NextResponse.json({ success: true, count: entries.length, entries, entry: entries[0] }, { status: 201 });
    }

    // SESSION requires a class
    if (entryType === 'SESSION' && !body.classe_id) {
      return NextResponse.json({ error: 'La classe est requise pour une séance de cours' }, { status: 400 });
    }

    const entry = createEntry(
      {
        entry_type: entryType,
        classe_id: body.classe_id || null,
        date: body.date || effectiveDate,
        heure_debut: body.heure_debut ? String(body.heure_debut) : '',
        heure_fin: body.heure_fin ? String(body.heure_fin) : '',
        titre: body.titre.trim(),
        resume: body.resume || '',
        statut: (rawStatut as Statut) || 'planifiee',
        tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
        exam_id: body.exam_id || null,
        group_id: body.group_id || undefined,
        meta: body.meta || {},
        document_ids: Array.isArray(body.document_ids) ? body.document_ids.map(String) : [],
        attachment_ids: Array.isArray(body.attachment_ids) ? body.attachment_ids.map(String) : [],
      },
      userId
    );

    return NextResponse.json({ entry, entries: [entry] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/notebook failed:', error);
    return NextResponse.json({ error: 'Échec de la création de l\'entrée' }, { status: 500 });
  }
}
