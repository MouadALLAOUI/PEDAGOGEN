import { NextRequest, NextResponse } from 'next/server';
import { getSeasons, getCurrentSeason, createSeason, setCurrentSeason } from '@/lib/students/studentManager';

export async function GET(_request: NextRequest) {
  try {
    const seasons = getSeasons();
    const current = getCurrentSeason();
    return NextResponse.json({ seasons, currentSeason: current });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement saisons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, code, label, is_current, start_date, end_date } = body;

    if (action === 'set_current' && id) {
      setCurrentSeason(id);
      return NextResponse.json({ success: true });
    }

    if (!code || !label) {
      return NextResponse.json({ error: 'Code et libellé de l’année scolaire requis' }, { status: 400 });
    }

    const created = createSeason({ code, label, is_current, start_date, end_date });
    return NextResponse.json({ success: true, season: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur création saison' }, { status: 500 });
  }
}
