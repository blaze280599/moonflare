import { CARDS, RARITY } from './cards';

export const PACK_COST = 100;
export const PITY_AT = 15;
export const DAILY_STARS = 300;

export const NEW_GAME = { coins: 500, owned: {}, packs: 0, pity: 0, lastDaily: '' };

function rollRarity() {
  const r = Math.random() * 100;
  if (r < 0.4) return 'mythic';
  if (r < 4) return 'legendary';
  if (r < 13) return 'epic';
  if (r < 38) return 'rare';
  return 'common';
}

// Opens one album. Returns the next game state and the five pulls in deal order.
// Card 5 is always Rare or better; a lucky draw is forced on the PITY_AT-th album without one.
export function rollPack(state, era) {
  const pool = CARDS.filter(c => c.era.code === era.code);
  const rarities = Array.from({ length: 5 }, rollRarity);
  if (RARITY[rarities[4]].rank < 1) rarities[4] = 'rare';
  const hit = () => rarities.some(r => RARITY[r].rank >= 3);
  if (!hit() && state.pity + 1 >= PITY_AT) rarities[4] = 'legendary';

  const owned = { ...state.owned };
  let coins = state.coins - PACK_COST;
  const pulls = rarities.map(r => {
    const options = pool.filter(c => c.rarity === r);
    const card = options[Math.floor(Math.random() * options.length)];
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
