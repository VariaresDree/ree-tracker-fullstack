import { cn } from './cn';

// Success and danger take a lighter tint than the rest: at 15% a results screen's
// verdict fell just under 4.5:1 (axe). Danger's text also leans to the theme's text
// colour, which raises its contrast in light and dark themes alike, on a card or a
// darker inset.
const tones = {
  neutral: 'bg-surface2 text-muted2 border-border',
  velocity:
    'bg-[color-mix(in_srgb,var(--accent-velocity)_15%,transparent)] text-[var(--accent-text)] border-[color-mix(in_srgb,var(--accent-velocity)_35%,transparent)]',
  signal:
    'bg-[color-mix(in_srgb,var(--accent-signal)_15%,transparent)] text-[var(--accent-signal)] border-[color-mix(in_srgb,var(--accent-signal)_35%,transparent)]',
  success:
    'bg-[color-mix(in_srgb,var(--accent-success)_12%,transparent)] text-[var(--accent-success)] border-[color-mix(in_srgb,var(--accent-success)_35%,transparent)]',
  danger:
    'bg-[color-mix(in_srgb,var(--accent-danger)_12%,transparent)] text-[color-mix(in_srgb,var(--accent-danger)_75%,var(--text-main))] border-[color-mix(in_srgb,var(--accent-danger)_35%,transparent)]',
  // A conditional pass, "Today", "N marked". Callers asked for it before it
  // existed, so those badges rendered with no colour at all.
  amber:
    'bg-[color-mix(in_srgb,var(--color-reeAmber)_15%,transparent)] text-[var(--color-reeAmber-text)] border-[color-mix(in_srgb,var(--color-reeAmber)_35%,transparent)]',
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
