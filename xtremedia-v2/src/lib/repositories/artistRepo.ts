import { prisma } from '@/lib/prisma';
import type { Artist } from '@/lib/types';

const slugify = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'artist';

function toLegacyArtist(record: {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  bio: string | null;
  country: string | null;
  viewCount: number;
  createdAt: Date;
}): Artist {
  return {
    id: record.id,
    name: record.name,
    nameAscii: record.name,
    slug: record.slug,
    avatarUrl: record.avatarUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    bio: record.bio || undefined,
    country: (record.country === 'INTERNATIONAL' ? 'INTERNATIONAL' : 'VIETNAM') as Artist['country'],
    viewCount: record.viewCount,
  };
}

export const artistRepo = {
  async getArtists(): Promise<Artist[]> {
    const records = await prisma.artist.findMany({ orderBy: { createdAt: 'desc' } });
    return records.map(toLegacyArtist);
  },

  async getArtistById(id: string): Promise<Artist | null> {
    const record = await prisma.artist.findUnique({ where: { id } });
    return record ? toLegacyArtist(record) : null;
  },

  async addArtist(artist: Artist): Promise<Artist> {
    const created = await prisma.artist.create({
      data: {
        id: artist.id,
        name: artist.name,
        slug: artist.slug || slugify(artist.name),
        avatarUrl: artist.avatarUrl || null,
        bio: artist.bio || null,
        country: artist.country || 'VIETNAM',
        viewCount: artist.viewCount || 0,
      },
    });
    return toLegacyArtist(created);
  },

  async deleteArtist(id: string): Promise<boolean> {
    try {
      await prisma.artist.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
