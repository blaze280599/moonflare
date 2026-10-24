// Card catalog: real groups only, 21 cards per era.
// Every card shows a photo listed in lib/photos/ (see scripts/fetch-lesserafim.mjs).

import { LESSERAFIM_PHOTOS } from './photos/lesserafim.js';

const LESSERAFIM_MEMBERS = [
  { code: 'CW', name: 'Chaewon', kr: '채원', color: '#F2A7C3' },
  { code: 'SK', name: 'Sakura', kr: '사쿠라', color: '#FF8FB1' },
  { code: 'YJ', name: 'Yunjin', kr: '윤진', color: '#9CC3FF' },
  { code: 'KZ', name: 'Kazuha', kr: '카즈하', color: '#C9B6FF' },
  { code: 'EC', name: 'Eunchae', kr: '은채', color: '#FFD37A' }
];

// `slug` is the group's page URL (/groups/<slug>). Unlike `code`, it isn't a save key.
export const GROUPS = [
  {
    code: 'LS',
    slug: 'le-sserafim',
    name: 'LE SSERAFIM',
    blurb: 'Every comeback from FEARLESS to PUREFLOW, with real concept photos.',
    members: LESSERAFIM_MEMBERS,
    photos: LESSERAFIM_PHOTOS
  }
];
export const GROUP_BY_SLUG = Object.fromEntries(GROUPS.map(g => [g.slug, g]));
const [LESSERAFIM] = GROUPS;

// Albums in release order within each group. The era code keys its photos.
// Retired codes: MF (group), HN, YR, SJ, MR, DW (members), PM, NB, SE (eras) belonged to the made-up
// MOONFLARE group, removed in Oct 2026. Old browser saves may still hold their card ids, so don't reuse them.
export const ERAS = [
  { code: 'FL', name: 'FEARLESS', sub: '1st Mini Album · 2022', group: LESSERAFIM },
  { code: 'AF', name: 'ANTIFRAGILE', sub: '2nd Mini Album · 2022', group: LESSERAFIM },
  { code: 'UF', name: 'UNFORGIVEN', sub: '1st Studio Album · 2023', group: LESSERAFIM },
  { code: 'EZ', name: 'EASY', sub: '3rd Mini Album · 2024', group: LESSERAFIM },
  { code: 'CZ', name: 'CRAZY', sub: '4th Mini Album · 2024', group: LESSERAFIM },
  { code: 'HT', name: 'HOT', sub: '5th Mini Album · 2025', group: LESSERAFIM },
  { code: 'PF', name: 'PUREFLOW Pt.1', sub: '2nd Studio Album · 2026', group: LESSERAFIM },
  // Comeback events are limited-time albums, open only between `starts` and `ends` (see lib/events.js):
  // an era with `event: { starts, ends, blurb }`. Their codes are save keys like any era's, so an ended
  // event stays here as a closed album in the binder. None is running right now.
];
for (const era of ERAS) era.cover = era.group.photos[era.code].cover;
export const EVENT_ERAS = ERAS.filter(e => e.event);

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
  const photos = era.group.photos[era.code].cards;
  let n = 1;
  VARIANTS.forEach((v, vi) => {
    era.group.members.forEach((member, mi) => {
      CARDS.push({
        id: `${era.code}-${member.code}-${v.key}`,
        era,
        member,
        mi,
        variant: v.key,
        label: v.label,
        rarity: v.rarity,
        num: `${era.code}-${String(n++).padStart(2, '0')}`,
        photo: photos[member.code][vi]
      });
    });
  });
  CARDS.push({
    id: `${era.code}-GRP`,
    era,
    member: null,
    mi: -1,
    variant: 'group',
    label: 'Group special',
    rarity: 'mythic',
    num: `${era.code}-${String(n).padStart(2, '0')}`,
    photo: photos.GRP[0]
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
