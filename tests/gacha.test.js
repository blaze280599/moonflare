import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, ERAS, RARITY } from '../lib/cards.js';
import { NEW_GAME, PACK_COST, PITY_AT, RATES, rollPack } from '../lib/gacha.js';

const era = ERAS[0];
// rng values that land inside each rarity's band (RATES are cumulative in list order).
const COMMON = () => 0.1;
const LEGENDARY = () => 0.97;
const rarities = pulls => pulls.map(p => p.card.rarity);

test('pull rates add up to 100%', () => {
  const total = RATES.reduce((sum, r) => sum + r.pct, 0);
  assert.ok(Math.abs(total - 100) < 1e-9, `rates sum to ${total}`);
  assert.deepEqual(RATES.map(r => r.rarity).sort(), Object.keys(RARITY).sort());
});

test('each rate band rolls its own rarity', () => {
  let low = 0;
  for (const { rarity, pct } of RATES) {
    const mid = (low + pct / 2) / 100;
    const { pulls } = rollPack(NEW_GAME, era, () => mid);
    assert.equal(pulls[0].card.rarity, rarity);
    low += pct;
  }
});

test('an album costs PACK_COST and deals five cards from its era', () => {
  const { state, pulls } = rollPack(NEW_GAME, era);
  assert.equal(pulls.length, 5);
  assert.ok(pulls.every(p => p.card.era.code === era.code));
  assert.equal(state.packs, 1);
  assert.equal(state.coins, NEW_GAME.coins - PACK_COST + pulls.reduce((s, p) => s + p.refund, 0));
});

test('card 5 is always Rare or better', () => {
  const { pulls } = rollPack(NEW_GAME, era, COMMON);
  assert.deepEqual(rarities(pulls), ['common', 'common', 'common', 'common', 'rare']);
});

test('pity forces a lucky draw on the PITY_AT-th dry album, not before', () => {
  const before = rollPack({ ...NEW_GAME, pity: PITY_AT - 2 }, era, COMMON);
  assert.equal(before.pulls[4].card.rarity, 'rare');
  assert.equal(before.state.pity, PITY_AT - 1);

  const forced = rollPack(before.state, era, COMMON);
  assert.equal(forced.pulls[4].card.rarity, 'legendary');
  assert.equal(forced.state.pity, 0);
});

test('15 dry albums in a row always end with a lucky draw', () => {
  let state = { ...NEW_GAME, coins: PACK_COST * PITY_AT };
  for (let i = 1; i <= PITY_AT; i++) {
    const result = rollPack(state, era, COMMON);
    state = result.state;
    const gotLucky = result.pulls.some(p => RARITY[p.card.rarity].rank >= 3);
    assert.equal(gotLucky, i === PITY_AT, `album ${i}`);
  }
});

test('a natural Legendary resets pity', () => {
  const { state } = rollPack({ ...NEW_GAME, pity: 7 }, era, LEGENDARY);
  assert.equal(state.pity, 0);
});

test('only duplicates refund stars', () => {
  const first = rollPack(NEW_GAME, era, COMMON);
  // Same rng picks the same card for slots 1-4, so slot 1 is new and slots 2-4 are duplicates.
  assert.deepEqual(first.pulls.map(p => p.isNew), [true, false, false, false, true]);
  assert.deepEqual(first.pulls.map(p => p.refund), [0, RARITY.common.refund, RARITY.common.refund, RARITY.common.refund, 0]);

  const card = first.pulls[0].card;
  assert.equal(first.state.owned[card.id], 4);
});

test('rollPack does not mutate the state passed in', () => {
  const start = structuredClone({ ...NEW_GAME, owned: { [CARDS[0].id]: 1 } });
  const copy = structuredClone(start);
  rollPack(start, era);
  assert.deepEqual(start, copy);
});

// Economy guard: once a player owns everything, albums must still cost stars on average.
test('an all-duplicate album refunds well under its cost', () => {
  const p = Object.fromEntries(RATES.map(r => [r.rarity, r.pct / 100]));
  const refund = r => RARITY[r].refund;
  const perCard = RATES.reduce((s, r) => s + p[r.rarity] * refund(r.rarity), 0);
  // Card 5 turns a Common roll into a Rare.
  const lastCard = perCard - p.common * refund('common') + p.common * refund('rare');
  const expected = 4 * perCard + lastCard;
  assert.ok(expected <= PACK_COST * 0.6, `expected refund ${expected.toFixed(1)} ★ per ${PACK_COST} ★ album`);
});
