import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export type HeroBannerRecord = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  songId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  song?: {
    id: string;
    title: string;
    artistId: string;
    coverUrl: string | null;
    thumbnailUrl: string | null;
  } | null;
};

export type HeroBannerLegacyConfig = {
  enabled: boolean;
  songId: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  backgroundImage: string | null;
  updatedAt: string;
  linkUrl?: string | null;
};

const orderBy = [{ sortOrder: 'asc' as const }, { createdAt: 'desc' as const }];

function normalizeTitle(value: string | null | undefined): string {
  const title = value?.trim() || 'Top Thịnh Hành Tháng';
  return title.slice(0, 180);
}

export function mapHeroBannerRecord(record: Prisma.HeroBannerGetPayload<{ include: { song: true } }>): HeroBannerRecord {
  return {
    id: record.id,
    title: record.title,
    subtitle: record.subtitle,
    imageUrl: record.imageUrl,
    linkUrl: record.linkUrl,
    songId: record.songId,
    sortOrder: record.sortOrder,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    song: record.song
      ? {
          id: record.song.id,
          title: record.song.title,
          artistId: record.song.artistId,
          coverUrl: record.song.coverUrl,
          thumbnailUrl: record.song.thumbnailUrl,
        }
      : null,
  };
}

export function toLegacyHeroConfig(record: HeroBannerRecord): HeroBannerLegacyConfig {
  return {
    enabled: record.isActive,
    songId: record.songId,
    title: record.title,
    subtitle: record.subtitle || 'XtreMedia Engine 2026',
    ctaLabel: 'Phát Ngay',
    backgroundImage: record.imageUrl,
    updatedAt: record.updatedAt.toISOString(),
    linkUrl: record.linkUrl,
  };
}

export async function readLegacyHeroBannerFile(): Promise<HeroBannerLegacyConfig | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.resolve(process.cwd(), 'data', 'hero-banner.json');
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<HeroBannerLegacyConfig>;

    return {
      enabled: parsed.enabled ?? true,
      songId: parsed.songId ?? null,
      title: normalizeTitle(parsed.title),
      subtitle: String(parsed.subtitle ?? 'XtreMedia Engine 2026').slice(0, 220),
      ctaLabel: String(parsed.ctaLabel ?? 'Phát Ngay').slice(0, 40),
      backgroundImage: parsed.backgroundImage ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      linkUrl: parsed.linkUrl ?? null,
    };
  } catch {
    return null;
  }
}

export const heroRepo = {
  async list(): Promise<HeroBannerRecord[]> {
    const records = await prisma.heroBanner.findMany({
      include: { song: true },
      orderBy,
    });

    return records
      .map(mapHeroBannerRecord)
      .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getActive(): Promise<HeroBannerRecord[]> {
    const records = await prisma.heroBanner.findMany({
      where: { isActive: true },
      include: { song: true },
      orderBy,
    });

    return records
      .map(mapHeroBannerRecord)
      .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getById(id: string): Promise<HeroBannerRecord | null> {
    const record = await prisma.heroBanner.findUnique({
      where: { id },
      include: { song: true },
    });

    return record ? mapHeroBannerRecord(record) : null;
  },

  async create(input: Partial<HeroBannerRecord> & Pick<HeroBannerRecord, 'title'>): Promise<HeroBannerRecord> {
    const record = await prisma.heroBanner.create({
      data: {
        id: input.id || crypto.randomUUID(),
        title: normalizeTitle(input.title),
        subtitle: input.subtitle ?? null,
        imageUrl: input.imageUrl ?? null,
        linkUrl: input.linkUrl ?? null,
        songId: input.songId ?? null,
        sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
        isActive: input.isActive ?? true,
      },
      include: { song: true },
    });

    return mapHeroBannerRecord(record);
  },

  async update(id: string, input: Partial<HeroBannerRecord>): Promise<HeroBannerRecord | null> {
    const existing = await prisma.heroBanner.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.heroBanner.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: normalizeTitle(input.title) } : {}),
        ...(input.subtitle !== undefined ? { subtitle: input.subtitle ?? null } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl ?? null } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl ?? null } : {}),
        ...(input.songId !== undefined ? { songId: input.songId ?? null } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: Number(input.sortOrder) } : {}),
        ...(input.isActive !== undefined ? { isActive: Boolean(input.isActive) } : {}),
      },
      include: { song: true },
    });

    return mapHeroBannerRecord(updated);
  },

  async remove(id: string): Promise<boolean> {
    try {
      await prisma.heroBanner.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  async reorder(ids: string[]): Promise<HeroBannerRecord[]> {
    if (!ids.length) {
      return this.list();
    }

    await prisma.$transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx.heroBanner.updateMany({
          where: { id },
          data: { sortOrder: index },
        });
      }
    });

    return this.list();
  },
};
