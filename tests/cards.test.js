import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, ERAS, GROUPS, RARITY } from '../lib/cards.js';

test('card ids are unique', () => {
  assert.equal(new Set(CARDS.map(c => c.id)).size, CARDS.length);
});

test('every era has 21 cards covering every rarity', () => {
  for (const era of ERAS) {
    const cards = CARDS.filter(c => c.era === era);
    assert.equal(cards.length, 21, era.name);
    for (const r of Object.keys(RARITY)) assert.ok(cards.some(c => c.rarity === r), `${era.name} has no ${r}`);
  }
});

// Every card is a photo now; there's no drawn art to fall back to.
test('every card has its own photo, and its era a cover', () => {
  for (const era of ERAS) {
    assert.match(era.cover, /^https:\/\//, `${era.name} cover`);
    const photos = CARDS.filter(c => c.era === era).map(c => c.photo);
    assert.ok(photos.every(p => /^https:\/\//.test(p)), `${era.name} is missing photos`);
    assert.equal(new Set(photos).size, photos.length, `${era.name} reuses a photo`);
  }
});

// MOONFLARE, the made-up group, was removed; its codes may still sit in old browser saves.
test('retired MOONFLARE codes stay unused', () => {
  assert.ok(!GROUPS.some(g => g.code === 'MF'));
  assert.ok(!ERAS.some(e => ['PM', 'NB', 'SE'].includes(e.code)));
  assert.ok(!GROUPS.some(g => g.members.some(m => ['HN', 'YR', 'SJ', 'MR', 'DW'].includes(m.code))));
});

test('era codes are unique', () => {
  assert.equal(new Set(ERAS.map(e => e.code)).size, ERAS.length);
});
