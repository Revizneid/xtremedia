import crypto from 'crypto';
import { SafeUser, User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'xtremedia-v2-super-secret-key-cyber-acoustic-2026';
export const AUTH_COOKIE_NAME = 'xm_token';

/**
 * Hash a plain password using PBKDF2 with SHA-512 and random salt (OWASP Recommended)
 */
export function hashPassword(password: string, customSalt?: string): { hash: string; salt: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify a plain password against stored hash & salt using timing-safe comparison
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const hashBuffer = Buffer.from(hash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');
    if (hashBuffer.length !== computedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(hashBuffer, computedBuffer);
  } catch {
    return false;
  }
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
    .createHmac('sha256', JWT_SECRET)
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
      .createHmac('sha256', JWT_SECRET)
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
export function verifyAdminRequest(
  tokenValue: string | undefined,
  findUserById: (id: string) => User | undefined
): AdminAuthResult {
  if (!tokenValue) {
    return { authorized: false, error: 'Vui lòng đăng nhập tài khoản Quản trị viên', status: 401 };
  }

  const payload = verifyToken(tokenValue);
  if (!payload || !payload.sub) {
    return { authorized: false, error: 'Phiên làm việc đã hết hạn hoặc không hợp lệ', status: 401 };
  }

  const user = findUserById(payload.sub);
  if (!user) {
    return { authorized: false, error: 'Tài khoản không tồn tại', status: 401 };
  }

  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    return { authorized: false, error: 'Quyền truy cập bị từ chối: Chỉ Quản trị viên mới có thể thực hiện', status: 403 };
  }

  return { authorized: true, user, status: 200 };
}
