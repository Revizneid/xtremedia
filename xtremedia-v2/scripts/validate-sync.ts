import { db } from '../src/lib/db';
import { prisma } from '../src/lib/prisma';
import { GET as healthCheck } from '../src/app/api/health/route';

const payload = {
  title: 'Duplicate Sync Check',
  artistName: 'Validation Artist',
  genreName: 'Pop',
  albumTitle: 'Validation Album',
  audioUrl: 'https://example.com/duplicate-sync-check.mp3',
  coverUrl: 'https://example.com/cover.jpg',
  durationSeconds: 170,
  bitrateKbps: 320,
  videoId: 'validation-video-1',
  trimStart: 0,
  trimEnd: 21,
  id: 'validation-song-1',
};

const key = 'validation-key-001';

async function main() {
  const first = await db.syncSongFromStudio({
    idempotencyKey: key,
    payloadHash: 'hash-1',
    payload,
  });

  const second = await db.syncSongFromStudio({
    idempotencyKey: key,
    payloadHash: 'hash-1',
    payload,
  });

  const health = await healthCheck();
  const songCount = await prisma.song.count({ where: { audioUrl: payload.audioUrl } });

  console.log(JSON.stringify({ first, second, healthStatus: await health.json(), songCount }, null, 2));
}

void main();
