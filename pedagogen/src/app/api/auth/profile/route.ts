import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserFromDb, updateUserProfile } from '@/lib/db/auth';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.sub) return null;
  return getUserFromDb(payload.sub);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.json({ profile: user });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const data = await request.json();
    updateUserProfile(user.id, {
      full_name: data.full_name,
      matiere: data.matiere,
      etablissement: data.etablissement,
      telephone: data.telephone,
    });

    const updated = getUserFromDb(user.id);
    return NextResponse.json({ profile: updated });
  } catch {
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
