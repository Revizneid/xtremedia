import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { db } from '@/lib/db';
import { Song } from '@/lib/types';
import { enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';
import { buildStudioSyncIdempotencyKey, validateStudioSecret } from '@/lib/studioSync';

export const runtime = 'nodejs';
export const maxDuration = 30;

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

function getStudioSecret(): string | null {
  const expectedSecret = env.STUDIO_SYNC_SECRET?.trim();

  if (!expectedSecret) {
    console.error('[studio-sync] Missing STUDIO_SYNC_SECRET environment variable');
    return null;
  }

  return expectedSecret;
}

function validateRequestSecret(request: NextRequest): boolean {
  return validateStudioSecret(request.headers.get('authorization'), getStudioSecret());
}

function buildStructuredErrorLog(step: string, err: unknown) {
  const errorObject = err as {
    name?: string;
    message?: string;
    code?: string;
    meta?: { target?: string | string[] };
    stack?: string;
  };
  const stackLines = errorObject?.stack?.split('\n').slice(0, 8).join('\n') || '';

  return {
    errorId: crypto.randomUUID(),
    step,
    name: errorObject?.name || 'Error',
    prismaCode: errorObject?.code || null,
    metaTarget: Array.isArray(errorObject?.meta?.target)
      ? errorObject.meta.target
      : errorObject?.meta?.target || null,
    message: errorObject?.message || String(err),
    stack: stackLines,
  };
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

  if (!validateRequestSecret(request)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

const STUDIO_SYNC_MAX_DURATION_SECONDS = 14400;

const optionalTextSchema = (maxLength: number) =>
  z
    .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return undefined;
      const text = String(value).trim();
      if (!text || text.toLowerCase() === 'undefined' || text.toLowerCase() === 'null') {
        return undefined;
      }
      return text.slice(0, maxLength);
    })
    .pipe(z.string().max(maxLength).optional());

const studioSyncSchema = z.object({
  title: z.string().trim().min(1).max(180),
  artistName: optionalTextSchema(120),
  genreName: optionalTextSchema(80),
  albumTitle: optionalTextSchema(160),
  audioUrl: z.string().trim().min(1).max(2048),
  coverUrl: optionalTextSchema(2048),
  durationSeconds: z
    .number({ message: 'durationSeconds: expected number' })
    .finite()
    .transform((value) => Math.round(value))
    .pipe(z.number().int().min(1).max(STUDIO_SYNC_MAX_DURATION_SECONDS)),
  bitrateKbps: z.number().int().min(32).max(512).nullish().transform((value) => value ?? undefined),
  lyricsLrc: optionalTextSchema(20000),
  id: optionalTextSchema(120),
  videoId: z.string().trim().min(1).max(200),
  trimStart: z.number().int().min(0).max(STUDIO_SYNC_MAX_DURATION_SECONDS).nullish().transform((value) => value ?? 0),
  trimEnd: z.number().int().min(0).max(STUDIO_SYNC_MAX_DURATION_SECONDS).nullish().transform((value) => value ?? 0),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'studio-sync');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let step = 'validate-auth';

  try {
    const expectedSecret = getStudioSecret();
    if (!expectedSecret) {
      return NextResponse.json({ success: false, error: 'service unavailable' }, { status: 503 });
    }

    if (!validateRequestSecret(request)) {
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    step = 'parse-body';
    const bodyResult = await parseJsonBody(request, studioSyncSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { title, artistName, genreName, albumTitle, audioUrl, coverUrl, durationSeconds, bitrateKbps, lyricsLrc, id, videoId, trimStart, trimEnd } = bodyResult.data;
    const startedAt = Date.now();
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
    const cleanArtist = artistName ? String(artistName).trim() : undefined;
    const cleanGenre = genreName ? String(genreName).trim() : undefined;
    const cleanAlbumTitle = albumTitle ? String(albumTitle).trim() : undefined;
    const cleanCoverUrl = coverUrl ? String(coverUrl).trim() : undefined;
    const normalizedAudioUrl = String(audioUrl).trim();
    const titleAscii = removeVietnameseTones(cleanTitle);
    const slug = generateSlug(cleanTitle);
    const normalizedDurationSeconds = Math.round(durationSeconds);
    const normalizedTrimStart = Number(trimStart ?? 0);
    const normalizedTrimEnd = Number(trimEnd ?? 0);
    step = 'build-idempotency';
    const idempotencyKey = (request.headers.get('Idempotency-Key') || '').trim() || buildStudioSyncIdempotencyKey({
      audioUrl: normalizedAudioUrl,
      id,
      videoId,
      trimStart: normalizedTrimStart,
      trimEnd: normalizedTrimEnd,
    });
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify({
      title: cleanTitle,
      artistName: cleanArtist,
      genreName: cleanGenre,
      albumTitle: cleanAlbumTitle,
      audioUrl: normalizedAudioUrl,
      coverUrl: cleanCoverUrl,
      durationSeconds: normalizedDurationSeconds,
      bitrateKbps: bitrateKbps ?? undefined,
      lyricsLrc: lyricsLrc ? String(lyricsLrc).trim() : undefined,
      id: id || undefined,
      videoId,
      trimStart: normalizedTrimStart,
      trimEnd: normalizedTrimEnd,
    })).digest('hex');

    step = 'sync-db';
    const syncResult = await db.syncSongFromStudio({
      idempotencyKey,
      payloadHash,
      payload: {
        title: cleanTitle,
        artistName: cleanArtist,
        genreName: cleanGenre,
        albumTitle: cleanAlbumTitle,
        audioUrl: normalizedAudioUrl,
        coverUrl: cleanCoverUrl,
        durationSeconds: normalizedDurationSeconds,
        bitrateKbps: bitrateKbps ?? undefined,
        lyricsLrc: lyricsLrc ? String(lyricsLrc).trim() : undefined,
        id,
        videoId,
        trimStart: normalizedTrimStart,
        trimEnd: normalizedTrimEnd,
      },
    });

    const outcome = syncResult.duplicate ? 'reused' : 'created';
    const songId = syncResult.song?.id ?? null;
    const refreshedSong = songId ? await db.getSongById(songId) : null;
    const payloadForResponse = refreshedSong ?? syncResult.song ?? null;
    const durationMs = Date.now() - startedAt;
    console.log(JSON.stringify({
      event: 'studio_sync',
      outcome,
      songId,
      videoId,
      durationMs,
    }));

    if (syncResult.duplicate) {
      return NextResponse.json({
        success: true,
        outcome: 'reused',
        duplicate: true,
        songId,
        song: payloadForResponse,
        message: 'Bài hát đã được đồng bộ trước đó và không tạo bản ghi mới.',
      }, { status: 200 });
    }

    const newSong: Song = {
      id: syncResult.song?.id || id || ('song-' + Date.now()),
      title: cleanTitle,
      titleAscii,
      slug,
      artistId: syncResult.song?.artistId || 'artist-' + Date.now(),
      artistName: cleanArtist || 'Chưa rõ',
      albumId: null,
      albumTitle: cleanAlbumTitle || null,
      genreId: null,
      genreName: cleanGenre || 'Chưa phân loại',
      audioUrl: normalizedAudioUrl,
      coverUrl: cleanCoverUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
      durationSeconds: normalizedDurationSeconds,
      bitrateKbps: bitrateKbps ?? 320,
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
      outcome: 'created',
      duplicate: false,
      songId: payloadForResponse?.id ?? newSong.id,
      song: payloadForResponse ?? newSong,
      message: 'XtreMedia Studio đã đồng bộ bài hát thành công!',
    }, { status: 201 });
  } catch (err: unknown) {
    const structured = buildStructuredErrorLog(step, err);
    const isTransactionNotFound = structured.prismaCode === 'P2028' || /Transaction API error|Transaction not found/i.test(structured.message);
    console.error(JSON.stringify(structured));

    if (isTransactionNotFound) {
      return NextResponse.json(
        { success: false, error: 'internal_error', errorId: structured.errorId },
        { status: 503, headers: { 'Retry-After': '5' } }
      );
    }

    return NextResponse.json(
      { success: false, error: 'internal_error', errorId: structured.errorId },
      { status: 500 }
    );
  }
}
