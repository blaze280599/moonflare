import { GameProvider } from '@/components/GameProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { avatarUrl } from '@/lib/supabase/profiles';
import { getGame, getPlayer } from '@/lib/supabase/server';

// Every page in this group needs a signed-in player; middleware.js redirects everyone else to /login.
// The header shows who's signed in, so these pages render per request instead of at build time.
export const dynamic = 'force-dynamic';

export default async function GameLayout({ children }) {
  const player = await getPlayer();
  const game = await getGame(player?.id);
  // The header's account button shows the profile picture (a signed link to the private bucket).
  const avatar = await avatarUrl(game?.avatarPath).catch(() => null);
  return (
    <GameProvider initial={game} player={player}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader player={player && { ...player, avatar }} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </GameProvider>
  );
}
