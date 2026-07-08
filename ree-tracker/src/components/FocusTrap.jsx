// src/components/FocusTrap.jsx
import { useEffect, useRef } from 'react';

// Exclude disabled/hidden controls so the first/last wrap targets are real.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function FocusTrap({ children, active }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    // Remember what had focus so we can restore it when the trap deactivates.
    // Without this, closing a modal dropped keyboard / screen-reader users to
    // <body> (a WCAG 2.4.3 Focus Order failure).
    const previouslyFocused = document.activeElement;

    // Re-query on demand instead of snapshotting once at activation, so controls
    // added after mount (async content) are still trapped and a disabled first
    // element can't break the wrap.
    const getFocusable = () =>
      Array.from(ref.current?.querySelectorAll(FOCUSABLE) || []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    getFocusable()[0]?.focus();

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        // Preserved for dialogs that opt in with [data-close-modal]. The shared
        // Modal primitive owns its own Escape→onClose, so this is a harmless
        // no-op there.
        const closeButton = ref.current?.querySelector('[data-close-modal]');
        if (closeButton) closeButton.click();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      // Restore focus to the trigger (guard: it may have unmounted).
      if (
        previouslyFocused &&
        typeof previouslyFocused.focus === 'function' &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return <div ref={ref}>{children}</div>;
}
