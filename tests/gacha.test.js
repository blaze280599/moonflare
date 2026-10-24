import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, ERAS, RARITY } from '../lib/cards.js';
import { BIAS_BOOST, NEW_GAME, PACK_COST, PITY_AT, RATES, biasShare, memberRates, pickCard, rollPack } from '../lib/gacha.js';

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

// Pick your bias. The user's hard limit is a 1-2 percentage point boost.
const lsEra = ERAS.find(e => e.group.code === 'LS');
const BIAS = 'KZ';
const biased = { ...NEW_GAME, bias: { [lsEra.group.code]: BIAS } };
const isBias = card => card.member?.code === BIAS;
// A small seeded rng, so two rolls can share the same stream.
const lcg = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

test('the bias boost stays within 1-2 percentage points', () => {
  assert.ok(BIAS_BOOST >= 1 && BIAS_BOOST <= 2, `BIAS_BOOST is ${BIAS_BOOST}`);
  const base = memberRates(lsEra, null);
  const boosted = memberRates(lsEra, BIAS);
  const gain = boosted.find(m => m.isBias).pct - base.find(m => m.member.code === BIAS).pct;
  assert.ok(gain > 0 && gain <= 2, `bias gains ${gain} points per card`);
  for (const m of boosted.filter(m => !m.isBias)) assert.ok(m.pct < base.find(b => b.member === m.member).pct);
});

test('member rates add up to every non-group card, with or without a bias', () => {
  const memberPct = 100 - RATES.find(r => r.rarity === 'mythic').pct;
  for (const bias of [null, BIAS]) {
    const total = memberRates(lsEra, bias).reduce((s, m) => s + m.pct, 0);
    assert.ok(Math.abs(total - memberPct) < 1e-9, `${bias}: ${total}`);
  }
  const even = memberRates(lsEra, null);
  assert.ok(even.every(m => Math.abs(m.pct - even[0].pct) < 1e-9));
});

test('pickCard gives the bias exactly biasShare of the picks', () => {
  const options = CARDS.filter(c => c.era === lsEra && c.rarity === 'common');
  const N = 100_000;
  const counts = new Map();
  for (let i = 0; i < N; i++) {
    const card = pickCard(options, BIAS, () => (i + 0.5) / N);
    counts.set(card.id, (counts.get(card.id) || 0) + 1);
  }
  assert.equal(counts.size, options.length, 'every member can still be pulled');
  for (const card of options) {
    const want = isBias(card) ? biasShare(options.length) : (1 - biasShare(options.length)) / (options.length - 1);
    assert.ok(Math.abs(counts.get(card.id) / N - want) < 1e-4, `${card.id}: ${counts.get(card.id) / N}`);
  }
});

test('a bias from another group, or an unknown code, changes nothing', () => {
  const options = CARDS.filter(c => c.era === lsEra && c.rarity === 'rare');
  for (let u = 0; u < 1; u += 0.01) {
    const plain = pickCard(options, null, () => u);
    assert.equal(pickCard(options, 'HN', () => u), plain);
    assert.equal(pickCard(options, 'nope', () => u), plain);
  }
  const other = { ...NEW_GAME, bias: { MF: 'HN' } };
  for (let k = 1; k <= 50; k++) assert.deepEqual(rollPack(other, lsEra, lcg(k)).pulls, rollPack(NEW_GAME, lsEra, lcg(k)).pulls);
});

test('a bias never changes rarities, so pity and refunds work the same', () => {
  // Same rng stream: the rarities match card for card.
  for (let k = 1; k <= 200; k++) {
    assert.deepEqual(rarities(rollPack(biased, lsEra, lcg(k)).pulls), rarities(rollPack(NEW_GAME, lsEra, lcg(k)).pulls));
  }
  let state = { ...biased, coins: PACK_COST * PITY_AT };
  for (let i = 1; i <= PITY_AT; i++) state = rollPack(state, lsEra, COMMON).state;
  assert.equal(state.pity, 0, 'the 15th dry album still forces a lucky draw');
});

test('the biased card is the one the bias boost picks', () => {
  // Rarity rolls first (five calls), then one call per card.
  const seq = [0.1, 0.1, 0.1, 0.1, 0.1, 0, 0, 0, 0, 0.999];
  let i = 0;
  const { pulls } = rollPack(biased, lsEra, () => seq[i++]);
  assert.ok(pulls.slice(0, 4).every(p => isBias(p.card)));
  assert.ok(!isBias(pulls[4].card));
});
