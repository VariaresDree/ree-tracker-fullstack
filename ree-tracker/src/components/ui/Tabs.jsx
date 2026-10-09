import { useEffect, useId, useRef, useState } from 'react';
import { cn } from './cn';

// Page-level tab row (Exams, Progress, Library, Admin, a sitting review). Real
// tablist semantics with arrow-key movement, 44px touch targets, and
// horizontal scroll on narrow screens.
//
// On a phone the row is wider than the screen (Progress has seven tabs), and
// nothing showed that it scrolled: the edges now fade where there is more,
// and the active tab is scrolled into view, so a deep link to the last tab
// doesn't open with it off-screen. Each tab names its panel (`id`, shared
// with <TabPanel>), so a screen reader can go from the tab to its content.
export function Tabs({ tabs, active, onChange, label, className, id: idProp }) {
  const autoId = useId();
  const id = idProp || autoId;
  const refs = useRef([]);
  const stripRef = useRef(null);
  const [fade, setFade] = useState({ left: false, right: false });
  const idx = tabs.findIndex((t) => t.id === active);

  const measure = () => {
    const el = stripRef.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setFade((f) => (f.left === left && f.right === right ? f : { left, right }));
  };

  // ResizeObserver reports once on observe, so the fades are right from the
  // first paint and after a rotation.
  useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the active tab in view. scrollTo on the strip, not scrollIntoView,
  // which would also scroll the page.
  useEffect(() => {
    const el = stripRef.current;
    const tab = refs.current[idx];
    if (!el || !tab) return;
    const start = tab.offsetLeft;
    const end = start + tab.offsetWidth;
    if (start < el.scrollLeft || end > el.scrollLeft + el.clientWidth) {
      el.scrollTo?.({ left: Math.max(0, start - 24), behavior: 'smooth' });
    }
  }, [idx]);

  const move = (delta) => {
    if (!tabs.length) return;
    const next = (idx + delta + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(-idx);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(tabs.length - 1 - idx);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div
        ref={stripRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        onScroll={measure}
        // No scrollbar track under the strip (arrow keys move between tabs,
        // and touch scrolls it).
        className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t, i) => {
          const on = t.id === active;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`${id}-tab-${t.id}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              tabIndex={on ? 0 : -1}
              ref={(el) => (refs.current[i] = el)}
              onClick={() => onChange(t.id)}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap min-h-11 px-4 text-sm font-medium',
                'rounded-t-[var(--radius-default)] transition-colors border-b-2 -mb-px',
                on
                  ? 'text-[var(--accent-text)] border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)]'
                  : 'text-muted2 border-transparent hover:text-textMain hover:bg-surface2'
              )}
            >
              {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
              {t.label}
            </button>
          );
        })}
      </div>
      {fade.left && (
        <span aria-hidden="true" data-fade="left" className="pointer-events-none absolute left-0 top-0 bottom-px w-8" style={{ background: 'linear-gradient(to right, var(--bg-primary), transparent)' }} />
      )}
      {fade.right && (
        <span aria-hidden="true" data-fade="right" className="pointer-events-none absolute right-0 top-0 bottom-px w-8" style={{ background: 'linear-gradient(to left, var(--bg-primary), transparent)' }} />
      )}
    </div>
  );
}

/** The content under <Tabs>, labelled by the active tab. Pass the same `id`. */
export function TabPanel({ id, active, className, children }) {
  return (
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} className={className}>
      {children}
    </div>
  );
}
