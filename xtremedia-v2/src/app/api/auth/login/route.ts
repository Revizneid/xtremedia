import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  verifyPassword,
  createToken,
  AUTH_COOKIE_NAME,
  sanitizeUser,
  upgradePasswordIfNeeded,
  getSessionCookieOptions,
} from '@/lib/auth';
import { enforceRateLimit, parseJsonBody } from '@/lib/security';

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 5, 60_000, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const bodyResult = await parseJsonBody(request, loginSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { identifier, password } = bodyResult.data;

    const user = await db.findUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Tài khoản hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const upgrade = upgradePasswordIfNeeded(password, user.passwordHash, user.salt);
    if (upgrade.needsUpgrade && upgrade.hash && upgrade.salt) {
      await db.updateUser(user.id, {
        passwordHash: upgrade.hash,
        salt: upgrade.salt,
        updatedAt: new Date().toISOString(),
      });
    }

    const safeUser = sanitizeUser(user);
    const token = createToken({
      sub: safeUser.id,
      username: safeUser.username,
      role: safeUser.role,
      displayName: safeUser.displayName,
    });

    const response = NextResponse.json({
      success: true,
      user: safeUser,
      message: 'Đăng nhập thành công!',
    });

    response.cookies.set({
      ...getSessionCookieOptions(),
      name: AUTH_COOKIE_NAME,
      value: token,
    });

    return response;
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi đăng nhập. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
