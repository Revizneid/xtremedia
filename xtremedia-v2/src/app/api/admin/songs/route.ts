import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminRequest, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Song } from '@/lib/types';

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
  const auth = verifyAdminRequest(token, (id) => db.findUserById(id));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || undefined;
  const songs = db.getSongs({ search });

  return NextResponse.json({ success: true, count: songs.length, songs });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const auth = verifyAdminRequest(token, (id) => db.findUserById(id));
  if (!auth.authorized) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { title, artistName, genreName, albumTitle, audioUrl, coverUrl, durationSeconds, bitrateKbps, lyricsLrc } = body;

    if (!title || !artistName || !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề, ca sĩ và liên kết âm thanh là bắt buộc' },
        { status: 400 }
      );
    }

    const cleanTitle = title.trim();
    const cleanArtist = artistName.trim();
    const titleAscii = removeVietnameseTones(cleanTitle);
    const slug = generateSlug(cleanTitle);

    // Find or create artist
    let artist = db.getArtists().find((a) => a.name.toLowerCase() === cleanArtist.toLowerCase());
    if (!artist) {
      artist = db.addArtist({
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
    let genre = db.getGenres().find((g) => g.name.toLowerCase() === cleanGenre.toLowerCase());
    if (!genre) {
      genre = db.addGenre({
        id: 'genre-' + Date.now(),
        name: cleanGenre,
        slug: generateSlug(cleanGenre),
        sortOrder: db.getGenres().length + 1,
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
      durationSeconds: Number(durationSeconds) || 210,
      bitrateKbps: Number(bitrateKbps) || 320,
      lyricsLrc: lyricsLrc ? lyricsLrc.trim() : undefined,
      playCount: 0,
      playCountMonth: 0,
      downloadCount: 0,
      isBroken: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    db.addSong(newSong);

    return NextResponse.json({ success: true, song: newSong, message: 'Thêm bài hát mới thành công!' }, { status: 201 });
  } catch (err: unknown) {
    console.error('Add song error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi thêm bài hát' }, { status: 500 });
  }
}
