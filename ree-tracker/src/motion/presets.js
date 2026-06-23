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
export function tickTo({ from, to, ms = 600, onUpdate, onDone }) {
  if (prefersReducedMotion()) {
    onUpdate?.(to);
    onDone?.();
    return () => {};
  }
  const start = performance.now();
  let raf = 0;
  const step = (now) => {
    const t = Math.min(1, (now - start) / ms);
    // outQuart easing
    const eased = 1 - Math.pow(1 - t, 4);
    onUpdate?.(from + (to - from) * eased);
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
