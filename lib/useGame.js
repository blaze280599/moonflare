'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buyPack as buyPackAction,
  claimDaily as claimDailyAction,
  openPack as openPackAction,
  reset as resetAction,
  saveToploader as saveToploaderAction,
  setBias as setBiasAction,
  setTimeZone
} from '@/app/actions/game';
import { CARD_BY_ID, ERAS } from './cards.js';
import { NEW_GAME } from './gacha.js';
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

  // Resolves to { ok: true } or { error }: 'not_enough_stars', 'event_closed', 'too_many_packs' or text to show.
  const buyPack = useCallback(
    async kind => {
      const res = await run(() => buyPackAction(kind));
      return res.error ? { error: res.error } : { ok: true };
    },
    [run]
  );

  // Opens a pack from the inventory, or buys and opens one with `buy`. Resolves to { era, pulls } or { error }:
  // the buyPack errors, 'no_pack', or text to show.
  const openPack = useCallback(
    async (kind, { buy = false } = {}) => {
      const res = await run(() => openPackAction(kind, { buy }));
      if (res.error) return { error: res.error };
      return {
        era: ERAS.find(e => e.code === res.era),
        pulls: res.pulls.map(p => ({ card: CARD_BY_ID[p.id], isNew: p.isNew, refund: p.refund }))
      };
    },
    [run]
  );

  // Resolves to { ok: true } or { error }. error is 'already_claimed' if today's reward was taken.
  const claimDaily = useCallback(async () => {
    setDay(dateInZone(new Date(), timeZone));
    const res = await run(claimDailyAction);
    return res.error ? { error: res.error } : { ok: true };
  }, [run, timeZone]);

  const reset = useCallback(async () => {
    const res = await run(resetAction);
    return res.error ? { error: res.error } : { ok: true };
  }, [run]);

  // `member` is a member object, or null for no bias. Resolves to { ok: true } or { error }.
  const setBias = useCallback(
    async (group, member) => {
      const res = await run(() => setBiasAction(group.code, member?.code ?? null));
      return res.error ? { error: res.error } : { ok: true };
    },
    [run]
  );

  // Resolves to { ok: true } or { error } ('not_owned', 'too_many', or text to show).
  const saveToploader = useCallback(
    async (cardId, toploader) => {
      const res = await run(() => saveToploaderAction(cardId, toploader));
      return res.error ? { error: res.error } : { ok: true };
    },
    [run]
  );

  return { state, loaded, buyPack, openPack, claimDaily, reset, setBias, saveToploader, dailyClaimed: state.lastDaily === day, commit, run };
}
