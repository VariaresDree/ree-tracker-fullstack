// Central motion presets. Dependency-free so primitives can adopt them
// without pulling Framer Motion. When we add `motion` (Framer successor)
// for orchestrated transitions, these tokens stay the source of truth.

export const easing = {
  springSoft: 'cubic-bezier(0.34, 1.2, 0.64, 1)',
  springSnap: 'cubic-bezier(0.5, 1.7, 0.5, 1)',
  outQuart: 'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

export const duration = {
  fast: 120,
  base: 220,
  slow: 420,
};

// Inline-style helper — `transition: applyTransition('transform', 'springSoft')`
export const applyTransition = (prop = 'all', curve = 'outQuart', d = 'base') =>
  `${prop} ${duration[d]}ms ${easing[curve]}`;

// Reduced-motion gate — components call this to short-circuit animations.
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Number ticker — smoothly animates a numeric value over `ms`.
// Returns a cleanup function. Use in useEffect.
//
// Correctness beats smoothness here: this drives numbers a user reads (KPIs,
// scores, ranks), so it must be IMPOSSIBLE for the animation to strand the UI
// on a wrong value. requestAnimationFrame is not guaranteed to run — browsers
// suspend it in background/hidden tabs, and some embedded webviews never
// composite at all (observed directly: 0 frames in 40s in an automated pane).
// Without the watchdog below, a dashboard opened in a background tab would sit
// at its starting value indefinitely. The watchdog force-settles on the real
// value if the rAF loop hasn't finished in time; if rAF is healthy it always
// wins the race and the watchdog is a no-op.
const TICK_WATCHDOG_SLACK = 250;

export function tickTo({ from, to, ms = 600, onUpdate, onDone }) {
  if (prefersReducedMotion()) {
    onUpdate?.(to);
    onDone?.();
    return () => {};
  }
  const start = performance.now();
  let raf = 0;
  let settled = false;

  const settle = () => {
    if (settled) return;
    settled = true;
    onUpdate?.(to);
    onDone?.();
  };

  const step = (now) => {
    if (settled) return;
    const t = Math.min(1, (now - start) / ms);
    // outQuart easing
    const eased = 1 - Math.pow(1 - t, 4);
    onUpdate?.(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(step);
    else settle();
  };

  raf = requestAnimationFrame(step);
  // setTimeout keeps firing where rAF is suspended, so it can rescue the value.
  const watchdog = setTimeout(settle, ms + TICK_WATCHDOG_SLACK);

  return () => {
    settled = true;
    cancelAnimationFrame(raf);
    clearTimeout(watchdog);
  };
}
