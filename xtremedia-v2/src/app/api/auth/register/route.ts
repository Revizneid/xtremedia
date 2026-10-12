import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, displayName } = body;

    // Validation
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Địa chỉ email không hợp lệ' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate username
    if (db.findUserByUsername(cleanUsername)) {
      return NextResponse.json(
        { success: false, error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.' },
        { status: 400 }
      );
    }

    // Check duplicate email
    if (db.findUserByEmail(cleanEmail)) {
      return NextResponse.json(
        { success: false, error: 'Email này đã được đăng ký. Vui lòng sử dụng email khác.' },
        { status: 400 }
      );
    }

    // Create user
    const newUser = db.createUser({
      username: username.trim(),
      email: cleanEmail,
      password: password,
      displayName: displayName ? displayName.trim() : username.trim(),
      role: 'USER',
    });

    // Create session token
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
    console.error('Registration error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi đăng ký tài khoản. Vui lòng thử lại.' },
      { status: 500 }
    );
  }
}
