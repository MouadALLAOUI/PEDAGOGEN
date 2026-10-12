import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSkills,
  getSkillById,
  createSkill,
  updateSkill,
  deleteSkill,
  resolveApplicableSkills,
} from '@/lib/skills/skillManager';
import { verifyToken } from '@/lib/db/auth';

async function getUserIdFromRequest(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    const payload = await verifyToken(token);
    if (payload?.sub) return String(payload.sub);
  }
  return request.headers.get('x-user-id') || 'default';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const contextMode = searchParams.get('context');

    // Mode résolution contextuelle pour /generate
    if (contextMode === 'resolve') {
      const matiere = searchParams.get('matiere') || '';
      const niveau = searchParams.get('niveau') || '';
      const unite = searchParams.get('unite') || '';
      const lecon = searchParams.get('lecon') || '';

      const resolution = resolveApplicableSkills(
        { matiere, niveau: niveau as any, unite, lecon },
        undefined,
        userId
      );
      return NextResponse.json(resolution);
    }

    const skills = getAllSkills(userId);
    return NextResponse.json({ skills });
  } catch (error) {
    console.error('Failed to get skills:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération des skills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();

    if (!body.name || !body.prompt_instruction) {
      return NextResponse.json({ error: 'Le nom et les instructions du skill sont obligatoires' }, { status: 400 });
    }

    const skill = createSkill(body, userId);
    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    console.error('Failed to create skill:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du skill' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Identifiant de skill manquant' }, { status: 400 });
    }

    const existing = getSkillById(body.id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }
    if (existing.is_builtin) {
      return NextResponse.json({ error: 'Les skills intégrés par défaut ne peuvent pas être directement modifiés' }, { status: 403 });
    }

    const updated = updateSkill(body, userId);
    return NextResponse.json({ skill: updated });
  } catch (error) {
    console.error('Failed to update skill:', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du skill' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Identifiant manquant' }, { status: 400 });
    }

    const existing = getSkillById(id, userId);
    if (!existing) {
      return NextResponse.json({ error: 'Skill introuvable' }, { status: 404 });
    }
    if (existing.is_builtin) {
      return NextResponse.json({ error: 'Les skills intégrés ne peuvent pas être supprimés' }, { status: 403 });
    }

    const deleted = deleteSkill(id, userId);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Failed to delete skill:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression du skill' }, { status: 500 });
  }
}
