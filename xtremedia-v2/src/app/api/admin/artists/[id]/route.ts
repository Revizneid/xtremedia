import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const artistUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  avatarUrl: z.string().trim().max(2048).optional(),
  bio: z.string().trim().max(2000).optional(),
  country: z.enum(['VIETNAM', 'INTERNATIONAL']).optional(),
}).passthrough();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-artists');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;
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
    const bodyResult = await parseJsonBody(request, artistUpdateSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const updates = bodyResult.data;
    if (updates.avatarUrl && !isHttpsUrl(updates.avatarUrl)) {
      return NextResponse.json({ success: false, error: 'avatarUrl phải là URL https hợp lệ' }, { status: 400 });
    }

    const updated = await db.updateArtist(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy nghệ sĩ để cập nhật' }, { status: 404 });
    }

    return NextResponse.json({ success: true, artist: updated, message: 'Cập nhật nghệ sĩ thành công!' });
  } catch (err: unknown) {
    console.error('Update artist error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi cập nhật nghệ sĩ' }, { status: 500 });
  }
}
