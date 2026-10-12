import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

function validateStudioSecret(request: NextRequest): boolean {
  const expectedSecret = process.env.STUDIO_SYNC_SECRET;
  if (!expectedSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization') || '';
  const xKey = request.headers.get('x-xtremedia-key') || request.headers.get('x-studio-key') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  return bearerToken === expectedSecret || xKey === expectedSecret;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-xtremedia-key, x-studio-key',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'XtreMedia Studio sync endpoint is ready.',
    methods: ['POST', 'OPTIONS'],
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!validateStudioSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: invalid studio sync secret' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, artistName, genreName, albumTitle, audioUrl, coverUrl, durationSeconds, bitrateKbps, lyricsLrc } = body;

    if (!title || !audioUrl) {
      return NextResponse.json(
        { success: false, error: 'Tiêu đề và audioUrl là bắt buộc' },
        { status: 400 }
      );
    }

    const cleanTitle = String(title).trim();
    const cleanArtist = (artistName || 'Nghệ Sĩ XtreMedia').trim();
    const normalizedAudioUrl = String(audioUrl).trim();
    const titleAscii = removeVietnameseTones(cleanTitle);
    const slug = generateSlug(cleanTitle);

    const existingSong = db
      .getSongs()
      .find((song) => song.audioUrl === normalizedAudioUrl || (song.title.toLowerCase() === cleanTitle.toLowerCase() && song.artistName.toLowerCase() === cleanArtist.toLowerCase()));

    if (existingSong) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        song: existingSong,
        message: 'Bài hát đã tồn tại trong dữ liệu XtreMedia.',
      }, { status: 200 });
    }

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
      id: body.id || ('song-' + Date.now()),
      title: cleanTitle,
      titleAscii,
      slug,
      artistId: artist.id,
      artistName: artist.name,
      albumId: null,
      albumTitle: albumTitle ? String(albumTitle).trim() : null,
      genreId: genre.id,
      genreName: genre.name,
      audioUrl: normalizedAudioUrl,
      coverUrl: coverUrl && String(coverUrl).trim()
        ? String(coverUrl).trim()
        : 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
      durationSeconds: Number(durationSeconds) || 210,
      bitrateKbps: Number(bitrateKbps) || 320,
      lyricsLrc: lyricsLrc ? String(lyricsLrc).trim() : undefined,
      playCount: 0,
      playCountMonth: 0,
      downloadCount: 0,
      isBroken: false,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    db.addSong(newSong);

    return NextResponse.json({
      success: true,
      song: newSong,
      message: 'XtreMedia Studio đã đồng bộ bài hát thành công!',
    }, { status: 201 });
  } catch (err: unknown) {
    console.error('Studio sync error:', err);
    return NextResponse.json({ success: false, error: 'Lỗi máy chủ khi đồng bộ bài hát' }, { status: 500 });
  }
}
