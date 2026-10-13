import fs from 'node:fs/promises';
import path from 'node:path';

export type HeroBannerConfig = {
  enabled: boolean;
  songId: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  backgroundImage: string | null;
  updatedAt: string;
};

export const defaultHeroBannerConfig: HeroBannerConfig = {
  enabled: true,
  songId: null,
  title: 'Top Thịnh Hành Tháng',
  subtitle: 'XtreMedia Engine 2026',
  ctaLabel: 'Phát Ngay',
  backgroundImage: null,
  updatedAt: new Date().toISOString(),
};

const getConfigPath = () => path.join(process.cwd(), 'data', 'hero-banner.json');

export async function getHeroBannerConfig(): Promise<HeroBannerConfig> {
  const filePath = getConfigPath();

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<HeroBannerConfig>;
    return {
      ...defaultHeroBannerConfig,
      ...parsed,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return defaultHeroBannerConfig;
  }
}

export async function saveHeroBannerConfig(input: Partial<HeroBannerConfig>): Promise<HeroBannerConfig> {
  const filePath = getConfigPath();
  const nextConfig: HeroBannerConfig = {
    ...defaultHeroBannerConfig,
    ...(await getHeroBannerConfig()),
    ...input,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(nextConfig, null, 2), 'utf8');

  return nextConfig;
}
