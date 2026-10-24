import { CARD_BY_ID } from './cards.js';
import { NEW_GAME, PITY_AT } from './gacha.js';

// Pure helpers shared by the Server Actions and the client hook. No Supabase calls here, so tests can import it.

// Stars a browser save can bring in: about ten days of daily rewards on top of a new account.
export const MAX_IMPORT_COINS = 3500;
// Copies of one card a browser save can bring in.
export const MAX_IMPORT_COPIES = 99;

// A real IANA zone name like "Asia/Seoul" or "UTC". Offset strings ("+09:00") are rejected on purpose.
export function isTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length > 64 || !/^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+)*$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// The calendar date (YYYY-MM-DD) at `now` in `tz`. An unknown or missing zone counts as UTC.
export function dateInZone(now, tz) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: isTimeZone(tz) ? tz : 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

// Database row (snake_case) → the game state shape components use (NEW_GAME).
export function rowToState(row) {
  return {
    coins: row.coins,
    owned: row.owned || {},
    packs: row.packs,
    pity: row.pity,
    lastDaily: row.last_daily || '',
    deco: row.deco || {}
  };
}

// Game state → the columns a Server Action writes.
export function stateToRow(state) {
  return {
    coins: state.coins,
    owned: state.owned,
    packs: state.packs,
    pity: state.pity,
    last_daily: state.lastDaily || null,
    deco: state.deco || {}
  };
}

const count = (n, max) => (Number.isInteger(n) && n > 0 ? Math.min(n, max) : 0);

// Cleans an old localStorage save before it joins an account. It came from the browser, so trust none of it:
// unknown card ids are dropped, counts and stars are capped, and pity stays below the forced-Legendary point.
export function sanitizeImport(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const owned = {};
  if (src.owned && typeof src.owned === 'object' && !Array.isArray(src.owned)) {
    for (const [id, n] of Object.entries(src.owned)) {
      if (!Object.hasOwn(CARD_BY_ID, id)) continue;
      const copies = count(n, MAX_IMPORT_COPIES);
      if (copies) owned[id] = copies;
    }
  }
  return {
    coins: count(src.coins, MAX_IMPORT_COINS),
    owned,
    packs: count(src.packs, 100_000),
    pity: Math.min(count(src.pity, PITY_AT), PITY_AT - 1)
  };
}

// Adds a cleaned import to an account's save. Cards and album counts add up; stars take whichever is
// higher, so importing can't stack a browser's stars on top of the account's starting 500.
export function mergeImport(state, imported) {
  const owned = { ...state.owned };
  for (const [id, n] of Object.entries(imported.owned)) owned[id] = Math.min((owned[id] || 0) + n, MAX_IMPORT_COPIES);
  return {
    ...state,
    coins: Math.max(state.coins, imported.coins),
    owned,
    packs: state.packs + imported.packs,
    pity: Math.max(state.pity, imported.pity)
  };
}

// What Reset collection writes. The daily claim stays, so resetting can't hand out a second daily reward.
export const resetState = state => ({ ...NEW_GAME, lastDaily: state.lastDaily });
