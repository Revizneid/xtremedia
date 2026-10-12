import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const song = db.getSongById(id);
  if (!song) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy bài hát' }, { status: 404 });
  }

  return NextResponse.json({ success: true, song });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const updates = await request.json();
    const updated = db.updateSong(id, updates);
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
  const { id } = await params;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const deleted = db.deleteSong(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy bài hát để xóa' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Đã xóa bài hát khỏi hệ thống thành công!' });
}
