/**
 * syncLogRepo.test.ts – Test TÍCH HỢP (cần DB thật).
 *
 * Các test này dùng mock Prisma methods (monkey-patch) nên KHÔNG cần kết nối DB thật.
 * Tuy nhiên Prisma client vẫn khởi tạo và đọc DATABASE_URL khi import.
 *
 * Quy tắc:
 *  - Đặt DATABASE_URL thành giá trị local an toàn trước khi import Prisma.
 *  - Không đọc hay in DATABASE_URL production.
 *  - Nếu TEST_DATABASE_URL có và an toàn → dùng nó; nếu không → dùng local dummy.
 *  - Test "title and artist alone are not considered duplicate when the audioUrl differs"
 *    đã được chuyển sang syncLogDecision.test.ts (pure, không cần DB).
 */

// Phải set DATABASE_URL TRƯỚC khi import @prisma/client.
// Dùng TEST_DATABASE_URL nếu có và an toàn; không thì dùng dummy localhost.
(function bootstrapDatabaseUrl() {
  const testUrl = process.env['TEST_DATABASE_URL'];
  const safePatterns = [/\blocalhost\b/, /\b127\.0\.0\.1\b/, /test/i];
  const isSafe = (url: string) => {
    try {
      const parsed = new URL(url);
      return safePatterns.some((re) => re.test(parsed.hostname) || re.test(parsed.pathname));
    } catch {
      return false;
    }
  };

  if (testUrl && isSafe(testUrl)) {
    process.env['DATABASE_URL'] = testUrl;
    process.env['DIRECT_URL'] = testUrl;
  } else {
    // Dummy không thể kết nối – OK vì tests dùng monkey-patch, không dùng kết nối thật
    process.env['DATABASE_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/xtremedia_test';
    process.env['DIRECT_URL'] ??= 'postgresql://postgres:postgres@localhost:5432/xtremedia_test';
  }
})();

import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@/lib/prisma';
import { buildStudioSyncIdempotencyKey } from '@/lib/studioSync';
import { songRepo } from './songRepo.js';
import { syncLogRepo } from './syncLogRepo.js';

const sampleSongRecord = {
  id: 'song-123',
  title: 'Test Song',
  titleAscii: 'Test Song',
  slug: 'test-song',
  artistId: 'artist-1',
  artist: { name: 'Tester' },
  album: null,
  genre: { name: 'Pop' },
  audioUrl: 'https://example.com/test-song.mp3',
  coverUrl: null,
  thumbnailUrl: null,
  durationSec: 180,
  playCount: 0,
  downloadCount: 0,
  isBroken: false,
  status: 'ACTIVE',
  createdAt: new Date('2026-10-17T00:00:00Z'),
};

// ─── Test 1: idempotency key đã tồn tại → REUSED ────────────────────────────
test('reuses same idempotency key without creating a duplicate record', async () => {
  const originalFindUnique = prisma.syncLog.findUnique.bind(prisma.syncLog);
  const originalSongFindFirst = prisma.song.findFirst.bind(prisma.song);
  const originalUpdate = prisma.syncLog.update.bind(prisma.syncLog);
  const originalArtistUpsert = prisma.artist.upsert.bind(prisma.artist);
  const originalArtistFindFirst = prisma.artist.findFirst.bind(prisma.artist);
  const originalGenreUpsert = prisma.genre.upsert.bind(prisma.genre);
  const originalGenreFindFirst = prisma.genre.findFirst.bind(prisma.genre);
  const originalAlbumUpsert = prisma.album.upsert.bind(prisma.album);
  const originalAlbumFindFirst = prisma.album.findFirst.bind(prisma.album);

  try {
    (prisma.syncLog as any).findUnique = async () => ({ id: 'log-1', idempotencyKey: 'same-key' });
    (prisma.song as any).findFirst = async () => sampleSongRecord;
    (prisma.syncLog as any).update = async () => ({ id: 'log-1' });
    (prisma.artist as any).upsert = async () => ({ id: 'artist-1', name: 'Tester', slug: 'tester' });
    (prisma.artist as any).findFirst = async () => ({ id: 'artist-1', name: 'Tester', slug: 'tester' });
    (prisma.genre as any).upsert = async () => ({ id: 'genre-1', name: 'Pop', slug: 'pop' });
    (prisma.genre as any).findFirst = async () => ({ id: 'genre-1', name: 'Pop', slug: 'pop' });
    (prisma.album as any).upsert = async () => ({ id: 'album-1', title: 'Album Test', artistId: 'artist-1' });
    (prisma.album as any).findFirst = async () => ({ id: 'album-1', title: 'Album Test', artistId: 'artist-1' });

    const result = await syncLogRepo.syncSongFromStudio({
      idempotencyKey: 'same-key',
      payloadHash: 'hash-1',
      payload: {
        title: 'Test Song',
        artistName: 'Tester',
        genreName: 'Pop',
        audioUrl: 'https://example.com/test-song.mp3',
        durationSeconds: 180,
      },
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.status, 'REUSED');
    assert.equal(result.song?.title, 'Test Song');
  } finally {
    (prisma.syncLog as any).findUnique = originalFindUnique;
    (prisma.song as any).findFirst = originalSongFindFirst;
    (prisma.syncLog as any).update = originalUpdate;
    (prisma.artist as any).upsert = originalArtistUpsert;
    (prisma.artist as any).findFirst = originalArtistFindFirst;
    (prisma.genre as any).upsert = originalGenreUpsert;
    (prisma.genre as any).findFirst = originalGenreFindFirst;
    (prisma.album as any).upsert = originalAlbumUpsert;
    (prisma.album as any).findFirst = originalAlbumFindFirst;
  }
});

// ─── Test 2: audioUrl khác → NEW (đã chuyển sang syncLogDecision.test.ts) ──
// Test "title and artist alone are not considered duplicate when the audioUrl differs"
// đã được chuyển sang src/lib/repositories/syncLogDecision.test.ts dưới dạng
// pure unit test (không cần DB, không cần mock Prisma).
//
// Lý do: test này kiểm tra BẤT BIẾN của buildSongMatchWhere (không dùng title/artist),
// đây là logic thuần không cần I/O. Test tích hợp DB là lớp riêng biệt.

test('deleteSong cleans sync logs using the studio idempotency key rather than payloadHash', async () => {
  const originalTransaction = prisma.$transaction.bind(prisma);
  const seen: Array<{ where: any }> = [];

  try {
    prisma.$transaction = async (callback: any) => {
      const tx = {
        song: {
          findUnique: async () => ({
            id: 'song-42',
            title: 'Test Song',
            artistId: 'artist-1',
            audioUrl: 'https://example.com/test-song.mp3',
            videoId: 'abc123',
            trimStart: 0,
            trimEnd: 0,
          }),
          delete: async () => ({ id: 'song-42' }),
        },
        syncLog: {
          deleteMany: async (args: any) => {
            seen.push(args);
            return { count: 1 };
          },
        },
      };

      return callback(tx);
    };

    const result = await songRepo.deleteSong('song-42');

    assert.equal(result, true);
    assert.equal(seen.length, 1);
    const where = seen[0].where;
    assert.equal(where.OR.some((clause: any) => Object.prototype.hasOwnProperty.call(clause, 'payloadHash')), false);
    assert.equal(where.OR.some((clause: any) => Object.prototype.hasOwnProperty.call(clause, 'idempotencyKey')), true);

    const expectedKeys = [
      buildStudioSyncIdempotencyKey({
        audioUrl: 'https://example.com/test-song.mp3',
        id: 'song-42',
        trimStart: 0,
        trimEnd: 0,
      }),
      buildStudioSyncIdempotencyKey({
        audioUrl: 'https://example.com/test-song.mp3',
        videoId: 'abc123',
        trimStart: 0,
        trimEnd: 0,
      }),
    ].sort();

    assert.deepEqual(
      where.OR.find((clause: any) => clause.idempotencyKey)?.idempotencyKey.in.sort(),
      expectedKeys
    );
  } finally {
    prisma.$transaction = originalTransaction;
  }
});

// ─── Test 3: concurrent duplicate → REUSED qua P2002 ───────────────────────
test('concurrent same-video request resolves as reused instead of failing with a duplicate database error', async () => {
  const originalFindUnique = prisma.syncLog.findUnique.bind(prisma.syncLog);
  const originalTransaction = prisma.$transaction.bind(prisma);
  const originalUpsert = prisma.syncLog.upsert.bind(prisma.syncLog);
  const originalArtistUpsert = prisma.artist.upsert.bind(prisma.artist);
  const originalArtistFindFirst = prisma.artist.findFirst.bind(prisma.artist);
  const originalGenreUpsert = prisma.genre.upsert.bind(prisma.genre);
  const originalGenreFindFirst = prisma.genre.findFirst.bind(prisma.genre);
  const originalAlbumUpsert = prisma.album.upsert.bind(prisma.album);
  const originalAlbumFindFirst = prisma.album.findFirst.bind(prisma.album);

  try {
    (prisma.syncLog as any).findUnique = async () => null;
    (prisma.song as any).findFirst = async () => null;
    (prisma.artist as any).upsert = async () => ({ id: 'artist-1', name: 'Tester', slug: 'tester' });
    (prisma.artist as any).findFirst = async () => ({ id: 'artist-1', name: 'Tester', slug: 'tester' });
    (prisma.genre as any).upsert = async () => ({ id: 'genre-1', name: 'Pop', slug: 'pop' });
    (prisma.genre as any).findFirst = async () => ({ id: 'genre-1', name: 'Pop', slug: 'pop' });
    (prisma.album as any).upsert = async () => ({ id: 'album-1', title: 'Album Test', artistId: 'artist-1' });
    (prisma.album as any).findFirst = async () => ({ id: 'album-1', title: 'Album Test', artistId: 'artist-1' });
    prisma.$transaction = async (callback: any) => {
      const tx = {
        song: {
          findFirst: async () => sampleSongRecord,
          create: async () => {
            const err = new Error('duplicate');
            (err as any).code = 'P2002';
            throw err;
          },
        },
        syncLog: {
          upsert: async () => ({ id: 'log-2' }),
        },
      };
      return callback(tx);
    };
    (prisma.syncLog as any).upsert = async () => ({ id: 'log-2' });

    const result = await syncLogRepo.syncSongFromStudio({
      idempotencyKey: 'concurrent-key',
      payloadHash: 'hash-2',
      payload: {
        title: 'Test Song',
        artistName: 'Tester',
        genreName: 'Pop',
        audioUrl: 'https://example.com/test-song.mp3',
        videoId: 'abc123',
        trimStart: 0,
        trimEnd: 0,
      },
    });

    assert.equal(result.duplicate, true);
    assert.equal(result.status, 'REUSED');
  } finally {
    (prisma.syncLog as any).findUnique = originalFindUnique;
    prisma.$transaction = originalTransaction;
    (prisma.syncLog as any).upsert = originalUpsert;
    (prisma.artist as any).upsert = originalArtistUpsert;
    (prisma.artist as any).findFirst = originalArtistFindFirst;
    (prisma.genre as any).upsert = originalGenreUpsert;
    (prisma.genre as any).findFirst = originalGenreFindFirst;
    (prisma.album as any).upsert = originalAlbumUpsert;
    (prisma.album as any).findFirst = originalAlbumFindFirst;
  }
});
