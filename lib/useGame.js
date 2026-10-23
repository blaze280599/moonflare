'use client';

import { useCallback, useEffect, useState } from 'react';
import { DAILY_STARS, NEW_GAME, PACK_COST, rollPack } from './gacha';

const SAVE_KEY = 'moonflare-save-v1';
const today = () => new Date().toISOString().slice(0, 10);

// Game state saved to localStorage. Swap this hook for a server-backed one when accounts arrive.
export function useGame() {
  const [state, setState] = useState(NEW_GAME);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) setState({ ...NEW_GAME, ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, loaded]);

  const openPack = useCallback(
    era => {
      if (state.coins < PACK_COST) return null;
      const result = rollPack(state, era);
      setState(result.state);
      return result.pulls;
    },
    [state]
  );

  const claimDaily = useCallback(() => {
    setState(s => (s.lastDaily === today() ? s : { ...s, coins: s.coins + DAILY_STARS, lastDaily: today() }));
  }, []);

  const reset = useCallback(() => setState(NEW_GAME), []);

  return { state, loaded, openPack, claimDaily, reset, dailyClaimed: state.lastDaily === today() };
}
