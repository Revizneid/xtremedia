import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getHeroBannerConfig } from '@/lib/heroBanner';

export async function GET() {
  const [config, songs] = await Promise.all([
    getHeroBannerConfig(),
    db.getSongs({ sortBy: 'top_plays' }),
  ]);

  const selectedSongId = config.songId && config.songId.trim() ? config.songId.trim() : null;
  const selectedSong = selectedSongId ? songs.find((song) => song.id === selectedSongId) || songs[0] || null : songs[0] || null;

  return NextResponse.json({
    success: true,
    config,
    selectedSong,
    songs: songs.slice(0, 20),
  });
}
