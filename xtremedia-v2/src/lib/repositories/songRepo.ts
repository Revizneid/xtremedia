import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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

export const songRepo = {
  async getSongs(options: SongQueryOptions = {}): Promise<Song[]> {
    const where: Prisma.SongWhereInput = {
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

    return songs.map(toLegacySong);
  },

  async getSongById(id: string): Promise<Song | null> {
    const record = await prisma.song.findUnique({
      where: { id },
      include: songInclude,
    });

    return record ? toLegacySong(record) : null;
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
    const record = await prisma.song.findUnique({ where: { id } });
    if (!record) return null;

    const data: Prisma.SongUpdateInput = {
      ...(updates.title ? { title: updates.title, titleAscii: updates.titleAscii || updates.title, slug: updates.slug || slugify(updates.title) } : {}),
      ...(updates.artistId ? { artistId: updates.artistId } : {}),
      ...(updates.genreId !== undefined ? { genreId: updates.genreId ?? null } : {}),
      ...(updates.albumId !== undefined ? { albumId: updates.albumId ?? null } : {}),
      ...(updates.durationSeconds !== undefined ? { durationSec: updates.durationSeconds } : {}),
      ...(updates.audioUrl ? { audioUrl: updates.audioUrl } : {}),
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
      await prisma.song.delete({ where: { id } });
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
  }> {
    const [totalSongs, totalArtists, totalAlbums, totalGenres, totalUsers, brokenSongs, topSongs, recentBrokenSongs] = await Promise.all([
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
    ]);

    const totalPlays = (await prisma.song.aggregate({ _sum: { playCount: true } }))._sum.playCount ?? 0;
    const totalDownloads = (await prisma.song.aggregate({ _sum: { downloadCount: true } }))._sum.downloadCount ?? 0;

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
    };
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
