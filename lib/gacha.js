import { CARDS, RARITY } from './cards.js';

export const PACK_COST = 100;
export const PITY_AT = 15;
export const DAILY_STARS = 300;

export const NEW_GAME = { coins: 500, owned: {}, packs: 0, pity: 0, lastDaily: '' };

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

// Opens one album. Returns the next game state and the five pulls in deal order.
// Card 5 is always Rare or better; a lucky draw is forced on the PITY_AT-th album without one.
// `rng` is injectable so tests can force outcomes.
export function rollPack(state, era, rng = Math.random) {
  const pool = CARDS.filter(c => c.era.code === era.code);
  const rarities = Array.from({ length: 5 }, () => rollRarity(rng));
  if (RARITY[rarities[4]].rank < 1) rarities[4] = 'rare';
  const hit = () => rarities.some(r => RARITY[r].rank >= 3);
  if (!hit() && state.pity + 1 >= PITY_AT) rarities[4] = 'legendary';

  const owned = { ...state.owned };
  let coins = state.coins - PACK_COST;
  const pulls = rarities.map(r => {
    const options = pool.filter(c => c.rarity === r);
    const card = options[Math.floor(rng() * options.length)];
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
