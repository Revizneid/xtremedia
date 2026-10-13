import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createToken, AUTH_COOKIE_NAME, getSessionCookieOptions } from '@/lib/auth';
import { enforceRateLimit, parseJsonBody } from '@/lib/security';

const registerSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().trim().max(80).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 5, 60_000, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const bodyResult = await parseJsonBody(request, registerSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { username, email, password, displayName } = bodyResult.data;
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (await db.findUserByUsername(cleanUsername)) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.' },
        { status: 400 }
      );
    }

    if (await db.findUserByEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email này đã được đăng ký. Vui lòng sử dụng email khác.' },
        { status: 400 }
      );
    }

    const newUser = await db.createUser({
      username: username.trim(),
      email: cleanEmail,
      password,
      displayName: displayName ? displayName.trim() : username.trim(),
      role: 'USER',
    });

    const token = createToken({
      sub: newUser.id,
      username: newUser.username,
      role: newUser.role,
      displayName: newUser.displayName,
    });

    const response = NextResponse.json(
      { success: true, user: newUser, message: 'Đăng ký tài khoản thành công!' },
      { status: 201 }
    );

    response.cookies.set({
      ...getSessionCookieOptions(),
      name: AUTH_COOKIE_NAME,
      value: token,
    });

    return response;
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi đăng ký tài khoản. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
