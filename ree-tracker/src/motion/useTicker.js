import { useEffect, useState, useRef } from 'react';
import { tickTo } from './presets';

// Animates a number from its previous value to `value` over `ms`.
// Returns the live value. Use for theta scores, hit-rate %, leaderboard ranks.
//
// `animateOnMount` counts up from zero the first time the value is shown.
// Off by default: for a number that is merely PRESENT on screen (a rank, a
// row count in a table) a spontaneous count-up is noise. Opt in for hero
// figures where the reveal is the point — see KpiTile.
//
// Without it this hook can never animate on first paint: `display` and `prev`
// both initialise to `value`, so the equality guard below short-circuits and
// the number simply appears. That's why the dashboard's headline KPIs looked
// static despite the ticker already being wired up here.
export function useTicker(value, ms = 600, { animateOnMount = false } = {}) {
  const initial = animateOnMount ? 0 : value;
  const [display, setDisplay] = useState(initial);
  const prev = useRef(initial);
  // Mirrors `display` synchronously so teardown can read where the animation
  // actually got to without depending on a state flush. Seeded from `initial`
  // rather than prev.current — reading one ref to initialise another during
  // render trips react-hooks/refs and isn't safe under concurrent rendering.
  const live = useRef(initial);

  useEffect(() => {
    if (prev.current === value) return undefined;
    const cleanup = tickTo({
      from: prev.current,
      to: value,
      ms,
      onUpdate: (v) => { live.current = v; setDisplay(v); },
      // Commit the destination only once it's actually been reached. Setting
      // prev synchronously at start (the original behaviour) meant React
      // StrictMode's double-invoked effect saw prev === value on its second
      // run and early-returned — while the FIRST run's animation had already
      // been cancelled by its cleanup. Nothing ever animated in dev; the bug
      // was invisible only because `display` used to initialise to the final
      // value, so the number looked right while silently never ticking.
      onDone: () => { prev.current = value; },
    });
    return () => {
      // Interrupted mid-flight (StrictMode remount, or the value changed
      // again) — resume from where we actually are rather than snapping.
      prev.current = live.current;
      cleanup();
    };
  }, [value, ms]);

  return display;
}
