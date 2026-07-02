import { forwardRef } from 'react';
import { cn } from './cn';

// The one button. Raw <button> elements are allowed ONLY for: QuestionCard
// option rows / confidence radios, exam navigator grid cells, the internals
// of SegmentedControl/Tabs, and theme swatches — everything else in the app
// uses this component so focus, disabled, loading, and touch-target behavior
// stay consistent.
//
// `tone` recolors primary/outline/ghost through a local CSS var so every
// color still resolves through the active theme.

const TONE_VAR = {
  accent: 'var(--accent-velocity)',
  danger: 'var(--accent-danger)',
  success: 'var(--accent-success)',
  amber: 'var(--color-reeAmber)',
  signal: 'var(--accent-signal)',
};

const base =
  'inline-flex items-center justify-center gap-2 select-none font-medium ' +
  'rounded-[var(--radius-default)] btn-press transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  primary:
    'bg-[var(--btn-accent)] text-white hover:brightness-110 elevate-1',
  secondary:
    'bg-surface2 text-textMain hover:bg-surface3 border border-border',
  ghost:
    'bg-transparent text-textMain hover:bg-surface2',
  outline:
    'bg-transparent border border-[var(--btn-accent)] text-[var(--btn-accent)] hover:bg-[color-mix(in_srgb,var(--btn-accent)_12%,transparent)]',
};

// Tinted ghost — only applied when a non-default tone is requested, so
// existing ghost buttons keep their neutral text color.
const ghostToned =
  'text-[var(--btn-accent)] hover:bg-[color-mix(in_srgb,var(--btn-accent)_10%,transparent)]';

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-9 w-9 p-0 pointer-coarse:h-11 pointer-coarse:w-11',
};

export const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    tone,
    loading = false,
    fullWidth = false,
    as: Comp = 'button',
    className,
    style,
    disabled,
    children,
    ...rest
  },
  ref
) {
  // Back-compat: variant="danger" was a first-class variant before `tone`
  // existed. Keep it working as primary + danger tone.
  let v = variant;
  let t = tone || 'accent';
  if (variant === 'danger') {
    v = 'primary';
    t = tone || 'danger';
  }

  const isDisabled = disabled || loading;

  return (
    <Comp
      ref={ref}
      className={cn(
        base,
        variants[v],
        v === 'ghost' && t !== 'accent' && ghostToned,
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      style={{ '--btn-accent': TONE_VAR[t] || TONE_VAR.accent, ...style }}
      aria-busy={loading || undefined}
      {...(Comp === 'button' ? { disabled: isDisabled } : { 'aria-disabled': isDisabled || undefined })}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </Comp>
  );
});
