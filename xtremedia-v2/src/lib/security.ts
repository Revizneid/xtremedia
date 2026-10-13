import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';

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

export function enforceAdminOrigin(request: NextRequest): NextResponse | null {
  const originHeader = request.headers.get('origin');
  if (!originHeader) {
    return null;
  }

  try {
    const allowedOrigin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
    const requestOrigin = new URL(originHeader).origin;
    if (requestOrigin !== allowedOrigin) {
      return NextResponse.json(
        { success: false, error: 'Origin không được phép' },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Origin không hợp lệ' },
      { status: 403 }
    );
  }

  return null;
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
