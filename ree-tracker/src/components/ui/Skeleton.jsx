import { cn } from './cn';

export function Skeleton({ className, ...rest }) {
  return (
    <div
      className={cn('skeleton-shimmer h-4 w-full', className)}
      aria-hidden="true"
      {...rest}
    />
  );
}
