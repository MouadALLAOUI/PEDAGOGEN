import { NextRequest, NextResponse } from 'next/server';
import {
  getObservationsByStudent,
  addObservation,
  updateHelpStatus,
} from '@/lib/students/studentManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const obs = getObservationsByStudent(id);
    return NextResponse.json({ observations: obs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement observations' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      class_id,
      date,
      observation_type,
      participation,
      comprehension,
      comportements,
      difficulte,
      action_pedagogique,
      notion,
      matiere,
      niveau,
      unite,
      lecon,
      cause_possible,
      prochaine_seance,
      observation_text,
      mental_state,
      participation_level,
      needs_help,
      help_topic,
      help_urgency,
      help_status,
    } = body;

    if (!class_id || !date) {
      return NextResponse.json({ error: 'Classe et date requises' }, { status: 400 });
    }

    const created = addObservation({
      class_id,
      student_id: id === 'collective' ? undefined : id,
      date,
      observation_type: id === 'collective' ? 'collective' : (observation_type || 'individuelle'),
      participation,
      comprehension,
      comportements,
      difficulte,
      action_pedagogique,
      notion,
      matiere,
      niveau,
      unite,
      lecon,
      cause_possible,
      prochaine_seance,
      observation_text,
      mental_state,
      participation_level,
      needs_help,
      help_topic,
      help_urgency,
      help_status,
    });

    return NextResponse.json({ success: true, observation: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur ajout observation' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { observationId, help_status } = body;
    if (!observationId || !help_status) {
      return NextResponse.json({ error: 'observationId et help_status requis' }, { status: 400 });
    }

    const ok = updateHelpStatus(observationId, help_status);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur mise à jour statut aide' }, { status: 500 });
  }
}
