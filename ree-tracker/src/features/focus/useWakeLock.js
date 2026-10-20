// src/features/focus/useWakeLock.js
// Keeps the screen on while `active` (a paper exam running on /focus): a phone
// propped beside the answer sheet would otherwise lock mid-section. The browser
// drops the lock whenever the page is hidden, so it's asked for again when the
// page comes back. Where the Screen Wake Lock API is missing, or refuses (low
// battery, no permission), nothing happens.
import { useEffect } from 'react';

export function useWakeLock(active) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || typeof navigator.wakeLock?.request !== 'function') return undefined;
    let sentinel = null;
    let pending = false;
    let done = false;

    const release = (s) => {
      try { s?.release?.()?.catch?.(() => {}); } catch { /* already released */ }
    };
    const request = async () => {
      if (done || pending || sentinel || document.visibilityState !== 'visible') return;
      pending = true;
      try {
        const s = await navigator.wakeLock.request('screen');
        if (done) { release(s); return; }
        sentinel = s;
        s?.addEventListener?.('release', () => { if (sentinel === s) sentinel = null; });
      } catch {
        /* refused: the screen may sleep */
      } finally {
        pending = false;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') request();
    };

    request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const s = sentinel;
      sentinel = null;
      release(s);
    };
  }, [active]);
}
