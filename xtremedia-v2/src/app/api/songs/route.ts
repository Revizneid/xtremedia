import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || undefined;
  const genreId = searchParams.get('genre') || undefined;
  const artistId = searchParams.get('artist') || undefined;
  const sortBy = (searchParams.get('sort') as 'newest' | 'top_plays' | 'top_downloads') || 'newest';

  const songs = db.getSongs({ search, genreId, artistId, sortBy });
  return NextResponse.json({ songs, total: songs.length });
}
