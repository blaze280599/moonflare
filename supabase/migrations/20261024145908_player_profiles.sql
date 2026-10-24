-- Player profiles: bio, favourites, banner, showcase and a profile picture.
-- Every value is cleaned by lib/profile.js in a Server Action before it's written with the secret key; these
-- checks are a backstop. Players still only `select` their own profile row: other players' profiles are read on
-- the server with the secret key (lib/supabase/profiles.js), which sends only what a profile page shows.

alter table public.profiles
  add column bio text not null default '' check (char_length(bio) <= 160),
  -- A GROUPS code and one of its member codes (lib/cards.js).
  add column fav_group text check (char_length(fav_group) <= 8),
  add column fav_member text check (char_length(fav_member) <= 8),
  -- Card ids in display order (MAX_SHOWCASE). Cards the player no longer owns stay here but are hidden.
  add column showcase jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(showcase) = 'array' then jsonb_array_length(showcase) <= 9 else false end),
  -- 'preset:<id>', 'card:<card id>' or 'album:<era code>'.
  add column banner text not null default 'preset:moonrise' check (char_length(banner) <= 40),
  -- Path inside the private `avatars` bucket: '<user id>/<timestamp>.webp' (or .jpg).
  add column avatar_path text check (char_length(avatar_path) <= 120),
  add column updated_at timestamptz not null default now();

-- Profile pictures. Private: pages show them through short-lived signed URLs made on the server, so only
-- signed-in players see them. Uploads go through the uploadAvatar Server Action (secret key), which checks the
-- bytes and always writes under the player's own '<user id>/' folder. There are deliberately no storage.objects
-- policies for anon or authenticated, so no client can read, write or delete objects here directly.
-- The bucket's own limits back up the server's checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 204800, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
