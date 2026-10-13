import { prisma } from '@/lib/prisma';
import type { Genre } from '@/lib/types';

const slugify = (value: string): string =>
  value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'genre';

function toLegacyGenre(record: {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}): Genre {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    parentId: record.parentId ?? undefined,
    sortOrder: record.sortOrder,
  };
}

export const genreRepo = {
  async getGenres(): Promise<Genre[]> {
    const records = await prisma.genre.findMany({ orderBy: { sortOrder: 'asc' } });
    return records.map(toLegacyGenre);
  },

  async addGenre(genre: Genre): Promise<Genre> {
    const created = await prisma.genre.create({
      data: {
        id: genre.id,
        name: genre.name,
        slug: genre.slug || slugify(genre.name),
        parentId: genre.parentId ?? null,
        sortOrder: genre.sortOrder ?? 0,
      },
    });
    return toLegacyGenre(created);
  },

  async deleteGenre(id: string): Promise<boolean> {
    try {
      await prisma.genre.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
