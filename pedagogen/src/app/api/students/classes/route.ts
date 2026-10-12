import { NextRequest, NextResponse } from 'next/server';
import { getClassesBySeason, createClass, getCurrentSeason } from '@/lib/students/studentManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId') || getCurrentSeason().id;
    const classes = getClassesBySeason(seasonId);
    return NextResponse.json({ classes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement classes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { season_id, niveau, name, matiere, room, description } = body;

    if (!season_id || !niveau || !name) {
      return NextResponse.json({ error: 'Saison, niveau et nom de classe requis' }, { status: 400 });
    }

    const created = createClass({
      season_id,
      niveau,
      name,
      matiere,
      room,
      description,
    });

    return NextResponse.json({ success: true, class: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur création classe' }, { status: 500 });
  }
}
