import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const genres = db.getGenres();
  return NextResponse.json({ success: true, count: genres.length, genres });
}
