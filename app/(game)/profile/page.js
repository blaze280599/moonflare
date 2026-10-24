import { notFound, redirect } from 'next/navigation';
import { createClient, getPlayer } from '@/lib/supabase/server';

// /profile: a shortcut to your own /players/<username>. The username comes from the profile row (read as the
// player), not the session token, since that's what /players/ looks up.
export default async function Page() {
  const player = await getPlayer();
  if (!player) redirect('/login?next=/profile');
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('username').eq('id', player.id).maybeSingle();
  if (!data) notFound();
  redirect(`/players/${encodeURIComponent(data.username)}`);
}
