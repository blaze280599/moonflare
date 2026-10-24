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

// A real group's era without photos would silently fall back to drawn art of the wrong members.
test('every card from a real group has its own photo, and its era a cover', () => {
  for (const era of ERAS.filter(e => e.group.photos)) {
    assert.match(era.cover, /^https:\/\//, `${era.name} cover`);
    const photos = CARDS.filter(c => c.era === era).map(c => c.photo);
    assert.ok(photos.every(p => /^https:\/\//.test(p)), `${era.name} is missing photos`);
    assert.equal(new Set(photos).size, photos.length, `${era.name} reuses a photo`);
  }
});

test('MOONFLARE cards keep drawn art', () => {
  const moonflare = GROUPS.find(g => g.code === 'MF');
  assert.ok(CARDS.filter(c => c.era.group === moonflare).every(c => !c.photo));
});

test('era codes are unique', () => {
  assert.equal(new Set(ERAS.map(e => e.code)).size, ERAS.length);
});
