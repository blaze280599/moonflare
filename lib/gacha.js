import { CARDS, RARITY } from './cards.js';

export const PACK_COST = 100;
export const PITY_AT = 15;
export const DAILY_STARS = 300;

// `bias` maps a group code to the member code the player picked, like { LS: 'KZ' }.
// `deco` holds toploader decorations (lib/deco.js), so Reset clears them along with the cards.
export const NEW_GAME = { coins: 500, owned: {}, packs: 0, pity: 0, lastDaily: '', bias: {}, deco: {} };

// Pick your bias: when a card goes to a member, it goes to the player's bias this many percentage points more
// often (20% → 22% in a five-member group), taken evenly from the other members. It only picks *which member*
// gets a card, never its rarity, so pity, refunds and the economy are untouched. Promised to stay 1–2 points.
export const BIAS_BOOST = 2;

// Chance per card, in percent. The odds tables in PackInfo.jsx and Landing.jsx render straight from this list.
export const RATES = [
  { rarity: 'common', pct: 62 },
  { rarity: 'rare', pct: 25 },
  { rarity: 'epic', pct: 9 },
  { rarity: 'legendary', pct: 3.6 },
  { rarity: 'mythic', pct: 0.4 }
];

function rollRarity(rng) {
  let r = rng() * 100;
  for (const { rarity, pct } of RATES) {
    if (r < pct) return rarity;
    r -= pct;
  }
  return RATES[0].rarity;
}

// Chance (0–1) that a card goes to the bias, among `count` cards of one rarity that include theirs.
export function biasShare(count) {
  return count < 2 ? 1 : 1 / count + BIAS_BOOST / 100;
}

// Picks one card from same-rarity `options`, boosting the one belonging to member code `bias` (if any).
// Uses a single rng() call either way, so rolls without a bias are the same as before the feature.
export function pickCard(options, bias, rng) {
  const u = rng();
  const i = bias ? options.findIndex(c => c.member?.code === bias) : -1;
  if (i < 0 || options.length < 2) return options[Math.floor(u * options.length)];
  const share = biasShare(options.length);
  if (u < share) return options[i];
  const rest = options.filter((_, j) => j !== i);
  return rest[Math.floor(((u - share) / (1 - share)) * rest.length)];
}

// Per-card chance, in percent, that a card from one of `era`'s albums belongs to each member, given the
// player's bias code (or none). PackInfo.jsx renders this, so the table always matches pickCard().
export function memberRates(era, bias) {
  const pool = CARDS.filter(c => c.era.code === era.code);
  return era.group.members.map(member => {
    let pct = 0;
    for (const r of RATES) {
      const options = pool.filter(c => c.rarity === r.rarity);
      if (!options.some(c => c.member === member)) continue;
      const hasBias = Boolean(bias) && options.some(c => c.member?.code === bias);
      const n = options.length;
      const share = !hasBias ? 1 / n : member.code === bias ? biasShare(n) : (1 - biasShare(n)) / (n - 1);
      pct += r.pct * share;
    }
    return { member, pct, isBias: member.code === bias };
  });
}

// Opens one album. Returns the next game state and the five pulls in deal order.
// Card 5 is always Rare or better; a lucky draw is forced on the PITY_AT-th album without one.
// The player's bias for this group (state.bias) gets the small BIAS_BOOST when the card is picked.
// `rng` is injectable so tests can force outcomes.
export function rollPack(state, era, rng = Math.random) {
  const pool = CARDS.filter(c => c.era.code === era.code);
  const bias = state.bias?.[era.group.code];
  const rarities = Array.from({ length: 5 }, () => rollRarity(rng));
  if (RARITY[rarities[4]].rank < 1) rarities[4] = 'rare';
  const hit = () => rarities.some(r => RARITY[r].rank >= 3);
  if (!hit() && state.pity + 1 >= PITY_AT) rarities[4] = 'legendary';

  const owned = { ...state.owned };
  let coins = state.coins - PACK_COST;
  const pulls = rarities.map(r => {
    const card = pickCard(pool.filter(c => c.rarity === r), bias, rng);
    const isNew = !owned[card.id];
    owned[card.id] = (owned[card.id] || 0) + 1;
    const refund = isNew ? 0 : RARITY[r].refund;
    coins += refund;
    return { card, isNew, refund };
  });

  return {
    state: { ...state, coins, owned, packs: state.packs + 1, pity: hit() ? 0 : state.pity + 1 },
    pulls
  };
}
