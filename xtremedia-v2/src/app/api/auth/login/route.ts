import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createToken, AUTH_COOKIE_NAME, sanitizeUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng điền đầy đủ tài khoản và mật khẩu' },
        { status: 400 }
      );
    }

    const user = db.findUserByIdentifier(identifier);
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

    // Set HttpOnly cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600, // 7 days
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
