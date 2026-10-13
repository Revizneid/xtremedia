import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { Song } from '@/lib/types';
import { enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function generateSlug(text: string): string {
  return removeVietnameseTones(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  } catch {
    return false;
  }
}

function getStudioSecret(): string | null {
  const expectedSecret = env.STUDIO_SYNC_SECRET?.trim();

  if (!expectedSecret) {
    console.error('[studio-sync] Missing STUDIO_SYNC_SECRET environment variable');
    return null;
  }

  return expectedSecret;
}

function buildIdempotencyKey(data: {
  audioUrl: string;
  id?: string;
  videoId?: string;
  trimStart?: number;
  trimEnd?: number;
}): string {
  const identity = data.videoId?.trim() || data.id?.trim() || data.audioUrl.trim();
  return crypto.createHash('sha256')
    .update(`${identity}|${Number(data.trimStart ?? 0)}|${Number(data.trimEnd ?? 0)}`)
    .digest('hex');
}

function validateStudioSecret(request: NextRequest): boolean {
  const expectedSecret = getStudioSecret();
  if (!expectedSecret) {
    return false;
  }

  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = match ? match[1].trim() : '';

  return bearerToken.length > 0 && constantTimeEqual(bearerToken, expectedSecret);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
    },
  });
}

export async function GET(request: NextRequest) {
  const expectedSecret = getStudioSecret();
  if (!expectedSecret) {
    return NextResponse.json({ success: false, error: 'service unavailable' }, { status: 503 });
  }

  if (!validateStudioSecret(request)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

const studioSyncSchema = z.object({
  title: z.string().trim().min(1).max(180),
  artistName: z.string().trim().max(120).optional().default('Nghệ Sĩ XtreMedia'),
  genreName: z.string().trim().max(80).optional(),
  albumTitle: z.string().trim().max(160).optional(),
  audioUrl: z.string().trim().min(1).max(2048),
  coverUrl: z.string().trim().max(2048).optional(),
  durationSeconds: z.number().int().min(1).max(3600).optional(),
  bitrateKbps: z.number().int().min(32).max(512).optional(),
  lyricsLrc: z.string().trim().max(20000).optional(),
  id: z.string().trim().max(120).optional(),
  videoId: z.string().trim().max(200).optional(),
  trimStart: z.number().int().min(0).max(3600).optional(),
  trimEnd: z.number().int().min(0).max(3600).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'studio-sync');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const expectedSecret = getStudioSecret();
    if (!expectedSecret) {
      return NextResponse.json({ success: false, error: 'service unavailable' }, { status: 503 });
    }

    if (!validateStudioSecret(request)) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const bodyResult = await parseJsonBody(request, studioSyncSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { title, artistName, genreName, albumTitle, audioUrl, coverUrl, durationSeconds, bitrateKbps, lyricsLrc, id, videoId, trimStart, trimEnd } = bodyResult.data;
    if (!isHttpsUrl(audioUrl)) {
      return NextResponse.json(
        { success: false, error: 'audioUrl phải là URL https hợp lệ' },
        { status: 400 }
      );
    }
    if (coverUrl && !isHttpsUrl(coverUrl)) {
      return NextResponse.json(
        { success: false, error: 'coverUrl phải là URL https hợp lệ' },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();
    const cleanArtist = (artistName || 'Nghệ Sĩ XtreMedia').trim();
    const normalizedAudioUrl = String(audioUrl).trim();
    const titleAscii = removeVietnameseTones(cleanTitle);
    const slug = generateSlug(cleanTitle);
    const idempotencyKey = (request.headers.get('Idempotency-Key') || '').trim() || buildIdempotencyKey({
      audioUrl: normalizedAudioUrl,
      id,
      videoId,
      trimStart,
      trimEnd,
    });
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify({
      title: cleanTitle,
      artistName: cleanArtist,
      genreName: genreName || 'Nhạc Trẻ V-Pop',
      albumTitle: albumTitle ? String(albumTitle).trim() : null,
      audioUrl: normalizedAudioUrl,
      coverUrl: coverUrl ? String(coverUrl).trim() : null,
      durationSeconds: Number(durationSeconds) || 210,
      bitrateKbps: Number(bitrateKbps) || 320,
      lyricsLrc: lyricsLrc ? String(lyricsLrc).trim() : null,
      id: id || null,
      videoId: videoId || null,
      trimStart: Number(trimStart ?? 0),
      trimEnd: Number(trimEnd ?? 0),
    })).digest('hex');

    const syncResult = await db.syncSongFromStudio({
      idempotencyKey,
      payloadHash,
      payload: {
        title: cleanTitle,
        artistName: cleanArtist,
        genreName: genreName || 'Nhạc Trẻ V-Pop',
        albumTitle: albumTitle ? String(albumTitle).trim() : undefined,
        audioUrl: normalizedAudioUrl,
        coverUrl: coverUrl ? String(coverUrl).trim() : undefined,
        durationSeconds: Number(durationSeconds) || 210,
        bitrateKbps: Number(bitrateKbps) || 320,
        lyricsLrc: lyricsLrc ? String(lyricsLrc).trim() : undefined,
        id,
        videoId,
        trimStart: Number(trimStart ?? 0),
        trimEnd: Number(trimEnd ?? 0),
      },
    });

    if (syncResult.duplicate) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        song: syncResult.song,
        message: 'Bài hát đã được đồng bộ trước đó và không tạo bản ghi mới.',
      }, { status: 200 });
    }

    const newSong: Song = {
      id: syncResult.song?.id || id || ('song-' + Date.now()),
      title: cleanTitle,
      titleAscii,
      slug,
      artistId: syncResult.song?.artistId || 'artist-' + Date.now(),
      artistName: cleanArtist,
      albumId: null,
      albumTitle: albumTitle ? String(albumTitle).trim() : null,
      genreId: null,
      genreName: genreName || 'Nhạc Trẻ V-Pop',
      audioUrl: normalizedAudioUrl,
      coverUrl: coverUrl && String(coverUrl).trim()
        ? String(coverUrl).trim()
        : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
      durationSeconds: Number(durationSeconds) || 210,
      bitrateKbps: Number(bitrateKbps) || 320,
      lyricsLrc: lyricsLrc ? String(lyricsLrc).trim() : undefined,
      playCount: 0,
      playCountMonth: 0,
      downloadCount: 0,
      isBroken: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      song: syncResult.song || newSong,
      message: 'XtreMedia Studio đã đồng bộ bài hát thành công!',
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('Studio sync error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đồng bộ bài hát' }, { status: 500 });
  }
}
