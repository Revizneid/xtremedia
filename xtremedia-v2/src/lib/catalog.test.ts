import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveCatalogFromSongs, derivePersonalPlaylist, deriveRadioMix } from './catalog';
import type { Song } from './types';

const songs: Song[] = [
  {
    id: 'song-1',
    title: 'Alpha',
    titleAscii: 'Alpha',
    slug: 'alpha',
    artistId: 'artist-1',
    artistName: 'Artist One',
    albumId: 'album-1',
    albumTitle: 'Album One',
    genreId: 'genre-1',
    genreName: 'Pop',
    audioUrl: 'https://example.com/alpha.mp3',
    coverUrl: 'https://example.com/alpha.jpg',
    durationSeconds: 180,
    bitrateKbps: 320,
    playCount: 100,
    playCountMonth: 50,
    downloadCount: 20,
    isBroken: false,
    status: 'ACTIVE',
    createdAt: '2026-10-01T00:00:00.000Z',
  },
  {
    id: 'song-2',
    title: 'Beta',
    titleAscii: 'Beta',
    slug: 'beta',
    artistId: 'artist-1',
    artistName: 'Artist One',
    albumId: 'album-1',
    albumTitle: 'Album One',
    genreId: 'genre-1',
    genreName: 'Pop',
    audioUrl: 'https://example.com/beta.mp3',
    coverUrl: 'https://example.com/beta.jpg',
    durationSeconds: 210,
    bitrateKbps: 320,
    playCount: 200,
    playCountMonth: 100,
    downloadCount: 40,
    isBroken: false,
    status: 'ACTIVE',
    createdAt: '2026-10-02T00:00:00.000Z',
  },
  {
    id: 'song-3',
    title: 'Gamma',
    titleAscii: 'Gamma',
    slug: 'gamma',
    artistId: 'artist-2',
    artistName: 'Artist Two',
    albumId: null,
    albumTitle: null,
    genreId: 'genre-2',
    genreName: 'Rock',
    audioUrl: 'https://example.com/gamma.mp3',
    coverUrl: 'https://example.com/gamma.jpg',
    durationSeconds: 160,
    bitrateKbps: 320,
    playCount: 300,
    playCountMonth: 120,
    downloadCount: 50,
    isBroken: false,
    status: 'ACTIVE',
    createdAt: '2026-10-03T00:00:00.000Z',
  },
];

test('deriveCatalogFromSongs builds albums, artists and genres from real song data', () => {
  const catalog = deriveCatalogFromSongs(songs);

  assert.equal(catalog.artists.length, 2);
  assert.equal(catalog.albums.length, 1);
  assert.equal(catalog.genres.length, 2);

  const artistOne = catalog.artists.find((artist) => artist.id === 'artist-1');
  assert.ok(artistOne);
  assert.equal(artistOne?.name, 'Artist One');
  assert.equal(artistOne?.viewCount, 300);

  const albumOne = catalog.albums[0];
  assert.equal(albumOne.title, 'Album One');
  assert.equal(albumOne.viewCount, 300);

  const genreNames = catalog.genres.map((genre) => genre.name).sort();
  assert.deepEqual(genreNames, ['Pop', 'Rock']);
});

test('derivePersonalPlaylist prioritizes the most relevant songs for a user mix', () => {
  const playlist = derivePersonalPlaylist(songs, 3);

  assert.deepEqual(
    playlist.map((song) => song.id),
    ['song-3', 'song-2', 'song-1']
  );
});

test('deriveRadioMix creates a diverse live-wave queue from real catalog data', () => {
  const radioMix = deriveRadioMix(songs, 2);

  assert.deepEqual(
    radioMix.map((song) => song.id),
    ['song-3', 'song-2']
  );
});
