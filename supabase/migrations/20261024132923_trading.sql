-- Player-to-player trading. A listing offers one card for cards matching the lister's criteria (`want`);
-- other players answer with an offer of exactly want.count cards.
--
-- Escrow: listing or offering a card takes that copy out of the player's saves.owned straight away, and it
-- lives in the listing or offer until the trade closes. A copy is always in exactly one place (a save, a
-- listing or an offer), so it can't be offered twice, refunded or erased by Reset while it's up for trade.
-- Closing a listing or offer without a trade puts the copies back.
--
-- Every change runs in one of the functions below, inside a single transaction. Locks are always taken in
-- the same order, so two trades can't deadlock: the listing row, then the saves (in user_id order), then
-- offer rows. Each save it touches gets its version bumped, so the app's optimistic writes
-- (app/actions/game.js) notice and retry. Card ids and criteria are checked against the catalog in
-- lib/trade.js before these are called; the functions guard ownership, status and counts.
--
-- Clients get nothing: RLS is on with no policies, and the board is read on the server with the secret key.
-- Account deletion isn't a feature; if a user row were deleted, their listings and offers (and the copies
-- in them) would go with it.

create table public.trade_listings (
  id uuid primary key default gen_random_uuid(),
  lister_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null check (length(card_id) between 4 and 24),
  -- { group, eras[], members[], rarities[], foils[], count }; empty lists mean "any".
  want jsonb not null check (jsonb_typeof(want) = 'object' and (want ->> 'count')::int between 1 and 3),
  status text not null default 'open' check (status in ('open', 'traded', 'cancelled', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz
);
create index trade_listings_open on public.trade_listings (expires_at) where status = 'open';
create index trade_listings_lister on public.trade_listings (lister_id, created_at desc);

create table public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.trade_listings (id) on delete cascade,
  offerer_id uuid not null references auth.users (id) on delete cascade,
  cards text[] not null check (cardinality(cards) between 1 and 3),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn', 'expired')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create unique index trade_offers_one_pending on public.trade_offers (listing_id, offerer_id) where status = 'pending';
create index trade_offers_listing on public.trade_offers (listing_id);
create index trade_offers_offerer on public.trade_offers (offerer_id, created_at desc);

alter table public.trade_listings enable row level security;
alter table public.trade_offers enable row level security;
revoke all on public.trade_listings, public.trade_offers from anon, authenticated;
grant select, insert, update, delete on public.trade_listings, public.trade_offers to service_role;

-- Locks the given players' saves in a fixed order. Call before reading or changing their owned maps.
create function public.trade_lock_saves(p_users uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform 1 from public.saves where user_id = any (p_users) order by user_id for update;
end;
$$;

-- Adds (p_sign = 1) or removes (p_sign = -1) one copy of each card in p_cards from a player's save.
-- Removing more copies than the player has raises 'not_owned'. Counts that reach 0 drop the key, the way
-- the app treats an unowned card. The save must already be locked.
create function public.trade_move_cards(p_user uuid, p_cards text[], p_sign int)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_owned jsonb;
  v_card text;
  v_n int;
  v_have int;
begin
  select owned into v_owned from public.saves where user_id = p_user;
  if v_owned is null then
    raise exception 'no_save';
  end if;
  for v_card, v_n in select c, count(*)::int from unnest(p_cards) c group by c loop
    v_have := coalesce((v_owned ->> v_card)::int, 0) + p_sign * v_n;
    if v_have < 0 then
      raise exception 'not_owned';
    elsif v_have = 0 then
      v_owned := v_owned - v_card;
    else
      v_owned := jsonb_set(v_owned, array[v_card], to_jsonb(v_have));
    end if;
  end loop;
  update public.saves set owned = v_owned, version = version + 1, updated_at = now() where user_id = p_user;
end;
$$;

-- Closes every pending offer on a listing (except p_keep) with p_status and gives the cards back.
-- The offerers' saves must already be locked.
create function public.trade_return_offers(p_listing uuid, p_status text, p_keep uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offer record;
begin
  for v_offer in
    select id, offerer_id, cards from public.trade_offers
    where listing_id = p_listing and status = 'pending' and id is distinct from p_keep
    for update
  loop
    perform public.trade_move_cards(v_offer.offerer_id, v_offer.cards, 1);
    update public.trade_offers set status = p_status, closed_at = now() where id = v_offer.id;
  end loop;
end;
$$;

-- Ends an open listing without a trade: the card goes back to the lister, offers back to their offerers.
create function public.trade_close_listing(p_listing uuid, p_status text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_listing public.trade_listings;
  v_users uuid[];
begin
  select * into v_listing from public.trade_listings where id = p_listing and status = 'open' for update;
  if not found then
    return;
  end if;
  select array_agg(distinct u) into v_users from (
    select v_listing.lister_id u
    union select offerer_id from public.trade_offers where listing_id = p_listing and status = 'pending'
  ) s;
  perform public.trade_lock_saves(v_users);
  perform public.trade_move_cards(v_listing.lister_id, array[v_listing.card_id], 1);
  perform public.trade_return_offers(p_listing, case when p_status = 'expired' then 'expired' else 'declined' end);
  update public.trade_listings set status = p_status, closed_at = now() where id = p_listing;
end;
$$;

-- Closes listings past their expiry date. Runs before every board read and trade action (lazy expiry).
create function public.trade_expire()
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in select id from public.trade_listings where status = 'open' and expires_at <= now() loop
    perform public.trade_close_listing(v_id, 'expired');
  end loop;
end;
$$;

create function public.trade_create_listing(p_player uuid, p_card text, p_want jsonb, p_days int, p_max_open int)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.trade_lock_saves(array[p_player]);
  if (select count(*) from public.trade_listings where lister_id = p_player and status = 'open') >= p_max_open then
    raise exception 'too_many_listings';
  end if;
  perform public.trade_move_cards(p_player, array[p_card], -1);
  insert into public.trade_listings (lister_id, card_id, want, expires_at)
  values (p_player, p_card, p_want, now() + make_interval(days => p_days))
  returning id into v_id;
  return v_id;
end;
$$;

create function public.trade_cancel_listing(p_player uuid, p_listing uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.trade_listings where id = p_listing and lister_id = p_player and status = 'open') then
    raise exception 'listing_closed';
  end if;
  perform public.trade_close_listing(p_listing, 'cancelled');
end;
$$;

create function public.trade_make_offer(p_player uuid, p_listing uuid, p_cards text[], p_max_pending int)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_listing public.trade_listings;
  v_id uuid;
begin
  select * into v_listing from public.trade_listings where id = p_listing for update;
  if not found or v_listing.status <> 'open' or v_listing.expires_at <= now() then
    raise exception 'listing_closed';
  end if;
  if v_listing.lister_id = p_player then
    raise exception 'own_listing';
  end if;
  if cardinality(p_cards) <> (v_listing.want ->> 'count')::int then
    raise exception 'wrong_count';
  end if;
  perform public.trade_lock_saves(array[p_player]);
  if exists (select 1 from public.trade_offers where listing_id = p_listing and offerer_id = p_player and status = 'pending') then
    raise exception 'already_offered';
  end if;
  if (select count(*) from public.trade_offers where offerer_id = p_player and status = 'pending') >= p_max_pending then
    raise exception 'too_many_offers';
  end if;
  perform public.trade_move_cards(p_player, p_cards, -1);
  insert into public.trade_offers (listing_id, offerer_id, cards) values (p_listing, p_player, p_cards) returning id into v_id;
  return v_id;
end;
$$;

create function public.trade_withdraw_offer(p_player uuid, p_offer uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offer public.trade_offers;
begin
  perform 1 from public.trade_listings l join public.trade_offers o on o.listing_id = l.id where o.id = p_offer for update of l;
  perform public.trade_lock_saves(array[p_player]);
  select * into v_offer from public.trade_offers where id = p_offer and offerer_id = p_player for update;
  if not found or v_offer.status <> 'pending' then
    raise exception 'offer_closed';
  end if;
  perform public.trade_move_cards(p_player, v_offer.cards, 1);
  update public.trade_offers set status = 'withdrawn', closed_at = now() where id = p_offer;
end;
$$;

create function public.trade_decline_offer(p_player uuid, p_offer uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_offerer uuid;
  v_offer public.trade_offers;
begin
  select o.offerer_id into v_offerer from public.trade_listings l join public.trade_offers o on o.listing_id = l.id
  where o.id = p_offer and l.lister_id = p_player
  for update of l;
  if not found then
    raise exception 'offer_closed';
  end if;
  perform public.trade_lock_saves(array[v_offerer]);
  select * into v_offer from public.trade_offers where id = p_offer for update;
  if v_offer.status <> 'pending' then
    raise exception 'offer_closed';
  end if;
  perform public.trade_move_cards(v_offerer, v_offer.cards, 1);
  update public.trade_offers set status = 'declined', closed_at = now() where id = p_offer;
end;
$$;

-- The swap. The listed card was escrowed from the lister and the offered cards from the offerer, so this
-- only has to check both are still open, then hand each side the other's cards. Every other pending offer
-- on the listing is declined and returned in the same transaction.
create function public.trade_accept_offer(p_player uuid, p_offer uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_listing public.trade_listings;
  v_offer public.trade_offers;
  v_users uuid[];
begin
  select l.* into v_listing from public.trade_listings l
  join public.trade_offers o on o.listing_id = l.id
  where o.id = p_offer and l.lister_id = p_player
  for update of l;
  if not found or v_listing.status <> 'open' or v_listing.expires_at <= now() then
    raise exception 'listing_closed';
  end if;
  select array_agg(distinct u) into v_users from (
    select p_player u
    union select offerer_id from public.trade_offers where listing_id = v_listing.id and status = 'pending'
  ) s;
  perform public.trade_lock_saves(v_users);
  select * into v_offer from public.trade_offers where id = p_offer for update;
  if v_offer.status <> 'pending' then
    raise exception 'offer_closed';
  end if;
  perform public.trade_move_cards(v_offer.offerer_id, array[v_listing.card_id], 1);
  perform public.trade_move_cards(p_player, v_offer.cards, 1);
  update public.trade_offers set status = 'accepted', closed_at = now() where id = p_offer;
  perform public.trade_return_offers(v_listing.id, 'declined', p_offer);
  update public.trade_listings set status = 'traded', closed_at = now() where id = v_listing.id;
end;
$$;

-- Reset collection calls this first, so a reset gives back what's in escrow instead of stranding it.
create function public.trade_release_all(p_player uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  for v_id in select id from public.trade_listings where lister_id = p_player and status = 'open' loop
    perform public.trade_close_listing(v_id, 'cancelled');
  end loop;
  for v_id in select id from public.trade_offers where offerer_id = p_player and status = 'pending' loop
    perform public.trade_withdraw_offer(p_player, v_id);
  end loop;
end;
$$;

-- Functions in public are exposed as RPCs; only the server (secret key) may call these.
do $$
declare
  f text;
begin
  for f in
    select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'trade\_%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
