'use server';

import { CARD_BY_ID } from '@/lib/cards';
import { rowToState } from '@/lib/save';
import { LISTING_DAYS, MAX_OPEN_LISTINGS, MAX_PENDING_OFFERS, checkOffer, sanitizeWant } from '@/lib/trade';
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin';
import { getPlayer } from '@/lib/supabase/server';
import { getTradeBoard } from '@/lib/supabase/trades';

// Trading. Every action checks the player, runs one database function (supabase/migrations/*_trading.sql) that
// escrows or swaps cards in a single transaction, then returns { state, board }: the player's fresh save for
// useGame to adopt, and the board as they now see it. Or { error } with text to show.

const FAILED = 'Couldn’t reach the trade board. Try again.';

// Errors the database functions raise, in the player's words.
const MESSAGES = {
  not_owned: 'You don’t have that card any more.',
  listing_closed: 'That listing has closed.',
  offer_closed: 'That offer isn’t open any more.',
  own_listing: 'That’s your own listing.',
  wrong_count: 'That’s the wrong number of cards for this listing.',
  already_offered: 'You already have an offer on this listing.',
  too_many_listings: `You can have ${MAX_OPEN_LISTINGS} listings open at once.`,
  too_many_offers: `You can have ${MAX_PENDING_OFFERS} offers waiting at once.`
};

const isId = id => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);

async function withPlayer(run) {
  if (!adminConfigured) return { error: 'Trading isn’t set up on this site yet.' };
  const player = await getPlayer();
  if (!player) return { error: 'Your session ended. Log in again.' };
  try {
    const db = createAdminClient();
    const res = await run(player, db);
    if (res?.error) return res;
    return await snapshot(player.id);
  } catch (err) {
    const known = MESSAGES[err?.message];
    if (!known) console.error(err);
    return { error: known || FAILED };
  }
}

// Calls a trade function and turns a raised error into a thrown one, so withPlayer can map it.
async function call(db, fn, args) {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data;
}

async function snapshot(playerId) {
  const db = createAdminClient();
  const [save, board] = await Promise.all([db.from('saves').select('*').eq('user_id', playerId).single(), getTradeBoard(playerId)]);
  if (save.error) throw save.error;
  return { state: rowToState(save.data), board };
}

export async function loadBoard() {
  return withPlayer(() => null);
}

export async function createListing(cardId, rawWant) {
  if (typeof cardId !== 'string' || !Object.hasOwn(CARD_BY_ID, cardId)) return { error: 'That card doesn’t exist.' };
  const { want, error } = sanitizeWant(rawWant);
  if (error) return { error };
  return withPlayer((player, db) =>
    call(db, 'trade_create_listing', { p_player: player.id, p_card: cardId, p_want: want, p_days: LISTING_DAYS, p_max_open: MAX_OPEN_LISTINGS })
  );
}

export async function cancelListing(listingId) {
  if (!isId(listingId)) return { error: MESSAGES.listing_closed };
  return withPlayer((player, db) => call(db, 'trade_cancel_listing', { p_player: player.id, p_listing: listingId }));
}

export async function makeOffer(listingId, cardIds) {
  if (!isId(listingId)) return { error: MESSAGES.listing_closed };
  return withPlayer(async (player, db) => {
    const [listing, save] = await Promise.all([
      db.from('trade_listings').select('want, status').eq('id', listingId).maybeSingle(),
      db.from('saves').select('owned').eq('user_id', player.id).single()
    ]);
    if (listing.error || save.error) throw new Error('read_failed');
    if (!listing.data || listing.data.status !== 'open') return { error: MESSAGES.listing_closed };
    // The want was cleaned when it was listed; checking again guards against rows from older code.
    const { want } = sanitizeWant(listing.data.want);
    if (!want) return { error: MESSAGES.listing_closed };
    const problem = checkOffer(want, cardIds, save.data.owned || {});
    if (problem) return { error: problem };
    await call(db, 'trade_make_offer', { p_player: player.id, p_listing: listingId, p_cards: cardIds, p_max_pending: MAX_PENDING_OFFERS });
  });
}

export async function withdrawOffer(offerId) {
  if (!isId(offerId)) return { error: MESSAGES.offer_closed };
  return withPlayer((player, db) => call(db, 'trade_withdraw_offer', { p_player: player.id, p_offer: offerId }));
}

export async function acceptOffer(offerId) {
  if (!isId(offerId)) return { error: MESSAGES.offer_closed };
  return withPlayer((player, db) => call(db, 'trade_accept_offer', { p_player: player.id, p_offer: offerId }));
}

export async function declineOffer(offerId) {
  if (!isId(offerId)) return { error: MESSAGES.offer_closed };
  return withPlayer((player, db) => call(db, 'trade_decline_offer', { p_player: player.id, p_offer: offerId }));
}
