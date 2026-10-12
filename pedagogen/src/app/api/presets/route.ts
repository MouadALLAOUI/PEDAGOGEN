import { NextRequest, NextResponse } from 'next/server';
import { listPresets, createPreset, deletePreset } from '@/lib/generation/presets';
import { verifyToken } from '@/lib/db/auth';

async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sub) return String(payload.sub);
  }
  return request.headers.get('x-user-id') || 'default';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    return NextResponse.json({ presets: listPresets(userId) });
  } catch (error) {
    console.error('GET /api/presets failed:', error);
    return NextResponse.json({ error: 'Échec du chargement des présets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();
    const preset = createPreset(
      {
        name: body.name,
        metadata: body.metadata || {},
        documents: Array.isArray(body.documents) ? body.documents : [],
        include_prompt: body.include_prompt,
        exclude_prompt: body.exclude_prompt,
      },
      userId
    );
    if (!preset) return NextResponse.json({ error: 'Nom de préset requis' }, { status: 400 });
    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    console.error('POST /api/presets failed:', error);
    return NextResponse.json({ error: 'Échec de la création du préset' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const ok = deletePreset(id, userId);
    if (!ok) return NextResponse.json({ error: 'Préset introuvable' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/presets failed:', error);
    return NextResponse.json({ error: 'Échec de la suppression' }, { status: 500 });
  }
}
