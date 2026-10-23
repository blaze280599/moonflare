// Card catalog: one fictional group, two eras, 21 cards per era.

export const MEMBERS = [
  { code: 'HN', name: 'Haneul', kr: '하늘', color: '#FF5FA2', hair: 'long', msg: '오늘도 고마워' },
  { code: 'YR', name: 'Yuri', kr: '유리', color: '#5CC8FF', hair: 'bob', msg: '보고 싶었어' },
  { code: 'SJ', name: 'Seojin', kr: '서진', color: '#B98CFF', hair: 'short', msg: '항상 응원해' },
  { code: 'MR', name: 'Mira', kr: '미라', color: '#FFC24B', hair: 'pony', msg: '우리 또 만나' },
  { code: 'DW', name: 'Dawon', kr: '다원', color: '#5EE6B0', hair: 'wavy', msg: '사랑해 ♡' }
];

export const ERAS = [
  { code: 'PM', name: 'Paper Moon', sub: '1st Mini Album' },
  { code: 'NB', name: 'Neon Bloom', sub: '2nd Mini Album' }
];

const VARIANTS = [
  { key: 'album', rarity: 'common', label: 'Album PC' },
  { key: 'selfie', rarity: 'rare', label: 'Selfie PC' },
  { key: 'pob', rarity: 'epic', label: 'POB' },
  { key: 'lucky', rarity: 'legendary', label: 'Lucky draw' }
];

// Duplicate refunds are kept low on purpose: an album of all duplicates returns about half its
// cost (~49 ★ of 100), so a finished collection doesn't turn into free albums forever.
// tests/gacha.test.js checks this.
export const RARITY = {
  common: { label: 'Common', refund: 5, rank: 0 },
  rare: { label: 'Rare', refund: 10, rank: 1 },
  epic: { label: 'Epic', refund: 20, rank: 2 },
  legendary: { label: 'Legendary', refund: 40, rank: 3 },
  mythic: { label: 'Mythic', refund: 100, rank: 4 }
};

export const CARDS = [];
for (const era of ERAS) {
  let n = 1;
  for (const v of VARIANTS) {
    MEMBERS.forEach((member, mi) => {
      CARDS.push({
        id: `${era.code}-${member.code}-${v.key}`,
        era,
        member,
        mi,
        variant: v.key,
        label: v.label,
        rarity: v.rarity,
        num: `${era.code}-${String(n++).padStart(2, '0')}`
      });
    });
  }
  CARDS.push({
    id: `${era.code}-GRP`,
    era,
    member: null,
    mi: -1,
    variant: 'group',
    label: 'Group special',
    rarity: 'mythic',
    num: `${era.code}-${String(n).padStart(2, '0')}`
  });
}

export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

export const HOLO_PRESETS = ['bursts', 'stars', 'shards', 'cosmos', 'rainbow', 'swirl', 'glitter', 'gold'];
const EPIC_FOILS = ['shards', 'swirl', 'rainbow', 'shards', 'swirl'];
const LEGEND_FOILS = ['stars', 'cosmos', 'bursts', 'stars', 'cosmos'];

// HoloCard props for each rarity. Common cards get no foil, only a glossy glare.
export function foilFor(card) {
  switch (card.rarity) {
    case 'common':
      return { preset: 'rainbow', intensity: 0, edgeSparkle: 0, glare: 0.35, frame: 0, foilColor: '#e2e6ec' };
    case 'rare':
      return { preset: 'glitter', intensity: 0.45, edgeSparkle: 0.35, glare: 0.45, frame: 3, foilColor: '#e2e6ec' };
    case 'epic':
      return { preset: EPIC_FOILS[card.mi], intensity: 0.8, edgeSparkle: 0.7, glare: 0.5, frame: 4, foilColor: '#e2e6ec' };
    case 'legendary':
      return { preset: LEGEND_FOILS[card.mi], intensity: 0.9, edgeSparkle: 0.9, glare: 0.55, frame: 4, foilColor: '#f3e3b0' };
    default:
      return { preset: 'gold', intensity: 1, edgeSparkle: 1, glare: 0.6, frame: 5, foilColor: '#ffd27a' };
  }
}
