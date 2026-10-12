import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const brokenSongs = db.getBrokenSongs();
  return NextResponse.json({ success: true, count: brokenSongs.length, brokenSongs });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { songId, newAudioUrl } = body;

    if (!songId) {
      return NextResponse.json({ success: false, error: 'Thiếu mã bài hát (songId)' }, { status: 400 });
    }

    const success = db.fixBroken(songId, newAudioUrl);
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
