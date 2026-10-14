import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Role } from '@/lib/types';
import { enforceAdminOrigin, enforceRateLimit, parseJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const users = await db.getUsers();
  return NextResponse.json({ success: true, count: users.length, users });
}

const adminUserRoleSchema = z.object({
  userId: z.string().trim().min(1).max(120),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']),
});

export async function PUT(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-users');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const originResponse = enforceAdminOrigin(request);
  if (originResponse) {
    return originResponse;
  }

  try {
    const bodyResult = await parseJsonBody(request, adminUserRoleSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { userId, role } = bodyResult.data;
    const updated = await db.updateUser(userId, { role });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated, message: 'Cập nhật phân quyền thành công!' });
  } catch (err: unknown) {
    console.error('Update user role error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi cập nhật vai trò' }, { status: 500 });
  }
}
