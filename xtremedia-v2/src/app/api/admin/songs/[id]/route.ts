import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const song = await db.getSongById(id);
  if (!song) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy bài hát' }, { status: 404 });
  }

  return NextResponse.json({ success: true, song });
}

const adminSongUpdateSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  artistName: z.string().trim().min(1).max(120).optional(),
  genreName: z.string().trim().max(80).optional(),
  albumTitle: z.string().trim().max(160).optional(),
  audioUrl: z.string().trim().min(1).max(2048).optional(),
  coverUrl: z.string().trim().max(2048).optional(),
  durationSeconds: z.union([z.number(), z.string()]).optional(),
  bitrateKbps: z.union([z.number(), z.string()]).optional(),
  lyricsLrc: z.string().trim().max(20000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
}).passthrough();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-songs');
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
    const bodyResult = await parseJsonBody(request, adminSongUpdateSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const updates = bodyResult.data;
    if (updates.audioUrl && !isHttpsUrl(updates.audioUrl)) {
      return NextResponse.json({ success: false, error: 'audioUrl phải là URL https hợp lệ' }, { status: 400 });
    }
    if (updates.coverUrl && !isHttpsUrl(updates.coverUrl)) {
      return NextResponse.json({ success: false, error: 'coverUrl phải là URL https hợp lệ' }, { status: 400 });
    }

    const updated = await db.updateSong(id, updates as Parameters<typeof db.updateSong>[1]);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy bài hát để cập nhật' }, { status: 404 });
    }

    return NextResponse.json({ success: true, song: updated, message: 'Cập nhật bài hát thành công!' });
  } catch (err: unknown) {
    console.error('Update song error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi cập nhật bài hát' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-songs');
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

  const deleted = await db.deleteSong(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy bài hát để xóa' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Đã xóa bài hát khỏi hệ thống thành công!' });
}
