'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DAILY_STARS, NEW_GAME, PACK_COST, rollPack } from './gacha.js';

const SAVE_KEY = 'moonflare-save-v1';
// The player's local date (YYYY-MM-DD), so the daily reward resets at their midnight, not UTC's.
const today = () => new Date().toLocaleDateString('en-CA');

// Game state saved to localStorage. Swap this hook for a server-backed one when accounts arrive.
export function useGame() {
  const [state, setState] = useState(NEW_GAME);
  const [loaded, setLoaded] = useState(false);
  const [day, setDay] = useState(today);
  // Latest state, updated synchronously, so two opens before a re-render can't both roll from the same state.
  const stateRef = useRef(state);

  const commit = useCallback(next => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) commit({ ...NEW_GAME, ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, [commit]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, loaded]);

  // Re-check the date while the tab stays open, so the daily button unlocks after midnight.
  useEffect(() => {
    const check = () => setDay(today());
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const openPack = useCallback(
    era => {
      if (stateRef.current.coins < PACK_COST) return null;
      const result = rollPack(stateRef.current, era);
      commit(result.state);
      return result.pulls;
    },
    [commit]
  );

  const claimDaily = useCallback(() => {
    const s = stateRef.current;
    const d = today();
    setDay(d);
    if (s.lastDaily === d) return false;
    commit({ ...s, coins: s.coins + DAILY_STARS, lastDaily: d });
    return true;
  }, [commit]);

  const reset = useCallback(() => commit(NEW_GAME), [commit]);

  return { state, loaded, openPack, claimDaily, reset, dailyClaimed: state.lastDaily === day };
}
