import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME, sanitizeUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const user = db.findUserById(payload.sub);
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    console.error('Session check error:', err);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
