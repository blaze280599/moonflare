import { ERAS, GROUPS } from './cards.js';
import { eventPhase } from './events.js';

// The shop: booster packs bought with stars, held in `state.inventory`, and opened later.
// Pure rules shared by the Server Actions (app/actions/game.js), the shop page and the tests.
//
// A pack kind is a save key in `saves.inventory` ({ kind: count }), so never rename one:
//   'standard'        any group, then any of its albums (every player gets these free)
//   'group:<code>'    one group, then any of its albums
//   'album:<era code>' one exact event album, sold only while its event is live
// Every album in a pack holds the same five cards, rates and pity as before; a pack only picks the album.

export const STANDARD_COST = 100;
export const GROUP_COST = 150;
export const EVENT_COST = 150;
// Packs of one kind a player can hold. Daily packs past this are lost, so the cap is generous.
export const MAX_PACKS = 99;

// Event albums are sold only as their own pack, so random packs draw from the regular albums.
const regularEras = group => ERAS.filter(e => e.group === group && !e.event);

// The pack a kind names, or null for an unknown kind. `eras` is every album it can land on.
export function packFor(kind) {
  if (kind === 'standard') {
    return { kind, type: 'standard', name: 'Standard pack', price: STANDARD_COST, eras: GROUPS.flatMap(regularEras) };
  }
  const [type, code] = typeof kind === 'string' ? kind.split(':') : [];
  if (type === 'group') {
    const group = GROUPS.find(g => g.code === code);
    return group ? { kind, type, group, name: `${group.name} pack`, price: GROUP_COST, eras: regularEras(group) } : null;
  }
  if (type === 'album') {
    const era = ERAS.find(e => e.code === code && e.event);
    return era ? { kind, type, group: era.group, era, name: `${era.name} pack`, price: EVENT_COST, eras: [era] } : null;
  }
  return null;
}

export const groupKind = group => `group:${group.code}`;

// What the shop sells at `now`: the standard pack, one per group, and each live event album.
export function shopPacks(now) {
  return [
    packFor('standard'),
    ...GROUPS.map(g => packFor(groupKind(g))),
    ...ERAS.filter(e => e.event && eventPhase(e, now) === 'live').map(e => packFor(`album:${e.code}`))
  ];
}

export const canBuy = (pack, now) => pack.type !== 'album' || eventPhase(pack.era, now) === 'live';

// Chance, in percent, of each album in a pack. A standard pack picks the group first, every group
// equally, so a group with more albums doesn't crowd out the others. pickAlbum() follows the same shares.
export function albumOdds(pack) {
  if (pack.type !== 'standard') return pack.eras.map(era => ({ era, pct: 100 / pack.eras.length }));
  const groups = GROUPS.filter(g => regularEras(g).length);
  return groups.flatMap(g => regularEras(g).map(era => ({ era, pct: 100 / groups.length / regularEras(g).length })));
}

// The album a pack opens as. One rng() call: its whole part picks the group, the rest picks the album.
export function pickAlbum(pack, rng) {
  const u = rng();
  if (pack.type !== 'standard') return pack.eras[Math.floor(u * pack.eras.length)];
  const groups = GROUPS.filter(g => regularEras(g).length);
  const x = u * groups.length;
  const eras = regularEras(groups[Math.floor(x)]);
  return eras[Math.floor((x - Math.floor(x)) * eras.length)];
}

export const packsOf = (state, kind) => state.inventory?.[kind] || 0;

// Adds `n` packs of a kind, up to MAX_PACKS.
export function givePacks(state, kind, n = 1) {
  return { ...state, inventory: { ...state.inventory, [kind]: Math.min(packsOf(state, kind) + n, MAX_PACKS) } };
}

// Buys one pack into the inventory. Returns { state } or { error }.
export function buyPack(state, pack, now) {
  if (!canBuy(pack, now)) return { error: 'event_closed' };
  if (state.coins < pack.price) return { error: 'not_enough_stars' };
  if (packsOf(state, pack.kind) >= MAX_PACKS) return { error: 'too_many_packs' };
  return { state: { ...givePacks(state, pack.kind), coins: state.coins - pack.price } };
}

// Takes one pack out of the inventory to open it. Returns { state } or { error }.
export function takePack(state, kind) {
  const n = packsOf(state, kind);
  if (n < 1) return { error: 'no_pack' };
  const inventory = { ...state.inventory };
  if (n === 1) delete inventory[kind];
  else inventory[kind] = n - 1;
  return { state: { ...state, inventory } };
}
