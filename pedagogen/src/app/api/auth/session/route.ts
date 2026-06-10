import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ user: null, session: null });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ user: null, session: null });
    }

    const user = getUserFromDb(payload.sub);
    if (!user) {
      return NextResponse.json({ user: null, session: null });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      session: { access_token: token },
    });
  } catch {
    return NextResponse.json({ user: null, session: null });
  }
}
