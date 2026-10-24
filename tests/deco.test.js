import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../lib/cards.js';
import { NEW_GAME } from '../lib/gacha.js';
import { resetState } from '../lib/save.js';
import { STICKERS, TINTS } from '../lib/stickers.js';
import {
  MAX_SCALE,
  MAX_STICKERS,
  MAX_TOPLOADERS,
  MIN_SCALE,
  applyToploader,
  cleanSticker,
  sanitizeToploader,
  toploaderFor,
  wrapAngle
} from '../lib/deco.js';

const card = CARDS[0].id;
const owning = (...ids) => ({ ...NEW_GAME, owned: Object.fromEntries(ids.map(id => [id, 1])) });
const heart = (extra = {}) => ({ id: 'heart', x: 0.5, y: 0.5, k: 1, r: 0, ...extra });

test('sticker and tint ids are unique, and every sticker is an SVG data URL', () => {
  assert.equal(new Set(STICKERS.map(s => s.id)).size, STICKERS.length);
  assert.equal(new Set(TINTS.map(t => t.id)).size, TINTS.length);
  for (const s of STICKERS) assert.match(s.src, /^data:image\/svg\+xml;/, s.id);
});

test('cleanSticker clamps position and scale, wraps rotation and rounds', () => {
  assert.deepEqual(cleanSticker(heart({ x: -3, y: 9, k: 99, r: 270 })), { id: 'heart', x: 0, y: 1, k: MAX_SCALE, r: -90 });
  assert.deepEqual(cleanSticker(heart({ x: 0.12345, k: 0.01, r: -190 })), { id: 'heart', x: 0.123, y: 0.5, k: MIN_SCALE, r: 170 });
  assert.deepEqual(cleanSticker({ id: 'star', x: 0.2, y: 0.3 }), { id: 'star', x: 0.2, y: 0.3, k: 1, r: 0 });
});

test('cleanSticker rejects unknown ids and bad numbers', () => {
  for (const bad of [null, 'heart', [], { ...heart(), id: 'toString' }, { ...heart(), id: 'skull' }, heart({ x: NaN }), heart({ y: Infinity }), heart({ k: '2' }), { id: 'heart' }]) {
    assert.equal(cleanSticker(bad), null, JSON.stringify(bad));
  }
});

test('wrapAngle keeps angles in -180..180', () => {
  assert.equal(wrapAngle(0), 0);
  assert.equal(wrapAngle(180), 180);
  assert.equal(wrapAngle(-180), 180);
  assert.equal(wrapAngle(540), 180);
  assert.equal(wrapAngle(-450), -90);
});

test('sanitizeToploader falls back to a clear tint, drops junk and caps the sticker count', () => {
  assert.deepEqual(sanitizeToploader(null), { t: 'clear', s: [] });
  assert.deepEqual(sanitizeToploader({ t: 'neon', s: 'lots' }), { t: 'clear', s: [] });
  const many = Array.from({ length: MAX_STICKERS + 10 }, (_, i) => heart({ x: i / 100 }));
  const out = sanitizeToploader({ t: 'pink', s: [{ id: 'nope' }, ...many] });
  assert.equal(out.t, 'pink');
  assert.equal(out.s.length, MAX_STICKERS);
  assert.equal(out.s[0].x, 0);
  // Huge arrays are cut before cleaning, so a junk-padded request can't make the server work hard.
  assert.deepEqual(sanitizeToploader({ s: [...Array(MAX_STICKERS * 4).fill(null), heart()] }).s, []);
});

test('applyToploader only decorates cards the player owns', () => {
  assert.deepEqual(applyToploader(owning(), card, { s: [heart()] }), { error: 'not_owned' });
  assert.deepEqual(applyToploader(owning(card), 'XX-nope', { s: [heart()] }), { error: 'unknown_card' });
  assert.deepEqual(applyToploader(owning(card), '__proto__', { s: [heart()] }), { error: 'unknown_card' });
  const { state } = applyToploader(owning(card), card, { t: 'gold', s: [heart({ x: 2 })] });
  assert.deepEqual(state.deco, { [card]: { t: 'gold', s: [{ id: 'heart', x: 1, y: 0.5, k: 1, r: 0 }] } });
});

test('a plain toploader removes the entry instead of storing it', () => {
  const decorated = applyToploader(owning(card), card, { t: 'pink', s: [] }).state;
  assert.ok(decorated.deco[card]);
  assert.deepEqual(applyToploader(decorated, card, { t: 'clear', s: [] }).state.deco, {});
});

test('applyToploader caps how many toploaders a save holds, but still edits existing ones', () => {
  const ids = CARDS.slice(0, MAX_TOPLOADERS + 1).map(c => c.id);
  let state = owning(...ids);
  for (const id of ids.slice(0, MAX_TOPLOADERS)) state = applyToploader(state, id, { s: [heart()] }).state;
  assert.equal(Object.keys(state.deco).length, MAX_TOPLOADERS);
  assert.deepEqual(applyToploader(state, ids[MAX_TOPLOADERS], { s: [heart()] }), { error: 'too_many' });
  assert.equal(applyToploader(state, ids[0], { t: 'mint', s: [] }).state.deco[ids[0]].t, 'mint');
});

test('toploaderFor hides decorations on cards no longer owned, and reset clears them', () => {
  const state = applyToploader(owning(card), card, { s: [heart()] }).state;
  assert.ok(toploaderFor(state, card));
  assert.equal(toploaderFor({ ...state, owned: {} }, card), null);
  assert.deepEqual(resetState(state).deco, {});
});
