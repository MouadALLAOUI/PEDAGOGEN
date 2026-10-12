import { NextRequest, NextResponse } from 'next/server';
import { createStudent, getStudentsByClass } from '@/lib/students/studentManager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    if (!classId) {
      return NextResponse.json({ error: 'classId requis' }, { status: 400 });
    }

    const students = getStudentsByClass(classId);
    return NextResponse.json({ students });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement élèves' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      cne_massar,
      gender,
      birth_date,
      tarl_status,
      special_needs,
      guardian_name,
      guardian_phone,
      class_id,
      season_id,
      student_number,
    } = body;

    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'Prénom et nom de l’élève requis' }, { status: 400 });
    }

    const created = createStudent({
      first_name,
      last_name,
      cne_massar,
      gender,
      birth_date,
      tarl_status,
      special_needs,
      guardian_name,
      guardian_phone,
      class_id,
      season_id,
      student_number,
    });

    return NextResponse.json({ success: true, student: created });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur création élève' }, { status: 500 });
  }
}
