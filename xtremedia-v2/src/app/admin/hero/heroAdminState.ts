export type AdminHeroViewState = 'loading' | 'error' | 'ready';

export interface HeroAdminRecord {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  songId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  song?: {
    id: string;
    title: string;
    artistName?: string;
    artistId?: string;
  } | null;
}

export interface HeroAdminConfig {
  enabled: boolean;
  songId: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  backgroundImage: string | null;
  updatedAt?: string;
  linkUrl?: string | null;
}

export function resolveHeroAdminViewState({ loading, error, records, config }: { loading: boolean; error: string | null; records: HeroAdminRecord[]; config: HeroAdminConfig | null }): AdminHeroViewState {
  if (loading) return 'loading';
  if (error) return 'error';
  return 'ready';
}

export function shouldShowHeroEmptyState({ records, config }: { records: HeroAdminRecord[]; config: HeroAdminConfig | null }): boolean {
  void config;
  return Array.isArray(records) && records.length === 0;
}
