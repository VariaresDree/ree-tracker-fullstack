// src/components/exam/PaceIndicator.jsx
//
// "On pace" / "Ahead by 4" / "Behind by 6" in the exam toolbar: answered items
// against where an even pace would have you by now. Like ExamClock it keeps its
// own clock (a 15-second tick) and re-renders only itself, so the question, its
// LaTeX and the navigator never re-render for it. Hidden with the timer.
import { useEffect, useState } from 'react';
import { StatusPill } from '../ui';
import { paceStatus } from '../../features/exams/pacing';

const TICK_MS = 15_000;

export default function PaceIndicator({ endTime, totalSecs, totalItems, answered, hidden = false }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endTime || hidden) return undefined;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [endTime, hidden]);

  if (!endTime || hidden) return null;
  const elapsedSecs = totalSecs - Math.max(0, (endTime - now) / 1000);
  const pace = paceStatus({ elapsedSecs, totalSecs, totalItems, answered });
  if (!pace) return null;

  const gap = Math.abs(pace.answered - pace.expected);
  const label = pace.status === 'onPace' ? 'On pace' : pace.status === 'ahead' ? `Ahead by ${gap}` : `Behind by ${gap}`;
  // The words go on a wider screen; a phone's one-row bar has room for the sign.
  const short = pace.status === 'onPace' ? null : pace.status === 'ahead' ? `+${gap}` : `−${gap}`;
  const tone = pace.status === 'behind' ? 'amber' : 'success';
  return (
    <span title={`At an even pace you'd have about ${pace.expected} answered by now.`}>
      <StatusPill tone={tone} className="tabular-nums">
        <span className={short ? 'max-sm:sr-only' : ''}>{label}</span>
        {short && <span aria-hidden="true" className="sm:hidden">{short}</span>}
      </StatusPill>
    </span>
  );
}
