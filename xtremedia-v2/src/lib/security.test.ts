import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { enforceAdminOrigin } from './security';
import { DEFAULT_FALLBACK_AUDIO_URL, isExpectedPlaybackAbort, sanitizeAudioUrl } from './audioPlayback';

test('allows same local host with a different port', () => {
  const request = new NextRequest('http://localhost:3000/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'http://localhost:3001',
      host: 'localhost:3000',
    },
  });

  assert.equal(enforceAdminOrigin(request), null);
});

test('blocks a different remote origin', () => {
  const request = new NextRequest('http://localhost:3000/api/admin/songs', {
    method: 'PUT',
    headers: {
      origin: 'https://example.com',
      host: 'localhost:3000',
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
