import 'server-only';
import { CARD_BY_ID } from '@/lib/cards';
import { createAdminClient } from './admin';

// The trade board as one player sees it, read with the secret key (the trade tables have no client grants).
// Other players' offers on other players' listings are never sent, only how many there are.
// Expired listings are closed first (trade_expire), so nothing past its date shows or can be traded.
export async function getTradeBoard(playerId) {
  const db = createAdminClient();
  const { error: expireError } = await db.rpc('trade_expire');
  if (expireError) throw expireError;

  const [open, myClosed, myOffers] = await Promise.all([
    db.from('trade_listings').select('id, lister_id, card_id, want, created_at, expires_at').eq('status', 'open').order('created_at', { ascending: false }).limit(200),
    db
      .from('trade_listings')
      .select('id, card_id, status, closed_at, trade_offers (offerer_id, cards, status)')
      .eq('lister_id', playerId)
      .neq('status', 'open')
      .order('closed_at', { ascending: false })
      .limit(15),
    db
      .from('trade_offers')
      .select('id, listing_id, cards, status, created_at, closed_at, trade_listings (lister_id, card_id)')
      .eq('offerer_id', playerId)
      .order('created_at', { ascending: false })
      .limit(40)
  ]);
  for (const res of [open, myClosed, myOffers]) if (res.error) throw res.error;

  const openIds = open.data.map(l => l.id);
  const pending = openIds.length
    ? await db.from('trade_offers').select('id, listing_id, offerer_id, cards, created_at').eq('status', 'pending').in('listing_id', openIds)
    : { data: [] };
  if (pending.error) throw pending.error;

  const userIds = new Set([
    ...open.data.map(l => l.lister_id),
    ...pending.data.map(o => o.offerer_id),
    ...myClosed.data.flatMap(l => l.trade_offers.map(o => o.offerer_id)),
    ...myOffers.data.map(o => o.trade_listings?.lister_id)
  ]);
  userIds.delete(undefined);
  const profiles = userIds.size ? await db.from('profiles').select('id, username').in('id', [...userIds]) : { data: [] };
  if (profiles.error) throw profiles.error;
  const name = Object.fromEntries(profiles.data.map(p => [p.id, p.username]));

  const myOfferBy = Object.fromEntries(myOffers.data.filter(o => o.status === 'pending').map(o => [o.listing_id, o]));
  const board = [];
  const mine = [];
  for (const l of open.data) {
    const offers = pending.data.filter(o => o.listing_id === l.id);
    const base = { id: l.id, cardId: l.card_id, want: l.want, createdAt: l.created_at, expiresAt: l.expires_at };
    if (l.lister_id === playerId) {
      mine.push({
        ...base,
        offers: offers.map(o => ({ id: o.id, offerer: name[o.offerer_id] || 'A player', cards: o.cards, createdAt: o.created_at }))
      });
    } else {
      const my = myOfferBy[l.id];
      board.push({
        ...base,
        lister: name[l.lister_id] || 'A player',
        offerCount: offers.length,
        myOffer: my ? { id: my.id, cards: my.cards, createdAt: my.created_at } : null
      });
    }
  }

  const history = [
    ...myClosed.data.map(l => {
      const accepted = l.trade_offers.find(o => o.status === 'accepted');
      return {
        id: l.id,
        role: 'lister',
        status: l.status,
        cardId: l.card_id,
        cards: accepted?.cards || [],
        other: accepted ? name[accepted.offerer_id] || 'A player' : null,
        closedAt: l.closed_at
      };
    }),
    ...myOffers.data
      .filter(o => o.status !== 'pending' && o.trade_listings)
      .map(o => ({
        id: o.id,
        role: 'offerer',
        status: o.status,
        cardId: o.trade_listings.card_id,
        cards: o.cards,
        other: name[o.trade_listings.lister_id] || 'A player',
        closedAt: o.closed_at
      }))
  ]
    // Trades of retired cards (MOONFLARE's, removed from the catalog) have nothing left to show.
    .filter(h => [h.cardId, ...h.cards].every(id => Object.hasOwn(CARD_BY_ID, id)))
    .sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''))
    .slice(0, 15);

  return { board, mine, history };
}
