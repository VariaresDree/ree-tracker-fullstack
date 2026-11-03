// src/hooks/useHideOnScroll.js
//
// For the phone's bottom bar: out of the way while reading down a page, back
// on scrolling up, at the top and at the end of the page (where its room is
// kept clear, so it covers nothing), and on another page.
import { useEffect, useState } from 'react';

const NEAR_EDGE_PX = 96;
// A finger resting on the glass still scrolls a pixel or two.
const NOISE_PX = 8;

/** @param {string} page the current page; a new one brings the bar back */
export default function useHideOnScroll(page) {
  // The page it was hidden on rather than a flag, so moving to another page
  // shows it with no effect to reset it.
  const [hiddenOn, setHiddenOn] = useState(null);

  useEffect(() => {
    let last = window.scrollY;
    let queued = false;
    const settle = () => {
      queued = false;
      const y = Math.max(0, window.scrollY);
      const nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - NEAR_EDGE_PX;
      if (y < NEAR_EDGE_PX || nearEnd) {
        setHiddenOn(null);
        last = y;
        return;
      }
      if (Math.abs(y - last) < NOISE_PX) return;
      setHiddenOn(y > last ? page : null);
      last = y;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(settle);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [page]);

  return { hidden: hiddenOn === page, show: () => setHiddenOn(null) };
}
