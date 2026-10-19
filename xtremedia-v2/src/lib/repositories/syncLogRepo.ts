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

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
  );
}

function buildSongMatchWhere(payload: {
  cleanTitle: string;
  cleanArtist: string;
  normalizedAudioUrl: string;
  videoId?: string | null;
}): { OR: Array<Record<string, unknown>> } {
  const clauses: Array<Record<string, unknown>> = [
    { audioUrl: payload.normalizedAudioUrl },
    {
      AND: [
        { title: { equals: payload.cleanTitle, mode: 'insensitive' } },
        { artist: { is: { name: { equals: payload.cleanArtist, mode: 'insensitive' } } } },
      ],
    },
  ];

  if (payload.videoId) {
    clauses.unshift({ videoId: { equals: payload.videoId, mode: 'insensitive' } });
  }

  return { OR: clauses };
}

async function upsertArtist({ name, coverUrl }: { name: string; coverUrl?: string | null }) {
  const slug = slugify(name);
  const fallbackAvatar = coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80';

  try {
    return await prisma.artist.upsert({
      where: { slug },
      update: {},
      create: {
        id: `artist-${randomUUID()}`,
        name,
        slug,
        avatarUrl: fallbackAvatar,
        bio: null,
        country: 'VIETNAM',
        viewCount: 0,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return (await prisma.artist.findFirst({ where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] } })) || null;
    }
    throw error;
  }
}

async function upsertGenre({ name }: { name: string }) {
  const slug = slugify(name);

  try {
    return await prisma.genre.upsert({
      where: { slug },
      update: {},
      create: {
        id: `genre-${randomUUID()}`,
        name,
        slug,
        sortOrder: 0,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return (await prisma.genre.findFirst({ where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] } })) || null;
    }
    throw error;
  }
}

async function upsertAlbum({ title, artistId, coverUrl }: { title: string; artistId: string; coverUrl?: string | null }) {
  const safeTitle = title.trim();

  const existing = await prisma.album.findFirst({
    where: { artistId, title: { equals: safeTitle, mode: 'insensitive' } },
  });

  if (existing) {
    return existing;
  }

  return prisma.album.create({
    data: {
      id: `album-${randomUUID()}`,
      title: safeTitle,
      artistId,
      coverUrl: coverUrl || null,
      description: null,
    },
  });
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
    const cleanArtist = (input.payload.artistName || 'Chưa rõ').trim();
    const cleanGenre = (input.payload.genreName || 'Chưa phân loại').trim();
    const normalizedAudioUrl = input.payload.audioUrl.trim();
    const videoId = input.payload.videoId?.trim() || null;
    const trimStart = Number(input.payload.trimStart ?? 0) || 0;
    const trimEnd = Number(input.payload.trimEnd ?? 0) || 0;
    const albumTitle = (input.payload.albumTitle || '').trim();

    const existingLog = await prisma.syncLog.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingLog) {
      const record = await prisma.song.findFirst({
        where: buildSongMatchWhere({ cleanTitle, cleanArtist, normalizedAudioUrl, videoId }),
        include: {
          artist: true,
          album: true,
          genre: true,
        },
      });

      await prisma.syncLog.update({
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

    const artist = await upsertArtist({ name: cleanArtist, coverUrl: input.payload.coverUrl });
    if (!artist) {
      throw new Error('Unable to resolve artist record');
    }

    const genre = await upsertGenre({ name: cleanGenre });
    if (!genre) {
      throw new Error('Unable to resolve genre record');
    }

    const resolvedAlbum = albumTitle
      ? await upsertAlbum({ title: albumTitle, artistId: artist.id, coverUrl: input.payload.coverUrl })
      : null;

    const existingSong = await prisma.song.findFirst({
      where: buildSongMatchWhere({ cleanTitle, cleanArtist, normalizedAudioUrl, videoId }),
      include: {
        artist: true,
        album: true,
        genre: true,
      },
    });

    if (existingSong) {
      await prisma.syncLog.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        update: {
          payloadHash: input.payloadHash,
          status: 'REUSED',
          error: 'Existing song matched by audioUrl/title',
        },
        create: {
          idempotencyKey: input.idempotencyKey,
          payloadHash: input.payloadHash,
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

    const atomicResult = await prisma.$transaction(
      async (tx) => {
        const sameSong = await tx.song.findFirst({
          where: buildSongMatchWhere({ cleanTitle, cleanArtist, normalizedAudioUrl, videoId }),
          include: {
            artist: true,
            album: true,
            genre: true,
          },
        });

        if (sameSong) {
          await tx.syncLog.upsert({
            where: { idempotencyKey: input.idempotencyKey },
            update: {
              payloadHash: input.payloadHash,
              status: 'REUSED',
              error: 'Existing song matched by audioUrl/title',
            },
            create: {
              idempotencyKey: input.idempotencyKey,
              payloadHash: input.payloadHash,
              status: 'REUSED',
              error: 'Existing song matched by audioUrl/title',
            },
          });

          return {
            duplicate: true,
            song: toLegacySong(sameSong),
            status: 'REUSED' as const,
          };
        }

        const song = await tx.song.create({
          data: {
            id: input.payload.id || `song-${randomUUID()}`,
            videoId: videoId ?? null,
            title: cleanTitle,
            titleAscii: cleanTitle,
            slug: slugify(cleanTitle),
            artistId: artist.id,
            genreId: genre.id,
            albumId: resolvedAlbum?.id ?? null,
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

        await tx.syncLog.upsert({
          where: { idempotencyKey: input.idempotencyKey },
          update: {
            payloadHash: input.payloadHash,
            status: 'SUCCESS',
            error: null,
          },
          create: {
            idempotencyKey: input.idempotencyKey,
            payloadHash: input.payloadHash,
            status: 'SUCCESS',
            error: null,
          },
        });

        return {
          duplicate: false,
          song: toLegacySong(song),
          status: 'SUCCESS' as const,
        };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return atomicResult;
  },
};
