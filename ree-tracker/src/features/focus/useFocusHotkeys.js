// src/features/focus/useFocusHotkeys.js
// The focus timer's keys: Space starts or pauses, R resets, S skips, F toggles
// full screen, Escape closes the timer. They follow the app's one hotkey rule
// (utils/hotkeys: not while typing, not with Ctrl/Cmd/Alt, not under a dialog),
// and ignore a held key's repeats. Space also leaves a focused button, link,
// radio or select alone, so it presses what has focus instead of toggling the
// timer behind it.
import { useEffect, useRef } from 'react';
import { shouldIgnoreHotkey } from '../../utils/hotkeys';

const SPACE_OWNERS = 'button, a[href], select, summary, [role="button"], [role="radio"], [role="checkbox"], [role="switch"], [role="tab"], [role="link"]';

export function useFocusHotkeys(handlers) {
  const ref = useRef(handlers);
  useEffect(() => { ref.current = handlers; });

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat || e.defaultPrevented || shouldIgnoreHotkey(e)) return;
      const h = ref.current;
      if (e.key === ' ' || e.key === 'Spacebar') {
        const target = e.target instanceof Element ? e.target : null;
        if (target?.closest(SPACE_OWNERS)) return;
        e.preventDefault(); // and no page scroll
        h.onToggle?.();
        return;
      }
      if (e.key === 'Escape') { h.onExit?.(); return; }
      const key = e.key?.length === 1 ? e.key.toLowerCase() : '';
      if (key === 'r') { e.preventDefault(); h.onReset?.(); }
      else if (key === 's') { e.preventDefault(); h.onSkip?.(); }
      else if (key === 'f') { e.preventDefault(); h.onFullscreen?.(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
