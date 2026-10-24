import { CARDS, CARD_BY_ID, ERAS, GROUPS, RARITY, foilFor } from './cards.js';

// Pure trading rules shared by the Server Actions (app/actions/trade.js) and the /trade page. No Supabase here,
// so tests can import it. The database functions in supabase/migrations/*_trading.sql do the escrow and swaps.

export const LISTING_DAYS = 7;
export const MAX_OPEN_LISTINGS = 10;
export const MAX_PENDING_OFFERS = 10;
// Cards a lister can ask for in return for one card.
export const MAX_WANT = 3;

// The foil each card prints with. It follows from the card (foilFor in lib/cards.js), so it's a criterion,
// not a separate copy. Common cards have no foil.
export const FOILS = [
  { key: 'matte', label: 'Matte' },
  { key: 'glitter', label: 'Glitter' },
  { key: 'shards', label: 'Shards' },
  { key: 'swirl', label: 'Swirl' },
  { key: 'rainbow', label: 'Rainbow' },
  { key: 'stars', label: 'Stars' },
  { key: 'cosmos', label: 'Cosmos' },
  { key: 'bursts', label: 'Bursts' },
  { key: 'gold', label: 'Gold' }
];
const FOIL_LABEL = Object.fromEntries(FOILS.map(f => [f.key, f.label]));

export const foilOf = card => (card.rarity === 'common' ? 'matte' : foilFor(card).preset);

const MEMBER_BY_CODE = Object.fromEntries(GROUPS.flatMap(g => g.members.map(m => [m.code, { ...m, group: g }])));
const ERA_BY_CODE = Object.fromEntries(ERAS.map(e => [e.code, e]));
const GROUP_BY_CODE = Object.fromEntries(GROUPS.map(g => [g.code, g]));
const RARITY_KEYS = Object.keys(RARITY);

export const NO_CRITERIA = { group: null, eras: [], members: [], rarities: [], foils: [], count: 1 };

// What a lister may ask for: lists of groups' eras, members, rarities and foils (empty means any), and how many
// matching cards. Never specific cards, so a want can't spoil a card the lister hasn't pulled.
// Returns { want } in a fixed, catalog-ordered shape, or { error } with text to show.
export function sanitizeWant(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Say what you want in return.' };
  const list = (value, known) => {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 20 || !value.every(v => typeof v === 'string' && known.includes(v))) return null;
    return known.filter(k => value.includes(k));
  };
  const group = raw.group == null || raw.group === '' ? null : GROUP_BY_CODE[raw.group] ? raw.group : undefined;
  if (group === undefined) return { error: 'That group doesn’t exist.' };
  const eras = list(raw.eras, ERAS.filter(e => !group || e.group.code === group).map(e => e.code));
  if (!eras) return { error: group ? 'Those albums aren’t all from that group.' : 'That album doesn’t exist.' };
  const members = list(raw.members, Object.keys(MEMBER_BY_CODE).filter(m => !group || MEMBER_BY_CODE[m].group.code === group));
  if (!members) return { error: group ? 'Those members aren’t all in that group.' : 'That member doesn’t exist.' };
  const rarities = list(raw.rarities, RARITY_KEYS);
  if (!rarities) return { error: 'Unknown rarity.' };
  const foils = list(raw.foils, FOILS.map(f => f.key));
  if (!foils) return { error: 'Unknown foil.' };
  const count = raw.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_WANT) return { error: `Ask for 1 to ${MAX_WANT} cards.` };
  const want = { group, eras, members, rarities, foils, count };
  if (!CARDS.some(c => matchesWant(c, want))) return { error: 'No card matches all of that. Loosen a filter.' };
  return { want };
}

export function matchesWant(card, want) {
  return (
    (!want.group || card.era.group.code === want.group) &&
    (!want.eras.length || want.eras.includes(card.era.code)) &&
    (!want.members.length || (card.member && want.members.includes(card.member.code))) &&
    (!want.rarities.length || want.rarities.includes(card.rarity)) &&
    (!want.foils.length || want.foils.includes(foilOf(card)))
  );
}

// The player's cards that fit a want, as [{ card, copies }], spares (2+ copies) first, then rarest first.
export function offerOptions(owned, want) {
  return CARDS.filter(c => owned[c.id] > 0 && matchesWant(c, want))
    .map(card => ({ card, copies: owned[card.id] }))
    .sort((a, b) => (b.copies > 1) - (a.copies > 1) || RARITY[b.card.rarity].rank - RARITY[a.card.rarity].rank);
}

// Can these copies fill a want? `ids` may repeat a card to offer several copies. Returns an error or null.
export function checkOffer(want, ids, owned) {
  if (!Array.isArray(ids) || ids.length !== want.count) return `Pick ${want.count} card${want.count === 1 ? '' : 's'}.`;
  const need = {};
  for (const id of ids) {
    if (typeof id !== 'string' || !Object.hasOwn(CARD_BY_ID, id)) return 'That card doesn’t exist.';
    if (!matchesWant(CARD_BY_ID[id], want)) return 'That card isn’t what they asked for.';
    need[id] = (need[id] || 0) + 1;
  }
  for (const [id, n] of Object.entries(need)) if ((owned[id] || 0) < n) return 'You don’t have enough copies of that card.';
  return null;
}

// The no-spoiler rule: a card's art shows on the trade board only to players who have it in their binder.
// Everyone else sees its back and the facts (group, album, member, rarity, foil) until a trade brings it home.
export const canSee = (owned, cardId) => (owned[cardId] || 0) > 0;

// "2 cards: Epic or Legendary · LE SSERAFIM · EASY · Kazuha or Sakura · Cosmos foil"
export function describeWant(want) {
  const or = items => items.join(' or ');
  const parts = [];
  parts.push(want.rarities.length ? or(want.rarities.map(r => RARITY[r].label)) : 'Any rarity');
  if (want.group) parts.push(GROUP_BY_CODE[want.group].name);
  if (want.eras.length) parts.push(or(want.eras.map(e => ERA_BY_CODE[e].name)));
  if (want.members.length) parts.push(or(want.members.map(m => MEMBER_BY_CODE[m].name)));
  if (want.foils.length) parts.push(`${or(want.foils.map(f => FOIL_LABEL[f]))} foil`);
  return `${want.count} card${want.count === 1 ? '' : 's'}: ${parts.join(' · ')}`;
}

export const foilLabel = card => FOIL_LABEL[foilOf(card)];
