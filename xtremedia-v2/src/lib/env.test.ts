import test from 'node:test';
import assert from 'node:assert/strict';

import { parseEnv } from './env';
import { buildStudioSyncIdempotencyKey, validateStudioSecret } from './studioSync';

test('parseEnv requires real secrets in production', () => {
  assert.throws(
    () => parseEnv({ NODE_ENV: 'production', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
    /JWT_SECRET|STUDIO_SYNC_SECRET/
  );
});

test('parseEnv generates ephemeral secrets only in development', () => {
  const env = parseEnv({ NODE_ENV: 'development', NEXT_PUBLIC_APP_URL: 'http://localhost:3000' });

  assert.ok(env.JWT_SECRET.length >= 32);
  assert.ok(env.STUDIO_SYNC_SECRET.length >= 32);
  assert.notEqual(env.JWT_SECRET, 'development_jwt_secret_for_build_only_change_in_production');
  assert.notEqual(env.STUDIO_SYNC_SECRET, 'development_studio_sync_secret_for_build_only_change_in_production');
});

test('studio sync idempotency key stays deterministic for the same payload', () => {
  const first = buildStudioSyncIdempotencyKey({
    audioUrl: 'https://cdn.example.com/track.mp3',
    videoId: 'video-123',
    trimStart: 15,
    trimEnd: 180,
  });

  const second = buildStudioSyncIdempotencyKey({
    audioUrl: 'https://cdn.example.com/track.mp3',
    videoId: 'video-123',
    trimStart: 15,
    trimEnd: 180,
  });

  assert.equal(first, second);
  assert.ok(first.length >= 32);
});

test('studio sync validation rejects mismatched secrets and accepts matching bearer tokens', () => {
  const secret = 'a_very_long_studio_secret_for_testing_12345';

  assert.equal(
    validateStudioSecret('Bearer wrong-secret', secret),
    false
  );
  assert.equal(
    validateStudioSecret('Bearer a_very_long_studio_secret_for_testing_12345', secret),
    true
  );
});
