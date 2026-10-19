import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { readLegacyStoreSongs } from '../src/lib/repositories/songRepo.js';

test('legacy store fallback returns songs when the database is empty', async () => {
  const legacyPath = new URL('./fixtures/legacy-store-empty.json', import.meta.url);
  const songs = await readLegacyStoreSongs(fileURLToPath(legacyPath));

  assert.ok(Array.isArray(songs));
  assert.equal(songs.length, 2);
  assert.equal(songs[0].title, 'Legacy Song One');
  assert.equal(songs[1].artistName, 'Legacy Artist');
});
