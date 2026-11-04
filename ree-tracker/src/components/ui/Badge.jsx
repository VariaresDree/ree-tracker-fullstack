import { cn } from './cn';

// Each label leans to the theme's text colour, on a light tint of its tone, the same
// as StatusPill: a stronger tint brings the background up towards the label, and "You"
// on Rankings read 4.25:1. themeContrast.test.js measures these numbers on every theme.
const tones = {
  neutral: 'bg-surface2 text-muted2 border-border',
  velocity:
    'bg-[color-mix(in_srgb,var(--accent-velocity)_8%,transparent)] text-[color-mix(in_srgb,var(--accent-text)_40%,var(--text-main))] border-[color-mix(in_srgb,var(--accent-velocity)_35%,transparent)]',
  signal:
    'bg-[color-mix(in_srgb,var(--accent-signal)_8%,transparent)] text-[color-mix(in_srgb,var(--accent-signal)_40%,var(--text-main))] border-[color-mix(in_srgb,var(--accent-signal)_35%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--accent-success)_8%,transparent)] text-[color-mix(in_srgb,var(--accent-success)_40%,var(--text-main))] border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)]',
  danger:
    'bg-[color-mix(in_srgb,var(--accent-danger)_8%,transparent)] text-[color-mix(in_srgb,var(--accent-danger)_40%,var(--text-main))] border-[color-mix(in_srgb,var(--accent-danger)_35%,transparent)]',
  // A conditional pass, "Today", "N marked".
  amber:
    'bg-[color-mix(in_srgb,var(--color-reeAmber)_8%,transparent)] text-[color-mix(in_srgb,var(--color-reeAmber-text)_40%,var(--text-main))] border-[color-mix(in_srgb,var(--color-reeAmber)_35%,transparent)]',
};

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 h-6 px-2 rounded-full border text-micro font-medium tracking-wide tabular-nums',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
