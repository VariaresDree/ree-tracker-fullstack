import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { cn } from './cn';
import { prefersReducedMotion } from '../../motion/presets';

// Page-level tab row (Exams, Progress, Library, Admin, a sitting review). Real
// tablist semantics with arrow-key movement, 44px touch targets, and
// horizontal scroll on narrow screens.
//
// On a phone the row is wider than the screen (Progress has seven tabs), and
// nothing showed that it scrolled: the edges now fade where there is more,
// and the active tab is scrolled into view, so a deep link to the last tab
// doesn't open with it off-screen. Each tab names its panel (`id`, shared
// with <TabPanel>), so a screen reader can go from the tab to its content.
//
// The fade is a mask on the strip, not a band painted in the page colour on
// top, so it fades into whatever is behind: the page's texture, or a card.
const FADE = '2rem';
const fadeName = ({ left, right }) => (left && right ? 'both' : left ? 'left' : right ? 'right' : undefined);
function fadeMask({ left, right }) {
  if (!left && !right) return undefined;
  const mask = `linear-gradient(to right, ${left ? 'transparent' : '#000'}, #000 ${left ? FADE : '0px'}, #000 calc(100% - ${right ? FADE : '0px'}), ${right ? 'transparent' : '#000'})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

export function Tabs({ tabs, active, onChange, label, className, id: idProp }) {
  const autoId = useId();
  const id = idProp || autoId;
  const refs = useRef([]);
  const stripRef = useRef(null);
  const [fade, setFade] = useState({ left: false, right: false });
  // The active tab's underline: one bar that slides between tabs (a
  // transform: a 1px bar moved and stretched), placed without a slide the
  // first time.
  const [bar, setBar] = useState(null);
  const [slide, setSlide] = useState(false);
  const idx = tabs.findIndex((t) => t.id === active);

  // Reads the active index from a ref, so the resize observer (set up once)
  // places the bar for whichever tab is active by then.
  const activeIdx = useRef(idx);
  const placeBar = useCallback(() => {
    const tab = refs.current[activeIdx.current];
    if (!tab) {
      setBar(null);
      return;
    }
    const next = { x: tab.offsetLeft, w: tab.offsetWidth };
    setBar((b) => (b && b.x === next.x && b.w === next.w ? b : next));
  }, []);
  useLayoutEffect(() => {
    activeIdx.current = idx;
    placeBar();
  });
  useEffect(() => {
    if (!bar || slide) return undefined;
    const raf = requestAnimationFrame(() => setSlide(true));
    return () => cancelAnimationFrame(raf);
  }, [bar, slide]);

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
    const ro = new ResizeObserver(() => { measure(); placeBar(); });
    ro.observe(el);
    // The tabs too: their widths change when the web font arrives (it loads
    // after first paint), which doesn't resize the strip, and the bar stayed
    // at the fallback font's positions.
    refs.current.forEach((tab) => tab && ro.observe(tab));
    return () => ro.disconnect();
  }, [placeBar, tabs.length]);

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
        data-fade={fadeName(fade)}
        // No scrollbar track under the strip (arrow keys move between tabs,
        // and touch scrolls it).
        className="relative flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={fadeMask(fade)}
      >
        {bar && (
          <span
            aria-hidden="true"
            data-indicator=""
            className={cn(
              'pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left bg-[var(--accent)] forced-colors:hidden',
              slide && 'transition-transform duration-200 ease-out'
            )}
            style={{ transform: `translateX(${bar.x}px) scaleX(${bar.w})` }}
          />
        )}
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
                'rounded-t-[var(--radius-default)] transition-colors border-b-2 border-transparent -mb-px',
                on
                  // Forced colours drop the bar's background: the tab's own
                  // border marks it there.
                  ? 'text-[var(--accent-text)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] forced-colors:border-[Highlight]'
                  : 'text-muted2 hover:text-textMain hover:bg-surface2'
              )}
            >
              {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The content under <Tabs>, labelled by the active tab. Pass the same `id`.
 * A new tab's content fades in (180ms, not under reduced motion), on the
 * same element: no remount, so nothing inside resets.
 */
export function TabPanel({ id, active, className, children }) {
  const ref = useRef(null);
  const shown = useRef(active);
  useEffect(() => {
    if (shown.current === active) return;
    shown.current = active;
    if (prefersReducedMotion()) return;
    ref.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }, [active]);
  return (
    <div ref={ref} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} className={className}>
      {children}
    </div>
  );
}
