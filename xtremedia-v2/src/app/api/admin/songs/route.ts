import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Song } from '@/lib/types';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function generateSlug(text: string): string {
  return removeVietnameseTones(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (id) => db.findUserById(id));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || undefined;
  const songs = await db.getSongs({ search });

  return NextResponse.json({ success: true, count: songs.length, songs });
}

const adminSongSchema = z.object({
  title: z.string().trim().min(1).max(180),
  artistName: z.string().trim().min(1).max(120),
  genreName: z.string().trim().max(80).optional(),
  albumTitle: z.string().trim().max(160).optional(),
  audioUrl: z.string().trim().min(1).max(2048),
  coverUrl: z.string().trim().max(2048).optional(),
  /** Thời lượng thật của bài (giây). Phải >= 1; không chấp nhận mặc định 210. */
  durationSeconds: z
    .union([z.number(), z.string().transform(Number)])
    .pipe(z.number().finite().min(1, 'durationSeconds phải >= 1 giây')),
  bitrateKbps: z.union([z.number(), z.string()]).optional(),
  lyricsLrc: z.string().trim().max(20000).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-songs');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (id) => db.findUserById(id));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const originResponse = enforceAdminOrigin(request);
  if (originResponse) {
    return originResponse;
  }

  try {
    const bodyResult = await parseJsonBody(request, adminSongSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { title, artistName, genreName, albumTitle, audioUrl, coverUrl, durationSeconds, bitrateKbps, lyricsLrc } = bodyResult.data;
    if (!isHttpsUrl(audioUrl)) {
      return NextResponse.json({ success: false, error: 'audioUrl phải là URL https hợp lệ' }, { status: 400 });
    }
    if (coverUrl && !isHttpsUrl(coverUrl)) {
      return NextResponse.json({ success: false, error: 'coverUrl phải là URL https hợp lệ' }, { status: 400 });
    }

    const cleanTitle = title.trim();
    const cleanArtist = artistName.trim();
    const titleAscii = removeVietnameseTones(cleanTitle);
    const slug = generateSlug(cleanTitle);

    // Find or create artist
    let artist = (await db.getArtists()).find((a) => a.name.toLowerCase() === cleanArtist.toLowerCase());
    if (!artist) {
      artist = await db.addArtist({
        id: 'artist-' + Date.now(),
        name: cleanArtist,
        nameAscii: removeVietnameseTones(cleanArtist),
        slug: generateSlug(cleanArtist),
        avatarUrl: coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
        country: 'VIETNAM',
        viewCount: 0,
      });
    }

    // Find or create genre
    const cleanGenre = (genreName || 'Nhạc Trẻ V-Pop').trim();
    let genre = (await db.getGenres()).find((g) => g.name.toLowerCase() === cleanGenre.toLowerCase());
    if (!genre) {
      genre = await db.addGenre({
        id: 'genre-' + Date.now(),
        name: cleanGenre,
        slug: generateSlug(cleanGenre),
        sortOrder: (await db.getGenres()).length + 1,
      });
    }

    const newSong: Song = {
      id: 'song-' + Date.now(),
      title: cleanTitle,
      titleAscii,
      slug,
      artistId: artist.id,
      artistName: artist.name,
      albumId: null,
      albumTitle: albumTitle ? albumTitle.trim() : null,
      genreId: genre.id,
      genreName: genre.name,
      audioUrl: audioUrl.trim(),
      coverUrl: coverUrl && coverUrl.trim()
        ? coverUrl.trim()
        : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
      durationSeconds: Math.round(Number(durationSeconds)),
      bitrateKbps: Number(bitrateKbps) || 320,
      lyricsLrc: lyricsLrc ? lyricsLrc.trim() : undefined,
      playCount: 0,
      playCountMonth: 0,
      downloadCount: 0,
      isBroken: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    await db.addSong(newSong);

    return NextResponse.json({ success: true, song: newSong, message: 'Thêm bài hát mới thành công!' }, { status: 201 });
  } catch (err: unknown) {
    console.error('Add song error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi thêm bài hát' }, { status: 500 });
  }
}
