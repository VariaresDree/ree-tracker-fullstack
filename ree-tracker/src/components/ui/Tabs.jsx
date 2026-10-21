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
//
// The row hangs 1rem into the page gutter on each side (-mx-4, the tab's own
// inset), so the first label lines up with the page title above and the
// cards below, and on a phone the strip scrolls out to the screen edge. The
// rule under it stays at the content width.
const FADE = '2rem';
const FADE_PX = 32;
const fadeName = ({ left, right }) => (left && right ? 'both' : left ? 'left' : right ? 'right' : undefined);
function fadeMask({ left, right }) {
  if (!left && !right) return undefined;
  const mask = `linear-gradient(to right, ${left ? 'transparent' : '#000'}, #000 ${left ? FADE : '0px'}, #000 calc(100% - ${right ? FADE : '0px'}), ${right ? 'transparent' : '#000'})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

// Where to scroll the strip so the tab is clear of the fades, or null if it
// already is. The fade only covers an edge that has more beyond it.
function scrollTargetFor({ start, end, scrollLeft, clientWidth, scrollWidth }) {
  const max = Math.max(0, scrollWidth - clientWidth);
  const leftEdge = scrollLeft + (scrollLeft > 0 ? FADE_PX : 0);
  const rightEdge = scrollLeft + clientWidth - (scrollLeft < max ? FADE_PX : 0);
  if (start < leftEdge) return Math.max(0, start - FADE_PX);
  if (end > rightEdge) return Math.min(max, end - clientWidth + FADE_PX);
  return null;
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
  // places the bar for whichever tab is active by then. The bar spans the
  // tab's label (icon and text), not its padded box: it lines up with the
  // text, and with the rule under the row.
  const activeIdx = useRef(idx);
  const placeBar = useCallback(() => {
    const tab = refs.current[activeIdx.current];
    if (!tab) {
      setBar(null);
      return;
    }
    // The strip is the label's offsetParent too (the tab isn't positioned),
    // so its offsetLeft is already in the strip's coordinates.
    const label = tab.querySelector('[data-tab-label]') || tab;
    const next = { x: label.offsetLeft, w: label.offsetWidth };
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

  // Keep the active tab in view, clear of the fades. scrollTo on the strip,
  // not scrollIntoView, which would also scroll the page. A tap glides
  // (unless motion is reduced); a deep link or a resize just jumps.
  const keepInView = useCallback((glide) => {
    const el = stripRef.current;
    const tab = refs.current[activeIdx.current];
    if (!el || !tab) return;
    const left = scrollTargetFor({
      start: tab.offsetLeft,
      end: tab.offsetLeft + tab.offsetWidth,
      scrollLeft: el.scrollLeft,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
    });
    if (left != null) el.scrollTo?.({ left, behavior: glide && !prefersReducedMotion() ? 'smooth' : 'auto' });
  }, []);

  // ResizeObserver reports once on observe, so the fades are right from the
  // first paint and after a rotation.
  useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => { measure(); placeBar(); keepInView(false); });
    ro.observe(el);
    // The tabs too: their widths change when the web font arrives (it loads
    // after first paint), which doesn't resize the strip, and the bar stayed
    // at the fallback font's positions (and a deep-linked last tab could be
    // pushed back under the fade).
    refs.current.forEach((tab) => tab && ro.observe(tab));
    return () => ro.disconnect();
  }, [placeBar, keepInView, tabs.length]);

  const shown = useRef(false);
  useEffect(() => {
    keepInView(shown.current);
    shown.current = true;
  }, [idx, keepInView]);

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
    <div className={cn('relative -mx-4', className)}>
      {/* The rule under the row: a border, so forced colours keep it. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-0 border-b border-border" />
      <div
        ref={stripRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        onScroll={measure}
        data-fade={fadeName(fade)}
        // No scrollbar track under the strip (arrow keys move between tabs,
        // and touch scrolls it). overflow-y-hidden: with only x set, the
        // browser makes y auto too, and the row could be nudged a pixel up
        // and down. A sideways swipe that runs out stops here, not in the
        // browser's back gesture.
        className="relative flex gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={fadeMask(fade)}
      >
        {bar && (
          <span
            aria-hidden="true"
            data-indicator=""
            className={cn(
              'pointer-events-none absolute bottom-0 left-0 h-0.5 w-px origin-left rounded-full bg-[var(--accent)] forced-colors:hidden',
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
                'shrink-0 inline-flex items-center whitespace-nowrap min-h-11 px-4 text-sm',
                // The hover tint is mouse-only (Tailwind's hover: is a
                // (hover: hover) query), so it doesn't stick after a tap.
                'rounded-t-[var(--radius-default)] transition-colors border-b-2 border-transparent',
                on
                  // Forced colours drop the bar's background: the tab's own
                  // border marks it there.
                  ? 'text-[var(--accent-text)] font-semibold forced-colors:border-[Highlight]'
                  : 'text-muted2 font-medium hover:text-textMain hover:bg-surface2'
              )}
            >
              <span data-tab-label="" className="inline-flex items-center gap-2">
                {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
                {/* The bold active label is as wide as the regular one: a
                    hidden bold copy (generated content with empty alt text,
                    so never part of the tab's name; index.css
                    .tab-label-width) sets the width, and the row doesn't
                    shift when the active tab changes. */}
                <span data-text={t.label} className="tab-label-width inline-flex flex-col items-center">
                  {t.label}
                </span>
              </span>
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
