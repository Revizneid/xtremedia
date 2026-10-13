import test from 'node:test';
import assert from 'node:assert/strict';

import { artistRepo } from '../src/lib/repositories/artistRepo';
import { genreRepo } from '../src/lib/repositories/genreRepo';
import { albumRepo } from '../src/lib/repositories/albumRepo';
import { songRepo } from '../src/lib/repositories/songRepo';

const suffix = Date.now();

test('song update persists artist, genre and album metadata changes', async () => {
  const originalArtist = await artistRepo.addArtist({
    id: `art-${suffix}-orig`,
    name: 'Original Artist',
    nameAscii: 'Original Artist',
    slug: 'original-artist',
    avatarUrl: 'https://example.com/a.jpg',
    country: 'VIETNAM',
    viewCount: 0,
  });

  const originalGenre = await genreRepo.addGenre({
    id: `gen-${suffix}-orig`,
    name: 'Original Genre',
    slug: 'original-genre',
    sortOrder: 1,
  });

  const originalAlbum = await albumRepo.addAlbum({
    id: `alb-${suffix}-orig`,
    title: 'Original Album',
    titleAscii: 'Original Album',
    slug: 'original-album',
    artistId: originalArtist.id,
    artistName: originalArtist.name,
    coverUrl: 'https://example.com/album.jpg',
    description: 'Original',
    releaseDate: new Date().toISOString(),
    viewCount: 0,
  });

  const song = await songRepo.addSong({
    id: `song-${suffix}`,
    title: 'Original Title',
    titleAscii: 'Original Title',
    slug: 'original-title',
    artistId: originalArtist.id,
    artistName: originalArtist.name,
    albumId: originalAlbum.id,
    albumTitle: originalAlbum.title,
    genreId: originalGenre.id,
    genreName: originalGenre.name,
    audioUrl: 'https://example.com/audio.mp3',
    coverUrl: 'https://example.com/cover.jpg',
    durationSeconds: 180,
    bitrateKbps: 320,
    lyricsLrc: 'Hello world',
    playCount: 0,
    playCountMonth: 0,
    downloadCount: 0,
    isBroken: false,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  const updated = await songRepo.updateSong(song.id, {
    title: 'Updated Title',
    artistName: 'Updated Artist',
    genreName: 'Updated Genre',
    albumTitle: 'Updated Album',
    audioUrl: 'https://example.com/new-audio.mp3',
    coverUrl: 'https://example.com/new-cover.jpg',
    durationSeconds: 220,
    bitrateKbps: 256,
    lyricsLrc: 'Updated lyrics',
    status: 'INACTIVE',
  });

  assert.ok(updated, 'should return updated song');
  assert.equal(updated?.title, 'Updated Title');
  assert.equal(updated?.artistName, 'Updated Artist');
  assert.equal(updated?.genreName, 'Updated Genre');
  assert.equal(updated?.albumTitle, 'Updated Album');
  assert.equal(updated?.audioUrl, 'https://example.com/new-audio.mp3');
  assert.equal(updated?.status, 'INACTIVE');
});
