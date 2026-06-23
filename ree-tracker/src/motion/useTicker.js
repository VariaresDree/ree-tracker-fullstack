import { useEffect, useState, useRef } from 'react';
import { tickTo } from './presets';

// Animates a number from its previous value to `value` over `ms`.
// Returns the live value. Use for theta scores, hit-rate %, leaderboard ranks.
export function useTicker(value, ms = 600) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const cleanup = tickTo({
      from: prev.current,
      to: value,
      ms,
      onUpdate: setDisplay,
    });
    prev.current = value;
    return cleanup;
  }, [value, ms]);

  return display;
}
