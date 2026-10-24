import { redirect } from 'next/navigation';
import ResetPasswordForm from '@/components/ResetPasswordForm';
import { getPlayer } from '@/lib/supabase/server';

export const metadata = { title: 'Choose a new password' };

// Not in the middleware's PUBLIC list, so only a signed-in player (or one who just opened a reset link) gets here.
export default async function Page() {
  const player = await getPlayer();
  if (!player) redirect('/login?next=/reset-password');
  return <ResetPasswordForm email={player.email} />;
}
