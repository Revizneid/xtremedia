import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

const albumUpdateSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  artistId: z.string().trim().min(1).max(120).optional(),
  coverUrl: z.string().trim().max(2048).optional(),
  description: z.string().trim().max(3000).optional(),
}).passthrough();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-albums');
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
    const bodyResult = await parseJsonBody(request, albumUpdateSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const updates = bodyResult.data;
    if (updates.coverUrl && !isHttpsUrl(updates.coverUrl)) {
      return NextResponse.json({ success: false, error: 'coverUrl phải là URL https hợp lệ' }, { status: 400 });
    }

    if (updates.artistId) {
      const artist = await db.getArtistById(updates.artistId);
      if (!artist) {
        return NextResponse.json({ success: false, error: 'Nhạc sĩ / nghệ sĩ không tồn tại' }, { status: 400 });
      }
    }

    const updated = await db.updateAlbum(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy album để cập nhật' }, { status: 404 });
    }

    return NextResponse.json({ success: true, album: updated, message: 'Cập nhật album thành công!' });
  } catch (err: unknown) {
    console.error('Update album error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi cập nhật album' }, { status: 500 });
  }
}
