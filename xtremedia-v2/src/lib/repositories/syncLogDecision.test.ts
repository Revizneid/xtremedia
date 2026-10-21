/**
 * syncLogDecision.test.ts – Test THUẦN cho logic duplicate/idempotency.
 *
 * Không cần DB, không cần DATABASE_URL, chạy được mọi nơi.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSongMatchWhere,
  decideSyncOutcome,
  whereClauseContainsTitleOrArtist,
} from './syncLogDecision.js';

// ─────────────────────────────────────────────────────────────────────────────
// buildSongMatchWhere
// ─────────────────────────────────────────────────────────────────────────────

test('buildSongMatchWhere: title and artist alone are not considered duplicate when audioUrl differs', () => {
  const whereA = buildSongMatchWhere({
    normalizedAudioUrl: 'https://cdn.example.com/song-v1.mp3',
    videoId: null,
  });
  const whereB = buildSongMatchWhere({
    normalizedAudioUrl: 'https://cdn.example.com/song-v2.mp3', // URL khác
    videoId: null,
  });

  // Bất biến: WHERE clause không được chứa title hay artist
  assert.equal(whereClauseContainsTitleOrArtist(whereA), false,
    'WHERE clause không được chứa title hoặc artist');

  // Hai URL khác nhau → hai WHERE clause khác nhau → không phải duplicate
  assert.notDeepEqual(whereA, whereB,
    'Bài hát có audioUrl khác nhau phải tạo WHERE clause khác nhau');
});

test('buildSongMatchWhere: same audioUrl creates identical WHERE clause', () => {
  const where1 = buildSongMatchWhere({ normalizedAudioUrl: 'https://cdn.example.com/same.mp3' });
  const where2 = buildSongMatchWhere({ normalizedAudioUrl: 'https://cdn.example.com/same.mp3' });

  assert.deepEqual(where1, where2, 'Cùng audioUrl phải tạo WHERE clause giống nhau');
});

test('buildSongMatchWhere: videoId + trim are included when provided', () => {
  const where = buildSongMatchWhere({
    normalizedAudioUrl: 'https://cdn.example.com/song.mp3',
    videoId: 'abc123',
    trimStart: 10,
    trimEnd: 200,
  });

  assert.equal(where.OR.length, 2, 'Phải có 2 clauses: audioUrl và videoId+trim');

  const videoClause = where.OR.find((c) => 'AND' in c) as any;
  assert.ok(videoClause, 'Phải có videoId clause dạng AND');
  assert.ok(videoClause.AND.some((p: any) => 'videoId' in p), 'AND phải chứa videoId');
  assert.ok(videoClause.AND.some((p: any) => p.trimStart === 10), 'AND phải chứa trimStart đúng');
  assert.ok(videoClause.AND.some((p: any) => p.trimEnd === 200), 'AND phải chứa trimEnd đúng');
});

test('buildSongMatchWhere: empty videoId produces only audioUrl clause', () => {
  const where = buildSongMatchWhere({
    normalizedAudioUrl: 'https://cdn.example.com/song.mp3',
    videoId: '',
  });
  assert.equal(where.OR.length, 1, 'Không có videoId → chỉ 1 clause audioUrl');
  assert.ok('audioUrl' in where.OR[0], 'Clause phải là audioUrl');
});

test('buildSongMatchWhere: null videoId produces only audioUrl clause', () => {
  const where = buildSongMatchWhere({
    normalizedAudioUrl: 'https://cdn.example.com/song.mp3',
    videoId: null,
  });
  assert.equal(where.OR.length, 1);
});

test('whereClauseContainsTitleOrArtist: returns false for audio/video clauses', () => {
  const where = buildSongMatchWhere({
    normalizedAudioUrl: 'https://cdn.example.com/song.mp3',
    videoId: 'abc',
    trimStart: 0,
    trimEnd: 0,
  });
  assert.equal(whereClauseContainsTitleOrArtist(where), false);
});

test('whereClauseContainsTitleOrArtist: returns true when title injected', () => {
  const fakeWhere = {
    OR: [
      { title: { equals: 'Test Song' } },
    ],
  };
  assert.equal(whereClauseContainsTitleOrArtist(fakeWhere), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// decideSyncOutcome
// ─────────────────────────────────────────────────────────────────────────────

test('decideSyncOutcome: existing log → REUSED regardless of song', () => {
  assert.equal(decideSyncOutcome({ id: 'log-1' }, null), 'REUSED');
  assert.equal(decideSyncOutcome({ id: 'log-1' }, { id: 'song-1' }), 'REUSED');
});

test('decideSyncOutcome: existing song without log → REUSED', () => {
  assert.equal(decideSyncOutcome(null, { id: 'song-1' }), 'REUSED');
});

test('decideSyncOutcome: no log no song → NEW', () => {
  assert.equal(decideSyncOutcome(null, null), 'NEW');
});

test('decideSyncOutcome: title+artist match alone does NOT imply REUSED (must use audioUrl/videoId)', () => {
  // Nếu không có log và không có song match theo audioUrl/videoId,
  // thì kết quả phải là NEW — dù title+artist giống nhau.
  // Đây là bất biến cốt lõi: title alone != duplicate.
  const outcome = decideSyncOutcome(
    null,          // không tìm thấy log theo idempotencyKey
    null           // không tìm thấy song theo audioUrl/videoId
    // (title match không được truyền vào hàm này — đúng thiết kế)
  );
  assert.equal(outcome, 'NEW',
    'Khi title/artist giống nhau nhưng audioUrl khác → không phải duplicate → NEW');
});
