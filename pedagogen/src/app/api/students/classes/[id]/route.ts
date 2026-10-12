import { NextRequest, NextResponse } from 'next/server';
import {
  getClassById,
  updateClass,
  deleteClass,
  getStudentsByClass,
  getGradesByClass,
  getObservationsByClass,
  getAiInsights,
} from '@/lib/students/studentManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cls = getClassById(id);
    if (!cls) {
      return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });
    }

    const students = getStudentsByClass(id);
    const grades = getGradesByClass(id);
    const observations = getObservationsByClass(id, 20);
    const insights = getAiInsights(undefined, id);

    return NextResponse.json({
      class: cls,
      students,
      grades,
      observations,
      insights,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement classe' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateClass(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, class: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur mise à jour classe' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = deleteClass(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur suppression classe' }, { status: 500 });
  }
}
