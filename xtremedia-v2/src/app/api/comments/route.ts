import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { enforceRateLimit, parseJsonBody } from '@/lib/security';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const songId = searchParams.get('songId') || undefined;
  const comments = await db.getComments(songId);
  return NextResponse.json({ success: true, comments });
}

const commentSchema = z.object({
  songId: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 60, 60_000, 'comments');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

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

    const user = await db.findUserById(payload.sub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Người dùng không tồn tại' },
        { status: 401 }
      );
    }

    const bodyResult = await parseJsonBody(request, commentSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { songId, content } = bodyResult.data;
    const comment = await db.addComment({
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
