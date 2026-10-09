import { cn } from './cn';

// The tinted square an icon sits in at the head of a card or option (a preset,
// a mock format, the placement prompt). Five hand-rolled copies used three
// sizes and two tints.
//   tone  accent (default) | success | muted (an unselected option)
//   size  md (40px) | lg (44px)
const TONES = {
  accent: { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent-text)' },
  success: { background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)', color: 'var(--accent-success)' },
  muted: { background: 'var(--bg-surface3)', color: 'var(--text-muted2)' },
};
const SIZES = { md: { box: 'h-10 w-10', icon: 20 }, lg: { box: 'h-11 w-11', icon: 22 } };

export function IconChip({ icon: Icon, tone = 'accent', size = 'md', className }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-[var(--radius-default)]', s.box, className)}
      style={TONES[tone] || TONES.accent}
    >
      <Icon size={s.icon} strokeWidth={1.75} />
    </span>
  );
}

export default IconChip;
