import { cn } from './cn';

// A progress ring with its figure in the middle (the percent, unless given
// `children`). Plain SVG, so a screen using it needs no chart library. It carries
// its own numbers, so colour never holds the meaning alone. `done` turns it green.
export function Ring({ percent, label, size = 56, stroke = 6, done = false, children, className }) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const value = Math.round(percent);
  return (
    <span role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label} className={cn('relative shrink-0 inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
        {value > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? 'var(--accent-success)' : 'var(--accent)'} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(value / 100) * length} ${length}`} />
        )}
      </svg>
      <span aria-hidden="true" className="absolute text-xs font-semibold tabular-nums text-textMain">{children ?? `${value}%`}</span>
    </span>
  );
}

export default Ring;
