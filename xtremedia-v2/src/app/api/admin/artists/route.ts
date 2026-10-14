import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Artist } from '@/lib/types';
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
  const auth = await verifyAdminRequest(token, async (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const artists = await db.getArtists();
  return NextResponse.json({ success: true, count: artists.length, artists });
}

const artistSchema = z.object({
  name: z.string().trim().min(1).max(120),
  avatarUrl: z.string().trim().max(2048).optional(),
  bio: z.string().trim().max(2000).optional(),
  country: z.enum(['VIETNAM', 'INTERNATIONAL']).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-artists');
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

  try {
    const bodyResult = await parseJsonBody(request, artistSchema);
    if (!bodyResult.ok) {
      return bodyResult.response;
    }

    const { name, avatarUrl, bio, country } = bodyResult.data;
    if (avatarUrl && !isHttpsUrl(avatarUrl)) {
      return NextResponse.json({ success: false, error: 'avatarUrl phải là URL https hợp lệ' }, { status: 400 });
    }

    const cleanName = name.trim();
    const newArtist: Artist = {
      id: 'artist-' + Date.now(),
      name: cleanName,
      nameAscii: removeVietnameseTones(cleanName),
      slug: generateSlug(cleanName),
      avatarUrl: avatarUrl && avatarUrl.trim()
        ? avatarUrl.trim()
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
      bio: bio ? bio.trim() : undefined,
      country: country === 'INTERNATIONAL' ? 'INTERNATIONAL' : 'VIETNAM',
      viewCount: 0,
    };

    await db.addArtist(newArtist);

    return NextResponse.json({ success: true, artist: newArtist, message: 'Thêm nghệ sĩ thành công!' }, { status: 201 });
  } catch (err: unknown) {
    console.error('Add artist error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi thêm nghệ sĩ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, 30, 60_000, 'admin-artists');
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
    return NextResponse.json({ success: false, error: 'Thiếu mã nghệ sĩ (id)' }, { status: 400 });
  }

  const deleted = await db.deleteArtist(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy nghệ sĩ để xóa' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Xóa nghệ sĩ thành công!' });
}
