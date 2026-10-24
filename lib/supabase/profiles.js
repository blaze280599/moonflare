import 'server-only';
import { createAdminClient } from './admin';
import { buildProfileView } from '@/lib/profile';
import { rowToState } from '@/lib/save';

export const PROFILE_COLUMNS = 'id, username, created_at, bio, fav_group, fav_member, showcase, banner, avatar_path';
// Signed avatar links last a day: pages are rendered per request, but the header stays mounted while a player
// moves between pages, and an expired link just falls back to initials.
const AVATAR_TTL = 60 * 60 * 24;

// A signed URL for a path in the private `avatars` bucket, or null.
export async function avatarUrl(path) {
  if (!path) return null;
  const { data, error } = await createAdminClient().storage.from('avatars').createSignedUrl(path, AVATAR_TTL);
  return error ? null : data.signedUrl;
}

// How many trades a player has completed, as lister or offerer.
async function tradeCount(db, playerId) {
  const [listed, offered] = await Promise.all([
    db.from('trade_listings').select('id', { count: 'exact', head: true }).eq('lister_id', playerId).eq('status', 'traded'),
    db.from('trade_offers').select('id', { count: 'exact', head: true }).eq('offerer_id', playerId).eq('status', 'accepted')
  ]);
  return (listed.count || 0) + (offered.count || 0);
}

// The profile page's data for one player, built from their profile row and save with the secret key (players
// can only read their own rows). Callers must have checked that a player is signed in. Never returns the save
// itself, only what buildProfileView derives from it.
export async function loadProfileView(row) {
  const db = createAdminClient();
  const [save, trades, url] = await Promise.all([
    db.from('saves').select('owned, packs, pity, deco').eq('user_id', row.id).single(),
    tradeCount(db, row.id),
    avatarUrl(row.avatar_path)
  ]);
  if (save.error) throw save.error;
  return { ...buildProfileView(row, rowToState(save.data), trades), avatarUrl: url };
}

// A profile row by username, ignoring case (usernames are unique by lower(username)), or null.
export async function findProfile(username) {
  if (!/^[a-zA-Z0-9_]{1,20}$/.test(username)) return null;
  const { data, error } = await createAdminClient()
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .ilike('username', username.replace(/_/g, '\\_'))
    .maybeSingle();
  if (error) throw error;
  return data;
}
