import TradeBoard from '@/components/TradeBoard';
import { adminConfigured } from '@/lib/supabase/admin';
import { getPlayer } from '@/lib/supabase/server';
import { getTradeBoard } from '@/lib/supabase/trades';

export const metadata = { title: 'Trade', description: 'Swap duplicate photocards with other players.' };

export default async function Page() {
  const player = await getPlayer();
  let board = null;
  if (player && adminConfigured) {
    try {
      board = await getTradeBoard(player.id);
    } catch (err) {
      console.error(err);
    }
  }
  return <TradeBoard initialBoard={board} />;
}
