import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { enforceRateLimit, parseJsonBody } from '@/lib/security';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const song = await db.getSongById(id);
  if (!song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }
  return NextResponse.json(song);
}

const songActionSchema = z.object({
  action: z.enum(['play', 'download', 'report_broken']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimitResponse = enforceRateLimit(request, 120, 60_000, 'public-api');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { id } = await params;
  const bodyResult = await parseJsonBody(request, songActionSchema);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const { action } = bodyResult.data;

  if (action === 'play') {
    const updated = await db.incrementPlay(id);
    return NextResponse.json({ success: true, song: updated });
  }

  if (action === 'download') {
    const updated = await db.incrementDownload(id);
    return NextResponse.json({ success: true, song: updated });
  }

  if (action === 'report_broken') {
    const success = await db.reportBroken(id);
    return NextResponse.json({ success, message: 'Đã báo link hỏng thành công' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
