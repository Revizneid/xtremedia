import { heroRepo, readLegacyHeroBannerFile, toLegacyHeroConfig } from '@/lib/repositories/heroRepo';

export type HeroBannerConfig = {
  enabled: boolean;
  songId: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  backgroundImage: string | null;
  updatedAt: string;
  linkUrl?: string | null;
};

export const defaultHeroBannerConfig: HeroBannerConfig = {
  enabled: true,
  songId: null,
  title: 'Top Thịnh Hành Tháng',
  subtitle: 'XtreMedia Engine 2026',
  ctaLabel: 'Phát Ngay',
  backgroundImage: null,
  updatedAt: new Date().toISOString(),
  linkUrl: null,
};

export async function getHeroBannerConfig(): Promise<HeroBannerConfig> {
  const active = await heroRepo.getActive();
  if (active.length > 0) {
    return toLegacyHeroConfig(active[0]);
  }

  const fileFallback = await readLegacyHeroBannerFile();
  return fileFallback ?? defaultHeroBannerConfig;
}

export async function saveHeroBannerConfig(input: Partial<HeroBannerConfig>): Promise<HeroBannerConfig> {
  const existing = await heroRepo.list();
  const active = existing.find((item) => item.isActive) ?? existing[0] ?? null;
  const nextPayload = {
    title: input.title?.trim() || defaultHeroBannerConfig.title,
    subtitle: input.subtitle?.trim() || defaultHeroBannerConfig.subtitle,
    imageUrl: input.backgroundImage && input.backgroundImage.trim() ? input.backgroundImage.trim() : null,
    linkUrl: input.linkUrl && input.linkUrl.trim() ? input.linkUrl.trim() : null,
    songId: input.songId && input.songId.trim() ? input.songId.trim() : null,
    isActive: input.enabled ?? true,
    sortOrder: 0,
  };

  if (active) {
    const updated = await heroRepo.update(active.id, nextPayload);
    if (updated) {
      return toLegacyHeroConfig(updated);
    }
  }

  const created = await heroRepo.create({
    title: nextPayload.title,
    subtitle: nextPayload.subtitle,
    imageUrl: nextPayload.imageUrl,
    linkUrl: nextPayload.linkUrl,
    songId: nextPayload.songId,
    sortOrder: nextPayload.sortOrder,
    isActive: nextPayload.isActive,
  });

  return toLegacyHeroConfig(created);
}

