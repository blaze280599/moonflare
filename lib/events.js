// Comeback events: limited-time albums. An event album is an ordinary era in ERAS (lib/cards.js) with an
// `event: { starts, ends, blurb }` window. Pure helpers only, so the server action, the UI and the tests share them.
// The server decides whether an album is open (openPack in app/actions/game.js); the browser only counts down.

const ms = t => (typeof t === 'number' ? t : Date.parse(t));

// 'upcoming' before `starts`, 'live' from `starts` until just before `ends`, then 'ended'. Standard albums are always 'open'.
export function eventPhase(era, now) {
  if (!era.event) return 'open';
  if (now < ms(era.event.starts)) return 'upcoming';
  if (now < ms(era.event.ends)) return 'live';
  return 'ended';
}

export function canOpenEra(era, now) {
  const phase = eventPhase(era, now);
  return phase === 'open' || phase === 'live';
}

// Milliseconds until the next change: the start of an upcoming event or the end of a live one. 0 otherwise.
export function msUntilChange(era, now) {
  const phase = eventPhase(era, now);
  if (phase === 'upcoming') return ms(era.event.starts) - now;
  if (phase === 'live') return ms(era.event.ends) - now;
  return 0;
}

// "3d 4h" for a day or more, "5h 02m 09s" under a day, "4m 09s" under an hour.
export function formatCountdown(left) {
  const s = Math.max(0, Math.floor(left / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = n => String(n).padStart(2, '0');
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${pad(m)}m ${pad(s % 60)}s`;
  return `${m}m ${pad(s % 60)}s`;
}
