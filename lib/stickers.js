// The built-in sticker set for toploader decorating, drawn as SVG in code (no image files).
// Each sticker's `id` is stored in saves.deco, so never rename or remove one; add new ones instead.
// Art lives on a 100×100 canvas, kept inside about 8–92 so the white die-cut edge fits.

const sticker = inner =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
  '<defs><filter id="d" x="-20%" y="-20%" width="140%" height="140%">' +
  '<feMorphology in="SourceAlpha" operator="dilate" radius="4" result="m"/>' +
  '<feFlood flood-color="#fff"/><feComposite in2="m" operator="in" result="e"/>' +
  '<feDropShadow in="e" dx="0" dy="1.5" stdDeviation="1.5" flood-opacity=".45" result="s"/>' +
  '<feMerge><feMergeNode in="s"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
  `<g filter="url(#d)">${inner}</g></svg>`;

const RAW = [
  {
    id: 'heart',
    label: 'Heart',
    svg: '<path d="M50 88C20 66 8 48 8 32 8 19 18 10 30 10c9 0 16 5 20 13 4-8 11-13 20-13 12 0 22 9 22 22 0 16-12 34-42 56Z" fill="#ff5c9a"/><path d="M24 24c4-4 10-5 14-2" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>'
  },
  {
    id: 'star',
    label: 'Star',
    svg: '<path d="M50 8l11.8 26.5 28.9 3-21.6 19.4 6.1 28.4L50 70.7 24.8 85.3l6.1-28.4L9.3 37.5l28.9-3Z" fill="#ffd34d" stroke="#f5a623" stroke-width="3" stroke-linejoin="round"/>'
  },
  {
    id: 'sparkle',
    label: 'Sparkle',
    svg: '<path d="M50 6c4 30 14 40 44 44-30 4-40 14-44 44-4-30-14-40-44-44 30-4 40-14 44-44Z" fill="#9fdcff"/><path d="M80 12c1.5 8 4 10.5 12 12-8 1.5-10.5 4-12 12-1.5-8-4-10.5-12-12 8-1.5 10.5-4 12-12Z" fill="#ffd1ea"/>'
  },
  {
    id: 'moon',
    label: 'Moon',
    svg: '<path d="M60 8a42 42 0 1 0 32 64A34 34 0 1 1 60 8Z" fill="#ffe08a" stroke="#f2b84b" stroke-width="3"/><circle cx="40" cy="52" r="4" fill="#f2b84b"/><circle cx="52" cy="70" r="3" fill="#f2b84b"/>'
  },
  {
    id: 'cloud',
    label: 'Cloud',
    svg: '<path d="M28 76a17 17 0 0 1-3-34 24 24 0 0 1 46-6 20 20 0 0 1 5 40Z" fill="#eef5ff" stroke="#a9c3ff" stroke-width="3"/><circle cx="40" cy="58" r="3" fill="#5b6b8c"/><circle cx="60" cy="58" r="3" fill="#5b6b8c"/><path d="M45 65q5 4 10 0" stroke="#5b6b8c" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
  },
  {
    id: 'bow',
    label: 'Bow',
    svg: '<path d="M50 48C38 30 14 24 10 36s6 30 40 18Z" fill="#ff8fc0"/><path d="M50 48c12-18 36-24 40-12s-6 30-40 18Z" fill="#ff8fc0"/><path d="M46 52l-14 34 10-4 6 8 4-36Z" fill="#ff6fae"/><path d="M54 52l14 34-10-4-6 8-4-36Z" fill="#ff6fae"/><circle cx="50" cy="50" r="9" fill="#ff4f9a"/>'
  },
  {
    id: 'flower',
    label: 'Flower',
    svg: '<g fill="#ffb3d1"><circle cx="50" cy="26" r="16"/><circle cx="73" cy="43" r="16"/><circle cx="64" cy="70" r="16"/><circle cx="36" cy="70" r="16"/><circle cx="27" cy="43" r="16"/></g><circle cx="50" cy="50" r="12" fill="#ffd34d"/>'
  },
  {
    id: 'crown',
    label: 'Crown',
    svg: '<path d="M12 74 8 28l22 20 20-32 20 32 22-20-4 46Z" fill="#ffcf4a" stroke="#e09a1a" stroke-width="3" stroke-linejoin="round"/><rect x="12" y="74" width="76" height="10" rx="3" fill="#e09a1a"/><circle cx="50" cy="56" r="6" fill="#ff5c9a"/><circle cx="28" cy="62" r="4" fill="#7ad0ff"/><circle cx="72" cy="62" r="4" fill="#7ad0ff"/>'
  },
  {
    id: 'cherry',
    label: 'Cherries',
    svg: '<path d="M32 62C40 40 52 24 70 12M68 60C66 40 66 26 70 12" stroke="#4f8a3a" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M70 12c8-2 16 2 20 8-8 2-16 0-20-8Z" fill="#6cc04a"/><circle cx="30" cy="70" r="18" fill="#e8304f"/><circle cx="68" cy="70" r="18" fill="#e8304f"/><circle cx="24" cy="64" r="4" fill="#fff" opacity=".7"/><circle cx="62" cy="64" r="4" fill="#fff" opacity=".7"/>'
  },
  {
    id: 'bolt',
    label: 'Lightning',
    svg: '<path d="M58 6 18 56h26l-8 38 46-54H54Z" fill="#ffe14d" stroke="#f0a500" stroke-width="3" stroke-linejoin="round"/>'
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    svg: '<g fill="none" stroke-width="8"><path d="M14 74a36 36 0 0 1 72 0" stroke="#ff6b8a"/><path d="M22 74a28 28 0 0 1 56 0" stroke="#ffc34d"/><path d="M30 74a20 20 0 0 1 40 0" stroke="#7dd87a"/><path d="M38 74a12 12 0 0 1 24 0" stroke="#7ab8ff"/></g><circle cx="16" cy="78" r="9" fill="#fff"/><circle cx="84" cy="78" r="9" fill="#fff"/>'
  },
  {
    id: 'smiley',
    label: 'Smiley',
    svg: '<circle cx="50" cy="50" r="40" fill="#ffd84d"/><circle cx="36" cy="42" r="5" fill="#4a3a1a"/><circle cx="64" cy="42" r="5" fill="#4a3a1a"/><path d="M32 58q18 18 36 0" stroke="#4a3a1a" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="26" cy="56" r="5" fill="#ff8fa8" opacity=".7"/><circle cx="74" cy="56" r="5" fill="#ff8fa8" opacity=".7"/>'
  },
  {
    id: 'bias',
    label: 'Bias tag',
    svg: '<rect x="8" y="30" width="84" height="40" rx="20" fill="#ff5c9a"/><text x="50" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#fff" letter-spacing="2">BIAS</text>'
  },
  {
    id: 'choeae',
    label: 'Choeae tag',
    svg: '<rect x="12" y="28" width="76" height="44" rx="10" fill="#8b6cff"/><text x="50" y="59" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="24" fill="#fff">최애♡</text>'
  },
  {
    id: 'lightstick',
    label: 'Lightstick',
    svg: '<rect x="44" y="50" width="12" height="42" rx="5" fill="#d9dbe6" stroke="#9aa0b5" stroke-width="2"/><circle cx="50" cy="32" r="24" fill="#ffd6ec" stroke="#ff8fc0" stroke-width="3"/><path d="M50 20l3.5 8 8.5.8-6.4 5.7 1.9 8.4L50 38.6l-7.5 4.3 1.9-8.4-6.4-5.7 8.5-.8Z" fill="#ff5c9a"/>'
  },
  {
    id: 'butterfly',
    label: 'Butterfly',
    svg: '<path d="M48 48C38 22 12 14 10 30s14 22 38 18Z" fill="#9fdcff"/><path d="M52 48c10-26 36-34 38-18s-14 22-38 18Z" fill="#9fdcff"/><path d="M48 52c-20 0-32 10-28 22s20 6 28-22Z" fill="#c7b3ff"/><path d="M52 52c20 0 32 10 28 22s-20 6-28-22Z" fill="#c7b3ff"/><rect x="47" y="30" width="6" height="44" rx="3" fill="#4a3a6a"/>'
  }
];

export const STICKERS = RAW.map(s => ({
  id: s.id,
  label: s.label,
  src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sticker(s.svg))}`
}));

export const STICKER_BY_ID = Object.fromEntries(STICKERS.map(s => [s.id, s]));

// Toploader plastic tints. `rim` colors the frame's edge, `fill` washes the plastic. Ids are stored too.
export const TINTS = [
  { id: 'clear', label: 'Clear', rim: 'rgba(255,255,255,0.55)', fill: 'rgba(255,255,255,0.08)' },
  { id: 'pink', label: 'Pink', rim: 'rgba(255,128,186,0.9)', fill: 'rgba(255,128,186,0.22)' },
  { id: 'lilac', label: 'Lilac', rim: 'rgba(176,148,255,0.9)', fill: 'rgba(176,148,255,0.22)' },
  { id: 'sky', label: 'Sky', rim: 'rgba(122,196,255,0.9)', fill: 'rgba(122,196,255,0.22)' },
  { id: 'mint', label: 'Mint', rim: 'rgba(120,222,180,0.9)', fill: 'rgba(120,222,180,0.22)' },
  { id: 'gold', label: 'Gold', rim: 'rgba(255,207,90,0.95)', fill: 'rgba(255,207,90,0.2)' }
];

export const TINT_BY_ID = Object.fromEntries(TINTS.map(t => [t.id, t]));
