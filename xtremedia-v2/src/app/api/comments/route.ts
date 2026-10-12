import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const songId = searchParams.get('songId') || undefined;
  const comments = db.getComments(songId);
  return NextResponse.json({ success: true, comments });
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để bình luận' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.sub) {
      return NextResponse.json(
        { success: false, error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        { status: 401 }
      );
    }

    const user = db.findUserById(payload.sub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Người dùng không tồn tại' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { songId, content } = body;

    if (!songId || !content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nội dung bình luận không được để trống' },
        { status: 400 }
      );
    }

    const comment = db.addComment({
      songId,
      userId: user.id,
      userName: user.displayName || user.username,
      userAvatar: user.avatarUrl,
      content: content.trim(),
    });

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (err: unknown) {
    console.error('Comments API error:', err);
    return NextResponse.json(
      { success: false, error: 'Lỗi máy chủ khi gửi bình luận' },
      { status: 500 }
    );
  }
}
