import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Artist } from '@/lib/types';

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
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const artists = db.getArtists();
  return NextResponse.json({ success: true, count: artists.length, artists });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { name, avatarUrl, bio, country } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Tên nghệ sĩ không được để trống' }, { status: 400 });
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

    db.addArtist(newArtist);

    return NextResponse.json({ success: true, artist: newArtist, message: 'Thêm nghệ sĩ thành công!' }, { status: 201 });
  } catch (err: unknown) {
    console.error('Add artist error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi thêm nghệ sĩ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (uid) => db.findUserById(uid));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Thiếu mã nghệ sĩ (id)' }, { status: 400 });
  }

  const deleted = db.deleteArtist(id);
  if (!deleted) {
    return NextResponse.json({ success: false, error: 'Không tìm thấy nghệ sĩ để xóa' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Xóa nghệ sĩ thành công!' });
}
