import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Album } from '@/lib/types';
import { enforceAdminOrigin, enforceRateLimit, isHttpsUrl, parseJsonBody } from '@/lib/security';

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'album';

const albumSchema = z.object({
  title: z.string().trim().min(1).max(180),
  artistId: z.string().trim().min(1).max(120),
  coverUrl: z.string().trim().max(2048).optional().nullable(),
  description: z.string().trim().max(3000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const albums = await db.getAlbums();
  const artists = await db.getArtists();

  const enriched = albums.map((album) => ({
    ...album,
    artistName: artists.find((artist) => artist.id === album.artistId)?.name || album.artistName || 'Unknown Artist',
  }));

  return NextResponse.json({ success: true, count: enriched.length, albums: enriched });
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-albums');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const originResponse = enforceAdminOrigin(request);
  if (originResponse) {
    return originResponse;
  }

  const bodyResult = await parseJsonBody(request, albumSchema);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const { title, artistId, coverUrl, description } = bodyResult.data;
  const artist = await db.getArtistById(artistId);
  if (!artist) {
    return NextResponse.json({ success: false, error: 'Nhạc sĩ / nghệ sĩ không tồn tại' }, { status: 400 });
  }

  const cleanCoverUrl = coverUrl && coverUrl.trim() ? coverUrl.trim() : 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80';
  if (!isHttpsUrl(cleanCoverUrl)) {
    return NextResponse.json({ success: false, error: 'coverUrl phải là URL https hợp lệ' }, { status: 400 });
  }

  const album: Album = {
    id: `album-${Date.now()}`,
    title: title.trim(),
    titleAscii: title.trim(),
    slug: slugify(title),
    artistId,
    artistName: artist.name,
    coverUrl: cleanCoverUrl,
    description: description?.trim() || undefined,
    releaseDate: new Date().toISOString(),
    viewCount: 0,
  };

  const created = await db.addAlbum(album);
  return NextResponse.json({ success: true, album: created, message: 'Thêm album thành công!' }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-albums');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const originResponse = enforceAdminOrigin(request);
  if (originResponse) {
    return originResponse;
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Thiếu mã album' }, { status: 400 });
  }

  const deleted = await db.deleteAlbum(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy album để xóa' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Xóa album thành công!' });
}
