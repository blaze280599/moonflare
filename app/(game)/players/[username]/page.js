import { notFound } from 'next/navigation';
import ProfilePage from '@/components/ProfilePage';
import { adminConfigured } from '@/lib/supabase/admin';
import { findProfile, loadProfileView } from '@/lib/supabase/profiles';
import { getPlayer } from '@/lib/supabase/server';

export async function generateMetadata({ params }) {
  const { username } = await params;
  return { title: decodeURIComponent(username), description: 'A Poca player’s profile and showcase.' };
}

// Any signed-in player can see any profile (middleware.js keeps signed-out visitors out); only its owner gets
// the edit controls, and every write checks the player again in app/actions/profile.js.
export default async function Page({ params }) {
  const { username } = await params;
  const player = await getPlayer();
  if (!player || !adminConfigured) notFound();
  const row = await findProfile(decodeURIComponent(username));
  if (!row) notFound();
  const profile = await loadProfileView(row);
  return <ProfilePage key={row.id} initialProfile={profile} isOwner={row.id === player.id} />;
}
