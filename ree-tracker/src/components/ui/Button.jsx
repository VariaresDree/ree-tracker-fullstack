import { forwardRef } from 'react';
import { cn } from './cn';

const base =
  'inline-flex items-center justify-center gap-2 select-none font-medium ' +
  'rounded-[var(--radius-default)] btn-press transition-colors ' +
  'disabled:opacity-50 disabled:pointer-events-none';

const variants = {
  primary:
    'bg-[var(--accent-velocity)] text-white hover:brightness-110 elevate-1',
  secondary:
    'bg-surface2 text-textMain hover:bg-surface3 border border-border',
  ghost:
    'bg-transparent text-textMain hover:bg-surface2',
  danger:
    'bg-[var(--accent-danger)] text-white hover:brightness-110 elevate-1',
  outline:
    'bg-transparent border border-[var(--accent-velocity)] text-[var(--accent-velocity)] hover:bg-[color-mix(in_srgb,var(--accent-velocity)_12%,transparent)]',
};

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  icon: 'h-9 w-9 p-0',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
});
