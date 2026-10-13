// src/features/active-recall/QuestionTimer.jsx
//
// Time on the current Practice question. It owns its one-second tick and
// re-renders only itself; the session hook used to hold the count in state,
// so every second re-rendered the whole Practice page, the question's KaTeX
// included. Derived from the question's start time, so a throttled background
// tab shows the right value on its next tick. It stops (and holds its value)
// once the question is answered.
import { useEffect, useState } from 'react';
import { formatClock } from '../../utils/time';

// Past three minutes: the board's slowest pace for one item.
const SLOW_SECS = 180;

export default function QuestionTimer({ startedAt, running }) {
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (!running || !startedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);

  // A new question starts at 0 until its first tick.
  const secs = startedAt ? Math.max(0, Math.floor((Math.max(now, startedAt) - startedAt) / 1000)) : 0;
  const slow = secs > SLOW_SECS;
  return (
    <span
      className={`text-sm font-bold font-mono tabular-nums ${slow ? 'text-[var(--accent-danger)]' : 'text-textMain'}`}
      title={slow ? 'Over three minutes on this question' : undefined}
    >
      {formatClock(secs, { pad: true })}
    </span>
  );
}
