-- MOONFLARE, the made-up group, is gone from the catalog (lib/cards.js), so its card ids (PM-*, NB-*, SE-*)
-- no longer exist. Drop them from saves, profiles and trades so no page meets an unknown card.
-- When written: one save held 17 of them, plus one cancelled listing; no decorations, showcases,
-- biases, favourites, banners or offers used them.

update public.saves
set owned = coalesce((select jsonb_object_agg(k, v) from jsonb_each(owned) as e(k, v) where k !~ '^(PM|NB|SE)-'), '{}'::jsonb),
    deco = coalesce((select jsonb_object_agg(k, v) from jsonb_each(deco) as e(k, v) where k !~ '^(PM|NB|SE)-'), '{}'::jsonb),
    bias = bias - 'MF',
    version = version + 1
where owned::text ~ '"(PM|NB|SE)-' or deco::text ~ '"(PM|NB|SE)-' or bias ? 'MF';

update public.profiles
set showcase = coalesce((select jsonb_agg(x) from jsonb_array_elements(showcase) as x where x #>> '{}' !~ '^(PM|NB|SE)-'), '[]'::jsonb)
where showcase::text ~ '"(PM|NB|SE)-';

update public.profiles set banner = 'preset:moonrise' where banner ~ '^(card:(PM|NB|SE)-|album:(PM|NB|SE)$)';
update public.profiles set fav_group = null, fav_member = null where fav_group = 'MF';

delete from public.trade_offers
where listing_id in (select id from public.trade_listings where card_id ~ '^(PM|NB|SE)-')
   or array_to_string(cards, ',') ~ '(^|,)(PM|NB|SE)-';
delete from public.trade_listings where card_id ~ '^(PM|NB|SE)-' or want::text ~ '"MF"';
