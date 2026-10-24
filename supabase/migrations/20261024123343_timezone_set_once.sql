-- A missing timezone means "not known yet": players from before phase 2 have none, and the app
-- fills it once from their browser on their next visit. After that only sign-up sets it, so a
-- player can't hop between zones to claim the daily reward twice.
alter table public.profiles alter column timezone drop default;
alter table public.profiles alter column timezone drop not null;
update public.profiles set timezone = null where timezone = 'UTC';

create or replace function public.handle_new_user()
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
    nullif(new.raw_user_meta_data ->> 'timezone', '')
  );
  insert into public.saves (user_id) values (new.id);
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
