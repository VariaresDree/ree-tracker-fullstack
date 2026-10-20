// src/features/focus/ProgressRing.jsx
// The ring around the focus timer's digits: how much of the block has run,
// drawn in the mode's colour over a faint track. Decorative (the digits carry
// the time), so it's hidden from screen readers. The arc eases between the
// once-a-second updates, and holds still under reduced motion.
import { cn } from '../../components/ui';

const R = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * R;

// Strokes are fills, so the base colours (text uses the -text forms).
const STROKE = {
  focus: 'stroke-[var(--accent)]',
  short: 'stroke-[var(--accent-success)]',
  long: 'stroke-[var(--accent-signal)]',
  exam: 'stroke-[var(--color-reeAmber)]',
};

export default function ProgressRing({ progress = 0, mode = 'focus', children, className }) {
  const p = Math.min(1, Math.max(0, Number(progress) || 0));
  return (
    <div className={cn('relative grid place-items-center aspect-square w-[min(84vw,26rem,54dvh)]', className)}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="3" className="stroke-[var(--border-light)]" />
        <circle
          data-testid="focus-ring-arc"
          cx="60"
          cy="60"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap={p > 0 ? 'round' : 'butt'}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - p)}
          className={cn('transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none', STROKE[mode] || STROKE.focus)}
        />
      </svg>
      <div className="relative flex flex-col items-center text-center px-6">{children}</div>
    </div>
  );
}
