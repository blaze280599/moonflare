import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, CARD_BY_ID } from '../lib/cards.js';
import {
  FOILS,
  MAX_WANT,
  NO_CRITERIA,
  inBinder,
  checkOffer,
  describeWant,
  foilOf,
  matchesWant,
  offerOptions,
  sanitizeWant
} from '../lib/trade.js';

const want = raw => {
  const { want, error } = sanitizeWant(raw);
  assert.equal(error, undefined, error);
  return want;
};

test('sanitizeWant fills defaults and orders lists like the catalog', () => {
  assert.deepEqual(want({}), NO_CRITERIA);
  assert.deepEqual(want({ group: 'LS', eras: ['EZ', 'FL', 'EZ'], members: ['KZ', 'CW'], rarities: ['legendary', 'epic'], count: 2 }), {
    group: 'LS',
    eras: ['FL', 'EZ'],
    members: ['CW', 'KZ'],
    rarities: ['epic', 'legendary'],
    foils: [],
    count: 2
  });
});

test('sanitizeWant rejects anything outside the catalog', () => {
  const bad = [
    null,
    [],
    'epic',
    { group: 'XX' },
    { eras: ['ZZ'] },
    { group: 'MF', eras: ['FL'] }, // MOONFLARE was removed
    { group: 'LS', members: ['HN'] }, // Haneul was MOONFLARE's
    { members: ['NOPE'] },
    { rarities: ['ultra'] },
    { foils: ['chrome'] },
    { eras: 'FL' },
    { eras: [42] },
    { count: 0 },
    { count: MAX_WANT + 1 },
    { count: 1.5 },
    { rarities: ['mythic'], members: ['KZ'] }, // group specials have no member, so nothing matches
    { rarities: ['common'], foils: ['gold'] }
  ];
  for (const raw of bad) assert.ok(sanitizeWant(raw).error, JSON.stringify(raw));
});

test('every catalog card has a known foil, and commons are matte', () => {
  const keys = FOILS.map(f => f.key);
  for (const c of CARDS) assert.ok(keys.includes(foilOf(c)), c.id);
  assert.equal(foilOf(CARD_BY_ID['FL-KZ-album']), 'matte');
  assert.equal(foilOf(CARD_BY_ID['FL-GRP']), 'gold');
});

test('matchesWant checks every criterion', () => {
  const w = want({ group: 'LS', eras: ['EZ'], members: ['KZ'], rarities: ['epic', 'legendary'] });
  assert.ok(matchesWant(CARD_BY_ID['EZ-KZ-pob'], w));
  assert.ok(matchesWant(CARD_BY_ID['EZ-KZ-lucky'], w));
  assert.ok(!matchesWant(CARD_BY_ID['EZ-KZ-album'], w)); // rarity
  assert.ok(!matchesWant(CARD_BY_ID['FL-KZ-pob'], w)); // era
  assert.ok(!matchesWant(CARD_BY_ID['EZ-CW-pob'], w)); // member
  assert.ok(!matchesWant(CARD_BY_ID['EZ-GRP'], w)); // no member
  assert.equal(CARDS.filter(c => matchesWant(c, want({}))).length, CARDS.length);
  const foil = want({ foils: ['cosmos'] });
  assert.ok(CARDS.filter(c => matchesWant(c, foil)).every(c => c.rarity === 'legendary'));
});

test('offerOptions lists matching cards the player has, spares first', () => {
  const owned = { 'EZ-KZ-pob': 1, 'EZ-KZ-album': 3, 'EZ-CW-pob': 2, 'PM-HN-pob': 5 } // PM-HN-pob is a retired id;
  const options = offerOptions(owned, want({ group: 'LS' }));
  assert.deepEqual(
    options.map(o => [o.card.id, o.copies]),
    [
      ['EZ-CW-pob', 2],
      ['EZ-KZ-album', 3],
      ['EZ-KZ-pob', 1]
    ]
  );
  assert.deepEqual(offerOptions({}, want({})), []);
});

test('checkOffer needs the right count, matching cards and enough copies', () => {
  const w = want({ rarities: ['epic'], count: 2 });
  const owned = { 'EZ-KZ-pob': 2, 'FL-CW-pob': 1, 'FL-CW-album': 4 };
  assert.equal(checkOffer(w, ['EZ-KZ-pob', 'FL-CW-pob'], owned), null);
  assert.equal(checkOffer(w, ['EZ-KZ-pob', 'EZ-KZ-pob'], owned), null);
  assert.ok(checkOffer(w, ['EZ-KZ-pob'], owned)); // too few
  assert.ok(checkOffer(w, ['EZ-KZ-pob', 'FL-CW-pob', 'EZ-KZ-pob'], owned)); // too many
  assert.ok(checkOffer(w, ['FL-CW-pob', 'FL-CW-pob'], owned)); // only one copy
  assert.ok(checkOffer(w, ['EZ-KZ-pob', 'FL-CW-album'], owned)); // common isn't epic
  assert.ok(checkOffer(w, ['EZ-KZ-pob', 'FAKE-1'], owned));
  assert.ok(checkOffer(w, ['EZ-KZ-pob', 'constructor'], { constructor: 9 }));
  assert.ok(checkOffer(w, 'EZ-KZ-pob', owned));
});

test('inBinder is true only for cards the player holds', () => {
  assert.ok(inBinder({ 'EZ-KZ-pob': 1 }, 'EZ-KZ-pob'));
  assert.ok(!inBinder({ 'EZ-KZ-pob': 0 }, 'EZ-KZ-pob'));
  assert.ok(!inBinder({}, 'EZ-KZ-pob'));
});

test('describeWant reads like the criteria', () => {
  assert.equal(describeWant(want({})), '1 card: Any rarity');
  assert.equal(
    describeWant(want({ group: 'LS', eras: ['EZ'], members: ['KZ', 'SK'], rarities: ['epic', 'legendary'], foils: ['cosmos', 'shards'], count: 2 })),
    '2 cards: Epic or Legendary · LE SSERAFIM · EASY · Sakura or Kazuha · Shards or Cosmos foil'
  );
});
