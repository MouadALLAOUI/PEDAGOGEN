import { NextRequest, NextResponse } from 'next/server';
import { getClassesBySeason, getCurrentSeason, createClass } from '@/lib/students/studentManager';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const seasonId = request.nextUrl.searchParams.get('seasonId') || getCurrentSeason(userId).id;
    const classes = getClassesBySeason(seasonId, userId);
    return NextResponse.json({ classes });
  } catch (error) {
    console.error('GET /api/classes failed:', error);
    return NextResponse.json({ error: 'Échec du chargement des classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const body = await request.json();
    if (!body.name || !body.niveau) {
      return NextResponse.json({ error: 'Le nom et le niveau de la classe sont requis' }, { status: 400 });
    }
    if (!['1AC', '2AC', '3AC'].includes(body.niveau)) {
      return NextResponse.json({ error: 'Niveau invalide (1AC, 2AC ou 3AC)' }, { status: 400 });
    }
    const season = getCurrentSeason(userId);
    const created = createClass({
      season_id: season.id,
      niveau: body.niveau,
      name: body.name,
      matiere: body.matiere,
      room: body.room,
      description: body.description,
    }, userId);
    return NextResponse.json({ classe: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/classes failed:', error);
    return NextResponse.json({ error: 'Échec de la création de la classe' }, { status: 500 });
  }
}
