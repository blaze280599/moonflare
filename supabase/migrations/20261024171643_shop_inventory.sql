-- The shop: unopened booster packs, pack kind -> count (see lib/shop.js). Only Server Actions write it.
-- New accounts start with 300 stars and two standard packs, matching NEW_GAME in lib/gacha.js.
alter table public.saves
  add column inventory jsonb not null default '{"standard": 2}'::jsonb
  check (jsonb_typeof(inventory) = 'object' and pg_column_size(inventory) < 16384);

alter table public.saves alter column coins set default 300;

-- Table-level grants already cover new columns; restated so this file stands on its own.
revoke all on public.saves from anon, authenticated;
grant select on public.saves to authenticated;
grant select, insert, update, delete on public.saves to service_role;
