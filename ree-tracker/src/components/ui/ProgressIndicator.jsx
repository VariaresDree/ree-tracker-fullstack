import { cn } from './cn';

// Accessible progress bar — the shared primitive for the quota/mastery/score
// bars that were hand-rolled per screen. `value`/`max` drive both the fill width
// and the ARIA (role=progressbar + aria-valuenow/min/max); `tone` (or an explicit
// `color` CSS value) tints it from the design-system accent vars.
const TONE_VAR = {
  velocity: 'var(--accent-velocity)',
  success: 'var(--accent-success)',
  danger: 'var(--accent-danger)',
  amber: 'var(--color-reeAmber)',
  signal: 'var(--accent-signal)',
};

const TRACK = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

export function ProgressIndicator({
  value = 0,
  max = 100,
  tone = 'velocity',
  color,
  label,
  ariaLabel,
  showValue = false,
  size = 'md',
  className,
}) {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const fill = color || TONE_VAR[tone] || TONE_VAR.velocity;

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1.5 text-[11px] text-muted2 tabular-nums">
          {label ? <span>{label}</span> : <span />}
          {showValue && <span>{Math.round(value)} / {max}</span>}
        </div>
      )}
      <div
        className={cn('w-full rounded-full overflow-hidden bg-surface3', TRACK[size] || TRACK.md)}
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: fill }}
        />
      </div>
    </div>
  );
}
