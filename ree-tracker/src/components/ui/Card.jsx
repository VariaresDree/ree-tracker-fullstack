import { cn } from './cn';

export function Card({ className, elevated = false, glow = false, grain = false, ...rest }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[var(--radius-lg)]',
        elevated && 'elevate-2',
        glow && 'elevate-glow',
        grain && 'grain-overlay',
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }) {
  // flex-wrap: a wide `action` slot (e.g. a Day/Week/Month SegmentedControl)
  // has no reason to shrink, so on a narrow viewport it was squeezing the
  // icon+eyebrow+title group down to nothing instead of wrapping below it —
  // measured live at 390px, the title group collapsed to 16-44px wide (icon
  // only) and its text overflowed unreadably. The title/eyebrow group keeps
  // its DEFAULT flex sizing (flex: 0 1 auto, i.e. no explicit basis/grow) —
  // giving it flex-1 here would zero its hypothetical size the same way
  // KpiTile's label did, which is what stops flex-wrap from ever triggering.
  return (
    <div
      className={cn('px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3', className)}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }) {
  return (
    <h3
      className={cn(
        'text-textMain font-semibold tracking-tight text-base',
        className
      )}
      {...rest}
    />
  );
}

export function CardEyebrow({ className, ...rest }) {
  return <p className={cn('text-eyebrow', className)} {...rest} />;
}

export function CardBody({ className, ...rest }) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }) {
  return (
    <div
      className={cn(
        'px-5 py-3 border-t border-border flex items-center justify-end gap-2',
        className
      )}
      {...rest}
    />
  );
}
