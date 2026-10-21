// src/components/focus/FocusLauncher.jsx
// The way into the full-screen focus timer (/focus), where the sidebar's
// timer card and the phone header's timer dialog used to be.
//   row     the expanded sidebar: "Focus timer · 25:00", or the mode and the
//           time left while a block runs
//   icon    the collapsed sidebar: the timer icon, with a dot while running
//   header  the phone header: the same icon (no time: it would crowd 360px)
// It reads the timer itself, so the sidebar doesn't re-render every second,
// and only the row ticks, only while running. Each link remembers the page it
// was opened from, for the timer's Close.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { MODE_LABEL, remainingSecs } from '../../utils/pomodoroLogic';
import { formatClock } from '../../utils/time';
import { cn } from '../ui';
import { Timer } from '../ui/icons';

// The running dot: a fill, so the base colours.
const DOT = {
  focus: 'bg-[var(--accent)]',
  short: 'bg-[var(--accent-success)]',
  long: 'bg-[var(--accent-success)]',
  exam: 'bg-[var(--color-reeAmber)]',
};

function RunningDot({ mode, className }) {
  return (
    <span
      aria-hidden="true"
      data-testid="focus-running-dot"
      className={cn('absolute w-2 h-2 rounded-full ring-2 ring-[var(--bg-surface)] motion-safe:animate-pulse', DOT[mode] || DOT.focus, className)}
    />
  );
}

export default function FocusLauncher({ variant = 'row' }) {
  const location = useLocation();
  const pomodoro = useStore((s) => s.pomodoro);
  const running = !!pomodoro?.isRunning;
  const [, tick] = useState(0);

  useEffect(() => {
    if (variant !== 'row' || !running) return undefined;
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [variant, running]);

  const state = { from: location.pathname + location.search };

  if (variant === 'row') {
    return (
      // Named by what it shows (WCAG 2.5.3, so a voice user can say what they
      // see), with "Focus timer" spoken first while the row shows a mode.
      <Link
        to="/focus"
        state={state}
        className="group flex w-full items-center gap-3 rounded-[var(--radius-default)] px-3 py-2 text-sm text-textMain hover:bg-surface2 transition-colors pointer-coarse:min-h-11"
      >
        <span className="relative shrink-0 inline-flex">
          <Timer size={18} strokeWidth={1.75} aria-hidden="true" className="opacity-70 group-hover:opacity-100" />
          {running && <RunningDot mode={pomodoro.mode} className="-top-0.5 -right-0.5" />}
        </span>
        <span className="font-medium truncate">
          {running && <span className="sr-only">Focus timer, </span>}
          {running ? MODE_LABEL[pomodoro.mode] : 'Focus timer'}
        </span>
        <span className="ml-auto font-mono tabular-nums text-xs text-muted2">{formatClock(remainingSecs(pomodoro))}</span>
      </Link>
    );
  }

  return (
    <Link
      to="/focus"
      state={state}
      aria-label="Focus timer"
      title={variant === 'icon' ? 'Focus timer' : undefined}
      className={cn(
        'relative inline-flex items-center justify-center text-muted hover:text-textMain transition-colors touch-target',
        variant === 'icon'
          ? 'w-10 h-10 rounded-full bg-surface2 hover:bg-surface3 border border-border2'
          : 'w-9 h-9 rounded-[var(--radius-default)] hover:bg-surface2',
      )}
    >
      <Timer size={variant === 'icon' ? 18 : 20} strokeWidth={1.75} aria-hidden="true" />
      {running && <RunningDot mode={pomodoro.mode} className="top-1 right-1" />}
    </Link>
  );
}
