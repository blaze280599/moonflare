import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, ERAS } from '../lib/cards.js';
import { NEW_GAME } from '../lib/gacha.js';
import {
  BADGES,
  BANNERS,
  DEFAULT_BANNER,
  MAX_AVATAR_BYTES,
  MAX_BIO,
  MAX_SHOWCASE,
  avatarType,
  badgesFor,
  bannerFor,
  biasWall,
  buildProfileView,
  initials,
  profileStats,
  sanitizeBanner,
  sanitizeBio,
  sanitizeFavourites,
  sanitizeProfile,
  sanitizeShowcase,
  showcaseFor
} from '../lib/profile.js';

const owning = (...ids) => Object.fromEntries(ids.map(id => [id, 1]));
const ids = CARDS.slice(0, 12).map(c => c.id);
const [a, b, c] = ids;

test('banner preset ids are unique and the default is one of them', () => {
  assert.equal(new Set(BANNERS.map(x => x.id)).size, BANNERS.length);
  assert.equal(sanitizeBanner(DEFAULT_BANNER, {}), DEFAULT_BANNER);
  assert.equal(new Set(BADGES.map(x => x.id)).size, BADGES.length);
});

test('sanitizeBio flattens to one line, strips control characters and caps length', () => {
  assert.equal(sanitizeBio('  hi\n\nthere\t\u0007 you  '), 'hi there you');
  assert.equal(sanitizeBio(42), '');
  assert.equal([...sanitizeBio('x'.repeat(500))].length, MAX_BIO);
  // An emoji at the cut point is kept whole or dropped, never split.
  const emoji = sanitizeBio('a'.repeat(MAX_BIO - 1) + '💖💖');
  assert.equal([...emoji].length, MAX_BIO);
  assert.ok(emoji.endsWith('💖'));
});

test('sanitizeFavourites keeps real codes and needs the group for a member', () => {
  assert.deepEqual(sanitizeFavourites('LS', 'KZ'), { favGroup: 'LS', favMember: 'KZ' });
  assert.deepEqual(sanitizeFavourites('LS', 'HN'), { favGroup: 'LS', favMember: null });
  assert.deepEqual(sanitizeFavourites(null, 'KZ'), { favGroup: null, favMember: null });
  assert.deepEqual(sanitizeFavourites('XX', 'KZ'), { favGroup: null, favMember: null });
});

test('sanitizeBanner allows presets, owned cards and albums the player has a card from', () => {
  const owned = owning('FL-KZ-pob');
  assert.equal(sanitizeBanner('preset:aurora', owned), 'preset:aurora');
  assert.equal(sanitizeBanner('preset:nope', owned), null);
  assert.equal(sanitizeBanner('card:FL-KZ-pob', owned), 'card:FL-KZ-pob');
  assert.equal(sanitizeBanner('card:FL-CW-pob', owned), null);
  assert.equal(sanitizeBanner('card:not-a-card', owned), null);
  assert.equal(sanitizeBanner('album:FL', owned), 'album:FL');
  assert.equal(sanitizeBanner('album:AF', owned), null);
  assert.equal(sanitizeBanner('album:ZZ', owned), null);
  assert.equal(sanitizeBanner({ kind: 'preset' }, owned), null);
  assert.equal(sanitizeBanner('x'.repeat(100), owned), null);
});

test('bannerFor falls back to the default once the card is gone', () => {
  assert.deepEqual(bannerFor('card:FL-KZ-pob', owning('FL-KZ-pob')), { kind: 'card', id: 'FL-KZ-pob' });
  assert.deepEqual(bannerFor('card:FL-KZ-pob', {}), { kind: 'preset', id: 'moonrise' });
  assert.deepEqual(bannerFor(null, {}), { kind: 'preset', id: 'moonrise' });
});

test('sanitizeShowcase keeps owned, known, unique ids in order, capped', () => {
  const owned = owning(...ids);
  assert.deepEqual(sanitizeShowcase([c, a, a, 'nope', b], owned), [c, a, b]);
  assert.deepEqual(sanitizeShowcase([a, b], owning(b)), [b]);
  assert.equal(sanitizeShowcase(ids, owned).length, MAX_SHOWCASE);
  assert.deepEqual(sanitizeShowcase('FL-KZ-pob', owned), []);
  assert.deepEqual(sanitizeShowcase([{ id: a }, 7, null], owned), []);
  // A card whose count dropped to 0 (traded away) isn't owned.
  assert.deepEqual(sanitizeShowcase([a], { [a]: 0 }), []);
});

test('showcaseFor hides cards that are no longer owned without dropping them', () => {
  const stored = [a, b, c];
  assert.deepEqual(showcaseFor(stored, owning(a, c)), [a, c]);
  assert.deepEqual(showcaseFor(stored, {}), []);
  assert.deepEqual(showcaseFor(null, owning(a)), []);
  assert.deepEqual(showcaseFor([...stored, 'gone-id'], owning(a, b, c)), stored);
});

test('sanitizeProfile cleans every field against the save', () => {
  const p = sanitizeProfile({ bio: ' hey\n', favGroup: 'MF', favMember: 'YR', banner: 'card:FL-KZ-pob', extra: 1 }, {});
  assert.deepEqual(p, { bio: 'hey', favGroup: 'MF', favMember: 'YR', banner: DEFAULT_BANNER });
  assert.deepEqual(sanitizeProfile(null, {}), { bio: '', favGroup: null, favMember: null, banner: DEFAULT_BANNER });
});

test('profileStats counts cards, copies, completed albums and the rarest card', () => {
  const era = ERAS.find(e => e.code === 'PM');
  const full = Object.fromEntries(CARDS.filter(x => x.era === era).map(x => [x.id, 2]));
  const s = profileStats({ ...full, 'FL-KZ-album': 1 }, 12, 3);
  assert.equal(s.cards, 22);
  assert.equal(s.copies, 43);
  assert.equal(s.albumsDone, 1);
  assert.equal(s.mythics, 1);
  assert.equal(s.legendaries, 5);
  assert.equal(s.rarest, 'PM-GRP');
  assert.equal(s.packs, 12);
  assert.equal(s.trades, 3);
  assert.equal(profileStats({}).rarest, null);
  assert.equal(profileStats({}).albumsDone, 0);
});

test('badges follow the stats', () => {
  assert.deepEqual(badgesFor(profileStats({})), []);
  const s = profileStats(owning('PM-GRP', 'SE-HN-album'), 1, 1);
  assert.deepEqual(badgesFor(s), ['first-album', 'mythic', 'event', 'trader']);
  assert.ok(badgesFor(s, { count: 10 }).includes('bias-wrecked'));
});

test('biasWall lists the favourite member’s cards rarest first', () => {
  const wall = biasWall(owning('FL-KZ-album', 'AF-KZ-lucky', 'FL-CW-pob', 'FL-KZ-selfie'), 'LS', 'KZ');
  assert.deepEqual(wall.ids, ['AF-KZ-lucky', 'FL-KZ-selfie', 'FL-KZ-album']);
  assert.equal(wall.count, 3);
  assert.equal(wall.total, CARDS.filter(x => x.era.group.code === 'LS' && x.member?.code === 'KZ').length);
});

test('buildProfileView sends derived data and hides unowned showcase cards', () => {
  const state = { ...NEW_GAME, owned: owning(a, c), packs: 2, deco: { [a]: { t: 'pink', s: [] }, [b]: { t: 'mint', s: [] } } };
  const row = { username: 'moon', created_at: '2026-10-24T00:00:00Z', bio: 'hi', fav_group: 'MF', fav_member: 'HN', showcase: [a, b, c], banner: 'card:' + b };
  const view = buildProfileView(row, state, 0);
  assert.deepEqual(view.showcase, [{ id: a, deco: { t: 'pink', s: [] } }, { id: c, deco: null }]);
  assert.deepEqual(view.banner, { kind: 'preset', id: 'moonrise' });
  assert.equal(view.bannerValue, DEFAULT_BANNER);
  assert.equal(view.stats.cards, 2);
  assert.ok(view.badges.includes('first-album'));
  assert.equal(view.wall.total, CARDS.filter(x => x.era.group.code === 'MF' && x.member?.code === 'HN').length);
  assert.equal('owned' in view, false);
  assert.equal(buildProfileView({ ...row, fav_member: null }, state).wall, null);
});

test('initials', () => {
  assert.equal(initials('moon_child'), 'MC');
  assert.equal(initials('zack'), 'ZA');
  assert.equal(initials(''), '?');
});

test('avatarType reads magic bytes and enforces the size cap', () => {
  const webp = new Uint8Array(64);
  webp.set([...'RIFF'].map(ch => ch.charCodeAt(0)), 0);
  webp.set([...'WEBP'].map(ch => ch.charCodeAt(0)), 8);
  assert.equal(avatarType(webp), 'image/webp');
  const jpeg = new Uint8Array(64);
  jpeg.set([0xff, 0xd8, 0xff, 0xe0]);
  assert.equal(avatarType(jpeg), 'image/jpeg');
  const png = new Uint8Array(64);
  png.set([0x89, 0x50, 0x4e, 0x47]);
  assert.equal(avatarType(png), null);
  assert.equal(avatarType(new Uint8Array(4)), null);
  const huge = new Uint8Array(MAX_AVATAR_BYTES + 1);
  huge.set([0xff, 0xd8, 0xff]);
  assert.equal(avatarType(huge), null);
  assert.equal(avatarType('RIFF....WEBP'), null);
});
