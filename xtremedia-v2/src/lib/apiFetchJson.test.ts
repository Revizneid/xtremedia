import assert from 'node:assert/strict';
import test from 'node:test';
import { apiFetchJson } from './apiFetchJson';

test('apiFetchJson returns null for empty response bodies', async () => {
  const res = new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } });
  const value = await apiFetchJson('/api/test', { method: 'GET' }, res as any);
  assert.equal(value, null);
});

test('apiFetchJson parses JSON and surfaces structured HTTP errors', async () => {
  const okRes = new Response(JSON.stringify({ ok: true, value: 1 }), { status: 200 });
  const parsed = await apiFetchJson('/api/test', { method: 'GET' }, okRes as any);
  assert.deepEqual(parsed, { ok: true, value: 1 });

  const badRes = new Response(JSON.stringify({ success: false, error: 'Origin không được phép', errorId: 'abc-123' }), { status: 403 });
  await assert.rejects(() => apiFetchJson('/api/test', { method: 'POST' }, badRes as any), (err: any) => {
    assert.equal(err.status, 403);
    assert.equal(err.message, 'Origin không được phép');
    assert.equal(err.errorId, 'abc-123');
    return true;
  });
});
