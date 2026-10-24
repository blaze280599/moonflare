'use server';

import { avatarType, sanitizeProfile, sanitizeShowcase } from '@/lib/profile';
import { adminConfigured, createAdminClient } from '@/lib/supabase/admin';
import { PROFILE_COLUMNS, loadProfileView } from '@/lib/supabase/profiles';
import { getPlayer } from '@/lib/supabase/server';

// Profile changes. Like the game actions, each one checks the player, cleans the input against their save
// (lib/profile.js) and writes with the secret key. Each returns { profile } (the page's new view) or { error }.

const FAILED = 'Couldn’t save your profile. Try again.';

async function withPlayer(run) {
  if (!adminConfigured) return { error: 'Saving isn’t set up on this site yet.' };
  const player = await getPlayer();
  if (!player) return { error: 'Your session ended. Log in again.' };
  try {
    return await run(player, createAdminClient());
  } catch (err) {
    console.error(err);
    return { error: FAILED };
  }
}

async function ownedCards(db, playerId) {
  const { data, error } = await db.from('saves').select('owned').eq('user_id', playerId).single();
  if (error) throw error;
  return data.owned || {};
}

// Writes `changes` to the player's profile row and returns the fresh view.
async function update(db, playerId, changes) {
  const { data, error } = await db
    .from('profiles')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', playerId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return { profile: await loadProfileView(data) };
}

// Bio, favourite group and member, and banner.
export async function saveProfile(raw) {
  return withPlayer(async (player, db) => {
    const p = sanitizeProfile(raw, await ownedCards(db, player.id));
    return update(db, player.id, { bio: p.bio, fav_group: p.favGroup, fav_member: p.favMember, banner: p.banner });
  });
}

// The showcase, in order. Only owned cards are kept, up to MAX_SHOWCASE.
export async function saveShowcase(ids) {
  return withPlayer(async (player, db) => update(db, player.id, { showcase: sanitizeShowcase(ids, await ownedCards(db, player.id)) }));
}

// A new profile picture, already cropped square and downscaled in the browser. The bytes are checked here
// (WebP or JPEG by their header, under MAX_AVATAR_BYTES), whatever type the browser claimed. Each upload gets a
// new name under the player's own folder, so a cached old picture never shows, and the old file is removed.
export async function uploadAvatar(formData) {
  const file = formData?.get?.('avatar');
  if (!file || typeof file.arrayBuffer !== 'function') return { error: 'Pick an image first.' };
  return withPlayer(async (player, db) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = avatarType(bytes);
    if (!type) return { error: 'That picture is too big or isn’t an image. Try another one.' };
    const path = `${player.id}/${Date.now()}.${type === 'image/webp' ? 'webp' : 'jpg'}`;
    const { data: before, error: readError } = await db.from('profiles').select('avatar_path').eq('id', player.id).single();
    if (readError) throw readError;
    const { error: uploadError } = await db.storage.from('avatars').upload(path, bytes, { contentType: type, upsert: false });
    if (uploadError) throw uploadError;
    const result = await update(db, player.id, { avatar_path: path });
    if (before.avatar_path) await db.storage.from('avatars').remove([before.avatar_path]);
    return result;
  });
}

export async function removeAvatar() {
  return withPlayer(async (player, db) => {
    const { data: before, error } = await db.from('profiles').select('avatar_path').eq('id', player.id).single();
    if (error) throw error;
    const result = await update(db, player.id, { avatar_path: null });
    if (before.avatar_path) await db.storage.from('avatars').remove([before.avatar_path]);
    return result;
  });
}
