-- Pick your bias: { "<group code>": "<member code>" }, one favourite member per group. Only the setBias
-- Server Action writes it, and rollPack() in lib/gacha.js reads it to give that member a small boost.
-- Players already have select on saves (table-level grant), so the new column needs no extra grant.
alter table public.saves
  add column bias jsonb not null default '{}'::jsonb check (jsonb_typeof(bias) = 'object');
