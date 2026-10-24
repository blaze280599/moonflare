'use client';

import { useCallback, useEffect, useState } from 'react';

// A per-viewer setting kept in localStorage, like sound on/off. It's read in an effect, never during
// render (the server can't see it), and storage that throws (private windows, blocked site data) just
// leaves the default in place.
export function usePref(key, fallback) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (typeof saved === typeof fallback) setValue(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    next => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
    },
    [key]
  );
  return [value, set];
}
