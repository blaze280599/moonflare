'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { claimDaily as claimDailyAction, openPack as openPackAction, reset as resetAction, setTimeZone } from '@/app/actions/game';
import { CARD_BY_ID } from './cards.js';
import { NEW_GAME, PACK_COST } from './gacha.js';
import { dateInZone, isTimeZone } from './save.js';

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Game state backed by the player's save in Supabase. `initial` is what the (game) layout read on the server
// (getGame in lib/supabase/server.js), or null if it couldn't. Every change runs in a Server Action
// (app/actions/game.js) and the hook adopts the state the server sends back; nothing is rolled in the browser.
export function useGame(initial) {
  const [state, setState] = useState(initial?.state ?? NEW_GAME);
  const loaded = Boolean(initial);
  // The zone the server uses for the daily reward. Older accounts have none until this browser fills it in.
  const [timeZone, setZone] = useState(initial?.timeZone ?? null);
  const [day, setDay] = useState(() => dateInZone(new Date(), timeZone));
  // Latest state, updated synchronously, so code reading it right after an action sees the new save.
  const stateRef = useRef(state);
  // Actions run one at a time, so a double-tapped "Open another" can't apply two answers out of order.
  const queue = useRef(Promise.resolve());

  const commit = useCallback(next => {
    stateRef.current = next;
    setState(next);
  }, []);

  const run = useCallback(
    action =>
      (queue.current = queue.current.then(async () => {
        let res;
        try {
          res = await action();
        } catch {
          res = { error: 'Couldn’t reach the save server. Try again.' };
        }
        if (res?.state) commit(res.state);
        return res;
      })),
    [commit]
  );

  useEffect(() => {
    if (!loaded || initial.timeZone) return;
    const tz = browserZone();
    if (!isTimeZone(tz)) return;
    setZone(tz);
    setTimeZone(tz).catch(() => {});
  }, [loaded, initial]);

  // Re-check the date while the tab stays open, so the daily button unlocks after midnight.
  useEffect(() => {
    const check = () => setDay(dateInZone(new Date(), timeZone));
    check();
    const id = setInterval(check, 60_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
    };
  }, [timeZone]);

  // Resolves to { pulls } or { error }. error is 'not_enough_stars' when the player can't afford it.
  const openPack = useCallback(
    async era => {
      if (stateRef.current.coins < PACK_COST) return { error: 'not_enough_stars' };
      const res = await run(() => openPackAction(era.code));
      if (res.error) return { error: res.error };
      return { pulls: res.pulls.map(p => ({ card: CARD_BY_ID[p.id], isNew: p.isNew, refund: p.refund })) };
    },
    [run]
  );

  // Resolves to { ok: true } or { error }. error is 'already_claimed' if today's stars were taken.
  const claimDaily = useCallback(async () => {
    setDay(dateInZone(new Date(), timeZone));
    const res = await run(claimDailyAction);
    return res.error ? { error: res.error } : { ok: true };
  }, [run, timeZone]);

  const reset = useCallback(async () => {
    const res = await run(resetAction);
    return res.error ? { error: res.error } : { ok: true };
  }, [run]);

  return { state, loaded, openPack, claimDaily, reset, dailyClaimed: state.lastDaily === day, commit, run };
}
