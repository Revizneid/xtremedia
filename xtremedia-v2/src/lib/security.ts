import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const MAX_REQUEST_BODY_BYTES = 256 * 1024;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const firstForwarded = forwarded.split(',')[0]?.trim();
  if (firstForwarded) {
    return firstForwarded;
  }

  const realIp = request.headers.get('x-real-ip') ?? '';
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

export function enforceRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number,
  keyPrefix: string
): NextResponse | null {
  if (limit <= 0 || windowMs <= 0) {
    return null;
  }

  const now = Date.now();
  const bucketKey = `${keyPrefix}:${getClientIp(request)}`;
  const existing = rateLimitBuckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { success: false, error: 'Quá nhiều lần yêu cầu. Vui lòng thử lại sau.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  existing.count += 1;
  return null;
}

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

function getRequestOrigin(request: NextRequest): string | null {
  const host =
    (request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host)
      .split(',')[0]
      .trim();
  if (!host) return null;
  const proto = (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', ''))
    .split(',')[0]
    .trim();
  return normalizeOrigin(`${proto}://${host}`);
}

function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();
  const add = (value: string | undefined) => {
    const origin = normalizeOrigin(value?.trim());
    if (origin) allowed.add(origin);
  };

  for (const item of (process.env.ALLOWED_ORIGINS ?? '').split(',')) add(item);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  // Chỉ thêm nếu được khai báo tường minh (không dùng giá trị mặc định localhost)
  add(process.env.NEXT_PUBLIC_APP_URL);
  return allowed;
}

export function enforceAdminOrigin(request: NextRequest): NextResponse | null {
  // Trình duyệt hiện đại báo rõ request cùng nguồn gốc
  if (request.headers.get('sec-fetch-site') === 'same-origin') {
    return null;
  }

  const origin =
    normalizeOrigin(request.headers.get('origin')) ?? normalizeOrigin(request.headers.get('referer'));
  const requestOrigin = getRequestOrigin(request);

  if (origin && (origin === requestOrigin || getAllowedOrigins().has(origin))) {
    return null;
  }

  const errorId = crypto.randomUUID();
  console.warn(
    JSON.stringify({
      event: 'admin_origin_rejected',
      errorId,
      method: request.method,
      path: request.nextUrl.pathname,
      origin: request.headers.get('origin'),
      requestOrigin,
      secFetchSite: request.headers.get('sec-fetch-site'),
    })
  );

  return NextResponse.json(
    {
      success: false,
      error: origin ? 'Origin không được phép' : 'Thiếu thông tin Origin',
      errorId,
    },
    { status: 403 }
  );
}

export function isHttpsUrl(value: string, maxLength = 2048): boolean {
  if (!value || value.length > maxLength) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function getZodErrorMessage(error: z.ZodError): string {
  return error.issues
    .map((issue) => issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message)
    .join('; ');
}

export async function parseJsonBody<T>(request: NextRequest, schema: z.ZodType<T>): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isNaN(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, error: 'Payload quá lớn hoặc không hợp lệ' },
          { status: 413 }
        ),
      };
    }
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Payload quá lớn hoặc không hợp lệ' },
        { status: 413 }
      ),
    };
  }

  if (!rawBody.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Thiếu dữ liệu yêu cầu' },
        { status: 400 }
      ),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Dữ liệu yêu cầu không phải JSON hợp lệ' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: getZodErrorMessage(result.error) },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: result.data };
}
