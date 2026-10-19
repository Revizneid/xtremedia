import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getHeroBannerConfig } from '@/lib/heroBanner';
import { heroRepo, toLegacyHeroConfig } from '@/lib/repositories/heroRepo';

export const runtime = 'nodejs';

export async function GET() {
  const [records, songs] = await Promise.all([
    heroRepo.getActive(),
    db.getSongs({ sortBy: 'top_plays' }),
  ]);

  const config = records[0] ? toLegacyHeroConfig(records[0]) : await getHeroBannerConfig();
  const selectedSongId = config.songId && config.songId.trim() ? config.songId.trim() : null;
  const selectedSong = selectedSongId ? songs.find((song) => song.id === selectedSongId) || songs[0] || null : songs[0] || null;

  return NextResponse.json({
    success: true,
    config,
    selectedSong,
    songs: songs.slice(0, 20),
    banners: records,
  });
}
