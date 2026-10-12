import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const song = db.getSongById(id);
  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }
  return NextResponse.json(song);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  if (body.action === 'play') {
    const updated = db.incrementPlay(id);
    return NextResponse.json({ success: true, song: updated });
  }

  if (body.action === 'download') {
    const updated = db.incrementDownload(id);
    return NextResponse.json({ success: true, song: updated });
  }

  if (body.action === 'report_broken') {
    const success = db.reportBroken(id);
    return NextResponse.json({ success, message: 'Đã báo link hỏng thành công' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
