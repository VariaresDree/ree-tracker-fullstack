import { cn } from './cn';

// The tinted square an icon sits in at the head of a card, tile or option (a
// preset, a mock format, a KPI, a dialog). The hand-rolled copies used four
// sizes, five tints and two shapes.
//   tone   accent (default) | signal | success | amber | danger | muted (an
//          unselected option)
//   size   sm (36px) | md (40px) | lg (44px)
//   round  a circle instead of the rounded square (avatars, a rank badge)
const tint = (color, share = 14) => ({ background: `color-mix(in srgb, ${color} ${share}%, transparent)`, color });
const TONES = {
  accent: { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent-text)' },
  signal: tint('var(--accent-signal)'),
  success: tint('var(--accent-success)'),
  amber: tint('var(--color-reeAmber-text)'),
  danger: tint('var(--accent-danger)'),
  muted: { background: 'var(--bg-surface3)', color: 'var(--text-muted2)' },
};
const SIZES = { sm: { box: 'h-9 w-9', icon: 18 }, md: { box: 'h-10 w-10', icon: 20 }, lg: { box: 'h-11 w-11', icon: 22 } };

export function IconChip({ icon: Icon, tone = 'accent', size = 'md', round = false, className, style }) {
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center', round ? 'rounded-full' : 'rounded-[var(--radius-default)]', s.box, className)}
      style={{ ...(TONES[tone] || TONES.accent), ...style }}
    >
      <Icon size={s.icon} strokeWidth={1.75} />
    </span>
  );
}

export default IconChip;
