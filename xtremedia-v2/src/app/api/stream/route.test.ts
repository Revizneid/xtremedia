import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { db } from '@/lib/db';

const originalAllowedHosts = process.env.STREAM_ALLOWED_HOSTS;
const originalProxyEnabled = process.env.STREAM_PROXY_ENABLED;

function makeRequest(url: string): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`);
}

test('stream rejects arbitrary url parameter', async () => {
  const response = await GET(makeRequest('/api/stream?url=http://example.com/audio.mp3'));
  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(String(payload.error ?? ''), /url/i);
});

test('stream blocks host outside allowlist', async () => {
  process.env.STREAM_ALLOWED_HOSTS = 'cdn.example.com';
  const originalGetSongById = db.getSongById.bind(db);
  try {
    (db as any).getSongById = async () => ({ id: 'song-1', audioUrl: 'https://evil.example.net/song.mp3' });

    const response = await GET(makeRequest('/api/stream?id=song-1'));
    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.equal(payload.error, 'Audio host is not allowed');
  } finally {
    (db as any).getSongById = originalGetSongById;
  }
});

test('stream blocks private/internal IP hosts', async () => {
  process.env.STREAM_ALLOWED_HOSTS = 'cdn.example.com';
  const originalGetSongById = db.getSongById.bind(db);
  try {
    (db as any).getSongById = async () => ({ id: 'song-2', audioUrl: 'https://127.0.0.1/audio.mp3' });

    const response = await GET(makeRequest('/api/stream?id=song-2'));
    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.equal(payload.error, 'Audio host is not allowed');
  } finally {
    (db as any).getSongById = originalGetSongById;
  }
});

test('stream redirects approved song hosts without proxying', async () => {
  process.env.STREAM_ALLOWED_HOSTS = 'cdn.example.com';
  const originalGetSongById = db.getSongById.bind(db);
  try {
    (db as any).getSongById = async () => ({ id: 'song-3', audioUrl: 'https://cdn.example.com/audio/song.mp3' });

    const response = await GET(makeRequest('/api/stream?id=song-3'));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), 'https://cdn.example.com/audio/song.mp3');
  } finally {
    (db as any).getSongById = originalGetSongById;
  }
});

test('stream blocks redirected host when proxy mode is enabled', async () => {
  process.env.STREAM_ALLOWED_HOSTS = 'cdn.example.com';
  process.env.STREAM_PROXY_ENABLED = 'true';
  const originalGetSongById = db.getSongById.bind(db);
  const originalFetch = global.fetch;
  try {
    (db as any).getSongById = async () => ({ id: 'song-4', audioUrl: 'https://cdn.example.com/audio/song.mp3' });
    global.fetch = async () => new Response(null, {
      status: 302,
      headers: { Location: 'https://malicious.example.net/track.mp3' },
    });

    const response = await GET(makeRequest('/api/stream?id=song-4'));
    assert.equal(response.status, 403);
    const payload = await response.json();
    assert.equal(payload.error, 'Audio host is not allowed');
  } finally {
    (db as any).getSongById = originalGetSongById;
    global.fetch = originalFetch;
    if (originalAllowedHosts === undefined) {
      delete process.env.STREAM_ALLOWED_HOSTS;
    } else {
      process.env.STREAM_ALLOWED_HOSTS = originalAllowedHosts;
    }
    if (originalProxyEnabled === undefined) {
      delete process.env.STREAM_PROXY_ENABLED;
    } else {
      process.env.STREAM_PROXY_ENABLED = originalProxyEnabled;
    }
  }
});
