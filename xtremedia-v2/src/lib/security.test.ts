import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { enforceAdminOrigin } from './security';

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
