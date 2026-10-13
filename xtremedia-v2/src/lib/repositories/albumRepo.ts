import { prisma } from '@/lib/prisma';
import type { Album } from '@/lib/types';

const slugify = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'album';

function toLegacyAlbum(record: {
  id: string;
  title: string;
  artistId: string;
  coverUrl: string | null;
  description: string | null;
  createdAt: Date;
}): Album {
  return {
    id: record.id,
    title: record.title,
    titleAscii: record.title,
    slug: slugify(record.title),
    coverUrl: record.coverUrl || '',
    description: record.description || undefined,
    artistId: record.artistId,
    artistName: '',
    releaseDate: record.createdAt.toISOString(),
    viewCount: 0,
  };
}

export const albumRepo = {
  async getAlbums(): Promise<Album[]> {
    const records = await prisma.album.findMany({ orderBy: { createdAt: 'desc' } });
    return records.map(toLegacyAlbum);
  },

  async getAlbumById(id: string): Promise<Album | null> {
    const record = await prisma.album.findUnique({ where: { id } });
    return record ? toLegacyAlbum(record) : null;
  },

  async addAlbum(album: Album): Promise<Album> {
    const existing = await prisma.album.findFirst({
      where: {
        title: album.title,
        artistId: album.artistId,
      },
    });

    if (existing) {
      return toLegacyAlbum(existing);
    }

    const created = await prisma.album.create({
      data: {
        id: album.id,
        title: album.title,
        artistId: album.artistId,
        coverUrl: album.coverUrl || null,
        description: album.description || null,
      },
    });
    return toLegacyAlbum(created);
  },

  async updateAlbum(id: string, updates: Partial<Album>): Promise<Album | null> {
    const existing = await prisma.album.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const nextTitle = updates.title?.trim() || existing.title;
    const updated = await prisma.album.update({
      where: { id },
      data: {
        ...(updates.title ? { title: nextTitle } : {}),
        ...(updates.artistId ? { artistId: updates.artistId } : {}),
        ...(updates.coverUrl !== undefined ? { coverUrl: updates.coverUrl || null } : {}),
        ...(updates.description !== undefined ? { description: updates.description || null } : {}),
      },
    });

    return toLegacyAlbum(updated);
  },

  async deleteAlbum(id: string): Promise<boolean> {
    try {
      await prisma.album.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
