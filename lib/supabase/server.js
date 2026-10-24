import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from './config';
import { rowToState } from '@/lib/save';

// Supabase client for Server Components, Server Actions and route handlers, signed in as the visitor.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies. The middleware refreshes the session instead.
        }
      }
    }
  });
}

// The player's save and profile, read as the player, so row-level security limits it to their own rows.
// `needsImport` means the one-time "bring this browser's collection" offer hasn't been answered yet.
// Returns null if Supabase can't be reached; the game then shows an error instead of a fresh save.
export async function getGame(playerId) {
  if (!playerId) return null;
  const supabase = await createClient();
  const [save, profile] = await Promise.all([
    supabase.from('saves').select('coins, owned, packs, pity, last_daily, bias, deco, local_import_at').eq('user_id', playerId).maybeSingle(),
    supabase.from('profiles').select('timezone, avatar_path').eq('id', playerId).maybeSingle()
  ]);
  if (save.error || !save.data) return null;
  return {
    state: rowToState(save.data),
    needsImport: !save.data.local_import_at,
    timeZone: profile.data?.timezone || null,
    avatarPath: profile.data?.avatar_path || null
  };
}

// The signed-in player, or null. Reads the verified session token, so it's safe to trust on the server.
export async function getPlayer() {
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: claims.email, username: claims.user_metadata?.username || claims.email };
}
