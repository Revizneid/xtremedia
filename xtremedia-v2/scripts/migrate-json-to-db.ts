import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceArg = args.find((arg) => arg.startsWith('--source='));
const sourcePath = sourceArg ? sourceArg.slice('--source='.length) : 'data/store.json';
const resolvedSource = path.resolve(process.cwd(), sourcePath);

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function normalizeStatus(status?: string): 'ACTIVE' | 'INACTIVE' | 'PENDING' {
  if (status === 'PENDING') return 'PENDING';
  if (status === 'INACTIVE') return 'INACTIVE';
  return 'ACTIVE';
}

function parseDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function main() {
  if (!fs.existsSync(resolvedSource)) {
    throw new Error(`Source file not found: ${resolvedSource}`);
  }

  const raw = fs.readFileSync(resolvedSource, 'utf8');
  const parsed = JSON.parse(raw) as { songs?: Array<Record<string, unknown>> };
  const songs = Array.isArray(parsed.songs) ? parsed.songs : [];

  const summary = {
    artistsCreated: 0,
    artistsUpdated: 0,
    genresCreated: 0,
    genresUpdated: 0,
    albumsCreated: 0,
    albumsUpdated: 0,
    songsCreated: 0,
    songsUpdated: 0,
    songsSkipped: 0,
    failed: 0,
    total: songs.length,
  };

  let index = 0;

  for (const song of songs) {
    index += 1;
    try {
      const title = String(song.title || 'Untitled Song').trim();
      const artistName = String(song.artistName || song.artistId || 'Unknown Artist').trim();
      const genreName = String(song.genreName || 'Nhạc Trẻ V-Pop').trim();
      const albumTitle = typeof song.albumTitle === 'string' ? song.albumTitle.trim() : '';
      const audioUrl = String(song.audioUrl || '').trim();

      if (!audioUrl) {
        summary.failed += 1;
        console.warn(`[#${index}] Skipped: missing audioUrl for ${title}`);
        continue;
      }

      const artist = dryRun
        ? { id: `artist-${crypto.randomUUID()}`, name: artistName, slug: slugify(artistName) }
        : await prisma.artist.upsert({
            where: { name: artistName },
            update: {},
            create: {
              id: `artist-${crypto.randomUUID()}`,
              name: artistName,
              slug: slugify(artistName),
              avatarUrl: null,
              bio: null,
              country: 'VIETNAM',
              viewCount: 0,
            },
          });

      if (!dryRun) {
        const existingArtist = await prisma.artist.findFirst({ where: { name: { equals: artistName, mode: 'insensitive' } } });
        if (existingArtist) {
          if (existingArtist.name !== artistName) {
            summary.artistsUpdated += 1;
          }
        } else {
          summary.artistsCreated += 1;
        }
      }

      const genre = dryRun
        ? { id: `genre-${crypto.randomUUID()}`, name: genreName, slug: slugify(genreName) }
        : await prisma.genre.upsert({
            where: { name: genreName },
            update: {},
            create: {
              id: `genre-${crypto.randomUUID()}`,
              name: genreName,
              slug: slugify(genreName),
              sortOrder: 0,
            },
          });

      if (!dryRun) {
        const existingGenre = await prisma.genre.findFirst({ where: { name: { equals: genreName, mode: 'insensitive' } } });
        if (existingGenre) {
          if (existingGenre.name !== genreName) {
            summary.genresUpdated += 1;
          }
        } else {
          summary.genresCreated += 1;
        }
      }

      let album: { id: string } | null = null;
      if (albumTitle) {
        album = dryRun
          ? { id: `album-${crypto.randomUUID()}` }
          : await prisma.album.upsert({
              where: {
                id: `album:${slugify(artistName)}:${slugify(albumTitle)}`,
              },
              update: {},
              create: {
                id: `album:${slugify(artistName)}:${slugify(albumTitle)}`,
                title: albumTitle,
                artistId: artist.id,
                coverUrl: null,
                description: null,
              },
            });

        if (!dryRun) {
          const existingAlbum = await prisma.album.findFirst({
            where: { artistId: artist.id, title: { equals: albumTitle, mode: 'insensitive' } },
          });
          if (existingAlbum) {
            summary.albumsUpdated += 1;
          } else {
            summary.albumsCreated += 1;
          }
        }
      }

      const inputId = typeof song.id === 'string' ? song.id : `song-${crypto.randomUUID()}`;
      const songData = {
        id: inputId,
        title,
        titleAscii: String(song.titleAscii || song.title || title),
        slug: String(song.slug || slugify(title)),
        artistId: artist.id,
        genreId: genre.id,
        albumId: album?.id ?? null,
        durationSec: Number(song.durationSeconds ?? 0) || 0,
        audioUrl,
        coverUrl: typeof song.coverUrl === 'string' ? song.coverUrl : null,
        thumbnailUrl: typeof song.coverUrl === 'string' ? song.coverUrl : null,
        sourceUrl: audioUrl,
        trimStart: 0,
        trimEnd: 0,
        playCount: Number(song.playCount ?? 0) || 0,
        downloadCount: Number(song.downloadCount ?? 0) || 0,
        isBroken: Boolean(song.isBroken),
        status: normalizeStatus(String(song.status || 'ACTIVE')),
        createdAt: parseDate(String(song.createdAt || new Date().toISOString())),
      };

      if (dryRun) {
        console.log(`[dry-run] ${index}/${songs.length} would sync ${title} (${artistName})`);
        continue;
      }

      const existingSong = await prisma.song.findUnique({ where: { id: inputId } });
      if (existingSong) {
        await prisma.song.update({
          where: { id: inputId },
          data: songData,
        });
        summary.songsUpdated += 1;
      } else {
        await prisma.song.create({ data: songData });
        summary.songsCreated += 1;
      }
    } catch (error) {
      summary.failed += 1;
      console.error(`[#${index}] Failed to import ${String(song.title || 'unknown')}:`, error);
    }
  }

  if (dryRun) {
    console.log(`DRY RUN: ${summary.total} songs queued. Successes would be ${summary.total}.`);
  } else {
    console.log('Migration summary:');
    console.log(JSON.stringify(summary, null, 2));
  }
}

void main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
