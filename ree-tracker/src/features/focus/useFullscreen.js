// src/features/focus/useFullscreen.js
// Full screen for the focus timer: the whole page (documentElement), so the
// theme's background comes along. `supported` is false where the browser
// can't (iPhone Safari, most WebViews), and the button isn't offered there.
// Leaving the page leaves full screen, if this hook entered it.
import { useCallback, useEffect, useRef, useState } from 'react';

const isSupported = () => typeof document !== 'undefined'
  && !!document.fullscreenEnabled
  && typeof document.documentElement?.requestFullscreen === 'function';

export function useFullscreen() {
  const [supported] = useState(isSupported);
  const [active, setActive] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  const entered = useRef(false);

  useEffect(() => {
    if (!supported) return undefined;
    const onChange = () => {
      const on = !!document.fullscreenElement;
      if (!on) entered.current = false;
      setActive(on);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (entered.current && document.fullscreenElement) {
        try { document.exitFullscreen?.()?.catch?.(() => {}); } catch { /* already out */ }
      }
    };
  }, [supported]);

  const toggle = useCallback(() => {
    if (!supported) return;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen()?.catch?.(() => {});
      } else {
        entered.current = true;
        document.documentElement.requestFullscreen()?.catch?.(() => { entered.current = false; });
      }
    } catch {
      entered.current = false;
    }
  }, [supported]);

  return { supported, active, toggle };
}
