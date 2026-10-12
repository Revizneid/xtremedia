import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Role } from '@/lib/types';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const users = db.getUsers();
  return NextResponse.json({ success: true, count: users.length, users });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin userId hoặc role' }, { status: 400 });
    }

    const validRoles: Role[] = ['USER', 'MODERATOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Vai trò người dùng không hợp lệ' }, { status: 400 });
    }

    const updated = db.updateUser(userId, { role });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated, message: 'Cập nhật phân quyền thành công!' });
  } catch (err: unknown) {
    console.error('Update user role error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi cập nhật vai trò' }, { status: 500 });
  }
}
