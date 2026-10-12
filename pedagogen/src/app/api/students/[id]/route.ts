import { NextRequest, NextResponse } from 'next/server';
import {
  getStudentProfile360,
  updateStudent,
  deleteStudent,
} from '@/lib/students/studentManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const profile = getStudentProfile360(id);
    if (!profile) {
      return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement profil élève' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = updateStudent(id, body);
    if (!updated) {
      return NextResponse.json({ error: 'Élève introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur mise à jour élève' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ok = deleteStudent(id);
    return NextResponse.json({ success: ok });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur suppression élève' }, { status: 500 });
  }
}
