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
  return (
    <div
      className={cn('px-5 pt-5 pb-3 flex items-start justify-between gap-3', className)}
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
  return (
    <p
      className={cn(
        'text-[11px] font-mono uppercase tracking-[0.18em] text-muted',
        className
      )}
      {...rest}
    />
  );
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
