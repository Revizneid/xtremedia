import { prisma } from '@/lib/prisma';
import { songRepo } from './songRepo';
import type { Song } from '@/lib/types';

export const playlistRepo = {
  async getPlaylist(): Promise<Song[]> {
    const items = await prisma.playlistSong.findMany({
      orderBy: { createdAt: 'asc' },
      include: { song: { include: { artist: true, album: true, genre: true } } },
    });

    return items.map((item) => item.song).map((song) => ({
      id: song.id,
      title: song.title,
      titleAscii: song.titleAscii,
      slug: song.slug,
      artistId: song.artistId,
      artistName: song.artist?.name || 'Unknown Artist',
      albumId: song.albumId ?? null,
      albumTitle: song.album?.title ?? null,
      genreId: song.genreId ?? null,
      genreName: song.genre?.name ?? null,
      audioUrl: song.audioUrl,
      coverUrl: song.coverUrl || song.thumbnailUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
      durationSeconds: song.durationSec,
      bitrateKbps: 320,
      lyricsLrc: undefined,
      playCount: song.playCount,
      playCountMonth: 0,
      downloadCount: song.downloadCount,
      isBroken: song.isBroken,
      status: song.status === 'PENDING' ? 'PENDING' : song.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      createdAt: song.createdAt.toISOString(),
    }));
  },

  async addToPlaylist(songId: string): Promise<boolean> {
    const song = await prisma.song.findUnique({ where: { id: songId } });
    if (!song) return false;

    let playlist = await prisma.playlist.findFirst({ where: { name: 'Default Playlist' } });
    if (!playlist) {
      const user = await prisma.user.findFirst();
      if (!user) return false;
      playlist = await prisma.playlist.create({
        data: {
          userId: user.id,
          name: 'Default Playlist',
          description: 'System-generated default playlist',
        },
      });
    }

    const existing = await prisma.playlistSong.findFirst({ where: { playlistId: playlist.id, songId } });
    if (existing) return true;

    await prisma.playlistSong.create({
      data: {
        playlistId: playlist.id,
        songId,
        position: 0,
      },
    });
    return true;
  },

  async removeFromPlaylist(songId: string): Promise<boolean> {
    const deleted = await prisma.playlistSong.deleteMany({ where: { songId } });
    return deleted.count > 0;
  },
};
