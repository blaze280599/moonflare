-- Toploader decorations: card id -> { t: tint id, s: [stickers] } (see lib/deco.js).
-- Only the deco Server Action writes it, after cleaning the browser's input; the size check is a backstop.
alter table public.saves
  add column deco jsonb not null default '{}'::jsonb
  check (jsonb_typeof(deco) = 'object' and pg_column_size(deco) < 262144);

-- Table-level grants already cover new columns; restated so this file stands on its own.
revoke all on public.saves from anon, authenticated;
grant select on public.saves to authenticated;
grant select, insert, update, delete on public.saves to service_role;
