import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getClearSessionCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Đăng xuất tài khoản thành công',
  });

  response.cookies.set({
    ...getClearSessionCookieOptions(),
    name: AUTH_COOKIE_NAME,
    value: '',
  });

  return response;
}
