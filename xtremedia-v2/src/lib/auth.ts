import crypto from 'crypto';
import { env } from './env';
import { SafeUser, User } from './types';

export const AUTH_COOKIE_NAME = 'xm_token';
export const AUTH_SESSION_TTL_SECONDS = 7 * 24 * 3600;
export const PBKDF2_ITERATIONS = 310_000;
export const LEGACY_PBKDF2_ITERATIONS = 100_000;

function getJwtSecret(): string {
  return env.JWT_SECRET;
}

export function getSessionCookieOptions() {
  return {
    name: AUTH_COOKIE_NAME,
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: AUTH_SESSION_TTL_SECONDS,
  };
}

export function getClearSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    value: '',
    maxAge: 0,
    expires: new Date(0),
  };
}

/**
 * Hash a plain password using PBKDF2 with SHA-256 and modern iteration count.
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');
  return { hash, salt };
}

/**
 * Verify a plain password against a stored hash and salt.
 * Supports both current v2 hashes and legacy v1 hashes so old credentials keep working.
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const currentHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');
    const storedHash = Buffer.from(hash, 'hex');
    const currentHashBuffer = Buffer.from(currentHash, 'hex');
    if (storedHash.length === currentHashBuffer.length && crypto.timingSafeEqual(storedHash, currentHashBuffer)) {
      return true;
    }

    const legacyHash = crypto.pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
    const legacyHashBuffer = Buffer.from(legacyHash, 'hex');
    if (storedHash.length !== legacyHashBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(storedHash, legacyHashBuffer);
  } catch {
    return false;
  }
}

export function upgradePasswordIfNeeded(password: string, currentHash: string, salt: string): { needsUpgrade: boolean; hash?: string; salt?: string } {
  const nextHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');
  if (nextHash === currentHash) {
    return { needsUpgrade: false };
  }

  const legacyHash = crypto.pbkdf2Sync(password, salt, LEGACY_PBKDF2_ITERATIONS, 64, 'sha512').toString('hex');
  if (legacyHash !== currentHash) {
    return { needsUpgrade: false };
  }

  const upgraded = hashPassword(password, salt);
  return { needsUpgrade: true, hash: upgraded.hash, salt: upgraded.salt };
}

/**
 * Helper to encode Base64 URL
 */
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Helper to decode Base64 URL
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export interface JwtPayload {
  sub: string; // user ID
  username: string;
  role: string;
  displayName: string;
  iat: number;
  exp: number;
}

/**
 * Generate a cryptographically signed JWT token (HS256)
 */
export function createToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresInSec = 7 * 24 * 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Verify and decode a JWT token. Returns null if invalid or expired.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', getJwtSecret())
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Sanitize User object (remove sensitive credentials)
 */
export function sanitizeUser(user: User): SafeUser {
  const { passwordHash: _, salt: __, ...safe } = user;
  return safe;
}

export interface AdminAuthResult {
  authorized: boolean;
  user?: User;
  error?: string;
  status: number;
}

/**
 * Verify if request is from an authorized ADMIN or MODERATOR
 */
export async function verifyAdminRequest(
  tokenValue: string | undefined,
  findUserById: (id: string) => User | Promise<User | null> | undefined
): Promise<AdminAuthResult> {
  if (!tokenValue) {
    return { authorized: false, error: 'Vui lòng đăng nhập tài khoản Quản trị viên', status: 401 };
  }

  const payload = verifyToken(tokenValue);
  if (!payload || !payload.sub) {
    return { authorized: false, error: 'Phiên làm việc đã hết hạn hoặc không hợp lệ', status: 401 };
  }

  const user = await findUserById(payload.sub);
  if (!user) {
    return { authorized: false, error: 'Tài khoản không tồn tại', status: 401 };
  }

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    return { authorized: false, error: 'Quyền truy cập bị từ chối: Chỉ Quản trị viên mới có thể thực hiện', status: 403 };
  }

  return { authorized: true, user, status: 200 };
}
