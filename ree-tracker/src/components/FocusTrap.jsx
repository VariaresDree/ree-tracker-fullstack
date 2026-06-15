// src/components/FocusTrap.jsx
import { useEffect, useRef } from 'react';

export default function FocusTrap({ children, active }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;

    const focusable = ref.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable?.length) {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      first.focus();

      const handleTab = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      };

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          // Optional: trigger close function – but we'll let parent handle via state
          const closeButton = ref.current?.querySelector('[data-close-modal]');
          if (closeButton) closeButton.click();
        }
      };

      document.addEventListener('keydown', handleTab);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleTab);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [active]);

  return <div ref={ref}>{children}</div>;
}