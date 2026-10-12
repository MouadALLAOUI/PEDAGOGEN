import { NextRequest, NextResponse } from 'next/server';
import { toggleSkill, getSkillById } from '@/lib/skills/skillManager';
import { verifyToken } from '@/lib/db/auth';

async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sub) return String(payload.sub);
  }
  return request.headers.get('x-user-id') || 'default';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserIdFromRequest(request);

    const existing = getSkillById(id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }

    const nextState = toggleSkill(id, userId);
    return NextResponse.json({ success: true, is_enabled: nextState });
  } catch (error) {
    console.error('Failed to toggle skill:', error);
    return NextResponse.json({ error: 'Erreur lors du changement d état du skill' }, { status: 500 });
  }
}