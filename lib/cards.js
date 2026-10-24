// Card catalog: real groups only, four cards per member plus a group special in every era.
// Every card shows a photo listed in lib/photos/ (see scripts/fetch-photos.mjs).

import { AESPA_PHOTOS } from './photos/aespa.js';
import { ITZY_PHOTOS } from './photos/itzy.js';
import { IVE_PHOTOS } from './photos/ive.js';
import { LESSERAFIM_PHOTOS } from './photos/lesserafim.js';
import { NEWJEANS_PHOTOS } from './photos/newjeans.js';

const LESSERAFIM_MEMBERS = [
  { code: 'CW', name: 'Chaewon', kr: '채원', color: '#F2A7C3' },
  { code: 'SK', name: 'Sakura', kr: '사쿠라', color: '#FF8FB1' },
  { code: 'YJ', name: 'Yunjin', kr: '윤진', color: '#9CC3FF' },
  { code: 'KZ', name: 'Kazuha', kr: '카즈하', color: '#C9B6FF' },
  { code: 'EC', name: 'Eunchae', kr: '은채', color: '#FFD37A' }
];

const AESPA_MEMBERS = [
  { code: 'KR', name: 'Karina', kr: '카리나', color: '#8FB8FF' },
  { code: 'GS', name: 'Giselle', kr: '지젤', color: '#FF9ECF' },
  { code: 'WT', name: 'Winter', kr: '윈터', color: '#A8E6F0' },
  { code: 'NN', name: 'Ningning', kr: '닝닝', color: '#C7A6FF' }
];

// Hanni is HA because HN is a retired MOONFLARE code.
const NEWJEANS_MEMBERS = [
  { code: 'MJ', name: 'Minji', kr: '민지', color: '#7FB2FF' },
  { code: 'HA', name: 'Hanni', kr: '하니', color: '#FFB3C7' },
  { code: 'DN', name: 'Danielle', kr: '다니엘', color: '#FFD98A' },
  { code: 'HR', name: 'Haerin', kr: '해린', color: '#B9E4A8' },
  { code: 'HY', name: 'Hyein', kr: '혜인', color: '#D6B8FF' }
];

// Yujin is YU because YJ is LE SSERAFIM's Yunjin.
const IVE_MEMBERS = [
  { code: 'YU', name: 'Yujin', kr: '유진', color: '#FF9AA8' },
  { code: 'GA', name: 'Gaeul', kr: '가을', color: '#8FC1FF' },
  { code: 'RE', name: 'Rei', kr: '레이', color: '#A8E07F' },
  { code: 'WY', name: 'Wonyoung', kr: '원영', color: '#FF7FB6' },
  { code: 'LZ', name: 'Liz', kr: '리즈', color: '#9FE3E8' },
  { code: 'LO', name: 'Leeseo', kr: '이서', color: '#FFD27F' }
];

const ITZY_MEMBERS = [
  { code: 'YE', name: 'Yeji', kr: '예지', color: '#FF8F8F' },
  { code: 'LI', name: 'Lia', kr: '리아', color: '#9FD3FF' },
  { code: 'RJ', name: 'Ryujin', kr: '류진', color: '#B7A6FF' },
  { code: 'CR', name: 'Chaeryeong', kr: '채령', color: '#FFC98F' },
  { code: 'YN', name: 'Yuna', kr: '유나', color: '#F7A8E0' }
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
  },
  {
    code: 'AE',
    slug: 'aespa',
    name: 'aespa',
    blurb: 'From SAVAGE to LEMONADE: every Korean mini and studio album, with real concept photos.',
    members: AESPA_MEMBERS,
    photos: AESPA_PHOTOS
  },
  {
    code: 'NJ',
    slug: 'newjeans',
    name: 'NewJeans',
    blurb: 'Both EPs and both single albums, from New Jeans to How Sweet, with real concept photos.',
    members: NEWJEANS_MEMBERS,
    photos: NEWJEANS_PHOTOS
  },
  {
    code: 'IV',
    slug: 'ive',
    name: 'IVE',
    blurb: "From I've IVE to REVIVE+: every Korean EP and studio album, with real concept photos.",
    members: IVE_MEMBERS,
    photos: IVE_PHOTOS
  },
  {
    code: 'IT',
    slug: 'itzy',
    name: 'ITZY',
    blurb: 'From CRAZY IN LOVE to MOTTO: six comebacks, with real concept photos.',
    members: ITZY_MEMBERS,
    photos: ITZY_PHOTOS
  }
];
export const GROUP_BY_SLUG = Object.fromEntries(GROUPS.map(g => [g.slug, g]));
const [LESSERAFIM, AESPA, NEWJEANS, IVE, ITZY] = GROUPS;

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
  { code: 'SV', name: 'SAVAGE', sub: '1st Mini Album · 2021', group: AESPA },
  { code: 'GR', name: 'GIRLS', sub: '2nd Mini Album · 2022', group: AESPA },
  { code: 'MW', name: 'MY WORLD', sub: '3rd Mini Album · 2023', group: AESPA },
  { code: 'DR', name: 'DRAMA', sub: '4th Mini Album · 2023', group: AESPA },
  { code: 'AG', name: 'ARMAGEDDON', sub: '1st Studio Album · 2024', group: AESPA },
  { code: 'WL', name: 'WHIPLASH', sub: '5th Mini Album · 2024', group: AESPA },
  { code: 'RM', name: 'RICH MAN', sub: '6th Mini Album · 2025', group: AESPA },
  { code: 'LM', name: 'LEMONADE', sub: '2nd Studio Album · 2026', group: AESPA },
  { code: 'NE', name: 'New Jeans', sub: '1st EP · 2022', group: NEWJEANS },
  { code: 'OM', name: 'OMG', sub: '1st Single Album · 2023', group: NEWJEANS },
  { code: 'GU', name: 'Get Up', sub: '2nd EP · 2023', group: NEWJEANS },
  { code: 'HS', name: 'How Sweet', sub: '2nd Single Album · 2024', group: NEWJEANS },
  { code: 'II', name: "I've IVE", sub: '1st Studio Album · 2023', group: IVE },
  { code: 'IM', name: "I've Mine", sub: '1st EP · 2023', group: IVE },
  { code: 'SW', name: 'IVE SWITCH', sub: '2nd EP · 2024', group: IVE },
  { code: 'EM', name: 'IVE EMPATHY', sub: '3rd EP · 2025', group: IVE },
  { code: 'SC', name: 'IVE SECRET', sub: '4th EP · 2025', group: IVE },
  { code: 'RV', name: 'REVIVE+', sub: '2nd Studio Album · 2026', group: IVE },
  { code: 'CL', name: 'CRAZY IN LOVE', sub: '1st Studio Album · 2021', group: ITZY },
  { code: 'KD', name: 'KILL MY DOUBT', sub: '7th Mini Album · 2023', group: ITZY },
  { code: 'GD', name: 'GOLD', sub: '9th Mini Album · 2024', group: ITZY },
  { code: 'GB', name: 'GIRLS WILL BE GIRLS', sub: '10th Mini Album · 2025', group: ITZY },
  { code: 'TV', name: 'TUNNEL VISION', sub: '11th Mini Album · 2025', group: ITZY },
  { code: 'MO', name: 'MOTTO', sub: '12th Mini Album · 2026', group: ITZY },
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
      return { preset: EPIC_FOILS[card.mi % EPIC_FOILS.length], intensity: 0.8, edgeSparkle: 0.7, glare: 0.5, frame: 4, foilColor: '#e2e6ec' };
    case 'legendary':
      return { preset: LEGEND_FOILS[card.mi % LEGEND_FOILS.length], intensity: 0.9, edgeSparkle: 0.9, glare: 0.55, frame: 4, foilColor: '#f3e3b0' };
    default:
      return { preset: 'gold', intensity: 1, edgeSparkle: 1, glare: 0.6, frame: 5, foilColor: '#ffd27a' };
  }
}
