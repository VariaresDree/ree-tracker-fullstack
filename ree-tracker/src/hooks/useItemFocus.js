// src/hooks/useItemFocus.js
//
// Moving to another item starts you at its top, with focus on it. Nothing did
// this: under a long solution, Next left you staring at the middle of the next
// question, and the button that had focus was gone, which dropped a keyboard or
// screen-reader user back to the top of the page.
//
// Put the ref and ITEM_FOCUS_CLASS on the element holding the item.
import { useEffect, useRef } from 'react';

// Clears the session bar when it scrolls to the top.
export const ITEM_FOCUS_CLASS = 'min-w-0 outline-hidden scroll-mt-[calc(var(--sticky-top,0.75rem)+4rem)]';

export function useItemFocus(itemKey) {
  const ref = useRef(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const el = ref.current;
    if (!el) return;
    // Only when its top has gone past the bar: on a wide screen the navigator
    // sits above it, and jumping would push that out of view on every item.
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (el.getBoundingClientRect().top < margin) el.scrollIntoView?.({ block: 'start' });
    // A control inside it may have taken focus already (Flashcards do).
    if (!el.contains(document.activeElement)) el.focus?.({ preventScroll: true });
  }, [itemKey]);
  return ref;
}
