import { CARD_BY_ID } from './cards.js';
import { STICKER_BY_ID, TINT_BY_ID } from './stickers.js';

// Toploader decorations: saves.deco maps a card id to { t: tint id, s: [{ id, x, y, k, r }] }.
// x and y are the sticker's center as a fraction of the toploader (0–1), k its scale, r its rotation in degrees.
// Pure helpers, shared by the Server Action and the editor. The server trusts nothing the browser sends.

export const MAX_STICKERS = 16;
export const MAX_TOPLOADERS = 60;
export const MIN_SCALE = 0.4;
export const MAX_SCALE = 2.5;
const DEFAULT_TINT = 'clear';

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const round = (n, places) => Math.round(n * 10 ** places) / 10 ** places;
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// Wraps any angle into -180..180.
export const wrapAngle = deg => {
  const r = ((((deg + 180) % 360) + 360) % 360) - 180;
  return r === -180 ? 180 : r;
};

// One sticker, or null if it can't be used (unknown id, missing or non-finite numbers).
export function cleanSticker(raw) {
  if (!isObject(raw) || typeof raw.id !== 'string' || !Object.hasOwn(STICKER_BY_ID, raw.id)) return null;
  const { x, y, k = 1, r = 0 } = raw;
  if (![x, y, k, r].every(Number.isFinite)) return null;
  return {
    id: raw.id,
    x: round(clamp(x, 0, 1), 3),
    y: round(clamp(y, 0, 1), 3),
    k: round(clamp(k, MIN_SCALE, MAX_SCALE), 2),
    r: Math.round(wrapAngle(r))
  };
}

// A whole toploader from the browser: unknown tints fall back to clear, bad stickers are dropped, at most
// MAX_STICKERS are kept (the first ones, which sit at the bottom of the pile).
export function sanitizeToploader(raw) {
  const src = isObject(raw) ? raw : {};
  const t = typeof src.t === 'string' && Object.hasOwn(TINT_BY_ID, src.t) ? src.t : DEFAULT_TINT;
  const s = Array.isArray(src.s) ? src.s.slice(0, MAX_STICKERS * 4).map(cleanSticker).filter(Boolean).slice(0, MAX_STICKERS) : [];
  return { t, s };
}

// A clear toploader with no stickers is the same as no toploader, so it isn't stored.
const isPlainToploader = top => top.t === DEFAULT_TINT && top.s.length === 0;

// The save after decorating (or clearing) one card's toploader. Returns { state } or { error }.
export function applyToploader(state, cardId, raw) {
  if (typeof cardId !== 'string' || !Object.hasOwn(CARD_BY_ID, cardId)) return { error: 'unknown_card' };
  if (!state.owned[cardId]) return { error: 'not_owned' };
  const top = sanitizeToploader(raw);
  const deco = { ...state.deco };
  if (isPlainToploader(top)) delete deco[cardId];
  else {
    if (!deco[cardId] && Object.keys(deco).length >= MAX_TOPLOADERS) return { error: 'too_many' };
    deco[cardId] = top;
  }
  return { state: { ...state, deco } };
}

// The toploader to show for a card: only for cards the player still owns.
export const toploaderFor = (state, cardId) => (state.owned[cardId] && state.deco?.[cardId]) || null;
