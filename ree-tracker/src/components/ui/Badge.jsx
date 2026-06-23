import { cn } from './cn';

const tones = {
  neutral: 'bg-surface2 text-muted2 border-border',
  velocity:
    'bg-[color-mix(in_srgb,var(--accent-velocity)_15%,transparent)] text-[var(--accent-velocity)] border-[color-mix(in_srgb,var(--accent-velocity)_35%,transparent)]',
  signal:
    'bg-[color-mix(in_srgb,var(--accent-signal)_15%,transparent)] text-[var(--accent-signal)] border-[color-mix(in_srgb,var(--accent-signal)_35%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--accent-success)_15%,transparent)] text-[var(--accent-success)] border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)]',
  danger:
    'bg-[color-mix(in_srgb,var(--accent-danger)_15%,transparent)] text-[var(--accent-danger)] border-[color-mix(in_srgb,var(--accent-danger)_35%,transparent)]',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-medium tracking-wide',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
