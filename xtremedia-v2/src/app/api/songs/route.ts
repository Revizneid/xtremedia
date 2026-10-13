import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/security';

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 120, 60_000, 'public-api');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || undefined;
  const genreId = searchParams.get('genre') || undefined;
  const artistId = searchParams.get('artist') || undefined;
  const sortBy = (searchParams.get('sort') as 'newest' | 'top_plays' | 'top_downloads') || 'newest';

  const songs = await db.getSongs({ search, genreId, artistId, sortBy });
  return NextResponse.json({ songs, total: songs.length });
}
