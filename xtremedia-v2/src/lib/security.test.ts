import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { enforceAdminOrigin } from './security';
import { DEFAULT_FALLBACK_AUDIO_URL, isExpectedPlaybackAbort, sanitizeAudioUrl } from './audioPlayback';

const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

function withOriginEnv(overrides: Record<string, string | undefined>) {
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
}

test.afterEach(() => {
  if (originalAllowedOrigins === undefined) delete process.env.ALLOWED_ORIGINS;
  else process.env.ALLOWED_ORIGINS = originalAllowedOrigins;

  if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
});

test('allows same-origin requests identified by sec-fetch-site', () => {
  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      'sec-fetch-site': 'same-origin',
      host: 'app.example.com',
    },
  });

  assert.equal(enforceAdminOrigin(request), null);
});

test('allows origin matching x-forwarded-host and x-forwarded-proto without env fallback', () => {
  withOriginEnv({ NEXT_PUBLIC_APP_URL: undefined, ALLOWED_ORIGINS: undefined });

  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'https://app.example.com',
      'x-forwarded-host': 'app.example.com',
      'x-forwarded-proto': 'https',
      host: 'internal-proxy:3000',
    },
  });

  assert.equal(enforceAdminOrigin(request), null);
});

test('normalizes trailing slash and uppercase host before accepting a matching origin', () => {
  withOriginEnv({ NEXT_PUBLIC_APP_URL: undefined, ALLOWED_ORIGINS: undefined });

  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'https://APP.EXAMPLE.com/',
      'x-forwarded-host': 'app.example.com',
      'x-forwarded-proto': 'https',
      host: 'internal-proxy:3000',
    },
  });

  assert.equal(enforceAdminOrigin(request), null);
});

test('blocks a different remote origin', () => {
  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'https://example.com',
      host: 'app.example.com',
    },
  });

  assert.equal(enforceAdminOrigin(request)?.status, 403);
});

test('blocks a different subdomain unless explicitly whitelisted', () => {
  withOriginEnv({ ALLOWED_ORIGINS: 'https://admin.example.com' });

  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'https://www.example.com',
      host: 'app.example.com',
    },
  });

  assert.equal(enforceAdminOrigin(request)?.status, 403);
});

test('allows referer when origin is missing but the request is same source', () => {
  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      referer: 'https://app.example.com/api/admin/songs',
      'x-forwarded-host': 'app.example.com',
      'x-forwarded-proto': 'https',
      host: 'internal-proxy:3000',
    },
  });

  assert.equal(enforceAdminOrigin(request), null);
});

test('rejects requests missing both origin and referer', () => {
  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      host: 'app.example.com',
    },
  });

  const response = enforceAdminOrigin(request);
  assert.equal(response?.status, 403);
  assert.match(response?.headers.get('content-type') || '', /application\/json/);
});

test('treats origin=null as missing and rejects it', () => {
  const request = new NextRequest('https://app.example.com/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'null',
      host: 'app.example.com',
    },
  });

  assert.equal(enforceAdminOrigin(request)?.status, 403);
});

test('ignores the expected pause-induced AbortError from switching tracks', () => {
  const error = {
    name: 'AbortError',
    message: 'The play() request was interrupted by a call to pause().',
  };

  assert.equal(isExpectedPlaybackAbort(error), true);
  assert.equal(isExpectedPlaybackAbort(new Error('Not allowed to play audio')), false);
});

test('falls back to a valid audio file when the source is a placeholder or broken URL', () => {
  assert.equal(sanitizeAudioUrl('https://example.com/sample.mp3'), DEFAULT_FALLBACK_AUDIO_URL);
  assert.equal(sanitizeAudioUrl('https://github.com/Revizneid/xtremedia/releases/download/v2.0-music/test.mp3'), 'https://github.com/Revizneid/xtremedia/releases/download/v2.0-music/test.mp3');
});
