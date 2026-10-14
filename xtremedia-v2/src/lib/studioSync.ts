import crypto from 'crypto';

export function constantTimeEqual(a: string, b: string): boolean {
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

export function buildStudioSyncIdempotencyKey(data: {
  audioUrl: string;
  id?: string;
  videoId?: string;
  trimStart?: number;
  trimEnd?: number;
}): string {
  const identity = data.videoId?.trim() || data.id?.trim() || data.audioUrl.trim();

  return crypto
    .createHash('sha256')
    .update(`${identity}|${Number(data.trimStart ?? 0)}|${Number(data.trimEnd ?? 0)}`)
    .digest('hex');
}

export function validateStudioSecret(authorizationHeader: string | null, expectedSecret: string | null): boolean {
  if (!expectedSecret || !authorizationHeader) {
    return false;
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  const bearerToken = match ? match[1].trim() : '';

  return bearerToken.length > 0 && constantTimeEqual(bearerToken, expectedSecret);
}
