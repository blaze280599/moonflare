import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ERAS, GROUPS } from '../lib/cards.js';
import { NEW_GAME } from '../lib/gacha.js';
import { resetState } from '../lib/save.js';
import {
  EVENT_COST,
  GROUP_COST,
  MAX_PACKS,
  STANDARD_COST,
  albumOdds,
  buyPack,
  canBuy,
  givePacks,
  groupKind,
  packFor,
  packsOf,
  pickAlbum,
  shopPacks,
  takePack
} from '../lib/shop.js';

const NOW = Date.parse('2026-10-24T12:00:00Z');
const standard = packFor('standard');
const ls = packFor(groupKind(GROUPS[0]));

test('pack kinds resolve, and unknown ones do not', () => {
  assert.equal(standard.price, STANDARD_COST);
  assert.equal(ls.price, GROUP_COST);
  assert.equal(ls.group, GROUPS[0]);
  for (const kind of ['', 'group:', 'group:XX', 'album:FL', 'album:nope', 'nope', null, 42, undefined]) assert.equal(packFor(kind), null, String(kind));
});

test('the shop sells the standard pack and one pack per group', () => {
  const kinds = shopPacks(NOW).map(p => p.kind);
  assert.equal(kinds[0], 'standard');
  for (const g of GROUPS) assert.ok(kinds.includes(groupKind(g)), g.code);
});

test('random packs never land on an event album', () => {
  for (const pack of [standard, ...GROUPS.map(g => packFor(groupKind(g)))]) assert.ok(pack.eras.every(e => !e.event), pack.kind);
});

test('album odds add up to 100% for every pack', () => {
  for (const pack of shopPacks(NOW)) {
    const total = albumOdds(pack).reduce((s, o) => s + o.pct, 0);
    assert.ok(Math.abs(total - 100) < 1e-9, `${pack.kind}: ${total}`);
  }
});

test('a standard pack gives every group the same share, however many albums it has', () => {
  const odds = albumOdds(standard);
  for (const g of GROUPS) {
    const share = odds.filter(o => o.era.group === g).reduce((s, o) => s + o.pct, 0);
    assert.ok(Math.abs(share - 100 / GROUPS.length) < 1e-9, `${g.code}: ${share}`);
  }
});

test('pickAlbum lands on each album exactly as often as albumOdds says', () => {
  const N = 100_000;
  for (const pack of [standard, ls]) {
    const counts = new Map();
    for (let i = 0; i < N; i++) {
      const era = pickAlbum(pack, () => (i + 0.5) / N);
      counts.set(era, (counts.get(era) || 0) + 1);
    }
    for (const { era, pct } of albumOdds(pack)) assert.ok(Math.abs((counts.get(era) || 0) / N - pct / 100) < 1e-3, `${pack.kind} ${era.code}`);
    assert.ok([...counts.keys()].every(e => pack.eras.includes(e)));
  }
  assert.ok(ls.eras.includes(pickAlbum(ls, () => 0.999999)));
});

test('buying takes the price and adds the pack', () => {
  const { state } = buyPack({ ...NEW_GAME, coins: 200 }, ls, NOW);
  assert.equal(state.coins, 200 - GROUP_COST);
  assert.equal(packsOf(state, ls.kind), 1);
  assert.equal(buyPack({ ...NEW_GAME, coins: GROUP_COST - 1 }, ls, NOW).error, 'not_enough_stars');
  assert.equal(buyPack(givePacks({ ...NEW_GAME, coins: 1000 }, ls.kind, MAX_PACKS), ls, NOW).error, 'too_many_packs');
});

test('opening takes one pack and refuses when there is none', () => {
  const two = givePacks(NEW_GAME, ls.kind, 2);
  const one = takePack(two, ls.kind).state;
  assert.equal(packsOf(one, ls.kind), 1);
  const none = takePack(one, ls.kind).state;
  assert.ok(!(ls.kind in none.inventory), 'an empty kind is removed');
  assert.equal(takePack(none, ls.kind).error, 'no_pack');
  assert.equal(packsOf(NEW_GAME, ls.kind), 0);
});

test('givePacks caps at MAX_PACKS', () => {
  assert.equal(packsOf(givePacks(NEW_GAME, 'standard', 500), 'standard'), MAX_PACKS);
});

test('an event pack sells only while its event is live', () => {
  const era = { ...ERAS[0], code: 'ZZ', event: { starts: '2026-10-01T00:00:00Z', ends: '2026-10-10T00:00:00Z' } };
  const pack = { kind: 'album:ZZ', type: 'album', era, group: era.group, price: EVENT_COST, eras: [era] };
  assert.ok(canBuy(pack, Date.parse('2026-10-05T00:00:00Z')));
  assert.ok(!canBuy(pack, Date.parse('2026-09-30T00:00:00Z')));
  assert.equal(buyPack({ ...NEW_GAME, coins: 1000 }, pack, NOW).error, 'event_closed');
  assert.ok(canBuy(standard, NOW) && canBuy(ls, NOW));
});

test('a new game and a reset start with stars and two standard packs', () => {
  assert.equal(packsOf(NEW_GAME, 'standard'), 2);
  const reset = resetState({ ...givePacks(NEW_GAME, ls.kind, 3), coins: 5, lastDaily: '2026-10-24' });
  assert.deepEqual(reset.inventory, { standard: 2 });
  assert.equal(reset.coins, NEW_GAME.coins);
});
