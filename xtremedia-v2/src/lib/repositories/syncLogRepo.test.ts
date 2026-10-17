process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.DIRECT_URL ??= 'postgresql://postgres:postgres@localhost:5432/postgres';

import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '@/lib/prisma';
import { syncLogRepo } from './syncLogRepo';

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
