// src/hooks/useDragScroll.js
//
// Lets a mouse drag a sideways strip. Touch pans these by itself and a trackpad
// scrolls them, but browsers don't pan on a mouse drag, and with the scrollbar
// hidden (Account's jump links, page tabs) a mouse had no way to reach what's
// off the edge. Spread the result on the element that scrolls.
//
// It listens on the window from the press on, so a drag that leaves the strip
// keeps going, and it adds nothing until a mouse is actually pressed.
import { useState } from 'react';

// Past this, a press is a drag and not a click on whatever is under it.
const THRESHOLD_PX = 5;

function createHandlers() {
  let dragged = false;
  return {
    onPointerDown(e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const el = e.currentTarget;
      if (el.scrollWidth <= el.clientWidth) return;
      const startX = e.clientX;
      const startLeft = el.scrollLeft;
      dragged = false;
      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        if (!dragged && Math.abs(dx) < THRESHOLD_PX) return;
        if (!dragged) {
          dragged = true;
          // The exam navigator is scroll-smooth, which would make the strip lag
          // behind the mouse.
          el.style.scrollBehavior = 'auto';
          el.style.userSelect = 'none';
        }
        el.scrollLeft = startLeft - dx;
      };
      const onEnd = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        el.style.scrollBehavior = '';
        el.style.userSelect = '';
        // The click from this press lands right after the release and is
        // swallowed below. Then it resets, or the next key press on a link
        // would be taken for that click.
        setTimeout(() => { dragged = false; }, 0);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    },
    onClickCapture(e) {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
    },
    // A link pressed and dragged starts the browser's own link drag, which
    // cancels the pointer events this depends on.
    onDragStart(e) {
      e.preventDefault();
    },
  };
}

export function useDragScroll() {
  const [handlers] = useState(createHandlers);
  return handlers;
}
