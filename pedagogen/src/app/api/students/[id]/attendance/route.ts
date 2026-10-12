import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceByStudent, markAttendance, getAttendanceByClassAndDate } from '@/lib/students/studentManager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const date = searchParams.get('date');

    if (classId && date) {
      const records = getAttendanceByClassAndDate(classId, date);
      return NextResponse.json({ attendance: records });
    }

    const records = getAttendanceByStudent(id);
    return NextResponse.json({ attendance: records });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur chargement présences' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { records } = body as { records: any[] };

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Liste de pointages requise' }, { status: 400 });
    }

    markAttendance(records);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur enregistrement présence' }, { status: 500 });
  }
}
