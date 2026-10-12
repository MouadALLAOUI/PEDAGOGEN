import { NextRequest, NextResponse } from 'next/server';
import { getStudentProfile360 } from '@/lib/students/studentManager';
import { analyzeStudentWithAi, analyzeTeachingSequenceWithAi } from '@/lib/students/aiAdvisor';
import type { ProviderId } from '@/lib/ai/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, provider, sequenceData } = body as {
      studentId?: string;
      provider?: ProviderId;
      sequenceData?: any;
    };

    if (sequenceData) {
      const sequenceResult = await analyzeTeachingSequenceWithAi({
        ...sequenceData,
        providerId: provider,
      });
      return NextResponse.json({ success: true, sequenceResult });
    }

    if (!studentId) {
      return NextResponse.json({ error: 'studentId ou sequenceData requis' }, { status: 400 });
    }

    const profile = getStudentProfile360(studentId);
    if (!profile) {
      return NextResponse.json({ error: 'Dossier élève introuvable' }, { status: 404 });
    }

    const insight = await analyzeStudentWithAi(profile, provider);
    return NextResponse.json({ success: true, insight });
  } catch (error: any) {
    console.error('Student AI analysis error:', error);
    return NextResponse.json({ error: error.message || 'Erreur analyse IA' }, { status: 500 });
  }
}
