import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/security';

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 120, 60_000, 'public-api');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const genres = await db.getGenres();
  return NextResponse.json({ success: true, count: genres.length, genres });
}
