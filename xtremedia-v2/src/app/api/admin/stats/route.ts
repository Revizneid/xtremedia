import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (id) => db.findUserById(id));

  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const stats = await db.getAdminStats();
  return NextResponse.json({
    success: true,
    stats,
    adminUser: {
      id: auth.user!.id,
      username: auth.user!.username,
      displayName: auth.user!.displayName,
      role: auth.user!.role,
    },
  });
}
