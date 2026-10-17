# XtreMedia v2

## Development

Before running the app, copy the example environment file and fill in the real values:

```bash
cp .env.example .env.local
```

Then install dependencies and start the app:

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open http://localhost:3000.

> Important: keep `.env.local` out of Git. `JWT_SECRET` and `STUDIO_SYNC_SECRET` must be unique per environment and at least 32 characters long.
>
> `NEXT_PUBLIC_*` values are build-time values. `NEXT_PUBLIC_APP_URL` must point to the real production origin in production; do not rely on localhost or an implicit default when deploying. Add explicit `ALLOWED_ORIGINS` for trusted admin origins when needed.

## Windows Prisma cache fix (EPERM rename issue)

If `npm run dev` or `npm run build` fails with an `EPERM` error while Prisma tries to rename a `.dll.node` file, the issue is usually a stale lock from a previous Node/VS Code process, not a bad project config.

Run the safe cleanup without admin rights:

```bash
node scripts/prepare-prisma.js
npx prisma generate
```

If the file is still locked, close other terminals or VS Code windows running the app, then rerun the commands above. The project also includes a `predev` and `prebuild` step so the cache is cleaned automatically before starting or building.

## Verification commands

Run these before opening a PR:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Database health

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{ "ok": true, "database": "connected" }
```

## Migration from legacy JSON store

```bash
npx tsx scripts/migrate-json-to-db.ts --dry-run --source data/store.json
npx tsx scripts/migrate-json-to-db.ts --source data/store.json
```

The migration script reads the legacy JSON store, upserts artists and genres first, then songs, and prints summary counts for created, updated, and failed rows. It is idempotent on stable record IDs and safe to run repeatedly.

## Backup PostgreSQL

Use pg_dump against the same connection string in .env.local:

```bash
export DATABASE_URL="postgresql://..."
mkdir -p backups
pg_dump "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges > backups/xtremedia-$(date +%F-%H%M%S).sql
```

To restore a backup:

```bash
psql "$DATABASE_URL" < backups/xtremedia-YYYY-MM-DD-HHMMSS.sql
```

## Sample seed data

Sample data is available in `data/sample-seed.json` and the legacy export in `data/store.json`.

Use the migration script with the sample seed for a dry run or a real import:

```bash
npx tsx scripts/migrate-json-to-db.ts --dry-run --source data/sample-seed.json
npx tsx scripts/migrate-json-to-db.ts --source data/sample-seed.json
```

## Studio sync API

The sync endpoint is protected by `STUDIO_SYNC_SECRET` and supports idempotency keys:

```bash
curl -X POST http://localhost:3000/api/studio/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDIO_SYNC_SECRET" \
  -H "Idempotency-Key: demo-sync-001" \
  -d '{
    "title": "Test Sync",
    "artistName": "Demo Artist",
    "genreName": "Pop",
    "audioUrl": "https://example.com/demo.mp3",
    "videoId": "demo-video-1",
    "trimStart": 0,
    "trimEnd": 30
  }'
```

The first request creates a song and a SyncLog entry. Repeating the same request with the same Idempotency-Key or the same computed key returns the original record without inserting a second song.
