import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const brokenSongs = await db.getBrokenSongs();
  return NextResponse.json({ success: true, count: brokenSongs.length, brokenSongs });
}

const brokenSongSchema = z.object({
  songId: z.string().trim().min(1).max(120),
  newAudioUrl: z.string().trim().min(1).max(2048).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-broken');
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
    const bodyResult = await parseJsonBody(request, brokenSongSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { songId, newAudioUrl } = bodyResult.data;
    if (newAudioUrl && !isHttpsUrl(newAudioUrl)) {
      return NextResponse.json({ success: false, error: 'newAudioUrl phải là URL https hợp lệ' }, { status: 400 });
    }

    const success = await db.fixBroken(songId, newAudioUrl);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy bài hát để sửa link' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Đã khắc phục link phát nhạc thành công! Bài hát đã được mở lại bình thường.',
    });
  } catch (err: unknown) {
    console.error('Fix broken link error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi xử lý link hỏng' }, { status: 500 });
  }
}
