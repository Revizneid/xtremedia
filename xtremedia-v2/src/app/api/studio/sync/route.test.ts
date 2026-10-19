import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { db } from '@/lib/db';
import { env } from '@/lib/env';

const secret = '1234567890abcdef1234567890abcdef';
env.STUDIO_SYNC_SECRET = secret;

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/studio/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test('web sync accepts decimal duration and persists rounded integer', async () => {
  const originalSync = db.syncSongFromStudio.bind(db);
  let calls = 0;

  try {
    (db as any).syncSongFromStudio = async (input: any) => {
      calls += 1;
      assert.equal(input.payload.durationSeconds, 191);
      assert.equal(input.payload.trimStart, 0);
      assert.equal(input.payload.trimEnd, 0);
      return { duplicate: false, song: null, status: 'SUCCESS' } as any;
    };

    const response = await POST(
      makeRequest({
        title: 'Test Song',
        audioUrl: 'https://example.com/audio.mp3',
        videoId: 'abc123',
        durationSeconds: 190.6,
        genreName: null,
        artistName: null,
        coverUrl: null,
        trimStart: null,
        trimEnd: null,
      })
    );

    assert.equal(response.status, 201);
    assert.equal(calls, 1);
  } finally {
    (db as any).syncSongFromStudio = originalSync;
  }
});

test('web sync rejects missing required fields with field names in the error', async () => {
  const response = await POST(makeRequest({ title: 'Test Song' }));
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.ok(String(payload.error).includes('audioUrl') || String(payload.error).includes('videoId') || String(payload.error).includes('durationSeconds'));
});

test('web sync reuses same idempotency key without creating duplicate record', async () => {
  const originalSync = db.syncSongFromStudio.bind(db);
  let calls = 0;

  try {
    (db as any).syncSongFromStudio = async (input: any) => {
      calls += 1;
      if (calls === 1) {
        return { duplicate: false, song: { id: 'song-1', title: 'Test Song' }, status: 'SUCCESS' } as any;
      }
      return { duplicate: true, song: { id: 'song-1', title: 'Test Song' }, status: 'REUSED' } as any;
    };

    const first = await POST(makeRequest({
      title: 'Test Song',
      audioUrl: 'https://example.com/audio.mp3',
      videoId: 'abc123',
      durationSeconds: 191,
      artistName: null,
      genreName: null,
    }, { 'Idempotency-Key': 'same-key' }));

    const second = await POST(makeRequest({
      title: 'Test Song',
      audioUrl: 'https://example.com/audio.mp3',
      videoId: 'abc123',
      durationSeconds: 191,
      artistName: null,
      genreName: null,
    }, { 'Idempotency-Key': 'same-key' }));

    assert.equal(first.status, 201);
    assert.equal(second.status, 200);
    assert.equal(calls, 2);
  } finally {
    (db as any).syncSongFromStudio = originalSync;
  }
});
