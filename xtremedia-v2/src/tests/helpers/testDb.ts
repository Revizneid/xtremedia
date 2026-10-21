/**
 * testDb.ts – helper dùng trong test tích hợp DB.
 *
 * Quy tắc:
 *  - Nếu TEST_DATABASE_URL không có → skip bằng cách throw SkipError.
 *  - Nếu có → kiểm tra tên host/database phải chứa "test" hoặc là localhost;
 *    nếu không match → abort để tránh ghi nhầm production.
 *  - Không đọc, không in giá trị DATABASE_URL hay bất kỳ secret nào.
 */

/** Symbol dùng để đánh dấu lỗi skip (khác với lỗi thật). */
const SKIP_SYMBOL = Symbol('skip');

export class SkipError extends Error {
  readonly [SKIP_SYMBOL] = true;
  constructor(reason: string) {
    super(reason);
    this.name = 'SkipError';
  }
}

export function isSkipError(err: unknown): err is SkipError {
  return (
    err instanceof SkipError ||
    (typeof err === 'object' && err !== null && SKIP_SYMBOL in err)
  );
}

/** Danh sách pattern host/database được phép dùng làm test DB. */
const SAFE_URL_PATTERNS = [/\blocalhost\b/, /\b127\.0\.0\.1\b/, /test/i];

function isSafeTestUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const safeInHost = SAFE_URL_PATTERNS.some((re) => re.test(parsed.hostname));
    const safeInPath = SAFE_URL_PATTERNS.some((re) => re.test(parsed.pathname));
    return safeInHost || safeInPath;
  } catch {
    return false;
  }
}

/**
 * Gọi đầu test để lấy TEST_DATABASE_URL đã được kiểm duyệt.
 *
 * Nếu biến không có → ném SkipError (test sẽ được skip rõ ràng).
 * Nếu URL không an toàn → ném Error (abort cứng, không skip).
 *
 * @example
 * const url = requireTestDatabaseUrl();
 * process.env.DATABASE_URL = url;
 */
export function requireTestDatabaseUrl(): string {
  const url = process.env['TEST_DATABASE_URL'];

  if (!url) {
    throw new SkipError(
      'TEST_DATABASE_URL không được đặt → test tích hợp DB bị SKIP. ' +
      'Xem docs/TESTING.md để biết cách tạo database test.'
    );
  }

  if (!isSafeTestUrl(url)) {
    throw new Error(
      'TEST_DATABASE_URL không qua kiểm tra an toàn: ' +
      'URL host/database phải chứa "test" hoặc là localhost/127.0.0.1. ' +
      'Dừng để tránh ghi nhầm vào database production.'
    );
  }

  return url;
}

/**
 * Wrap một test tích hợp DB: tự động skip khi không có TEST_DATABASE_URL.
 *
 * @example
 * await withTestDb(async () => {
 *   // test dùng DB thật ở đây
 * });
 */
export async function withTestDb(fn: () => Promise<void>): Promise<void> {
  const url = requireTestDatabaseUrl(); // throws SkipError nếu không có

  // Đặt DATABASE_URL cho Prisma client trong test này.
  // Không dùng DATABASE_URL production – chỉ dùng TEST_DATABASE_URL đã kiểm duyệt.
  const prev = process.env['DATABASE_URL'];
  process.env['DATABASE_URL'] = url;

  try {
    await fn();
  } finally {
    if (prev === undefined) {
      delete process.env['DATABASE_URL'];
    } else {
      process.env['DATABASE_URL'] = prev;
    }
  }
}
