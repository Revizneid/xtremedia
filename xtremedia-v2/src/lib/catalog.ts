import type { Album, Artist, Genre, Song } from './types';

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';

export function deriveCatalogFromSongs(songs: Song[], genres: Genre[] = []) {
  const genreMap = new Map<string, Genre>();

  for (const genre of genres) {
    if (genre.id) {
      genreMap.set(genre.id, genre);
    }
  }

  for (const song of songs) {
    if (!song.genreId || !song.genreName) continue;

    if (!genreMap.has(song.genreId)) {
      genreMap.set(song.genreId, {
        id: song.genreId,
        name: song.genreName,
        slug: slugify(song.genreName),
        parentId: null,
        sortOrder: genreMap.size + 1,
      });
    }
  }

  const artistMap = new Map<string, Artist>();
  for (const song of songs) {
    const artistKey = song.artistId || `artist-${slugify(song.artistName)}`;
    const current = artistMap.get(artistKey);

    if (!current) {
      artistMap.set(artistKey, {
        id: artistKey,
        name: song.artistName,
        nameAscii: song.artistName,
        slug: slugify(song.artistName),
        avatarUrl: song.coverUrl,
        bio: `Nghệ sĩ từ kho dữ liệu XtreMedia`,
        country: 'VIETNAM',
        viewCount: song.playCount || 0,
      });
      continue;
    }

    current.viewCount += song.playCount || 0;
  }

  const albumMap = new Map<string, Album>();
  for (const song of songs) {
    if (!song.albumId || !song.albumTitle) continue;

    const albumKey = song.albumId;
    const current = albumMap.get(albumKey);

    if (!current) {
      albumMap.set(albumKey, {
        id: albumKey,
        title: song.albumTitle,
        titleAscii: song.albumTitle,
        slug: slugify(song.albumTitle),
        coverUrl: song.coverUrl,
        description: `Album ${song.albumTitle} từ ${song.artistName}`,
        artistId: song.artistId,
        artistName: song.artistName,
        releaseDate: song.createdAt?.slice(0, 10) || undefined,
        viewCount: song.playCount || 0,
      });
      continue;
    }

    current.viewCount += song.playCount || 0;
  }

  return {
    genres: Array.from(genreMap.values()).sort((a, b) => a.sortOrder - b.sortOrder),
    artists: Array.from(artistMap.values()),
    albums: Array.from(albumMap.values()),
  };
}
