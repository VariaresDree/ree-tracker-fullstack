// src/hooks/useMediaQuery.js
//
// Live result of a CSS media query (false where matchMedia is unavailable).
import { useCallback, useSyncExternalStore } from 'react';

export default function useMediaQuery(query) {
  const subscribe = useCallback((onChange) => {
    const list = window.matchMedia?.(query);
    list?.addEventListener?.('change', onChange);
    return () => list?.removeEventListener?.('change', onChange);
  }, [query]);
  return useSyncExternalStore(
    subscribe,
    () => !!window.matchMedia?.(query)?.matches,
    () => false,
  );
}
