import { CARDS, CARD_BY_ID, ERAS, GROUPS, RARITY } from './cards.js';

// Player profiles: bio, favourites, banner, showcase, plus stats and badges derived from the save.
// Pure helpers shared by the Server Actions, the server-side profile read and the editor. The server trusts
// nothing the browser sends: every field goes through sanitizeProfile / sanitizeShowcase before it's written.

export const MAX_SHOWCASE = 9;
export const MAX_BIO = 160;
// Avatars are cropped and downscaled in the browser (AVATAR_SIZE square), then checked again on the server.
export const AVATAR_SIZE = 256;
export const MAX_AVATAR_BYTES = 200 * 1024;
// How many of the favourite member's cards the bias wall shows.
export const BIAS_WALL = 6;

// Preset banners. Ids are stored in profiles.banner, so never rename or remove one; add new ones instead.
// Their look (theme-token gradients) lives in lib/profile-styles.js.
export const BANNERS = [
  { id: 'moonrise', label: 'Moonrise' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'gold', label: 'Lucky gold' },
  { id: 'lightstick', label: 'Lightstick' },
  { id: 'midnight', label: 'Midnight' }
];
const BANNER_IDS = new Set(BANNERS.map(b => b.id));
export const DEFAULT_BANNER = 'preset:moonrise';

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (owned, id) => (owned?.[id] || 0) > 0;
const known = id => typeof id === 'string' && Object.hasOwn(CARD_BY_ID, id);

// One line of text: control characters and line breaks become spaces, runs of spaces collapse, and it's cut to
// MAX_BIO characters (by code point, so an emoji is never split in half).
export function sanitizeBio(raw) {
  if (typeof raw !== 'string') return '';
  const flat = raw.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim();
  return [...flat].slice(0, MAX_BIO).join('').trim();
}

// Favourite group and member: a group code from GROUPS and one of its member codes. A member needs its group;
// anything unknown is dropped.
export function sanitizeFavourites(groupCode, memberCode) {
  const group = GROUPS.find(g => g.code === groupCode);
  if (!group) return { favGroup: null, favMember: null };
  const member = group.members.find(m => m.code === memberCode);
  return { favGroup: group.code, favMember: member ? member.code : null };
}

// A banner is 'preset:<id>', 'card:<card id>' (a card the player owns) or 'album:<era code>' (an album they
// own a card from, so an upcoming event's cover can't be used before anyone has pulled it).
// Returns the cleaned value, or null if it can't be used.
export function sanitizeBanner(raw, owned) {
  if (typeof raw !== 'string' || raw.length > 40) return null;
  const [kind, id] = raw.split(':');
  if (kind === 'preset') return BANNER_IDS.has(id) ? raw : null;
  if (kind === 'card') return known(id) && has(owned, id) ? raw : null;
  if (kind === 'album') return ERAS.some(e => e.code === id) && ownsFromAlbum(owned, id) ? raw : null;
  return null;
}

const ownsFromAlbum = (owned, eraCode) => CARDS.some(c => c.era.code === eraCode && has(owned, c.id));

// The banner to draw: what's stored if the player still qualifies for it, otherwise the default preset.
// Returns { kind: 'preset' | 'card' | 'album', id }.
export function bannerFor(stored, owned) {
  const value = sanitizeBanner(stored, owned) || DEFAULT_BANNER;
  const [kind, id] = value.split(':');
  return { kind, id };
}

// Showcase ids from the browser: known cards the player owns, no repeats, at most MAX_SHOWCASE, order kept.
export function sanitizeShowcase(raw, owned) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const id of raw.slice(0, MAX_SHOWCASE * 4)) {
    if (out.length >= MAX_SHOWCASE) break;
    if (known(id) && has(owned, id) && !out.includes(id)) out.push(id);
  }
  return out;
}

// The showcase to draw. Cards the player no longer owns (traded away, in escrow, reset) are hidden but stay
// stored, so they come back if the card does. Same idea as toploaderFor in lib/deco.js.
export const showcaseFor = (stored, owned) => (Array.isArray(stored) ? stored : []).filter(id => known(id) && has(owned, id)).slice(0, MAX_SHOWCASE);

// Everything the profile editor can change in one go, cleaned against the player's save.
export function sanitizeProfile(raw, owned) {
  const src = isObject(raw) ? raw : {};
  return {
    bio: sanitizeBio(src.bio),
    ...sanitizeFavourites(src.favGroup, src.favMember),
    banner: sanitizeBanner(src.banner, owned) || DEFAULT_BANNER
  };
}

// Rarest first, then newest album first (later in ERAS), then catalog order.
const ERA_INDEX = Object.fromEntries(ERAS.map((e, i) => [e.code, i]));
const byRarity = (a, b) => RARITY[b.rarity].rank - RARITY[a.rarity].rank || ERA_INDEX[b.era.code] - ERA_INDEX[a.era.code];

// Collection numbers for the stats card. `trades` is how many trades the player has completed.
export function profileStats(owned, packs = 0, trades = 0) {
  const mine = CARDS.filter(c => has(owned, c.id));
  const copies = mine.reduce((n, c) => n + owned[c.id], 0);
  const albumsDone = ERAS.filter(e => CARDS.every(c => c.era !== e || has(owned, c.id))).length;
  const rarest = [...mine].sort(byRarity)[0];
  return {
    cards: mine.length,
    copies,
    albumsDone,
    mythics: mine.filter(c => c.rarity === 'mythic').length,
    legendaries: mine.filter(c => c.rarity === 'legendary').length,
    events: mine.filter(c => c.era.event).length,
    rarest: rarest?.id || null,
    packs,
    trades
  };
}

// Badges are worked out from the save every time, never stored, so they can't be granted by hand and they
// follow a Reset. Ids are only React keys, but keep them stable anyway.
export const BADGES = [
  { id: 'first-album', label: 'First rip', description: 'Opened a first album.', earned: s => s.packs >= 1 },
  { id: 'lucky-draw', label: 'Lucky draw', description: 'Pulled a lucky draw card.', earned: s => s.legendaries >= 1 },
  { id: 'mythic', label: 'Misprint hunter', description: 'Pulled a Mythic group special.', earned: s => s.mythics >= 1 },
  { id: 'album-done', label: 'Full set', description: 'Completed an album.', earned: s => s.albumsDone >= 1 },
  { id: 'collector', label: 'Collector', description: 'Owns 100 different cards.', earned: s => s.cards >= 100 },
  { id: 'regular', label: 'Regular', description: 'Opened 50 albums.', earned: s => s.packs >= 50 },
  { id: 'event', label: 'Encore', description: 'Owns an event-exclusive card.', earned: s => s.events >= 1 },
  { id: 'trader', label: 'Trader', description: 'Completed a trade.', earned: s => s.trades >= 1 },
  { id: 'bias-wrecked', label: 'Bias wrecked', description: 'Owns 10 cards of their favourite member.', earned: (s, wall) => wall.count >= 10 }
];

export const badgesFor = (stats, wall = { count: 0 }) => BADGES.filter(b => b.earned(stats, wall)).map(b => b.id);

// The bias wall: the favourite member's owned cards, rarest first. `count` is how many they own of `total`.
export function biasWall(owned, favGroup, favMember) {
  const cards = CARDS.filter(c => c.era.group.code === favGroup && c.member?.code === favMember);
  const mine = cards.filter(c => has(owned, c.id)).sort(byRarity);
  return { ids: mine.slice(0, BIAS_WALL).map(c => c.id), count: mine.length, total: cards.length };
}

// What a profile page shows, built on the server from the profile row and the owner's save. Other players'
// saves never reach the browser: only these derived numbers and the showcased cards (with their toploaders).
// `avatarUrl` is added by the caller, which signs the storage path.
export function buildProfileView(row, state, trades = 0) {
  const owned = state.owned || {};
  const { favGroup, favMember } = sanitizeFavourites(row.fav_group, row.fav_member);
  const stats = profileStats(owned, state.packs, trades);
  const wall = favMember ? biasWall(owned, favGroup, favMember) : null;
  const showcase = showcaseFor(row.showcase, owned).map(id => ({ id, deco: state.deco?.[id] || null }));
  return {
    username: row.username,
    joined: row.created_at,
    bio: sanitizeBio(row.bio),
    favGroup,
    favMember,
    banner: bannerFor(row.banner, owned),
    // The stored value, so the editor starts from it (bannerFor may have fallen back to the default).
    bannerValue: sanitizeBanner(row.banner, owned) || DEFAULT_BANNER,
    showcase,
    stats,
    badges: badgesFor(stats, wall ?? undefined),
    wall
  };
}

// Up to two letters for the fallback avatar: "moon_child" → "MC", "zack" → "ZA".
export function initials(username) {
  const parts = String(username || '').split(/[_\s]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

// The image type of an uploaded avatar from its first bytes (not the browser's claimed type):
// 'image/webp', 'image/jpeg', or null for anything else, including files over MAX_AVATAR_BYTES.
export function avatarType(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 12 || bytes.length > MAX_AVATAR_BYTES) return null;
  const ascii = (from, to) => String.fromCharCode(...bytes.subarray(from, to));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}
