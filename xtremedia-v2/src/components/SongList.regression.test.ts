import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('SongList row is clickable for song playback from the homepage list', () => {
  const filePath = path.join(process.cwd(), 'src/components/SongList.tsx');
  const source = fs.readFileSync(filePath, 'utf8');

  assert.match(source, /handleSongSelection\s*\(/, 'Missing song-selection handler');
  assert.match(source, /role=\s*['"]button['"]/, 'Missing button semantics on the row');
  assert.match(source, /onClick=\s*\{\s*\(\)\s*=>\s*handleSongSelection\(song\)\s*\}/, 'Missing row-level click handler');
});
