import { PrismaClient } from '@prisma/client';
import { buildStudioSyncIdempotencyKey } from '../src/lib/studioSync';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const dryRun = process.argv.includes('--dry-run') || !apply;

async function main() {
  const songs = await prisma.song.findMany({
    select: {
      id: true,
      audioUrl: true,
      videoId: true,
      trimStart: true,
      trimEnd: true,
    },
  });

  const validSongKeys = new Set(
    songs
      .filter((song) => song.audioUrl)
      .map((song) => buildStudioSyncIdempotencyKey({
        audioUrl: song.audioUrl,
        videoId: song.videoId ?? undefined,
        trimStart: song.trimStart,
        trimEnd: song.trimEnd,
      }))
  );

  const syncLogs = await prisma.syncLog.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, idempotencyKey: true, status: true, createdAt: true },
  });

  const orphanLogs = syncLogs.filter((log) => !validSongKeys.has(log.idempotencyKey));

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    totalSyncLogs: syncLogs.length,
    totalSongs: songs.length,
    orphanCount: orphanLogs.length,
    orphanLogs: orphanLogs.map((log) => ({
      id: log.id,
      idempotencyKey: log.idempotencyKey,
      status: log.status,
      createdAt: log.createdAt.toISOString(),
    })),
  }, null, 2));

  if (apply && orphanLogs.length > 0) {
    const ids = orphanLogs.map((log) => log.id);
    await prisma.syncLog.deleteMany({ where: { id: { in: ids } } });
    console.log(`Deleted ${ids.length} orphan sync_logs.`);
  } else if (apply) {
    console.log('No orphan sync_logs to delete.');
  }

  if (dryRun && !apply) {
    console.log('Dry-run only: no rows were deleted. Re-run with --apply to remove the orphan logs after review.');
  }
}

main()
  .catch((error) => {
    console.error('Orphan syncLog check failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
