import test from 'node:test';
import assert from 'node:assert/strict';

import { parseEnv } from './env';

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
