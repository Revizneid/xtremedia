import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const filePath = path.resolve(process.cwd(), 'data', 'hero-banner.json');

async function main() {
  if (!fs.existsSync(filePath)) {
    console.log(JSON.stringify({ dryRun, source: filePath, records: 0, message: 'No hero banner seed file found.' }, null, 2));
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw) as {
    enabled?: boolean;
    songId?: string | null;
    title?: string;
    subtitle?: string | null;
    backgroundImage?: string | null;
    linkUrl?: string | null;
    updatedAt?: string;
  };

  const payload = {
    id: 'legacy-hero-banner',
    title: String(parsed.title || 'Top Thịnh Hành Tháng').trim().slice(0, 180),
    subtitle: parsed.subtitle ? String(parsed.subtitle).trim().slice(0, 240) : null,
    imageUrl: parsed.backgroundImage && String(parsed.backgroundImage).trim() ? String(parsed.backgroundImage).trim() : null,
    linkUrl: parsed.linkUrl && String(parsed.linkUrl).trim() ? String(parsed.linkUrl).trim() : null,
    songId: parsed.songId && String(parsed.songId).trim() ? String(parsed.songId).trim() : null,
    sortOrder: 0,
    isActive: parsed.enabled ?? true,
    createdAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
    updatedAt: parsed.updatedAt ? new Date(parsed.updatedAt) : new Date(),
  };

  if (dryRun) {
    const count = await prisma.heroBanner.count();
    console.log(JSON.stringify({ dryRun: true, source: filePath, records: count, preview: payload }, null, 2));
    return;
  }

  const saved = await prisma.heroBanner.upsert({
    where: { id: payload.id },
    update: {
      title: payload.title,
      subtitle: payload.subtitle,
      imageUrl: payload.imageUrl,
      linkUrl: payload.linkUrl,
      songId: payload.songId,
      sortOrder: payload.sortOrder,
      isActive: payload.isActive,
      updatedAt: payload.updatedAt,
    },
    create: payload,
  });

  const count = await prisma.heroBanner.count();
  console.log(JSON.stringify({ dryRun: false, source: filePath, records: count, saved: { id: saved.id, title: saved.title } }, null, 2));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ ok: false, error: message }, null, 2));
  process.exitCode = 1;
});
