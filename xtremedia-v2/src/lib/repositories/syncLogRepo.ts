import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Song } from '@/lib/types';

const removeVietnameseTones = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const slugify = (value: string): string =>
  removeVietnameseTones(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'song';

function normalizeStatus(status: string | null | undefined): Song['status'] {
  switch (status) {
    case 'PENDING':
      return 'PENDING';
    case 'INACTIVE':
      return 'INACTIVE';
    case 'ACTIVE':
    default:
      return 'ACTIVE';
  }
}

function toLegacySong(record: {
  id: string;
  title: string;
  titleAscii: string | null;
  slug: string;
  artistId: string;
  artist?: { name: string | null } | null;
  album?: { title: string | null } | null;
  genre?: { name: string | null } | null;
  audioUrl: string;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  durationSec: number;
  playCount: number;
  downloadCount: number;
  isBroken: boolean;
  status: string | null;
  createdAt: Date;
}): Song {
  return {
    id: record.id,
    title: record.title,
    titleAscii: record.titleAscii || record.title,
    slug: record.slug || slugify(record.title),
    artistId: record.artistId,
    artistName: record.artist?.name || 'Unknown Artist',
    albumId: null,
    albumTitle: record.album?.title ?? null,
    genreId: null,
    genreName: record.genre?.name ?? null,
    audioUrl: record.audioUrl,
    coverUrl: record.coverUrl || record.thumbnailUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    durationSeconds: record.durationSec,
    bitrateKbps: 320,
    lyricsLrc: undefined,
    playCount: record.playCount,
    playCountMonth: 0,
    downloadCount: record.downloadCount,
    isBroken: record.isBroken,
    status: normalizeStatus(record.status),
    createdAt: record.createdAt.toISOString(),
  };
}

export const syncLogRepo = {
  async findByIdempotencyKey(idempotencyKey: string) {
    return prisma.syncLog.findUnique({ where: { idempotencyKey } });
  },

  async create(input: { idempotencyKey: string; payloadHash: string; status: string; error?: string | null }): Promise<void> {
    await prisma.syncLog.create({
      data: {
        idempotencyKey: input.idempotencyKey,
        payloadHash: input.payloadHash,
        status: input.status,
        error: input.error ?? null,
      },
    });
  },

  async updateStatus(idempotencyKey: string, status: string, error?: string | null): Promise<void> {
    await prisma.syncLog.update({
      where: { idempotencyKey },
      data: { status, error: error ?? null },
    });
  },

  async syncSongFromStudio(input: {
    idempotencyKey: string;
    payloadHash: string;
    payload: {
      title: string;
      artistName?: string;
      genreName?: string;
      albumTitle?: string;
      audioUrl: string;
      coverUrl?: string;
      durationSeconds?: number;
      bitrateKbps?: number;
      lyricsLrc?: string;
      id?: string;
      videoId?: string;
      trimStart?: number;
      trimEnd?: number;
    };
  }): Promise<{ duplicate: boolean; song: Song | null; status: 'SUCCESS' | 'REUSED' }> {
    const cleanTitle = input.payload.title.trim();
    const cleanArtist = (input.payload.artistName || 'Nghệ Sĩ XtreMedia').trim();
    const cleanGenre = (input.payload.genreName || 'Nhạc Trẻ V-Pop').trim();
    const normalizedAudioUrl = input.payload.audioUrl.trim();
    const trimStart = Number(input.payload.trimStart ?? 0) || 0;
    const trimEnd = Number(input.payload.trimEnd ?? 0) || 0;

    return prisma.$transaction(async (tx) => {
      const existingLog = await tx.syncLog.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existingLog) {
        const record = await tx.song.findFirst({
          where: {
            OR: [
              { audioUrl: normalizedAudioUrl },
              {
                AND: [
                  { title: { equals: cleanTitle, mode: 'insensitive' } },
                  { artist: { is: { name: { equals: cleanArtist, mode: 'insensitive' } } } },
                ],
              },
            ],
          },
          include: {
            artist: true,
            album: true,
            genre: true,
          },
        });

        await tx.syncLog.update({
          where: { id: existingLog.id },
          data: {
            payloadHash: input.payloadHash,
            status: 'REUSED',
            error: null,
          },
        });

        return {
          duplicate: true,
          song: record ? toLegacySong(record) : null,
          status: 'REUSED',
        };
      }

      const pendingLog = await tx.syncLog.create({
        data: {
          idempotencyKey: input.idempotencyKey,
          payloadHash: input.payloadHash,
          status: 'PENDING',
          error: null,
        },
      });

      let artist = await tx.artist.findFirst({ where: { name: { equals: cleanArtist, mode: 'insensitive' } } });
      if (!artist) {
        artist = await tx.artist.create({
          data: {
            id: `artist-${randomUUID()}`,
            name: cleanArtist,
            slug: slugify(cleanArtist),
            avatarUrl: input.payload.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
            bio: null,
            country: 'VIETNAM',
            viewCount: 0,
          },
        });
      }

      const cleanGenre = (input.payload.genreName || 'Nhạc Trẻ V-Pop').trim();
      let genre = await tx.genre.findFirst({ where: { name: { equals: cleanGenre, mode: 'insensitive' } } });
      if (!genre) {
        genre = await tx.genre.create({
          data: {
            id: `genre-${randomUUID()}`,
            name: cleanGenre,
            slug: slugify(cleanGenre),
            sortOrder: 0,
          },
        });
      }

      const albumTitle = (input.payload.albumTitle || '').trim();
      let album = null as { id: string; title: string } | null;
      if (albumTitle) {
        album = await tx.album.findFirst({
          where: { artistId: artist.id, title: { equals: albumTitle, mode: 'insensitive' } },
        });
        if (!album) {
          album = await tx.album.create({
            data: {
              id: `album-${randomUUID()}`,
              title: albumTitle,
              artistId: artist.id,
              coverUrl: input.payload.coverUrl || null,
              description: null,
            },
          });
        }
      }

      const existingSong = await tx.song.findFirst({
        where: {
          OR: [
            { audioUrl: normalizedAudioUrl },
            {
              AND: [
                { title: { equals: cleanTitle, mode: 'insensitive' } },
                { artist: { is: { name: { equals: cleanArtist, mode: 'insensitive' } } } },
              ],
            },
          ],
        },
        include: {
          artist: true,
          album: true,
          genre: true,
        },
      });

      if (existingSong) {
        await tx.syncLog.update({
          where: { id: pendingLog.id },
          data: {
            status: 'REUSED',
            error: 'Existing song matched by audioUrl/title',
          },
        });

        return {
          duplicate: true,
          song: toLegacySong(existingSong),
          status: 'REUSED',
        };
      }

      const song = await tx.song.create({
        data: {
          id: input.payload.id || `song-${randomUUID()}`,
          videoId: input.payload.videoId ?? null,
          title: cleanTitle,
          titleAscii: cleanTitle,
          slug: slugify(cleanTitle),
          artistId: artist.id,
          genreId: genre.id,
          albumId: album?.id ?? null,
          durationSec: Number(input.payload.durationSeconds ?? 0) || 0,
          audioUrl: normalizedAudioUrl,
          coverUrl: input.payload.coverUrl || null,
          thumbnailUrl: input.payload.coverUrl || null,
          sourceUrl: normalizedAudioUrl,
          trimStart,
          trimEnd,
          playCount: 0,
          downloadCount: 0,
          isBroken: false,
          status: 'ACTIVE',
          createdAt: new Date(),
        },
        include: {
          artist: true,
          album: true,
          genre: true,
        },
      });

      await tx.syncLog.update({
        where: { id: pendingLog.id },
        data: {
          status: 'SUCCESS',
          error: null,
        },
      });

      return {
        duplicate: false,
        song: toLegacySong(song),
        status: 'SUCCESS',
      };
    });
  },
};
