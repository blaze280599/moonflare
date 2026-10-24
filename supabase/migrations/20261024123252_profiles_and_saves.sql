-- Phase 2: one profile and one save per player. Rolls and every save write happen in Next.js
-- Server Actions with the service-role key, so players only ever read their own rows.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  -- IANA zone from the browser at sign-up; the daily reward resets at midnight here.
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (lower(username));

-- Defaults match NEW_GAME in lib/gacha.js.
create table public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 500 check (coins >= 0),
  owned jsonb not null default '{}'::jsonb check (jsonb_typeof(owned) = 'object'),
  packs integer not null default 0 check (packs >= 0),
  pity integer not null default 0 check (pity >= 0),
  last_daily date,
  -- Bumped on every write; writers update `where version = <read version>` to catch races.
  version integer not null default 0,
  -- Set once a browser's old localStorage save has been brought in (or declined).
  local_import_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

create policy "Players read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Players read their own save" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);

-- New tables aren't exposed automatically in this project, so grant exactly what's needed.
revoke all on public.profiles, public.saves from anon, authenticated;
grant select on public.profiles, public.saves to authenticated;
grant select, insert, update, delete on public.profiles, public.saves to service_role;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, timezone)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  );
  insert into public.saves (user_id) values (new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Players who signed up before this migration.
insert into public.profiles (id, username)
select id, coalesce(nullif(raw_user_meta_data ->> 'username', ''), split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;
insert into public.saves (user_id)
select id from auth.users
on conflict (user_id) do nothing;
