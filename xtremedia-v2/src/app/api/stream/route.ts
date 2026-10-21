import { NextRequest, NextResponse } from 'next/server';
import net from 'node:net';
import { db } from '@/lib/db';

const streamRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const first = forwarded.split(',')[0]?.trim();
  if (first) return first;

  const realIp = request.headers.get('x-real-ip') ?? '';
  if (realIp) return realIp;

  return 'unknown';
}

function getAllowedHosts(): string[] {
  const configured = process.env.STREAM_ALLOWED_HOSTS ?? 'github.com,*.githubusercontent.com,objects.githubusercontent.com';
  return configured
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatchesPattern(hostname: string, pattern: string): boolean {
  const normalized = pattern.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith('*.')) {
    const suffix = normalized.slice(2);
    return hostname.endsWith(`.${suffix}`) && hostname !== suffix;
  }

  return hostname === normalized || hostname.endsWith(`.${normalized}`);
}

function isPrivateOrLocalHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized || normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }

  if (net.isIP(normalized)) {
    const address = normalized.includes(':') ? normalized : normalized.split('.').map(Number);

    if (typeof address === 'string') {
      const isLoopback = address === '::1';
      const isPrivate = address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80');
      return isLoopback || isPrivate;
    }

    const [a, b, c, d] = address as number[];
    if (a === 127 || a === 10) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0 || a === 255) return true;
    return false;
  }

  return false;
}

function isAllowedAudioUrl(rawUrl: string): { ok: true; host: string } | { ok: false; reason: string } {
  if (!rawUrl) {
    return { ok: false, reason: 'No audio source specified' };
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return { ok: false, reason: 'Audio URL must use HTTPS' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname || isPrivateOrLocalHost(hostname)) {
      return { ok: false, reason: 'Audio host is not allowed' };
    }

    const allowedHosts = getAllowedHosts();
    if (allowedHosts.length === 0 || !allowedHosts.some((pattern) => hostMatchesPattern(hostname, pattern))) {
      return { ok: false, reason: 'Audio host is not allowed' };
    }

    return { ok: true, host: hostname };
  } catch {
    return { ok: false, reason: 'Audio URL is invalid' };
  }
}

function logStreamEvent(songId: string | null, mode: 'redirect' | 'proxy' | 'blocked', host?: string) {
  console.log(JSON.stringify({ event: 'stream', songId, mode, host }));
}

function rejectProxyRateLimit(request: NextRequest): NextResponse | null {
  const limit = Number(process.env.STREAM_PROXY_RATE_LIMIT ?? '30');
  const windowMs = Number(process.env.STREAM_PROXY_RATE_WINDOW_MS ?? '60000');
  if (!Number.isFinite(limit) || !Number.isFinite(windowMs) || limit <= 0 || windowMs <= 0) {
    return null;
  }

  const now = Date.now();
  const key = `stream-proxy:${getClientIp(request)}`;
  const bucket = streamRateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    streamRateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json({ error: 'Too many stream requests' }, { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } });
  }

  bucket.count += 1;
  return null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  if (searchParams.has('url')) {
    return NextResponse.json({ error: 'URL parameter is not supported. Use ?id=<songId>.' }, { status: 400 });
  }

  const songId = searchParams.get('id');
  if (!songId) {
    return NextResponse.json({ error: 'Missing song id' }, { status: 400 });
  }

  const song = await db.getSongById(songId);
  if (!song) {
    logStreamEvent(songId, 'blocked');
    return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  }

  const allowedAudio = isAllowedAudioUrl(song.audioUrl);
  if (!allowedAudio.ok) {
    logStreamEvent(songId, 'blocked', undefined);
    return NextResponse.json({ error: 'Audio host is not allowed' }, { status: 403 });
  }

  const host = allowedAudio.host;
  const proxyEnabled = (process.env.STREAM_PROXY_ENABLED ?? 'false').toLowerCase() === 'true';
  const rangeHeader = request.headers.get('range');

  if (!proxyEnabled) {
    logStreamEvent(songId, 'redirect', host);
    return NextResponse.redirect(song.audioUrl, 302);
  }

  const rateLimited = rejectProxyRateLimit(request);
  if (rateLimited) {
    logStreamEvent(songId, 'blocked', host);
    return rateLimited;
  }

  try {
    const upstream = await fetch(song.audioUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(25000),
    });

    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location');
      if (!location) {
        logStreamEvent(songId, 'blocked', host);
        return NextResponse.json({ error: 'Audio host is not allowed' }, { status: 403 });
      }

      const redirectTarget = new URL(location, song.audioUrl);
      const redirectValidation = isAllowedAudioUrl(redirectTarget.toString());
      if (!redirectValidation.ok) {
        logStreamEvent(songId, 'blocked', host);
        return NextResponse.json({ error: 'Audio host is not allowed' }, { status: 403 });
      }

      logStreamEvent(songId, 'proxy', redirectValidation.host);
      return new Response(upstream.body, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
          'Accept-Ranges': 'bytes',
        },
      });
    }

    const headers = new Headers();
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg');
    headers.set('Cache-Control', 'public, max-age=3600');
    if (upstream.headers.has('content-range')) headers.set('Content-Range', upstream.headers.get('content-range')!);
    if (upstream.headers.has('content-length')) headers.set('Content-Length', upstream.headers.get('content-length')!);

    logStreamEvent(songId, 'proxy', host);
    return new Response(upstream.body, {
      status: upstream.status === 206 ? 206 : 200,
      headers,
    });
  } catch (error) {
    logStreamEvent(songId, 'blocked', host);
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 502 });
  }
}
