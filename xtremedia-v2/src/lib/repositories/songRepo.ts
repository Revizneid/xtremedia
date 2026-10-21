import { promises as fs } from 'node:fs';
import path from 'node:path';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { sanitizeAudioUrl } from '@/lib/audioPlayback';
import { buildStudioSyncIdempotencyKey } from '@/lib/studioSync';
import type { Song, SongStatus } from '@/lib/types';

export type SongQueryOptions = {
  genreId?: string;
  artistId?: string;
  search?: string;
  sortBy?: 'newest' | 'top_plays' | 'top_downloads';
};

const songInclude = {
  artist: true,
  album: true,
  genre: true,
} as const;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
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

function toLegacySong(record: Prisma.SongGetPayload<{ include: typeof songInclude }>): Song {
  return {
    id: record.id,
    title: record.title,
    titleAscii: record.titleAscii || record.title,
    slug: record.slug || slugify(record.title),
    artistId: record.artistId,
    artistName: record.artist?.name || 'Unknown Artist',
    albumId: record.albumId ?? null,
    albumTitle: record.album?.title ?? null,
    genreId: record.genreId ?? null,
    genreName: record.genre?.name ?? null,
    audioUrl: sanitizeAudioUrl(record.audioUrl),
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

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80';

function normalizeLegacySongRecord(record: any): Song {
  const title = String(record?.title ?? 'Untitled Song').trim() || 'Untitled Song';
  const artistName = String(record?.artistName ?? 'Unknown Artist').trim() || 'Unknown Artist';
  const genreName = String(record?.genreName ?? 'Nhạc Trẻ V-Pop').trim() || 'Nhạc Trẻ V-Pop';
  const createdAt = record?.createdAt ? new Date(record.createdAt) : new Date();

  return {
    id: String(record?.id ?? `song-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
    title,
    titleAscii: String(record?.titleAscii ?? title),
    slug: String(record?.slug ?? slugify(title)),
    artistId: String(record?.artistId ?? `artist-${slugify(artistName)}`),
    artistName,
    albumId: record?.albumId ?? null,
    albumTitle: record?.albumTitle ?? null,
    genreId: record?.genreId ?? `genre-${slugify(genreName)}`,
    genreName,
    audioUrl: sanitizeAudioUrl(String(record?.audioUrl ?? '')),
    coverUrl: String(record?.coverUrl || record?.thumbnailUrl || DEFAULT_COVER),
    durationSeconds: Number(record?.durationSeconds ?? record?.durationSec ?? 0),
    bitrateKbps: Number(record?.bitrateKbps ?? 320),
    lyricsLrc: typeof record?.lyricsLrc === 'string' ? record.lyricsLrc : undefined,
    playCount: Number(record?.playCount ?? 0),
    playCountMonth: Number(record?.playCountMonth ?? 0),
    downloadCount: Number(record?.downloadCount ?? 0),
    isBroken: Boolean(record?.isBroken ?? false),
    status: normalizeStatus(String(record?.status ?? 'ACTIVE')),
    createdAt: createdAt.toISOString(),
  };
}

export async function readLegacyStoreSongs(filePath?: string): Promise<Song[]> {
  const normalizedPath = filePath ? filePath.replace(/^\/([A-Za-z]:)/, '$1') : undefined;
  const resolvedPath = normalizedPath
    ? path.resolve(normalizedPath)
    : path.resolve(process.cwd(), 'data', 'store.json');

  try {
    const raw = await fs.readFile(resolvedPath, 'utf8');
    const parsed = JSON.parse(raw) as { songs?: unknown[] };
    const songs = Array.isArray(parsed?.songs) ? parsed.songs : [];
    return songs.map((song) => normalizeLegacySongRecord(song));
  } catch {
    return [];
  }
}

function applyLegacyFilters(songs: Song[], options: SongQueryOptions): Song[] {
  const filtered = [...songs];

  if (options.genreId) {
    return filtered.filter((song) => song.genreId === options.genreId);
  }

  if (options.artistId) {
    return filtered.filter((song) => song.artistId === options.artistId);
  }

  if (options.search) {
    const needle = options.search.toLowerCase();
    return filtered.filter((song) => {
      const title = song.title.toLowerCase();
      const artist = song.artistName.toLowerCase();
      return title.includes(needle) || artist.includes(needle);
    });
  }

  if (options.sortBy === 'top_plays') {
    return filtered.sort((a, b) => b.playCount - a.playCount);
  }

  if (options.sortBy === 'top_downloads') {
    return filtered.sort((a, b) => b.downloadCount - a.downloadCount);
  }

  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export const songRepo = {
  async getSongs(options: SongQueryOptions = {}): Promise<Song[]> {
    const nodeEnv = String(process.env.NODE_ENV ?? '');
    const isProduction = nodeEnv === 'production';
    // Fallback JSON chỉ được phép khi: NODE_ENV=development VÀ cờ LEGACY_JSON_FALLBACK=true.
    // Khi test hoặc production: DB lỗi phải lộ ra, không che bằng fallback.
    const isAllowedFallback = nodeEnv === 'development' && process.env.LEGACY_JSON_FALLBACK === 'true';

    try {
      const where: Prisma.SongWhereInput = {
        ...(isProduction ? { status: { not: 'INACTIVE' } } : {}),
        ...(options.genreId ? { genreId: options.genreId } : {}),
        ...(options.artistId ? { artistId: options.artistId } : {}),
        ...(options.search
          ? {
              OR: [
                { title: { contains: options.search, mode: 'insensitive' } },
                { artist: { is: { name: { contains: options.search, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      };

      const orderBy: Prisma.SongOrderByWithRelationInput[] =
        options.sortBy === 'top_plays'
          ? [{ playCount: 'desc' }]
          : options.sortBy === 'top_downloads'
            ? [{ downloadCount: 'desc' }]
            : [{ createdAt: 'desc' }];

      const songs = await prisma.song.findMany({
        where,
        include: songInclude,
        orderBy,
      });

      const publicSongs = songs
        .filter((song) => song.status !== 'INACTIVE' && !song.isBroken)
        .map(toLegacySong);

      if (songs.length > 0 || !isAllowedFallback) {
        return publicSongs;
      }
    } catch {
      if (!isAllowedFallback) {
        return [];
      }
    }

    if (!isAllowedFallback) {
      return [];
    }

    const fallbackSongs = await readLegacyStoreSongs();
    return applyLegacyFilters(fallbackSongs.filter((song) => song.status !== 'INACTIVE' && !song.isBroken), options);
  },

  async getSongById(id: string): Promise<Song | null> {
    const nodeEnv = String(process.env.NODE_ENV ?? '');
    const isAllowedFallback = nodeEnv === 'development' && process.env.LEGACY_JSON_FALLBACK === 'true';

    try {
      const record = await prisma.song.findUnique({
        where: { id },
        include: songInclude,
      });

      if (record) {
        return record.status === 'INACTIVE' || record.isBroken ? null : toLegacySong(record);
      }
    } catch {
      if (!isAllowedFallback) {
        return null;
      }
    }

    if (!isAllowedFallback) {
      return null;
    }

    const fallbackSongs = await readLegacyStoreSongs();
    return fallbackSongs.find((song) => song.id === id && song.status !== 'INACTIVE' && !song.isBroken) ?? null;
  },

  async addSong(input: Partial<Song> & Pick<Song, 'title' | 'artistId' | 'audioUrl'>): Promise<Song> {
    const title = input.title?.trim() || 'Untitled Song';
    const artistId = input.artistId;
    const durationSec = input.durationSeconds ?? 0;
    const data = {
      id: input.id || undefined,
      title,
      titleAscii: input.titleAscii || title,
      slug: input.slug || slugify(title),
      artistId,
      genreId: input.genreId ?? null,
      albumId: input.albumId ?? null,
      durationSec,
      audioUrl: input.audioUrl,
      coverUrl: input.coverUrl ?? null,
      thumbnailUrl: input.coverUrl ?? null,
      sourceUrl: input.audioUrl ?? null,
      trimStart: 0,
      trimEnd: 0,
      playCount: input.playCount ?? 0,
      downloadCount: input.downloadCount ?? 0,
      isBroken: input.isBroken ?? false,
      status: (input.status || 'ACTIVE') as SongStatus,
      createdAt: input.createdAt ? new Date(input.createdAt) : new Date(),
    };

    const created = await prisma.song.create({
      data,
      include: songInclude,
    });

    return toLegacySong(created);
  },

  async updateSong(id: string, updates: Partial<Song>): Promise<Song | null> {
    const record = await prisma.song.findUnique({ where: { id }, include: songInclude });
    if (!record) return null;

    const sanitizedTitle = updates.title?.trim() || record.title;
    const artistName = (updates.artistName || record.artist?.name || 'Unknown Artist').trim();
    const normalizedGenreName = (updates.genreName || record.genre?.name || 'Nhạc Trẻ V-Pop').trim();
    const albumTitle = updates.albumTitle !== undefined ? updates.albumTitle?.trim() || null : record.album?.title ?? null;

    let artistId = record.artistId;
    if (updates.artistName || updates.artistId) {
      const existingArtist = updates.artistId
        ? await prisma.artist.findUnique({ where: { id: updates.artistId } })
        : await prisma.artist.findUnique({ where: { name: artistName } });

      if (existingArtist) {
        artistId = existingArtist.id;
      } else {
        const createdArtist = await prisma.artist.create({
          data: {
            id: updates.artistId || `artist-${Date.now()}`,
            name: artistName,
            slug: slugify(artistName),
            avatarUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
            country: 'VIETNAM',
            viewCount: 0,
          },
        });
        artistId = createdArtist.id;
      }
    }

    let genreId = record.genreId ?? null;
    if (updates.genreName !== undefined || updates.genreId !== undefined) {
      const nextGenreName = (updates.genreName || normalizedGenreName).trim();
      const existingGenre = updates.genreId
        ? await prisma.genre.findUnique({ where: { id: updates.genreId } })
        : await prisma.genre.findUnique({ where: { name: nextGenreName } });

      if (existingGenre) {
        genreId = existingGenre.id;
      } else {
        const createdGenre = await prisma.genre.create({
          data: {
            id: updates.genreId || `genre-${Date.now()}`,
            name: nextGenreName,
            slug: slugify(nextGenreName),
            sortOrder: 0,
          },
        });
        genreId = createdGenre.id;
      }
    }

    let albumId = record.albumId ?? null;
    const nextAlbumTitle = albumTitle;
    if (updates.albumTitle !== undefined || updates.albumId !== undefined) {
      if (nextAlbumTitle) {
        const existingAlbum = updates.albumId
          ? await prisma.album.findUnique({ where: { id: updates.albumId } })
          : await prisma.album.findFirst({
              where: {
                title: nextAlbumTitle,
                artistId,
              },
            });

        if (existingAlbum) {
          albumId = existingAlbum.id;
        } else {
          const createdAlbum = await prisma.album.create({
            data: {
              id: updates.albumId || `album-${Date.now()}`,
              title: nextAlbumTitle,
              artistId,
              coverUrl: updates.coverUrl || record.coverUrl || null,
              description: null,
            },
          });
          albumId = createdAlbum.id;
        }
      } else {
        albumId = null;
      }
    }

    const data: Prisma.SongUpdateInput = {
      ...(updates.title ? { title: sanitizedTitle, titleAscii: updates.titleAscii || sanitizedTitle, slug: updates.slug || slugify(sanitizedTitle) } : {}),
      ...(updates.artistName || updates.artistId ? { artistId } : {}),
      ...(updates.genreName !== undefined || updates.genreId !== undefined ? { genreId: genreId ?? null } : {}),
      ...(updates.albumTitle !== undefined || updates.albumId !== undefined ? { albumId: albumId ?? null } : {}),
      ...(updates.durationSeconds !== undefined ? { durationSec: updates.durationSeconds } : {}),
      ...(updates.audioUrl ? { audioUrl: updates.audioUrl, sourceUrl: updates.audioUrl } : {}),
      ...(updates.coverUrl !== undefined ? { coverUrl: updates.coverUrl ?? null, thumbnailUrl: updates.coverUrl ?? null } : {}),
      ...(updates.status ? { status: updates.status as SongStatus } : {}),
      ...(updates.isBroken !== undefined ? { isBroken: updates.isBroken } : {}),
      ...(updates.playCount !== undefined ? { playCount: updates.playCount } : {}),
      ...(updates.downloadCount !== undefined ? { downloadCount: updates.downloadCount } : {}),
      ...(updates.createdAt ? { createdAt: new Date(updates.createdAt) } : {}),
    };

    const updated = await prisma.song.update({
      where: { id },
      data,
      include: songInclude,
    });

    return toLegacySong(updated);
  },

  async deleteSong(id: string): Promise<boolean> {
    try {
      await prisma.$transaction(async (tx) => {
        const record = await tx.song.findUnique({ where: { id } });
        if (!record) {
          throw new Error('missing-song');
        }

        const relatedIdempotencyKeys = Array.from(new Set([
          buildStudioSyncIdempotencyKey({
            audioUrl: record.audioUrl,
            id: record.id,
            trimStart: record.trimStart,
            trimEnd: record.trimEnd,
          }),
          record.videoId ? buildStudioSyncIdempotencyKey({
            audioUrl: record.audioUrl,
            videoId: record.videoId,
            trimStart: record.trimStart,
            trimEnd: record.trimEnd,
          }) : null,
        ].filter((key): key is string => Boolean(key))));

        await tx.syncLog.deleteMany({
          where: {
            OR: [
              { idempotencyKey: { in: relatedIdempotencyKeys } },
            ],
          },
        });

        await tx.song.delete({ where: { id } });
      });
      return true;
    } catch {
      return false;
    }
  },

  async incrementPlay(id: string): Promise<Song | null> {
    const current = await prisma.song.findUnique({ where: { id } });
    if (!current) return null;

    const updated = await prisma.song.update({
      where: { id },
      data: { playCount: current.playCount + 1 },
      include: songInclude,
    });

    return toLegacySong(updated);
  },

  async incrementDownload(id: string): Promise<Song | null> {
    const current = await prisma.song.findUnique({ where: { id } });
    if (!current) return null;

    const updated = await prisma.song.update({
      where: { id },
      data: { downloadCount: current.downloadCount + 1 },
      include: songInclude,
    });

    return toLegacySong(updated);
  },

  async reportBroken(id: string): Promise<boolean> {
    const record = await prisma.song.findUnique({ where: { id } });
    if (!record) return false;

    await prisma.song.update({ where: { id }, data: { isBroken: true } });
    return true;
  },

  async fixBroken(id: string, newAudioUrl?: string): Promise<boolean> {
    const record = await prisma.song.findUnique({ where: { id } });
    if (!record) return false;

    await prisma.song.update({
      where: { id },
      data: {
        isBroken: false,
        ...(newAudioUrl ? { audioUrl: newAudioUrl.trim() } : {}),
      },
    });
    return true;
  },

  async getBrokenSongs(): Promise<Song[]> {
    const songs = await prisma.song.findMany({
      where: { isBroken: true },
      include: songInclude,
      orderBy: { createdAt: 'desc' },
    });
    return songs.map(toLegacySong);
  },

  async getAdminStats(): Promise<{
    totalSongs: number;
    totalArtists: number;
    totalAlbums: number;
    totalGenres: number;
    totalUsers: number;
    brokenSongsCount: number;
    totalPlays: number;
    totalDownloads: number;
    topSongs: Song[];
    recentBrokenSongs: Song[];
    syncSummary: {
      total: number;
      success: number;
      reused: number;
      failed: number;
      hasSynced: boolean;
      lastSyncStatus: 'SUCCESS' | 'REUSED' | 'FAILED' | 'NEVER';
      lastSyncAt: string | null;
      recent: Array<{ id: string; status: string; createdAt: string; payloadHash: string }>;
    };
  }> {
    try {
      const [totalSongs, totalArtists, totalAlbums, totalGenres, totalUsers, brokenSongs, topSongs, recentBrokenSongs, syncTotal, syncSuccess, syncReused, syncFailed, recentSyncLogs] = await Promise.all([
        prisma.song.count(),
        prisma.artist.count(),
        prisma.album.count(),
        prisma.genre.count(),
        prisma.user.count(),
        prisma.song.count({ where: { isBroken: true } }),
        prisma.song.findMany({
          include: songInclude,
          orderBy: { playCount: 'desc' },
          take: 5,
        }),
        prisma.song.findMany({
          where: { isBroken: true },
          include: songInclude,
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.syncLog.count(),
        prisma.syncLog.count({ where: { status: 'SUCCESS' } }),
        prisma.syncLog.count({ where: { status: 'REUSED' } }),
        prisma.syncLog.count({ where: { status: 'FAILED' } }),
        prisma.syncLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      const totalPlays = (await prisma.song.aggregate({ _sum: { playCount: true } }))._sum.playCount ?? 0;
      const totalDownloads = (await prisma.song.aggregate({ _sum: { downloadCount: true } }))._sum.downloadCount ?? 0;
      const latestSyncLog = recentSyncLogs[0] ?? null;
      const hasSynced = syncTotal > 0 && !!latestSyncLog;
      const lastSyncStatus = (latestSyncLog?.status as 'SUCCESS' | 'REUSED' | 'FAILED' | undefined) ?? 'NEVER';

      return {
        totalSongs,
        totalArtists,
        totalAlbums,
        totalGenres,
        totalUsers,
        brokenSongsCount: brokenSongs,
        totalPlays: Number(totalPlays),
        totalDownloads: Number(totalDownloads),
        topSongs: topSongs.map(toLegacySong),
        recentBrokenSongs: recentBrokenSongs.map(toLegacySong),
        syncSummary: {
          total: syncTotal,
          success: syncSuccess,
          reused: syncReused,
          failed: syncFailed,
          hasSynced,
          lastSyncStatus: hasSynced ? lastSyncStatus : 'NEVER',
          lastSyncAt: latestSyncLog ? latestSyncLog.createdAt.toISOString() : null,
          recent: recentSyncLogs.map((log) => ({
            id: log.id,
            status: log.status,
            createdAt: log.createdAt.toISOString(),
            payloadHash: log.payloadHash,
          })),
        },
      };
    } catch {
      const nodeEnv = String(process.env.NODE_ENV ?? '');
      const isAllowedFallback = nodeEnv === 'development' && process.env.LEGACY_JSON_FALLBACK === 'true';
      if (!isAllowedFallback) {
        return {
          totalSongs: 0,
          totalArtists: 0,
          totalAlbums: 0,
          totalGenres: 0,
          totalUsers: 0,
          brokenSongsCount: 0,
          totalPlays: 0,
          totalDownloads: 0,
          topSongs: [],
          recentBrokenSongs: [],
          syncSummary: {
            total: 0,
            success: 0,
            reused: 0,
            failed: 0,
            hasSynced: false,
            lastSyncStatus: 'NEVER',
            lastSyncAt: null,
            recent: [],
          },
        };
      }

      const fallbackSongs = await readLegacyStoreSongs();
      const totalPlays = fallbackSongs.reduce((sum, song) => sum + song.playCount, 0);
      const totalDownloads = fallbackSongs.reduce((sum, song) => sum + song.downloadCount, 0);
      const legacyTopSongs = [...fallbackSongs].sort((a, b) => b.playCount - a.playCount).slice(0, 5);
      const brokenSongs = fallbackSongs.filter((song) => song.isBroken);

      return {
        totalSongs: fallbackSongs.length,
        totalArtists: Array.from(new Set(fallbackSongs.map((song) => song.artistName))).length,
        totalAlbums: Array.from(new Set(fallbackSongs.map((song) => song.albumTitle).filter(Boolean))).length,
        totalGenres: Array.from(new Set(fallbackSongs.map((song) => song.genreName).filter(Boolean))).length,
        totalUsers: 0,
        brokenSongsCount: brokenSongs.length,
        totalPlays,
        totalDownloads,
        topSongs: legacyTopSongs,
        recentBrokenSongs: brokenSongs.slice(0, 5),
        syncSummary: {
          total: 0,
          success: 0,
          reused: 0,
          failed: 0,
          hasSynced: fallbackSongs.length > 0,
          lastSyncStatus: fallbackSongs.length > 0 ? 'SUCCESS' : 'NEVER',
          lastSyncAt: fallbackSongs[0]?.createdAt ?? null,
          recent: [],
        },
      };
    }
  },

  async bulkImport(imported: {
    songs?: Song[];
    artists?: any[];
    albums?: any[];
    genres?: any[];
  }) {
    const results = { songsCount: 0, artistsCount: 0, albumsCount: 0, genresCount: 0 };

    for (const genre of imported.genres ?? []) {
      const existing = await prisma.genre.findFirst({ where: { name: { equals: genre.name, mode: 'insensitive' } } });
      if (!existing) {
        await prisma.genre.create({
          data: {
            name: genre.name,
            slug: genre.slug || slugify(genre.name),
            sortOrder: Number(genre.sortOrder ?? 0),
          },
        });
        results.genresCount += 1;
      }
    }

    for (const artist of imported.artists ?? []) {
      const existing = await prisma.artist.findFirst({ where: { name: { equals: artist.name, mode: 'insensitive' } } });
      if (!existing) {
        await prisma.artist.create({
          data: {
            name: artist.name,
            slug: artist.slug || slugify(artist.name),
            avatarUrl: artist.avatarUrl ?? null,
            bio: artist.bio ?? null,
            country: artist.country ?? 'VIETNAM',
            viewCount: artist.viewCount ?? 0,
          },
        });
        results.artistsCount += 1;
      }
    }

    for (const album of imported.albums ?? []) {
      const existing = await prisma.album.findFirst({ where: { title: { equals: album.title, mode: 'insensitive' } } });
      if (!existing) {
        await prisma.album.create({
          data: {
            title: album.title,
            artistId: album.artistId,
            coverUrl: album.coverUrl ?? null,
            description: album.description ?? null,
          },
        });
        results.albumsCount += 1;
      }
    }

    for (const song of imported.songs ?? []) {
      const existing = await prisma.song.findFirst({
        where: {
          OR: [
            { title: { equals: song.title, mode: 'insensitive' } },
            { audioUrl: song.audioUrl },
          ],
        },
      });
      if (!existing) {
        await prisma.song.create({
          data: {
            title: song.title,
            titleAscii: song.titleAscii || song.title,
            slug: song.slug || slugify(song.title),
            artistId: song.artistId,
            genreId: song.genreId ?? null,
            albumId: song.albumId ?? null,
            durationSec: song.durationSeconds ?? 0,
            audioUrl: song.audioUrl,
            coverUrl: song.coverUrl ?? null,
            thumbnailUrl: song.coverUrl ?? null,
            sourceUrl: song.audioUrl ?? null,
            trimStart: 0,
            trimEnd: 0,
            playCount: song.playCount ?? 0,
            downloadCount: song.downloadCount ?? 0,
            isBroken: song.isBroken ?? false,
            status: (song.status || 'ACTIVE') as SongStatus,
          },
        });
        results.songsCount += 1;
      }
    }

    return results;
  },
};
