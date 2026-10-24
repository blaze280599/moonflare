import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS } from '../lib/cards.js';
import { NEW_GAME, PITY_AT } from '../lib/gacha.js';
import {
  MAX_IMPORT_COINS,
  MAX_IMPORT_COPIES,
  dateInZone,
  isTimeZone,
  mergeImport,
  resetState,
  rowToState,
  sanitizeImport,
  stateToRow
} from '../lib/save.js';

test('isTimeZone accepts IANA names and rejects everything else', () => {
  for (const tz of ['UTC', 'Asia/Seoul', 'America/Argentina/Buenos_Aires', 'Etc/GMT+5', 'Asia/Calcutta']) assert.ok(isTimeZone(tz), tz);
  for (const tz of ['', 'Mars/Olympus', '+09:00', 'Asia/Seoul; drop table', 'x'.repeat(65), null, 42, undefined]) assert.ok(!isTimeZone(tz), String(tz));
});

test('dateInZone gives the calendar date in that zone', () => {
  const now = new Date('2026-10-24T20:30:00Z');
  assert.equal(dateInZone(now, 'UTC'), '2026-10-24');
  assert.equal(dateInZone(now, 'Asia/Seoul'), '2026-10-25'); // UTC+9, already past midnight
  assert.equal(dateInZone(now, 'America/Los_Angeles'), '2026-10-24');
  assert.equal(dateInZone(new Date('2026-10-25T02:00:00Z'), 'America/New_York'), '2026-10-24');
});

test('dateInZone treats a missing or bad zone as UTC', () => {
  const now = new Date('2026-10-24T23:59:00Z');
  assert.equal(dateInZone(now, null), '2026-10-24');
  assert.equal(dateInZone(now, 'Nowhere/Land'), '2026-10-24');
});

test('rows and game state convert both ways', () => {
  const state = { coins: 340, owned: { 'PM-HN-album': 2 }, packs: 3, pity: 2, lastDaily: '2026-10-24', bias: { LS: 'KZ' } };
  assert.deepEqual(rowToState(stateToRow(state)), state);
  assert.equal(stateToRow(NEW_GAME).last_daily, null);
  assert.equal(rowToState({ coins: 500, owned: {}, packs: 0, pity: 0, last_daily: null }).lastDaily, '');
  assert.deepEqual(rowToState({ coins: 500, owned: {}, packs: 0, pity: 0, last_daily: null }).bias, {});
});

test('sanitizeImport keeps only real cards with sane counts', () => {
  const real = CARDS[0].id;
  const out = sanitizeImport({
    coins: 999_999,
    owned: { [real]: 3, 'XX-FAKE-card': 5, [CARDS[1].id]: -2, [CARDS[2].id]: 1.5, [CARDS[3].id]: 10_000, __proto__: 1, constructor: 4 },
    packs: 12,
    pity: 999,
    lastDaily: '2099-01-01'
  });
  assert.deepEqual(out.owned, { [real]: 3, [CARDS[3].id]: MAX_IMPORT_COPIES });
  assert.equal(out.coins, MAX_IMPORT_COINS);
  assert.equal(out.packs, 12);
  assert.equal(out.pity, PITY_AT - 1);
  assert.ok(!('lastDaily' in out), 'the browser cannot set the daily claim');
});

test('sanitizeImport survives junk', () => {
  for (const junk of [null, undefined, 'save', 42, [], { owned: 'all of them' }, { owned: [1, 2] }, { coins: '5000' }]) {
    assert.deepEqual(sanitizeImport(junk), { coins: 0, owned: {}, packs: 0, pity: 0 });
  }
});

test('mergeImport adds cards and takes the higher star count', () => {
  const id = CARDS[0].id;
  const account = { ...NEW_GAME, owned: { [id]: 1 }, packs: 2, lastDaily: '2026-10-24' };
  const merged = mergeImport(account, { coins: 120, owned: { [id]: 2, [CARDS[5].id]: 1 }, packs: 4, pity: 3 });
  assert.deepEqual(merged.owned, { [id]: 3, [CARDS[5].id]: 1 });
  assert.equal(merged.coins, NEW_GAME.coins);
  assert.equal(merged.packs, 6);
  assert.equal(merged.pity, 3);
  assert.equal(merged.lastDaily, '2026-10-24');
  assert.equal(mergeImport(NEW_GAME, { coins: 2000, owned: {}, packs: 0, pity: 0 }).coins, 2000);
});

test('reset keeps the daily claim so it cannot be claimed twice', () => {
  const s = resetState({ coins: 5, owned: { a: 1 }, packs: 9, pity: 4, lastDaily: '2026-10-24' });
  assert.deepEqual(s, { ...NEW_GAME, lastDaily: '2026-10-24' });
});

test('reset keeps the picked biases', () => {
  const s = resetState({ coins: 5, owned: { a: 1 }, packs: 9, pity: 4, lastDaily: '', bias: { LS: 'KZ' } });
  assert.deepEqual(s, { ...NEW_GAME, bias: { LS: 'KZ' } });
});
