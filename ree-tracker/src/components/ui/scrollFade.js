// src/components/ui/scrollFade.js
//
// The fade on a sideways strip's edges where there is more to scroll to. A mask
// on the strip, not a band painted in the page colour on top, so it fades into
// whatever is behind: the page's texture, or a card.
import { useCallback, useEffect, useState } from 'react';

const FADE = '2rem';
export const FADE_PX = 32;

export const fadeName = ({ left, right }) => (left && right ? 'both' : left ? 'left' : right ? 'right' : undefined);

export function fadeMask({ left, right }) {
  if (!left && !right) return undefined;
  const mask = `linear-gradient(to right, ${left ? 'transparent' : '#000'}, #000 ${left ? FADE : '0px'}, #000 calc(100% - ${right ? FADE : '0px'}), ${right ? 'transparent' : '#000'})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

/** Which edges of `el` have more beyond them. */
export function readFades(el) {
  return {
    left: el.scrollLeft > 4,
    right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
  };
}

/** Tracks the fades for a strip: `onScroll` goes on it, and a resize is noticed. */
export function useScrollFades(ref) {
  const [fade, setFade] = useState({ left: false, right: false });
  const onScroll = useCallback(() => {
    if (!ref.current) return;
    const next = readFades(ref.current);
    setFade((f) => (f.left === next.left && f.right === next.right ? f : next));
  }, [ref]);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(onScroll);
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, onScroll]);
  return { fade, onScroll };
}
