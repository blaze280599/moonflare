'use client';

import { useEffect, useState } from 'react';

// The current time, re-read every `every` ms. Starts from the render's own clock (the server's during SSR),
// so an event's phase renders the same on both sides; mark countdown text suppressHydrationWarning.
export function useNow(every = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, every);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [every]);
  return now;
}
