import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNext } from '../lib/supabase/safe-next.js';

test('keeps paths on this site', () => {
  assert.equal(safeNext('/collection'), '/collection');
  assert.equal(safeNext('/groups/le-sserafim?x=1'), '/groups/le-sserafim?x=1');
});

test('lets a password reset link land on /reset-password', () => {
  assert.equal(safeNext('/reset-password'), '/reset-password');
});

test('refuses anything that could leave the site', () => {
  for (const next of ['https://evil.com', '//evil.com', '/\\evil.com', '/\t/evil.com', 'evil.com', '', null, undefined, 42]) {
    assert.equal(safeNext(next), '/', String(next));
  }
});

test('never sends a signed-in player back to the auth pages', () => {
  for (const next of ['/login', '/signup?x=1', '/forgot-password', '/auth/confirm', '/auth']) assert.equal(safeNext(next), '/', next);
});
